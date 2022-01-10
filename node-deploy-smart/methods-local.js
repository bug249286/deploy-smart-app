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
            let command2 = `cd .. && tar czf ${cwd_process}/src.tar.gz src`;
            await this.runCommand(command2);
            console.log("building SUCCESS");
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    remove: async function (deployJsonName = "config.json") {
        let cwd_process = process.cwd();
        if (fs.existsSync(`${cwd_process}/package.tar.gz`)) {
            await this.removeFolder(`${cwd_process}/package.tar.gz`);
        }
        if (fs.existsSync(`${cwd_process}/package-lock.tar.gz`)) {
            await this.removeFolder(`${cwd_process}/package-lock.tar.gz`);
        }
        if (fs.existsSync(`${cwd_process}/src.tar.gz`)) {
            await this.removeFolder(`${cwd_process}/src.tar.gz`);
        }
        console.log("clear docker images SUCCESS");
    },
};
