require('colors');
const cp = require('child_process');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');
const diff = require('diff');
const semver = require('semver');
const intercept = require("intercept-stdout");
const genadoc = require(path.join(path.dirname(__filename), 'lib/generate-adoc'));

//#region get npm_version
const npm_version_latest_using_tar4 = '6.14.2';
var npm_version = process.env['npm_version'];
if (npm_version == undefined) {
    try {
        npm_version = cp.execSync('npm -v').toString().trim();
    } catch(err) {
        console.error(err);
        npm_version = npm_version_latest_using_tar4;
        console.warn(`Unable to determine npm version automatically, assuming [${npm_version}].`);
    }
    process.env['npm_version'] = npm_version; // Store this for subsequent calls/reuires.
}
//#endregion

//#region require(tar)
var tar;
if (semver.lte(npm_version, npm_version_latest_using_tar4)) {
    /**
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
//#endregion

exports.PostPack = function PostPack(clientScripts, verbose, debug) {
    if (verbose) {
        console.info = (message) => { console.log(`npm \u001b[34mnotice\u001b[0m ${message}`) };
    } else {
        console.info = (message) => {};
    }

    if (debug) {
        console.debug = (message) => { console.log(`npm \u001b[93mdebug\u001b[0m  ${message}`) };

        console.debug(`Available environment variables:`);
        var envVars = Object.keys(process.env);
        envVars.forEach(envVar => {
            console.debug(`${envVar} = ${process.env[envVar]}`);
        });
    } else {
        console.debug = (message) => {};
    }

    console.info(`\u001b[35m=== Post Pack Processing ===\u001b[0m`);

    var assumeDryRun = false;
    var prefix = "package";
    var prefrx = new RegExp(`^${prefix}\/`);

    var npmPackageNameEnv = 'npm_package_name';
    var npmPackageVersionEnv = 'npm_package_version';

    var npmPackageName = process.env[npmPackageNameEnv];
    var npmPackageVersion = process.env[npmPackageVersionEnv];

    var packageJson, packageFile
    if (npmPackageName == undefined || npmPackageVersion == undefined) {
        packageJson = path.resolve(path.join('.', `package.json`));
        if (!fs.existsSync(packageJson)) {
            throw Error(`File '${packageJson}' could not be found.`);
        }
        console.info(`Loading packge file '${packageJson}'.`);

        packageFile = require(packageJson);
        assumeDryRun = true;
    }

    if (npmPackageName == undefined) {
        npmPackageName = packageFile['name'];
        if (npmPackageName == undefined) {
            throw Error(`Package name could not be determined from neither environment variable '${npmPackageNameEnv}' nor package file '${packageJson}'.`);
        } else {
            console.info(`Package name '${npmPackageName}' was retrieved from package file '${packageJson}'.`);
        }
    } else {
        console.info(`Package name '${npmPackageName}' was retrieved from environment variable '${npmPackageNameEnv}'.`);
    }

    if (npmPackageVersion == undefined) {
        npmPackageVersion = packageFile['version'];
        if (npmPackageVersion == undefined) {
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
            console.info(`Assuming --dry-run, aborting.`);
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

    var tmpDir = fs.ensureDirSync(`${wrkDir}-temp`);
    if (!fs.existsSync(tmpDir)) {
        throw Error(`Failed to create temporary folder '${tmpDir}'.`);
    } else {
        console.info(`Created temporary folder '${tmpDir}'.`);
    }

    if (debug) {
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
    tar.list({ file: tarPath, cwd: wrkDir, strip: 1, sync: true, onentry: entry => {
            packageListBin.push(entry);
            packageList.push(entry.path.replace(prefrx, ''));
        }
    });
    if (debug) {
        var bakPath = `${tarPath}.bak`;
        console.debug(`Creating retention copy '${bakPath}' of decompression buffer '${tarPath}'.`);
        fs.copyFileSync(tarPath, bakPath);
        console.debug(`Exporting file list from retention copy '${tarPath}'.`);
        fs.writeFileSync(`${bakPath}.list`, packageList.join('\n'));
        console.debug(`Exporting entries JSON from retention copy '${tarPath}'.`);
        fs.writeJSONSync(`${bakPath}.json`, packageListBin, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
    }
    fs.removeSync(tarPath);
    if (fs.existsSync(tarPath)) {
        throw Error(`Failed removing decompression buffer '${tarPath}'.`);
    } else {
        console.info(`Removed decompression buffer '${tarPath}'.`);
    }

    // Begin processing package
    process.env['npm_postpack_dir'] = wrkDir;
    if (clientScripts) {
        if (!Array.isArray(clientScripts)) {
            clientScripts = [ clientScripts ];
        }

        clientScripts.forEach(clientScript => {
            try {
                console.log(cp.execFileSync(`${process.execPath}`, clientScript).toString().trim());
            } catch(err) {
                console.error(err.message);
            }
        });
    }
    delete process.env['npm_postpack_dir'];
    // End processing package

    var fileList = [];
    packageList.forEach(file => {
        if (fs.existsSync(path.join(wrkDir, file))) {
            fileList.push(file);
        } else {
            console.debug(`File '${file}' no longer exists in '${wrkDir}' and will be removed from the package archive.`);
        }
    });
    function readDirRecurseSync(dir, prefix) {
        var list = [];
        fs.readdirSync(dir).forEach(de => {
            var relativePath = path.join(prefix || '', de);
            var absolutePath = path.join(dir, de);
            if (fs.lstatSync(absolutePath).isDirectory()) {
                list = list.concat(readDirRecurseSync(absolutePath, relativePath));
            } else {
                list.push(relativePath.replace(/\\/g, '/'));
            }
        });
        return list;
    }
    readDirRecurseSync(wrkDir).forEach(file => {
        if (!fileList.includes(file))
        {
            console.debug(`File '${file}' is new in '${wrkDir}' and will be included in the package archive.`);
            fileList.push(file);
        }
    });
    tar.create({ file: tarPath, cwd: wrkDir, prefix: prefix, portable: true, mtime: new Date('1985-10-26T08:15:00.000Z'), sync: true }, fileList);
    console.info(`Created compression buffer '${tarPath}' from source folder '${wrkDir}'.`);
    var tarBuf = fs.readFileSync(tarPath);
    console.info(`Read ${tarBuf.length} bytes from compression buffer '${tarPath}'.`);
    var tgzBuf = zlib.gzipSync(tarBuf);
    console.info(`Compressed to ${tgzBuf.length} bytes from compression buffer '${tarPath}'.`);
    fs.writeFileSync(tgzPath, tgzBuf);
    console.info(`Wrote ${tgzBuf.length} bytes to target file '${tgzPath}'.`);
    if (debug) {
        tgzBak = path.join(tmpDir, `${tgzFile}`);
        console.debug(`Creating retention copy '${tgzBak}' of new tarball '${tgzPath}'.`);
        fs.copyFileSync(tgzPath, tgzBak);
        if (!fs.existsSync(tgzBak)) {
            throw Error(`Failed creating retention copy '${tgzBak}'.`);
        }
        console.debug(`Retaining compression buffer '${tarPath}'.`);
        var tarList = [];
        var tarListBin = [];
        tar.list({ file: tarPath, cwd: wrkDir, strip: 1, sync: true, onentry: entry => {
                tarListBin.push(entry);
                tarList.push(entry.path.replace(prefrx, ''));
            }
        });
        console.debug(`Exporting file list from compression buffer '${tarPath}'.`);
        fs.writeFileSync(`${tarPath}.list`, tarList.join('\n'));
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

exports.SliceArgv = function SliceArgs(argv, file, defaultAll) {

    if (!Array.isArray(argv)) {
        throw Error(`Parameter 'argv' is not an array.`);
    }

    if (!file || !(typeof(file) === 'string')) {
        throw Error(`Parameter 'file' is not a non-empty string.`);
    }

    var startIdx = process.argv.indexOf(file);
    if (startIdx < 1) {
        //console.log(`Searching argv for ${__filename}`);
        var filesffx = path.extname(file);
        argv.forEach((arg, idx) => {
            var filename = path.resolve(arg);
            var currsffx = path.extname(filename)
            filename = path.join(path.dirname(filename), path.basename(filename, currsffx)) + filesffx;
            if (filename == file) {
                startIdx = idx;
            //     console.log(`${idx} + ${arg} (${filename})`);
            // } else {
            //     console.log(`${idx} - ${arg} (${filename})`);
            }
        });
    }

    if (startIdx < 1 && !defaultAll) {
        return [];
    } else {
        return process.argv.slice(startIdx + 1);
    }
}

exports.CheckReadme = function CheckReadme(packagePath, readmeFileName, lineBreak, updateTimestamp) {
    var oldReadmeContent = '', newReadmeContent = '';
    var readmeFile = path.join(packagePath, readmeFileName);
    if (fs.existsSync(readmeFile)) {
        oldReadmeContent = fs.readFileSync(readmeFile, { encoding: 'utf8' });
    }

    try {
        genadoc.GenerateReadme(packagePath, readmeFileName, lineBreak, updateTimestamp);
    } catch(err) {
        if (oldReadmeContent) {
            fs.writeFileSync(readmeFile, oldReadmeContent, { encoding: 'utf8' });
        }
        throw err;
    }

    newReadmeContent = fs.readFileSync(readmeFile, { encoding: 'utf8' });
    if (oldReadmeContent == newReadmeContent) {
        return '';
    }

    var changes = [];
    diff.diffChars(oldReadmeContent, newReadmeContent, { newlineIsToken: true } ).forEach(function(part){
        changes.push(exports.ColorizeDiff(part, 'green', 'red', 'grey')); // green for additions, red for deletions grey for common parts
    });
    return changes.join('');
}

exports.ColorizeDiff = function ColorizeDiff(diff, addedColor, removedColor, unchangedColor) {
    if (diff.added) { return diff.value.markWhiteSpace(true)[addedColor]; }
    if (diff.removed) { return diff.value.markWhiteSpace()[removedColor]; }
    return diff.value[unchangedColor];
}

//#region Console Capturing Support
/**
 * Internal buffer for captured stdout text lines.
 * @type {string[]}
 */
var stdout = [];

/**
 * Internal buffer for captured stderr text lines.
 * @type {string[]}
 */
var stderr = [];

/**
 * Internal variable for caching a function that resets stdout and stderr.
 * @type {()}
 */
var unhook_intercept = null;

/**
 * @returns A buffer of captured stdout text lines.
 * @type {string[]}
 */
exports.stdout = [];
defineReadOnlyProperty('stdout', false, () => stdout);

/**
 * @returns A buffer of captured stderr text lines.
 * @type {string[]}
 */
exports.stderr = [];
defineReadOnlyProperty('stderr', false, () => stderr);

exports.ConsoleCaptureStart = function ConsoleCaptureStart() {
    if (unhook_intercept) {
        throw Error('Console capture has already been started.');
    }

    stdout = [];
    stderr = [];
    unhook_intercept = intercept(
        function(text) {
            if (text.length) stdout.push(text);
            if (debugMode) {
                return text;
            } else {
                return '';
            }
        },
        function(text) {
            if (text.length) stderr.push(text);
            if (debugMode) {
                return text;
            } else {
                return '';
            }
        }
    );
}

exports.ConsoleCaptureStop = function ConsoleCaptureStop(emit = false) {
    if (!unhook_intercept) {
        throw Error('Console capture has not been started.');
    }

    unhook_intercept();
    unhook_intercept = null;
    if (emit) {
        console.log(stdout.join(''));
        console.error(stderr.join(''));
    }
}
//#endregion

//#region String extensions
if (String.prototype.toLiteral == null) {
    String.prototype.toLiteral = function () {
        result =  '';
        this.replace(/[\s\S]/g, function(character) {
            var escape = character.charCodeAt();
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
                    escape = escape.toString(16);
                    var longhand = escape.length > 2;
                    result += '\\' + (longhand ? 'u' : 'x') + ('0000' + escape).slice(longhand ? -4 : -2);
                    break;
            }
        });
        return result;
    }
}

