# 1. Lazy API Framework
> :warning: **These instructions are incomplete. Documentation process is still in progress.**

> A Node.js API framework made by lazy developers for lazy developers. Easy setup and migration of MySQL table models, automated and intuitive API endpoint generation, straightforward API integration tests setup and much more.

__Table of contents__
- [1. Lazy API Framework](#1-lazy-api-framework)
- [2. Installation](#2-installation)
- [3. Setup](#3-setup)
  - [3.1. Configuration](#31-configuration)
    - [3.1.1. Database options](#311-database-options)
    - [3.1.2. Server Options](#312-server-options)
    - [3.1.3. IO Options](#313-io-options)
- [4. Describing Lazys](#4-describing-lazys)
  - [4.1. Describing Models](#41-describing-models)
    - [4.1.1. Describing Schemas](#411-describing-schemas)
      - [4.1.1.1. Describing Columns](#4111-describing-columns)
        - [4.1.1.1.1. Foreign Key Configuration](#41111-foreign-key-configuration)
    - [4.1.2. Model Declaration Examples](#412-model-declaration-examples)
      - [4.1.2.1. Simple User Model](#4121-simple-user-model)
      - [4.1.2.2. "Complex" Friend Model (with foreign key constraints)](#4122-complex-friend-model-with-foreign-key-constraints)
  - [4.2. Configuring Endpoints](#42-configuring-endpoints)
- [5. Changelog](#5-changelog)
- [6. Appendix](#6-appendix)
  - [6.1. Supported Column Types](#61-supported-column-types)

# 2. Installation
Lazy is free from native bindings and can be installed on Linux, Mac OS or Windows without any issues.

```bash
npm install --save @timekadel/lazy
```

# 3. Setup
## 3.1. Configuration
```js
const {Lazy} = require('@timekadel/lazy'); //Requiring Lazy

//Setting up Lazy
Lazy.config({
    searchPath: String,                 //Root path to lazys configuration files (search is recursive)
    db:{                                //DB configuration
        host: String,                   //DB Host
        db: String,                     //DB name
        user: String,                   //DB user
        password: String                //DB password
    },
    server:{                            //API server configuration
        port: Number,                   //API running port. (Default: 4000)
        allowedOrigins: Array<String>,
        auth: Function                  //API server Authentication middleware function
    },
    io:{                                //Socket.io configuration (Optional)
        onConnect: Function,            //On connection function
        auth: Function,                 //Socket.io authentication middleware function 
        cookie: Boolean,                //Enable Cookies ?
        pingInterval: Number,           //Socket.io Ping interval
        pingTimeout: Number             //Socket.io Ping timeout
    }
});
```

Lazy recursively searches for <b>\*.lazy.js</b> files within a provided <b>search path</b> from which MySQL tables and API endpoints will be generated. Lazy's API server may be configured to run over any given port. 

* `searchPath`: rootPath to lazys configuration files (search is recursive)
* `db`: [Database configuration](#database-options)
* `server`: [Server configuration](#server-options)
* `io`: [socket.io configuration](#io-options) (Optional)

### 3.1.1. Database options
The following configuration options are mandatory in order to establish a connection with the database:

* `host`: The hostname of the database you are connecting to. (Default: `localhost`)
* `port`: The port number to connect to. (Default: `3306`)
  and `port` are ignored.
* `user`: The MySQL user to authenticate as.
* `password`: The password of that MySQL user.
* `database`: Name of the database to use.

### 3.1.2. Server Options
If a <b>list of allowed origins</b> is provided, API requests will be restricted to the provided list of origins and responded with a <b>status-code 403</b> otherwise. 

It is up to developers to setup an <b>authentication middleware function</b>. If none is provided, each described route should be configured with their <b>protected</b> parameter set to false.  (see [Describing Lazys](#describing-lazys)). 

* `port`: The port number to connect to. (Default: `4000`)
* `allowedOrigins`: Access control - Allowed origins list.
* `auth`: API server Authentication middleware function.

### 3.1.3. IO Options

As a way to broadcast live messages, Lazy comes pre-packaged with socket.io. You may opt to use it within your project by providing an io configuration section to Lazy's configuration object as follows:

* `onConnect`: socket&#46;io [onConnection](https://socket.io/docs/v4/server-instance/#connection) event handler
* `auth`: socket.io [authentication middleware function](https://socket.io/docs/v4/middlewares/#Registering-a-middleware)
* `pingInterval`: Low level engine [pingInterval](https://socket.io/docs/v4/server-initialization/#pingInterval) option.
* `pingTimeout`: Low level engine [pingTimeout](https://socket.io/docs/v4/server-initialization/#pingTimeout) option.

# 4. Describing Lazys
Lazy's modules called  <b>"Lazys"</b> must be placed anywhere under the provided <b>searchPath</b> (see [Setup section](#setup)). Lazys may be used to describe <b> models</b> and/or  <b>API endpoints</b>. Valid Lazys must be described as follows:

```js
/** <appRoot>/<searchPath>/<lazyname>.lazy.js */

module.exports = {
    name: String,       //Each lazy name must be unique !.
    model: Object,      //Optional: Model configuration. (You may create virtual endpoints)
    endpoint: Object    //Optional: Endpoint configuration. (You may choose not to register endpoints)
}
```

* `name`: Unique name used to identify and require a Lazy
* `model`: Lazy's [model description](#describing-models)
* `endpoint`: Lazy's [endpoint configuration](#configuring-endpoint)

To give a better overall understanding of Lazy's syntax and operation, the following sections will be based around a very simple example described below:


## 4.1. Describing Models
```js
model:{
    table: String,
    schema: Object
}
```
* `table`: Database's table name
* `schema`: Lazy's [schema configuration object](#describing-schemas)

### 4.1.1. Describing Schemas
```js
schema:{
    column_1_name: Object,
    //...
    column_n_name: Object
}
```
* `column_1_name`: First [column configuration object](#describing-columns)
* `column_n_name`: Last [column configuration object](#describing-columns)

#### 4.1.1.1. Describing Columns
```js
column_name:{
    type: String,
    size: Number,
    default: String,
    pk: Boolean,
    fk: Object
}
```
* `type`: Column type. (see [supported types section](supported-column-types) for valid options):
* `size`: Column size (If required. see [supported types section](supported-types))
* `default`: Column's default value
* `pk`: Select column as primary key
* `fk`: Column [foreign key configuration object](#foreign-key-configuration)

##### 4.1.1.1.1. Foreign Key Configuration
```js
fk:{
    join: Object<Lazy>,
    on: String,
    as: String,
    delete: String,
    update: String,
}
```
* `join`: Reference to Lazy to be joined.
* `on`: Join column selection.
* `as`: Retrieve foreign row under a specific alias name. (Optional)
* `delete`: On delete action (see [supported actions section](#supported-actions)).
* `update`: On cascade action (see [supported actions section](#supported-actions)).

### 4.1.2. Model Declaration Examples
To give a better overall understanding of the Lazy's model features, Basic examples based aroud the implementation of the following class diagram are described within the next section.

> :warning: **WIP, This section is incomplete.**

#### 4.1.2.1. Simple User Model 
```js
module.exports = {
    name: "LazyUser",
    model:{
        table: "users",
        schema:{
            id:{
                type: "VARCHAR",
                size: 50,
                pk: true
            },
            fname:{
                type: "VARCHAR",
                size: 20,
                default: "Fname"
            },
            lname:{
                type: "VARCHAR",
                size: 20,
                default: "Lname"
            },
        },
    },
    //...Endpoint declaration
}
```

#### 4.1.2.2. "Complex" Friend Model (with foreign key constraints)
```js
const {Lazy} = require('@timekadel/lazy');
const LazyUser = Lazy.require('LazyUser');

module.exports = {
    name: "LazyFriend",
    model:{
        table: "friends",
        schema:{
            user_id:{
                type: "VARCHAR",
                size: 50,
                fk: {
                    join: LazyUser,
                    on: "id",
                    delete: "CASCADE",
                    update:  "CASCADE"
                }
            },
            friend_id:{
                type: "VARCHAR",
                size: 50,
                fk: {
                    join: LazyUser,
                    on: "id",
                    as: "friend",
                    delete: "CASCADE",
                    update:  "CASCADE"
                }
            },
            timestamp:{
                type: "TIMESTAMP",
                size: 3,
                default: "CURRENT_TIMESTAMP"
            }
        }
    },
    //...Endpoint declaration
```


## 4.2. Configuring Endpoints
```js
endpoint:{
    root: String,
    protected: Boolean,
    methods: Object
}
```
* `root`: Database's table name
* `protected`: Lazy's [schema configuration object](#describing-schemas)
* `methods`: Lazy's [schema configuration object](#describing-schemas)
  
> :warning: **WIP, This section is incomplete.**

# 5. Changelog
* `1.0.21`: 
  * Implemented direction for ORDER BY clause
  * Patched lazy.controller.js to avoid automatically fetching resources for tables without private key
* `1.0.20`: 
  * Improved instructions sections organisation/numbering
* `1.0.19`: 
  * Created git repository
  * Updated links to git repository
  * Updated Model declaration examples
* `1.0.18`: 
  * Patched lazy.model.js to multiple join queries on same foreign table.
  * Numbered instruction sections to make things clearer
* `1.0.17`: 
  * Patched lazy.model.js to multiple join queries on same foreign table.
  * Patched lazy.controller to avoid throwing errors when no tests are beign described.
  * Patched lazy.js to avoid throwing error when no auth functions are provided.
  * Patched lazy.js to avoid throwing error if io configuration does not exist
  * Updated Instructions
# 6. Appendix
## 6.1. Supported Column Types
> :warning: **WIP, This section is incomplete/invalid.**

| Type String | Is Typed      | Additional Parameters  |
| ----------- |:-------------:| ----------------------:|
| CHAR | yes | none |
| VARCHAR | yes | none |
| BINARY | yes | none |
| VARBINARY | yes | none |
| TINYBLOB | yes | none |
| TINYTEXT | yes | none |
| TEXT | yes | none |
| BLOB | yes | none |
| MEDIUMTEXT | yes | none |
| MEDIUMBLOB | yes | none |
| LONGTEXT | yes | none |
| LONGBLOB | yes | none |
| ENUM | yes | none |
| CHAR | yes | none |
| VARCHAR | yes | none |
| BINARY | yes | none |
| VARBINARY | yes | none |
| TINYBLOB | yes | none |
| TINYTEXT |  yes | none |
| TEXT |  yes | none |
| BLOB | yes | none |
| MEDIUMTEXT | yes | none |
| MEDIUMBLOB | yes | none |
| LONGTEXT | yes | none |
| LONGBLOB | yes | none |
| ENUM | yes | none |
| SET | yes | none |
| BIT | yes | none |
| TINYINT | yes | none |
| BOOL | yes | none |
| BOOLEAN | yes | none |
| SMALLINT | yes | none |
| MEDIUMINT | yes | none |
| INT | yes | none |
| INTEGER | yes | none |
| BIGINT | yes | none |
| FLOAT | yes | none |
| DOUBLE | yes | none |
| DOUBLE PRECISION | yes | none |
| DECIMAL | yes | none |
| DEC | yes | none |
| DATE | yes | none |
| DATETIME | yes | none |
| TIMESTAMP | yes | none |
| TIME | yes | none |
| YEAR | yes | none |