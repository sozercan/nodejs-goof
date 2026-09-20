var execFile = require('child_process').execFile;

function isHttpUrl(url) {
  try {
    var parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

function identifyMarkdownImage(url, callback, execFileFn) {
  var runner = execFileFn || execFile;

  if (!isHttpUrl(url)) {
    return false;
  }

  return runner('identify', [url], callback);
}

module.exports = {
  identifyMarkdownImage: identifyMarkdownImage,
  isHttpUrl: isHttpUrl,
};
