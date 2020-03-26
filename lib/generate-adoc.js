/** @module adoc */

const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const vc = require('./vc-utils');

// #region Type definitions
/** @typedef {'adoc'|'xml'|'md'} GenerateReadmeFormat */
/** @typedef {'regular'|'none'|'global'|'dev'|'opt'} GenerateReadmeDependencyType */

/** @typedef {object} GenerateReadmeOptions
 * @property {string=} EOL The line separator to use (defaults to `os.EOL` if
 * omitted).
 * @property {boolean=} updateTimestamp Controls whether to update the date
 * specification in the output document (i.e. the asciidoc `Date` attribute,
 * which might be resolved and translated when saving in a different format).
 * @property {boolean=} noPackageJsonUpdate Controls whether to update the
 * package file (e.g. with the path of the generated document in the `readme`
 * element).
 * @property {GenerateReadmeDependencyType=} dependencyType Controls the
 * rendering of the `npm install` command in the Installation block (defaults
 * to `regular` if omitted).
 * @property {GenerateReadmeFormat=} outputFormat The format to use for saving
 * the generated file (defaults to `adoc` if omitted).
 */
// #endregion

function resolveAttributes (attributes, ...lines) {
  var result = [];

  attributes = getAttributes(attributes, ...lines);
  lines.forEach(line => {
    var newLine = line;
    Object.keys(attributes).forEach(attribute => {
      newLine = newLine.replace(new RegExp(`\\{${attribute}\\}`, 'gi'), attributes[attribute]);
    });

    result.push(newLine);
  });

  return result;
}

