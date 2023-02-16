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
    try {
      let config = require(path.resolve(cwd_process, deployJsonName));
      if (typeof config.useEnv === 'boolean' && config.useEnv === true) {
        let command_env_dev = `cd .. && mv .env .env-dev`;
        await this.runCommand(command_env_dev);
        let command_env_pro = `cp .env ../.env`;
        await this.runCommand(command_env_pro);
      }
      if (typeof config.useConfig === 'boolean' && config.useConfig === true) {
        let command_config_dev = `cd .. && mv nuxt.config.ts nuxt.config-dev.ts`;
        await this.runCommand(command_config_dev);
        let command_config_pro = `cp nuxt.config.ts ../nuxt.config.ts`;
        await this.runCommand(command_config_pro);
      }
      let command1 = `cd .. && npm run build`;
      await this.runCommand(command1);
      let command2 = `cd .. && tar czf ${cwd_process}/output.tar.gz .output`;
      await this.runCommand(command2);
      try {
        let command5 = `cd .. && tar czf ${cwd_process}/language.tar.gz language`;
        await this.runCommand(command5);
      } catch (e) { }
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
    }
    if (fs.existsSync(`${cwd_process}/language.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/language.tar.gz`);
    }
    if (typeof config.useEnv === 'boolean' && config.useEnv === true) {
      let command_env_dev = `cd .. && rm .env && mv .env-dev .env`;
      await this.runCommand(command_env_dev);
    }
    if (typeof config.useConfig === 'boolean' && config.useConfig === true) {
      let command_config_dev = `cd .. && rm nuxt.config.ts && mv nuxt.config-dev.ts nuxt.config.ts`;
      await this.runCommand(command_config_dev);
    }
    console.log("clear docker images SUCCESS");
  },
};
