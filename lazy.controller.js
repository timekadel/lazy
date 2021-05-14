const express = require('express');
const LazyModel = require('./lazy.model');
const {LazyTypes} = require('./lazy.utils');
const {LazyTest, LazyEndpointTest, LazyTestEnv, LazyMethodTest} = require('./lazy.test');
const { Router } = require('express');

/** @constant {Array} ALLOWED_API_METHODS List of allowed API methods */
const ALLOWED_API_METHODS= [
    "get",
    "list",
    "post",
    "patch",
    "delete"
];

/**
 * Describes an endpoint method controller
 * @class
 */
class LazyEndpointMethod{

    /**
     *
     * @param {Object} route Endpoint's route basepath and route identifier
     * @param {String} type Method type (get/list/post/patch/delete)
     * @param {Object} body Endpoint's method allowed body parameters
     * @param {Function} controller Endpoint's method controller
     * @param {Object} io Endpoint's io configuration object
     * @param {Array} tests Endpoint's method tests
     * @param {Boolean} virtual Endpoint's virtuality
     */
    constructor(route, type, body, controller, tests, virtual, isProtected){
        this._route         = route;
        this.type           = type;
        this.body           = body;
        this.virtual        = virtual;
        this.protected      = isProtected
        this.controller     = controller;
        this.tests          = tests;
    }

    set type(type){
        if(!ALLOWED_API_METHODS.includes(type)){
            throw new Error(`Invalid controller "${type}". valid values: ${ALLOWED_API_METHODS.join(',')}`);
        }
        this._type = type;
    }

    set body(body = {}){
        if(!LazyTypes.isObject(body)){
            throw new Error(`Body should be an object. got ${LazyTypes.getFullType(body)}.`);
        }
        this._body = body;
    }

    set controller(controller){
        if(!LazyTypes.isFunction(controller)){
            throw new Error(`Method controller should be a function. got ${LazyTypes.getFullType(controller)}.`);
        }
        this._controller = controller;
    }

    set tests(tests){
        if(tests){
            if(!LazyTypes.isObject(tests)){
                throw new Error(`Enpoint's "tests" should be an object. got ${LazyTypes.getFullType(tests)}.`);
            }
            if(!tests.dataset){
                throw new Error(`"${controller}" method tests are missing dataset.`);
            }else if(!LazyTypes.isArray(tests.dataset)){
                throw new Error(`Test's dataset should be an array. got ${LazyTypes.getFullType(tests.dataset)}`);
            }
            let _tests = tests.dataset.map(data => {
                return new LazyTest(
                    tests.it, this.route, this.method, data.context, data.props, data.params,
                    data.qs, data.body, data.fail ,tests.before, tests.expect, tests.after
                );
            })
            this._tests = new LazyMethodTest(this.method, _tests);
        }
    }

    set virtual(isVirtual = false){
        if(!LazyTypes.isBoolean(isVirtual)){
            throw new Error(`Enpoint's "virtual" should be a boolean. got ${LazyTypes.getFullType(isVirtual)}.`);
        }
        this._virtual = isVirtual;
    }

    set protected(isProtected = false){
        if(!LazyTypes.isBoolean(isProtected)){
            throw new Error(`Enpoint's "protected" should be a boolean. got ${LazyTypes.getFullType(isProtected)}.`);
        }
        this._protected = isProtected;
    }

    /**
     * Endpoint's method allowed body parameters
     * @type {Object}
     */
    get body(){
        return this._body;
    }

    /**
     * Endpoint's method controller
     * @type {Function}
     */
    get controller(){
        return this._controller;
    }

    /**
     * Endpoint's LazyIOEndpoint
     * @type {LazyIOEndpoint}
     */
    get io(){
        return this._io;
    }

    /**
     * Endpoint's IO middleware function
     * @type {Function}
     */
    get ioMiddlewareFunction(){
        return (req, res, next) => {
            req.$lazy.io = this.io;
            next();
         }
    }

    /**
     * Endpoint's method
     * @type {String}
     */
    get method(){
        return this._type === "list" ? "get" : this._type;
    }

    /**
     * Endpoint's method type
     * @type {String}
     */
    get type(){
        return this._type;
    }

    /**
     * Endpoint's method route
     * @type {String}
     */
    get route(){
        return this.type != "list" && this.type != "post" && !this.virtual ? `${this._route.path}/:${this._route.identifier}` : this._route.path;
    }

    /**
     * Endpoint's method tests
     * @type {Array<LazyEndpointTest>}
     */
    get tests(){
        return this._tests;
    }

    /**
     * Endpoint's virtuality
     * @type {Boolean}
     */
    get virtual(){
        return this._virtual;
    }

    /**
     * Endpoint's protection
     * @type {Boolean}
     */
    get protected(){
        return this._protected;
    }

