const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const semver = require('semver');
const btools = require('../index');
// @ts-ignore
const thisPackage = require('../package.json');

if (btools.TerminalCanBlock) {
  console.log('\u001b[2J'); // clear screen
}

console.log(`${os.EOL}Running Mocha Test Suite ...`);

describe(`${thisPackage.name} read-only properties`, function () {
  it('should be listed accurately', (done) => {
    var table = [];
    btools.ReadOnlyProperties.forEach(prop => {
      console.log(`      ${prop}\t= ${btools[prop]}\t(${typeof (btools[prop])})`);
      table.push({ name: prop, value: btools[prop], type: typeof (btools[prop]) });
    });

    done();
  });
});

describe(`${thisPackage.name} Console tests`, function () {
  it('ConsoleLogLevel.Validate() should succeed', done => {
    /** @type {import('../index').ConsoleOptions} */
    var consoleOptions;

    consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'default' });
    assert.strictEqual(consoleOptions.verbose, false, '\'verbose\' should have value');
    assert.strictEqual(consoleOptions.debug, false, '\'debug\' should have value');

    consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'verbose' });
    assert.strictEqual(consoleOptions.verbose, true, '\'verbose\' should have value');
    assert.strictEqual(consoleOptions.debug, false, '\'debug\' should have value');

    consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'debug' });
    assert.strictEqual(consoleOptions.verbose, true, '\'verbose\' should have value');
    assert.strictEqual(consoleOptions.debug, true, '\'debug\' should have value');

    consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'default', verbose: true });
    assert.strictEqual(consoleOptions.verbose, true, '\'verbose\' should have value');
    assert.strictEqual(consoleOptions.debug, false, '\'debug\' should have value');

    consoleOptions = btools.ConsoleLogLevel.Validate({ logLevel: 'default', debug: true });
    assert.strictEqual(consoleOptions.verbose, false, '\'verbose\' should have value');
    assert.strictEqual(consoleOptions.debug, true, '\'debug\' should have value');

    done();
  });

  it('Line continuation should succeed', done => {
    btools.ConsoleCaptureStart();
    try {
      console.info('Line to complete\b');
      console.info('\bon next call.');
      console.warn('Warning composed\b');
      console.warn('\bby more than\b');
      console.warn('\btwo calls.');
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, 5, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });

  btools.ConsoleSupportedPlatforms.forEach(platform => {
    it(`should succeed for plaform '${platform}'`, function (done) {
      btools.ConsoleCaptureStart();
      try {
        // @ts-ignore
        btools.ConsoleInit(platform);
        btools.ConsoleCaptureStop();
      } catch (err) {
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

      assert.strictEqual(btools.stdout.length, btools.DebugMode ? 3 : 2, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
      assert.strictEqual(btools.stderr.length, 1, `stderr should contain exact number of lines:${os.EOL}${btools.stderr.join('')}`);
      btools.ConsoleDefaultMethods.forEach(method => {
        var lines = [];
        var checkMessage = `Testing '${method}' message.${os.EOL}`;
        if (method === 'error') {
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
          if (method === 'debug' && !btools.DebugMode) {
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

  it('GetLastChange() should fail with faulty path specification', function (done) {
    var result;

    btools.ConsoleCaptureStart();
    try {
      result = vc.GetLastChange('');
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, '\'\' is not a valid path specification for parameter \'pathSpec\'.', 'Error message should be');
      assert.strictEqual(result, undefined, 'Variable \'result\' should have exact value');
    }

    done();
  });

  it('GetLastChange() should return NaN with unknown or untracked path specification', function (done) {
    var result;

    btools.ConsoleCaptureStart();
    try {
      result = vc.GetLastChange(path.resolve('fakefile'));
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, btools.DebugMode ? 4 : 0, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);
    assert.ok(isNaN(result), 'Variable \'result\' should be NaN');

    done();
  });

  it('GetLastChange() should succeed otherwise', function (done) {
    var result;

    btools.ConsoleCaptureStart();
    try {
      result = vc.GetLastChange(path.resolve('.'));
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, btools.DebugMode ? 4 : 0, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);
    assert.ok(!isNaN(result), 'Variable \'result\' should not be NaN');
    assert.strictEqual(typeof (result), 'number', 'Variable \'result\' should have exact type');
    done();
  });

  it('SupportedVersionControlProviders() should return specific list', function (done) {
    var result;
    btools.ConsoleCaptureStart();
    try {
      result = vc.SupportedVersionControlProviders();
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    var expectedProviders = ['git', 'tfs'];
    var exceptions = [];
    try {
      assert.strictEqual(result.length, expectedProviders.length, 'result array should have exact length');
    } catch (err) {
      exceptions.push(err);
    }

    expectedProviders.forEach(provider => {
      try {
        assert.ok(result.includes(provider), `result array should include '${provider}'`);
      } catch (err) {
        exceptions.push(err);
      }
    });

    result.forEach(provider => {
      try {
        assert.ok(expectedProviders.includes(provider), `result array should NOT include provider '${provider}'`);
      } catch (err) {
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

  it('GetVersionControlProvider() should return [undefined] if no VC provider was found', function (done) {
    var result;
    btools.ConsoleCaptureStart();
    try {
      result = vc.GetVersionControlProvider('../');
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(`${result}`, 'undefined', 'result should be');

    done();
  });

  it('GetVersionControlProvider() should succeed', function (done) {
    var result;
    btools.ConsoleCaptureStart();
    try {
      result = vc.GetVersionControlProvider();
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(`${result}`, 'git', 'result should be');

    done();
  });
});

describe(`${thisPackage.name} os-utils tests`, function () {
  it('ResolveEnv() should succeed for platform \'win32\'', function (done) {
    var envVarKeys = Object.keys(process.env);
    for (let index = 0; index < envVarKeys.length; index++) {
      if (process.env[envVarKeys[index]].indexOf('%') > 0) {
        continue;
      }
      if (process.env[envVarKeys[index]].indexOf('$') > 0) {
        continue;
      }

      var result;
      btools.ConsoleCaptureStart();
      try {
        result = btools.os.ResolveEnv(`%${envVarKeys[index]}%`, 'win32');
        btools.ConsoleCaptureStop();
      } catch (err) {
        btools.ConsoleCaptureStop();
        throw err;
      }

      assert.strictEqual(`${result}`, process.env[envVarKeys[index]], `result for environment variable #${index} ('${envVarKeys[index]}') should be`);
    }

    done();
  });

  it('ResolveEnv() should succeed for platform \'other\'', function (done) {
    var envVarKeys = Object.keys(process.env);
    for (let index = 0; index < envVarKeys.length; index++) {
      if (process.env[envVarKeys[index]].indexOf('%') > 0) {
        continue;
      }
      if (process.env[envVarKeys[index]].indexOf('$') > 0) {
        continue;
      }

      var result;
      btools.ConsoleCaptureStart();
      try {
        result = btools.os.ResolveEnv(`$${envVarKeys[index]}`, 'other');
        btools.ConsoleCaptureStop();
      } catch (err) {
        btools.ConsoleCaptureStop();
        throw err;
      }

      assert.strictEqual(`${result}`, process.env[envVarKeys[index]], `result for environment variable #${index} ('${envVarKeys[index]}') should be`);
    }

    done();
  });

  it('ResolvePath() should succeed with implicit limit 1 and no result', function (done) {
    var randomFile = Math.random().toString(36).substring(2, 15);
    var result;
    btools.ConsoleCaptureStart();
    try {
      result = btools.os.ResolvePath(randomFile, 1);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(result, '', 'result should be');

    done();
  });

  it('ResolvePath() should succeed with implicit limit 1 and a result', function (done) {
    var result;
    btools.ConsoleCaptureStart();
    try {
      result = btools.os.ResolvePath('node');
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(result, process.execPath, 'result should be');

    done();
  });

  it('ResolvePath() should succeed with limit 0 and no result', function (done) {
    var randomFile = Math.random().toString(36).substring(2, 15);
    var result;
    btools.ConsoleCaptureStart();
    try {
      result = btools.os.ResolvePath(randomFile, 0);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.ok(result.length === 0, 'result count should be');

    done();
  });

  it('ResolvePath() should succeed with limit 0 and a result', function (done) {
    var result;
    btools.ConsoleCaptureStart();
    try {
      result = btools.os.ResolvePath('node', 0);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.ok(result.length > 0, 'result should not be empty');
    assert.strictEqual(result[0], process.execPath, 'result should be');

    done();
  });

  it('ListProperties() should list \'process\' properties accurately', (done) => {
    btools.os.ListProperties(process, { namePrefix: 'process', skipTypeOf: ['function'] }).forEach(prop => {
      console.debug(`      ${prop}`);
    });

    done();
  });

  it('ListProperties() should list \'os\' properties accurately', (done) => {
    btools.os.ListProperties(os, { namePrefix: 'os', skipTypeOf: ['function'] }).forEach(prop => {
      console.debug(`      ${prop}`);
    });

    done();
  });
});

describe(`${thisPackage.name} declaration-files tests`, function () {
  var deffiles = require('../lib/declaration-files');

  it('RemoveDeclarations() should succeed', function (done) {
    var result = 0;
    var expectedSubfolders = 3; // current status, may change

    btools.ConsoleCaptureStart();
    try {
      result = deffiles.RemoveDeclarations(undefined, { dryRun: true, consoleOptions: { logLevel: 'debug' } });
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.ok(btools.stdout.length > 0, 'stdout should contain lines');
    // @ts-ignore
    assert.strictEqual(btools.stdout[0].plain('info'), `Removing declaration files (*.d.ts) from path '${path.resolve('.')}' and ${expectedSubfolders} subfolders.${os.EOL}`, 'stdout first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[btools.stdout.length - 1].plain('info'), `Removed ${result} declaration files (*.d.ts) from path '${path.resolve('.')}'.${os.EOL}`, 'stdout second line should contain');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });
});

describe(`${thisPackage.name} AsciiDoc tests`, function () {
  var genadoc = require('../lib/generate-adoc');

  it('ResolveIncludes() should fail without proper root source path for include files', function (done) {
    var result;

    btools.ConsoleCaptureStart();
    try {
      // @ts-ignore
      result = genadoc.ResolveIncludes();
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, 'The root source path for include files \'undefined\' is not a directory.', 'Error message should be');
      assert.strictEqual(result, undefined, 'Variable \'result\' should have exact value');
    }

    done();
  });

  it('ResolveIncludes() should succeed', function (done) {
    var fakeRoot = '.';
    var fakePath = 'fakePath';

    btools.ConsoleCaptureStart();
    try {
      genadoc.ResolveIncludes(fakeRoot, `include::${fakePath}[]include::${fakePath}[]`);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, 0, `stdout shouldn't contain any lines:${os.EOL}${btools.stdout.join('')}`);
    assert.strictEqual(btools.stderr.length, 2, `stderr should contain exact number of lines:${os.EOL}${btools.stderr.join('')}`);
    // @ts-ignore
    assert.strictEqual(btools.stderr[0].plain('error'), `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.${os.EOL}`, 'stderr first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stderr[1].plain('error'), `Include file '${path.resolve(fakeRoot, fakePath)}' could not be found.${os.EOL}`, 'stderr second line should contain');

    done();
  });

  it('GetAttribute() should fail without attributeName specification', function (done) {
    var result;

    btools.ConsoleCaptureStart();
    try {
      // @ts-ignore
      result = genadoc.GetAttribute();
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, 'The \'attributeName\' parameter is not a string.', 'Error message should be');
      assert.strictEqual(result, undefined, 'Variable \'result\' should have exact value');
    }

    done();
  });

  it('GetAttribute() should fail with duplicate attribute definitions', function (done) {
    var result;
    var attributeName = 'attributeName';
    var inputLines = [`:${attributeName}: `, `:${attributeName}: `];

    btools.ConsoleCaptureStart();
    try {
      result = genadoc.GetAttribute(attributeName, ...inputLines);
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, `Attribute '${attributeName}' has been defined multiple times.`, 'Error message should be');
      assert.strictEqual(result, undefined, 'Variable \'result\' should have exact value');
    }

    done();
  });

  it('GetAttribute() should succeed otherwise', function (done) {
    var result;
    var attributeName = 'attributeName';
    var inputLines = [];

    btools.ConsoleCaptureStart();
    try {
      result = genadoc.GetAttribute('');
      result = genadoc.GetAttribute('', ...inputLines);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, 0, `stdout shouldn't contain any lines:${os.EOL}${btools.stdout.join('')}`);
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);
    assert.strictEqual(result, undefined, 'Variable \'result\' should have exact value');

    btools.ConsoleCaptureStart();
    try {
      result = genadoc.GetAttribute(attributeName, ...inputLines);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, 0, 'stdout shouldn\'t contain any lines');
    assert.strictEqual(btools.stderr.length, 0, 'stderr shouldn\'t contain any lines');
    assert.strictEqual(result, undefined, 'Variable \'result\' should have exact value');

    inputLines = [`:${attributeName}:`];
    btools.ConsoleCaptureStart();
    try {
      result = genadoc.GetAttribute(attributeName, ...inputLines);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, 0, 'stdout shouldn\'t contain any lines');
    assert.strictEqual(btools.stderr.length, 0, 'stderr shouldn\'t contain any lines');
    assert.strictEqual(result, undefined, 'Variable \'result\' should have exact value');

    inputLines = [`:${attributeName}: `];
    btools.ConsoleCaptureStart();
    try {
      result = genadoc.GetAttribute(attributeName, ...inputLines);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.strictEqual(btools.stdout.length, 0, 'stdout shouldn\'t contain any lines');
    assert.strictEqual(btools.stderr.length, 0, 'stderr shouldn\'t contain any lines');
    assert.strictEqual(result, '', 'Variable \'result\' should have exact value');

    done();
  });

  it('GenerateReadme() should succeed', function (done) {
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
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    } finally {
      if (readmeContent) {
        fs.writeFileSync(readmeFile, readmeContent, { encoding: 'utf8' });
      }
    }

    assert.ok(fs.existsSync(readmeFile), `File '${readmeFile}' should exist (at least now).`);
    assert.strictEqual(btools.stdout.length, btools.DebugMode ? 7 : 2, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
    // @ts-ignore
    assert.strictEqual(btools.stdout[0].plain('info'), `Creating/Updating file '${readmeFileName}'.${os.EOL}`, 'stdout first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[btools.stdout.length - 1].plain('info'), `Successfully updated readme file '${readmeFile}'.${os.EOL}`, 'stdout second line should contain');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });
});

describe(`${thisPackage.name} PostPack() tests`, function () {
  it('should succeed', function (done) {
    var npmTarballEnv = 'NPM_TARBALL';
    if (process.env[npmTarballEnv] !== undefined) {
      delete process.env[npmTarballEnv];
    }
    assert.ok(process.env[npmTarballEnv] === undefined);

    var npmTarballFile = path.resolve('.', npmTarballEnv);
    if (fs.existsSync(npmTarballFile)) {
      fs.removeSync(npmTarballFile);
    }
    assert.ok(!fs.existsSync(npmTarballFile), `File '${npmTarballFile}' should not exist`);

    btools.ConsoleCaptureStart();
    try {
      btools.PostPack([['./lib/clean-package-elements', 'scripts.test']], { logLevel: 'verbose', debug: btools.DebugMode });
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.ok(btools.stdout.length > 0, 'stdout should contain lines');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);
    assert.ok((process.env[npmTarballEnv] !== undefined), `Environment variable '${npmTarballEnv}' should exist`);
    assert.ok(fs.existsSync(npmTarballFile), `File '${npmTarballFile}' should exist`);
    assert.strictEqual(fs.readFileSync(npmTarballFile, { encoding: 'utf8' }), process.env[npmTarballEnv], `Environment variable '${npmTarballEnv}' value should equal content of file '${npmTarballFile}'`);

    delete process.env[npmTarballEnv];
    fs.removeSync(npmTarballFile);

    done();
  });
});

describe(`${thisPackage.name} CleanPackage() tests`, function () {
  it('should succeed with temporary package file', function (done) {
    var cleanpackage = require('../lib/clean-package-elements');
    var tempPackageFile = path.resolve('./test/package.json');
    var tempElements = ['scripts.test', 'scripts.prepublish'];

    fs.writeJSONSync(tempPackageFile, thisPackage, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
    btools.ConsoleCaptureStart();
    try {
      cleanpackage.CleanPackageElements('./test', ...tempElements);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    } finally {
      fs.removeSync(tempPackageFile);
    }

    assert.strictEqual(btools.stdout.length, 4, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
    // @ts-ignore
    assert.strictEqual(btools.stdout[0].plain('info'), `Cleaning up package file '${tempPackageFile}'.${os.EOL}`, 'stdout first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[1].plain('info'), `Removing element '${tempElements[0]}'.${os.EOL}`, 'stdout second line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[2].plain('info'), `Element '${tempElements[1]}' doesn't exist.${os.EOL}`, 'stdout third  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[3].plain('info'), `Successfully cleaned up '${tempPackageFile}'.${os.EOL}`, 'stdout fourth line should contain');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });
});

describe(`${thisPackage.name} CreateFallbackReadme() tests`, function () {
  it('should succeed', function (done) {
    var crtfbreadme = require('../lib/create-fallback-readme');
    var tempReadmeFile = path.resolve('./test/README.md');
    if (fs.existsSync(tempReadmeFile)) {
      fs.removeSync(tempReadmeFile);
    }

    btools.ConsoleCaptureStart();
    try {
      crtfbreadme.CreateFallbackReadme('./test');
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      if (fs.existsSync(tempReadmeFile)) {
        fs.removeSync(tempReadmeFile);
      }
      throw err;
    }

    assert.ok(fs.existsSync(tempReadmeFile), `File ${tempReadmeFile} should exist`);
    fs.removeSync(tempReadmeFile);
    assert.ok(!fs.existsSync(tempReadmeFile), `File ${tempReadmeFile} should have been deleted`);

    assert.strictEqual(btools.stdout.length, 2, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
    // @ts-ignore
    assert.strictEqual(btools.stdout[0].plain('info'), `Creating readme file '${tempReadmeFile}'.${os.EOL}`, 'stdout first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[1].plain('info'), `Successfully created '${tempReadmeFile}'.${os.EOL}`, 'stdout second line should contain');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });
});

describe(`${thisPackage.name} CheckGlobalDeps() tests`, function () {
  it('should succeed with simple as well as spread syntax', function (done) {
    var checkglobaldeps = require('../lib/check-global-deps');

    btools.ConsoleCaptureStart();
    try {
      checkglobaldeps.CheckGlobalDeps('npm', 'npm');
      checkglobaldeps.CheckGlobalDeps('fakePackage');
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    done();
  });
});

describe(`${thisPackage.name} UpdatePackageVersion() tests`, function () {
  var updatepackage = require('../lib/update-package-version');

  it('should fail with invalid file spec', function (done) {
    btools.ConsoleCaptureStart();
    try {
      // @ts-ignore
      updatepackage.UpdatePackageVersion();
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, 'Parameter \'packagePath\' is mandatory.', 'Error message should be');
    }

    done();
  });

  it('should fail with invalid release type', function (done) {
    btools.ConsoleCaptureStart();
    try {
      // @ts-ignore
      updatepackage.UpdatePackageVersion('fakePath');
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, 'Parameter \'releaseType\' is mandatory.', 'Error message should be');
    }

    done();
  });

  it('should succeed with temporary package file', function (done) {
    var tempPackageFile = path.resolve('./test/package.json');
    var tempReleaseType = updatepackage.ReleaseType('patch');

    fs.writeJSONSync(tempPackageFile, thisPackage, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
    btools.ConsoleCaptureStart();
    try {
      updatepackage.UpdatePackageVersion('./test', tempReleaseType);
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    } finally {
      fs.removeSync(tempPackageFile);
    }

    assert.strictEqual(btools.stdout.length, 2, `stdout should contain exact number of lines:${os.EOL}${btools.stdout.join('')}`);
    // @ts-ignore
    assert.strictEqual(btools.stdout[0].plain('info'), `Updating version of package file '${tempPackageFile}'.${os.EOL}`, 'stdout first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[1].plain('info'), `Successfully updated ${tempReleaseType} of version from [${thisPackage.version}] to [${require('semver').inc(thisPackage.version, tempReleaseType)}] in '${tempPackageFile}'.${os.EOL}`, 'stdout second line should contain');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });
});

describe(`${thisPackage.name} TfxIgnore() tests`, function () {
  const tfxutils = require('../lib/tfx-utils');

  it('should fail', (done) => {
    btools.ConsoleCaptureStart();
    try {
      tfxutils.TfxIgnore();
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, `VSIX package file '${path.resolve('../vss-extension.json')}' could not be found.`, 'Error message should be');
    }

    done();
  });

  it('should succeed', (done) => {
    var vsixFileIn = './test/vss-extension.json';
    var vsixFileOut = './test/vss-extension.resolved.json';

    if (fs.existsSync(vsixFileIn)) {
      fs.removeSync(vsixFileIn);
    }
    var vsixJson = { files: [{ path: '.' }] };
    fs.writeJSONSync(vsixFileIn, vsixJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    btools.ConsoleCaptureStart();
    try {
      tfxutils.TfxIgnore(vsixFileIn, undefined, { logLevel: 'debug' });
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.ok(fs.existsSync(vsixFileOut), `File '${vsixFileOut}' should exist`);
    fs.removeSync(vsixFileOut);
    assert.ok(fs.existsSync(vsixFileIn), `File '${vsixFileIn}' should (still) exist`);
    fs.removeSync(vsixFileIn);

    assert.ok(btools.stdout.length >= 2, `stdout should contain two or more lines:${os.EOL}${btools.stdout.join('')}`);
    // @ts-ignore
    assert.strictEqual(btools.stdout[0].plain('info'), `Processing VSIX package file '${path.resolve(vsixFileIn)}'.${os.EOL}`, 'stdout first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[btools.stdout.length - 1].plain('info'), `Successfully updated VSIX package file '${path.resolve(vsixFileOut)}'.${os.EOL}`, 'stdout second line should contain');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });
});

describe(`${thisPackage.name} TfxMkboot() tests`, function () {
  const tfxutils = require('../lib/tfx-utils');

  it('should fail', (done) => {
    btools.ConsoleCaptureStart();
    try {
      tfxutils.TfxMkboot2();
      assert.fail('should have failed');
    } catch (err) {
      btools.ConsoleCaptureStop();
      assert.ok(err instanceof Error, '\'err\' should be an Error object');
      assert.strictEqual(err.message, `Task file '${path.resolve('./task.json')}' could not be found.`, 'Error message should be');
    }

    done();
  });

  it('should succeed', (done) => {
    var tempPath = fs.mkdtempSync(path.join(os.tmpdir(), '_temp_npmbuildtools-'));
    var extensionJsonFile = path.resolve(tempPath, 'vss-extension.json');
    var packagePath = path.resolve(tempPath, 'test'); fs.ensureDirSync(packagePath);
    var packageJsonFile = path.resolve(packagePath, 'package.json');
    var taskJsonFile = path.resolve(packagePath, 'task.json');
    var bootFile = path.resolve(packagePath, 'boot.js');

    var tempPackageName = 'Test Package';

    var extensionJson = {
      publisher: 'testpublisher',
      id: 'test-extension-id',
      version: '0.0.1'
    };
    fs.writeJSONSync(extensionJsonFile, extensionJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    var PckgJson = {
      main: 'index.js',
      version: '4.5.6'
    };
    fs.writeJSONSync(packageJsonFile, PckgJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    var taskJson = {
      id: 'Test-Package-Id',
      name: tempPackageName,
      version: {
        Major: 1,
        Minor: 2,
        Patch: 3
      },
      execution: {
        Node10: {
          target: 0
        }
      }
    };
    fs.writeJSONSync(taskJsonFile, taskJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    btools.ConsoleCaptureStart();
    try {
      tfxutils.TfxMkboot2({ packagePath: packagePath, incrementReleaseType: 'minor', consoleOptions: { logLevel: 'debug' } }, 'command1', 'command2');
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.ok(fs.existsSync(bootFile), `File '${bootFile}' should exist`);
    assert.ok(fs.existsSync(extensionJsonFile), `File '${extensionJsonFile}' should (still) exist`);
    assert.ok(fs.existsSync(packageJsonFile), `File '${packageJsonFile}' should (still) exist`);
    assert.ok(fs.existsSync(taskJsonFile), `File '${taskJsonFile}' should (still) exist`);

    PckgJson.version = semver.inc(PckgJson.version, 'patch');
    fs.writeJSONSync(packageJsonFile, PckgJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    btools.ConsoleCaptureStart();
    try {
      tfxutils.TfxMkboot2({ packagePath: packagePath, incrementReleaseType: 'minor', consoleOptions: { logLevel: 'debug' } }, 'command1', 'command2');
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    assert.ok(fs.existsSync(bootFile), `File '${bootFile}' should (still) exist`);
    assert.ok(fs.existsSync(extensionJsonFile), `File '${extensionJsonFile}' should (still) exist`);
    assert.ok(fs.existsSync(packageJsonFile), `File '${packageJsonFile}' should (still) exist`);
    assert.ok(fs.existsSync(taskJsonFile), `File '${taskJsonFile}' should (still) exist`);
    fs.removeSync(tempPath);

    assert.ok(btools.stdout.length >= 2, `stdout should contain two or more lines:${os.EOL}${btools.stdout.join('')}`);
    // @ts-ignore
    assert.strictEqual(btools.stdout[0].plain('info'), `Processing package in '${packagePath}'.${os.EOL}`, 'stdout first  line should contain');
    // @ts-ignore
    assert.strictEqual(btools.stdout[btools.stdout.length - 1].plain('info'), `Finished processing package '${tempPackageName}' in '${packagePath}'.${os.EOL}`, 'stdout second line should contain');
    assert.strictEqual(btools.stderr.length, 0, `stderr shouldn't contain any lines:${os.EOL}${btools.stderr.join('')}`);

    done();
  });
});

describe(`${thisPackage.name} Readme should be up to date`, function () {
  it('CheckReadme() should succeed', function (done) {
    var packagePath = path.resolve('.');
    var readmeFileName = 'README.adoc';

    var result;
    btools.ConsoleCaptureStart();
    try {
      result = btools.CheckReadme(packagePath, readmeFileName, { updateTimestamp: true });
      btools.ConsoleCaptureStop();
    } catch (err) {
      btools.ConsoleCaptureStop();
      throw err;
    }

    if (result) {
      assert.fail(`Readme file '${path.join(packagePath, readmeFileName)}' needs to be updated:${os.EOL}${result}`);
    }

    done();
  });
});
