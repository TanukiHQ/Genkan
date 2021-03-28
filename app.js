// Boot screen
require('./genkan/boot').boot()

// Load environment
const config = require('./genkan/config')
// Name of theme used in configuration
const theme = `genkan-theme-${config.genkan.theme}`

// Get root of project
const root = require('app-root-path')

// Module imports
require(root + '/genkan/core/login')
require(root + '/genkan/core/register')
require(root + '/genkan/db')
require(root + '/genkan/core/recaptchaValidation')
require(root + '/genkan/core/logout')

// Express related modules
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')
const cookieParser = require('cookie-parser')
const formidable = require('express-formidable')
const slowDown = require('express-slow-down')

// Express Additional Options
// Express: Public Directory
app.use('/', express.static(`node_modules/${theme}/public`))

// Handlebars: Render engine
app.set('view engine', 'hbs')

// Handlebars: Environment options
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: `node_modules/${theme}/views/layouts/`,
    helpers: {
        ifEquals(a, b, options) {
            if (a === b) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        },
    },
}))

// Handlebars: Views folder
app.set('views', [
    `node_modules/${theme}/views`,
    `views`,
])

// cookieParser: Secret key for signing
app.use(cookieParser(config.genkan.secretKey))

// cookieParser: Cookie schema for sessions
const SessionCookieOptions = {
    httpOnly: true,
    secure: true,
    signed: true,
    domain: `.${config.webserver.domain}`,
    maxAge: 7890000,
    path: '/',
}

// cookieParser: Cookie schema for notifications
const NotificationCookieOptions = {
    httpOnly: true,
    secure: true,
    signed: true,
    domain: `.${config.webserver.domain}`,
    maxAge: 5000,
    path: '/',
}

// Formidable: For POST data accessing
app.use(formidable())

// Slowdown: For Rate limiting
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // allow 100 requests per 15 minutes, then...
    delayMs: 500, // begin adding 500ms of delay per request above 100:
})
app.use(speedLimiter)

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
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)}`
    },
})
prefix.apply(log.getLogger('critical'), {
    format(level, name, timestamp) {
        return chalk.red.bold(`[${timestamp}] ${level} ${name}:`)
    },
})
if (config.debugMode === true) {
    log.setLevel('debug', true)
} else {
    log.setLevel('info', true)
}

// Express: Routes
const webserver = () => {
    app.get('/signup', (req, res) => {
        res.render('signup', { notifs: req.cookies.notifs })
    })

    app.post('/signup', (req, res) => {
        const email = req.fields.email.toLowerCase().replace(/\s+/g, '')
        const password = req.fields.password

        const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

        // Data validations
        if (emailRegex.test(email) === false || password.length < 8) return

        newAccount(email, password, (result) => {
            if (result === false) {
                log.info('Duplicate account')
                res.cookie('notifs', 'ERR_DUP_EMAIL', NotificationCookieOptions)
                return res.redirect('/signup')
            }

            log.info('Account creation OK')
            return res.render('signup', { 'result': { 'accountCreationSuccess': true } })
        })
    })

    app.get('/login', (req, res) => {
        res.render('login', { notifs: req.cookies.notifs })
    })

    app.post('/login', (req, res) => {
        const email = req.fields.email.toLowerCase().replace(/\s+/g, '')
        const password = req.fields.password

        loginAccount(email, password, (result) => {
            if (result === false) {
                log.info('Failed to login')
                res.cookie('notifs', 'ERR_CREDS_INVALID', NotificationCookieOptions)
                return res.redirect('/login')
            }

            log.info('Login OK')
            res.cookie('sid', result, SessionCookieOptions)
            return res.render('login', { 'result': { 'loginSuccess': true } })
        })
    })

    app.get('/logout', (req, res) => {
        logoutAccount(req.cookies.sid, () => {
            res.clearCookie('sid', SessionCookieOptions)
        })
        return res.redirect('/')
    })

    app.listen(config.webserver.port, (err) => {
        if (err) throw log.error(err)
        log.debug(`Web server & Socket.io listening on port ${config.webserver.port}.`)
    })
}

webserver()
