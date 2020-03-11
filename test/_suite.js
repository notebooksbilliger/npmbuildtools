const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const btools = require('../index');
// @ts-ignore
const thisPackage = require('../package.json');

if (btools.TerminalCanBlock) {
    console.log('\u001b[2J'); // clear screen
}
console.log('npmbuildtools read-only properties:');
btools.ReadOnlyProperties.forEach(prop => {
    console.log(`\t${prop} = ${btools[prop]}`);
});

console.log('\nRunning Mocha Test Suite ...');

describe(`${thisPackage.name} vc-utils tests`, function () {
    var vc = require('../lib/vc-utils');

    it('GetLastChange() should fail with faulty path specification', function(done) {
        var result;

        btools.ConsoleCaptureStart();
        try {
            result = vc.GetLastChange('');
            assert.fail(`should have failed`);
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `'' is not a valid path specification for parameter 'pathSpec'.`, `Error message should be`)
            assert.equal(result, undefined, `Variable 'result' should have exact value`);
        }

        done();
    });

    it('GetLastChange() should return NaN with unknown or untracked path specification', function(done) {
        var result;

        btools.ConsoleCaptureStart();
        try {
            result = vc.GetLastChange(path.resolve('fakefile'));
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(btools.stdout.length, 4, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);
        assert.ok(isNaN(result), `Variable 'result' should be NaN`);

        done();
    });

    it('GetLastChange() should succeed otherwise', function(done) {
        var result;

        btools.ConsoleCaptureStart();
        try {
            result = vc.GetLastChange(path.resolve('.'));
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(btools.stdout.length, 4, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);
        assert.ok(!isNaN(result), `Variable 'result' should not be NaN`);
        assert.equal(typeof(result), 'number', `Variable 'result' should have exact type`);
        done();
    });
});

describe(`${thisPackage.name} declaration-files tests`, function () {
    var deffiles = require('../lib/declaration-files');

    it('RemoveDeclarations() should succeed', function(done) {
        var result = 0;
        var expectedSubfolders = 3; // current status may change

        btools.ConsoleCaptureStart();
        try {
            result = deffiles.RemoveDeclarations(undefined, { dryRun: true });
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.ok(btools.stdout.length > 0, `stdout should contain lines`);
        assert.equal(btools.stdout[0], `Removing declaration files (*.d.ts) from path '${path.resolve('.')}' and ${expectedSubfolders} subfolders.\n`, `stdout first  line should contain`);
        assert.equal(btools.stdout[btools.stdout.length - 1], `Removed ${result} declaration files (*.d.ts) from path '${path.resolve('.')}'.\n`, `stdout second line should contain`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);
        done();
    });
});

describe(`${thisPackage.name} AsciiDoc tests`, function () {
    var genadoc = require('../lib/generate-adoc');

    it('ResolveIncludes() should fail without proper root source path for include files', function(done) {
        var result;

        btools.ConsoleCaptureStart();
        try {
            // @ts-ignore
            result = genadoc.ResolveIncludes();
            assert.fail(`should have failed`);
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `The root source path for include files 'undefined' is not a directory.`, `Error message should be`)
            assert.equal(result, undefined, `Variable 'result' should have exact value`);
        }

        done();
    });

    it('ResolveIncludes() should succeed', function(done) {
        var fakeRoot = '.';
        var fakePath = 'fakePath';

        btools.ConsoleCaptureStart();
        try {
            genadoc.ResolveIncludes(fakeRoot, `include::${fakePath}[]include::${fakePath}[]`);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(btools.stdout.length, 0, `stdout shouldn't contain any lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stderr.length, 2, `stderr should contain exact number of lines:\n${btools.stderr.join('')}`);
        assert.equal(btools.stderr[0], `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.\n`, `stderr first  line should contain`);
        assert.equal(btools.stderr[1], `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.\n`, `stderr second line should contain`);

        done();
    });

    it('GetAttribute() should fail without attributeName specification', function(done) {
        var result;

        btools.ConsoleCaptureStart();
        try {
            // @ts-ignore
            result = genadoc.GetAttribute();
            assert.fail(`should have failed`);
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `The 'attributeName' parameter is not a string.`, `Error message should be`)
            assert.equal(result, undefined, `Variable 'result' should have exact value`);
        }

        done();
    });

    it('GetAttribute() should fail with duplicate attribute definitions', function(done) {
        var result;
        var attributeName = 'attributeName';
        var inputLines = [ `:${attributeName}: `, `:${attributeName}: ` ];

        btools.ConsoleCaptureStart();
        try {
            result = genadoc.GetAttribute(attributeName, ...inputLines);
            assert.fail(`should have failed`);
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `Attribute '${attributeName}' has been defined multiple times.`, `Error message should be`)
            assert.equal(result, undefined, `Variable 'result' should have exact value`);
        }

        done();
    });

    it('GetAttribute() should succeed otherwise', function(done) {
        var result;
        var attributeName = 'attributeName';
        var inputLines = [];

        btools.ConsoleCaptureStart();
        try {
            result = genadoc.GetAttribute('');
            result = genadoc.GetAttribute('', ...inputLines);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(btools.stdout.length, 0, `stdout shouldn't contain any lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);
        assert.equal(result, undefined, `Variable 'result' should have exact value`);


        btools.ConsoleCaptureStart();
        try {
            result = genadoc.GetAttribute(attributeName, ...inputLines);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(btools.stdout.length, 0, `stdout shouldn't contain any lines`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines`);
        assert.equal(result, undefined, `Variable 'result' should have exact value`);


        inputLines = [ `:${attributeName}:` ];
        btools.ConsoleCaptureStart();
        try {
            result = genadoc.GetAttribute(attributeName, ...inputLines);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(btools.stdout.length, 0, `stdout shouldn't contain any lines`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines`);
        assert.equal(result, undefined, `Variable 'result' should have exact value`);

        
        inputLines = [ `:${attributeName}: ` ];
        btools.ConsoleCaptureStart();
        try {
            result = genadoc.GetAttribute(attributeName, ...inputLines);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(btools.stdout.length, 0, `stdout shouldn't contain any lines`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines`);
        assert.equal(result, '', `Variable 'result' should have exact value`);

        done();
    });

    it('GenerateReadme() should succeed', function(done) {
        var packagePath = path.resolve('.');
        var readmeFileName = 'README.adoc';

        var readmeContent = '';
        var readmeFile = path.join(packagePath, readmeFileName);
        if (fs.existsSync(readmeFile)) {
            readmeContent = fs.readFileSync(readmeFile, { encoding: 'utf8' });
        }

        btools.ConsoleCaptureStart();
        try {
            genadoc.GenerateReadme(packagePath, readmeFileName, { updateTimestamp: true });
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        } finally {
            if (readmeContent) {
                fs.writeFileSync(readmeFile, readmeContent, { encoding: 'utf8' });
            }
        }

        assert.ok(fs.existsSync(readmeFile), `File '${readmeFile}' should exist (at least now).`);
        assert.equal(btools.stdout.length, 7, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stdout[0], `Creating/Updating file '${readmeFileName}'.\n`, `stdout first  line should contain`);
        assert.equal(btools.stdout[btools.stdout.length - 1], `Successfully updated readme file '${readmeFile}'.\n`, `stdout second line should contain`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);

        done();
    });
});

describe(`${thisPackage.name} PostPack() tests`, function () {
    it('should succeed', function(done) {

        var npmTarballEnv = 'NPM_TARBALL';
        if (process.env[npmTarballEnv] != undefined) {
            delete process.env[npmTarballEnv];
        }
        assert.ok(process.env[npmTarballEnv] == undefined);

        var npmTarballFile = path.resolve('.', npmTarballEnv);
        if (fs.existsSync(npmTarballFile)) {
            fs.removeSync(npmTarballFile);
        }
        assert.ok(!fs.existsSync(npmTarballFile), `File '${npmTarballFile}' should not exist`);

        btools.ConsoleCaptureStart();
        try {
            btools.PostPack([ [ './lib/clean-package-elements', 'scripts.test' ] ], { verbose: true, debug: btools.DebugMode });
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.ok(btools.stdout.length > 0, `stdout should contain lines`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);
        assert.ok((process.env[npmTarballEnv] != undefined), `Environment variable '${npmTarballEnv}' should exist`);
        assert.ok(fs.existsSync(npmTarballFile), `File '${npmTarballFile}' should exist`);
        assert.equal(fs.readFileSync(npmTarballFile, { encoding: 'utf8' }), process.env[npmTarballEnv], `Environment variable '${npmTarballEnv}' value should equal content of file '${npmTarballFile}'`);

        delete process.env[npmTarballEnv];
        fs.removeSync(npmTarballFile);

        done();
    });
});

describe(`${thisPackage.name} CleanPackage() tests`, function () {
    it('should succeed with temporary package file', function(done) {
        var cleanpackage = require('../lib/clean-package-elements');
        var tempPackageFile = path.resolve(`./test/package.json`);
        var tempElements = [ 'scripts.test', 'scripts.prepublish' ];

        fs.writeJSONSync(tempPackageFile, thisPackage, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
        btools.ConsoleCaptureStart();
        try {
            cleanpackage.CleanPackageElements(`./test`, ...tempElements);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        } finally {
            fs.removeSync(tempPackageFile);
        }

        assert.equal(btools.stdout.length, 4, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stdout[0], `npm \u001b[34mnotice\u001b[0m Cleaning up package file '${tempPackageFile}'.\n`, `stdout first  line should contain`);
        assert.equal(btools.stdout[1], `npm \u001b[34mnotice\u001b[0m Removing element '${tempElements[0]}'.\n`, `stdout second line should contain`);
        assert.equal(btools.stdout[2], `npm \u001b[34mnotice\u001b[0m Element '${tempElements[1]}' doesn't exist.\n`, `stdout third  line should contain`);
        assert.equal(btools.stdout[3], `npm \u001b[34mnotice\u001b[0m Successfully cleaned up '${tempPackageFile}'.\n`, `stdout fourth line should contain`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);

        done();
    });
});

describe(`${thisPackage.name} CreateFallbackReadme() tests`, function () {
    it('should succeed', function(done) {
        var crtfbreadme = require('../lib/create-fallback-readme');
        var tempReadmeFile = path.resolve(`./test/README.md`);
        if (fs.existsSync(tempReadmeFile)) {
            fs.removeSync(tempReadmeFile);
        }

        btools.ConsoleCaptureStart();
        try {
            crtfbreadme.CreateFallbackReadme(`./test`);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            if (fs.existsSync(tempReadmeFile)) {
                fs.removeSync(tempReadmeFile);
            }
            throw err;
        }

        assert.ok(fs.existsSync(tempReadmeFile), `File ${tempReadmeFile} should exist`);
        fs.removeSync(tempReadmeFile);
        assert.ok(!fs.existsSync(tempReadmeFile), `File ${tempReadmeFile} should have been deleted`);

        assert.equal(btools.stdout.length, 2, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stdout[0], `npm \u001b[34mnotice\u001b[0m Creating readme file '${tempReadmeFile}'.\n`, `stdout first  line should contain`);
        assert.equal(btools.stdout[1], `npm \u001b[34mnotice\u001b[0m Successfully created '${tempReadmeFile}'.\n`, `stdout second line should contain`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);

        done();
    });
});

describe(`${thisPackage.name} CheckGlobalDeps() tests`, function () {
    it('should succeed with simple as well as spread syntax', function(done) {
        var checkglobaldeps = require('../lib/check-global-deps');

        btools.ConsoleCaptureStart();
        try {
            checkglobaldeps.CheckGlobalDeps('npm', 'npm');
            checkglobaldeps.CheckGlobalDeps('fakePackage');
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        done();
    });
});

describe(`${thisPackage.name} UpdatePackageVersion() tests`, function () {
    var updatepackage = require('../lib/update-package-version');

    it('should fail with invalid file spec', function(done) {
        btools.ConsoleCaptureStart();
        try {
            // @ts-ignore
            updatepackage.UpdatePackageVersion();
            assert.fail('should have failed');
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `Parameter 'packagePath' is mandatory.`, `Error message should be`)
        }

        done();
    });

    it('should fail with invalid release type', function(done) {
        btools.ConsoleCaptureStart();
        try {
            // @ts-ignore
            updatepackage.UpdatePackageVersion('fakePath');
            assert.fail('should have failed');
        } catch(err) {
            btools.ConsoleCaptureStop();
            assert.ok(err instanceof Error, `'err' should be an Error object`);
            assert.equal(err.message, `Parameter 'releaseType' is mandatory.`, `Error message should be`)
        }

        done();
    });

    it('should succeed with temporary package file', function(done) {
        var tempPackageFile = path.resolve(`./test/package.json`);
        var tempReleaseType = updatepackage.ReleaseType('patch');

        fs.writeJSONSync(tempPackageFile, thisPackage, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
        btools.ConsoleCaptureStart();
        try {
            updatepackage.UpdatePackageVersion(`./test`, tempReleaseType);
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        } finally {
            fs.removeSync(tempPackageFile);
        }

        assert.equal(btools.stdout.length, 2, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stdout[0], `npm \u001b[34mnotice\u001b[0m Updating version of package file '${tempPackageFile}'.\n`, `stdout first  line should contain`);
        assert.equal(btools.stdout[1], `npm \u001b[34mnotice\u001b[0m Successfully updated ${tempReleaseType} of version from [${thisPackage['version']}] to [${require('semver').inc(thisPackage['version'], tempReleaseType)}] in '${tempPackageFile}'.\n`, `stdout second line should contain`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);

        done();
    });
});

describe(`${thisPackage.name} Readme should be up to date`, function() {
    it('CheckReadme() should succeed', function(done) {
        var packagePath = path.resolve('.');
        var readmeFileName = 'README.adoc';

        var result;
        btools.ConsoleCaptureStart();
        try {
            result = btools.CheckReadme(packagePath, readmeFileName, { updateTimestamp: true });
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        if (result) {
            assert.fail(`Readme file '${path.join(packagePath, readmeFileName)}' needs to be updated:\n${result}`);
        }

        done();
    });
});