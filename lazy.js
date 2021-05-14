'use strict'
const express      	= require('express');
const bodyParser   	= require('body-parser');
const cookieParser	= require('cookie-parser');
const cors          = require('cors');
const path 			= require('path');
const http          = require('http');
const fs            = require("fs");
const LazyDB        = require("./lazy.db");
const LazyEndpoint  = require('./lazy.controller');
const LazyIO        = require('./lazy.io');
const {LazyTestEnv} = require('./lazy.test');
const {LazyTypes}   = require('./lazy.utils')

const TINY_DEFAULTS = {
    RUNNING_PORT: 4000,
    SEARCH_PATH: "/endpoint",
    ALLOWED_ORIGINS: []
}

/**
 * @class 
 * Describes Lazy framework environment
 */
class Lazy{

    /**
     * @constructor
     * Constructs Lazy Class
     */
    constructor(){
        if(!instance){
            this._endpoints = {};
            this.app = express();
            instance = this;
        }
        return instance;
    }

    set port(port = TINY_DEFAULTS.RUNNING_PORT){
        if(!LazyTypes.isNumber(port)){
            throw new Error(`Lazy's "port" parameter should be a number. got ${LazyTypes.getFullType(port)}.`);
        }
        this._port = port;
    }

    set searchPath(searchPath = TINY_DEFAULTS.CONTROLLERS_PATH){
        if(!LazyTypes.isString(searchPath)){
            throw new Error(`Lazy's "searchPath" parameter should be a string. got ${LazyTypes.getFullType(searchPath)}.`);
        }
        this._searchPath = searchPath;
    }

    set allowedOrigins(allowedOrigins = TINY_DEFAULTS.ORIGIN_WHITELIST){
        if(!LazyTypes.isArray(allowedOrigins)){
            throw new Error(`Lazy's "whitelist" parameter should be an array. got ${LazyTypes.getFullType(allowedOrigins)}`);
        }
        this._allowedOrigins = allowedOrigins;
    }

    set app(app){
        if(this._app){
            throw new Error(`Cannot reset app at runtime`);
        }
        LazyTestEnv.app = app;
        this._app = app;
    }

    set server(server){
        if(this._server){
            throw new Error(`Cannot reset server at runtime`);
        }else if(!(server instanceof http.Server)){
            throw new Error(`server should be an instabnce of Server. got ${server.constructor.name}`);
        }
        this._server = server;
    }

    set serverAuth(serverAuthFunctionHandle){
        this._serverAuth = serverAuthFunctionHandle
    }

    set ioAuth(ioAuthFunctionHandle){
        this._ioAuth = ioAuthFunctionHandle;
    }

    get serverAuth(){
        return this._serverAuth ? this._serverAuth.proxiedProp ? this._serverAuth.proxiedProp : this._serverAuth : ((req, res, next)=>{next();});
    }

    get ioAuth(){
        return this._ioAuth ? this._ioAuth.proxiedProp ? this._ioAuth.proxiedProp : this._ioAuth : ((socket, next)=>{next();});;
    }

    /**
     * Lazy API port
     * @type {Number}
     */
    get port(){
        return this._port || TINY_DEFAULTS.RUNNING_PORT;
    }

    /**
     * Lazy files rootpath
     * @type {String}
     */
    get searchPath(){
        return this._searchPath || TINY_DEFAULTS.SEARCH_PATH;
    }

    /**
     * Lazy API server origin whitelist
     * @type {String}
     */
    get allowedOrigins(){
        return this._allowedOrigins || TINY_DEFAULTS.ALLOWED_ORIGINS;
    }

    /**
     * Lazy express app handle
     * @type {Object}
     */
    get app(){
        return this._app;
    }

    /**
     * Lazy server instance
     * @type {Server}
     */
    get server(){
        return this._server;
    }

    /**
     * Lazy endpoint collection
     * @type {Object}
     */
    get endpoints(){
        return this._endpoints;
    }

    /**
     * Dynamically requires an endpoint from the endpoint collection
     * @method require
     * @public
     * @param {String} endpointName the (uniquely identified) name of the endpoint to require
     * @returns {Proxy} A javascript proxy handling resource fetching at runtime 
     */
    require(endpointName){
        if(!this.endpoints.hasOwnProperty(endpointName)){
            this.endpoints[endpointName] = {};
        }
        const handler = {
            get: (target, prop, receiver) =>{
                if(this.endpoints[endpointName].instance){
                    return this.endpoints[endpointName].instance[prop]
                }else{
                    return new Proxy(this.endpoints[endpointName], {
                        get: (target, key) => {
                            switch(key){
                                case "instance":
                                    return this.endpoints[endpointName].instance;
                                case "proxiedProp":
                                    return this.endpoints[endpointName].instance[prop];
                                default:
                                    throw new Error(
                                        `Invalid LazyRequired instance property .
                                        Either user <LazyRequiredObj>.instance to get object 
                                        instance or "<LazyRequiredObj>.proxiedProp" to retrieve proxied prop value.`
                                    );
                            }
                        }
                    })
                }
            }
        }
        return new Proxy(this.endpoints[endpointName], handler)
    }

    /**
     * Configures and runs Lazy framework
     * @method config
     * @param {Object} config 
     * @private
     * @async
     */
    async config(config){
        try{
            if(!config.searchPath){
                throw new Error(`Lazy configuration is lacking an "endpoints" configuration object.`)
            }else if(!config.server){
                throw new Error(`Lazy configuration is lacking a "server" configuration object.`)  
            }else if(!config.db){
                throw new Error(`Lazy configuration is lacking a "db" configuration object.`) 
            }
            this.searchPath = config.searchPath;
            this.port = config.server.port;
            this.allowedOrigins = config.server.allowedOrigins;
            this.serverAuth = config.server.auth
            await LazyDB.init(config.db)
            await this._setupServer();
            if(config.io){ 
                //Proxying authfunction so Lazy.require can be used TODO: find a way to do that elegantly
                this.ioAuth = config.io.auth; 
                LazyIO.init(
                    this.server, 
                    this.ioAuth, 
                    config.io.onConnect, 
                    config.io.pingInterval, 
                    config.io.pingTimeout, 
                    config.io.useCookie
                ); 
            };
            this._printInfo();
        }catch(err){
            console.log(err);
        }
    }

