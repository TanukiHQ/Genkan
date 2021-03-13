// Load environment
const config = require("./genkan/config")

// Get root of project
const root = require("app-root-path")

// Module imports
require(root + "/genkan/auth/login")
require(root + "/genkan/auth/register")
require(root + '/genkan/db')
require(root + '/genkan/auth/recaptchaValidation')

// Express related modules
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')
const cookieParser = require('cookie-parser')
const formidable = require('express-formidable');
const slowDown = require("express-slow-down");

// Express Additional Options
// Express: Public Directory
app.use(express.static(`themes/nichijou/public`))

// Handlebars: Render engine
app.set('view engine', 'hbs')
// Handlebars: Environment options
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: `themes/nichijou/views/layouts/`
}))
// Handlebars: Views folder
app.set('views', `themes/nichijou/views`)

// cookieParser: Secret key for signing
app.use(cookieParser(config.genkan.secretKey))

// cookieParser: Cookie schema
const CookieOptions = {
    httpOnly: true,
    secure: true,
    signed: true,
    domain: `.${config.webserver.domain}`
}

// Formidable: For POST data accessing
app.use(formidable());

// Slowdown: For Rate limiting
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

    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

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
    log.debug(req.signedCookies.sid)
    res.render('login')
})

app.post('/login', (req, res) => {
    var email = req.fields.email.toLowerCase().replace(/\s+/g, '')
    var password = req.fields.password
    var captcha = req.fields["g-recaptcha-response"];
    captchaValidation(captcha, config.genkan.googleRecaptchaSecretKey, function (captchaResults) {
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
                res.cookie('sid', result, CookieOptions);
                return res.render('login', { "result": { "loginSuccess": true } })
            })
        }
        else {
            log.warn("User is probably a bot.")
            //return res.render('login', { "result": { "errCredentialsInvalid": true } })
        }

    })
})

app.listen(config.webserver.port, function (err) {
    log.debug(`Web server & Socket.io listening on port ${config.webserver.port}.`)
})
