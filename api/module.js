// Fetch
const fetch = require('node-fetch');

// Module imports
require('../genkan/api')

isLoggedin = async (clientOptions, sid, callback) => {
    if (clientOptions === undefined) throw new Error('Expected client options object, but got undefined')
    if (clientOptions.genkanSecret === undefined) throw new Error('genkanSecret not provided.')
    if (sid === undefined) throw new Error('Expected sid, but got undefined.')


    // Construct data
    const body = {
        'requestType': 'CHECK_LOGIN_STATUS',
        'apikey': clientOptions.apikey,
        'sid': sid,
    }

    const postData = await encapsulateEncryptPayloadAndStringify(body, clientOptions.genkanSecret)

    // Send API POST Request
    fetch(clientOptions.domain, {
        method: 'post',
        body: postData,
        headers: {'Content-Type': 'application/json'},
    })
        .then((res) => res.json())
        .then((status) => {
            // Return json parsed status back to callback function
            callback(status)
        });
}

getUser = async (clientOptions, uid, callback) => {
    if (clientOptions === undefined) throw new Error('Expected client options object, but got undefined')
    if (clientOptions.genkanSecret === undefined) throw new Error('genkanSecret not provided.')
    // Construct data
    const body = {
        'requestType': 'GET_USER',
        'apikey': clientOptions.apikey,
        'uid': uid,
    }

    const postData = await encapsulateEncryptPayloadAndStringify(body, clientOptions.genkanSecret)

    // Send API POST Request
    fetch(clientOptions.domain, {
        method: 'post',
        body: postData,
        headers: {'Content-Type': 'application/json'},
    })
        .then((res) => res.json())
        .then((status) => {
            // Return json parsed status back to callback function
            callback(status)
        });
}

module.exports = {
    isLoggedin: isLoggedin,
    getUser: getUser,
}
