const EnvHandler = require('./../../../tools/server/lib/EnvHandler');
const logFile = require('debug')('model:file');

module.exports = function (BaseAudios) {

    BaseAudios.observe('loaded', function (ctx, next) {
        let fData = null;
        if (ctx.instance) {
            fData = ctx.instance;
        }
        else {
            const hostName = EnvHandler.getHostName();
            fData = ctx.data;
            fData.path = `${hostName}/audios/${fData.category}/${fData.id}.${fData.format}`;
        };
        ctx.data = fData;
        next();
    });

    // BaseAudios.overrideSaveFile = async function (file, FileModel, ownerId = null, fileId = null) {
    //     logFile("BaseAudios.overrideSaveFile is launched")
    // }
};
