const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const btools = require('../index');

exports.CleanPackageElements = function CleanPackageElements (packagePath, ...elements) {
  if (!packagePath) {
    throw Error('Parameter \'packagePath\' is mandatory.');
  }

  if (elements.length < 1) {
    throw Error('There are no specifications in the \'elements\' parameter.');
  }

  var packageFile = path.resolve(packagePath, 'package.json');
  if (!fs.existsSync(packageFile)) {
    throw Error(`Package file '${packageFile}' could not be found.`);
  }
  console.info(`Cleaning up package file '${packageFile}'.`);

  function removeElement (object, elementPath, element) {
    if (!element) {
      element = elementPath;
      elementPath = '';
    } else {
      elementPath = `${elementPath}.`;
    }

    var elements = element.split('.', 2);
    elementPath = `${elementPath}${elements[0]}`;
    var json = object[elements[0]];
    if (json !== undefined) {
      if (elements.length > 1) {
        removeElement(json, elementPath, elements[1]);
      } else {
        console.info(`Removing element '${elementPath}'.`);
        delete object[elements[0]];
      }
    } else {
      console.info(`Element '${elementPath}' doesn't exist.`);
    }
  }

  var packageJson = fs.readJSONSync(packageFile);
  elements.forEach(element => {
    removeElement(packageJson, element);
  });

  fs.writeJSONSync(packageFile, packageJson, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
  console.info(`Successfully cleaned up '${packageFile}'.`);
};

var packagePath = process.env.npm_postpack_dir;
if (packagePath !== undefined) {
  this.CleanPackageElements(packagePath, ...btools.SliceArgv(process.argv, __filename));
}
