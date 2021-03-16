// Load environment
const config = require("../config")

// MongoDB
const MongoClient = require('mongodb').MongoClient
const url = config.mongo.url
const dbName = config.mongo.database
require('../db')

// UUID & Hashing
const sha512 = require('hash-anything').sha512
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Token Generator
const tokenGenerator = require('./tokenGenerator')

//Random Password Generator
const generator = require('generate-password');

// NodeMailer
const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    host: config.smtp.server,
    port: config.smtp.port,
    auth: {
        user: config.smtp.username,
        pass: config.smtp.password
    }
});

// Handlebars
const Handlebars = require("handlebars")

// Email Template
const fs = require('fs')
const confirmEmailSource = fs.readFileSync(`./themes/nichijou/mail/confirmation.hbs`, 'utf8');
const confirmEmailTemplate = Handlebars.compile(confirmEmailSource);

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    const db = client.db(dbName)
    newAccount = (email, password, googleID, callback) => {
        // Check for duplicate accounts
        findDB(db, "users", { "email": email }, result => {
            // Reject if duplicate
            if (result.length !== 0) {
                return callback(false)
            }

            // SHA512 Hashing
            var hashedPasswordSHA512 = sha512({
                a: password,
                b: email + config.genkan.secretKey
            })

            // Bcrypt Hashing
            var hashedPasswordSHA512Bcrypt = bcrypt.hashSync(hashedPasswordSHA512, saltRounds)

            // Generate email confirmation token
            var emailConfirmationToken = tokenGenerator()

            const NewUserSchema = {
                "email": email,
                "password": hashedPasswordSHA512Bcrypt,
                "googleID": googleID,
                "account": {
                    "activity": {
                        "created": new Date(),
                        "lastSeen": null
                    },
                    "type": "STANDARD",
                    "suspended": false,
                    "emailVerified": false
                },
                "tokens": {
                    "emailConfirmation": emailConfirmationToken
                }
            }

            // Insert new user into database
            insertDB(db, "users", NewUserSchema, () => {
                callback(true)
                sendConfirmationEmail(email, emailConfirmationToken)
            })
        })
    }

    newAccountGoogle = (email, googleID, callback) => {
        findDB(db, "users", { "email": email }, result => {
            //If user has email in db
            if (result.length !== 0) {

                findDB(db, "users", { "email": email, "googleID": googleID }, result => {

                    //If user has email and googleID in db
                    if (result.length !== 0) {
                        return callback(false)
                    }
                    else {
                        const setGoogleID = {
                            $set: {
                                "googleID": googleID
                            }
                        }

                        updateDB(db, "users", { "email": email }, setGoogleID, () => {
                            return callback("updated db")//console.log("it exists")
                        })
                    }

                })
            }
            //New user when login with Google OAuth
            else {
                //Random password generator here
                var password = generator.generate({
                    length: 12,
                    strict: true
                });

                // SHA512 Hashing
                var hashedPasswordSHA512 = sha512({
                    a: password,
                    b: email + config.genkan.secretKey
                })

                // Bcrypt Hashing
                var hashedPasswordSHA512Bcrypt = bcrypt.hashSync(hashedPasswordSHA512, saltRounds)

                // Generate email confirmation token
                var emailConfirmationToken = tokenGenerator()

                const NewUserSchema = {
                    "email": email,
                    "password": hashedPasswordSHA512Bcrypt,
                    "googleID": googleID,
                    "account": {
                        "activity": {
                            "created": new Date(),
                            "lastSeen": null
                        },
                        "type": "STANDARD",
                        "suspended": false,
                        "emailVerified": false
                    },
                    "tokens": {
                        "emailConfirmation": emailConfirmationToken
                    }
                }

                // Insert new user into database
                insertDB(db, "users", NewUserSchema, () => {
                    callback(true)
                    sendConfirmationEmail(email, emailConfirmationToken)
                })
            }
        })
    }

    sendConfirmationEmail = (email, token) => {
        // Compile from email template
        var data = {
            receiver: email,
            url: `https://id.hakkou.app/register?confirmation=${token}`
        }
        var message = confirmEmailTemplate(data);

        // send email
        transporter.sendMail({
            from: config.smtp.mailFromAddress,
            to: email,
            subject: 'Confirm your HakkouID',
            html: message
        });
    }

    confirmEmail = (token, callback) => {
        findDB(db, "users", { "tokens.emailConfirmation": token }, result => {
            if (result.length !== 1) {
                return callback(false)
            }
            const AccountActivatePayload = {
                $unset: {
                    "tokens.emailConfirmation": true
                },
                $set: {
                    "account.emailVerified": true
                }
            }

            updateDB(db, "users", { "tokens.emailConfirmation": token }, AccountActivatePayload, () => {
                callback(true)
            })
        })
    }

    module.exports = newAccount
})