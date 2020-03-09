const cp = require('child_process');
const btools = require('../index');

var globalPackageList;

function CheckGlobalDep(globalDep, updateCache) {
    if (!globalPackageList || updateCache) {
        console.log(`Updating locally cached global npm package list ...\n`);

        var npmCommand = 'npm ls -g --json --depth 0';
        console.debug(`Executing command syncronously: [${npmCommand}].`);
        var packageList = cp.execSync(npmCommand).toString();
        console.debug(`Command returned:\n[${packageList}]\n, parsing output.`);
        globalPackageList = JSON.parse(packageList);
        var n = Object.keys(globalPackageList.dependencies);
        console.log(`Found ${n.length} global package(s).`);
    }

    console.log(`Searching for global package '${globalDep}' ...`);

    if (globalPackageList.dependencies[globalDep] == undefined) {
        console.log(`\n\u001b[31mFor development, you need to install \u001b[1m${globalDep}\u001b[0m\u001b[31m, which is intentionally not listed in the devDependencies section of 'package.json'.\u001b[0m`);
        console.log(`\nInstall ${globalDep} globally by issuing: \u001b[1mnpm install ${globalDep} -g\u001b[0m\n\n`);

        if (btools.TerminalCanBlock) {
            try {
                process.stdin.setRawMode(true);
                console.log('Press any key to proceed');
                process.stdin.resume();
                process.stdin.on('data', process.exit.bind(process, 0));
            } /*catch(err) {
                console.error(err);
            }*/ finally {}
        }
    } else {
        console.log(`Found package \u001b[1m${globalDep}\u001b[0m, v \u001b[1m${globalPackageList.dependencies[globalDep].version}\u001b[0m - \u001b[32m\u001b[1mOk\u001b[0m\n`);
    }
}

exports.CheckGlobalDeps = function CheckGlobalDeps(...globalDeps) {
    console.log(`Checking for ${globalDeps.length} global package(s) ...\n`);

    globalDeps.forEach(globalDep => {
        CheckGlobalDep(globalDep);
    });
}

exports.GetGlobalPackagesList = () => globalPackageList;

var depList = btools.SliceArgv(process.argv, __filename, false);
if (depList.length > 0) {
    if (btools.TerminalCanBlock) {
        console.log('\u001b[0m'); // reset screen
        console.log('\u001b[2J'); // clear screen
    }

    this.CheckGlobalDeps(...depList);
}
