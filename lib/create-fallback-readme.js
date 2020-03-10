const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const btools = require('../index');

exports.CreateFallbackReadme = function CreateFallbackReadme(packagePath) {
    if (!packagePath) {
        throw Error(`Parameter 'packagePath' is mandatory.`);
    }

    var readmeFile = path.resolve(packagePath, `README.md`);
    if (fs.existsSync(readmeFile)) {
        throw Error(`Readme file '${readmeFile}' already exists.`);
    }
    console.info(`Creating readme file '${readmeFile}'.`);

    var readme = [];
    readme.push(`Rendering AsciiDoc is not supported here - please visit our GitHub repo to view the full readme information.`);

    fs.writeFileSync(readmeFile, readme.join(os.EOL), { encoding: 'utf8' });
    console.info(`Successfully created '${readmeFile}'.`);
}

var packagePath = process.env['npm_postpack_dir'];
if (packagePath != undefined) {
    this.CreateFallbackReadme(packagePath, ...btools.SliceArgv(process.argv, __filename));
}
