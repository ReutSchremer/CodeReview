'use strict';

import HooksRepository from './HooksRepository'
import PlatformHandler from "./../../../tools/client/PlatformHandler"

class HooksFactory {
    hooksRepository = null;
    constructor() {
        this.hooksRepository = new HooksRepository();
        this.initRepository()


    }

    async initRepository() {
        try {
            let modulesList = require(`./../../../../consts/ModulesConfig.json`).modulesList;
            let modulePlatform = require("./modulePlatform").default
            let moduleInstance = null;
            this.platformOptions = PlatformHandler.getPlatformOptions()
            if (modulesList) {
                for (let moduleName of modulesList) {
                    try {
                       
                        moduleInstance = modulePlatform[`${moduleName}_${this.platformOptions.suffix}`];
                        // switch (this.platformOptions.suffix) {
                        //     case "rn": {
                        //         moduleInstance = modulePlatform[`${moduleName}_${this.platformOptions.suffix}`]
                        //         // moduleInstance = moduleInstance
                        //         break;
                        //     }
                        //     case "web": {
                        //         moduleInstance = await import(`./../../../${moduleName}/consts/HooksList_web`);
                        //         moduleInstance = moduleInstance.default
                        //         break;
                        //     }
                        //     case "cordova": {
                        //         moduleInstance = await import(`./../../../${moduleName}/consts/HooksList_cordova`);
                        //         moduleInstance = moduleInstance.default
                        //         break;
                        //     }
                        //     default: {
                        //         moduleInstance = await import(`./../../../${moduleName}/consts/HooksList`);
                        //         moduleInstance = moduleInstance.default
                        //     }
                        // }
                        new moduleInstance(this.hooksRepository).addHooks()

                    } catch (err) {
                        // console.log("err fromhooksfactory");
                    }

                }
            }
        }
        catch (error) {
            console.log("error", error)
        }
    }



    getRepository() {
        if (this.hooksRepository) {
            return this.hooksRepository;
        }

    }
}
export default new HooksFactory();
