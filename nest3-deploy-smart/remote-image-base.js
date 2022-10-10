const { exec } = require("child_process");
const { NodeSSH } = require("node-ssh");
const path = require("path");
const fs = require("fs-extra");
const abs = require("abs");
const md5 = require("md5");
const rimraf = require("rimraf");
module.exports = {
    rem:(s)=>{
        return s.toString().replace(/\s+/g, '');;
    },
    check_package: async function() {
        console.log('START CHECK IMAGE VERSION');
        let cwd_process = process.cwd();
        let config = require(path.resolve(cwd_process, './config.json'));
        let file_package = path.resolve(cwd_process, './package.json');
        let current_package = path.resolve(cwd_process, config.packageJsonPath);
        if (!fs.existsSync(file_package)) {
            fs.copySync(current_package, file_package);
            let package = fs.readJsonSync(file_package);
            let prettyPackage = md5(this.rem(JSON.stringify(package, null, 2)));
            fs.writeFileSync('image-base-version', prettyPackage);
            return true;
        }
        let prettyPackage1 = md5(this.rem(JSON.stringify(fs.readJsonSync(file_package), null, 2)));
        let prettyPackage2 = md5(this.rem(JSON.stringify(fs.readJsonSync(current_package), null, 2)));
        if (prettyPackage1 !== prettyPackage2) {
            fs.copySync(current_package, file_package);
            fs.writeFileSync('image-base-version', prettyPackage2);
        } else {
            if (!fs.existsSync('image-base-version')) {
                fs.writeFileSync('image-base-version', prettyPackage2);
            }
        }
        return true;
    },

    config: (deployJsonName = "config.json") => {
        let cwd_process = process.cwd();
        return require(path.resolve(cwd_process, deployJsonName));
    },

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
            `cd ${_config.server.deploymentDir} && mkdir ${_config.basename}`,
            ssh,
            "Start create Folder application"
        );

        let cmd = `cd ${_config.server.deploymentDir}  && [ -d "${_config.basename}" ] && echo "yes" || echo "noop"`;
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
        console.log(`Start upload Base Resource`);
        console.log("");
        try {
            let cwd_process = process.cwd();
            await ssh.putFile(
                `${cwd_process}/DockerfileProduction`,
                `${_config.server.deploymentDir}/${_config.basename}/Dockerfile`
            );
            await ssh.putFile(
                `${cwd_process}/package.json`,
                `${_config.server.deploymentDir}/${_config.basename}/package.json`
            );
            console.log(`Upload Dockerfile Success`);
            console.log(`Upload package.json Success`);
        } catch (err) {
            console.log(`Upload Dockerfile Fail`);
            console.log(`Upload package.json Fail`);
            console.log(err);
            return false;
        }
        return true;
    },
    existsRemoteImage:async function(_config, ssh){
        let _version_ = fs.readFileSync('image-base-version', 'utf8');
        if(_version_) _version_ = _version_.toString();
        let check_image_already = await this.runCommand(`[ -z "$(docker images -q ${_config.basename}:${_version_})" ] && echo 'N' || echo 'Y'`,ssh,'check image on server');
        console.log(`${_config.basename}:${_version_}`,check_image_already);
        if (check_image_already.trim()==='Y') {
            return true;
        }
        return false;
    },
    buildImage: async function (_config, ssh) {
        console.log("----------------------------Start Build BASE Image ON SERVER----------------------");
        let _version_ = fs.readFileSync('image-base-version', 'utf8');
        if(_version_) _version_ = _version_.toString();
        cmd = `cd ${_config.server.deploymentDir}/${_config.basename} && ${_config.server.sudo} docker build  -t ${_config.basename}:${_version_} .`;
        return await this.runCommand(cmd, ssh, "Build BASE Image ON SERVER successs");
    },
};
