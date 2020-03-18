const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const glob = require('./glob-ignore');
const btools = require('../index');

/**
 * @param {string} pathSpec The path to put in the `path` property of the new
 * object.
 * @param {object} parentElement The parent object to retrieve all other
 * properties (except `path`) from.
 * @returns {Object} A new object to add to the `files` array in VSIX package
 * files.
 */
function newElement(pathSpec, parentElement) {
    var result = {};
    Object.keys(parentElement).filter(key => (key != 'path')).forEach(key => {
        result[key] = parentElement[key];
    });
    result['path'] = pathSpec.replace(/\\/g, '/');
    return result;
}

function tfxIgnore(vsixPackageFile, ignoreFileName, consoleOptions) {
    if (!vsixPackageFile) {
        vsixPackageFile = path.join('.', '..', 'vss-extension.json');
    }
    vsixPackageFile = path.resolve(vsixPackageFile);

    if (!ignoreFileName) {
        ignoreFileName = '.npmignore';
    }

    if (!fs.existsSync(vsixPackageFile)) {
        throw Error(`VSIX package file '${vsixPackageFile}' could not be found.`)
    }
    console.info(`Processing VSIX package file '${vsixPackageFile}'.`);

    var vsixPackagePath = path.dirname(vsixPackageFile);
    var vsixPackageBkup = path.resolve(vsixPackagePath, 'vss-extension.resolved.json');

    fs.copyFileSync(vsixPackageFile, vsixPackageBkup);

    var vsixJsonFilesElementName = 'files';
    var vsixJson = fs.readJSONSync(vsixPackageFile);
    if (!vsixJson[vsixJsonFilesElementName]) {
        console.warn(`There was no '${vsixJsonFilesElementName}' element found in VSIX package file '${vsixPackageFile}'.`);
        return;
    }

    var vsixFiles = [];
    var vsixFolders = [];
    /**@type {string[]} */
    var vsixPaths = vsixJson[vsixJsonFilesElementName];
    vsixPaths.forEach(element => {
        var pathSpec = element['path'];
        if (!pathSpec) {
            console.warn(`No 'path' element found in element '${element}'.`);
        }
        if (!path.isAbsolute(pathSpec)) {
            pathSpec = path.resolve(vsixPackagePath, pathSpec);
        }
        if (!fs.existsSync(pathSpec)) {
            console.warn(`Path '${pathSpec}' could not be found and will be skipped.`);
            return;
        }
        if (fs.lstatSync(pathSpec).isDirectory()) {
            vsixFolders.push(element);
        } else {
            var newItem = newElement(path.relative(vsixPackagePath, pathSpec), element);
            console.debug(`Adding file '${newItem['path']}'.`);
            vsixFiles.push(newItem);
        }
    });

    var files = [];
    var unique = [];
    vsixFiles.forEach(vsixFile => {
        if (!files.includes(vsixFile['path'])) {
            files.push(vsixFile['path']);
            unique.push(vsixFile);
        } else {
            console.warn(`Path '${vsixFile['path']}' is a duplicate and only the first occurrence will be kept.`);
        }
    });
    vsixFiles = unique;

    vsixFolders.forEach(element => {
        var subFiles = glob.IgnoreSync(path.isAbsolute(element['path']) ? element['path'] : path.resolve(vsixPackagePath, element['path']), ignoreFileName, consoleOptions);
        subFiles.forEach(pathSpec => {
            if (files.includes(pathSpec)) {
                return;
            }
            files.push(pathSpec);
            var newItem = newElement(path.relative(vsixPackagePath, pathSpec), element);
            console.debug(`Adding file '${newItem['path']}'.`);
            vsixFiles.push(newItem);
        });
    });

    vsixJson[vsixJsonFilesElementName] = vsixFiles;
    fs.writeJSONSync(vsixPackageBkup, vsixJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    console.debug(`Added ${vsixFiles.length} files total.`);
    console.info(`Successfully updated VSIX package file '${vsixPackageBkup}'.`);
}

//#region Exports
/**
 * Reads a VSIX package file and expands all directory specifications found in
 * the `files` element to file specifications, taking ignore files into account.
 * Results are saved to the file `vss-extensions.resolved.json` in the same
 * folder as `vsixPackageFile`.
 * @param {string=} vsixPackageFile Name and path of the VSIX package file to
 * process (defaults to `../vss-extension.json` if omitted).
 * @param {string=} ignoreFileName Name (without path) of the ignore file to
 * search for in `pathSpec` and all subfolders (defaults to `.npmignore` if
 * omitted).
 * @param {import('../index').ConsoleOptions=} consoleOptions A `ConsoleOptions`
 * object.
 */
exports.TfxIgnore = (vsixPackageFile, ignoreFileName, consoleOptions) => {
    consoleOptions = btools.ConsolePushOptions(consoleOptions);
    try {
        tfxIgnore(vsixPackageFile, ignoreFileName, consoleOptions);
    } finally {
        btools.ConsolePopOptions();
    }
}
//#endregion
