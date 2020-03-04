const cp = require('child_process');
const btools = require('../index');

var debug =!btools.silent();
var globalPackageList;

function CheckGlobalDep(globalDep) {
    console.log(`Searching for global packe '${globalDep}' ...`);

    if (globalPackageList.dependencies[globalDep] == undefined) {
        console.log(`\n\u001b[31mFor development, you need to install \u001b[1m${globalDep}\u001b[0m\u001b[31m, which is intentionally not listed in the devDependencies section of 'package.json'.\u001b[0m`);
        console.log(`\nInstall ${globalDep} globally by issuing: \u001b[1mnpm install ${globalDep} -g\u001b[0m\n\n`)
        try {
            process.stdin.setRawMode(true);
            console.log('Press any key to proceed');
            process.stdin.resume();
            process.stdin.on('data', process.exit.bind(process, 0));
        } catch(err) {
            //console.debug(err);
        }
    } else {
        console.log(`Found \u001b[1m${globalPackageList.dependencies[globalDep].from}\u001b[0m, v \u001b[1m${globalPackageList.dependencies[globalDep].version}\u001b[0m - \u001b[32m\u001b[1mOk\u001b[0m\n`);
    }
}

exports.CheckGlobalDeps = function CheckGlobalDeps(...globalDeps) {
    console.log(`Checking for ${globalDeps.length} global package(s), loading global npm package list ...\n`);

    var spawn = cp.spawnSync('npm.cmd', ['ls', '-g', '--json', '--depth', '0']);
    if (spawn.error) { throw spawn.error; }
    globalPackageList = JSON.parse(spawn.stdout.toString());
    var n = Object.keys(globalPackageList.dependencies);
    console.log(`Found ${n.length} global package(s).\n`);
    if (debug) {
        console.log(JSON.stringify(globalPackageList.dependencies, null, 4));
    }

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