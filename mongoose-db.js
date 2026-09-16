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

var PASSWORD_HASH_ITERATIONS = 100000;
var PASSWORD_HASH_KEYLEN = 64;
var PASSWORD_HASH_DIGEST = 'sha512';

function isPasswordHash(password) {
  return typeof password === 'string' && password.indexOf('pbkdf2$') === 0;
}

function hashPassword(password) {
  var salt = crypto.randomBytes(16).toString('hex');
  var hash = crypto.pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_KEYLEN, PASSWORD_HASH_DIGEST).toString('hex');
  return ['pbkdf2', PASSWORD_HASH_ITERATIONS, salt, hash].join('$');
}

User.pre('save', function (next) {
  if (this.isModified('password') && !isPasswordHash(this.password)) {
    this.password = hashPassword(this.password);
  }
  next();
});

User.methods.comparePassword = function (password) {
  if (!isPasswordHash(this.password)) {
    return password === this.password;
  }

  var parts = this.password.split('$');
  if (parts.length !== 4) {
    return false;
  }

  var hash = crypto.pbkdf2Sync(password, parts[2], parseInt(parts[1], 10), PASSWORD_HASH_KEYLEN, PASSWORD_HASH_DIGEST).toString('hex');
  var stored = Buffer.from(parts[3], 'hex');
  var candidate = Buffer.from(hash, 'hex');

  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
};

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
User.find({ username: 'admin@snyk.io' }).exec(function (err, users) {
  console.log(users);
  if (users.length === 0) {
    console.log('no admin');
    new User({ username: 'admin@snyk.io', password: 'SuperSecretPassword' }).save(function (err, user, count) {
      if (err) {
        console.log('error saving admin user');
      }
    });
  }
});
