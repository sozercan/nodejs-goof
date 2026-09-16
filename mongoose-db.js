var mongoose = require('mongoose');
var cfenv = require("cfenv");
var crypto = require('crypto');
var Schema = mongoose.Schema;

var Todo = new Schema({
  content: Buffer,
  updated_at: Date,
});

mongoose.model('Todo', Todo);

var User = new Schema({
  username: String,
  password: String,
});

mongoose.model('User', User);

// CloudFoundry env vars
var mongoCFUri = cfenv.getAppEnv().getServiceURL('goof-mongo');
console.log(JSON.stringify(cfenv.getAppEnv()));

// Default Mongo URI is local
const DOCKER = process.env.DOCKER
if (DOCKER === '1') {
  var mongoUri = 'mongodb://goof-mongo/express-todo';
} else {
  var mongoUri = 'mongodb://localhost/express-todo';
}


// CloudFoundry Mongo URI
if (mongoCFUri) {
  mongoUri = mongoCFUri;
} else if (process.env.MONGOLAB_URI) {
  // Generic (plus Heroku) env var support
  mongoUri = process.env.MONGOLAB_URI;
} else if (process.env.MONGODB_URI) {
  // Generic (plus Heroku) env var support
  mongoUri = process.env.MONGODB_URI;
}

console.log("Using Mongo URI " + mongoUri);

mongoose.connect(mongoUri);

User = mongoose.model('User');
if (process.env.GOOF_SEED_DEV_ADMIN === '1') {
  User.find({ username: 'admin@snyk.io' }).exec(function (err, users) {
    console.log(users);
    if (users.length === 0) {
      var adminPassword = crypto.randomBytes(24).toString('base64');
      var salt = crypto.randomBytes(16).toString('hex');
      var passwordHash = crypto.scryptSync(adminPassword, salt, 64).toString('hex');

      console.log('no admin');
      console.log('Created development admin admin@snyk.io with password: ' + adminPassword);
      new User({ username: 'admin@snyk.io', password: 'scrypt$' + salt + '$' + passwordHash }).save(function (err, user, count) {
        if (err) {
          console.log('error saving admin user');
        }
      });
    }
  });
}
