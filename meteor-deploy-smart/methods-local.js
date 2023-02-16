const { exec } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const abs = require("abs");
const rimraf = require("rimraf");
module.exports = {
    removeFolder: (f) =>
        new Promise((resolve, reject) => {
            rimraf(f, function () {
                resolve(true);
            });
        }),
    runCommand: (cmd) =>
        new Promise((resolve, reject) => {
            console.log('start-command - ', cmd);
            exec(
                cmd,
                {
                    maxBuffer: 1024 * 200000,
                },
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    console.log(stdout);
                    resolve(stdout ? stdout : stderr);
                }
            );
        }),
    waiting: (time) =>
        new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, time);
        }),

    build: async function (deployJsonName = "config.json") {
        let cwd_process = process.cwd();
        let config = require(path.resolve(cwd_process, deployJsonName));
        try {
            let exclude = '';
            if(config.excludes && Array.isArray(config.excludes) && config.excludes.length > 0){
                let excudes = config.excludes.map(x=>{
                    return `--exclude '${x}'`;
                });
                if(excudes && excudes.length > 0){
                    exclude = excudes.join(' ');
                }
            }
            let command1 = `cd .. && tar cjv  --exclude '.meteor/local' --exclude 'node_modules' --exclude '.cache' --exclude '.git' ${exclude} -f ${cwd_process}/project.tar.gz .`;
            await this.runCommand(command1);
            //let command2 = `tar -zcvf ${cwd_process}/bundle.tar.gz bundle`;
            //await this.runCommand(command2);
            //await this.removeFolder(`${cwd_process}/bundle`);
            console.log("building SUCCESS");
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    remove: async function (deployJsonName = "config.json") {
        let cwd_process = process.cwd();
        if (fs.existsSync(`${cwd_process}/project.tar.gz`)) {
            await this.removeFolder(`${cwd_process}/project.tar.gz`);
        }
        console.log("clear docker images SUCCESS");
    },
};
