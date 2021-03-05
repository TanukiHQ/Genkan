// Load environment
require('dotenv').config()

// Express related modules
const express = require('express')
const exphbs = require('express-handlebars')
const app = express()
const cookieParser = require('cookie-parser')
const minify = require('express-minify')
const compression = require('compression')
const zlib = require('zlib')
const formidable = require('express-formidable');

// Express Additional Flags
app.use(compression({
    level: zlib.Z_DEFAULT_COMPRESSION
}))
// app.use(minify({
//     cache: 'cache',
// }))
// app.use(cookieParser())

// Socket.io -- Optional
const server = require('http').Server(app)

// UUID & Hashing -- Optional
const uuid = require('uuid')
const sha512 = require('hash-anything').sha512
const sha256 = require('hash-anything').sha256

// MongoDB  -- Optional
const MongoClient = require('mongodb').MongoClient
const url = "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass&ssl=false"
const dbName = "Kaku"

// Debugging
const log = require('loglevel')
const prefix = require('loglevel-plugin-prefix')
const chalk = require('chalk')
const colors = {
    TRACE: chalk.magenta,
    DEBUG: chalk.cyan,
    INFO: chalk.blue,
    WARN: chalk.yellow,
    ERROR: chalk.red,
}
prefix.reg(log)
prefix.apply(log, {
    format(level, name, timestamp) {
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)}` // ${chalk.white(`${name}:`)}
    },
})
prefix.apply(log.getLogger('critical'), {
    format(level, name, timestamp) {
        return chalk.red.bold(`[${timestamp}] ${level} ${name}:`)
    },
})
log.setLevel("debug", true)

// =========================

// MongoDB CRUD operations

const insertDB = function (db, coll, docs, callback) {
    // Get the documents collection
    const collection = db.collection(coll)
    // Insert some documents
    collection.insertMany([
        docs
    ], function (err, result) {
        log.trace("Performing database operation: insert")
        callback(result)
    })
}

const updateDB = function (db, coll, query, ops, callback) {
    // Get the documents collection
    const collection = db.collection(coll)
    // Update document where a is 2, set b equal to 1
    collection.updateOne(query, ops, function (err, result) {
        log.trace("Performing database operation: update")
        callback(result)
    })
}

const findDB = function (db, coll, query, callback) {
    // Get the documents collection
    const collection = db.collection(coll)
    // Find some documents
    collection.find(query).toArray(function (err, docs) {
        log.trace("Performing database operation: query")
        callback(docs)
    })
}

// =========================

app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: `themes/nichijou/views/layouts/`
}))

app.set('view engine', 'hbs')
app.set('views', `themes/nichijou/views`)

app.use(express.static(`themes/nichijou/public`))

app.use(formidable());

app.use(minify({
    cache: 'cache',
}))
app.use(compression())

// For MongoDB requirement
MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    if (err) {
        log.error("Failed to connect to MongoDB instance (Check config file for typos)")
        exit()
    } else {
        log.info("Connection with MongoDB successful.")
    }
    const db = client.db(dbName)

    // findDB(db, "users", {}, (result) => {
    //     log.info(result)
    // })

    app.get('/', (req, res) => {
        var metadata = {
            meta: {
                title: "Home",
                path: false
            },
            nav: {
                index: true
            }
        }

        res.render('login', metadata)
    })

    app.get('*', (req, res) => {
        var metadata = {
            meta: {
                title: "404",
                path: false
            },
            nav: {}
        }
        res.status = 404
        res.render('404', metadata)
    })

    server.listen(process.env.WEBSERVER_PORT, function (err) {
        log.debug(`Web server & Socket.io listening on port ${process.env.WEBSERVER_PORT}.`)
    })

}) // End of MongoClient