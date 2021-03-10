// Press any key to continue
const pressAnyKey = require('press-any-key');

// Token Generator
require("./auth/tokenGenerator")

// JSON writer
const jsonfile = require('jsonfile')

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
        "webserver": {
            "domain": "localhost:5000",
            "port": 5000
        },
        "mongo": {
            "url": "mongodb://localhost:27017/",
            "database": "Genkan",
            "collection": "users"
        },
        "genkan": {
            "secretKey": tokenGenerator()
        },
        "smtp": {
            "server": "smtp.sendgrid.net",
            "port": 587,
            "username": "apikey",
            "password": "password",
            "mailFromAddress": "accounts@example.com"
        },
        "loggingLevel": "info"
    }

    const file = './config.json'

    jsonfile.writeFileSync(file, ConfigSchema, { spaces: 2 })
}

try {
    const config = require("./config.json")
    module.exports = config
} catch (error) {
    log.error("Genkan configuration file missing. Generating a new one for you.")
    generateNewConfig()

    const config = require("./config.json")
    module.exports = config
}

generateNewConfig()

// if (fs.existsSync("../config.json") === undefined) {
//     if (fs.existsSync("genkan.lock") === undefined) {
//         log.error("No valid genkan configuration file is present. (config.json is missing!).\n\nPlanning to start afresh? Delete '/genkan/genkan.lock' and run Genkan normally, a new configuration file will be generated for you.")
//         process.exit()
//     }

//     log.info("We have detected that this is a new installation of Genkan.\nA configuration file has been generated for you (/config.json). Please edit this file with the desired values.\n\nWe will now pause execution and await for your return.\n(Press enter to continue)")

//     generateNewConfig()

//     pressAnyKey().then(() => {
//         const config = require("../config.json")
//         module.exports = config
//     })
// } else {
//     const config = require("../config.json")
//     module.exports = config
// }