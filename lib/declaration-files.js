const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const btools = require('../index');

/**
 * @param {string=} [packagePath='.'] Path to the package root folder. Defaults
 * to the current working directory (`.`).
 * @param { { declarationFileExtension?: string, dryRun?: boolean, consoleOptions?: import('../index').ConsoleOptions }= } options
 * Removal options. If omitted, `declarationFileExtension` defaults to `*.d.ts`
 * @param {string[]} includeSubfolders The subfolders to proccess. Defaults to
 * all directories specified in `package.json`, if omitted.
 * @returns {number} The number of files removed.
 */
exports.RemoveDeclarations = (packagePath, options, ...includeSubfolders) => {
    if (!packagePath) {
        packagePath = path.resolve('.');
    }
    if (!options) {
        options = { };
    }
    if (!options.declarationFileExtension) {
        options.declarationFileExtension = '*.d.ts';
    }

    var result;
    options.consoleOptions = btools.ConsolePushOptions(options.consoleOptions);
    try {
        result = removeDeclarations(packagePath, options, ...includeSubfolders);
    } finally {
        btools.ConsolePopOptions();
    }
    return result;
}

function removeDeclarations(packagePath, options, ...includeSubfolders) {
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

    var files = glob.sync(options.declarationFileExtension, { cwd: packagePath, nodir: true, absolute: true });
    glob.sync('*/', { cwd: packagePath, absolute: true }).forEach(de => {
        var absPath = path.resolve(packagePath, de);
        if (includeSubfolders.includes(absPath)) {
            console.debug(`Processing included subfolder '${de}' recursively.`)
            files = files.concat(glob.sync(`**/${options.declarationFileExtension}`, { cwd: absPath, nodir: true, absolute: true }));
        } else {
            console.debug(`Skipping non-included subfolder '${de}'.`)
        }
    });

    files.forEach(file => {
        console.debug(`Removing declaration file '${file}'`);
        if (!options.dryRun) {
            fs.removeSync(file);
        }
    });

    console.info(`Removed ${files.length} declaration files (${options.declarationFileExtension}) from path '${packagePath}'.`);
    return files.length;
}