    /**
     * Endpoint's method controller middleware in charge
     * of checking request's body validity
     * @type {Function}
     */
    get bodyChecker(){
        var self = this;
        return function(req, res, next){
            let err = { status: 400 };
            let typeOfBody = Object.prototype.toString.call(req.body).split(" ").pop().split("]")[0];
            switch(self.type){
                case "patch":
                    err.hint = typeOfBody != "Object" ? err.hint = `Request body should be an object. Got ${typeOfBody}` : "";
                    Object.keys(req.body).length === 0 ?  err.hint = `Request body cannot be empty` : err.hint;
                    let wrongParams = Object.keys(req.body).flatMap((key) => self.body.hasOwnProperty(key) ? [] : key);
                    err.hint = wrongParams.length > 0 ? `Body contains invalid parameters: ${wrongParams.join(",")}. Allowed parameters: ${Object.keys(self.body).join()}` : err.hint;
                    break;
                case "post":
                    err.hint = typeOfBody != "Object" ? err.hint = `Request body should be an object. Got ${typeOfBody}` : ""
                    let missingParams = Object.keys(self.body).flatMap((param) => req.body.hasOwnProperty(param) ? [] : param);
                    err.hint = missingParams.length > 0 ? `Missing parameters: ${missingParams.join(",")}` : err.hint
                    break;
            }
            return err.hint ? next(err) : next();
        }
    }

}

/**
 * Describes LazyEndpoint
 * @class
 * @extends LazyModel
 */
