const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

/**
 * @class
 */
exports.VersionControlProviders = class {
  constructor () {
    this.git = false;
    this.tfs = false;
  }
};

exports.HistoryEntry = class HistoryEntry {
  constructor (timestamp) {
    this.Date = new Date(timestamp);
    this.Timestamp = timestamp;
    this.StatusEntries = [];
  }
};

exports.StatusEntry = class StatusEntry {
  constructor (status, file) {
    this.Status = status.toUpperCase();
    this.File = file;
  }
};

/**
 * @returns {string[]} A list containing the names of all version control
 * providers that are (at least partially) supported by this module.
 */
exports.SupportedVersionControlProviders = () => {
  return Object.keys(new this.VersionControlProviders());
};

/**
 * @param {string=} packagePath A path to the package root folder (defaults to `.`).
 * @returns {exports.VersionControlProviders} A `VersionControlProviders` object
 * having the corresponding properties set to `true` for each version control
 * provider found in `packagePath`.
 */
exports.GetVersionControlProviders = (packagePath) => {
  if (!(typeof (packagePath) === 'string') || !packagePath) {
    packagePath = '.';
  }
  packagePath = path.resolve(packagePath);

  var result = new this.VersionControlProviders();

  var gitDir = path.join(packagePath, '.git');
  if (fs.existsSync(gitDir) && fs.lstatSync(gitDir).isDirectory()) {
    result.git = true;
  }

  var tfsExtensions = ['*.vspscc', '*.vssscc'];
  if (glob.sync(`*(${tfsExtensions.join('|')})`, { cwd: packagePath }).length > 0) {
    result.tfs = true;
  }

  return result;
};

/**
 * @param {string=} packagePath A path to the package root folder (defaults to `.`).
 * @returns {string} The name of the version control provider, or `undefined` if
 * no provider has been found in `packagePath`.
 * @throws An `Error` if more than one provider has been found.
 */
exports.GetVersionControlProvider = (packagePath) => {
  var providers = this.GetVersionControlProviders(packagePath);

  var result = Object.keys(providers).filter(value => providers[value] === true);

  switch (result.length) {
    case 0:
      return undefined;
    case 1:
      return result[0];
    default:
      throw Error(`Found multiple providers (${result.length} total): [ ${result.join(', ')} ].`);
  }
};

/**
 * @param {string} pathSpec
 * @param {string=} packagePath A path to the package root folder (defaults to `.`).
 */
exports.GetHistory = (pathSpec, packagePath) => {
  var provider = exports.GetVersionControlProvider(packagePath);
  switch (provider) {
    case 'git':
      return require('./vc-git-utils').GetGitHistory(pathSpec);
    default:
      console.warn(`GetHistory() is not supported for provider [${provider}].`);
      return [];
  }
};

/**
 * @param {string} pathSpec Relative or absolute path to a file ord folder
 * - It doesn't matter if the file or folder exists locally
 * @param  {string[]=} excludeStatusCodes A list of status codes to enforce
 * returning `NaN` for.
 * - This is e.g. useful to return `NaN` if the requested file or folder has
 * been removed from the index (i.e. deleted from the repository).
 * @param {string[]=} ignoreStatusCodes A list of status code to ignore while
 * iterating through the change history.
 * @returns {number} the timestamp of the most recent change for a file or
 * folder.
 * - The return value represents the number of milliseconds since the begin of
 * the UNIX epoch (1970-01-01 00:00:00 UTC).
 * - If
 *  - `path` isn't found in the index, or
 *  - hasn't (yet) had a commit, or
 *  - if it's last status code is included in the `excludeStatusCodes` parameter,
 *
 *  `NaN` ist returned.
 * - See further information in the documentation of`Date.parse()`!
 */
exports.GetLastChange = (pathSpec, excludeStatusCodes, ignoreStatusCodes) => {
  if (!pathSpec || !(typeof (pathSpec) === 'string')) {
    throw Error(`'${pathSpec}' is not a valid path specification for parameter 'pathSpec'.`);
  }

  if (!excludeStatusCodes) {
    excludeStatusCodes = [];
  } else {
    if (!Array.isArray(excludeStatusCodes)) { excludeStatusCodes = [excludeStatusCodes]; }
  }

  if (!ignoreStatusCodes) {
    ignoreStatusCodes = [];
  } else {
    if (!Array.isArray(ignoreStatusCodes)) { ignoreStatusCodes = [ignoreStatusCodes]; }
  }

  var history = this.GetHistory(pathSpec);

  if (history.length < 1) {
    return NaN;
  }

  history = history.sort((a, b) => {
    return b.Timestamp - a.Timestamp;
  });

  for (let h = 0; h < history.length; h++) {
    var historyEntry = history[h];
    for (let s = 0; s < historyEntry.StatusEntries.length; s++) {
      var statusEntry = historyEntry.StatusEntries[s];
      if (excludeStatusCodes.includes(statusEntry.Status)) { return NaN; }
      if (!ignoreStatusCodes.includes(statusEntry.Status)) { return historyEntry.Timestamp; }
    }
  }

  return NaN;
};
