// const clientOptions = {
//     'url': 'mongodb://localhost:27017/',
//     'database': 'Genkan',
// }

// MongoDB
const MongoClient = require('mongodb').MongoClient
require('./genkan/db')


isAuthenticated = (clientOptions, sid) => {
    MongoClient.connect(clientOptions.url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err

        const db = client.db(clientOptions.database)

        return new Promise((resolve, reject) => {
            findDB(db, 'sessions', { 'sid': sid }, (result) => {
                if (result.length !== 1) {
                    client.close()
                    return resolve('SID_NOT_EXIST')
                }

                // Get time difference between last accessed date and current date
                const timeNow = new Date()
                const storedDate = new Date(result[0].timestamp)
                const diffTime = Math.abs(timeNow - storedDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));


                // Check whether SID is older than 31
                if (diffDays > 31) {
                    deleteDB(db, 'sessions', { 'sid': sid }, () => {
                        client.close()
                        return resolve('SID_EXPIRED')
                    })
                }

                // Payload to update SID expiry
                const UpdateTimestampPayload = {
                    $set: {
                        'timestamp': (new Date()).toISOString(),
                    },
                }

                // Renew session expiry date
                updateDB(db, 'sessions', { 'sid': sid }, UpdateTimestampPayload, () => {
                    client.close()
                    // Return session object
                    return resolve(result)
                })
            })
        })
    })
}

getUserFromUID = (clientOptions, uid) => {
    MongoClient.connect(clientOptions.url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err

        const db = client.db(clientOptions.database)

        return new Promise((resolve, reject) => {
            // Find user with ID
            findDB(db, 'users', { '_id': ObjectId(uid) }, (result) => {
                // Close client after lookup
                client.close()

                // Return 404 if user not found
                if (result.length !== 1) {
                    return resolve('USER_NOT_EXIST')
                }

                // Sanitisation of user object
                const userObj = result[0]
                delete userObj.password // Remove password field from reply

                // If all is well, return 200 with user object
                return resolve(userObj)
            })
        })
    })
}

getUserFromSID = (clientOptions, sid) => {
    MongoClient.connect(clientOptions.url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err

        const db = client.db(clientOptions.database)

        return new Promise((resolve, reject) => {
            // Find user with ID
            findDB(db, 'sessions', { 'sid': sid }, (result) => {
                // Close client after lookup
                client.close()

                // Check whether result exists
                if (result !== 1) {
                    return resolve('SID_NOT_EXIST')
                }

                getUserFromUID(clientOptions, result[0].uid)
                    .then((userObj) => {
                        return resolve(userObj)
                    })
                    .catch((err) => {
                        return resolve(err)
                    })
            })
        })
    })
}

doLogout = (clientOptions, sid) => {
    MongoClient.connect(clientOptions.url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err

        const db = client.db(clientOptions.database)

        return new Promise((resolve, reject) => {
            findDB(db, 'sessions', { 'sid': sid }, (result) => {
                // If such session is found
                if (result.length !== 1) {
                    client.close()
                    return resolve('SID_NOT_EXIST')
                }

                // Payload to update user's last seen in users collection
                const UpdateLastSeenPayload = {
                    $set: {
                        'account.activity.lastSeen': new Date(),
                    },
                }

                // Update database
                deleteDB(db, 'sessions', { 'sid': sid }, () => {
                    updateDB(db, 'users', { '_uid': ObjectId(result[0].uid) }, UpdateLastSeenPayload, () => {
                        client.close()
                        return resolve(sid)
                    })
                })
            })
        })
    })
}

module.exports = {
    'logout': doLogout,
    'get': {
        'user': getUserFromUID,
        'userFromSID': getUserFromSID,
    },
    'is': {
        'authenticated': isAuthenticated,
    },
}