if (String.prototype.isWhitespace == null) {
    String.prototype.isWhitespace = function () {
        return this.length > 0 && this.replace(/\s/g, '').length < 1;
    }
}

if (String.prototype.markWhiteSpace == null) {
    String.prototype.markWhiteSpace = function (retain) {
        if (this.isWhitespace()) {
            if (retain) {
                return this.toLiteral() + this;
            } else {
                return this.toLiteral();
            }
        } else {
            return this;
        }
    }
}
//#endregion

//#region Read-only properties
/**
 * Internal list of read-only properties added by `defineReadOnlyProperty()`
 * @type {string[]}
 */
const readOnlyProperties = [];
/**
 * Creates a read-only property on the `exports` object and optionally
 * adds the property name `p` to the `readOnlyProperties[]` array.
 * @param {string} p The property name.
 * @param {boolean} enumerable Controls whether the property name `p` is added to the `readOnlyProperties[]` array.
 * @param {()} getter The `get` function.
 */
function defineReadOnlyProperty(p, enumerable, getter) {
    Object.defineProperty(exports, p, {
        enumerable: false,
        configurable: false,
        get: getter,
        set: function() {
            throw TypeError(`Property '${p}' is read-only.`);
        }
    });
    if (enumerable) {
        readOnlyProperties.push(p);
    }
}

