// Boot screen
require('./genkan/boot').boot()

// Load environment
const config = require('./genkan/config')
// Name of theme used in configuration
const theme = `genkan-theme-${config.genkan.theme}`

// Get root of project
const root = require('app-root-path')

// Module imports
require(root + '/genkan/auth/login')
require(root + '/genkan/auth/register')
require(root + '/genkan/db')
require(root + '/genkan/auth/recaptchaValidation')
require(root + '/genkan/api')
require(root + '/genkan/auth/logout')
// require(root + "/genkan/auth/passport")

// Express related modules
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')
const cookieParser = require('cookie-parser')
const session = require('express-session');
const formidable = require('express-formidable');
const slowDown = require('express-slow-down');
const passport = require('passport');

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
}))

// Handlebars: Views folder
app.set('views', [
    `node_modules/${theme}/views`,
    `views`,
])

// cookieParser: Secret key for signing
app.use(cookieParser(config.genkan.secretKey))

// cookieParser: Cookie schema
const CookieOptions = {
    httpOnly: true,
    secure: true,
    signed: true,
    domain: `.${config.webserver.domain}`,
}

// Express session
app.use(session({ secret: config.genkan.secretKey, resave: false, saveUninitialized: false }));

// Formidable: For POST data accessing
app.use(formidable());

// Initializes passport and passport sessions
app.use(passport.initialize());
app.use(passport.session());

// Slowdown: For Rate limiting
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // allow 100 requests per 15 minutes, then...
    delayMs: 500, // begin adding 500ms of delay per request above 100:
});
app.use(speedLimiter);

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
        res.render('signup')
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
                return res.render('signup', {'result': {'errDuplicateEmail': true}})
            }

            log.info('Account creation OK')
            return res.render('signup', {'result': {'accountCreationSuccess': true}})
        })
    })

    app.get('/login', (req, res) => {
        log.debug(req.signedCookies.sid)
        res.render('login')
    })

    app.post('/login', (req, res) => {
        const email = req.fields.email.toLowerCase().replace(/\s+/g, '')
        const password = req.fields.password
        const captcha = req.fields['g-recaptcha-response'];
        captchaValidation(captcha, config.genkan.googleRecaptchaSecretKey, function(captchaResults) {
            // skip captcha validation for testing purposes
            captchaResults = true;
            if (captchaResults === true) {
                log.info('Recaptcha is valid')
                loginAccount(email, password, (result) => {
                    if (result === false) {
                        log.info('Failed to login')
                        return res.render('login', {'result': {'errCredentialsInvalid': true}})
                    }

                    log.info('Login OK')
                    res.cookie('sid', result, CookieOptions);
                    return res.render('login', {'result': {'loginSuccess': true}})
                })
            } else {
                log.info('Failed captcha check. Ignoring request.')
                // return res.render('login', { "result": { "errCredentialsInvalid": true } })
            }
        })
    })

    app.get('/logout', (req, res) => {
        logoutAccount(req.cookies.sid, () => {
            res.clearCookie('sid', CookieOptions);
        })
        return res.redirect('/');
    })

    // Google OAuth2.0
    // app.get('/google',
    //     passport.authenticate('google', {scope: ['email', 'profile']}));

    // app.get('/google/callback',
    //     passport.authenticate('google', {failureRedirect: '/login'}),
    //     (req, res) => {
    //         res.redirect('/');
    //     });

    // app.get('/sms', (req, res) => {
    //     res.render('sms');
    // })

    // app.get('/otp', (req, res) => {
    //     res.render('otp');
    // })

    app.post('/api', (req, res) => {
        const data = decapsulateDencryptPayloadAndParse(req.fields)

        if (data.requestType === 'CHECK_LOGIN_STATUS') {
            getSessionStatus(data, (result) => {
                console.log(result)
                return res.send(result)
            })
        } else if (data.requestType === 'GET_USER') {
            getUserObject(data, ((result) => {
                return res.send(result)
            }))
        }

        console.log(data)
    })

    app.listen(config.webserver.port, function(err) {
        if (err) throw log.error(err)
        log.debug(`Web server & Socket.io listening on port ${config.webserver.port}.`)
    })
}

webserver()
