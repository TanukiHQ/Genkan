// Load environment
require('dotenv').config()

// Express related modules
const express = require('express')
const exphbs = require('express-handlebars')
const app = express()
const cookieParser = require('cookie-parser')
const minify = require('express-minify')
const compression = require('compression')
const zlib = require('zlib')
const formidable = require('express-formidable');

// Express Additional Flags
app.use(compression({
    level: zlib.Z_DEFAULT_COMPRESSION
}))
// app.use(minify({
//     cache: 'cache',
// }))
// app.use(cookieParser())

// Socket.io -- Optional
const server = require('http').Server(app)

// JSON Web Token
var jwt = require('jsonwebtoken');

// MongoDB  -- Optional
const MongoClient = require('mongodb').MongoClient
const url = process.env.MONGODB_URL
const dbName = process.env.DB_NAME

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
log.setLevel("debug", true)

// =========================

// Module imports
require("./auth/login")
require("./auth/register")
require('./db/db')

// Email Regex 
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: `themes/nichijou/views/layouts/`
}))

app.set('view engine', 'hbs')
app.set('views', `themes/nichijou/views`)

app.use(express.static(`themes/nichijou/public`))

app.use(formidable());

app.use(minify({
    cache: 'cache',
}))
app.use(compression())


app.get('/signup', (req, res) => {
    res.render('signup')
})

app.post('/signup', (req, res) => {
    var email = req.fields.email.toLowerCase().replace(/\s+/g, '')
    var password = req.fields.password

    // Data validations
    if (emailRegex.test(email) === false || password.length < 8) return

    newAccount(email, password, result => {
        if (result === false) {
            log.info("Duplicate account")
            return res.render('signup', { "result": { "errDuplicateEmail": true } })
        }

        log.info("New Account OK")
        return res.render('signup', { "result": { "accountCreationSuccess": true } })
    })
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', (req, res) => {
    var email = req.fields.email.toLowerCase().replace(/\s+/g, '')
    var password = req.fields.password

    loginAccount(email, password, result => {
        if (result === false) {
            log.info("Failed to login")
            return res.render('login', { "result": { "errCredentialsInvalid": true } })
        }

        log.info("Login OK")
        return res.render('login', { "result": { "loginSuccess": true } })
    })
})

server.listen(process.env.WEBSERVER_PORT, function (err) {
    log.debug(`Web server & Socket.io listening on port ${process.env.WEBSERVER_PORT}.`)
})
