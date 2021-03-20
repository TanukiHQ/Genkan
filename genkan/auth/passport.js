// Module imports
const root = require('app-root-path');
require(root + '/genkan/auth/login');
require(root + '/genkan/auth/register');
require(root + '/genkan/auth/oAuth');
const config = require(root + '/genkan/config');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;


// Will study and modify code here later on
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: config.genkan.GOOGLE_CLIENT_ID,
  clientSecret: config.genkan.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/google/callback',
  passReqToCallback: true,
},
function(request, accessToken, refreshToken, profile, done) {
  // console.log(profile);
  const googleID = profile.id;
  // const displayName = profile.displayName;
  const email = profile.email;
  const verified = profile.verified;
  const emailVerified = profile.email_verified;
  // console.log(googleID);
  // login and register of user will happen here
  if (verified === true && emailVerified === true) {
    loginAccountGoogle(email, googleID, (result) => {
      console.log('Inside passport')
      console.log(result)
    })
  } else {
    console.log('user is not verified')
  }
  return done(null, profile);
},
));