/**
 * @returns A list of read-only properties that have been added
 * with `defineReadOnlyProperty()` and parameter
 * `enumerable` set to `true`.
 * 
 * ---
 * Albeit all read-only properties added with `defineReadOnlyProperty()`
 * have their `enumerable` attribute set to `false` (to avoid them 
 * being serialized e.g. throuch `JSON.stringify()`), their names can
 * be obtained through this property.
 * @type {string[]}
 */
exports.ReadOnlyProperties = null;
defineReadOnlyProperty('ReadOnlyProperties', false, () => readOnlyProperties);

/** Internal, initialized on module load */
const runningInGitHub = !(process.env['GITHUB_WORKFLOW'] == undefined);
/**
 * @returns A value indicating if the module is running
 * as part of a GitHub Action workflow.
 */
exports.RunningInGitHub = false;
defineReadOnlyProperty('RunningInGitHub', true, () => runningInGitHub);

/** Internal, initialized on module load */
const debugMode = (process.env['ACTIONS_STEP_DEBUG'] && `${process.env['ACTIONS_STEP_DEBUG']}`.toLowerCase() == 'true')
               || (process.argv && process.argv.includes('--vscode-debug'));
/**
* @returns A value indicating if the module is running
* in debug mode, evaluating multiple different conditions.
*/
exports.DebugMode = false;
defineReadOnlyProperty('DebugMode', true, () => debugMode);

/**
* @returns A value indicating if the termial (i.e. `stdout`)
* can be blocked to wait for user input, evaluating multiple
* different conditions.
 */
exports.TerminalCanBlock = true;
defineReadOnlyProperty('TerminalCanBlock', true, () => {
    return (process.stdin.setRawMode != undefined) && (!unhook_intercept) && (!runningInGitHub);
});
//#endregion