function resolveIncludes (includeRootSourcePath, ...lines) {
  var regExp = 'include::.+?\\[.*?\\]';
  var regGrp = 'include::(.+?)\\[(.*?)\\]';
  var rdOpts = { encoding: 'utf8' };
  var result = [];
  lines.forEach(line => {
    if (typeof (line) === 'string') {
      var matches = line.match(regExp);
      if (matches) {
        while (matches) {
          matches.forEach(match => {
            var parts = match.match(regGrp);
            if (parts.length === 3 || parts[0] !== match) {
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

function resolve (options, ...lines) {
  options = options || {};

  var includeRootSourcePath = options.includeRootSourcePath;
  var EOL = options.EOL;
  var attributes = options.attributes;
  var result = lines;

  result = resolveAttributes(attributes, ...result);
  result = resolveIncludes(includeRootSourcePath, ...result);

  return result.join(EOL);
}

function getAttribute (attributeName, ...lines) {
  var searchString = `:${attributeName}: `;
  var attrs = lines.filter(line => {
    if (typeof (line) === 'string') {
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

function getAttributes (attributes, ...lines) {
  if (!attributes) {
    attributes = {};
  }

  var regExp = '^:(.+): (.+)';
  var result = attributes;
  lines.forEach(line => {
    var matches = line.match(regExp);
    if (matches) {
      if (matches.length >= 3) {
        result[matches[1]] = matches[2];
      } else {
        console.warn(`Malformatted attribute line: ${line}`);
      }
    }
  });
  return result;
}

/**
 * @param {string} file The file to read from.
 * @param {{ encoding?: string, flag?: string }=} options Read options.
 * @returns {string[]} An array of lines read from `file`.
 */
function readLinesSync (file, options) {
  if (!options) {
    options = { encoding: 'utf8' };
  }

  var result = `${fs.readFileSync(file, options)}`.split('\n');
  for (var i = 0; i < result.length; i++) {
    result[i] = result[i].trimRight();
  }
  return result;
}

/**
 * @param {GenerateReadmeOptions} options The
 * {@link module:adoc~GenerateReadmeOptions} object to initialize.
 * @returns {GenerateReadmeOptions} A safeguarded
 * {@link module:adoc~GenerateReadmeOptions} object.
 */
function initOptions (options) {
  options = options || {};

  options.EOL = options.EOL || os.EOL;
  options.updateTimestamp = options.updateTimestamp || false;
  options.noPackageJsonUpdate = options.noPackageJsonUpdate || false;
  options.dependencyType = options.dependencyType || 'regular';
  options.outputFormat = options.outputFormat || 'adoc';

  return options;
}

/**
 * @param {string=} packagePath A path to the package root folder (defaults to `.`).
 * @param {string=} readmeBasename The base file name of the Readme file to
 * create (defaults to `README` if omitted). If a file extension is provided, it
 * will be stripped off and reset depending on the format specified in
 * `options.outputFormat`.
 * @param {GenerateReadmeOptions=} options A `GenerateReadmeOptions` object
 */
exports.GenerateReadme = (packagePath, readmeBasename, options) => {
  options = initOptions(options);

  if (!packagePath) {
    packagePath = '.';
  }
  packagePath = path.resolve(packagePath);

  if (!readmeBasename) {
    readmeBasename = 'README';
  }

  var readmeFileName = path.basename(readmeBasename, path.extname(readmeBasename)) + '.' + options.outputFormat;
  console.info(`Creating/Updating file '${readmeFileName}'.`);

  var packageJsonFile = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonFile)) {
    throw Error(`Packge file '${packageJsonFile}' could not be found.`);
  }
  const packageJson = require(packageJsonFile);
  var packageJsonNeedsUpdate = false;

  var adocOld = [];
  var readmeFile = path.join(packagePath, readmeFileName);
  var readmeStat;
  if (fs.existsSync(readmeFile)) {
    readmeStat = fs.lstatSync(readmeFile);
    adocOld = readLinesSync(readmeFile);
  }

  var docFolder;
  try {
    docFolder = packageJson.directories.doc;
  } catch (err) {
    docFolder = './doc';
  }
  docFolder = path.resolve(packagePath, docFolder);
  if (!fs.existsSync(docFolder)) {
    fs.ensureDirSync(docFolder);
  }

  var readmeBodyFile = path.join(docFolder, 'readme-body.atpl');
  var readmeBodyStat;
  if (fs.existsSync(readmeBodyFile)) {
    readmeBodyStat = fs.lstatSync(readmeBodyFile);
  } else {
    console.warn(`There was no body file found ('${readmeBodyFile}').`);
  }

  var value;
  var adoc = [];
  var adocTxt = [''];
  value = packageJson.name;
  if (value === undefined) {
    value = path.basename(path.dirname(packagePath));
  } else {
    value = value.split('/', 2);
    value = value[value.length - 1];
  }
  adoc.push(value);
  adoc.push('='.repeat(value.length));

  function match (regExp, value) {
    var match = new RegExp(regExp).exec(value) || [];
    if (match.length < 1) { return undefined; }
    return match[0].toString().trim();
  }
  var authorName, authorEmail, authorUrl;
  value = packageJson.author;
  if (value !== undefined) {
    if (typeof (value) === 'string') {
      authorEmail = match('<.*>', value);
      if (authorEmail !== undefined) {
        value = value.replace(new RegExp(authorEmail), '');
      }
      authorUrl = match('\\(.*\\)', value);
      if (authorUrl !== undefined) {
        value = value.replace(new RegExp(authorUrl), '');
        value = value.replace(/\(|\)/g, '');
        authorUrl = authorUrl.replace(/\(|\)/g, '').trim();
      }
      authorName = value.trim();
    } else {
      authorName = value.name;
      authorEmail = value.email;
      authorUrl = value.url;
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

  value = packageJson.version;
  if (value !== undefined) {
    adoc.push(`:Revision: ${value}`);
    adocTxt.push('- Version {revision}');
  }

  value = packageJson.license;
  if (value !== undefined) {
    adoc.push(`:License: ${value}`);
    adocTxt.push('- Licensed under the {license} license.');
  }

  value = packageJson.description;
  if (value !== undefined) {
    adocTxt.push('');
    adocTxt.push(value);
  }

  if (options.dependencyType !== 'none') {
    adocTxt.push('');
    adocTxt.push('Installation');
    adocTxt.push('------------');
    adocTxt.push('[source,bash]');
    adocTxt.push('----');

    switch (`${options.dependencyType}`.toLowerCase()) {
      case 'global':
        adocTxt.push(`npm install "${packageJson.name}" -g`);
        break;
      case 'dev':
        adocTxt.push(`npm install "${packageJson.name}" -D`);
        break;
      case 'opt':
        adocTxt.push(`npm install "${packageJson.name}" -O`);
        break;
      default: // regular
        adocTxt.push(`npm install "${packageJson.name}"`);
        break;
    }

    adocTxt.push('----');
  }

  var attributes = {};
  var output = '';
  output += resolve({ includeRootSourcePath: path.dirname(readmeFile), EOL: options.EOL, attributes: attributes }, ...adoc);
  output += options.EOL.repeat(1);
  output += resolve({ includeRootSourcePath: path.dirname(readmeFile), EOL: options.EOL, attributes: attributes }, ...adocTxt);

  if (readmeBodyStat) {
    var readmeBody = readLinesSync(readmeBodyFile, { encoding: 'utf8' });
    output += options.EOL.repeat(2);
    output += resolve({ includeRootSourcePath: path.dirname(readmeBodyFile), EOL: options.EOL, attributes: attributes }, ...readmeBody);
  }

  if (options.outputFormat === 'adoc') {
    fs.writeFileSync(readmeFile, output, { encoding: 'utf8' });
  } else {
    // @ts-ignore
    const asciidoctor = require('@asciidoctor/core')();
    require('@asciidoctor/docbook-converter')();

    const docbook = asciidoctor.convert(output, {
      attributes: { backend: 'docbook5', doctype: 'book', leveloffset: '+1' },
      standalone: true
    });

    switch (options.outputFormat) {
      case 'xml':
        fs.writeFileSync(readmeFile, docbook, { encoding: 'utf8' });
        break;
      case 'md':
        // #region Experimental, needs pandoc to be installed and locatable
        var pandocExecutable = require('./os-utils').ResolvePath('pandoc');
        if (pandocExecutable) {
          var markdown = require('child_process').execSync(`"${pandocExecutable}" --atx-headers --wrap=preserve -f docbook -t gfm`, { input: docbook, encoding: 'utf8' }).toString();
          fs.writeFileSync(readmeFile, markdown, { encoding: 'utf8' });
        }
        // #endregion
        break;
      default:
        throw Error(`Unsupported output format '${options.outputFormat}'.`);
    }
  }
  console.info(`Successfully updated readme file '${readmeFile}'.`);

  var readmeElement = 'readme';
  var relPath = path.relative(packagePath, readmeFile);
  if (packageJson[readmeElement] !== relPath) {
    console.debug(`Setting "${readmeElement}" element from [${packageJson[readmeElement]}] to [${relPath}] in package object.`);
    packageJson[readmeElement] = relPath;
    packageJsonNeedsUpdate = true;
  }

  if (packageJsonNeedsUpdate) {
    if (!options.noPackageJsonUpdate) {
      fs.writeJSONSync(packageJsonFile, packageJson, { encoding: 'utf8', spaces: 4, EOL: os.EOL });
      console.info(`Successfully updated package file '${packageJsonFile}'.`);
    } else {
      console.warn(`File '${packageJsonFile}' needs an update, but options.noPackageJsonUpdate has been set to [${options.noPackageJsonUpdate}].`);
    }
  }
};

/**
 * @param {string} includeRootSourcePath Path that serves as the root folder
 * for relative include file specifications.
 * @param {string} EOL The newline sequence to use to join `lines`.
 * @returns {string}
 */
exports.Resolve = function Resolve (includeRootSourcePath, EOL, ...lines) {
  if (!includeRootSourcePath || !fs.existsSync(includeRootSourcePath) || !fs.lstatSync(includeRootSourcePath).isDirectory()) {
    throw Error(`The the root source path for include files '${includeRootSourcePath}' is not a directory.`);
  }
  if (!(typeof (EOL) === 'string')) {
    throw Error('The \'EOL\' parameter is not a string.');
  }
  if (!lines || !Array.isArray(lines)) {
    throw Error('The \'lines\' parameter is not an array.');
  }

  return resolve({ includeRootSourcePath: includeRootSourcePath, EOL: EOL }, ...lines);
};

/**
 * @param {string} includeRootSourcePath Path that serves as the root folder
 * for relative include file specifications.
 * @param {string[]} lines The lines to resolve.
 * @returns {string[]}
 */
exports.ResolveIncludes = function ResolveIncludes (includeRootSourcePath, ...lines) {
  if (!includeRootSourcePath || !fs.existsSync(includeRootSourcePath) || !fs.lstatSync(includeRootSourcePath).isDirectory()) {
    throw Error(`The root source path for include files '${includeRootSourcePath}' is not a directory.`);
  }

  return resolveIncludes(includeRootSourcePath, ...lines);
};

/**
 * @param {string[]} lines The lines to resolve.
 * @returns {string[]}
 */
exports.ResolveAttributes = (...lines) => {
  return resolveAttributes(undefined, ...lines);
};

/**
 * @param {string} attributeName The name of the asciidoc attribute to return,
 * excluding leading and trailing colons (:).
 * @param {string[]} lines The lines to search for `attributeName` in.
 * @returns {(string|undefined)} The value of the attribute, or `undefined` if
 * the attribute hasn't been found.
 */
exports.GetAttribute = function GetAttribute (attributeName, ...lines) {
  if (!(typeof (attributeName) === 'string')) {
    throw Error('The \'attributeName\' parameter is not a string.');
  }

  return getAttribute(attributeName, ...lines);
};

/**
 * @param {string[]} lines The lines to search for attributes.
 * @returns {object}
 */
exports.GetAttributes = (...lines) => {
  return getAttributes(undefined, ...lines);
};
