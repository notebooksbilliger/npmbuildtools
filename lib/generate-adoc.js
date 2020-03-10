const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const vc = require('./vc-utils');

function resolveIncludes(includeRootSourcePath, ...lines) {
    var regExp = `include::.+?\\[.*?\\]`;
    var regGrp = `include::(.+?)\\[(.*?)\\]`;
    var rdOpts = { encoding: 'utf8' }
    var result = [];
    lines.forEach(line => {
        if (typeof(line) === 'string') {
            var matches = line.match(regExp);
            if (matches) {
                while (matches) {
                    matches.forEach(match => {
                        parts = match.match(regGrp);
                        if (parts.length == 3 || parts[0] != match) {
                            var includeFile = path.resolve(includeRootSourcePath, parts[1]);
                            if (fs.existsSync(includeFile)) {
                                var includeLines = readLinesSync(includeFile, rdOpts);
                                result = result.concat(resolveIncludes(path.dirname(includeFile), ...includeLines));
                            } else {
                                console.error(`Include file '${includeFile}' could not be found.`);
                            }
                        } else {
                            throw Error(`AsciiDoc syntax error in '${match}'.`);
                        }
                        line = line.replace(match, '');
                    });
                    matches = line.match(regExp);
                }
            } else {
                result.push(line);
            }
        } else {
            result.push(line);
        }
    });
    return result;
}

function resolve(includeRootSourcePath, EOL, ...lines) {
    var result = lines;

    result = resolveIncludes(includeRootSourcePath, ...result);

    return result.join(EOL);
}

function getAttribute(attributeName, ...lines) {
    var searchString = `:${attributeName}: `;
    var attrs = lines.filter(line => {
        if (typeof(line) === 'string') {
            return line.startsWith(searchString);
        }
    });

    switch (attrs.length) {
        case 0:
            return undefined;
        case 1:
            return attrs[0].substr(searchString.length);
        default:
            throw Error(`Attribute '${attributeName}' has been defined multiple times.`);
    }
}

function readLinesSync(path, options) {
    if (!options) {
        options = { encoding: 'utf8' }
    }

    var result = fs.readFileSync(path, options).split('\n');
    for (var i = 0; i < result.length; i++) {
        result[i] = result[i].trimRight();
    }
    return result;
}

exports.GenerateReadmeOptions = class GenerateReadmeOptions {
    constructor() {
        this.EOL = os.EOL;
        this.updateTimestamp = false;
        this.noPackageJsonUpdate = false;
        this.dependencyType = '';
    }
}

/**
 * @param {string=} packagePath Defaults to `.`
 * @param {string=} readmeFileName Defaults to `README.adoc`
 * @param {GenerateReadmeOptions=} options A `GenerateReadmeOptions` object
 */
