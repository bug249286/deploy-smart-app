const { NodeSSH } = require("node-ssh");
const path = require("path");
const fs = require("fs-extra");

module.exports = {
    config: (deployJsonName = "config.json") => {
        let cwd_process = process.cwd();
        return require(path.resolve(cwd_process, deployJsonName));
    },
    waiting: (time) =>
        new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, time);
        }),
    connect: async (_config) => {
        console.log("Start Connect to server");
        console.log("");
        let session_ssh = new NodeSSH();
        let config = {
            host: _config.server.host,
            username: _config.server.username,
            tryKeyboard: true,
        };
        if (_config.server.password) {
            config.password = _config.server.password;
        }
        if (_config.server.pem) {
            config.privateKey = _config.server.pem;
        }
        try {
            await session_ssh.connect(config);
            return session_ssh;
        } catch (err) {
            console.log("Connect to Server Error ", err);
        }
    },
    runCommand: async (cmd, ssh, method) => {
        try {
            console.log('cmd', cmd)
            let result = await ssh.execCommand(cmd, {});
            if (result.stderr) {
                if (/.*error.*/.test(result.stderr)) {
                    console.log(`${method}\r\n`, result.stderr);
                    return false;
                }
            }
            console.log('Result Run : ' + method, result.stdout);
            return result.stdout;
        } catch (error) {
            console.log(error);
            return false;
        }
    },
    checkHost: async function (ssh) {
        let cmd = `(command -v git || echo 'missing git' 1>&2) && (command -v docker || echo 'missing docker' 1>&2)`;
        console.log("Start check server");
        console.log("");
        let result = await this.runCommand(cmd, ssh, "Start check server");
        if (/.*missing.*/.test(result)) {
            console.log("Error", result);
            return false;
        } else {
            console.log("Success", result);
            return true;
        }
    },
    initHost: async function (_config, ssh) {
        console.log("Start check source application");
        console.log("");
        await this.runCommand(
            `cd ${_config.server.deploymentDir} && mkdir ${_config.appName}`,
            ssh,
            "Start create Folder application"
        );
        await this.runCommand(
            `cd ${_config.server.appPath} && mkdir ${_config.appName}`,
            ssh,
            "Start create Folder application"
        );

        let cmd = `cd ${_config.server.deploymentDir}  && [ -d "${_config.appName}" ] && echo "yes" || echo "noop"`;
        let result = await this.runCommand(
            cmd,
            ssh,
            "Start check source application"
        );
        if (/.*noop.*/.test(result)) {
            console.log("App not exists");
            return false;
        } else {
            return true;
            //return this.pull(_config, ssh)
        }
    },
    upToServer: async function (_config, ssh) {
        console.log("Start upload Dockerfile && .env");
        console.log("");
        try {
            let cwd_process = process.cwd();
            await ssh.putFile(
                `${cwd_process}/dist.tar.gz`,
                `${_config.server.deploymentDir}/${_config.appName}/dist.tar.gz`
            );
            console.log("Upload Dockerfile && .env Success");
        } catch (err) {
            console.log("Upload Dockerfile && .env Fail");
            console.log(err);
            return false;
        }
        return true;
    },

    isSuccess: async function (_config, ssh) {
        if (_config.textVerify) {
            if (_config.pathVerify) cmd = `curl ${_config.pathVerify}`;
            let result = await this.runCommand(cmd, ssh, "check");
            if (new RegExp(_config.textVerify, "g").test(result)) {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    },

    deleteFiles: async function (_config, ssh) {
        console.log("Start Delete File");
        let cmd = `rm -rf ${_config.server.deploymentDir}/${_config.appName}`;
        return await this.runCommand(cmd, ssh, "deleteFiles");
    },

    upzip: async function (_config, ssh) {
        console.log("Start unzip");
        console.log("");
        let cmd = `cd ${_config.server.deploymentDir}/${_config.appName}  && rm -rf dist && tar -xf dist.tar.gz`;
        await this.runCommand(cmd, ssh, "upzip");
        let cmdmv = `cd ${_config.server.deploymentDir}/${_config.appName}  && rm -rf ${_config.server.appPath}/${_config.appName}/dist && mv dist ${_config.server.appPath}/${_config.appName}/dist`;
        await this.runCommand(cmdmv, ssh, "move");
        return true;
    },
};
