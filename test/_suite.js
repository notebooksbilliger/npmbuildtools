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

describe(`${thisPackage.name}  AsciiDoc tests`, function () {
    var genadoc = require('../lib/generate-adoc');

    it('ResolveIncludes() should fail without proper root source path for include files', function(done) {
        var result;

        btools.ConsoleCaptureStart();
        try {
            result = genadoc.ResolveIncludes();
            btools.ConsoleCaptureStop();
            assert.fail(`should have failed`);
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `The root source path for include files 'undefined' is not a directory.`, `Error message should be`)
            assert.equal(result, undefined, `Variable 'result' should have exact value`);
        }

        done();
    });

    it('ResolveIncludes() should fail without lineBreak specification', function(done) {
        var result;

        btools.ConsoleCaptureStart();
        try {
            result = genadoc.ResolveIncludes('.');
            btools.ConsoleCaptureStop();
            assert.fail(`should have failed`);
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `The 'lineBreak' parameter is not a string.`, `Error message should be`)
            assert.equal(result, undefined, `Variable 'result' should have exact value`);
        }

        done();
    });

    it('ResolveIncludes() should succeed', function(done) {
        var fakeRoot = '.';
        var fakePath = 'fakePath';

        btools.ConsoleCaptureStart();
        genadoc.ResolveIncludes(fakeRoot, '\r\n', `include::${fakePath}[]include::${fakePath}[]`);
        btools.ConsoleCaptureStop();

        assert.equal(btools.stdout().length, 0, `stdout shouldn't contain any lines`);
        assert.equal(btools.stderr().length, 2, `stderr should contain exact number of lines`);
        assert.equal(btools.stderr()[0], `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.\n`, `stderr first  line should contain`);
        assert.equal(btools.stderr()[1], `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.\n`, `stderr second line should contain`);

        done();
    });

    it('GenerateReadme() should succeed', function(done) {
        var packagePath = path.resolve('.');
        var readmeFileName = 'README.adoc';

        var oldReadmeContent ='';
        var readmeFile = path.join(packagePath, readmeFileName);
        if (fs.existsSync(readmeFile)) {
            oldReadmeContent = fs.readFileSync(readmeFile, { encoding: 'utf8' });
        }

        btools.ConsoleCaptureStart();
        genadoc.GenerateReadme(packagePath, readmeFileName);
        btools.ConsoleCaptureStop();

        assert.ok(fs.existsSync(readmeFile), `File '${readmeFile}' should exist (at least now).`);
        assert.equal(btools.stdout().length, 2, `stdout should contain exact number of lines`);
        assert.equal(btools.stdout()[0], `Creating/Updating file '${readmeFileName}'.\n`, `stdout first  line should contain`);
        assert.equal(btools.stdout()[1], `Successfully updated file '${readmeFile}'.\n`, `stdout second line should contain`);
        assert.equal(btools.stderr().length, 0, `stderr shouldn't contain any lines:\n${btools.stderr().toString()}`);

        var newReadmeContent = fs.readFileSync(readmeFile, { encoding: 'utf8' });
        if (oldReadmeContent != newReadmeContent) {
            function markWhiteSpace(text) {
                if (text.isWhitespace()) {
                    return text.toLiteral();
                } else {
                    return text;
                }
            }
            const diff = require('diff'); require('colors');
            function colorize(diff, addedColor, removedColor, unchangedColor) {
                if (diff.added) { return markWhiteSpace(diff.value)[addedColor]; }
                if (diff.removed) { return markWhiteSpace(diff.value)[removedColor]; }
                return diff.value[unchangedColor];
            }
            var changes = [];
            diff.diffChars(oldReadmeContent, newReadmeContent, { newlineIsToken: true } ).forEach(function(part){
                changes.push(colorize(part, 'green', 'red', 'grey')); // green for additions, red for deletions grey for common parts
            });
            assert.fail(`Readme file '${readmeFile}' needs to be updated:\n${changes.join('')}`);
        }

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
