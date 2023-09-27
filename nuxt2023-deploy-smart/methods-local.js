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
      console.log("start-command - ", cmd);
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
    let _version_ = fs.readFileSync("image-base-version", "utf8");
    if (_version_) _version_ = _version_.toString();
    try {
      let config = require(path.resolve(cwd_process, deployJsonName));
      if (typeof config.useEnv === "boolean" && config.useEnv === true) {
        let command_env_dev = `cd .. && mv .env .env-dev`;
        await this.runCommand(command_env_dev);
        let command_env_pro = `cp .env ../.env`;
        await this.runCommand(command_env_pro);
      }
      if (typeof config.useConfig === "boolean" && config.useConfig === true) {
        let commandconfig_dev = `cd .. && mv nuxt.config.ts nuxt.config-dev.ts`;
        await this.runCommand(commandconfig_dev);
        let commandconfig_pro = `cp nuxt.config.ts ../nuxt.config.ts`;
        await this.runCommand(commandconfig_pro);
      }

      let command_docker_build = `cp DockerfileBuild ../Dockerfile`;
      await this.runCommand(command_docker_build);
      let cmd_build = `cd .. && docker build  -t ${config.basename}:${_version_} .`;
      await this.runCommand(cmd_build);
      let cmd_run = `docker rm -f ${config.basename}-${_version_} || echo 'not' 1>&2 && docker run --name ${config.basename}-${_version_} ${config.basename}:${_version_}`;
      await this.runCommand(cmd_run);
      let cmd_copy = `docker cp ${config.basename}-${_version_}:/usr/src/app/.output .`;
      await this.runCommand(cmd_copy);
      let cmd_zip = `tar czf ${cwd_process}/output.tar.gz .output`;
      await this.runCommand(cmd_zip);
      let claer_container = `docker rm -f ${config.basename}-${_version_}`;
      await this.runCommand(claer_container);

      console.log("building SUCCESS");
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  remove: async function (deployJsonName = "config.json") {
    let cwd_process = process.cwd();
    let config = require(path.resolve(cwd_process, deployJsonName));
    let command_docker_file = `cd .. && rm Dockerfile`;
    await this.runCommand(command_docker_file);

    if (fs.existsSync(`${cwd_process}/package.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/package.tar.gz`);
    }
    if (fs.existsSync(`${cwd_process}/package-lock.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/package-lock.tar.gz`);
    }
    if (fs.existsSync(`${cwd_process}/package-lock.json`)) {
      await this.removeFolder(`${cwd_process}/package-lock.json`);
    }
    if (fs.existsSync(`${cwd_process}/output.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/output.tar.gz`);
      await this.removeFolder(`${cwd_process}/.output`);
    }
    if (fs.existsSync(`${cwd_process}/language.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/language.tar.gz`);
    }
    if (typeof config.useEnv === "boolean" && config.useEnv === true) {
      let command_env_dev = `cd .. && rm .env && mv .env-dev .env`;
      await this.runCommand(command_env_dev);
    }

    if (typeof config.useConfig === "boolean" && config.useConfig === true) {
      let commandconfig_dev = `cd .. && rm nuxt.config.ts && mv nuxt.config-dev.ts nuxt.config.ts`;
      await this.runCommand(commandconfig_dev);
    }
    console.log("clear docker images SUCCESS");
  },
};
