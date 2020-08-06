var fs = require('fs');
var path = require('path');
const Consts = require('../../consts/Consts.json');
const ModulesConfig = require('../../../../consts/ModulesConfig');
const config = ModulesConfig.fileshandler;
const logFile = require('debug')('model:file');
const https = require('https');
const IMAGES_DIR = 'public/images/';
const EnvHandler = require('./../../../tools/server/lib/EnvHandler');
const FileProperties = require('../lib/FileProperties');
const resizeOptimizeImages = require('resize-optimize-images');
const sizeOf = require('image-size');
const to = (promise) => {
    return promise.then(data => {
        return [null, data];
    })
        .catch(err => [err]);
}

module.exports = function (BaseImages) {

    BaseImages.observe('loaded', function (ctx, next) {
        var fData;
        if (ctx.instance) { // For first upload
            fData = ctx.instance;
        }
        else {
            const hostName = EnvHandler.getHostName();
            fData = ctx.data;

            if (fData.isMultiSizes) {
                fData.multipleSizes = [];
                for (let sign in config.IMAGE_SIZES_IN_PX) {
                    fData.multipleSizes.push(`${hostName}/imgs/${fData.category}/${fData.id}.${sign}.${fData.format}`);
                }
            }
            fData.path = `${hostName}/imgs/${fData.category}/${fData.id}.${fData.format}`;
        };
        ctx.data = fData;
        next();
    });

    // Deletes file from direcory and not it's reference at models
    BaseImages.overrideDeleteFile = async function (prevFileId, FileModel) {
        logFile("BaseImages.overrideDeleteFile is launched now with prevFileId: ", prevFileId);

        let [prevFileErr, prevFileRes] = await to(FileModel.findOne({ where: { id: prevFileId } }));
        if (prevFileErr || !prevFileRes) { logFile("Error finding previous file path", prevFileErr); return null; }

        const isProd = process.env.NODE_ENV == 'production';
        //also on production we save into public (and not to build because the file can get delete from 'build')
        const baseFileDirPath = '../../../../../public';
        let filePaths = [prevFileRes.path];
        if (prevFileRes.isMultiSizes) {
            filePaths = filePaths.concat(prevFileRes.multipleSizes);
        }
        if (!isProd) filePaths = filePaths.map(filePath => filePath.replace('http://localhost:8080', ''));
        let fileId = null;

        try {
            for (let i = 0; i < filePaths.length; i++) {
                let filePath = filePaths[i];
                const fullfilePath = path.join(__dirname, `${baseFileDirPath}${filePath}`);
                if (i === 0) {
                    const shortfilePath = fullfilePath.split('/');
                    const fileName = shortfilePath[shortfilePath.length - 1];
                    fileId = fileName.split('.')[0];
                }
                if (!fs.existsSync(fullfilePath)) continue;
                fs.unlinkSync(fullfilePath);
                logFile("File with path %s was successfully removed (deleted)", fullfilePath);
            }
            return fileId;
        } catch (err) {
            logFile("Error deleting file", err);
            return null;
        }
    }

    BaseImages.overrideSaveFile = async function (file, FileModel, ownerId = null, fileId = null) {
        logFile("BaseImages.overrideSaveFile is launched with ownerId", ownerId);
        let saveDir = FileProperties.getSaveDir(file.type);
        if (!saveDir) return false;
        let extension = FileProperties.getFileExtension(file.src, file.type);
        logFile("extension", extension);
        if (!extension) return false;
        let regex = FileProperties.getRegex(extension);
        logFile("regex", regex);
        if (!regex) return false;
        let base64Data = file.src.replace(regex, ''); // regex = /^data:[a-z]+\/[a-z]+\d?;base64,/
        logFile("\nownerId", ownerId);

        if (file.isMultiSizes) {
            let width = await getImgWidth(base64Data);
            if (width < config.IMAGE_SIZES_IN_PX[Consts.IMAGE_MEDIUM_SIGN]) {
                logFile("ERROR: Image is too small for multipleSizes");
                file.isMultiSizes = false;
            }
        }

        let fileObj = {
            category: file.category ? file.category : 'uploaded',
            owner: ownerId,
            format: extension,
            title: file.title,
            description: file.description,
            isMultiSizes: file.isMultiSizes ? true : false, // file.isMultiSizes might be undefiend
            dontSave: true // don't let afterSave remote do anything- needed?
        };

        /* If we are posting to and from the same model,
        the instance was already created in the remote so we just update it */
        if (fileId !== null) fileObj.id = fileId;

        logFile("fileObj before save", fileObj);

        let specificSaveDir = saveDir + fileObj.category + "/";
        let [err, newFile] = await to(FileModel.upsert(fileObj));
        if (err) { console.error("Error creating file, aborting...", err); return false }
        logFile("New entry created for model ", file.type, newFile);

        try {
            if (!fs.existsSync(specificSaveDir)) {//create dir if dosent exist.
                fs.mkdirSync(specificSaveDir, { recursive: true });
                logFile("New folder was created ", specificSaveDir);
            }

            if (file.isMultiSizes) {
                for (let sign in config.IMAGE_SIZES_IN_PX) {
                    let fileTargetPath = `${specificSaveDir + newFile.id}.${sign}.${extension}`
                    fs.writeFileSync(fileTargetPath, base64Data, 'base64');
                    resizeImg(fileTargetPath, config.IMAGE_SIZES_IN_PX[sign]);
                }
            }
            let fileTargetPath = specificSaveDir + newFile.id + "." + extension;
            fs.writeFileSync(fileTargetPath, base64Data, 'base64');

        } catch (err) {
            logFile("Err", err);
        }

        logFile("New file was created of type (%s) on path (%s)", file.type);
        logFile("New file id", newFile.id)
        return newFile.id;
    }

    /* This function gets url and data of online image, and copies this image to our server.
    It also register this image to Image table. */
    BaseImages.downloadToServer = function (data, options, cb) {

        //DEPRECATED UNTIL WILL BE SECURED (Eran)
        return cb(null, {});

        let saveDir = path.join(__dirname, '../', '../', IMAGES_DIR, data.category);
        let extention = path.extname(data.url).substr(1);
        console.log("data!!", data)
        let imgObj = {
            category: data.category,
            owner: options.accessToken ? options.accessToken.userId : null,
            format: extention,
            created: Date.now(),
            dontSave: true,// dont let afterSave remote do anything
            title: data.title
        };
        BaseImages.create(imgObj, (err, res) => {
            if (err) {
                console.log("error on create record!", err);
                return cb(err.message);
            }
            let saveFile = path.join(saveDir, `/${res.id}.${extention}`);
            if (!fs.existsSync(saveDir))
                fs.mkdirSync(saveDir, { recursive: true });
            var file = fs.createWriteStream(saveFile);
            https.get(data.url, function (response) {
                try {
                    response.pipe(file);
                    return cb(null, res);
                }
                catch (error) {
                    console.error("ERROR", error.message);
                    return cb(error.message);
                }
            });
        });
    };

    BaseImages.getUsersImages = function (filter, options, cb) {
        try {
            let userId = options.accessToken.userId;
            filter = filter ? JSON.parse(filter) : {};
            return BaseImages.find({ where: { owner: userId }, ...filter }, options, (err, res) => {
                if (err) return cb(err)
                res.forEach(image => {
                    BaseImages.owner = null;
                });
                return cb(null, res);
            });
        }
        catch (err) {
            return cb(null, []); //no userid return empty
        }
    }

    BaseImages.remoteMethod('downloadToServer', {
        http: {
            verb: 'post'
        },
        accepts: [
            { arg: 'data', type: 'object' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'res', type: 'object', root: true }
    });

    BaseImages.remoteMethod('getUsersImages', {
        http: {
            verb: 'get'
        },
        description: "***REMOTE*** filter images to user",
        accepts: [
            { arg: 'filter', type: 'string' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'res', type: 'object', root: true }
    });
};

async function resizeImg(imgPath, width) {
    const options = {
        images: [imgPath],
        width: width
    };

    await resizeOptimizeImages(options);
}

async function getImgWidth(base64Data) {
    let img = new Buffer(base64Data, 'base64');
    let dimensions = sizeOf(img);
    logFile("image dimensions", dimensions);
    return dimensions.width;
}