var mongoose = require('mongoose');
var cfenv = require("cfenv");
var crypto = require('crypto');
var Schema = mongoose.Schema;

var PASSWORD_ITERATIONS = 600000;

var Todo = new Schema({
  content: Buffer,
  updated_at: Date,
});

mongoose.model('Todo', Todo);

var User = new Schema({
  username: String,
  password: String,
});

User.pre('save', function (next) {
  var user = this;
  if (!user.isModified('password')) return next();

  crypto.randomBytes(16, function (err, salt) {
    if (err) return next(err);
    crypto.pbkdf2(user.password, salt, PASSWORD_ITERATIONS, 32, 'sha256', function (err, hash) {
      if (err) return next(err);
      user.password = ['pbkdf2', PASSWORD_ITERATIONS, salt.toString('hex'), hash.toString('hex')].join('$');
      next();
    });
  });
});

User.methods.verifyPassword = function (password, callback) {
  if (typeof this.password !== 'string') return callback(null, false);
  var parts = this.password.split('$');
  if (typeof password !== 'string' || parts.length !== 4 || parts[0] !== 'pbkdf2' ||
      Number(parts[1]) !== PASSWORD_ITERATIONS) return callback(null, false);

  var salt = Buffer.from(parts[2], 'hex');
  var expected = Buffer.from(parts[3], 'hex');
  if (salt.length !== 16 || expected.length !== 32) return callback(null, false);

  crypto.pbkdf2(password, salt, PASSWORD_ITERATIONS, expected.length, 'sha256', function (err, actual) {
    if (err) return callback(err);
    callback(null, crypto.timingSafeEqual(expected, actual));
  });
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
User.findOne({ username: 'admin@snyk.io' }).exec(function (err, user) {
  if (err) return console.log('error finding admin user');

  function provisionAdmin() {
    if (!process.env.ADMIN_PASSWORD) {
      return console.log('ADMIN_PASSWORD is not set; admin user was not provisioned');
    }
    new User({ username: 'admin@snyk.io', password: process.env.ADMIN_PASSWORD }).save(function (err) {
      if (err) console.log('error saving admin user');
    });
  }

  if (user && (typeof user.password !== 'string' || user.password.indexOf('pbkdf2$') !== 0)) {
    return user.remove(function (err) {
      if (err) return console.log('error invalidating legacy admin user');
      provisionAdmin();
    });
  }

  if (!user) provisionAdmin();
});
