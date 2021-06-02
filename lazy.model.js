'use strict'
/** @const {Object} LazyDB requiring Database library */
const LazyDB = require('./lazy.db');
const {LazyTypes} = require('./lazy.utils');

const MYSQL_ON_DELETE_CASCADE_CLAUSES = [
    "CASCADE", "SET NULL", "NO ACTION", "RESTRICT"
]

const MYSQL_DATA_TYPES = [
    "CHAR", "VARCHAR", "BINARY", "VARBINARY",
    "TINYBLOB", "TINYTEXT", "TEXT", "BLOB",
    "MEDIUMTEXT", "MEDIUMBLOB", "LONGTEXT",
    "LONGBLOB", "ENUM", "SET", "BIT", "TINYINT",
    "BOOL", "BOOLEAN", "SMALLINT", "MEDIUMINT",
    "INT", "INTEGER", "BIGINT", "FLOAT", "DOUBLE",
    "DOUBLE PRECISION", "DECIMAL", "DEC", "DATE",
    "DATETIME", "TIMESTAMP", "TIME", "YEAR"
]

const MYSQL_SIZED_TYPES = [
    "CHAR", "VARCHAR", "BINARY", "VARBINARY",
    "TEXT", "BLOB", "BIT", "TINYINT","SMALLINT",
    "MEDIUMINT","INT", "INTEGER", "BIGINT", "FLOAT",
    "DOUBLE", "DOUBLE PRECISION", "DECIMAL", "DEC",
    "TIMESTAMP"
]

const MYSQL_DEFAULT_REQUIRES_BRACKETS = [
    "CHAR", "VARCHAR", "TINYTEXT", "TEXT",
    "MEDIUMTEXT", "LONGTEXT"
]

/**
 * @todo Check selector and data for wrong kay/values
 */
class LazyForeignKey{

    constructor(column, onDelete, onUpdate, join, on, alias, occurence){
        this.occurence  = occurence;
        this.join       = join;
        this.on         = on;
        this.alias      = alias;
        this.column     = column;
        this.onDelete   = onDelete;
        this.onUpdate   = onUpdate
    }

    set occurence(occurence){
        if(!LazyTypes.isNumber(occurence)){
            throw new Error(`FK "occurence" value should be a number. got ${LazyTypes.getFullType(occurence)}.`);
        }
        this._occurence = occurence;
    }

    set column(column){
        if(!LazyTypes.isString(column)){
            throw new Error(`FK "column" should be a string. got ${LazyTypes.getFullType(column)}.`);
        }
        this._column = column;
    }

    set onDelete(onDelete){
        if(!LazyTypes.isString(onDelete)){
            throw new Error(`FK "onDelete" should be a string. got ${LazyTypes.getFullType(onDelete)}.`);
        }else if(!MYSQL_ON_DELETE_CASCADE_CLAUSES.includes(onDelete)){
            throw new Error(`Invalid onDelete type "${onDelete}". Valid options: ${MYSQL_ON_DELETE_CASCADE_CLAUSES.join(',')}.`);
        }
        this._onDelete = onDelete;
    }

    set onUpdate(onUpdate){
        if(!LazyTypes.isString(onUpdate)){
            throw new Error(`FK "onUpdate" should be a string. got ${LazyTypes.getFullType(onUpdate)}.`);
        }else if(!MYSQL_ON_DELETE_CASCADE_CLAUSES.includes(onUpdate)){
            throw new Error(`Invalid onDelete type "${onUpdate}". Valid options: ${MYSQL_ON_DELETE_CASCADE_CLAUSES.join(',')}.`);
        }
        this._onUpdate = onUpdate;
    }

    set join(join){
        if(!LazyTypes.isObject(join)){
            throw new Error(`FK "join" should be an object. got ${LazyTypes.getFullType(join)}.`);
        }
        this._join = join;
    }

    set on(on){
        if(!LazyTypes.isString(on)){
            throw new Error(`FK "foreignColumn" should be a string. got ${LazyTypes.getFullType(on)}.`);
        }
        this._on = on;
    }

