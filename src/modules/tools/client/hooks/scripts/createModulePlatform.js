// example:
// export default ModulePlatform = {
//     auth_rn: require('./../../../auth/consts/HooksList_rn')
// }

const fs = require('fs');
const path = require('path');

let modulesList = require(`../../../../../consts/ModulesConfig.json`).modulesList;
const platforms = ['rn', 'web', 'cordova'];
const filePath = '../modulePlatform.js';

//hl == hook list
let hlPath;
let hlPathRelativeToMdl;

let modulePlatformObj = {}
fs.writeFileSync('../modulePlatform.js', "const ModulePlatform = { \n")

let hlFileName = "" //combine module name + platform name
modulesList.forEach(mdl => {
    platforms.forEach(plt => {
        try {
            hlPathRelativeToMdl = `${mdl}/consts/HooksList_${plt}.js`
            hlPath = path.join(__dirname, `./../../../../${hlPathRelativeToMdl}`);
            if (fs.existsSync(hlPath)) {
                console.log("write to file -",hlPathRelativeToMdl)
                hlFileName = `${mdl}_${plt}`;
                fs.appendFileSync(filePath, `${hlFileName}: require${`('./../../../${hlPathRelativeToMdl}').default,\n`}`)
            }
        } catch (err) { console.log("err", mdl) }
    });
});

fs.appendFileSync('../modulePlatform.js', "}")
fs.appendFileSync('../modulePlatform.js', "\nexport default ModulePlatform")

// modulePlatformObj = JSON.stringify(modulePlatformObj);
// console.log(modulePlatformObj)
