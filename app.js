// Load environment
// require('dotenv').config()
const config = require("./genkan/config")

// Express related modules
const express = require('express')
const exphbs = require('express-handlebars')
const app = express()
const cookieParser = require('cookie-parser')
const minify = require('express-minify')
const compression = require('compression')
const zlib = require('zlib')
const formidable = require('express-formidable');
const slowDown = require("express-slow-down");


// Express Additional Flags
app.use(compression({
    level: zlib.Z_DEFAULT_COMPRESSION
}))
// app.use(minify({
//     cache: 'cache',
// }))

// Socket.io -- Optional
const server = require('http').Server(app)

// JSON Web Token
var jwt = require('jsonwebtoken');

// MongoDB  -- Optional
const MongoClient = require('mongodb').MongoClient
const url = config.mongo.url
const dbName = config.mongo.database

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

// =========================

// Module imports
require("./genkan/auth/login")
require("./genkan/auth/register")
require('./genkan/db')
require('./genkan/auth/recaptchaValidation')
//const captchaValidation = require('./genkan/auth/recaptchaValidation')

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

app.use(cookieParser(config.genkan.secretKey))


const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // allow 100 requests per 15 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 100:
});

app.use(speedLimiter);

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
    const secretKey = "SecretKey";
    let captcha = req.fields["g-recaptcha-response"];
    captchaValidation(captcha, secretKey, function (captchaResults) {
        //skip captcha validation for testing purposes
        captchaResults = true;
        if (captchaResults === true) {
            log.info("Recaptcha is valid")
            loginAccount(email, password, result => {
                if (result === false) {
                    log.info("Failed to login")
                    return res.render('login', { "result": { "errCredentialsInvalid": true } })
                }

                log.info("Login OK")
                res.cookie('sid', result, { httpOnly: true, secure: true, signed: true, domain: `.${config.webserver.domain}` });
                return res.render('login', { "result": { "loginSuccess": true } })
            })
        }
        else {
            log.warn("User is probably a bot.")
            //return res.render('login', { "result": { "errCredentialsInvalid": true } })
        }

    })
})

server.listen(config.webserver.port, function (err) {
    log.debug(`Web server & Socket.io listening on port ${config.webserver.port}.`)
})