    set alias(alias){
        if(!LazyTypes.isString(alias) && alias){
            throw new Error(`FK "alias" should be a string. got ${LazyTypes.getFullType(alias)}.`);
        }
        this._alias = alias;
    }

    /**
     * Column name
     * @type {String}
     */
    get occurence(){
        return this._occurence;
    }


    /**
     * Column name
     * @type {String}
     */
    get name(){
        return this._name;
    }

    /**
     * FK parent column
     * @type {String}
     */
    get column(){
        return this._column;
    }

    /**
     * FK on delete clause
     * @type {String}
     */
    get onDelete(){
        return this._onDelete;
    }

    /**
     * FK on delete clause
     * @type {String}
     */
    get onUpdate(){
        return this._onUpdate;
    }

    /**
     * FK parent
     * @type {Object}
     */
    get join(){
        return this._join
    }

    /**
     * FK parent column
     * @type {String}
     */
    get on(){
        return this._on;
    }

    /**
     * FK alias
     * @type {String}
     */
    get alias(){
        return this._alias;
    }

    get joinTableAlias(){
        return `${this._join.table}${this._occurence}`
    }

}

class LazyColumn{

    constructor(name, type, size, deflt, pk, fk){
        this.name       = name;
        this.type       = type;
        this.size       = size;
        this.default    = deflt;
        this.pk         = pk;
        this.fk         = fk;
    }

    set name(name){
        if(!LazyTypes.isString(name)){
            throw new Error(`Column "name" should be a string. got ${LazyTypes.getFullType(name)}.`);
        }
        this._name = name;
    }

    set type(type){
        if(!LazyTypes.isString(type)){
            throw new Error(`Column "type" should be a string. got ${LazyTypes.getFullType(type)}.`);
        }else if(!MYSQL_DATA_TYPES.includes(type)){
            throw new Error(`Invalid column type ${type}. Valid options: ${MYSQL_DATA_TYPES.join(',')}.`);
        }
        this._type = type;
    }

    set size(size){
        if(MYSQL_SIZED_TYPES.includes(this.type) && !size){
            throw new Error(`Column type ${this.type} requires a size parameter.`);
        }else if(MYSQL_SIZED_TYPES.includes(this.type) && !LazyTypes.isNumber(size)){
            throw new Error(`Column "size" should be a number. got ${LazyTypes.getFullType(size)}.`);
        }
        this._size = size;
    }

    set default(deflt){
        if(!LazyTypes.isString(deflt) && deflt){
            throw new Error(`Column "default" should be a string. got ${LazyTypes.getFullType(deflt)}.`);
        }
        switch(this.type){
            case "TIMESTAMP":
                this._default = `${deflt}(${this.size})`;
                break;
            default:
                this._default = deflt;
        }
    }

    set pk(pk = false){
        if(!LazyTypes.isBoolean(pk)){
            throw new Error(`Column "pk" should be a boolean. got ${LazyTypes.getFullType(pk)}.`);
        }
        this._pk = pk;
    }

    set fk(fk){
        if(fk && !LazyTypes.isObject(fk)){
            throw new Error(`Column "fk" should be an object. got ${LazyTypes.getFullType(fk)}.`);
        }else if(fk && !(fk instanceof LazyForeignKey)){
            throw new Error(`COlumn foreign key not an instance of LazyForeignKey.`);
        }
        this._fk = fk;
    }

    /**
     * Column name
     * @type {String}
     */
    get name(){
        return this._name;
    }


    /**
     * Column type
     * @type {String}
     */
    get type(){
        return this._type;
    }

     /**
     * Column size
     * @type {Number}
     */
    get size(){
        return this._size;
    }

    /**
     * Column default value
     * @type {String}
     */
    get default(){
        return this._default
    }

    /**
     * Is column primary key ?
     * @type {Boolean}
     */
    get pk(){
        return this._pk;
    }

    /**
     * Column's foreign key
     * @type {Object}
     */
    get fk(){
        return this._fk;
    }

    /**
     * Get SQL-formated column datatype
     * @type {String}
     */
    get dataTypeString(){
        return `${this.type}${MYSQL_SIZED_TYPES.includes(this.type) ? `(${this.size})` : ''}`
    }

