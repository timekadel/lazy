'use strict'

const chai          = require('chai');
const { expect }    = require('chai');
const should        = chai.should();
const chaiHttp      = require('chai-http');
const logger        = require('./lazy.logger');
const {LazyTypes}   = require("./lazy.utils");
const LazyDb        = require("./lazy.db");

chai.use(chaiHttp);


class LazyRequest{

    constructor(route, method, body, params, qs, context){
        this.route      = route;
        this.method     = method;
        this.body       = body;
        this.params     = params
        this.qs         = qs;
        this.context    = context;
    }

    set params(params = []){
        if(!LazyTypes.isArray(params)){
            throw new Error(`Test "params" should be an array . got ${LazyTypes.getFullType(params)}.`);   
        }
        this._params = params;
    }

    set body(body = {}){
        if(!LazyTypes.isObject(body)){
            throw new Error(`Test "body" should be an object . got ${LazyTypes.getFullType(body)}.`);
        }
        this._body = body;
    }

    set qs(qs){
        if(qs && !LazyTypes.isObject(qs)){
            throw new Error(`Test "qs" should be an object . got ${LazyTypes.getFullType(qs)}.`);
        }
        this._qs = qs ? "?" + Object.keys(qs).map(field =>  `${field}=${qs[field]}`).join("&") : "";
    }

    get params(){
        return this._params;
    }

    get qs(){
        return this._qs;
    }

    get body(){
        return this._body;
    }

    async run(){
        let regex = /:([a-zA-Z0-9]*)/g, i=0, self = this;
        this.route = this.route.replace(regex, (match) =>  this.params[i++] || '');
        if(this.route.slice(this.route.length - 1) == '/'){
            this.route = this.route.slice(0, - 1)
        }
        this.route += this.qs;
        return new Promise((resolve, reject) => {
            logger.log(`${self.method} ${self.route} - data: ${self.body}`);
            chai.request(lazyTestEnvInstance.app)[self.method](self.route)
            .set('Cookie', self.context ? self.context.cookies : '')
            [`${self.method == "get" ? 'query' : 'send'}`](self.body)
            .end((err, res) => {
                logger.log("Done", true);
                err ? reject(res) : resolve(res)
            });
        })
    }

}

class LazyTestContext{
    //TODO: clean cookies implementation
    constructor(name){
        this.name = name; 
        this._cookies = "";
        this._values = {};
    }

    set name(name){
        if(!LazyTypes.isString(name)){
            throw new Error(`Context name should be a string. got ${LazyTypes.getFullType(name)}`)
        }
        this._name = name;
    }

    set values(none){
        throw new Error("Cannot override context's values. You may however assign a new values using Context.values.<key> = <value>");
    }

    get name(){
        return this._name;
    }

    get values(){
        return this._values;
    }

    get cookies(){
        // let cookies = Object.keys(this._cookies).map((name)=>`${name}=${this._cookies[name]}`).join(";");
        return this._cookies;
    }

    setRawCookie(cookie){
        if(typeof cookie != "string"){
            throw new Error(`Cookie should be a string. got ${cookie}`);
        }
        this._cookies = cookie;
    }

    setCookie(name, value){
        if(typeof name != "string" || typeof value != string){
            throw new Error("Arguments should be strings.");
        }
        this._cookies[name] = value;
    }

    removeCookie(name){
        if(typeof name != "string"){
            throw new Error("Arguments should be strings."); 
        }else if(!this._cookies[name]){
            throw new Error(`Cookies[${name}] is undefined.`); 
        }
        delete this._cookies[name];
    }

    set cookies(cookies){
        if(typeof cookies != "string"){
            throw new Error("Cookiers ")
        }
    }


}

class LazyTest{

    constructor(it, route, method, context, props, params, qs, body, fail ,before, expect, after){
        this.it = it;
        this.route = route;
        this.method = method;
        this.context = context;
        this.props = props;
        this.fail = fail;
        this.request = new LazyRequest(this.route, this.method, body, params, qs, this.context);
        this.before = before;
        this.expect = expect;
        this.after = after;
    }

    set it(it = "Missing test description"){
        if(!LazyTypes.isString(it)){
            throw new Error(`Test's "it" should be a string. got ${LazyTypes.getFullType(it)}.`);
        }
        this._it = it;
    }

    set route(route){
        if(!LazyTypes.isString(route)){
            throw new Error(`Test's "route" should be a string. got ${LazyTypes.getFullType(route)}.`);
        }
        this._route = route;      
    }

    set method(method){
        if(!LazyTypes.isString(method)){
            throw new Error(`Test's "method" should be a string. got ${LazyTypes.getFullType(method)}.`);
        }
        this._method = method;      
    }

    set context(context){
        if(!LazyTypes.isString(context) && context != null){
            throw new Error(`Test's "context" should be a string. got ${LazyTypes.getFullType(context)}.`);
        }
        this._context = lazyTestEnvInstance.getContext(context);  
    }

    set props(props = {}){
        if(!LazyTypes.isObject(props)){
            throw new Error(`Test's "props" should be an object . got ${LazyTypes.getFullType(it)}.`);
        }
        this._props = props;
    }

    set params(params = []){
        if(!LazyTypes.isArray(params)){
            throw new Error(`Test's "params" should be an array . got ${LazyTypes.getFullType(params)}.`);   
        }
        this._params = params;
    }

