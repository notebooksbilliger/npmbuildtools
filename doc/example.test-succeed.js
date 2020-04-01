const btools = require('@nbb.com/npmbuildtools');

function functionToTest () {
  console.log('something');
}

describe('your test', function () {
  it('should succeed', function (done) {
    btools.ConsoleCaptureStart(); // start capturing
    try {
      functionToTest(); // call the function you expect to fail
      btools.ConsoleCaptureStop(); // stop capturing regularly because the `catch` block won't be called
    } catch (err) {
      btools.ConsoleCaptureStop(); // stop capturing before doing anything else
      throw err; // now throw the error
    }

    done();
  });
});
