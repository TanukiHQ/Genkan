const genkan = require('./api/module')

// genkanClient schema
const genkanClient = {
    'apikey': 'genkan_df7f2a3bd77b000607c634b4259c940940886946',
    'genkanSecret': 'dadf4e2c6c0aef3ae5e563018706e82b342c02bebec33477b440914278bce9c167c75114319ba438cc2ba98a3fa497fb8bcd9c3a0f5e239bb091386c3baf4315',
    'domain': 'http://localhost:5000/api',
}

// const userObject = {
//   'email': 'tenkotofu@gmail.com',
//   'password': 'Password123',
// }

// genkan.isLoggedin(genkanClient, '4715f144460fdddba6626562083370da3bf4dc071cc85de8a3dca5369c50d00259e9116307c3962ae95c95c29ece603d91c398cf6367866eb27e7f28cd8074bd', (result) => {
//     console.log(result)
// })


genkan.getUser(genkanClient, '6054d9193dce845df8720acb', (result) => {
    console.log(result)
})

// // For encrypting POST data
// const Cryptr = require('cryptr')
// const cryptr = new Cryptr(genkanClient.genkanSecret)
