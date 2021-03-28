// Misc
const chalk = require('chalk')
const package = require(`../package.json`)

module.exports = {
    boot: () => {
        console.clear()
        return console.log(`${chalk.rgb(181, 152, 109)(`
  _____               _                 
 / ____|             | |                
| |  __   ___  _ __  | | __ __ _  _ __  
| | |_ | / _ \\| '_ \\ | |/ // _' || '_ \\ 
| |__| ||  __/| | | ||   <| (_| || | | |
 \\_____| \\___||_| |_||_|\\_\\\\__,_||_| |_|`)}

${chalk.whiteBright(`Genkan 玄関`)} | ${chalk.green('Made with ❤ by Hakkou.app (Read LICENSE for more info)')}
${chalk.grey(`Version: ${chalk.bold(chalk.magenta(`${package.version}`))}`)}
`)
    },
}
