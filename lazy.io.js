'use strict'
/** @constant {Object} http requiring node's http module */
const http = require('http');
/** @constant {Object} io requiring socket.io module */
const io = require('socket.io')(4000);
/** @constant {Object} LazyTypes requiring Lazy types library */

const {LazyTypes} = require('./lazy.utils');
/** @constant {Object} io_config socket.io configuration */
const IO_DEFAULT = {
    PING_INTERVAL: 10000,
    PING_TIMEOUT: 5000,
    COOKIE: true
}

// /** 
//  * List of allowed API methods
//  * @constant {Array} ALLOWED_IO_METHODS 
//  * @todo: Make that global ?
//  **/
// const ALLOWED_IO_METHODS = [
//     "get",
//     "list",
//     "post",
//     "patch",
//     "delete"
// ];

// /**
//  * @class
//  * Describes a Lazy IO endpoint
//  */
// class LazyIOEndpoint{

//     /**
//      * 
//      * @param {String} room Endpoint broadcast room
//      * @param {String} message Endpoint message
//      */
//     constructor(route, method){
//         this.route = route;
//         this.method = method;
//     }


//     set route(route){
//         if(!LazyTypes.isString(route)){
//             throw new Error(`LazyIOEndpoint "route" argument should be a string. got ${LazyTypes.getFullType(route)}.`);
//         }
//         this._route = route;
//     }

//     set method(method){
//         if(!ALLOWED_IO_METHODS.includes(method)){
//             throw new Error(`Invalid LazyIOEndpoint "method" parameter. Valid .`);
//         }else if(!LazyTypes.isString(method)){
//             throw new Error(`LazyIOEndpoint "method" argument should be a string. Valid values: ${ALLOWED_IO_METHODS.map(method).join(',')}.`);
//         }
//         this._method = method;
//     }

//     /**
//      * Endpoint route
//      * @type {String}
//      */
//     get route(){
//         return this._route;
//     }

//      /**
//      * Endpoint method
//      * @see ALLOWED_IO_METHODS
//      * @type {String}
//      */
//     get method(){
//         return this._method;
//     }

//     /**
//      * Brodcasts an endpoint message to the specified room
//      * @param {any} data 
//      */
//     broadcast(room, data){
//         LazyIOInstance.broadcast(room, `${this.method}-${this.route}`, data);
//     }

// }

/**
 * Describes IO wrapper
 * @class
 * @requires io
 * @requires LazyTypes
 * @todo This class is still case specific for roomz. 
 * Standard message listening and sending should be implemented in next iteration
 */
class LazyIO{

    /**
     * IO wrapper contructor
     * @constructs IO
     */
    constructor(){
        if(!LazyIOInstance){
            LazyIOInstance = this;
        }
        return LazyIOInstance;
    }

    set pingInterval(pingInterval = IO_DEFAULT.PING_INTERVAL){
        if(!LazyTypes.isNumber(pingInterval)){
            throw new Error(`Lazy's IO "pingInterval" parameter should be a number. got ${LazyTypes.getFullType(pingInterval)}.`);
        }
        this._pingInterval = pingInterval;
    }

    set pingTimeout(pingTimeout = IO_DEFAULT.PING_TIMEOUT){
        if(!LazyTypes.isNumber(pingTimeout)){
            throw new Error(`Lazy's IO "pingTimeout" parameter should be a number. got ${LazyTypes.getFullType(pingTimeout)}.`);
        }
        this._pingTimeout = pingTimeout;
    }

    set useCookie(useCookie = IO_DEFAULT.COOKIE){
        if(!LazyTypes.isBoolean(useCookie)){
            throw new Error(`Lazy's IO "useCookie" parameter should be a number. got ${LazyTypes.getFullType(useCookie)}.`);
        }
        this._useCookie = useCookie;
    }

    set server(server){
        if(this._server){
            throw new Error(`Cannot reset server at runtime`);
        }else if(!(server instanceof http.Server)){
            throw new Error(`server should be an instabnce of Server. got ${server.constructor.name}`);
        }
        this._server = server;
    }

    set authFunction(authFunction = () => {}){
        if(!LazyTypes.isFunction(authFunction)){
            throw new Error(`Lazy's IO "authFunction" parameter should be a function. got ${LazyTypes.getFullType(authFunction)}.`);
        }
        this._authFunction = authFunction;
    }

    set onConnect(onConnect){
        if(!LazyTypes.isFunction(onConnect)){
            throw new Error(`Lazy's IO "onConnect" parameter should be a function. got ${LazyTypes.getFullType(onConnect)}.`);
        }
        this._onConnect = onConnect;
    }

    /**
     * HTTP server instance
     * @type {Server}
     */
    get server(){
        return this._server || null;
    }

    /**
     * IO middleware authentication function
     * @type {Function}
     */
    get authFunction(){
        return this._authFunction;
    }

    /**
     * IO middleware connection function
     * @type {Function}
     */
    get onConnect(){
        return this._onConnect;
    }

    get isInit(){
        return this._isInit || false;
    }

    /**
     * IO configuration object
     * @type {Object}
     */
    get config(){
        return {
            pingInterval: this._pingInterval,
            pingTimeout: this._pingTimeout,
            // cookie: this._useCookie
        }
    }

    /**
     * Initialises IO wrapper
     * @method init
     * @public
     * @param {Server} server Handle to server instance
     * @param {Function} auth Authentication middleware function
     * @param {Function} onConnect Socket connection middleware function
     */
    init(server, authFunction, onConnect, pingInterval, pingTimeout, useCookie) {
        if(!this.server){
            this.server = server;
            this.authFunction = authFunction;
            this.pingInterval = pingInterval;
            this.pingTimeout = pingTimeout;
            this.useCookie = useCookie;
            this.onConnect = onConnect;
            io.attach(this.server, this.config);
            io.on('connection', this.onConnect);
            io.use(this.authFunction);
            this._isInit = true;
        }else{
            throw new Error("Cannot re-initialise LazyIO singleton instance at runtime.");
        }
    }

    /**
     * Brodcast message to specific room
     * @method broadcast
     * @public
     * @param {String} room io room identifier
     * @param {String} message brodcast message
     * @param {Object} data brodcast message data
     */
    broadcast(room, message, data){
        if(!this.isInit){
            throw new Error("LazyIO is uninitialised.")
        }else if(!LazyTypes.isString(room)){
            throw new Error(`"room" argument should be a string. got ${LazyTypes.getFullType(room)}.`);
        }else if(!LazyTypes.isString(message)){
            throw new Error(`"message" argument should be a string. got ${LazyTypes.getFullType(room)}.`);
        }
        io.to(room).emit(message, data);
    }

}

var LazyIOInstance = new LazyIO();
module.exports = LazyIOInstance;
// module.exports = {
//     LazyIO: LazyIOInstance,
//     LazyIOEndpoint: LazyIOEndpoint
// };