module.exports = class LazyEndpoint extends LazyModel{

    /**
     * @param {String} name endpoint unique name identifier
     * @param {Object} parent endpoint's parent
     * @param {Boolean} isVirtual is endpoint virtual ?
     * @param {Boolean} isProtected does the endpoint need authentication ?
     * @param {String} root endpoint's root
     * @param {Object} controllers enpoint's methods controllers
     */
    constructor(name, model, endpoint, methods){
        super(model);
        this.name = name;
        this._bindControllerMethods(methods);
        if(endpoint){
            this._router = null;
            this._parent = endpoint.parent; //TODO: Can't remember why I set this to private. Please check. EDIT: parent is a proxy.
            this.root = endpoint.root;
            this.protected = endpoint.protected;
            this.methods = endpoint.methods;
        }else{
            //TODO: delete methods here
        }
    }

    set name(name){
        if(!LazyTypes.isString(name)){
            throw new Error(`Endpoint's "name" should be a string. got ${LazyTypes.getFullType(name)}.`);
        }
        this._name = name;
    }

    set root(root){
        if(!LazyTypes.isString(root)){
            throw new Error(`Endpoint's "root" should be a string. got ${LazyTypes.getFullType(root)}.`);
        }
        this._root = root;
    }

    set protected(isProtected = false){
        if(!LazyTypes.isBoolean(isProtected)){
            throw new Error(`Endpoint's "protected" should be a boolean. got ${LazyTypes.getFullType(isProtected)}.`);
        }
        this._protected = isProtected;
    }

    set methods(methods){
        if(!LazyTypes.isObject(methods)){
            throw new Error(`Method configuration should be an object. got ${LazyTypes.getFullType(methods)}.`);
        }
        this._methods = Object.keys(methods).map(type => {
            if(!LazyTypes.isObject(methods[type].request)){
                throw new Error(`Method's request configuration should be an object. got ${LazyTypes.getFullType(methods[type].request)}.`);
            }
            return new LazyEndpointMethod(
                this.route,
                type,
                methods[type].request.body,
                methods[type].request.controller,
                methods[type].tests,
                this.virtual,
                this.protected
            );
        })
        let tests = this._methods.map(method => method.tests);
        LazyTestEnv.push(new LazyEndpointTest(this.route.path, tests));
    }

    /**
     * Endpoint's name (unique identifier)
     * @type {String}
     */
    get name(){
        return this._name;
    }

    /**
     * Endpoint's parent
     * @type {LazyEndpoint}
     */
    get parent(){
        return this._parent;
    }

    /**
     * Endpoint's route root
     * @type {string}
     */
    get root(){
        return this._root;
    }

    /**
     * Endpoint's protection
     * @type {Boolean}
     */
    get protected(){
        return this._protected || false;
    }

    /**
     * Endpoint's methods controllers
     * @type {Object}
     */
    get methods(){
        return this._methods || [];
    }

    /**
     * Endpoint's route
     * @type {Objects}
     * @property {String} path Endpoint's path
     * @prioperty {String} identifier Endpoint's route identifier
     * @todo Maybe separate these ?
     */
    get route(){
        let parent = this.parent;
        let route = "";
        while(parent){
            route = `${parent.root}${parent.pk ? `/:${parent.route.identifier}` : ""}` + route;
            parent = parent.parent;
        }
        return {
            path: route += this.root,
            identifier: `${this.name}RouteId`
        }
    }

    /**
     * That seems to be quite a nasty... Need to find a way to handle authentication a bit
     * more elegantly. SHould do for the moment.
     */
    get authMiddlewareFunction(){
        return this.protected ? require('./lazy').serverAuth : (req, res, next) => {next()};;
    }

    /**
     * Endpoint's router
     * @type {Router}
     */
    get router(){
        if(!this._router){
            // this._router = this.parent ? this.parent.router : express.Router();
            this._router = express.Router();
            this.methods.forEach((method) => {
                this._router[method.method](
                    method.route,
                    this.authMiddlewareFunction,
                    method.ioMiddlewareFunction,    //TODO find a way
                    this._makeMiddleware(method),
                    method.bodyChecker,
                    method.controller.bind(this)
                )
            });
            if(!this.virtual && !this.methods.every(method => ["get", "patch", "delete"].includes(method.method)))
            this._router.all(`${this.route.path}/:${this.route.identifier}`, LazyEndpoint._fallbackInvalidMethod);
            this._router.all(`${this.route.path}`, LazyEndpoint._fallbackInvalidMethod);
            this._router.use(LazyEndpoint._handleError);
        }
        return this._router;
    }

    /**
     * Endpoint's tests
     * @type {}
     */
    get tests(){
        return this._tests;
    }

    /**
     * Binds controller methods
     * @param {Object} methods collection of controller methods
     */
    _bindControllerMethods(methods = {}){
        if(!LazyTypes.isObject(methods)){
            throw new Error(`Controller "methods" should be an object. got ${LazyTypes.getFullType(body)}.`);
        }
        Object.keys(methods).forEach(methodName => {
            let method = methods[methodName];
            if(!LazyTypes.isFunction(method)){
                throw new Error(`Lazy method "${methodName}" should be a function. got ${LazyTypes.getFullType(method)}.`);
            }else if(this.hasOwnProperty(methodName)){
                throw new Error(`Reserved method name "${methodName}" should be a function.`);
            }else{
                this[methodName] = method.bind(this);
            }
        })
    }

    /**
     * Sets up method controller's middleware
     * @method makeMiddleware
     * @private
     * @param {LazyEndpointMethod} method endpoint method
     */
    //TODO: Refactor this. It's UGLY.
    _makeMiddleware(method){
        var parent = this.parent;
        let params = [];
        while(parent){
            let parent_cpy = parent;
            if(parent_cpy.pk){
                params.push(async (req, res, next) => {
                    let resource = await parent_cpy.findOne({ [parent_cpy.pk]: req.params[parent_cpy.route.identifier]})
                    if(resource){
                        req.$lazy.params.push(resource)
                        next();
                    }else{
                        next({
                            status: '404',
                            hint: `Cannot find ${req.params[parent_cpy.route.identifier]} within ${parent_cpy.table}`
                        })
                    }
                });
            }
            parent = parent.parent;
        }
        if(method.type != "post" && method.type != "list" && !this.virtual){
            let self = this;
            params.push(async (req, res, next) => {
                let resource = await self.findOne({ [self.pk]: req.params[self.route.identifier]})
                if(resource){
                    req.$lazy.params.push(resource)
                    next();
                }else{
                    next({
                        status: '404',
                        hint: `Cannot find ${req.params[self.route.identifier]} within ${self.table}`
                    })
                }
            })
        }
        return params;
    }

    /**
    * Middleware function handling Method Not Allowed Error
    * @param err Error to be sent back to the querier
    * @param req Middleware request object
    * @param res Middleware response object
    * @param next Pointer to the next middleware function in the stack
    */
    static _fallbackInvalidMethod (req, res, next) {
        next({
            status: 405,
            hint: `${req.method} method not allowed on this route.`
        })
    }

    /**
    * Middleware function handling Method Not Allowed Error
    * @param err Error to be sent back to the querier
    * @param req Middleware request object
    * @param res Middleware response object
    * @param next Pointer to the next middleware function in the stack
    */
    static _fallbackNotFound (req, res, next) {
        next({
            status: 404,
            hint: `Invalid endpoint: ${req.url}`
        })
    }

    /**
    * Handles middleware error
    * @param err Error to be sent back to the querier
    * @param req Middleware request object
    * @param res Middleware response object
    */
    static _handleError(err, req, res, next) {
        // console.log(err);
        err.success = false;
        err.status  = err.status || 500;
        err.message = ( {                   //Setting error messages for each HTTP error code
            400: "Bad Request"            , //Status: 400 Bad Request
            401: "Unauthorized"           , //Status: 401 Unhautorized
            403: "Forbidden"              , //Status: 403 Forbidden
            404: "Not Found"              , //Status: 404 Not Found
            405: "Method Not Allowed"     , //Status: 405 Method Not Allowed
            409: "Confict"                , //Status: 409 Conflict
            413: "Payload Too Large"      , //Status: 404 Not Found
            415: "Unsupported Media Type" , //Status: 404 Not Found
            429: "Too Many Requests"      , //Status: 429 Too Many Requests
            500: "Internal Server Error"    //Status: 500 Internal Server Error
        } )[ err.status ]
        err.hint = err.hint || "Unknown Error";
        res.status(err.status);
        res.send(err)
    }

}
