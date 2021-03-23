// Load environment
const config = require('./config')

// MongoDB
const MongoClient = require('mongodb').MongoClient
const {ObjectId} = require('bson')
const url = config.mongo.url
const dbName = config.mongo.database
require('./db')

// API data decryption
const Cryptr = require('cryptr');

// Module Imports
require('./auth/login')


// STANDALONE FUNCTIONS

decapsulateDencryptPayloadAndParse = (encryptedData) => {
    // Load password
    const cryptr = new Cryptr(config.genkan.secretKey);

    // Decrypt data
    const decryptedData = cryptr.decrypt(encryptedData.data)

    // Encapsulate encrypted data
    return JSON.parse(decryptedData)
}

getSessionStatus = (data, callback) => {
    // Check whether API key matches stored
    if (data.apikey !== config.genkan.api.globalAPIKey) {
        console.log('Rejected an API request: Key invalid or mismatched.')
        return callback({'status': 401})
    }

    // if (data.sid.length !== 128) {
    //     console.log("Incoming API request contains SID that is not valid.")
    //     return callback({'status': 400})
    // }

    // Check whether session is valid (Look at login.js for definition)
    checkAndRenewSession(data.sid, (result) => {
        if (result === true) {
            return callback({'status': 200, 'sessionStatus': true})
        } else {
            return callback({'status': 200, 'sessionStatus': false})
        }
    })
}

getUserObject = (data, callback) => {
    // Check whether API key matches stored
    if (data.apikey !== config.genkan.api.globalAPIKey) {
        console.log('Rejected an API request: Key invalid or mismatched.')
        return callback({'status': 401})
    }

    // Initialise MongoDB client
    MongoClient.connect(url, {useUnifiedTopology: true}, function(err, client) {
        if (err) throw err

        const db = client.db(dbName)

        // Find user with ID
        findDB(db, 'users', {'_id': ObjectId(data.uid)}, (result) => {
            // Close client after lookup
            client.close()

            // Return 404 if user not found
            if (result.length !== 1) {
                return callback({'status': 404})
            }

            // Sanitisation of user object
            const userObj = result[0]
            delete userObj.password // Remove password field from reply

            // If all is well, return 200 with user object
            return callback({
                'status': 200,
                'userObj': userObj,
            })
        })
    })
}

// MODULE ONLY FUNCTIONS

encapsulateEncryptPayloadAndStringify = (data, secret) => {
    // Set encryption key
    const cryptr = new Cryptr(secret)

    // Encapsulate encrypted data
    return JSON.stringify({'data': (cryptr.encrypt(JSON.stringify(data))).toString()})
}

module.exports = decapsulateDencryptPayloadAndParse
module.exports = encapsulateEncryptPayloadAndStringify
module.exports = getSessionStatus
module.exports = getUserObject
