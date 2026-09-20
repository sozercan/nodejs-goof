const test = require('node:test');
const assert = require('node:assert/strict');

const imageIdentify = require('../routes/image-identify');

test('identifyMarkdownImage uses identify with argv separation for image URLs', () => {
  const maliciousUrl = 'http://example.test/image.jpg;id';
  let callbackInvoked = false;

  const result = imageIdentify.identifyMarkdownImage(
    maliciousUrl,
    (err, stdout, stderr) => {
      callbackInvoked = true;
      assert.equal(err, null);
      assert.equal(stdout, 'ok');
      assert.equal(stderr, '');
    },
    (command, args, callback) => {
      assert.equal(command, 'identify');
      assert.deepEqual(args, [maliciousUrl]);
      assert.equal(typeof callback, 'function');
      callback(null, 'ok', '');
      return 'spawned';
    }
  );

  assert.equal(result, 'spawned');
  assert.equal(callbackInvoked, true);
});

test('identifyMarkdownImage ignores non-http(s) image URLs', () => {
  let called = false;

  const result = imageIdentify.identifyMarkdownImage(
    'file:///etc/passwd',
    () => {
      called = true;
    },
    () => {
      called = true;
    }
  );

  assert.equal(result, false);
  assert.equal(called, false);
});

test('isHttpUrl only accepts http and https URLs', () => {
  assert.equal(imageIdentify.isHttpUrl('http://example.test/image.png'), true);
  assert.equal(imageIdentify.isHttpUrl('https://example.test/image.png'), true);
  assert.equal(imageIdentify.isHttpUrl('javascript:alert(1)'), false);
  assert.equal(imageIdentify.isHttpUrl('file:///etc/passwd'), false);
});
