const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const glob = require('./glob-ignore');
const semver = require('semver');
const btools = require('../index');

// #region tfxIgnore
/**
 * @param {string} pathSpec The path to put in the `path` property of the new
 * object.
 * @param {object} parentElement The parent object to retrieve all other
 * properties (except `path`) from.
 * @returns {Object} A new object to add to the `files` array in VSIX package
 * files.
 */
function newElement (pathSpec, parentElement) {
  var result = {};
  Object.keys(parentElement).filter(key => (key !== 'path')).forEach(key => {
    result[key] = parentElement[key];
  });
  result.path = pathSpec.replace(/\\/g, '/');
  return result;
}

function tfxIgnore (vsixPackageFile, ignoreFileName, consoleOptions) {
  if (!vsixPackageFile) {
    vsixPackageFile = path.join('.', '..', 'vss-extension.json');
  }
  vsixPackageFile = path.resolve(vsixPackageFile);

  if (!ignoreFileName) {
    ignoreFileName = '.npmignore';
  }

  if (!fs.existsSync(vsixPackageFile)) {
    throw Error(`VSIX package file '${vsixPackageFile}' could not be found.`);
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
  /** @type {string[]} */
  var vsixPaths = vsixJson[vsixJsonFilesElementName];
  vsixPaths.forEach(element => {
    var pathSpec = element['path']; // eslint-disable-line dot-notation
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
      console.info(`Adding file '${newItem.path}'.`);
      vsixFiles.push(newItem);
    }
  });

  var files = [];
  var unique = [];
  vsixFiles.forEach(vsixFile => {
    if (!files.includes(vsixFile.path)) {
      files.push(vsixFile.path);
      unique.push(vsixFile);
    } else {
      console.warn(`Path '${vsixFile.path}' is a duplicate and only the first occurrence will be kept.`);
    }
  });
  vsixFiles = unique;

  vsixFolders.forEach(element => {
    var subFiles = glob.IgnoreSync(path.isAbsolute(element.path) ? element.path : path.resolve(vsixPackagePath, element.path), ignoreFileName, consoleOptions);
    subFiles.forEach(pathSpec => {
      if (files.includes(pathSpec)) {
        return;
      }
      files.push(pathSpec);
      var newItem = newElement(path.relative(vsixPackagePath, pathSpec), element);
      console.info(`Adding file '${newItem.path}'.`);
      vsixFiles.push(newItem);
    });
  });

  vsixJson[vsixJsonFilesElementName] = vsixFiles;
  fs.writeJSONSync(vsixPackageBkup, vsixJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

  console.info(`Added ${vsixFiles.length} files total.`);
  console.info(`Successfully updated VSIX package file '${vsixPackageBkup}'.`);
}
// #endregion

// #region tfxMkboot
/**
 * @param {object} jsonObject
 * @param {string} elementPath
 * @param {string} file
 * @param {string} fileTitle
 * @param {(object)=>void} cb
 */
function getElement (jsonObject, elementPath, file, fileTitle, cb) {
  if (!jsonObject || Object.keys(jsonObject).length < 1) {
    if (!fs.existsSync(file)) {
      throw Error(`${fileTitle} file '${file}' could not be found.`);
    }
    jsonObject = fs.readJSONSync(file);
    cb(jsonObject);
  }

  var elements = elementPath.split('.');
  var currentPath = '';
  var currentObject = jsonObject;
  elements.forEach(element => {
    currentPath += `.${element}`;
    if (!currentObject.hasOwnProperty(element)) { // eslint-disable-line no-prototype-builtins
      throw Error(`Element '${currentPath.substr(1)}' could not be found in ${`${fileTitle}`.toLowerCase()} file '${file}'.`);
    } else {
      currentObject = currentObject[element];
    }
  });

  return currentObject;
}

/**
 * @param {object} jsonObject
 * @param {string} elementPath
 * @param {object} value
 */
function setElement (jsonObject, elementPath, value) {
  if (!jsonObject) {
    throw Error(`JSON object is '${jsonObject}'.`);
  }

  var elements = elementPath.split('.');
  var currentObject = jsonObject;
  elements.forEach((element, index) => {
    if (!currentObject.hasOwnProperty(element)) { // eslint-disable-line no-prototype-builtins
      if (index === elements.length - 1) {
        currentObject[element] = value;
      } else {
        currentObject[element] = {};
      }
    } else {
      if (index === elements.length - 1) {
        currentObject[element] = value;
      } else {
        currentObject = currentObject[element];
      }
    }
  });
}

/** @param {TfxMkbootOptions} options A `TfxMkbootOptions` object. */
function tfxMkboot (options, ...commands) {
  if (!options.packagePath) {
    options.packagePath = '.';
  }
  options.packagePath = path.resolve(options.packagePath);
  console.info(`Processing package in '${options.packagePath}'.`);

  if (!options.bootFile) {
    options.bootFile = 'boot.js';
  }

  var packageJsonFile = path.resolve(options.packagePath, 'package.json');
  var taskJsonFile = path.resolve(options.packagePath, 'task.json');
  var bootJsFile = path.resolve(options.packagePath, options.bootFile);

  var packageJson = {};
  var taskJson = {};
  /* eslint-disable no-return-assign */
  console.debug(`Reading '${packageJsonFile}'.`);
  var main = getElement(packageJson, 'main', packageJsonFile, 'Package', (obj) => packageJson = obj);
  var pver = getElement(packageJson, 'version', packageJsonFile, 'Package', (obj) => packageJson = obj);
  console.debug(`Reading '${taskJsonFile}'.`);
  var id = getElement(taskJson, 'id', taskJsonFile, 'Task', (obj) => taskJson = obj);
  var name = getElement(taskJson, 'name', taskJsonFile, 'Task', (obj) => taskJson = obj);
  var tver = exports.TaskVersionToString(getElement(taskJson, 'version', taskJsonFile, 'Task', (obj) => taskJson = obj));
  /* eslint-enable no-return-assign */

  var absMain = path.resolve(options.packagePath, main);
  var relMain = path.relative(options.packagePath, absMain);
  if (!path.isAbsolute(relMain) && !relMain.startsWith('..')) {
    relMain = `./${relMain}`;
  }

  var checkVersions = false;

  var oldBootFile = '';
  try {
    oldBootFile = getElement(taskJson, 'execution.Node10.target', taskJsonFile, 'Task', (obj) => taskJson = obj); // eslint-disable-line no-return-assign
  } catch (err) {
    console.debug(err.message);
  }
  if (!(oldBootFile === options.bootFile)) {
    setElement(taskJson, 'execution.Node10.target', options.bootFile);
    checkVersions = true;
  }

  if (semver.neq(pver, tver)) {
    taskJson.version = {};
    taskJson.version.Major = semver.major(pver);
    taskJson.version.Minor = semver.minor(pver);
    taskJson.version.Patch = semver.patch(pver);
    checkVersions = true;
  }

  if (commands.length < 1) {
    commands.push('npm install -production');
  }

  console.debug(`Commands to add to boot file '${options.bootFile}' (${commands.length} command(s) total):`);
  commands.forEach(command => {
    console.debug(`[${command}]`);
  });

  // #region Define file content of boot file
  var bootJs = `const cp = require('child_process');
const path = require('path');

var logLevel = 'notice';
if (!(process.env['SYSTEM_DEBUG'] == undefined)) {
    logLevel = 'silly';
}
var logLevelParam = \` --loglevel \${logLevel}\`;

console.debug('##vso[task.debug]Available environment variables:');
Object.keys(process.env).forEach(key => {
    console.debug(\`##vso[task.debug]\${key}=\${process.env[key]}\`);
});

var twd = path.resolve('.');
const rwdEnv = 'AGENT_ROOTDIRECTORY';
var rwd = process.env[rwdEnv];
if (!rwd) {
    console.info(\`Environment variable '\${rwdEnv}' could not be found, using current directory as package folder.\`);
} else {
    twd = path.join(rwd, '_tasks', '${name}_${id}', '${pver}');
}

console.log(\`Bootstrapping task '${name}' ...\`);
console.debug(\`##vso[task.debug]node version : \${process.version} (executable: \${process.execPath})\`);
console.debug(\`##vso[task.debug]node cwd     : '\${process.cwd()}'\`);
console.debug(\`##vso[task.debug]task folder  : '\${twd}'\`);

var npmPaths = [];
try {
    cp.execSync(\`npm install npm --no-save\${logLevelParam}\`, { cwd: twd, stdio: 'inherit' });
    npmPaths.push(path.join(twd, 'node_modules', 'npm'));
} catch(err) {
    console.error(\`##vso[task.logissue type=error]\${err.message || err}\`);
}

var npmjsPath = ['node_modules', 'npm', 'lib', 'npm.js'];

var npmPath = cp.execSync('npm config get prefix').toString().trimRight();
if (npmPath && typeof(npmPath) === 'string') {
    npmPath = path.join(npmPath, ...npmjsPath)
    if (!npmPaths.includes(npmPath)) {
        npmPaths.push(npmPath);
    }
}

npmPath = process.env['NPM_CONFIG_PREFIX'];
if (npmPath && typeof(npmPath) === 'string') {
    npmPath = path.join(npmPath, ...npmjsPath);
    if (!npmPaths.includes(npmPath)) {
        npmPaths.push(npmPath);
    }
}

Object.keys(process.env).forEach(key => {
    if (key.toLowerCase() == 'path') {
        process.env[key].split(path.delimiter).forEach(pathSpec => {
            if (pathSpec.endsWith(\`\${path.sep}npm\`)) {
                npmPath = path.join(pathSpec, ...npmjsPath);
                if (!npmPaths.includes(npmPath)) {
                    npmPaths.push(npmPath);
                }
            }
        });
    }
});

console.log(\`Found \${npmPaths.length} path(s) to '\${npmjsPath[npmjsPath.length - 1]}'.\`);

/**@type {import('npm')} */
var npm = null;
var npmPath = '';
for (var i=0; i < npmPaths.length; i++) {
    npmPath = npmPaths[i];
    try {
        console.debug(\`##vso[task.debug]Trying [require('\${npmPath}')] ...\`);
        npm = require(npmPath);
        console.log(\`Successfully loaded '\${npmPath}'.\`);
        break;
    } catch (err) {
        console.debug(\`##vso[task.debug]\${err.message || err}\`);
    }
}

if (!npm) {
    throw Error(\`Module 'npm' could not be loaded.\`);
}

var cwd = process.cwd();
process.chdir(twd);
console.debug(\`##vso[task.debug]npm version : v\${npm.version}\`);
console.debug(\`##vso[task.debug]npm cwd     : '\${process.cwd()}'\`);
console.log(\`initiating package load ...\`);
npm.load({ production: true, loglevel: logLevel, "scripts-prepend-node-path": 'auto' }, function(err) {
    if (err) {
        console.error(\`##vso[task.logissue type=error]\${err.message || err} -> Trying install anyway.\`);
    } else {
        console.log(\`loading completed successfully, scope [\${npm.projectScope}].\`);
    }
  
    npm.on('log', function(message) {
        console.debug(\`##vso[task.debug]progress: \${message}\`);
    });
  
    npm.commands.install(function(err, data) {
        if (err) {
            console.error(\`##vso[task.logissue type=error]\${err.message || err}\`);
        }

        if (data) {
            if (!Array.isArray(data)) {
                data = [ data ];
            }
            data.forEach(element => {
                if (Array.isArray(element)) {
                    element = element.join('\\t');
                }
                console.debug(\`##vso[task.debug]\${element}\`);
            });
        }

        process.chdir(cwd);
        require('${relMain}');
    });
});

console.debug(\`##vso[task.debug]leaving '\${__filename}'\`);
`;
    // #endregion

  console.info(`Creating boot file '${bootJsFile}' in '${options.packagePath}'.`);
  fs.writeFileSync(bootJsFile, bootJs);

  if (checkVersions) {
    if (options.noTaskUpdate) {
      console.info(`Task file '${taskJsonFile}' in '${options.packagePath}' needs to be updated but will remain untouched due to the 'noTaskUpdate' option being set to [${options.noTaskUpdate}].`);
    } else {
      console.info(`Updating task file '${taskJsonFile}' in '${options.packagePath}'.`);
      fs.writeJSONSync(taskJsonFile, taskJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });

      if (!options.vsixPackageFile) {
        options.vsixPackageFile = '../vss-extension.json';
      }
      if (!path.isAbsolute(options.vsixPackageFile)) {
        options.vsixPackageFile = path.resolve(options.packagePath, options.vsixPackageFile);
      }

      tfxVersion({ vsixPackageFile: options.vsixPackageFile, incrementReleaseType: options.incrementReleaseType, consoleOptions: options.consoleOptions });
    }
  }

  console.info(`Finished processing package '${name}' in '${options.packagePath}'.`);
}
// #endregion