    /**
     * Get SQL-formated default column value query string slice
     * @type {String}
     */
    get defaultValueString(){
        return this.default === "NULL" ? "NULL DEFAULT NULL" :
        `NOT NULL ${this.default === undefined ? '' : `DEFAULT ${MYSQL_DEFAULT_REQUIRES_BRACKETS.includes(this.type) ? "'" + this.default + "'" : this.default}` }`
    }

    /**
     * Column creation SQL query string slice
     * @type {String}
     */
    get createQuery(){
        return `${this.name} ${this.dataTypeString} ${this.defaultValueString}`;
    }

}

module.exports = class LazyModel{

    constructor(model){
        if(model){
            this.table = model.table;
            this.schema = model.schema;
            this.virtual = false;
        }else{
            this.virtual = true;
        }
    }

    set schema(schema){
        if(!LazyTypes.isObject(schema)){
            throw new Error(`Schema should be an object. got ${LazyTypes.getFullType(schema)}.`);
        }
        this._schema = schema;
        this._columns = Object.keys(this.schema).map(field => {
            this._fk = this._fk ? this._fk : [];
            let data = this.schema[field];
            let fk = data.fk ? new LazyForeignKey(field, data.fk.delete, data.fk.update, data.fk.join, data.fk.on, data.fk.as, this._fk.reduce((i, fk) => fk.join.table === data.fk.join.table ? ++i : i , 0)) : undefined;
            if(fk) this._fk.push(fk);
            if(data.pk) this.pk = field;
            return new LazyColumn(field, data.type, data.size, data.default, data.pk, fk);
        })

    }

    set pk(pk){
        if(this._pk){
            throw new Error(`Schema contains multiple Primary Keys.`);
        }
        this._pk = pk;
    }

    set table(table){
        if(!LazyTypes.isString(table)){
            throw new Error(`Model's "table" should be a string. got ${LazyTypes.getFullType(table)}.`);
        }
        this._table = table;
    }

    set virtual(isVirtual = false){
        if(!LazyTypes.isBoolean(isVirtual)){
            throw new Error(`Enpoint's "virtual" should be a boolean. got ${LazyTypes.getFullType(isVirtual)}.`);
        }
        this._virtual = isVirtual;
    }

    get columns(){
        return this._columns;
    }

    get fk(){
        return this._fk || [];
    }

    get pk(){
        return this._pk || null;
    }

    get table(){
        return this._table;
    }

    get virtual(){
        return this._virtual;
    }

    get schema(){
        return this._schema;
    }


    async create(data){
        if(!this.virtual){
            let values = Object.keys(data).map(field => data[field]);
            let query = `INSERT INTO ${this.table} (`;
            query += Object.keys(data).map(field => field).join(",");
            query += ") VALUES (";
            query += Object.keys(data).map(() => "?").join(",");
            query += ");";
            await LazyDB.execute(query, values);
            return await this.findOne(data);
        }
    }

    async updateAll(selector, data){
        return await this._update(selector, data, false)
    }

    async updateOne(selector, data){
        return await this._update(selector, data, true)
    }

    async findAll(selector, order, desc = false){
        return await this._find(selector, false, order, desc);
    }

    async findOne(selector, order, desc = false){
        return await this._find(selector, true, order, desc)
    }

    async checkExists(selector){
        return await this.findOne(selector) != undefined;
    }

    async deleteAll(selector){
        return await this._delete(selector, false);
    }

    async deleteOne(selector){
        return await this._delete(selector, true);
    }

    async _find(selector, one = false, order, desc = false){
        if(!this.virtual){
            let orderColumn = this.columns.find(column => column.name === order);
            if(!LazyTypes.isObject(selector)){
                throw new Error(`"selector" argument should be an object. got ${LazyTypes.getFullType(selector)}.`);
            }else if(order && !LazyTypes.isString(order)){
                throw new Error(`"order" argument should be a string. got ${LazyTypes.getFullType(selector)}.`);
            }else if(order && !orderColumn){
                throw new Error(`Cannot order by "${order}". column "${order}" does not exists.`)
            }
            let query = `SELECT `;
            let columnsQueries = this.columns.map(column => `${this.table}.${column.name} AS '${this.table}*${column.name}'`);
            let fkQueries = this.fk.flatMap(fk => fk.alias ? fk.join.columns.map(column => `${fk.joinTableAlias}.${column.name} AS '${fk.joinTableAlias}*${column.name}*${fk.alias}'`) : []);
            let joinQueries = this.columns.flatMap(column => column.fk ? ` LEFT JOIN ${column.fk.join.table} ${column.fk.joinTableAlias} ON ${this.table}.${column.name}=${column.fk.joinTableAlias}.${column.fk.on}` : []);
            query += [columnsQueries,...fkQueries].join(",");
            query += ` FROM ${this.table} `
            query += joinQueries.join("");
            query += this._prepareWhereClause(selector);
            query += orderColumn ? ` ORDER BY ${orderColumn.fk ? `${orderColumn.fk.join.table}.${orderColumn.name} ${desc ? " DESC" : " ASC"}` : `${this.table}.${orderColumn.name}`} ${desc ? " DESC" : " ASC"}` : '';
            query += one ? " LIMIT 1;" : ";";
            let raw = await LazyDB.execute(query, this._fetchSelectorValues(selector));
            let objectified = raw.map(row => {
                let data = {};
                for(const encodedField in row){
                    let [, field, fkAlias] = encodedField.split("*");
                    if(fkAlias){
                        data[fkAlias] = data[fkAlias] || {};
                        data[fkAlias][field] = row[encodedField];
                    }else{
                        data[field] = row[encodedField]
                    }
                }
                return data
            });
            return one ? objectified[0] : objectified;
        }
    }

    async _update(selector, data, one = false){
        if(!this.virtual){
            if(!LazyTypes.isObject(selector)){
                throw new Error(`"selector" argument should be an object. got ${LazyTypes.getFullType(selector)}.`);
            }else if(!LazyTypes.isObject(data)){
                throw new Error(`"data" argument should be an object. got ${LazyTypes.getFullType(data)}.`);
            }else if(!await this.checkExists(selector)){
                throw {
                    status: 400,
                    hint: `no matches found for {${Object.keys(selector).map(field => `${field}: '${selector[field]}'`).join(",")}}`
                }
            }else{
                let query = `UPDATE ${this.table} SET`;
                query += Object.keys(data).map(field => {
                    let fk = this.fk.find(fk => field == fk.alias);
                    field = fk ? fk.on : field;
                    return ` ${field}=?`
                }).join(",");
                query += this._prepareWhereClause(selector);
                query += one ? " LIMIT 1;" : ";"
                let values = this._fetchSelectorValues(data);
                values = values.concat(this._fetchSelectorValues(selector));
                await LazyDB.execute(query, values);
                return await this._find(Object.assign(selector, data), one);
            }
        }
    }

    async _delete(selector, one = false){
        if(!this.virtual){
            if(!await this.checkExists(selector)){
                throw {
                    status: 400,
                    hint: `no matches found for {${Object.keys(selector).map(field => `${field}: '${selector[field]}'`).join(",")}}`
                }
            }else{
                let query = `DELETE FROM ${this.table}`;
                query += this._prepareWhereClause(selector);
                query += one ? " LIMIT 1;" : ";"
                return await LazyDB.execute(query, this._fetchSelectorValues(selector));
            }
        }
    }

    _fetchSelectorValues(selector){
        if(!this.virtual && Object.keys(selector).length > 0){
            let values = Object.keys(selector).flatMap(field => {
                let fk = this.fk.find(fk => field == fk.alias);
                field = fk ? fk.on : field;
                return selector[field];

            });
            return values
        }else{
            return  []
        }
    }

    _prepareWhereClause(selector){
        if(!this.virtual && Object.keys(selector).length > 0){
            let query = " WHERE "
            return query += Object.keys(selector).map(field => {
                let fk = this.fk.find(fk => field == fk.alias);
                let column = fk ? fk.on : field;
                return `${this.table}.${column}<=>?`
            }).join(" AND ");
        }else{
            return "";
        }
    }

    async makeTable(){
        if(!this.virtual){
            let tables = await LazyDB.execute(`SHOW TABLES LIKE '${this.table}'`);
            if(tables.length === 0){
                await this._createTable();
            }else if(tables.length === 1){
                await this._updateTable();
            }else{
                throw new Error(`Error while migrating table ${this.table}`)
            }
        }
    }

    async makeRelations(){
        if(!this.virtual){
            let query = `ALTER TABLE ${this.table}`;
            let existingForeignKeys = await LazyDB.execute(`SELECT TABLE_NAME,COLUMN_NAME,CONSTRAINT_NAME, REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = '${this.table}' AND TABLE_SCHEMA= '${LazyDB.db}' AND CONSTRAINT_NAME != 'PRIMARY' `)
            await Promise.all(existingForeignKeys.map( async fk => {
                return await LazyDB.execute(`ALTER TABLE ${this.table} DROP CONSTRAINT ${fk.CONSTRAINT_NAME}`)
            }))
            query += this.fk.map((fk, index) => ` ADD CONSTRAINT ${this.table}_fk_${index} FOREIGN KEY (${fk.column}) REFERENCES ${fk.join.table} (${fk.on}) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`).join(',');
            return await LazyDB.execute(query);
        }
    }

    async _createTable(){
        if(!this.virtual){
            let query = `CREATE TABLE ${this.table}(`;
            query += this.columns.map(column => column.createQuery).join(", ");
            query += this.pk ? `, PRIMARY KEY (${this.pk})` : '';
            query += `) ENGINE=${LazyDB.engine} DEFAULT CHARSET=${LazyDB.charset} COLLATE=${LazyDB.collation}`;
            return await LazyDB.execute(query);
        }
    }

    /**
     * @todo TEST THIS /!\/!\
     */
    async _updateTable(){
        if(!this.virtual){
            let existingColumns = await LazyDB.execute(`SHOW COLUMNS FROM ${this.table}`);
            let query = `ALTER TABLE ${this.table}`;
            let previousField = null;
            query += this.columns.map(column => {
                let query = existingColumns.some(props => props.Field === column.name) ?
                ` CHANGE ${column.name} ${column.createQuery}` :
                ` ADD ${column.createQuery} ${previousField ? `AFTER ${previousField}`  : 'FIRST'}`
                previousField = column.name;
                return query
            }).join(",");
            return await LazyDB.execute(query);
        }
    }


    // let existingColumns = await TinyDB.execute(`SHOW COLUMNS FROM ${this.table}`);
    // // let existingForeignKeys = await TinyDB.execute(`SELECT TABLE_NAME,COLUMN_NAME,CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = '${this.table}' AND CONSTRAINT_NAME != 'PRIMARY' `)
    // let query = `ALTER TABLE ${this.table}`;
    // let previousField = null;
    // let columnQueries = Object.keys(this.schema).map((field, index) => {
    //     let column = this.schema[field]
    //     let query = existingColumns.some(props => props.Field === field) ?
    //     ` CHANGE ${field} ${field} ${column.type} ${column.default === "NULL" ? "NULL" : "NOT NULL"} ${column.default ? `DEFAULT '${column.default}'` : ""}` :
    //     ` ADD ${field} ${column.type} ${column.default === "NULL" ? "NULL" : "NOT NULL"} ${column.default ? `DEFAULT '${column.default}'` : ""} ${previousField ? `AFTER ${previousField}` : 'FIRST'}`;
    //     previousField = field;
    //     return query;
    // });
    // // await Promise.all(existingForeignKeys.map( async fk => {
    // //     return await TinyDB.execute(`ALTER TABLE ${this.table} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}, DROP KEY ${fk.CONSTRAINT_NAME}`)
    // // }))
    // // let constraintQueries = Object.keys(this.schema).flatMap((field) => {
    // //     let column = this.schema[field]
    // //     return column.fk === undefined ? [] : ` ADD CONSTRAINT ${column.fk.name} FOREIGN KEY (${field}) REFERENCES ${column.fk.model.table} (${column.fk.column}) ON DELETE ${column.fk.delete} ON UPDATE ${column.fk.update}`
    // // })
    // // query += [...columnQueries,...constraintQueries].join(",");
    // query += [...columnQueries].join(",");

    // return await TinyDB.execute(query);

}
