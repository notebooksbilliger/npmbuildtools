const cp = require('child_process');
const btools = require('../index');

var debug = !btools.silent();
var globalPackageList;

function CheckGlobalDep(globalDep) {
    console.log(`Searching for global packe '${globalDep}' ...`);

    if (globalPackageList.dependencies[globalDep] == undefined) {
        console.log(`\n\u001b[31mFor development, you need to install \u001b[1m${globalDep}\u001b[0m\u001b[31m, which is intentionally not listed in the devDependencies section of 'package.json'.\u001b[0m`);
        console.log(`\nInstall ${globalDep} globally by issuing: \u001b[1mnpm install ${globalDep} -g\u001b[0m\n\n`);

        if (!debug) {
            try {
                process.stdin.setRawMode(true);
                console.log('Press any key to proceed');
                process.stdin.resume();
                process.stdin.on('data', process.exit.bind(process, 0));
            } catch(err) {
                console.error(err);
            }
        }
    } else {
        console.log(`Found \u001b[1m${globalPackageList.dependencies[globalDep]}\u001b[0m, v \u001b[1m${globalPackageList.dependencies[globalDep].version}\u001b[0m - \u001b[32m\u001b[1mOk\u001b[0m\n`);
    }
}

exports.CheckGlobalDeps = function CheckGlobalDeps(...globalDeps) {
    console.log(`Checking for ${globalDeps.length} global package(s), loading global npm package list ...\n`);

    var npmCommand = 'npm ls -g --json --depth 0';
    if (debug) {
        console.log(`Executing command syncronously: [${npmCommand}].`);
    }
    var packageList;
    try {
        packageList = cp.execSync(npmCommand).toString();
        if (debug) {
            console.log(`Command returned:\n[${packageList}]\n, parsing output.`);
        }
    } catch(err) {
        console.error(err);
        throw err;
    }
    globalPackageList = JSON.parse(packageList);
    var n = Object.keys(globalPackageList.dependencies);
    console.log(`Found ${n.length} global package(s).`);

    globalDeps.forEach(globalDep => {
        CheckGlobalDep(globalDep);
    });
}

exports.GetGlobalPackagesList = () => globalPackageList;

var depList = btools.SliceArgv(process.argv, __filename, false);
if (depList.length > 0) {
    if (!debug) {
        console.log('\u001b[0m'); // reset screen
        console.log('\u001b[2J'); // clear screen
    }

    this.CheckGlobalDeps(...depList);
}