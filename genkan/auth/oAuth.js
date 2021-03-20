// Load environment
const config = require('../config')
// Name of theme used in configuration
const theme = `genkan-theme-${config.genkan.theme}`

// MongoDB
const MongoClient = require('mongodb').MongoClient
const url = config.mongo.url
const dbName = config.mongo.database
require('../db')

// UUID & Hashing
const sha512 = require('hash-anything').sha512
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Random Password Generator
const generator = require('generate-password');

// Token Generator
const tokenGenerator = require('./tokenGenerator')

// NodeMailer
const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
  host: config.smtp.server,
  port: config.smtp.port,
  auth: {
    user: config.smtp.username,
    pass: config.smtp.password,
  },
});

// Handlebars
const Handlebars = require('handlebars')

// Email Template
const fs = require('fs')
const confirmEmailSource = fs.readFileSync(`node_modules/${theme}/mail/confirmation.hbs`, 'utf8');
const confirmEmailTemplate = Handlebars.compile(confirmEmailSource);

MongoClient.connect(url, {useUnifiedTopology: true}, function(err, client) {
  if (err) throw err

  const db = client.db(dbName)

  loginAccountGoogle = (email, googleID, callback) => {
    // Checks if user has google id in db
    findDB(db, 'users', {'email': email, 'googleID': googleID}, (result) => {
      // If exists
      // console.log(result)
      if (result.length !== 0) {
        // Generate a random token for SID
        const sid = tokenGenerator()

        // Schema for sessions in session collection
        const SessionSchema = {
          'uid': result[0]._id,
          'sid': tokenGenerator(),
          // Why is this in ISOString you ask? Because some stinky reason, MongoDB returns a completely empty object when attempting to .find().
          'timestamp': (new Date()).toISOString(),
          'createdTimestamp': new Date(),
        }
        // Payload to update user's last seen in users collection
        const UpdateLastSeenPayload = {
          $set: {
            'account.activity.lastSeen': new Date(),
          },
        }

        // Update database
        insertDB(db, 'sessions', SessionSchema, () => {
          updateDB(db, 'users', {'email': email}, UpdateLastSeenPayload, () => {
            return callback(sid)
          })
        })

        // If google ID or email of user is not in db
        // That means user is new or probably has existing email but no google ID present
      } else {
        // If user has email in db but google ID is not present
        // We update db to include googleID
        findDB(db, 'users', {'email': email}, (result) => {
          // If user has email in db

          console.log(result[0]._id)
          if (result.length !== 0) {
            // Generate a random token for SID
            const sid = tokenGenerator()

            // Schema for sessions in session collection
            const SessionSchema = {
              'uid': result[0]._id,
              'sid': tokenGenerator(),
              // Why is this in ISOString you ask? Because some stinky reason, MongoDB returns a completely empty object when attempting to .find().
              'timestamp': (new Date()).toISOString(),
              'createdTimestamp': new Date(),
            }
            // Payload to update user's last seen in users collection
            const UpdateLastSeenPayload = {
              $set: {
                'account.activity.lastSeen': new Date(),
              },
            }

            const setGoogleID = {
              $set: {
                'googleID': googleID,
              },
            }

            updateDB(db, 'users', {'email': email}, setGoogleID, () => {
              // Update database
              insertDB(db, 'sessions', SessionSchema, () => {
                updateDB(db, 'users', {'email': email}, UpdateLastSeenPayload, () => {
                  return callback(sid)
                })
              })
              // return callback(true);
            })
          } else {
            // Random password generator here
            const password = generator.generate({
              length: 12,
              strict: true,
            });

            // SHA512 Hashing
            const hashedPasswordSHA512 = sha512({
              a: password,
              b: email + config.genkan.secretKey,
            })

            // Bcrypt Hashing
            const hashedPasswordSHA512Bcrypt = bcrypt.hashSync(hashedPasswordSHA512, saltRounds)

            // Generate email confirmation token
            const emailConfirmationToken = tokenGenerator()

            const NewUserSchema = {
              'email': email,
              'password': hashedPasswordSHA512Bcrypt,
              'googleID': googleID,
              'account': {
                'activity': {
                  'created': new Date(),
                  'lastSeen': null,
                },
                'type': 'STANDARD',
                'suspended': false,
                'emailVerified': false,
              },
              'tokens': {
                'emailConfirmation': emailConfirmationToken,
              },
            }


            // Insert new user into database
            insertDB(db, 'users', NewUserSchema, () => {
              callback(true)
              sendConfirmationEmail(email, emailConfirmationToken)
            })
          }
        })
      }
    })
  }

  // This is for the inserting uid into cookie
  findUIDByGoogleID = (email, googleID, callback) => {
    findDB(db, 'users', {'email': email}, (result) => {
      if (result.length !== 0) {
        const uid = result[0]._id
        callback(uid);
      } else {
        callback(false);
      }
    })
  }
  module.exports = findUIDByGoogleID
})
