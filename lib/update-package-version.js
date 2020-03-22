const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');

/**
 * @typedef {import('semver').ReleaseType} ReleaseType
 */

/**
 * @param {string} packagePath A path to the package root folder.
 * @param {ReleaseType} releaseType The part of the version to increment.
 */
exports.UpdatePackageVersion = function UpdatePackageVersion (packagePath, releaseType) {
  if (!packagePath) {
    throw Error('Parameter \'packagePath\' is mandatory.');
  }

  if (!releaseType) {
    throw Error('Parameter \'releaseType\' is mandatory.');
  }

  var packageFile = path.resolve(packagePath, 'package.json');
  if (!fs.existsSync(packageFile)) {
    throw Error(`Package file '${packageFile}' could not be found.`);
  }
  console.info(`Updating version of package file '${packageFile}'.`);

  var packageJson = fs.readJSONSync(packageFile);
  var packageVersion = packageJson.version;
  packageJson.version = semver.inc(packageVersion, releaseType);

  if (packageJson.version != null) {
    fs.writeJSONSync(packageFile, packageJson, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
    console.info(`Successfully updated ${releaseType} of version from [${packageVersion}] to [${packageJson.version}] in '${packageFile}'.`);
  } else {
    console.error(`Failed to update ${releaseType} of version [${packageVersion}] in '${packageFile}'.`);
  }
};

/**
 * @param {string} releaseType The part of the version to increment.
 * @returns {ReleaseType}
 */
exports.ReleaseType = function ReleaseType (releaseType) {
  // @ts-ignore
  return releaseType;
};
