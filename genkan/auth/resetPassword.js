// Load environment
// require('dotenv').config()
const config = require("./config")

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

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    const db = client.db(dbName)

    resetPassword = (resetPasswordToken, newPassword, callback) => {
        findDB(db, "users", { "resetPassword": resetPasswordToken }, result => {
            if (result.length !== 1) {
                return callback(false)
            }

            // SHA512 Hashing
            var hashedPasswordSHA512 = sha512({
                a: newPassword,
                b: email
            })

            // Bcrypt Hashing
            var hashedPasswordSHA512Bcrypt = bcrypt.hashSync(hashedPasswordSHA512, saltRounds)

            const SetPasswordPayload = {
                $set: {
                    "password": hashedPasswordSHA512Bcrypt
                }
            }

            insertDB(db, "users", { "resetPassword": resetPasswordToken }, SetPasswordPayload, () => {
                callback(true)
            })
        })
    }

    module.exports = resetPassword
})
