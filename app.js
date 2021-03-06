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
const bcrypt = require('bcrypt');
const saltRounds = 10;

// JSON Web Token
var jwt = require('jsonwebtoken');

// MongoDB  -- Optional
const MongoClient = require('mongodb').MongoClient
const url = process.env.MONGODB_URL
const dbName = "Genkan"

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

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

// For MongoDB requirement
MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    if (err) {
        log.error("Failed to connect to MongoDB instance (Check config file for typos)")
        return exit()
    }

    log.info("Connection with MongoDB successful.")
    const db = client.db(dbName)

    app.get('/signup', (req, res) => {
        res.render('signup')
    })

    app.post('/signup', (req, res) => {
        var email = req.fields.email.toLowerCase().replace(/\s+/g, '')
        var password = req.fields.password

        // Data validations
        if (emailRegex.test(email) === false || password.length < 8) return

        // Check whether account exists
        findDB(db, "users", { "email": email }, result => {
            if (result.length !== 0) {
                log.info("Duplicate account")
                return res.render('signup', { "result": { "errDuplicateEmail": true } })
            }

            newAccount(email, password, result => {
                log.info("New Account OK")
                return res.render('signup', { "result": { "accountCreationSuccess": true } })
            })
        })
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

    const newAccount = (email, password, callback) => {
        // SHA512 Hashing
        var hashedPasswordSHA512 = sha512({
            a: password,
            b: email
        })

        // Bcrypt Hashing
        var hashedPasswordSHA512Bcrypt = bcrypt.hashSync(hashedPasswordSHA512, saltRounds)

        // Generate email confirmation token
        var emailConfirmationToken = tokenGenerator()

        const NewUserSchema = {
            "email": email,
            "password": hashedPasswordSHA512Bcrypt,
            "account": {
                "activity": {
                    "created": new Date(),
                    "lastSeen": null
                },
                "type": "STANDARD",
                "emailVerified": false
            },
            "sessions": [],
            "tokens": {
                "emailConfirmation": emailConfirmationToken
            }
        }

        insertDB(db, "users", NewUserSchema, () => {
            log.info("User Created")
            callback(true)
        })
    }
const tokenGenerator = () => {
    return sha512({
        a: `${uuid.v5(uuid.v4(), uuid.v5(uuid.v4(), uuid.v4()))}-${uuid.v5(uuid.v4(), uuid.v5(uuid.v4(), uuid.v4()))}-${uuid.v5(uuid.v4(), uuid.v5(uuid.v4(), uuid.v4()))}`,
        b: uuid.v5(uuid.v5(uuid.v4(), uuid.v4()), uuid.v5(uuid.v4(), uuid.v4())) + (new Date()).toISOString()
    })
}