const path = require('path');
const fs = require('fs-extra');

/**
 * @param {string=} [packagePath='.'] Path to the package root folder. Defaults
 * to the current working directory (`.`).
 * @param { { declarationFileExtension?: string, dryRun?: boolean }= } options
 * Removal options. If omitted, `declarationFileExtension` defaults to `*.d.ts`
 * @param {string[]} includeSubfolders The subfolders to proccess. Defaults to
 * all directories specified in `package.json`, if omitted.
 * @returns {number} The number of files removed.
 */
exports.RemoveDeclarations = function RemoveDeclarations(packagePath, options, ...includeSubfolders) {
    if (!packagePath) {
        packagePath = path.resolve('.');
    }
    if (!options) {
        options = { };
    }
    if (!options.declarationFileExtension) {
        options.declarationFileExtension = '*.d.ts';
    }
    if (includeSubfolders.length < 1) {
        var packageFile = path.resolve(packagePath, `package.json`);
        if (!fs.existsSync(packageFile)) {
            throw Error(`Package file '${packageFile}' could not be found.`);
        }
        var package_json = fs.readJSONSync(packageFile);
        if (package_json['directories']) {
            Object.keys(package_json['directories']).forEach(dir => {
                includeSubfolders.push(package_json['directories'][dir]);
            });
        }
    }
    includeSubfolders.forEach((value, index, array) => {
        var absPath = path.resolve(packagePath, value);
        if (fs.existsSync(absPath)) {
            array[index] = absPath;
        } else {
            console.error(`Directory '${value}' ('${absPath}') could not be found.`);
        }
    });

    console.info(`Removing declaration files (${options.declarationFileExtension}) from path '${packagePath}' and ${includeSubfolders.length} subfolders.`);

    var result = 0;
    function readDirRecursive(pathSpec) {
        var result = [];
        fs.readdirSync(pathSpec).forEach(de => {
            var absPath = path.resolve(pathSpec, de);
            if (fs.lstatSync(absPath).isDirectory()) {
                result = result.concat(readDirRecursive(absPath));
            } else {
                result.push(absPath);
            }
        });
        return result;
    }

    var files = [];
    fs.readdirSync(packagePath).forEach(de => {
        var absPath = path.resolve(packagePath, de);
        if (fs.lstatSync(absPath).isDirectory()) {
            if (includeSubfolders.includes(absPath)) {
                console.debug(`Processing included subfolder '${de}' recursively.`)
                files = files.concat(readDirRecursive(absPath));
            } else {
                console.debug(`Skipping non-included subfolder '${de}'.`)
            }
        } else {
            files.push(absPath);
        }
    });

    var fileExtension = options.declarationFileExtension.replace(/\*/g, '');
    files.forEach(file => {
        if (`${file}`.endsWith(fileExtension)) {
            console.debug(`Removing declaration file '${file}'`);
            if (!options.dryRun) {
                fs.removeSync(file);
            }
            result++;
        }
    });

    console.info(`Removed ${result} declaration files (${options.declarationFileExtension}) from path '${packagePath}'.`);
    return result;
}