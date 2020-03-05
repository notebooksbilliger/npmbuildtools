const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const btools = require('../index');
const thisPackage = require('../package.json');

console.log('\u001b[2J'); // clear screen
console.log('Running Mocha Test Suite ...');

describe(`${thisPackage.name} PostPack() tests`, function () {
    it('should succeed', function(done) {

        var npmTarballEnv = 'NPM_TARBALL';
        if (process.env[npmTarballEnv] != undefined) {
            delete process.env[npmTarballEnv];
        }
        assert.ok(process.env[npmTarballEnv] == undefined);

        btools.ConsoleCaptureStart();
        btools.PostPack([ [ './lib/clean-package-elements', 'scripts.test' ] ], true, true);
        btools.ConsoleCaptureStop();

        assert.ok(btools.stdout().length > 0, `stdout should contain lines`);
        assert.equal(btools.stderr().length, 0, `stderr shouldn't contain any lines`);
        assert.ok((process.env[npmTarballEnv] != undefined), `Environment variable '${npmTarballEnv}' should exist`);

        delete process.env[npmTarballEnv];

        done();
    });
});

describe(`${thisPackage.name} CleanPackage() tests`, function () {
    it('should succeed with temporary package file', function(done) {
        var cleanpackage = require('../lib/clean-package-elements');
        var tempPackageFile = path.resolve(`./test/package.json`);
        var tempElements = [ 'scripts.test', 'scripts.prepublish' ];

        fs.writeJSONSync(tempPackageFile, thisPackage, { spaces: 4 });
        btools.ConsoleCaptureStart();
        cleanpackage.CleanPackageElements(`./test`, ...tempElements);
        btools.ConsoleCaptureStop();
        fs.removeSync(tempPackageFile);

        assert.equal(btools.stdout().length, 4, `stdout should contain exact number of lines`);
        assert.equal(btools.stdout()[0], `npm \u001b[34mnotice\u001b[0m Cleaning up package file '${tempPackageFile}'.\n`, `stdout first  line should contain`);
        assert.equal(btools.stdout()[1], `npm \u001b[34mnotice\u001b[0m Removing element '${tempElements[0]}'.\n`, `stdout second line should contain`);
        assert.equal(btools.stdout()[2], `npm \u001b[34mnotice\u001b[0m Element '${tempElements[1]}' doesn't exist.\n`, `stdout third  line should contain`);
        assert.equal(btools.stdout()[3], `npm \u001b[34mnotice\u001b[0m Successfully cleaned up '${tempPackageFile}'.\n`, `stdout fourth line should contain`);
        assert.equal(btools.stderr().length, 0, `stderr shouldn't contain any lines`);

        done();
    });
});

describe(`${thisPackage.name} CheckGlobalDeps() tests`, function () {
    it('should succeed with simple as well as spread syntax', function(done) {
        var checkglobaldeps = require('../lib/check-global-deps');

        btools.ConsoleCaptureStart();
        checkglobaldeps.CheckGlobalDeps('npm');
        checkglobaldeps.CheckGlobalDeps(...['npm']);
        checkglobaldeps.CheckGlobalDeps(...['npm', 'npm']);
        checkglobaldeps.CheckGlobalDeps('npm', 'npm');
        btools.ConsoleCaptureStop();

        done();
    });
});

describe(`${thisPackage.name} GenerateReadme() tests`, function () {
    it('should succeed', function(done) {
        var genadoc = require('../lib/generate-adoc');

        btools.ConsoleCaptureStart();
        genadoc.GenerateReadme();
        btools.ConsoleCaptureStop();

        done();
    });
});
