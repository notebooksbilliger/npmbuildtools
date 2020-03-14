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

console.log('\nRunning Mocha Test Suite ...');

describe(`${thisPackage.name} read-only properties`, function () {
    it(`should be listed accurately`, (done) => {
        var table = [];
        btools.ReadOnlyProperties.forEach(prop => {
            console.log(`      ${prop}\t= ${btools[prop]}\t(${typeof(btools[prop])})`);
            table.push({ name: prop, value: btools[prop], type: typeof(btools[prop]) });
        });
        // console.log(table);
        done();
    });
});

describe(`${thisPackage.name} Console tests`, function () {
    it('ConsoleLogLevel.Validate() should succeed', done => {
        /**
         * @type {import('../index').ConsoleOptions}
         */
        var consoleOptions;

        consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'default' });
        assert.equal(consoleOptions.verbose, false, `'verbose' should have value`);
        assert.equal(consoleOptions.debug, false, `'debug' should have value`);

        consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'verbose' });
        assert.equal(consoleOptions.verbose, true, `'verbose' should have value`);
        assert.equal(consoleOptions.debug, false, `'debug' should have value`);

        consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'debug' });
        assert.equal(consoleOptions.verbose, true, `'verbose' should have value`);
        assert.equal(consoleOptions.debug, true, `'debug' should have value`);

        consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'default', verbose: true });
        assert.equal(consoleOptions.verbose, true, `'verbose' should have value`);
        assert.equal(consoleOptions.debug, false, `'debug' should have value`);

        consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'default', debug: true });
        assert.equal(consoleOptions.verbose, false, `'verbose' should have value`);
        assert.equal(consoleOptions.debug, true, `'debug' should have value`);

        done();
    });

    btools.ConsoleSupportedPlatforms.forEach(platform => {
        it(`should succeed for plaform '${platform}'`, function(done) {
            btools.ConsoleCaptureStart();
            try {
                // @ts-ignore
                btools.ConsoleInit(platform);
                btools.ConsoleCaptureStop();
            } catch(err) {
                btools.ConsoleCaptureStop();
                throw err;
            }

            btools.ConsoleCaptureStart();
            try {
                btools.ConsoleDefaultMethods.forEach(method => {
                    console[method](`Testing '${method}' message.`);
                });
                btools.ConsoleCaptureStop();
            } catch (err) {
                btools.ConsoleCaptureStop();
                throw err;
            }
    

            assert.equal(btools.stdout.length, btools.DebugMode ? 3 : 2, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
            assert.equal(btools.stderr.length, 1, `stderr should contain exact number of lines:\n${btools.stderr.join('')}`);
            btools.ConsoleDefaultMethods.forEach(method => {
                var lines = [];
                var checkMessage = `Testing '${method}' message.\n`;
                if (method == 'error') {
                    btools.stderr.forEach(line => {
                        // @ts-ignore
                        lines.push(line.plain(method));
                    });
                    assert.ok(lines.includes(checkMessage), `stderr should include '${checkMessage}'`);
                } else {
                    btools.stdout.forEach(line => {
                        // @ts-ignore
                        lines.push(line.plain(method));
                    });
                    if (method == 'debug' && !btools.DebugMode) {
                        assert.ok(!lines.includes(checkMessage), `stdout shouldn't include '${checkMessage}'`);
                    } else {
                        assert.ok(lines.includes(checkMessage), `stdout should include '${checkMessage}'`);
                    }
                }
            });

            done();
        });
    });
});

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

        assert.equal(btools.stdout.length, btools.DebugMode ? 4 : 0, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
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

        assert.equal(btools.stdout.length, btools.DebugMode ? 4 : 0, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        assert.equal(btools.stderr.length, 0, `stderr shouldn't contain any lines:\n${btools.stderr.join('')}`);
        assert.ok(!isNaN(result), `Variable 'result' should not be NaN`);
        assert.equal(typeof(result), 'number', `Variable 'result' should have exact type`);
        done();
    });

    it(`SupportedVersionControlProviders() should return specific list`, function(done) {
        var result;
        btools.ConsoleCaptureStart();
        try {
            result = vc.SupportedVersionControlProviders();
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        var expectedProviders = ['git', 'tfs'];
        var exceptions = [];
        try {
            assert.equal(result.length, expectedProviders.length, `result array should have exact length`);
        } catch(err) {
            exceptions.push(err);
        }

        expectedProviders.forEach(provider => {
            try {
                assert.ok(result.includes(provider), `result array should include '${provider}'`);
            } catch(err) {
                exceptions.push(err);
            }
        });

        result.forEach(provider => {
            try {
                assert.ok(expectedProviders.includes(provider), `result array should NOT include provider '${provider}'`);
            } catch(err) {
                exceptions.push(err);
            }
        });

        if (exceptions.length > 0) {
            var msg = [];
            exceptions.forEach(err => msg.push(err.message));
            assert.fail(`Aggregate error, collected ${exceptions.length} errors total:${os.EOL}\t${msg.join(`${os.EOL}\t`)}`);
        }

        done();
    });

    it(`GetVersionControlProvider() should return [undefined] if no VC provider was found`, function(done) {
        var result;
        btools.ConsoleCaptureStart();
        try {
            result = vc.GetVersionControlProvider('../');
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(`${result}`, 'undefined', `result should be`);

        done();
    });

    it(`GetVersionControlProvider() should succeed`, function(done) {
        var result;
        btools.ConsoleCaptureStart();
        try {
            //result = vc.GetVersionControlProvider('C:\\Users\\thorbenw\\Documents\\Visual Studio 2015\\Projects\\oms2nav-twk');
            result = vc.GetVersionControlProvider();
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.equal(`${result}`, 'git', `result should be`);

        done();
    });
});

describe(`${thisPackage.name} declaration-files tests`, function () {
    var deffiles = require('../lib/declaration-files');

    it('RemoveDeclarations() should succeed', function(done) {
        var result = 0;
        var expectedSubfolders = 3; // current status, may change

        btools.ConsoleCaptureStart();
        try {
            result = deffiles.RemoveDeclarations(undefined, { dryRun: true, consoleOptions: { logLevel: 'verbose' } });
            btools.ConsoleCaptureStop();
        } catch(err) {
            btools.ConsoleCaptureStop();
            throw err;
        }

        assert.ok(btools.stdout.length > 0, `stdout should contain lines`);
        // @ts-ignore
        assert.equal(btools.stdout[0].plain('info'), `Removing declaration files (*.d.ts) from path '${path.resolve('.')}' and ${expectedSubfolders} subfolders.\n`, `stdout first  line should contain`);
        // @ts-ignore
        assert.equal(btools.stdout[btools.stdout.length - 1].plain('info'), `Removed ${result} declaration files (*.d.ts) from path '${path.resolve('.')}'.\n`, `stdout second line should contain`);
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
        // @ts-ignore
        assert.equal(btools.stderr[0].plain('error'), `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.\n`, `stderr first  line should contain`);
        // @ts-ignore
        assert.equal(btools.stderr[1].plain('error'), `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.\n`, `stderr second line should contain`);

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
        assert.equal(btools.stdout.length, btools.DebugMode ? 7 : 2, `stdout should contain exact number of lines:\n${btools.stdout.join('')}`);
        // @ts-ignore
        assert.equal(btools.stdout[0].plain('info'), `Creating/Updating file '${readmeFileName}'.\n`, `stdout first  line should contain`);
        // @ts-ignore
        assert.equal(btools.stdout[btools.stdout.length - 1].plain('info'), `Successfully updated readme file '${readmeFile}'.\n`, `stdout second line should contain`);
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
            btools.PostPack([ [ './lib/clean-package-elements', 'scripts.test' ] ], { logLevel: 'verbose', debug: btools.DebugMode });
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
        // @ts-ignore
        assert.equal(btools.stdout[0].plain('info'), `Cleaning up package file '${tempPackageFile}'.\n`, `stdout first  line should contain`);
        // @ts-ignore
        assert.equal(btools.stdout[1].plain('info'), `Removing element '${tempElements[0]}'.\n`, `stdout second line should contain`);
        // @ts-ignore
        assert.equal(btools.stdout[2].plain('info'), `Element '${tempElements[1]}' doesn't exist.\n`, `stdout third  line should contain`);
        // @ts-ignore
        assert.equal(btools.stdout[3].plain('info'), `Successfully cleaned up '${tempPackageFile}'.\n`, `stdout fourth line should contain`);
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
        // @ts-ignore
        assert.equal(btools.stdout[0].plain('info'), `Creating readme file '${tempReadmeFile}'.\n`, `stdout first  line should contain`);
        // @ts-ignore
        assert.equal(btools.stdout[1].plain('info'), `Successfully created '${tempReadmeFile}'.\n`, `stdout second line should contain`);
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
        // @ts-ignore
        assert.equal(btools.stdout[0].plain('info'), `Updating version of package file '${tempPackageFile}'.\n`, `stdout first  line should contain`);
        // @ts-ignore
        assert.equal(btools.stdout[1].plain('info'), `Successfully updated ${tempReleaseType} of version from [${thisPackage['version']}] to [${require('semver').inc(thisPackage['version'], tempReleaseType)}] in '${tempPackageFile}'.\n`, `stdout second line should contain`);
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