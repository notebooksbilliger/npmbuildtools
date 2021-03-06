/** @module index */

const colors = require('colors');
const cp = require('child_process');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const zlib = require('zlib');
const diff = require('diff');
const semver = require('semver');
const intercept = require('intercept-stdout');
const genadoc = require(path.join(path.dirname(__filename), 'lib/generate-adoc'));

// #region get npm_version
/* eslint-disable camelcase */
const npm_version_latest_using_tar4 = '6.14.2';
var npm_version = process.env['npm_version']; // eslint-disable-line dot-notation
if (npm_version === undefined) {
  try {
    npm_version = cp.execSync('npm -v').toString().trim();
  } catch (err) {
    console.error(err);
    npm_version = npm_version_latest_using_tar4;
    console.warn(`Unable to determine npm version automatically, assuming [${npm_version}].`);
  }
  // Store this for subsequent calls/reuires.
  process.env['npm_version'] = npm_version; // eslint-disable-line dot-notation
}
/* eslint-enable camelcase */
// #endregion

// #region require(tar)
/** @ignore */
var tar;
if (semver.lte(npm_version, npm_version_latest_using_tar4)) {
  /*
   * In order to get the same file modes in the headers of the newly
   * created tar file as in the headers of the source tar file,
   * tar version 4 must be used because npm uses tar version 4 as well.
   * At the time of this writing, the most recent npm version is what
   * can be found in the npm_version_latest_using_tar4 constant,
   * which has tar@^4.x.x in it's dependencies.
   * A change in file mode handling when the 'portable' option is set
   * to 'true' (i.e. the new mode-fix.js) has been introduced in tar
   * package version 5.0.1, which may be used in future versions of npm.
   * Until then, with every new version of npm, it's dependencies
   * need to be reviewed and the above 'npm_version_latest_using_tar4'
   * variable must be adjusted to the new npm version, if it is yet
   * using tar 4.
   * As soon as npm will use a tar version >= 5.0.1, the variable needs
   * to be changed for the last time (or even may be left as is), and
   * this explanation text needs to be reduced to the minimum
   * reasonable length, e.g.:
   * In order to get the same file modes in the headers of the newly
   * created tar file as in the headers of the source tar file,
   * tar version 4 must be used with npm versions prior to the version
   * found in the npm_version_latest_using_tar4 variable.
   */
  tar = require('tar4');
} else {
  tar = require('tar');
}
// #endregion

// #region NPM console
/**
 * Configures the `console` object for npm-like output. Call this function if
 * you have a {@link module:index~ConsoleOptions} object in place and want your
 * output to look like npm output. When finished, call
 * [consoleResetNPM()]{@link module:index~consoleResetNPM} to revert `console`
 * to it's prior state.
 * @param {ConsoleOptions_|ConsoleOptions=} consoleOptions A
 * {@link module:index~ConsoleOptions} object.
 * @returns {ConsoleOptions} A safeguarded {@link module:index~ConsoleOptions}
 * object.
 */
function consoleInitNPM (consoleOptions) {
  var result = exports.ConsoleLogLevel.Validate(consoleOptions);

  var theme = {
    debug: 'reset',
    info: 'reset',
    warn: 'reset',
    error: 'reset'
  };

  var systemPrefixes = {};
  if (!exports.RunningInGitHub) {
    systemPrefixes.debug = '';
    systemPrefixes.info = '';
    systemPrefixes.warn = '';
    systemPrefixes.error = '';
  }

  var prefixes = {};
  if (result.verbose) {
    prefixes.info = 'npm '.reset + 'notice'.blue + ' ';
  } else {
    prefixes.info = null;
  }

  if (result.debug) {
    prefixes.debug = 'npm '.reset + 'debug'.yellow + ' ';
  } else {
    prefixes.debug = null;
  }

  prefixes.warn = 'npm '.reset + 'WARN'.black.bgYellow + ' ';
  prefixes.error = 'npm '.reset + 'ERR!'.red + ' ';

  exports.ConsolePushTheme(theme);
  exports.ConsolePushSystemPrefixes(systemPrefixes);
  exports.ConsolePushPrefixes(prefixes);

  return result;
}

/**
 * Resets all changes on `console` that are made by a prior call of
 * [consoleInitNPM()]{@link module:index~consoleInitNPM}.
 * @returns {void}
 */
function consoleResetNPM () {
  exports.ConsolePopSystemPrefixes();
  exports.ConsolePopPrefixes();
  exports.ConsolePopTheme();
}
// #endregion

// #region PostPack()
/**
 * @param {string[][]} clientScripts An array of node commands to run on the
 * package directory.
 * @param {ConsoleOptions_|ConsoleOptions=} consoleOptions A
 * {@link module:index~ConsoleOptions} object.
 * @returns {void}
 */
exports.PostPack = (clientScripts, consoleOptions) => {
  consoleOptions = consoleInitNPM(consoleOptions);

  if (consoleOptions.debug) {
    console.debug('Available environment variables:');
    Object.keys(process.env).forEach(envVar => {
      console.debug(`${envVar} = ${process.env[envVar]}`);
    });
  }

  try {
    postPack(clientScripts, consoleOptions);
  } finally {
    consoleResetNPM();
  }
};

