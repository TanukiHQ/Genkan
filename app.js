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


app.get('/signup', (req, res) => {
    res.render('signup')
})

app.post('/signup', (req, res) => {
    var email = req.fields.email.toLowerCase().replace(/\s+/g, '')
    var password = req.fields.password

    // Data validations
    if (emailRegex.test(email) === false || password.length < 8) return

    newAccount(email, password, result => {
        if (result === false) {
            log.info("Duplicate account")
            return res.render('signup', { "result": { "errDuplicateEmail": true } })
        }

        log.info("New Account OK")
        return res.render('signup', { "result": { "accountCreationSuccess": true } })
    })
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', (req, res) => {
    var email = req.fields.email.toLowerCase().replace(/\s+/g, '')
    var password = req.fields.password

    loginAccount(email, password, result => {
        if (result === false) {
            log.info("Failed to login")
            return res.render('login', { "result": { "errCredentialsInvalid": true } })
        }

        log.info("Login OK")
        return res.render('login', { "result": { "loginSuccess": true } })
    })
})

server.listen(process.env.WEBSERVER_PORT, function (err) {
    log.debug(`Web server & Socket.io listening on port ${process.env.WEBSERVER_PORT}.`)
})

// For MongoDB requirement
MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    if (err) {
        log.error("Failed to connect to MongoDB instance (Check config file for typos)")
        return exit()
    }

    log.info("Connection with MongoDB successful.")
    const db = client.db(dbName)

    newAccount = (email, password, callback) => {
        // Check for duplicate accounts
        findDB(db, "users", { "email": email }, result => {
            // Reject if duplicate
            if (result.length !== 0) {
                return callback(false)
            }

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

            // Insert new user into database
            insertDB(db, "users", NewUserSchema, () => {
                log.info("User Created")
                callback(true)
            })

        })
    }

    loginAccount = (email, password, callback) => {
        // SHA512 Hashing
        var incomingHashedPasswordSHA512 = sha512({
            a: password,
            b: email
        })
        log.info("Loggin in...")

        // Find account to get stored hashed
        findDB(db, "users", { "email": email }, result => {
            // If no account found
            if (result.length !== 1) {
                return callback(false)
            }
            // Compare whether incoming is the same as stored
            if (bcrypt.compareSync(incomingHashedPasswordSHA512, result[0].password)) {

                // Payload to update database with
                const SessionPayload = {
                    $push: {
                        sessions: {
                            sid: tokenGenerator(),
                            timestamp: new Date()
                        }
                    },
                    $set: {
                        "account.activity.lastSeen": new Date()
                    }
                }

                // Update database
                return updateDB(db, "users", { "email": email }, SessionPayload, () => {
                    return callback(true)
                })
            } else {
                // If account details are invalid, reject
                return callback(false)
            }
        })
    }
}) // End of MongoClient

const tokenGenerator = () => {
    // Generate and return (sync) random sha512 string
    return sha512({
        a: `${uuid.v5(uuid.v4(), uuid.v5(uuid.v4(), uuid.v4()))}-${uuid.v5(uuid.v4(), uuid.v5(uuid.v4(), uuid.v4()))}-${uuid.v5(uuid.v4(), uuid.v5(uuid.v4(), uuid.v4()))}`,
        b: uuid.v5(uuid.v5(uuid.v4(), uuid.v4()), uuid.v5(uuid.v4(), uuid.v4())) + (new Date()).toISOString()
    })
}