// #region tfxVersion
/** @param {TfxVersionOptions} options A `TfxVersionOptions` object. */
function tfxVersion (options) {
  if (!options.vsixPackageFile) {
    options.vsixPackageFile = path.join('.', '..', 'vss-extension.json');
  }
  options.vsixPackageFile = path.resolve(options.vsixPackageFile);

  if (!fs.existsSync(options.vsixPackageFile)) {
    throw Error(`VSIX package file '${options.vsixPackageFile}' could not be found.`);
  }
  console.info(`Processing VSIX package file '${options.vsixPackageFile}'.`);

  if (!options.incrementReleaseType) {
    options.incrementReleaseType = 'patch';
  }

  if (!options.taskFilesName) {
    options.taskFilesName = 'task.json';
  }

  var extensionJson = {};
  /* eslint-disable no-return-assign */
  var publisher = getElement(extensionJson, 'publisher', options.vsixPackageFile, 'Extension', obj => extensionJson = obj);
  var id = getElement(extensionJson, 'id', options.vsixPackageFile, 'Extension', obj => extensionJson = obj);
  var version = getElement(extensionJson, 'version', options.vsixPackageFile, 'Extension', obj => extensionJson = obj);

  var foundVersions = [];
  /** @type {string[]} */
  var taskFiles = require('glob-gitignore').sync(`**/${options.taskFilesName}`, { cwd: path.dirname(options.vsixPackageFile), dot: true, nodir: true, absolute: true, nocase: true });
  taskFiles.forEach(taskFile => {
    var taskJson, taskId, taskVersion;
    try {
      taskId = getElement(taskJson, 'id', taskFile, 'Task', obj => taskJson = obj);
      taskVersion = exports.TaskVersionToString(getElement(taskJson, 'version', taskFile, 'Task', obj => taskJson = obj));
    } catch (err) {
      console.error(err.message);
      return;
    }
    foundVersions.push({ id: taskId, version: taskVersion });
  });
  /* eslint-enable no-return-assign */

  var cacheVersions = [];
  var extensionNeedsUpdate = false;
  var versionNeedsUpdate = false;
  var vsixPackageVersionFile = path.join(path.dirname(options.vsixPackageFile), `${publisher}.${id}-${version}.json`);
  if (fs.existsSync(vsixPackageVersionFile)) {
    cacheVersions = fs.readJSONSync(vsixPackageVersionFile);
  } else {
    cacheVersions = foundVersions;
    versionNeedsUpdate = true;
  }

  var actualVersions = [];
  cacheVersions.forEach(cacheVersion => {
    var foundVersion = foundVersions.filter(foundVersion => foundVersion.id === cacheVersion.id);
    switch (foundVersion.length) {
      case 0:
        console.info(`Task id '${cacheVersion.id}' has been removed from the extension (latest version was [${cacheVersion.version}]).`);
        extensionNeedsUpdate = true;
        break;
      case 1:
        actualVersions.push(foundVersion[0]);
        if (semver.neq(cacheVersion.version, foundVersion[0].version)) {
          console.info(`Version of task '${cacheVersion.id}' has changed ([${cacheVersion.version}] => [${foundVersion[0].version}]).`);
          extensionNeedsUpdate = true;
        } else {
          console.debug(`Version of task '${cacheVersion.id}' hasn't changed ([${cacheVersion.version}] == [${foundVersion[0].version}]).`);
        }
        break;
      default:
        throw Error(`Task id '${cacheVersion.id}' has been found multiple (i.e. ${foundVersion.length}) times! Task Ids must be globally unique. Hopefully, this is a copy & paste issue.`);
    }
  });
  foundVersions.forEach(foundVersion => {
    var cacheVersion = cacheVersions.filter(cacheVersion => cacheVersion.id === foundVersion.id);
    if (cacheVersion.length === 0) {
      console.info(`Task id '${foundVersion.id}' has been added to the extension (with version [${foundVersion.version}]).`);
      actualVersions.push(foundVersion[0]);
      extensionNeedsUpdate = true;
    }
  });

  if (extensionNeedsUpdate) {
    extensionJson.version = semver.inc(version, options.incrementReleaseType);
    console.info(`Incremented extension version from [${version}] to [${extensionJson.version}] ('${options.incrementReleaseType}' increment).`);

    vsixPackageVersionFile = path.join(path.dirname(options.vsixPackageFile), `${publisher}.${id}-${extensionJson.version}.json`);
    versionNeedsUpdate = true;

    fs.writeJSONSync(options.vsixPackageFile, extensionJson, { spaces: 4, encoding: 'utf8', EOL: os.EOL });
    console.info(`Successfully updated VSIX package file '${options.vsixPackageFile}'.`);
  }

  if (versionNeedsUpdate) {
    fs.writeJSONSync(vsixPackageVersionFile, actualVersions, { spaces: 4, encoding: 'utf8', EOL: os.EOL });
    console.info(`Successfully updated VSIX version file '${vsixPackageVersionFile}'.`);
  }

  console.info(`Finished processing VSIX package file '${options.vsixPackageFile}'.`);
}
// #endregion

