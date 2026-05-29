var mongoose = require('mongoose');
var cfenv = require("cfenv");
var crypto = require('crypto');
var Schema = mongoose.Schema;

var PASSWORD_HASH_PREFIX = 'sha256:';

function hashPassword(password) {
  return PASSWORD_HASH_PREFIX + crypto.createHash('sha256').update(password, 'utf8').digest('hex');
}

function isHashedPassword(password) {
  return typeof password === 'string' &&
    password.indexOf(PASSWORD_HASH_PREFIX) === 0 &&
    /^[a-f0-9]{64}$/.test(password.slice(PASSWORD_HASH_PREFIX.length));
}

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
User.findOne({ username: 'admin@snyk.io' }).exec(function (err, user) {
  console.log(user ? [user] : []);
  if (!user) {
    console.log('no admin');
    new User({ username: 'admin@snyk.io', password: hashPassword('SuperSecretPassword') }).save(function (err, user, count) {
      if (err) {
        console.log('error saving admin user');
      }
    });
  } else if (!isHashedPassword(user.password) && typeof user.password === 'string') {
    user.password = hashPassword(user.password);
    user.save(function (saveErr) {
      if (saveErr) {
        console.log('error hashing admin user password');
      }
    });
  }
});
