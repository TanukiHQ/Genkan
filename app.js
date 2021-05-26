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
require(root + '/genkan/core/resetPassword')
require(root + '/genkan/db')
require(root + '/genkan/core/logout')

// Express related modules
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')
const cookieParser = require('cookie-parser')
const csrf = require('csurf')
// const formidable = require('express-formidable')
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
                return options.fn(this)
            } else {
                return options.inverse(this)
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

// BodyParser
app.use(express.urlencoded({ extended: true }))

// Formidable: For POST data accessing
// app.use(formidable())

// Csurf: CSRF protection
app.use(csrf({ cookie: true }))

// cookieParser: Cookie schema for sessions
const SessionCookieOptions = {
    httpOnly: config.webserver.cookieHTTPOnly,
    secure: true,
    signed: true,
    domain: `.${config.webserver.cookieDomain}`,
    maxAge: 7890000,
    path: '/',
}

// cookieParser: Cookie schema for notifications
const NotificationCookieOptions = {
    httpOnly: true,
    secure: true,
    signed: true,
    domain: `.${config.webserver.cookieDomain}`,
    maxAge: 5000,
    path: '/',
}

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
    app.get('/', (req, res) => {
        isLoggedin(req.signedCookies.sid, (result) => {
            if (result === true) {
                return res.redirect(config.genkan.redirect.afterLogin)
            }
            res.redirect('./login')
        })
    })

    app.get('/signup', (req, res) => {
        isLoggedin(req.signedCookies.sid, (result) => {
            if (result === true) {
                return res.redirect(config.genkan.redirect.afterLogin)
            }
            res.render('signup', { notifs: req.signedCookies.notifs, csrfToken: req.csrfToken() })
        })
    })

    app.post('/signup', (req, res) => {
        isLoggedin(req.signedCookies.sid, (result) => {
            if (result === true) {
                return res.redirect(config.genkan.redirect.afterLogin)
            }
            const email = req.body.email.toLowerCase().replace(/\s+/g, '')
            const password = req.body.password

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

                res.cookie('preData', email, NotificationCookieOptions)
                return res.redirect('/confirm')
            })
        })
    })

    app.get('/recover', (req, res) => {
        res.render('recoverAccount', { notifs: req.signedCookies.notifs, csrfToken: req.csrfToken() })
    })

    app.post('/recover', (req, res) => {
        const email = req.body.email.toLowerCase().replace(/\s+/g, '')

        sendResetPasswordEmail(email, () => {
            res.cookie('notifs', 'OK_EMAIL_SENT', NotificationCookieOptions)
            log.info('Recovery email sent.')
            return res.redirect('/recover')
        })
    })

    app.get('/reset', (req, res) => {
        if (req.query.token === undefined) {
            return res.redirect('/recover')
        }

        return res.render('changePassword', { csrfToken: req.csrfToken() })
    })

    app.post('/reset', (req, res) => {
        if (req.query.token === undefined) {
            return false
        }

        resetPassword(req.query.token, req.body.password, (result) => {
            if (result === false) {
                res.cookie('notifs', 'ERR_TOKEN_INVALID', NotificationCookieOptions)
                return res.redirect('/login')
            }

            res.cookie('notifs', 'OK_PWD_RESET', NotificationCookieOptions)
            return res.redirect('/login')
        })
    })

    app.get('/confirm', (req, res) => {
        isLoggedin(req.signedCookies.sid, (result) => {
            if (result === true) {
                return res.redirect(config.genkan.redirect.afterLogin)
            }
            // If user isn't supposed to be on this page (possible directory traversal)
            if (req.signedCookies.preData === undefined) {
                return res.redirect('/login')
            }

            // Check if user is wanting to do an email confirmation
            if (req.query.token !== undefined) {
                confirmEmail(req.query.token, (result) => {
                    if (result === false) {
                        return res.render('confirmEmail', { notifs: 'ERR_EMAIL_TOKEN_INVALID' })
                    }

                    return res.render('confirmEmail', { notifs: 'OK_EMAIL_CONFIRMED', csrfToken: req.csrfToken() })
                })
            }

            // Else give them the email confirmation page
            return res.render('confirmEmail', { userEmailAddress: req.signedCookies.preData })
        })
    })

    app.get('/login', (req, res) => {
        isLoggedin(req.signedCookies.sid, (result) => {
            if (result === true) {
                return res.redirect(config.genkan.redirect.afterLogin)
            }
            res.render('login', { notifs: req.signedCookies.notifs, csrfToken: req.csrfToken() })
        })
    })

    app.post('/login', (req, res) => {
        isLoggedin(req.signedCookies.sid, (result) => {
            if (result === true) {
                return res.redirect(config.genkan.redirect.afterLogin)
            }
            const email = req.body.email.toLowerCase().replace(/\s+/g, '')
            const password = req.body.password

            loginAccount(email, password, (result) => {
                if (result === false) {
                    log.info('Failed to login')
                    res.cookie('notifs', 'ERR_CREDS_INVALID', NotificationCookieOptions)
                    return res.redirect('/login')
                }

                log.info('Login OK')
                res.cookie('sid', result, SessionCookieOptions)
                return res.redirect(config.genkan.redirect.afterLogin)
            })
        })
    })

    app.get('/logout', (req, res) => {
        isLoggedin(req.signedCookies.sid, (result) => {
            if (result === false) {
                res.cookie('notifs', 'ERR_ALREADY_LOGGEDOUT', NotificationCookieOptions)
                return res.redirect('/login')
            }
            res.render('logout', { csrfToken: req.csrfToken() })
        })
    })

    app.post('/logout', (req, res) => {
        // By default, do not sign out of all devices
        signoutType = false

        if (req.body.logoutOf == 'ALL') {
            signoutType = true
        }

        logoutAccount(req.signedCookies.sid, signoutType, () => {
            res.clearCookie('sid', SessionCookieOptions)
            return res.redirect(config.genkan.redirect.afterSignout)
        })
    })

    app.listen(config.webserver.port, (err) => {
        if (err) throw log.error(err)
        log.debug(`Web server & Socket.io listening on port ${config.webserver.port}.`)
    })
}

webserver()
