#! /usr/bin/env node
const { program } = require('commander')
const Local = require('./methods-local')
const Remote = require('./methods-remote')
program.version('1.0.0')
program
    .command('init')
    .description('init application config')
    .action(async function () {
        //await Local.init()
        //await Base.init()
    })
program
    .command('start')
    .description('start deploy your App to the server(s)')
    .option('-c, --config [type]', 'Config File')
    .action(async function () {
        const config =
            this.config !== undefined && this.config !== true
                ? this.config
                : 'config.json'

        const config_json = Remote.config(config)
        const ssh = await Remote.connect(config_json)

        const local_build = await Local.build(config_json);
        if (!local_build) {
            ssh.dispose();
            console.log('BUILD ---------------------------------------- FAIL');
            return false
        }

        const result_check = await Remote.checkHost(ssh)
        if (!result_check) {
            ssh.dispose()
            return false
        }
        const result_init = await Remote.initHost(config_json, ssh)
        if (result_init === false) {
            ssh.dispose()
            return false
        }

        const result_uptoserver = await Remote.upToServer(config_json, ssh)
        if (result_uptoserver === false) {
            ssh.dispose()
            return false
        }

        const result_upzip = await Remote.upzip(config_json, ssh)
        if (result_upzip === false) {
            ssh.dispose()
            return false
        }
        const result_removeFile = await Remote.deleteFiles(config_json, ssh)
        if (result_removeFile === false) {
            ssh.dispose()
            return false
        }
        await Local.remove();

        console.log('------- ... LOADING ... -------')
        await Local.waiting(5000)
        const result = await Remote.isSuccess(config_json, ssh)
        if (result === true) {
            console.log('------- DEPLOY STATUS SUCCESS -------')

        } else {
            console.log('------- DEPLOY STATUS FAIL -------')
        }
        ssh.dispose()
    })

program.parse(process.argv)
