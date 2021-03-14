// Load environment
const config = require("../config")

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
    if (err) throw err
    
    const db = client.db(dbName)
    loginAccount = (email, password, callback) => {
        // SHA512 Hashing
        var incomingHashedPasswordSHA512 = sha512({
            a: password,
            b: email
        })

        // Find account to get stored hashed
        findDB(db, "users", { "email": email }, result => {
            // If no account found
            if (result.length !== 1) {
                return callback(false)
            }
            // Compare whether incoming is the same as stored
            if (bcrypt.compareSync(incomingHashedPasswordSHA512, result[0].password)) {

                // Generate a random token for SID
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
                    return callback(sid)
                })
            } else {
                // If account details are invalid, reject
                return callback(false)
            }
        })
    }

    inLoggedin = (sid, callback) => {
        findDB(db, "users", { "sessions.sid": sid }, result => {
            // If no such session exist
            if (result.length !== 1) {
                return callback(false)
            }

            const updateTimestampPayload = {
                "sessions.timestamp": new Date()
            }

            updateDB(db, "users", { "sessions.sid": sid }, updateTimestampPayload, () => {
                return callback(true)
            })
        })
    }

    module.exports = loginAccount
})
