const cp = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const vc = require('./vc-utils');
require('../index');

function getGitCommits(pathSpec, customCommand) {
    if (!customCommand) {
        customCommand = `--no-pager show --name-status --format=%cd --date=iso-strict -n 2147483647 -- "${pathSpec}"`;
    }

    var command = `git ${customCommand}`;
    var result = cp.execSync(command).toString().trim();
    console.debug(`Command [${command}] returned:\n${result}`);
    if (!result) {
        return [];
    } else {
        var resultArr = result.split('\n').filter(line => {
            // @ts-ignore
            return (line.length > 0 && !line.isWhitespace());
        });
        var history = [], statusLine = [];
        var historyEntry = null, statusEntry = null;
        resultArr.forEach(line => {
            var timestamp = Date.parse(line);
            if (!isNaN(timestamp)) {
                if (historyEntry) {
                    history.push(historyEntry);
                }
                historyEntry = new vc.HistoryEntry(timestamp);
            } else {
                if (!historyEntry) {
                    throw Error(`Unable to parse result:\n${resultArr.join('\n')}`);
                }
                statusLine = line.split('\t', 2);
                statusEntry = new vc.StatusEntry(statusLine[0], statusLine[1]);
                historyEntry.StatusEntries.push(statusEntry);

                switch (statusEntry.Status) {
                    case 'A':
                    case 'M':
                    case 'D':
                    case "MM":
                        break;
                    // case 'R':
                    //     // check what that would mean for the file or folder specified in 'path'
                    //     // and e.g. set status accordingly ... ?
                    //     statusLine = statusLine[1].split(' --> ');
                    //     break;
                    default:
                        throw Error(`Unsuppoted status code '${statusEntry.Status}'.`);
                }
            }
        });
        if (historyEntry) {
            history.push(historyEntry);
        }

        return history;
    }
}

function getGitChanges(pathSpec, customCommand) {
    if (!customCommand) {
        customCommand = `--no-pager diff --name-status -- "${pathSpec}"`;
    }

    var command = `git ${customCommand}`;
    var result = cp.execSync(command).toString().trim();
    console.debug(`Command [${command}] returned:\n${result}`);
    if (!result) {
        return [];
    } else {
        var resultArr = result.split('\n').filter(line => {
            // @ts-ignore
            return (line.length > 0 && !line.isWhitespace());
        });
        var history = [], statusLine = [];
        var historyEntry = null, statusEntry = null;
        resultArr.forEach(line => {
            statusLine = line.split('\t', 2);
            statusEntry = new vc.StatusEntry(statusLine[0], statusLine[1]);

            var statusFile = path.resolve(statusEntry.File);
            var mtime = Math.round(fs.existsSync(statusFile)
                ? fs.lstatSync(statusFile).mtimeMs
                : Date.now()
            );
            historyEntry = history.find(entry => entry.Timestamp == mtime);
            if (!historyEntry) {
                historyEntry = new vc.HistoryEntry(mtime);
                history.push(historyEntry);
            }

            historyEntry.StatusEntries.push(statusEntry);
        });

        return history;
    }
}

function getGitStages(pathSpec, customCommand) {
    if (!customCommand) {
        customCommand = `--no-pager diff --name-status --cached -- "${pathSpec}"`;
    }

    return getGitChanges(pathSpec, customCommand);
}

function getGitUntracked(pathSpec, customCommand) {
    if (!customCommand) {
        customCommand = `--no-pager ls-files -o --exclude-standard -- "${pathSpec}"`;
    }

    var command = `git ${customCommand}`;
    var result = cp.execSync(command).toString().trim();
    console.debug(`Command [${command}] returned:\n${result}`);
    if (!result) {
        return [];
    } else {
        var resultArr = result.split('\n').filter(line => {
            // @ts-ignore
            return (line.length > 0 && !line.isWhitespace());
        });
        var history = [];
        var historyEntry = null, statusEntry = null;
        resultArr.forEach(line => {
            statusEntry = new vc.StatusEntry('U', line);

            var mtime = Math.round(fs.lstatSync(path.resolve(statusEntry.File)).mtimeMs);
            historyEntry = history.find(entry => entry.Timestamp == mtime);
            if (!historyEntry) {
                historyEntry = new vc.HistoryEntry(mtime);
                history.push(historyEntry);
            }

            historyEntry.StatusEntries.push(statusEntry);
        });

        return history;
    }
}

/**
 * @param {string} pathSpec Relative or absolute path to a file ord folder
 * - It doesn't matter if the file or folder exists locally
 * @returns {vc.HistoryEntry[]} A list of all changes that apply to the path specification.
 * 
 * ---
 * CAUTION:
 * - `git` needs to be installed to use this function, and the specified `pathSpec` **must** be a git repo!
 * Otherwise, calling this function will `throw` an `Error`!
 * - Currently supported status codes for *commits* are limited to
 *  - `A`, `M`, `D` and `MM`
 * - Each other status code retrieved from `git` output other than the above-mentioned
 * will `throw` an `Error` object. This is to avoid unexpected results and due to 
 * not having tested every single case (like `R`, which can mean a *removal* for one file
 * while being an *addition* or *modification* for another file).
 */
exports.GetGitHistory = function GetGitHistory(pathSpec) {
    var commits   = getGitCommits(pathSpec);
    var changes   = getGitChanges(pathSpec);
    var stages    = getGitStages(pathSpec);
    var untracked = getGitUntracked(pathSpec);

    return commits.concat(changes).concat(stages).concat(untracked);
}
