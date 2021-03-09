// Load environment
// require('dotenv').config()
const config = require("../config")

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
log.setLevel(config.loggingLevel, true)

// MongoDB
const MongoClient = require('mongodb').MongoClient
const url = config.mongo.url
const dbName = config.mongo.database
require('../db')

// Hashing
const sha512 = require('hash-anything').sha512
const bcrypt = require('bcrypt');

// Token Generator
const tokenGenerator = require('./tokenGenerator')

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    const db = client.db(dbName)
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

                var sid = tokenGenerator()

                // Payload to update database with
                const SessionPayload = {
                    $push: {
                        sessions: {
                            sid: sid,
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
                return callback(sid)
            }
        })
    }

    module.exports = loginAccount
})
