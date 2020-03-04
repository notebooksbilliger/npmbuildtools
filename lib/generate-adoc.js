const fs = require('fs-extra');
const path = require('path');

exports.GenerateReadme = function GenerateReadme(packagePath, readmeFileName, lineBreak) {
    if (!lineBreak) {
        lineBreak = '\r\n';
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

    adoc.push(`:Date: ${new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'numeric', day: 'numeric' })}`);

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

    var readmeHeaderFile = path.join(docFolder, 'readme-header.adoc');
    fs.writeFileSync(readmeHeaderFile, adoc.join(lineBreak), { encoding: 'utf8' });
    fs.appendFileSync(readmeHeaderFile, lineBreak.repeat(1), { encoding: 'utf8' });
    fs.appendFileSync(readmeHeaderFile, adocTxt.join(lineBreak), { encoding: 'utf8' });

    var readmeFile = path.join(packagePath, readmeFileName);
    fs.copyFileSync(readmeHeaderFile, readmeFile);

    var readmeBodyFile = path.join(docFolder, 'readme-body.adoc');
    if (fs.existsSync(readmeBodyFile)) {
        var readmeBody = fs.readFileSync(readmeBodyFile, { encoding: 'utf8' });
        fs.appendFileSync(readmeFile, lineBreak.repeat(2), { encoding: 'utf8' });
        fs.appendFileSync(readmeFile, readmeBody, { encoding: 'utf8' });
    } else {
        console.warn(`There was no body file found ('${readmeBodyFile}').`);
    }

    console.log(`Successfully updated file '${readmeFile}'.`);
}