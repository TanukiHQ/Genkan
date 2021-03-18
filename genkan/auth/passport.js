// Module imports
// require("/genkan/auth/login")
// require("/genkan/auth/register")
const config = require('./genkan/config');
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
  // User.findOrCreate({ googleId: profile.id }, function (err, user) {
  //    return done(err, user);
  // });
  console.log(profile);
  // const googleID = profile.id;
  // const displayName = profile.displayName;
  // const email = profile.email;
  // const verified = profile.verified;
  // const emailVerified = profile.email_verified;
  // console.log(googleID);
  // console.log(displayName);
  // console.log(email);
  // console.log(emailVerified);

  // newAccount(email, password, result => {
  //    if (result === false) {
  //        log.info("Duplicate account")
  //        return res.render('signup', { "result": { "errDuplicateEmail": true } })
  //    }

  //    log.info("Account creation OK")
  //    return res.render('signup', { "result": { "accountCreationSuccess": true } })
  // })

  // login and register of user will happen here

  return done(null, profile);
},
));