function postPack (clientScripts, options) {
  console.info('=== Post Pack Processing ==='.magenta);

  var assumeDryRun = false;
  var prefix = 'package';
  var prefrx = new RegExp(`^${prefix}\/`); // eslint-disable-line no-useless-escape

  var npmPackageNameEnv = 'npm_package_name';
  var npmPackageVersionEnv = 'npm_package_version';

  var npmPackageName = process.env[npmPackageNameEnv];
  var npmPackageVersion = process.env[npmPackageVersionEnv];

  var packageJson, packageFile;
  if (npmPackageName === undefined || npmPackageVersion === undefined) {
    packageJson = path.resolve(path.join('.', 'package.json'));
    if (!fs.existsSync(packageJson)) {
      throw Error(`File '${packageJson}' could not be found.`);
    }
    console.info(`Loading packge file '${packageJson}'.`);

    packageFile = require(packageJson);
    assumeDryRun = true;
  }

  if (npmPackageName === undefined) {
    npmPackageName = packageFile.name;
    if (npmPackageName === undefined) {
      throw Error(`Package name could not be determined from neither environment variable '${npmPackageNameEnv}' nor package file '${packageJson}'.`);
    } else {
      console.info(`Package name '${npmPackageName}' was retrieved from package file '${packageJson}'.`);
    }
  } else {
    console.info(`Package name '${npmPackageName}' was retrieved from environment variable '${npmPackageNameEnv}'.`);
  }

  if (npmPackageVersion === undefined) {
    npmPackageVersion = packageFile.version;
    if (npmPackageVersion === undefined) {
      throw Error(`Package version could not be determined from neither environment variable '${npmPackageVersionEnv}' nor package file '${packageJson}'.`);
    } else {
      console.info(`Package version '${npmPackageVersion}' was retrieved from package file '${packageJson}'.`);
    }
  } else {
    console.info(`Package version '${npmPackageVersion}' was retrieved from environment variable '${npmPackageVersionEnv}'.`);
  }

  var tgzFile = npmPackageName.replace(/^@/, '').split('/', 2).join('-') + `-${npmPackageVersion}.tgz`;
  var tgzPath = path.resolve(path.join('.', tgzFile));
  if (!fs.existsSync(tgzPath)) {
    if (assumeDryRun) {
      console.debug(`Tarball '${tgzPath}' could not be found.`);
      console.info('Assuming --dry-run, aborting.');
      return;
    } else {
      throw Error(`Tarball '${tgzPath}' could not be found.`);
    }
  } else {
    console.info(`Processing tarball '${tgzPath}'.`);
  }

  var wrkDir = fs.mkdtempSync(path.join(os.tmpdir(), tgzFile));
  if (!fs.existsSync(wrkDir)) {
    throw Error(`Failed to create working folder '${wrkDir}'.`);
  } else {
    console.info(`Created working folder '${wrkDir}'.`);
  }

  var tmpDir = `${fs.ensureDirSync(`${wrkDir}-temp`)}`;
  if (!fs.existsSync(tmpDir)) {
    throw Error(`Failed to create temporary folder '${tmpDir}'.`);
  } else {
    console.info(`Created temporary folder '${tmpDir}'.`);
  }

  if (options.debug) {
    var tgzBak = path.join(tmpDir, `${tgzFile}.bak`);
    console.debug(`Creating retention copy '${tgzBak}' of tarball '${tgzPath}'.`);
    fs.copyFileSync(tgzPath, tgzBak);
    if (!fs.existsSync(tgzBak)) {
      throw Error(`Failed creating retention copy '${tgzBak}'.`);
    }
  }

  var tarPath = path.join(tmpDir, `${path.basename(tgzFile, path.extname(tgzFile))}.tar`);
  console.info(`Using '${tarPath}' as compression/decompression buffer.`);
  if (fs.existsSync(tarPath)) {
    console.info(`Removing existing decompression buffer '${tarPath}'.`);
    fs.removeSync(tarPath);
    if (fs.existsSync(tarPath)) {
      throw Error(`Failed removing existing decompression buffer '${tarPath}'.`);
    }
  }
  var tgzBuf = fs.readFileSync(tgzPath);
  console.info(`Read ${tgzBuf.length} bytes from source file '${tgzPath}'.`);
  var tarBuf = zlib.unzipSync(tgzBuf);
  console.info(`Decompressed ${tarBuf.length} bytes from source file '${tgzPath}'.`);
  fs.writeFileSync(tarPath, tarBuf);
  console.info(`Wrote ${tarBuf.length} bytes to target file '${tarPath}'.`);
  tar.extract({ file: tarPath, cwd: wrkDir, strip: 1, sync: true });
  console.info(`Extracted data from source file '${tarPath}' to folder '${wrkDir}'.`);
  var packageList = [];
  var packageListBin = [];
  tar.list({
    file: tarPath,
    cwd: wrkDir,
    strip: 1,
    sync: true,
    onentry: entry => {
      packageListBin.push(entry);
      packageList.push(entry.path.replace(prefrx, ''));
    }
  });
  if (options.debug) {
    var bakPath = `${tarPath}.bak`;
    console.debug(`Creating retention copy '${bakPath}' of decompression buffer '${tarPath}'.`);
    fs.copyFileSync(tarPath, bakPath);
    console.debug(`Exporting file list from retention copy '${tarPath}'.`);
    fs.writeFileSync(`${bakPath}.list`, packageList.join(os.EOL));
    console.debug(`Exporting entries JSON from retention copy '${tarPath}'.`);
    fs.writeJSONSync(`${bakPath}.json`, packageListBin, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
  }
  fs.removeSync(tarPath);
  if (fs.existsSync(tarPath)) {
    throw Error(`Failed removing decompression buffer '${tarPath}'.`);
  } else {
    console.info(`Removed decompression buffer '${tarPath}'.`);
  }

  // #region Process package
  process.env['npm_postpack_dir'] = wrkDir; // eslint-disable-line dot-notation
  if (clientScripts) {
    if (!Array.isArray(clientScripts)) {
      clientScripts = [clientScripts];
    }

    clientScripts.forEach(clientScript => {
      try {
        console.log(cp.execFileSync(`${process.execPath}`, clientScript).toString().trim());
      } catch (err) {
        console.error(err.message);
      }
    });
  }
  delete process.env['npm_postpack_dir']; // eslint-disable-line dot-notation
  // #endregion

  var fileList = [];
  packageList.forEach(file => {
    if (fs.existsSync(path.join(wrkDir, file))) {
      fileList.push(file);
    } else {
      console.debug(`File '${file}' no longer exists in '${wrkDir}' and will be removed from the package archive.`);
    }
  });
  glob.sync('**/*', { cwd: wrkDir, nodir: true }).forEach(file => {
    if (!fileList.includes(file)) {
      console.debug(`File '${file}' is new in '${wrkDir}' and will be included in the package archive.`);
      fileList.push(file);
    }
  });
  tar.create({ file: tarPath, cwd: wrkDir, prefix: prefix, portable: true, mtime: new Date('1985-10-26T08:15:00.000Z'), sync: true }, fileList);
  console.info(`Created compression buffer '${tarPath}' from source folder '${wrkDir}'.`);
  tarBuf = fs.readFileSync(tarPath);
  console.info(`Read ${tarBuf.length} bytes from compression buffer '${tarPath}'.`);
  tgzBuf = zlib.gzipSync(tarBuf);
  console.info(`Compressed to ${tgzBuf.length} bytes from compression buffer '${tarPath}'.`);
  fs.writeFileSync(tgzPath, tgzBuf);
  console.info(`Wrote ${tgzBuf.length} bytes to target file '${tgzPath}'.`);
  if (options.debug) {
    tgzBak = path.join(tmpDir, `${tgzFile}`);
    console.debug(`Creating retention copy '${tgzBak}' of new tarball '${tgzPath}'.`);
    fs.copyFileSync(tgzPath, tgzBak);
    if (!fs.existsSync(tgzBak)) {
      throw Error(`Failed creating retention copy '${tgzBak}'.`);
    }
    console.debug(`Retaining compression buffer '${tarPath}'.`);
    var tarList = [];
    var tarListBin = [];
    tar.list({
      file: tarPath,
      cwd: wrkDir,
      strip: 1,
      sync: true,
      onentry: entry => {
        tarListBin.push(entry);
        tarList.push(entry.path.replace(prefrx, ''));
      }
    });
    console.debug(`Exporting file list from compression buffer '${tarPath}'.`);
    fs.writeFileSync(`${tarPath}.list`, tarList.join(os.EOL));
    console.debug(`Exporting entries JSON from compression buffer '${tarPath}'.`);
    fs.writeJSONSync(`${tarPath}.json`, tarListBin, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
  } else {
    fs.removeSync(tarPath);
    if (fs.existsSync(tarPath)) {
      throw Error(`Failed removing compression buffer '${tarPath}'.`);
    } else {
      console.info(`Removed compression buffer '${tarPath}'.`);
    }
  }

  fs.removeSync(wrkDir);
  if (fs.existsSync(wrkDir)) {
    throw Error(`Failed to remove working folder '${wrkDir}'.`);
  } else {
    console.info(`Removed working folder '${wrkDir}'.`);
  }

  if (fs.readdirSync(tmpDir).length > 0) {
    console.debug(`Retaining temporary folder '${tmpDir}'.`);
  } else {
    fs.removeSync(tmpDir);
    if (fs.existsSync(tmpDir)) {
      throw Error(`Failed to remove temporary folder '${tmpDir}'.`);
    } else {
      console.info(`Removed temporary folder '${tmpDir}'.`);
    }
  }

  var npmTarballEnv = 'NPM_TARBALL';
  process.env[npmTarballEnv] = tgzPath;
  console.debug(`Set environment variable '${npmTarballEnv}' to '${process.env[npmTarballEnv]}'`);

  var exportFile = path.resolve(path.join('.', npmTarballEnv));
  console.debug(`Emitting tarball path '${tgzPath}' to export file '${exportFile}'.`);
  fs.writeFileSync(exportFile, tgzPath, { encoding: 'utf8' });
}
// #endregion

// #region SliceArgv()
/**
 * Searches for a file name in a parameter array using only the file's base name
 * and, if found, returns the part of the array sliced from the next position
 * the file name has been found in. Otherwise, the whole input array is returned
 * by default.
 * @param {string[]} argv The array to slice - usually `process.argv`.
 * @param {string} file The file name to lookup, usually `__filename`.
 * @param {boolean=} noDefaultAll Do *not* return the whole input array `argv`
 * if `file` could not be found.
 * @returns {string[]}
 */
exports.SliceArgv = (argv, file, noDefaultAll) => {
  if (!Array.isArray(argv)) {
    throw Error('Parameter \'argv\' is not an array.');
  }

  if (!file || !(typeof (file) === 'string')) {
    throw Error('Parameter \'file\' is not a non-empty string.');
  }

  var startIdx = process.argv.indexOf(file);
  if (startIdx < 1) {
    // console.log(`Searching argv for ${__filename}`);
    var filesffx = path.extname(file);
    argv.forEach((arg, idx) => {
      var filename = path.resolve(arg);
      var currsffx = path.extname(filename);
      filename = path.join(path.dirname(filename), path.basename(filename, currsffx)) + filesffx;
      if (filename === file) {
        startIdx = idx;
        //     console.log(`${idx} + ${arg} (${filename})`);
        // } else {
        //     console.log(`${idx} - ${arg} (${filename})`);
      }
    });
  }

  if (startIdx < 1 && !noDefaultAll) {
    return [];
  } else {
    return process.argv.slice(startIdx + 1);
  }
};
// #endregion

// #region CheckReadme()
/**
 * @typedef { import('./lib/generate-adoc').GenerateReadmeOptions } GenerateReadmeOptions
 * @param {string=} packagePath A path to the package root folder (defaults to `.`).
 * @param {string=} readmeFileName Defaults to `README.adoc`
 * @param {GenerateReadmeOptions=} options A `GenerateReadmeOptions` object
 */
exports.CheckReadme = (packagePath, readmeFileName, options) => {
  var oldReadmeContent = '';
  var newReadmeContent = '';
  var readmeFile = path.join(packagePath, readmeFileName);
  if (fs.existsSync(readmeFile)) {
    oldReadmeContent = fs.readFileSync(readmeFile, { encoding: 'utf8' });
  }

  try {
    genadoc.GenerateReadme(packagePath, readmeFileName, options);
  } catch (err) {
    if (oldReadmeContent) {
      fs.writeFileSync(readmeFile, oldReadmeContent, { encoding: 'utf8' });
    }
    throw err;
  }

  newReadmeContent = fs.readFileSync(readmeFile, { encoding: 'utf8' });
  if (oldReadmeContent === newReadmeContent) {
    return '';
  }

  var changes = [];
  diff.diffChars(oldReadmeContent, newReadmeContent, { newlineIsToken: true }).forEach(function (part) {
    changes.push(exports.ColorizeDiff(part, 'green', 'red', 'grey')); // green for additions, red for deletions grey for common parts
  });
  return changes.join('');
};
// #endregion

// #region ColorizeDiff()
exports.ColorizeDiff = (diff, addedColor, removedColor, unchangedColor) => {
  if (diff.added) { return diff.value.markWhiteSpace(true)[addedColor]; }
  if (diff.removed) { return diff.value.markWhiteSpace()[removedColor]; }
  return diff.value[unchangedColor];
};
// #endregion

// #region Console Capturing Support
// #region Types
/**
 * Function to reset the `console` hook(s) akquired for capturing outputs.
 * @callback UnhookIntercept
 * @returns {void}
 * @private
 */
// #endregion

// #region Variables
/**
 * Internal buffer for captured stdout text lines.
 * @type {string[]}
 * @private
 */
var stdout = [];

/**
 * Internal buffer for captured stderr text lines.
 * @type {string[]}
 * @private
 */
var stderr = [];

/**
 * Internal variable for caching a function that resets stdout and stderr.
 * @type {UnhookIntercept}
 */
var unhookIntercept = null;

/**
 * A buffer for captured stdout text lines.
 * @type {string[]}
 */
exports.stdout = [];
defineReadOnlyProperty('stdout', false, () => stdout);

/**
 * A buffer for captured stderr text lines.
 * @type {string[]}
 */
exports.stderr = [];
defineReadOnlyProperty('stderr', false, () => stderr);
// #endregion

/**
 * Starts capturing `console` output.
 *
 * If [DebugMode]{@link module:index.DebugMode} evaluates to `true`, all
 * captured content is also still forwarded to the console. Otherwise, the
 * console won't receive any content until
 * [ConsoleCaptureStop()]{@link module:index.ConsoleCaptureStop} is called.
 * @returns {void}
 */
exports.ConsoleCaptureStart = () => {
  if (unhookIntercept) {
    throw Error('Console capture has already been started.');
  }

  stdout = [];
  stderr = [];
  unhookIntercept = intercept(
    function (text) {
      if (text.length) stdout.push(text);
      if (debugMode) {
        return text;
      } else {
        return '';
      }
    },
    function (text) {
      if (text.length) stderr.push(text);
      if (debugMode) {
        return text;
      } else {
        return '';
      }
    }
  );
};

/**
 * Stops capturing `console` output.
 * @param {boolean} emit Specifies whether to flush all buffered content to the
 * console.
 *
 * The internal buffers will nevertheless be retained until the next
 * call of [ConsoleCaptureStart()]{@link module:index.ConsoleCaptureStart}.
 * @returns {void}
 */
exports.ConsoleCaptureStop = (emit = false) => {
  if (!unhookIntercept) {
    throw Error('Console capture has not been started.');
  }

  unhookIntercept();
  unhookIntercept = null;
  if (emit) {
    console.log(stdout.join(''));
    console.error(stderr.join(''));
  }
};
// #endregion

// #region Console Formatting Support

// #region Types
/**
 * Level of output verbosity.
 * @typedef {'default'|'verbose'|'debug'} LogLevel
 */
//
/**
 * A set of options specifying the console output verbosity.
 *
 * Will be the only definition remaining starting with next major version.
 * @typedef {object} ConsoleOptions
 * @property {LogLevel} logLevel The overall level of console output verbosity.
 * @property {boolean} [verbose] Emit verbose output.
 *
 * Automatically set to `true` if `{@link module:index~ConsoleOptions#logLevel}`
 * is set to {@link module:index.ConsoleLogLevel}`.verbose` or higher, unless
 * specified explicitly.
 * @property {boolean} [debug] Emit debug output.
 *
 * Automatically set to `true` if `{@link module:index~ConsoleOptions#logLevel}`
 * is set to {@link module:index~ConsoleLogLevel}`.debug` or higher, unless
 * specified explicitly.
 */
//
/**
 * @typedef {object} ConsoleOptions_
 * @property {LogLevel} [logLevel]
 * @property {boolean} [verbose]
 * @property {boolean} [debug]
 * @deprecated May be removed with the next major version update.
 */
// #endregion

// #region  Variables
/**
 * Internal variable storing the current prefix set.
 * @type {object}
 */
var consoleSystemPrefix = {};

/**
 * Internal stack buffer for system prefixes.
 * @type {object[]}
 */
var consoleSystemPrefixes = [];

/**
 * Internal stack buffer for prefixes.
 * @type {object[]}
 */
var consolePrefixes = [];

/**
 * Internal stack buffer for themes.
 * @type {object[]}
 */
var consoleThemes = [];

/**
 * A list of supported console platforms. These values are valid parameters for
 * [ConsoleInit()]{@link module:index.ConsoleInit}.
 * @type {string[]}
 */
exports.ConsoleSupportedPlatforms = ['github', 'devops', 'win32', 'other', undefined];

/**
 * A list of default methods on the `console` object.
 * @type {string[]}
 */
exports.ConsoleDefaultMethods = ['debug', 'info', 'warn', 'error'];

/**
 * @callback Validate
 * @description Checks a [ConsoleOptions]{@link module:index~ConsoleOptions}
 * object.
 * @param {ConsoleOptions_|ConsoleOptions} consoleOptions A
 * [ConsoleOptions]{@link module:index~ConsoleOptions} object.
 * @returns {ConsoleOptions} A safeguarded
 * [ConsoleOptions]{@link module:index~ConsoleOptions} object.
 */
//
/**
 * @typedef {object} ConsoleLogLevel Enumeration of valid console log levels, along with a validator for
 * [ConsoleOptions]{@link module:index~ConsoleOptions} objects.
 * @property {number} default The default log level, muting the `info()` and
 * `debug()` methods of the `console` object.
 * @property {number} verbose The verbose log level, muting the `debug()`
 * method of the `console` object.
 * @property {number} debug The debug log level, muting no methods of the
 * `console` object.
 * @property {module:index~Validate} Validate A validator for
 * [ConsoleOptions]{@link module:index~ConsoleOptions} objects.
 */
//
/**
 * Instance of {@link module:index~ConsoleLogLevel}.
 * @type {ConsoleLogLevel}
 */
exports.ConsoleLogLevel = {
  default: 0,
  verbose: 1,
  debug: 2,
  Validate: (consoleOptions) => {
    /** @type {ConsoleOptions} */
    var result;
    if (!consoleOptions) {
      result = { logLevel: 'default', verbose: false, debug: false };
    } else {
      result = { logLevel: consoleOptions.logLevel, verbose: consoleOptions.verbose, debug: consoleOptions.debug };
    }

    if (result.logLevel === undefined) {
      console.warn('Using \'ConsoleOptions\' without specifying the \'logLevel\' property is deprecated and may no longer be supported from the next major version release on.');
      result.logLevel = 'default';
    }
    if (result.verbose === undefined) {
      result.verbose = false;
    }
    if (result.debug === undefined) {
      result.debug = false;
    }

    var logLevel = exports.ConsoleLogLevel[result.logLevel];
    if (logLevel >= exports.ConsoleLogLevel.verbose) {
      result.verbose = true;
    }
    if (logLevel >= exports.ConsoleLogLevel.debug) {
      result.debug = true;
    }

    return result;
  }
};
// #endregion

/**
 * Resets (i.e. calls [ConsoleReset()]{@link module:index.ConsoleReset}) and
 * initializes the `console` object.
 * @param {('github'|'devops'|'win32'|'other')=} platform The platform `console`
 * output is meant to look like. If omitted, the platform will be evaluated
 * automatically.
 * @returns {void}
 */
exports.ConsoleInit = (platform) => {
  exports.ConsoleReset();

  if (!platform) {
    // @ts-ignore
    platform = this.ConsolePlatform;
  }

  switch (platform) {
    case 'github':
      exports.ConsolePushTheme({
        silly: 'rainbow',
        input: 'grey',
        verbose: 'strip',
        prompt: 'grey',
        info: 'strip',
        data: 'grey',
        help: 'cyan',
        warn: 'strip',
        debug: 'strip',
        error: 'strip'
      });
      exports.ConsolePushSystemPrefixes({
        debug: '::debug::',
        info: '',
        warn: '::warning::',
        error: '::error::'
      });
      break;
    case 'devops':
      exports.ConsolePushTheme({
        silly: 'rainbow',
        input: 'grey',
        verbose: 'strip',
        prompt: 'grey',
        info: 'strip',
        data: 'grey',
        help: 'cyan',
        warn: 'strip',
        debug: 'strip',
        error: 'strip'
      });
      exports.ConsolePushSystemPrefixes({
        debug: '##vso[task.debug]',
        info: '',
        warn: '##vso[task.logissue type=warning]',
        error: '##vso[task.logissue type=error]'
      });
      break;
    case 'win32':
      exports.ConsolePushTheme({
        silly: 'rainbow',
        input: 'grey',
        verbose: 'brightCyan',
        prompt: 'grey',
        info: 'cyan',
        data: 'grey',
        help: 'cyan',
        warn: 'yellow',
        debug: 'brightCyan',
        error: 'red'
      });
      /* eslint-disable dot-notation */
      exports.ConsolePushSystemPrefixes({
        debug: 'DEBUG: '['debug'],
        info: 'VERBOSE: '['info'],
        warn: 'WARNING: '['warn'],
        error: 'ERROR: '['error']
      });
      /* eslint-enable dot-notation */
      break;
    default:
      exports.ConsolePushTheme({
        silly: 'rainbow',
        input: 'grey',
        verbose: 'cyan',
        prompt: 'grey',
        info: 'green',
        data: 'grey',
        help: 'cyan',
        warn: 'yellow',
        debug: 'blue',
        error: 'red'
      });
      exports.ConsolePushSystemPrefixes({
        debug: '',
        info: '',
        warn: '',
        error: ''
      });
      break;
  }

  exports.ConsolePushPrefixes({
    debug: '',
    info: '',
    warn: '',
    error: ''
  });
};

/**
 * Resets the `console` object entirely (i.e. resotres all stacks until there's
 * nothing left on any of them).
 * @returns {void}
 */
exports.ConsoleReset = () => {
  while (consoleSystemPrefixes.length > 0) {
    exports.ConsolePopSystemPrefixes();
  }

  while (consolePrefixes.length > 0) {
    exports.ConsolePopPrefixes();
  }

  while (consoleThemes.length > 0) {
    exports.ConsolePopTheme();
  }
};

/**
 * Configures the console according to console options and pushes the entire
 * profile to the according stacks.
 * @param {(ConsoleOptions_|ConsoleOptions)=} consoleOptions A
 * [ConsoleOptions]{@link module:index~ConsoleOptions} object.
 * @returns {ConsoleOptions} A safeguarded
 * [ConsoleOptions]{@link module:index~ConsoleOptions} object.
 */
exports.ConsolePushOptions = (consoleOptions) => {
  var result = exports.ConsoleLogLevel.Validate(consoleOptions);

  var prefixes = {};
  if (!result.verbose) {
    prefixes.info = null;
  }

  if (!result.debug) {
    prefixes.debug = null;
  }

  exports.ConsolePushTheme();
  exports.ConsolePushSystemPrefixes();
  exports.ConsolePushPrefixes(prefixes);

  return result;
};

/**
 * Restores an entire profile from the stacks.
 * @returns {void}
 */
exports.ConsolePopOptions = () => {
  exports.ConsolePopTheme();
  exports.ConsolePopSystemPrefixes();
  exports.ConsolePopPrefixes();
};

/**
 * Saves the current prefixes to a stack and applies new prefixes.
 * @param {Object=} prefix A set of new prefixes. If omitted, an empty set of
 * prefixes will be pushed (and reset nothing when
 * [ConsolePopPrefixes()]{@link module:index.ConsolePopPrefixes} is called). If
 * the prefix value for a method is set to `null`, that method will be
 * **muted**!
 * @returns {void}
 *
 * @example
 * ConsolePushPrefixes({
 *     debug: null, // mute the console.debug() method
 *     info: 'DEBUG: ',
 *     warn: 'WARNING - ',
 *     error = '!ERROR!:: ',
 * });
 */
exports.ConsolePushPrefixes = (prefix) => {
  var cache = {};
  var keys = (typeof (prefix) === 'object') ? Object.keys(prefix) : [];
  keys.forEach(key => {
    if (console[key] === undefined) {
      cache[key] = null;
    } else {
      cache[key] = console[key];
    }
  });
  consolePrefixes.push(cache);

  keys.forEach(key => {
    var hide = (key === 'debug') ? !exports.DebugMode : false; // (prefix[key] == null);
    hide = hide || (prefix[key] == null);
    if (hide) {
      console[key] = (text) => { };
    } else {
      var stream = (key === 'error') ? 'stderr' : 'stdout';
      /**
       * @param {string} text
       * @ignore
       */
      console[key] = (text) => {
        var eol = os.EOL;
        if (text.endsWith('\b')) {
          eol = ' ';
          text = text.substr(0, text.length - 1);
        }
        if (text.startsWith('\b')) {
          process[stream].write(`${text.substr(1)}`[key] + eol);
        } else {
          process[stream].write(`${consoleSystemPrefix[key]}` + `${prefix[key]}${text}`[key] + eol);
        }
      };
    }
  });
};

/**
 * Restores the prefixes from the stack that were saved last. If there's no
 * further set of prefixes on the stack, nothing is changed.
 * @returns {void}
 */
exports.ConsolePopPrefixes = () => {
  if (consolePrefixes.length < 1) {
    return;
  }

  var cache = consolePrefixes.pop();
  Object.keys(cache).forEach(key => {
    if (cache[key] == null) {
      delete console[key];
    } else {
      console[key] = cache[key];
    }
  });
};

/**
 * Saves the current system prefixes to a stack and applies new system
 * prefixes.
 * @param {Object=} system A set of new system prefixes. If omitted, an empty
 * set of system prefixes will be pushed (and reset nothing when
 * [ConsolePopSystemPrefixes()]{@link module:index.ConsolePopSystemPrefixes} is
 * called).
 * @returns {void}
 */
exports.ConsolePushSystemPrefixes = (system) => {
  var cache = {};
  var keys = (typeof (system) === 'object') ? Object.keys(system) : [];
  keys.forEach(key => {
    if (consoleSystemPrefix[key] === undefined) {
      cache[key] = null;
    } else {
      cache[key] = consoleSystemPrefix[key];
    }
    consoleSystemPrefix[key] = system[key];
  });
  consoleSystemPrefixes.push(cache);
};

/**
 * Restores the system prefixes from the stack that were saved last. If there's
 * no further set of system prefixes on the stack, nothing is changed.
 */
exports.ConsolePopSystemPrefixes = () => {
  if (consoleSystemPrefixes.length < 1) {
    return;
  }

  var cache = consoleSystemPrefixes.pop();
  Object.keys(cache).forEach(key => {
    if (cache[key] == null) {
      delete consoleSystemPrefix[key];
    } else {
      consoleSystemPrefix[key] = cache[key];
    }
  });
};

/**
 * Saves the current themes to a stack and applies a new theme.
 * @param {Object=} theme A theme. If omitted, an empty theme will be pushed
 * (and reset nothing when
 * [ConsolePopTheme()]{@link module:index.ConsolePopTheme} is called).
 * @see See also in the documentation of themes on the npm colors package
 * [homepage]{@link https://github.com/Marak/colors.js} (or simply issue `npm
 * home colors` on the command line).
 * @returns {void}
 */
exports.ConsolePushTheme = (theme) => {
  var cache = {};
  var keys = (typeof (theme) === 'object') ? Object.keys(theme) : [];
  keys.forEach(key => {
    if (colors[key] === undefined) {
      cache[key] = null;
    } else {
      cache[key] = colors[key];
    }
  });
  consoleThemes.push(cache);

  if (keys.length > 0) {
    colors.setTheme(theme);
  }
};

/**
 * Restores the theme from the stack that was saved last. If there's no further
 * theme on the stack, nothing is changed.
 */
exports.ConsolePopTheme = () => {
  if (consoleThemes.length < 1) {
    return;
  }

  var cache = consoleThemes.pop();
  Object.keys(cache).forEach(key => {
    if (cache[key] == null) {
      delete String.prototype[key];
      delete colors[key];
    } else {
      colors[key] = cache[key];
    }
  });
};
// #endregion

// #region String extensions
// @ts-ignore
if (String.prototype.toLiteral == null) {
  // @ts-ignore
  String.prototype.toLiteral = function () { // eslint-disable-line no-extend-native
    var result = '';
    this.replace(/[\s\S]/g, function (character, ...args) {
      var escape = character.charCodeAt(0);
      switch (escape) {
        case 0x0000:
          result += '\\0';
          break;
        case 0x0008:
          result += '\\b';
          break;
        case 0x0009:
          result += '\\t';
          break;
        case 0x000a:
          result += '\\n';
          break;
        case 0x000b:
          result += '\\v';
          break;
        case 0x000c:
          result += '\\f';
          break;
        case 0x000d:
          result += '\\r';
          break;
        case 0x0022:
          result += '\\"';
          break;
        case 0x0027:
          result += '\\\'';
          break;
        case 0x005C:
          result += '\\\\';
          break;
        default:
          var escapeStr = escape.toString(16);
          var longhand = escapeStr.length > 2;
          result += '\\' + (longhand ? 'u' : 'x') + ('0000' + escapeStr).slice(longhand ? -4 : -2);
          return '';
      }
    });
    return result;
  };
}

// @ts-ignore
if (String.prototype.isWhitespace == null) {
  // @ts-ignore
  String.prototype.isWhitespace = function () { // eslint-disable-line no-extend-native
    return this.length > 0 && this.replace(/\s/g, '').length < 1;
  };
}

// @ts-ignore
if (String.prototype.markWhiteSpace == null) {
  // @ts-ignore
  String.prototype.markWhiteSpace = function (retain) { // eslint-disable-line no-extend-native
    // @ts-ignore
    if (this.isWhitespace()) {
      if (retain) {
        // @ts-ignore
        return this.toLiteral() + this;
      } else {
        // @ts-ignore
        return this.toLiteral();
      }
    } else {
      return this;
    }
  };
}

// @ts-ignore
if (String.prototype.plain == null) {
  // @ts-ignore
  String.prototype.plain = function (method) { // eslint-disable-line no-extend-native
    var thisString = this;
    if (consoleSystemPrefix[method] !== undefined) {
      if (thisString.startsWith(consoleSystemPrefix[method])) {
        thisString = thisString.substr(consoleSystemPrefix[method].length);
      }
    }
    return thisString.strip;
    // may be a more advance SpeechRecognitionAlternative, if the below doesn't work:
    // return thisString.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  };
}
// #endregion

// #region Read-only properties
// #region Types
/**
 * A function returning a property value.
 * @callback Getter
 * @returns {object}
 */
// #endregion

/**
 * Internal list of read-only properties added using
 * [defineReadOnlyProperty()]{@link module:index~defineReadOnlyProperty}.
 * @type {string[]}
 */
const readOnlyProperties = [];

/**
 * Creates a read-only property on the `exports` object and optionally
 * adds the property name `p` to the
 * [readOnlyProperties]{@link module:index~readOnlyProperties}[] array.
 * @param {string} p The property name.
 * @param {boolean} enumerable Controls whether the property name `p` is added
 * to the [readOnlyProperties]{@link module:index~readOnlyProperties}[] array.
 * @param {module:index~Getter} getter The `get` function.
 * @returns {void}
 */
function defineReadOnlyProperty (p, enumerable, getter) {
  Object.defineProperty(exports, p, {
    enumerable: false,
    configurable: false,
    get: getter,
    set: function () {
      throw TypeError(`Property '${p}' is read-only.`);
    }
  });
  if (enumerable) {
    readOnlyProperties.push(p);
  }
}

/**
 * A list of read-only properties that have been added using the
 * [defineReadOnlyProperty()]{@link module:index~defineReadOnlyProperty}
 * function having the `enumerable` parameter set to `true`.
 *
 * >Albeit all read-only properties added with
 * >[defineReadOnlyProperty()]{@link module:index~defineReadOnlyProperty} have
 * >their `enumerable` attribute set to `false` (to avoid them being serialized
 * >e.g. through
 * [JSON.stringify()]{@link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify}),
 * their names can be obtained through this property.
 * @type {string[]}
 */
exports.ReadOnlyProperties = null;
defineReadOnlyProperty('ReadOnlyProperties', false, () => readOnlyProperties);

/**
 * Internal, initialized on module load.
 * @type {boolean}
 */
const runningInGitHub = !(process.env.GITHUB_WORKFLOW === undefined);
/**
 * A value indicating if the module is running as part of a
 * [GitHub Actions Workflow]{@link https://help.github.com/en/actions/configuring-and-managing-workflows}.
 * @type {boolean}
 */
exports.RunningInGitHub = false;
defineReadOnlyProperty('RunningInGitHub', true, () => runningInGitHub);

/**
 * Internal, initialized on module load.
 * @type {boolean}
 */
const runningInDevOps = !(process.env.AGENT_ID === undefined);
/**
 * A value indicating if the module is running as part of an
 * [Azure DevOps Pipeline build or release task]{@link https://docs.microsoft.com/en-us/azure/devops/pipelines/process/tasks?view=azure-devops&tabs=yaml}.
 * @type {boolean}
 */
exports.RunningInDevOps = false;
defineReadOnlyProperty('RunningInDevOps', true, () => runningInDevOps);

/**
 * Internal, initialized on module load.
 * @type {boolean}
 */
const debugMode = (process.env.ACTIONS_STEP_DEBUG && `${process.env.ACTIONS_STEP_DEBUG}`.toLowerCase() === 'true') || // applies to GitHub Actions
                  (process.env.SYSTEM_DEBUG && `${process.env.SYSTEM_DEBUG}`.toLowerCase() === 'true') || // applies to Azure DevOps Pipelines
                  (process.argv && process.argv.includes('--vscode-debug'));
/**
 * A value indicating if the module is running in debug mode, evaluating several
 * different conditions.
 * @type {boolean}
*/
exports.DebugMode = false;
defineReadOnlyProperty('DebugMode', true, () => debugMode);

/**
 * A value indicating if the termial (i.e. `stdout`) can be blocked to wait for
 * user input, evaluating multiple different conditions.
 * @type {boolean}
 */
exports.TerminalCanBlock = true;
defineReadOnlyProperty('TerminalCanBlock', true, () => {
  return (process.stdin.setRawMode !== undefined) && (!unhookIntercept) && (!runningInGitHub);
});

/**
 * A value indicating which console platform has been evaluated automatically.
 * @type {string}
 */
exports.ConsolePlatform = '';
defineReadOnlyProperty('ConsolePlatform', true, () => {
  if (exports.RunningInGitHub) {
    return 'github';
  }

  if (exports.RunningInDevOps) {
    return 'devops';
  }

  return os.platform();
});
// #endregion

exports.os = require('./lib/os-utils');

exports.ConsoleInit();
