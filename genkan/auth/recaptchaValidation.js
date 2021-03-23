const fetch = require('node-fetch');

// Google Recaptcha V3 Documentation
// https://www.google.com/recaptcha/about/

captchaValidation = function(captchaResponse, secretKey, callback) {
    // For reference
    // const siteUrl = 'https://www.google.com/recaptcha/api/siteverify?secret=your_secret&response=response_string';

    if (captchaResponse === undefined || captchaResponse === '' || captchaResponse === null) {
        return callback(false);
    } else if (secretKey === undefined || secretKey === '' || secretKey === null) {
        return callback(false);
    } else {
        const verifyURL =
            'https://www.google.com/recaptcha/api/siteverify?secret=' +
            secretKey +
            '&response=' +
            captchaResponse;
        fetch(verifyURL)
            .then((res) => res.json())
            .then((json) => {
                const bodyContent = json;
                const isSuccess = bodyContent['success'];
                // you can set the minimum scores at google recaptcha admin console

                // const score = bodyContent['score']
                // const challenge_ts = bodyContent['challenge_ts']
                if (isSuccess === true) {
                    return callback(true);
                } else {
                    return callback(false);
                }
            });
    }
}

module.exports = captchaValidation;
