#! /usr/bin/env node
const { program } = require('commander')
const Local = require('./methods-local')
const Remote = require('./methods-remote')
const Base = require('./remote-image-base')
program.version('1.0.0')
program
    .command('init')
    .description('init application config')
    .action(async function () {
        //await Local.init()
        await Base.init()
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
        let isRemoteBase = true;
        await Base.check_package();
        // let isRemoteBase = await Base.existsRemoteImage(config_json, ssh);
        // if (isRemoteBase === false) {
        //     const result_init = await Base.initHost(config_json, ssh)
        //     if (result_init === false) {
        //         ssh.dispose()
        //         return false
        //     }

        //     const result_uptoserver = await Base.upToServer(config_json, ssh)
        //     if (result_uptoserver === false) {
        //         ssh.dispose()
        //         return false
        //     }

        //     const buildImage = await Base.buildImage(config_json, ssh)
        //     if (buildImage === false) {
        //         ssh.dispose()
        //         return false
        //     }
        // }

        const local_build = await Local.build();
        if (!local_build) {
            ssh.dispose()
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

        const result_docker_uptoserver = await Base.upToServer(config_json, ssh)
        if (result_docker_uptoserver === false) {
            ssh.dispose()
            return false
        }

        const buildImage = await Base.buildImage(config_json, ssh)
        if (buildImage === false) {
            ssh.dispose()
            return false
        }

        const result_runApp = await Remote.runAppNotBuild(config_json, ssh,isRemoteBase)
        if (result_runApp === false) {
            ssh.dispose()
            return false
        }


        const result_clean_image = await Remote.clean(config_json, ssh)
        if (result_clean_image === false) {
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

program
    .command('restart')
    .option('-c, --config [type]', 'Config File')
    .description('init application config')
    .action(async function () {
        const config =
            this.config !== undefined && this.config !== true
                ? this.config
                : 'config.json'
        const config_json = Remote.config(config)
        const ssh = await Remote.connect(config_json)
        await Remote.restart(config_json, ssh)
        console.log('------- STOP SUCCESS -------')
        ssh.dispose()
    })

program
    .command('reload')
    .option('-c, --config [type]', 'Config File')
    .description('init application config')
    .action(async function () {
        const config =
            this.config !== undefined && this.config !== true
                ? this.config
                : 'config.json'
        const config_json = Remote.config(config)
        const ssh = await Remote.connect(config_json)
        await Remote.reload(config_json, ssh)
        console.log('------- STOP SUCCESS -------')
        ssh.dispose()
    })
program
    .command('stop')
    .option('-c, --config [type]', 'Config File')
    .description('init application config')
    .action(async function () {
        const config =
            this.config !== undefined && this.config !== true
                ? this.config
                : 'config.json'
        const config_json = Remote.config(config)
        const ssh = await Remote.connect(config_json)
        await Remote.stop(config_json, ssh)
        console.log('------- STOP SUCCESS -------')
        ssh.dispose()
    })

program
    .command('clean')
    .option('-c, --config [type]', 'Config File')
    .description('init application config')
    .action(async function () {
        const config =
            this.config !== undefined && this.config !== true
                ? this.config
                : 'config.json'
        const config_json = Remote.config(config)
        const ssh = await Remote.connect(config_json)
        await Remote.clean(config_json, ssh)
        console.log('------- CLEAN SUCCESS -------')
        ssh.dispose()
    })

program
    .command('delete')
    .option('-c, --config [type]', 'Config File')
    .description('init application config')
    .action(async function () {
        const config =
            this.config !== undefined && this.config !== true
                ? this.config
                : 'config.json'
        const config_json = Remote.config(config)
        const ssh = await Remote.connect(config_json)
        await Remote.delete(config_json, ssh)
        console.log('------- DELETE SUCCESS -------')
        ssh.dispose()
    })

program.parse(process.argv)