// #region Exports
/**
 * @param {object} version A `version` object as stored in task files (having
 * `numeric` type `Major`, `Minor` and `Patch` properties).
 * @returns {string} The version as a `string` expression which can be used e.g. to
 * instantiate `SemVer` objects.
 */
exports.TaskVersionToString = (version) => {
  if (!version) {
    throw Error('The \'version\' parameter is required.');
  }

  return `${version.Major}.${version.Minor}.${version.Patch}`;
};

/**
 * @param {string} version A version expression having the format
 * `Major`.`Minor`.`Patch` .
 * @returns { { Major: number, Minor: number, Patch: number} } A `version` object as stored in task files (having
 * `numeric` type `Major`, `Minor` and `Patch` properties).
 */
exports.StringToTaskVersion = (version) => {
  if (!version) {
    throw Error('The \'version\' parameter is required.');
  }

  var versionParts = version.split('.', 4);
  var result = { Major: 0, Minor: 0, Patch: 0 };
  var keys = Object.keys(result);
  for (var i = 0; i < Math.min(versionParts.length, 3); i++) {
    result[keys[i]] = parseInt(versionParts[i]);
  }
  return result;
};

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
};

/** **Deprecated**, use `TfxMkboot2()` instead. */
exports.TfxMkboot = (packagePath, bootFile, consoleOptions, ...commands) => {
  console.warn('Using function TfxMkboot() with signature (packagePath, bootFile, consoleOptions, ...commands) is deprecated and may no longer be supported from the next major version release on. To prepare for the change, use function TfxMkboot2() for the time being');

  consoleOptions = btools.ConsolePushOptions(consoleOptions);
  try {
    tfxMkboot({
      packagePath: packagePath,
      bootFile: bootFile,
      consoleOptions: consoleOptions
    }, ...commands);
  } finally {
    btools.ConsolePopOptions();
  }
};

