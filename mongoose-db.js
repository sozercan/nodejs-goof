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

User.pre('save', function (next) {
  var user = this;
  if (!user.isModified('password')) return next();

  var salt = crypto.randomBytes(16);
  crypto.scrypt(user.password, salt, 64, function (err, passwordHash) {
    if (err) return next(err);
    user.password = 'scrypt$' + salt.toString('hex') + '$' + passwordHash.toString('hex');
    next();
  });
});

User.methods.verifyPassword = function (password, callback) {
  if (typeof password !== 'string' || typeof this.password !== 'string') {
    return callback(null, false);
  }

  var passwordParts = this.password.split('$');
  if (passwordParts.length !== 3 || passwordParts[0] !== 'scrypt' ||
      !/^[0-9a-f]{32}$/.test(passwordParts[1]) || !/^[0-9a-f]{128}$/.test(passwordParts[2])) {
    return callback(null, false);
  }

  var salt = Buffer.from(passwordParts[1], 'hex');
  var expectedHash = Buffer.from(passwordParts[2], 'hex');
  crypto.scrypt(password, salt, expectedHash.length, function (err, passwordHash) {
    if (err) return callback(err);
    callback(null, crypto.timingSafeEqual(expectedHash, passwordHash));
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
User.remove({ username: 'admin@snyk.io' }).exec(function (err) {
  if (err) {
    return console.log('error invalidating existing admin user');
  }

  var bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!bootstrapPassword) {
    return console.log('admin user not provisioned: BOOTSTRAP_ADMIN_PASSWORD is not set');
  }

  new User({ username: 'admin@snyk.io', password: bootstrapPassword }).save(function (err) {
    if (err) {
      console.log('error saving admin user');
    }
  });
});
