var versionControlSystem = 'git';

exports.HistoryEntry = class HistoryEntry {
    constructor(timestamp) {
        this.Date = new Date(timestamp);
        this.Timestamp = timestamp;
        this.StatusEntries = [];
    }
}

exports.StatusEntry = class StatusEntry {
    constructor(status, file) {
        this.Status = status.toUpperCase();
        this.File = file;
    }
}

/**
 * @param {string} pathSpec
 */
exports.GetHistory = function GetHistory(pathSpec) {
    switch (versionControlSystem) {
        case 'git':
            return require('./vc-git-utils').GetGitHistory(pathSpec);
        default:
            return [];
    }
}

/**
 * @param {string} pathSpec Relative or absolute path to a file ord folder
 * - It doesn't matter if the file or folder exists locally
 * @param  {string[]} excludeStatusCodes A list of status codes to enforce returning `NaN` for
 * - This is e.g. useful to return `NaN` if the requested file or folder has been removed
 * from the index (i.e. deleted from the repo).
 * @param {string[]} ignoreStatusCodes A list of status code to ignore while iterating
 * through the change history.
 * @returns {number} the timestamp of the most recent change for a file or folder.
 * - The return value represents the number of milliseconds since 1970-01-01 00:00:00.
 * - If
 *  - `path` isn't found in the index, or 
 *  - hasn't (yet) had a commit, or
 *  - if it's last status code is included in the `excludeStatusCodes` parameter,
 * 
 *  `NaN` ist returned.
 * - See further information in the documentation of`Date.parse()`!
 */
exports.GetLastChange = function GetLastChange(pathSpec, excludeStatusCodes, ignoreStatusCodes) {
    if (!pathSpec || !(typeof(pathSpec) === 'string')) {
        throw Error(`'${pathSpec}' is not a valid path specification for parameter 'pathSpec'.`);
    }

    if (!excludeStatusCodes) {
        excludeStatusCodes = [];
    } else {
        if (!Array.isArray(excludeStatusCodes)) { [ excludeStatusCodes ] }
    }

    if (!ignoreStatusCodes) {
        ignoreStatusCodes = [];
    } else {
        if (!Array.isArray(ignoreStatusCodes)) { [ ignoreStatusCodes ] }
    }
    
    var history = this.GetHistory(pathSpec);

    if (history.length < 1) {
        return NaN;
    }

    history = history.sort((a, b) => {
        return b.Timestamp - a.Timestamp;
    });

    for (let h = 0; h < history.length; h++) {
        historyEntry = history[h];
        for (let s = 0; s < historyEntry.StatusEntries.length; s++) {
            statusEntry = historyEntry.StatusEntries[s];
            if (excludeStatusCodes.includes(statusEntry.Status)) { return NaN; }
            if (!ignoreStatusCodes.includes(statusEntry.Status)) { return historyEntry.Timestamp; }
        }
    }

    return NaN;
}