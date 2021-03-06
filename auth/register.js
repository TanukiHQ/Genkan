// Load environment
require('dotenv').config()

// Logging
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
log.setLevel(process.env.DEBUG_LEVEL, true)

// MongoDB
const MongoClient = require('mongodb').MongoClient
const url = process.env.MONGODB_URL
const dbName = process.env.DB_NAME
const dbOps = require('../db/db')

// UUID & Hashing
const sha512 = require('hash-anything').sha512
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Token Generator
const tokenGenerator = require('./tokenGenerator')

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
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
                    "suspended": false,
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
    module.exports = newAccount
})