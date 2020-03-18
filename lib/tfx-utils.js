const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const glob = require('./glob-ignore');
const semver = require('semver');
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
            console.info(`Adding file '${newItem['path']}'.`);
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
            console.info(`Adding file '${newItem['path']}'.`);
            vsixFiles.push(newItem);
        });
    });

    vsixJson[vsixJsonFilesElementName] = vsixFiles;
    fs.writeJSONSync(vsixPackageBkup, vsixJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    console.info(`Added ${vsixFiles.length} files total.`);
    console.info(`Successfully updated VSIX package file '${vsixPackageBkup}'.`);
}

/**
 * 
 * @param {object} jsonObject 
 * @param {string} elementPath 
 * @param {string} file 
 * @param {string} fileTitle 
 * @param {(object)=>void} cb
 */
function getElement(jsonObject, elementPath, file, fileTitle, cb) {
    if (!jsonObject || Object.keys(jsonObject).length < 1) {
        if (!fs.existsSync(file)) {
            throw Error(`${fileTitle} file '${file}' could not be found.`);
        }
        jsonObject = require(file);
        cb(jsonObject);
    }

    var elements = elementPath.split('.');
    var currentPath = '';
    var currentObject = jsonObject;
    elements.forEach(element => {
        currentPath += `.${element}`;
        if (!currentObject.hasOwnProperty(element)) {
            throw Error(`Element '${currentPath.substr(1)}' could not be found in ${`${fileTitle}`.toLowerCase()} file '${file}'.`);
        } else {
            currentObject = currentObject[element];
        }
    });

    return currentObject;
}

/**
 * 
 * @param {object} jsonObject 
 * @param {string} elementPath 
 * @param {object} value 
 */
function setElement(jsonObject, elementPath, value) {
    if (!jsonObject) {
        throw Error(`JSON object is '${jsonObject}'.`);
    }

    var elements = elementPath.split('.');
    var currentObject = jsonObject;
    elements.forEach((element, index) => {
        if (!currentObject.hasOwnProperty(element)) {
            if (index == elements.length -1) {
                currentObject[element] = value;
            } else {
                currentObject[element] = {}
            }
        } else {
            if (index == elements.length -1) {
                currentObject[element] = value;
            } else {
                currentObject = currentObject[element]
            }
        }
    });
}

function tfxMkboot(packagePath, bootFile, consoleOptions, ...commands) {
    if (!packagePath) {
        packagePath = '.';
    }
    packagePath = path.resolve(packagePath);
    console.info(`Processing package in '${packagePath}'.`);

    if (!bootFile) {
        bootFile = 'boot.js';
    }

    var packageJsonFile = path.resolve(packagePath, 'package.json');
    var taskJsonFile = path.resolve(packagePath, 'task.json');
    var bootJsFile = path.resolve(packagePath, bootFile);

    var packageJson = {}, taskJson = {};
    var main = getElement(packageJson, 'main', packageJsonFile, 'Package', (obj) => packageJson = obj);
    var pver = getElement(packageJson, 'version', packageJsonFile, 'Package', (obj) => packageJson = obj);
    var id   = getElement(taskJson, 'id', taskJsonFile, 'Task', (obj) => taskJson = obj);
    var name = getElement(taskJson, 'name', taskJsonFile, 'Task', (obj) => taskJson = obj);
    var major = getElement(taskJson, 'version.Major', taskJsonFile, 'Task', (obj) => taskJson = obj);
    var minor = getElement(taskJson, 'version.Minor', taskJsonFile, 'Task', (obj) => taskJson = obj);
    var patch = getElement(taskJson, 'version.Patch', taskJsonFile, 'Task', (obj) => taskJson = obj);
    var tver = `${major}.${minor}.${patch}`;

    var absMain = path.resolve(packagePath, main);
    var relMain = path.relative(packagePath, absMain);
    if (!path.isAbsolute(relMain) && !relMain.startsWith('..')) {
        relMain = `./${relMain}`;
    }

    setElement(taskJson ,'execution.Node10.target', bootFile);
    
    if (semver.neq(pver, tver)) {
        taskJson.version = {};
        taskJson.version.Major = semver.major(pver);
        taskJson.version.Minor = semver.minor(pver);
        taskJson.version.Patch = semver.patch(pver);
    }

    fs.writeJSONSync(taskJsonFile, taskJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

    if (commands.length < 1) {
        commands.push('npm install -production');
    }

    var bootJs = `const cp = require('child_process');
const path = require('path');

const rwdEnv = 'AGENT_ROOTDIRECTORY';
var rwd = process.env[rwdEnv];
if (!rwd) {
    rwd = path.resolve('.');
    console.error(\`Environment variable '\${rwdEnv}' could not be found, defaulted to '\${rwd}'.\`);
}

const twd = path.join(rwd, '_tasks', '${name}_${id}', '${pver}');
console.debug(\`Task directory is '\${twd}'.\`);

var commands = [
    '${commands.join(`',\n    '`)}'
];

var cwd = process.cwd();
process.chdir(twd);
commands.forEach(command => {
    console.log(\`\${process.cwd()}>\${command}\`);
    cp.execSync(command);
});
process.chdir(cwd);

require('${relMain}');
`;
    fs.writeFileSync(bootJsFile, bootJs);

    console.info(`Finished processing package '${name}' in '${packagePath}'.`);
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

/**
 * @param {string=} packagePath A path to the package root folder (defaults to
 * `.`).
 * @param {string=} bootFile Name (without path) of the boot file to create
 * (defaults to `boot.js` if omitted).
 * @param {import('../index').ConsoleOptions=} consoleOptions A `ConsoleOptions`
 * object.
 * @param {string[]} commands The commands to run in the package folder
 * (defaults to a single command `npm install -production` if omitted).
 */
exports.TfxMkboot = (packagePath, bootFile, consoleOptions, ...commands) => {
    consoleOptions = btools.ConsolePushOptions(consoleOptions);
    try {
        tfxMkboot(packagePath, bootFile, consoleOptions, ...commands);
    } finally {
        btools.ConsolePopOptions();
    }
}
//#endregion
