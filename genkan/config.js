// Token Generator
require('./auth/tokenGenerator')

// JSON writer
const jsonfile = require('jsonfile')

// Get root of project
const root = require('app-root-path')

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

const generateNewConfig = () => {
    const ConfigSchema = {
        'webserver': {
            'domain': 'localhost:5000',
            'port': 5000,
        },
        'mongo': {
            'url': 'mongodb://localhost:27017/',
            'database': 'Genkan',
            'collection': 'users',
        },
        'genkan': {
            'theme': 'uchi',
            'redirect': {
                'afterLogin': 'http://localhost:5000/success',
                'afterSignout': 'https://localhost:5000/loggedout',
            },
            'googleRecaptchaSecretKey': '',
            'GOOGLE_CLIENT_ID': '',
            'GOOGLE_CLIENT_SECRET': '',
            'allowGoogleOAuth': '',
            'allowFacebookOAuth': '',
            'allowTwitterOAuth': '',
            'secretKey': tokenGenerator(),
            'api': {
                'globalAPIKey': apiKeyGenerator(),
                'useHTTPS': true,
            },
        },
        'smtp': {
            'server': 'smtp.sendgrid.net',
            'port': 587,
            'username': 'apikey',
            'password': 'password',
            'mailFromAddress': 'accounts@example.com',
        },
        'debugMode': true,
    }

    const file = './config.json'

    jsonfile.writeFileSync(file, ConfigSchema, {spaces: 2})
}

try {
    module.exports = require(root + '/config.json')
} catch (error) {
    try {
        if (fs.existsSync(path)) {
            log.error('Genkan couldn\'t load the configuration file correctly. Please ensure that the file is not corrupted and is valid JSON.')
            process.exit()
        }
    } catch (err) {
        log.error('We have detected that this is a new installation of Genkan.\nA configuration file has been generated for you.\nPlease start Genkan back up after modifying the file to your desired settings.')
        generateNewConfig()
        process.exit()
    }
}
