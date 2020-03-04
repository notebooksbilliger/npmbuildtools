const cp = require('child_process');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');
const semver = require('semver');
const intercept = require("intercept-stdout");

var npm_version = process.env['npm_version'];
if (npm_version == undefined) {
    var npm_cli_js = process.env['NPM_CLI_JS'];
    if (npm_cli_js == undefined) {
        npm_version = "6.14.1";
        console.warn(`Unable to determine npm version automatically, assuming [${npm_version}].`);
    } else {
        npm_version = cp.execFileSync(`${process.execPath}`, [ npm_cli_js, '-v']).toString().trim();
    }
    process.env['npm_version'] = npm_version; // Store this for subsequent calls/reuires.
}
var tar;
if (semver.lte(npm_version, "6.14.1")) {
    /**
     * In order to get the same file modes in the headers of the newly
     * created tar file as in the headers of the sorce tar file,
     * tar version 4 must be used because npm uses tar version 4 as well.
     * At the time of this writing, the most recent npm version is 6.14.1,
     * which (yet/still) has tar@^4.4.13 in it's dependencies.
     * A change in file mode handling when the 'portable' option is set 
     * to 'true' (i.e. the new mode-fix.js) has been introduced in tar
     * package version 5.0.1, which may be used in future versions of npm.
     * As soon as this is the case, the above 'lastest npm version using
     * a tar version less than 5.0.1' must be adjusted from 6.14.1 to
     * whatever is the latest npm version using tar 4. 
     */
    tar = require('tar4');
} else {
    tar = require('tar');
}

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

    var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), tgzFile));
    if (!fs.existsSync(tmpDir)) {
        throw Error(`Failed to create temporary folder '${tmpDir}'.`);
    } else {
        console.info(`Created temporary folder '${tmpDir}'.`);
    }

    var tarPath = `${tmpDir}.tar`;
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
    tar.extract({ file: tarPath, cwd: tmpDir, strip: 1, sync: true });
    console.info(`Extracted data from source file '${tarPath}' to folder '${tmpDir}'.`);
    var packageList = [];
    var packageListBin = [];
    tar.list({ file: tarPath, cwd: tmpDir, strip: 1, sync: true, onentry: entry => {
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
        fs.writeFileSync(`${bakPath}.json`, JSON.stringify(packageListBin, null, 4));
    }
    fs.removeSync(tarPath);
    if (fs.existsSync(tarPath)) {
        throw Error(`Failed removing decompression buffer '${tarPath}'.`);
    } else {
        console.info(`Removed decompression buffer '${tarPath}'.`);
    }

    // Begin processing package
    process.env['npm_postpack_dir'] = tmpDir;
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
        if (fs.existsSync(path.join(tmpDir, file))) {
            fileList.push(file);
        } else {
            console.debug(`File '${file}' no longer exists in '${tmpDir}' and will be removed from the package archive.`);
        }
    });
    function readDirRecurseSync(dir, prefix) {
        var list = [];
        fs.readdirSync(dir, { withFileTypes: true }).forEach(de => {
            if (de.isDirectory()) {
                list = list.concat(readDirRecurseSync(path.join(dir, de.name), de.name));
            } else {
                list.push(path.join(prefix || '', de.name).replace(/\\/, '/'));
            }
        });
        return list;
    }
    readDirRecurseSync(tmpDir).forEach(file => {
        if (!fileList.includes(file))
        {
            console.debug(`File '${file}' is new in '${tmpDir}' and will be included in the package archive.`);
            fileList.push(file);
        }
    });
    tar.create({ file: tarPath, cwd: tmpDir, prefix: prefix, portable: true, mtime: new Date('1985-10-26T08:15:00.000Z'), sync: true, mode: 666 }, fileList);
    console.info(`Created compression buffer '${tarPath}' from source folder '${tmpDir}'.`);
    var tarBuf = fs.readFileSync(tarPath);
    console.info(`Read ${tarBuf.length} bytes from compression buffer '${tarPath}'.`);
    var tgzBuf = zlib.gzipSync(tarBuf);
    console.info(`Compressed to ${tgzBuf.length} bytes from compression buffer '${tarPath}'.`);
    fs.writeFileSync(tgzPath, tgzBuf);
    console.info(`Wrote ${tgzBuf.length} bytes to target file '${tgzPath}'.`);
    if (debug) {
        console.debug(`Retaining compression buffer '${tarPath}'.`);
        var tarList = [];
        var tarListBin = [];
        tar.list({ file: tarPath, cwd: tmpDir, strip: 1, sync: true, onentry: entry => {
                tarListBin.push(entry);
                tarList.push(entry.path.replace(prefrx, ''));
            }
        });
        console.debug(`Exporting file list from compression buffer '${tarPath}'.`);
        fs.writeFileSync(`${tarPath}.list`, tarList.join('\n'));
        console.debug(`Exporting entries JSON from compression buffer '${tarPath}'.`);
        fs.writeFileSync(`${tarPath}.json`, JSON.stringify(tarListBin, null, 4));
    } else {
        fs.removeSync(tarPath);
        if (fs.existsSync(tarPath)) {
            throw Error(`Failed removing compression buffer '${tarPath}'.`);
        } else {
            console.info(`Removed compression buffer '${tarPath}'.`);
        }
    }

    fs.removeSync(tmpDir);
    if (fs.existsSync(tmpDir)) {
        throw Error(`Failed to remove temporary folder '${tmpDir}'.`);
    } else {
        console.info(`Removed temporary folder '${tmpDir}'.`);
    }
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

//#region Console Capturing Support variables
var stdout = [], stderr = [];
var unhook_intercept;
var silent = false; //(process.env['ACTIONS_STEP_DEBUG'] != 'true'); // Din't work
exports.stdout = () => stdout;
exports.stderr = () => stderr;
//#endregion

exports.ConsoleCaptureStart = function ConsoleCaptureStart() {
    stdout = [];
    stderr = [];
    unhook_intercept = intercept(
        function(text) {
            if (text.length) stdout.push(text);
            if (silent) {
                return '';
            } else {
                return text;
            }
        },
        function(text) {
            if (text.length) stderr.push(text);
            if (silent) {
                return '';
            } else {
                return text;
            }
        }
    );
}

exports.ConsoleCaptureStop = function ConsoleCaptureStop(emit = false) {
    unhook_intercept();
    if (emit) {
        console.log(stdout.join(''));
        console.error(stderr.join(''));
    }
}
