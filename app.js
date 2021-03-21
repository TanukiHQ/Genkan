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
require(root + '/genkan/auth/passport')
require(root + '/genkan/auth/oAuth')

// Express related modules
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')
const cookieParser = require('cookie-parser');
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
app.use(session({secret: config.genkan.secretKey, resave: false, saveUninitialized: false}));

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
  // Immediately starts at login page for convinience sake
  app.get('/', (req, res) => res.render('login'))

  app.get('/signup', (req, res) => {
    res.render('signup')
  })

  app.post('/signup', (req, res) => {
    const email = req.fields.email.toLowerCase().replace(/\s+/g, '')
    const password = req.fields.password
    const captcha = req.fields['g-recaptcha-response'];

    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    // NOTE : Will put password checker in a function so its reusable
    if (emailRegex.test(email) === false) {
      log.warn('Email is invalid.')
      return res.render('signup', {'result': {'errInvalidEmail': true}})
    } else if (password == null) {
      log.warn('Password field is empty.')
      return res.render('signup', {'result': {'errInvalidPassword': true}})
    } else if (password.length < 8) {
      log.warn('Password does not contain minimum 8 characters.')
      return res.render('signup', {'result': {'errInvalidPassword': true}})
    } else if (/[A-Z]/.test(password) === false) {
      log.warn('Password does not contain uppercase characters.')
      return res.render('signup', {'result': {'errInvalidPassword': true}})
    } else if (/[a-z]/.test(password) === false) {
      log.warn('Password does not contain lowercase characters.')
      return res.render('signup', {'result': {'errInvalidPassword': true}})
    } else if (/[0-9]/.test(password) === false) {
      log.warn('Password does not contain numeric characters.')
      return res.render('signup', {'result': {'errInvalidPassword': true}})
    } else if (/[$&+,:;=?@#|'<>.^*()%!-]/.test(password) === false) {
      log.warn('Password does not contain special characters.')
      return res.render('signup', {'result': {'errInvalidPassword': true}})
    } else {
      captchaValidation(captcha, config.genkan.googleRecaptchaSecretKey, (captchaResults) => {
      // skip captcha validation for testing purposes
        captchaResults = true;
        if (captchaResults === true) {
          log.info('Recaptcha is valid')
          newAccount(email, password, (result) => {
            if (result === false) {
              log.info('Duplicate account')
              return res.render('signup', {'result': {'errDuplicateEmail': true}})
            }

            log.info('Account creation OK')
            return res.render('signup', {'result': {'accountCreationSuccess': true}})
          })
        } else {
          log.info('Failed captcha check. Ignoring request.')
          return res.render('login', {'result': {'errCredentialsInvalid': true}})
        }
      })
    }
  })

  app.get('/login', (req, res) => {
    res.render('login', {result: req.session.result})
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
    // Clear all sessions
    req.session = null;
    req.logout();
    res.redirect('/');
  })

  // Google OAuth2.0
  app.get('/google', passport.authenticate('google',
      {scope: ['email', 'profile'], prompt: 'select_account'},
  ));

  app.get('/google/callback',
      passport.authenticate('google', {failureRedirect: '/login', session: true}),
      (req, res) => {
        const email = req.user.email
        const googleID = req.user.id
        findUIDByGoogleID(email, googleID, (result) => {
          if (result === false) {
            log.info('Failed login via Google')
            res.redirect('/login');
          } else {
            log.info('Successful login via Google')
            res.cookie('sid', result, CookieOptions);
            res.redirect('/login')
          }
        })
      });

  // app.get('/sms', (req, res) => {
  //  res.render('sms');
  // })

  // app.get('/otp', (req, res) => {
  //  res.render('otp');
  // })

  app.post('/api', (req, res) => {
    console.log(req.fields)
    return res.send({'a': 'a'})
  })

  app.listen(config.webserver.port, function(err) {
    if (err) throw log.error(err)
    log.debug(`Web server & Socket.io listening on port ${config.webserver.port}.`)
  })
}

webserver()
