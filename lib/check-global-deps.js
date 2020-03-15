const os = require('os');
const cp = require('child_process');
const btools = require('../index');

var globalPackageList;

function CheckGlobalDep(globalDep, updateCache) {
    if (!globalPackageList || updateCache) {
        console.info(`Updating locally cached global npm package list ...`);

        var npmCommand = 'npm ls -g --json --depth 0';
        console.debug(`Executing command syncronously: [${npmCommand}].`);
        var packageList = cp.execSync(npmCommand).toString();
        console.debug(`Command returned:${os.EOL}[${packageList}]${os.EOL}, parsing output.`);
        globalPackageList = JSON.parse(packageList);
        var n = Object.keys(globalPackageList.dependencies);
        console.info(`Found ${n.length} global package(s).`);
    }

    console.log(`Searching for global package '${globalDep}' ...`);

    if (globalPackageList.dependencies[globalDep] == undefined) {
        console.log(`${os.EOL}For development, you need to install ${globalDep.bold}, which is intentionally not listed in the devDependencies section of 'package.json'.`.red);
        console.log(`${os.EOL}Install ${globalDep} globally by issuing: ` + `npm install ${globalDep} -g${os.EOL}${os.EOL}`.bold);

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
        console.log(`Found package ${globalDep.bold}, v ${globalPackageList.dependencies[globalDep].version.bold} - ${`Ok`.green.bold}${os.EOL}`);
    }
}

exports.CheckGlobalDeps = function CheckGlobalDeps(...globalDeps) {
    console.log(`Checking for ${globalDeps.length} global package(s) ...`);

    globalDeps.forEach(globalDep => {
        CheckGlobalDep(globalDep);
    });
}

exports.GetGlobalPackagesList = () => globalPackageList;

var depList = btools.SliceArgv(process.argv, __filename, false);
if (depList.length > 0) {
    if (btools.TerminalCanBlock) {
        console.log('\u001b[2J'); // clear screen
    }

    this.CheckGlobalDeps(...depList);
}
