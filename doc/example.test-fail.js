const assert = require('assert');
const btools = require('@nbb.com/npmbuildtools');

function functionToTest () {
  console.log('something');
}

describe('your test', function () {
  it('should fail', function (done) {
    btools.ConsoleCaptureStart(); // start capturing
    try {
      functionToTest(); // call the function you expect to fail
      assert.fail('should have failed'); // if it unexpectedly succeeds, fail on your own
      // do NOT stop capturing here because the `catch` block will be called anyway!
    } catch (err) {
      btools.ConsoleCaptureStop(); // stop capturing before doing anything else
      // do your asserts here
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, 'expected message', 'Error message should be');
    }

    done();
  });
});
