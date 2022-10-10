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
      let command_env_dev = `cd .. && mv .env .env-dev`;
      await this.runCommand(command_env_dev);
      let command_env_pro = `cp .env ../.env`;
      await this.runCommand(command_env_pro);

      let command_config_dev = `cd .. && mv nuxt.config.js nuxt.config-dev.js`;
      await this.runCommand(command_config_dev);
      let command_config_pro = `cp nuxt.config.js ../nuxt.config.js`;
      await this.runCommand(command_config_pro);

      let command1 = `cd .. && npm run build`;
      await this.runCommand(command1);
      let command2 = `cd .. && tar czf ${cwd_process}/nuxt.tar.gz .nuxt`;
      await this.runCommand(command2);
      let command3 = `cd .. && tar czf ${cwd_process}/public.tar.gz public`;
      await this.runCommand(command3);
      try {
        let command5 = `cd .. && tar czf ${cwd_process}/language.tar.gz language`;
        await this.runCommand(command5);
      } catch (e) {}
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
    if (fs.existsSync(`${cwd_process}/package-lock.json`)) {
      await this.removeFolder(`${cwd_process}/package-lock.json`);
    }
    if (fs.existsSync(`${cwd_process}/nuxt.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/nuxt.tar.gz`);
    }
    if (fs.existsSync(`${cwd_process}/public.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/public.tar.gz`);
    }
    if (fs.existsSync(`${cwd_process}/nuxt.config.js`)) {
      await this.removeFolder(`${cwd_process}/nuxt.config.js`);
    }
    if (fs.existsSync(`${cwd_process}/language.tar.gz`)) {
      await this.removeFolder(`${cwd_process}/language.tar.gz`);
    }
    let command_env_dev = `cd .. && rm .env && mv .env-dev .env`;
    await this.runCommand(command_env_dev);
    let command_config_dev = `cd .. && rm .nuxt.config.js && mv .nuxt.config-dev.js nuxt.config.js`;
    await this.runCommand(command_config_dev);
    console.log("clear docker images SUCCESS");
  },
};