exports.GenerateReadme = function GenerateReadme(packagePath, readmeFileName, options) {
    if (!options) {
        options = new exports.GenerateReadmeOptions();
    }
    if (!options.EOL) {
        options.EOL = os.EOL;
    }

    if (!packagePath) {
        packagePath = '.';
    }
    packagePath = path.resolve(packagePath);

    if (!readmeFileName) {
        readmeFileName = 'README.adoc';
    }
    console.log(`Creating/Updating file '${readmeFileName}'.`);

    var packageJsonFile = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonFile)) {
        throw Error(`Packge file '${packageJsonFile}' could not be found.`);
    }
    const package_json = require(packageJsonFile);
    var package_json_needsUpdate = false;

    var adocOld = [];
    var readmeFile = path.join(packagePath, readmeFileName);
    var readmeStat = undefined;
    if (fs.existsSync(readmeFile)) {
        readmeStat = fs.lstatSync(readmeFile);
        adocOld = readLinesSync(readmeFile);
    }

    var docFolder;
    try {
        docFolder = package_json['directories']['doc'];
    } catch(err) {
        docFolder = './doc';
    }
    docFolder = path.resolve(packagePath, docFolder);
    if (!fs.existsSync(docFolder)) {
        fs.ensureDirSync(docFolder);
    }

    var readmeBodyFile = path.join(docFolder, 'readme-body.atpl');
    var readmeBodyStat = undefined;
    if (fs.existsSync(readmeBodyFile)) {
        readmeBodyStat = fs.lstatSync(readmeBodyFile);
    } else {
        console.warn(`There was no body file found ('${readmeBodyFile}').`);
    }

    var value, adoc = [], adocTxt = [ '' ];
    value = package_json['name'];
    if (value == undefined) {
        value = path.basename(path.dirname(packagePath));
    } else {
        value = value.split('/', 2);
        value = value[value.length -1]
    }
    adoc.push(value);
    adoc.push('='.repeat(value.length));

    function match(regExp, value) {
        var match = new RegExp(regExp).exec(value) || [];
        if (match.length < 1) {return undefined;}
        return match[0].toString().trim();
    }
    var authorName, authorEmail, authorUrl
    value = package_json['author'];
    if (value != undefined) {
        if (typeof(value) === 'string') {
            authorEmail = match('<.*>', value);
            if (authorEmail != undefined) {
                value = value.replace(new RegExp(authorEmail), '');
            }
            authorUrl = match('\\(.*\\)', value);
            if (authorUrl != undefined) {
                value = value.replace(new RegExp(authorUrl), '');
                value = value.replace(/\(|\)/g, '');
                authorUrl = authorUrl.replace(/\(|\)/g, '').trim();
            }
            authorName = value.trim();
        } else {
            authorName = value['name'];
            authorEmail = value['email'];
            authorUrl = value['url'];
        }
        if (authorName) {
            adoc.push(`:Author: ${authorName}`);
        }
        if (authorEmail) {
            adoc.push(`:Email: ${authorEmail}`);
        }
        if (authorUrl) {
            adoc.push(`:AuthorUrl: ${authorUrl}`);
        }
    }

    if (options.updateTimestamp) {
        value = vc.GetLastChange(readmeBodyFile, ['D'], ['MM']);
        if (!isNaN(value)) {
            value = new Date(value);
            console.debug(`Using timestamp of last commit of '${readmeBodyFile}': ${value.toString()}`);
        } else {
            value = vc.GetLastChange(readmeFile, ['D'], ['MM']);
            if (!isNaN(value)) {
                value = new Date(value);
                console.debug(`Using timestamp of last commit of '${readmeFile}': ${value.toString()}`);
            } else {
                if (readmeBodyStat) {
                    value = readmeBodyStat.mtime;
                    console.debug(`Using timestamp of last modification of '${readmeBodyFile}': ${value.toString()}`);
                } else {
                    if (readmeStat) {
                        value = readmeStat.mtime;
                        console.debug(`Using timestamp of last modification of '${readmeFile}': ${value.toString()}`);
                    } else {
                        value = new Date();
                        console.debug(`Defaulting to timestamp of current 'Date()': ${value.toString()}`);
                    }
                }
            }
        }
    } else {
        value = getAttribute('Date', ...adocOld);
        if (!isNaN(Date.parse(value))) {
            value = new Date(value);
        } else {
            value = new Date();
        }
    }
    adoc.push(`:Date: ${value.getUTCFullYear()}-${(value.getUTCMonth() + 1).toString().padStart(2, '0')}-${value.getUTCDate().toString().padStart(2, '0')}`);

    value = package_json['version'];
    if (value != undefined) {
        adoc.push(`:Revision: ${value}`);
        adocTxt.push(`- Version {revision}`);
    }

    value = package_json['license'];
    if (value != undefined) {
        adoc.push(`:License: ${value}`);
        adocTxt.push(`- Licensed under the {license} license.`);
    }

    value = package_json['description'];
    if (value != undefined) {
        adocTxt.push('');
        adocTxt.push(value);
    }

    if (options.dependencyType != 'none') {
        adocTxt.push('');
        adocTxt.push('Installation');
        adocTxt.push('------------');
        adocTxt.push('[source,bash]');
        adocTxt.push('----');

        switch (`${options.dependencyType}`.toLowerCase()) {
            case 'global':
                adocTxt.push(`npm install "${package_json['name']}" -g`);
                break;
            case 'dev':
                adocTxt.push(`npm install "${package_json['name']}" -D`);
                break;
            case 'opt':
                adocTxt.push(`npm install "${package_json['name']}" -O`);
                break;
            default: // regular
                adocTxt.push(`npm install "${package_json['name']}"`);
                break;
        }

        adocTxt.push('----');
    }

    fs.writeFileSync(readmeFile, resolve(path.dirname(readmeFile), options.EOL, ...adoc), { encoding: 'utf8' });
    fs.appendFileSync(readmeFile, options.EOL.repeat(1), { encoding: 'utf8' });
    fs.appendFileSync(readmeFile, resolve(path.dirname(readmeFile), options.EOL, ...adocTxt), { encoding: 'utf8' });

    if (readmeBodyStat) {
        var readmeBody = readLinesSync(readmeBodyFile, { encoding: 'utf8' });
        fs.appendFileSync(readmeFile, options.EOL.repeat(2), { encoding: 'utf8' });
        fs.appendFileSync(readmeFile, resolve(path.dirname(readmeBodyFile), options.EOL, ...readmeBody), { encoding: 'utf8' });
    }

    console.log(`Successfully updated readme file '${readmeFile}'.`);

    var readmeElement = 'readme';
    var relPath = path.relative(packagePath, readmeFile);
    if (package_json[readmeElement] != relPath) {
        console.debug(`Setting "${readmeElement}" element from [${package_json[readmeElement]}] to [${relPath}] in package object.`);
        package_json[readmeElement]  = relPath;
        package_json_needsUpdate = true;
    }
    
    if (package_json_needsUpdate) {
        if (!options.noPackageJsonUpdate) {
            fs.writeJSONSync(packageJsonFile, package_json, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
            console.log(`Successfully updated package file '${packageJsonFile}'.`);
        } else {
            console.warn(`File '${packageJsonFile}' needs an update, but options.noPackageJsonUpdate has been set to [${options.noPackageJsonUpdate}].`);
        }
    }
}

exports.Resolve = function Resolve(includeRootSourcePath, EOL, ...lines) {
    if (!includeRootSourcePath || !fs.existsSync(includeRootSourcePath) || !fs.lstatSync(includeRootSourcePath).isDirectory()) {
        throw Error(`The the root source path for include files '${includeRootSourcePath}' is not a directory.`);
    }
    if (!(typeof(EOL) === 'string')) {
        throw Error(`The 'EOL' parameter is not a string.`);
    }
    if (!lines || !Array.isArray(lines)) {
        throw Error(`The 'lines' parameter is not an array.`);
    }

    return resolve(includeRootSourcePath, EOL, ...lines);
}

exports.ResolveIncludes = function ResolveIncludes(includeRootSourcePath, ...lines) {
    if (!includeRootSourcePath, !fs.existsSync(includeRootSourcePath) || !fs.lstatSync(includeRootSourcePath).isDirectory()) {
        throw Error(`The root source path for include files '${includeRootSourcePath}' is not a directory.`);
    }

    return resolveIncludes(includeRootSourcePath, ...lines);
}

exports.GetAttribute = function GetAttribute(attributeName, ...lines) {
    if (!(typeof(attributeName) === 'string')) {
        throw Error(`The 'attributeName' parameter is not a string.`);
    }

    return getAttribute(attributeName, ...lines);
}