/**
 * @typedef { { packagePath?: string,
 *              bootFile?: string,
 *              noTaskUpdate?: boolean,
 *              vsixPackageFile?: string,
 *              incrementReleaseType?: import('semver').ReleaseType,
 *              consoleOptions?: import('../index').ConsoleOptions,
 *            }= } TfxMkbootOptions
 */
//
/**
 * @param {TfxMkbootOptions=} options A `TfxMkbootOptions` object:
 *
 * `packagePath` - A path to the package root folder (defaults to `.`).
 *
 * `bootFile` -  Name (without path) of the boot file to create (defaults to
 * `boot.js` if omitted).
 *
 * `noTaskUpdate` - Specifies whether to update the task file automatically. If
 * omitted or set to `false`, the `TfxVersion()` function will be called
 * automatically after updating he task file.
 *
 * `vsixPackageFile` - An absolute or relative path to an extension file
 * (defaults to `../vss-extension.json` if omitted). Only used in calls of
 * `TfxVersion()` after the task file has eventually been updated (see
 * `noTaskUpdate` above). If `vsixPackageFile` is specified as a relative path,
 * it will be expanded to an absolute path taking `packagePath` as the 'from'
 * location.
 *
 * `incrementReleaseType` - The release type to use for incrementing the
 * extension version (defaults to `patch` if omitted). Only used in calls of
 * `TfxVersion()` after the task file has eventually been updated (see
 * `noTaskUpdate` above).
 *
 * `consoleOptions` - A `ConsoleOptions` object.
 * @param {string[]} commands The commands to run in the package folder
 * (defaults to a single command `npm install -production` if omitted).
 */
