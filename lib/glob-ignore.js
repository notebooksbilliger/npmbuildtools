const fs = require('fs-extra');
const path = require('path');
const glob = require('glob-gitignore');
const ignore = require('ignore');
const btools = require('../index');

function ignoreSync(pathSpec, ignoreFileName, consoleOptions) {
    if (!ignoreFileName) {
        ignoreFileName = '.gitignore';
    }

    /**@type {string[]} */
    var result = [];
    var ignoreFile = path.resolve(pathSpec, ignoreFileName)

    console.debug(`Entering path '${pathSpec}'.`)
    /**@type {string[]} */
    var items;
    if (fs.existsSync(ignoreFile)) {
        console.debug(`Found ignore file '${ignoreFile}'.`);
        // @ts-ignore
        items = glob.sync('**', { cwd: pathSpec, dot: true, absolute: true, ignore: ignore().add(fs.readFileSync(ignoreFile).toString())});
    } else {
        items = glob.sync('**', { cwd: pathSpec, dot: true, absolute: true });
    }

    /**@type {string[]} */
    var removeItems = [];
    var folders = [];
    items.forEach(item => {
        if (fs.lstatSync(item).isDirectory()) {
            if (fs.existsSync(path.join(item, ignoreFileName))) {
                console.debug(`Found '${item}/+'.`);
                folders.push(item);
            } else {
                console.debug(`Found '${item}/'.`);
            }
        } else {
            console.debug(`Found '${item}'.`);
        }
    });

    folders.forEach(item => {
        var subItems = ignoreSync(item, ignoreFileName);
        var extItems = items.filter(extItem => extItem.startsWith(item));
        extItems.forEach(extItem => {
            if (!subItems.includes(extItem)) {
                removeItems.push(extItem);
            }
        });
    });

    items = items.filter(item => {
        var result = !removeItems.includes(item);
        if (!result) {
            console.debug(`Filtering '${item}'.`);
        }
        return result;
    });

    items.forEach(item => {
        if (!fs.lstatSync(item).isDirectory()) {
            result.push(item);
        }
    });

    console.debug(`Leaving path '${pathSpec}'.`)
    return result;
}

//#region Exports
/**
 * @param {string} pathSpec Path to process.
 * @param {string=} ignoreFileName Name (without path) of the ignore file to
 * search for in `pathSpec` and all subfolders (defaults to `.gitignore` if
 * omitted).
 * @param {import('../index').ConsoleOptions=} consoleOptions A `ConsoleOptions`
 * object.
 * @returns {string[]} A list of files being foud according to the rules in one
 * or more (nested) ignore files containing `gitignore` compliant rules.
 */
exports.IgnoreSync = (pathSpec, ignoreFileName, consoleOptions) => {
    consoleOptions = btools.ConsolePushOptions(consoleOptions);
    try {
        return ignoreSync(pathSpec, ignoreFileName, consoleOptions);
    } finally {
        btools.ConsolePopOptions();
    }
}
//#endregion