    set body(body = {}){
        if(!LazyTypes.isObject(body)){
            throw new Error(`"Test's body" should be an object . got ${LazyTypes.getFullType(body)}.`);
        }
        this._body = body;
    }

    set fail(fail = 0){
        if(!LazyTypes.isNumber(fail)){
            throw new Error(`"Test's fail" should be a number (HTTP error code). got ${LazyTypes.getFullType(fail)}.`);
        }
        this._fail = fail;
    }

    set before(before = ()=>{}){
        if(!LazyTypes.isFunction(before)){
            throw new Error(`"Test's before" should be a function . got ${LazyTypes.getFullType(before)}.`);
        }
        this._before = before.bind({ request: this.request, context: this.context, props: this.props });
    }

    set expect(expect = ()=>{}){
        if(!LazyTypes.isFunction(expect)){
            throw new Error(`Test's "expect" should be an object . got ${LazyTypes.getFullType(expect)}.`);
        }
        this._expect = expect.bind({ request: this.request, context: this.context, props: this.props });
    }

    set after(after = ()=>{}){
        if(!LazyTypes.isFunction(after)){
            throw new Error(`Test's "props" should be an object . got ${LazyTypes.getFullType(after)}.`);
        }
        this._after = after.bind({ request: this.request, context: this.context, props: this.props });
    }

    get it(){
        return this._it;
    }

    get route(){
        return this._route;      
    }

    get method(){
        return this._method;     
    }

    get props(){
        return this._props;
    }

    get params(){
        return this._params;
    }

    get body(){
        return this._body;
    }

    get fail(){
        return this._fail;
    }

    get before(){
        return this._before;
    }

    get expect(){
        return this._expect;
    }

    get after(){
        return this._after;
    }

    get context(){
        return this._context;
    }

    run(){
        const self = this;
        it(`${self.it}${self.fail ? ` but fail with status code ${self.fail}` : ''} ${ this.context ? `- context: ${JSON.stringify(this.context.name)}` : ''}`, async function() {
            this.timeout(0);
            await self.before();
            let res = await self.request.run();
            if(self.fail){
                res.should.have.status(self.fail);
            }else{
                res.should.have.status(200);
                self.expect(res);
            }
        })
        after(async function(){
            await self.after();
        })
    }

}

class LazyMethodTest{

    constructor(method, tests){
        this.method = method;
        this.tests = tests;
    }

    run(){
        describe(`${this.method}`, () => {
            this.tests.forEach(test => {
                test.run();
            })
        })  
    }

}

class LazyEndpointTest{

    constructor(route, tests){
        this.route = route;
        this.tests = tests;
    }

    set tests(tests){
        if(!LazyTypes.isArray(tests)){
            throw new Error(`LazyEndpointTest "tests" parameter should be an array . got ${LazyTypes.getFullType(tests)}.`);   
        }
        this._tests = tests
        // let strayMethodsTests = ["get","post","put","delete"].flatMap(method => {
        //     return tests.filter(test => test.method === method).length > 0 ?  [] : 
        //     new LazyMethodTest(
        //         method == "list" ? "get" : method, 
        //         [new LazyTest(`Should try using ${method.toUpperCase()} method`,  this.route, method == "list" ? "get" : method, ...[,,,,], 405, ...[,,,])]
        //     )
        // })
        // this._tests = [...tests, ...strayMethodsTests];
    }

    get tests(){
        return this._tests;
    }

    run(){
        describe(`${this.route}`, () => {
            this.tests.forEach(controllerTest => {
                controllerTest.run();
            })
        })
    }

}

class LazyTestEnv{

    constructor(){
        if(!lazyTestEnvInstance){
            this.contexts = {};
            this.tests = [];
            lazyTestEnvInstance = this;
        }
        return lazyTestEnvInstance;
    }

    set app(app){
        if(!this.app){
            if(!LazyTypes.isFunction(app)){
                throw new Error(`Test environment "app" shoud be a function. got ${LazyTypes.getFullType(app)}`);
            }
            this._app = app;
        }     
    }

    get app(){
        return this._app;
    }

    push(endpointTest){
        if(!(endpointTest instanceof LazyEndpointTest)){
            throw new Error(`Environment tests should be instance of LazyEndpointTest`)
        }
        this.tests.push(endpointTest);
    }

    getContext(context){
        if(!LazyTypes.isString(context) && context != null){
            throw new Error(`"context" should be a string. got ${LazyTypes.getFullType(context)}.`);
        }
        return context ? this.contexts[context] ? this.contexts[context] : this.contexts[context] = new LazyTestContext(context) : undefined;
    }

    async run(){
        if(!this.app){
            throw new Error(`Test environment is not initialised. Please call LazyTestEnv.init(<app>) before running tests`);
        }
        this.tests.forEach(test => { test.run(); })
        // after(async ()=>{ await LazyDb.cleanupTestEnvironment(); })
    }

}

var lazyTestEnvInstance = new LazyTestEnv();

module.exports = {
    LazyTestEnv: lazyTestEnvInstance,
    LazyTest: LazyTest,
    LazyEndpointTest: LazyEndpointTest,
    LazyMethodTest: LazyMethodTest
}