exports.TfxMkboot2 = (options, ...commands) => {
  if (!options) { options = {}; }

  options.consoleOptions = btools.ConsolePushOptions(options.consoleOptions);
  try {
    tfxMkboot(options, ...commands);
  } finally {
    btools.ConsolePopOptions();
  }
};

/**
 * @typedef { { vsixPackageFile?: string,
 *              taskFilesName?: string,
 *              incrementReleaseType?: import('semver').ReleaseType,
 *              consoleOptions?: import('../index').ConsoleOptions,
 *            }= } TfxVersionOptions
 */
//
/**
 * Searches for task files (i.e. files having the name specified in
 * `taskFilesName`) in all subfolders of the extension folder (i.e. the folder
 * `vsixPackageFile` resides in), and checks if the version of any task has
 * changed (by using a cache file having the same base name as the (version
 * dependent) VSIX files `tfx extension create` would generate, but with a
 * `.json` file extension). If any task version change is detected, the
 * extension version will be incremented as specified in `incrementReleaseType`,
 * and the extension file `vsixPackageFile` will be saved with the incremented
 * extension version specification.
 * @param {TfxVersionOptions=} options A `TfxVersionOptions` object:
 *
 * `vsixPackageFile` - The VSIX package file to process (defaults to
 * `../vss-extension.json` if omitted).
 *
 * `taskFilesName` - The name of the task files to search for (defaults to
 * `task.json` if omitted).
 *
 * `incrementReleaseType` - The release type to use for incrementing the
 * extension version (defaults to `patch` if omitted).
 *
 * `consoleOptions` - A `ConsoleOptions` object.
 */
exports.TfxVersion = (options) => {
  if (!options) { options = {}; }

  options.consoleOptions = btools.ConsolePushOptions(options.consoleOptions);
  try {
    tfxVersion(options);
  } finally {
    btools.ConsolePopOptions();
  }
};
// #endregion
