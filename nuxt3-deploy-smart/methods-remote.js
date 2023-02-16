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
                `${cwd_process}/output.tar.gz`,
                `${_config.server.deploymentDir}/${_config.appName}/output.tar.gz`
            );

            if (fs.existsSync(`${cwd_process}/language.tar.gz`)) {
                await ssh.putFile(
                    `${cwd_process}/language.tar.gz`,
                    `${_config.server.deploymentDir}/${_config.appName}/language.tar.gz`
                );
            }

            if (_config.useEnv === true) {
                await ssh.putFile(
                    `${cwd_process}/.env`,
                    `${_config.server.deploymentDir}/${_config.appName}/.env`
                );
                console.log("Upload Dockerfile && .env Success");
            }
            console.log("Upload Dockerfile && .env Success");
        } catch (err) {
            console.log("Upload Dockerfile && .env Fail");
            console.log(err);
            return false;
        }
        return true;
    },

    runAppNotBuild: async function (_config, ssh, isRemoteBase) {
        console.log("Start Run Container");
        console.log("");
        let network = '';
        if (typeof _config.network === 'string' && _config.network) {
            network = _config.network;
        }

        let _version_ = fs.readFileSync('image-base-version', 'utf8');
        if (_version_) _version_ = _version_.toString();

        //if (isRemoteBase === false ) {
        let cmd = `${_config.server.sudo} docker stop ${_config.appName} && docker rm -f ${_config.appName} || echo 'not' 1>&2 && ${_config.server.sudo} docker run --restart=always --name ${_config.appName} ${network} -d ${_config.volume} ${_config.port} ${_config.basename}:${_version_}`;
        await this.runCommand(cmd, ssh, "Run Container completed");
        //}

        cmd = `${_config.server.sudo} docker cp ${_config.server.deploymentDir}/${_config.appName}/.output ${_config.appName}:/usr/src/app/.output`;
        await this.runCommand(cmd, ssh, "copy output success ");

        try{
            cmd = `${_config.server.sudo} docker cp ${_config.server.deploymentDir}/${_config.appName}/language ${_config.appName}:/usr/src/app/language`;
            await this.runCommand(cmd, ssh, "copy language success ");
        }catch(e){}

        if (_config.useEnv === true) {
            cmd = `${_config.server.sudo} docker cp ${_config.server.deploymentDir}/${_config.appName}/.env ${_config.appName}:/usr/src/app/.env`;
            await this.runCommand(cmd, ssh, "copy .env success ");
        }
        //cmd = `${_config.server.sudo} docker exec -it ${_config.appName} pm2 restart 0`;
        // await this.runCommand(cmd, ssh, "restart success ");

        cmd = `${_config.server.sudo} docker restart ${_config.appName}`;
        await this.runCommand(cmd, ssh, "copy restart success ");
    },

    clean: async function (_config, ssh) {
        console.log("Start Clean!!");
        console.log(""); //docker image prune --filter="dangling=true"
        let cmd = `${_config.server.sudo} docker image prune --filter="dangling=true" -f`;
        return await this.runCommand(cmd, ssh, "Start Clean!!");
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

    stop: async function (_config, ssh) {
        let cmd = `${_config.server.sudo} docker stop ${_config.appName}`;
        return await this.runCommand(cmd, ssh, "stop");
    },

    start: async function (_config, ssh) {
        let cmd = `${_config.server.sudo} docker start ${_config.appName}`;
        return await this.runCommand(cmd, ssh, "stop");
    },

    restart: async function (_config, ssh) {
        let cmd = `${_config.server.sudo} docker restart ${_config.appName}`;
        return await this.runCommand(cmd, ssh, "restart");
    },

    deleteFiles: async function (_config, ssh) {
        console.log("Start Delete File");
        let cmd = `rm -rf ${_config.server.deploymentDir}/${_config.appName}`;
        return await this.runCommand(cmd, ssh, "deleteFiles");
    },

    upzip: async function (_config, ssh) {
        console.log("Start unzip");
        console.log("");
        let cmd = `cd ${_config.server.deploymentDir}/${_config.appName}  && rm -rf .output && tar -xf output.tar.gz`;
        await this.runCommand(cmd, ssh, "upzip");
        try{
            let cmd2 = `cd ${_config.server.deploymentDir}/${_config.appName}  && rm -rf language && tar -xf language.tar.gz`;
            await this.runCommand(cmd2, ssh, "upzip");
        }catch(e){}

        return true;
    },
};