    /**
     * Generates/updates database's models following endpoints descriptions 
     * @method migrate
     * @public
     * @async
     */
    async migrate(){
        for(var i=0; i<Object.keys(this.endpoints).length; i++){
            await this.endpoints[Object.keys(this.endpoints)[i]].instance.makeTable()
        }
        for(var i=0; i<Object.keys(this.endpoints).length; i++){
            await this.endpoints[Object.keys(this.endpoints)[i]].instance.makeRelations()
        }
    }

    /**
     * Sets up Framework.
     * Fetches lazy configuration files.
     * Configures app router.
     * Generates HTTP server
     * @method _setupServer
     * @private
     * @async
     */
    async _setupServer(){
        //TODO: check if some of these may be removed/configured furthermore
        this.app.options('*', cors({ 
            credentials: true, 
            preflightContinue: true, 
            origin: this._setCorsOrigins.bind(this) 
        }));
        this.app.use(function(req, res, next){
            if(req.method === 'OPTIONS'){
                res.status(204).end(0);
            }else{
                next();
            }	  
        })
        this.app.use(cors({ 
            credentials: true, 
            preflightContinue: true, 
            origin: this._setCorsOrigins.bind(this)
        }))
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(cookieParser());
        this.app.use(function(req, res, next){
            res.setHeader('X-Content-Type-Options','nosniff');
            res.setHeader('X-XSS-Protection','1; mode=block');
            res.setHeader('X-Frame-Options','DENY');
            res.setHeader('Pragma','no-cache');
            res.setHeader('Cache-Control','private, no-cache, no-store, must-revalidate');
            next();
        });
        this._fetchControllers(this.searchPath);
        Object.keys(this.endpoints).forEach((name) => {
            let config = this.endpoints[name].config
            let controller = this.endpoints[name].instance = new LazyEndpoint(config.name, config.model, config.endpoint, config.methods);
            if(controller.router){

                this.app.use(Lazy._makeMiddlewareContext, controller.router);
            }
        })
        await this.migrate();
        this.app.use(LazyEndpoint._fallbackNotFound);
        this.app.use(LazyEndpoint._handleError);
        this.server = http.createServer(this.app).listen(this.port);
    }

    /**
     * Recursively searches and fetches lazy configuration files
     * located within search path.
     * @see This is stolen straight from stackoverflow: https://stackoverflow.com/questions/25460574/find-files-by-extension-html-under-a-folder-in-nodejs
     * @param {String} rootPath current search path
     * @todo This could be improved.
     * @todo Find another way to handle protected routes middleware function binding
     */
    _fetchControllers(rootPath){
        let filter = ".lazy.js"
        if (!fs.existsSync(rootPath)){ return; }
        var files = fs.readdirSync(rootPath);
        for(var i=0; i<files.length; i++){
            var filename = path.join(rootPath,files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory()){
                this._fetchControllers(filename);
            }else if (filename.indexOf(filter) >= 0) {
                let config = require(filename);
                this.endpoints[config.name] = {
                    path: filename,
                    config: config,
                    instance: {},
                }
            };
        };
    }

	/**
	 * Checks if the origin is allowed to emit a request to the server
	 * @param {string} origin the query originator
	 * @param {callback} the callback called on function end/result
	 */
	_setCorsOrigins(origin,callback){
		if (this.allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true)
		} else {
			let err = new Error('Forbidden');
			err.status = 403;
			err.hint = "Origin is not allowed";
			callback(err);
		}
    }
    
    /**
     * Prints Framework information following setup.
     * @todo Handle tables better ?
     * @todo Add configuration option to disable watermark
     * @todo Add configuration option to silent print
     */
    _printInfo(){
        console.log("\n\n██╗      █████╗ ███████╗██╗   ██╗");
        console.log("██║     ██╔══██╗╚══███╔╝╚██╗ ██╔╝");
        console.log("██║     ███████║  ███╔╝  ╚████╔╝ ");
        console.log("██║     ██╔══██║ ███╔╝    ╚██╔╝  ");
        console.log("███████╗██║  ██║███████╗   ██║   ");
        console.log("╚═WW═══╝╚═╝  ╚═╝╚══════╝   ╚W╝");
        console.log("  ||       ____///__        ||   ");
        console.log(" | |      / _______ \\       | |");
        console.log(" | |     / /_     _\\ \\      | |");
        console.log(" | |     | _-) o (-_ |      | |");
        console.log(" |  \\____| \\___^___/ |_____/  |");
        console.log("  \\                          /\n");
        console.table([{
            version: require('./package.json').version, 
            searchPath: this.searchPath, 
            port: this.port, 
            io: LazyIO.isInit ? 'enabled' : 'disabled'
        }]);
        console.table(Object.keys(this.endpoints).map(name => {
            let endpoint = this.endpoints[name].instance;
            return{
                name: endpoint.name,
                virtual: endpoint.virtual,
                protected: endpoint.protected,
                methods: endpoint.methods.map(method => method.type.toUpperCase()).join(",")
            }
        }));
    }

    static _makeMiddlewareContext(req, res, next){
        req.$lazy = {
            params: [],
        }
        next();
    }

}

var instance = new Lazy();
module.exports = instance;