'use strict'

const mysql = require('mysql2');
const {LazyTypes} = require('./lazy.utils')

const LAZY_DB_DEFAULTS = {
    host: "127.0.0.1",
    database: "db",
    user: "user",
    password: "password",
    port: 3306
}


//TODO: Improve this, it works but it sould be improved
class LazyDB{

    constructor(){
        if(!instance){
            this.pool       = null;
            this._isInit    = false
            this.engine     = 'InnoDB'
            this.charset    = 'utf8'
            this.collation  = 'utf8_unicode_ci'
            instance        = this;
        }
        return instance;
    }

    async init(config){
        if(!this._isInit){
            // if(!LazyTypes.isString(config.host)){
            //     throw new Error(`db's "host" should be a string. got ${LazyTypes.getFullType(config.host)}.`);
            // }else if(!LazyTypes.isString(config.host)){

            // }else if(!LazyTypes.isString(config.host)){

            // }
            await this.setupTestEnvironment(config);
            this.db = process.env.NODE_ENV == "test" ? "test" : config.db
            this.pool = mysql.createPool({
                host:       config.host,
                database:   this.db,
                user:       config.user,
                password:   config.password,
                port:       config.port || LAZY_DB_DEFAULTS.port,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            })
        }else{
            throw "DB already initialised."
        }
    }

    async setupTestEnvironment(config){
        if(process.env.NODE_ENV == "test"){
            var con = mysql.createConnection({
                host: config.host,
                user: config.user,
                password: config.password,
            });
            await con.promise().execute("DROP DATABASE IF EXISTS test;");
            await con.promise().execute("CREATE DATABASE IF NOT EXISTS test");
        }
    }

    async cleanupTestEnvironment(){
        await this.execute("DROP DATABASE IF EXISTS test;");
    }

    async execute(query, args){
        let [rows] =  await this.pool.promise().execute(query, args);
        return rows;
    }

    async query(query, args){
        let [rows] =  await this.pool.promise().query(query, args);
        return rows;
    }

    //TODO: remove this
    // static _sanitize_args(args){
    //     const sanitize_regex = /?:(?![A-z0-9])./
    //     return args.map((arg)=>{
    //         arg.replace(sanitize_regex,'');
    //     })
    // }

}

var instance = new LazyDB();
module.exports = instance;
