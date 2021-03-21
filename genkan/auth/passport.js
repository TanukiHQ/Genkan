// Module imports
const root = require('app-root-path');
require(root + '/genkan/auth/login');
require(root + '/genkan/auth/register');
require(root + '/genkan/auth/oAuth');
const config = require(root + '/genkan/config');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

// // Will study and modify code here later on
// Apparently these are all for the sessions
// But however we do not need them as we stored them in the db and cookie is made at app.js
// passport.serializeUser(function (user, done) {
//  done(null, user.id);
// });

// passport.deserializeUser(function (email, done) {
//    console.log(email)
//    console.log(done)
//    console.log("deserialise")
//    done(null, email);
// });

passport.use(new GoogleStrategy({
    clientID: config.genkan.GOOGLE_CLIENT_ID,
    clientSecret: config.genkan.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/google/callback',
},
function(accessToken, refreshToken, profile, done) {
    // console.log(profile);
    const googleID = profile.id;
    // const displayName = profile.displayName;
    const email = profile.email;
    const verified = profile.verified;
    const emailVerified = profile.email_verified;
    // console.log(googleID);
    // We check if google user is verified and has its email verified
    if (verified === true && emailVerified === true) {
        loginAccountGoogle(email, googleID, (result) => {
            return done(null, profile);
        })
    } else {
        return done(null, false);
    }
},
));
