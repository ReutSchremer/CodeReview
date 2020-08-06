'use strict';
const path = require('path');
const fs = require('fs');
const Consts = require('../../consts/Consts.json');
const logFile = require('debug')('model:file');
const FileProperties = require('../lib/FileProperties');
const to = (promise) => {
    return promise.then(data => {
        return [null, data];
    })
        .catch(err => [err]);
}

module.exports = function FilesHandler(Model) {

    Model.getFileModelOfFile = function (file) {
        if (!file.type) return logFile("ERROR: No file type");
        let FileModel = Model.app.models[Consts.FILE_MODEL_NAME[file.type]];
        let fileModelName = Consts.FILE_MODEL_NAME_IN_RECORDS_PERMISSIONS[file.type];
        return [FileModel, fileModelName];
    }

    // Deletes file from direcory and not it's reference at models
    Model.deleteFile = async function (prevFileId, FileModel) {
        logFile("Model.deleteFile is launched now with prevFileId: ", prevFileId);

        let [prevFileErr, prevFileRes] = await to(FileModel.findOne({ where: { id: prevFileId } }));
        if (prevFileErr || !prevFileRes) { logFile("Error finding previous file path", prevFileErr); return null; }

        const isProd = process.env.NODE_ENV == 'production';
        //also on production we save into public (and not to build because the file can get delete from 'build')
        const baseFileDirPath = '../../../../../public';
        let filePath = prevFileRes.path;
        if (!isProd) filePath = filePath.replace('http://localhost:8080', '');

        try {
            const fullFilePath = path.join(__dirname, `${baseFileDirPath}${filePath}`);
            const shortFilePath = fullFilePath.split('/');
            const fileName = shortFilePath[shortFilePath.length - 1];
            const fileId = fileName.split('.')[0];
            if (!fs.existsSync(fullFilePath)) return fileId;
            fs.unlinkSync(fullFilePath);
            logFile("File with path %s was successfully removed (deleted)", fullFilePath);
            return fileId;
        } catch (err) {
            logFile("Error deleting file", err);
            return null;
        }
    }

    // Saves file at directory and create a reference at FileModel
    Model.saveFile = async function (file, FileModel, ownerId = null, fileId = null) {
        logFile("Model.saveFile is launched with ownerId", ownerId);
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

        let fileObj = {
            category: file.category ? file.category : 'uploaded',
            owner: ownerId,
            format: extension,
            title: file.title,
            description: file.description,
            dontSave: true, // don't let afterSave remote do anything- needed?
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

            let fileTargetPath = specificSaveDir + newFile.id + "." + extension;
            fs.writeFileSync(fileTargetPath, base64Data, 'base64');

        } catch (err) {
            logFile("Err", err);
        }

        logFile("New file was created of type (%s) on path (%s)", file.type);
        logFile("New file id", newFile.id)
        return newFile.id;
    }

    Model.handleEmptyRow = async function (file, fileKey, modelInstance, FileModel, newRes, isMultiFilesSave, isEmptyRowHandled) {
        let toHandleEmptyRow = !isEmptyRowHandled.val && FileModel === Model;
        logFile("toHandleEmptyRow", toHandleEmptyRow)
        let isUpdateFile = modelInstance[fileKey] && typeof modelInstance[fileKey] === "number";
        logFile("isUpdateFile", isUpdateFile)
        let oldFileId = null;

        if (!file.src) { // file not in size range
            if (isUpdateFile) toHandleEmptyRow = false;

            if (toHandleEmptyRow) {
                /* If the first file we want to upload (not update) to the same model as the remoteModel
                is not in size range, we need to delete the empty instance */
                let [modelErr, modelRes] = await to(Model.destroyById(modelInstance.id));
                if (modelErr || !modelRes) return logFile("Error deleting empty row in Images model, aborting...", modelErr);
                logFile("Empty row in FileModel is deleted");
                isEmptyRowHandled.val = true;
            }

            Model.updateNewRes({ id: null, type: file.type, status: Consts.FILE_REJECTED }, fileKey, newRes, isMultiFilesSave);
            logFile("The size of file with key %s is not in range. Canceling...", fileKey, "file", file);
        }
        else { // file in size range
            if (isUpdateFile) {
                FileModel.overrideDeleteFile && typeof FileModel.overrideDeleteFile === "function" ?
                    oldFileId = await FileModel.overrideDeleteFile(modelInstance[fileKey], FileModel) :
                    oldFileId = await Model.deleteFile(modelInstance[fileKey], FileModel);
                toHandleEmptyRow = false;
            }

            if (toHandleEmptyRow) {
                oldFileId = modelInstance.id;
                isEmptyRowHandled.val = true;
            }
        }

        logFile("FileId right before saveFile is launched is", oldFileId);
        return oldFileId;
    }

    Model.saveFileWithPermissions = async function (file, fileKey, fileOwnerId, filesToSave, modelInstance, ctx, newRes, isEmptyRowHandled, isMultiFilesSave = false) {

        let [FileModel, FileModelName] = Model.getFileModelOfFile(file, Model);
        logFile("FileModel - Should be either Images/Files/Audio/Video", FileModelName);

        let oldFileId = await Model.handleEmptyRow(file, fileKey, modelInstance, FileModel, newRes, isMultiFilesSave, isEmptyRowHandled);

        let newFileId = null;

        FileModel.overrideSaveFile && typeof FileModel.overrideSaveFile === "function" ?
            newFileId = await FileModel.overrideSaveFile(file, FileModel, fileOwnerId, oldFileId) :
            newFileId = await Model.saveFile(file, FileModel, fileOwnerId, oldFileId);

        if (!newFileId) return logFile("Couldn't create your file, aborting...");

        Model.updateNewRes({ id: newFileId, type: file.type, status: Consts.FILE_ACCEPTED }, fileKey, newRes, isMultiFilesSave);

        if (isMultiFilesSave) {
            let relations = Model.relations;
            if (!relations) return logFile("No relations, couldn't save new file id reference in modelThrough...");
            for (let relationName in relations) {
                let relation = relations[relationName];
                if (relation.type !== "hasMany") continue;
                if (relation.modelTo !== FileModel) continue;
                if (relation.keyThrough !== fileKey) continue;

                let modelThrough = relation.modelThrough;
                let keyTo = relation.keyTo;

                let newModelThroughInstance = { created: Date.now(), modified: Date.now() };
                newModelThroughInstance[keyTo] = modelInstance.id;
                newModelThroughInstance[fileKey] = newFileId;

                // If [fileKey] doesn't exist in Model then don't upsert
                let modelThroughProperties = modelThrough.definition.properties;
                if (!modelThroughProperties || typeof modelThroughProperties !== "object") return logFile("No properties object, couldn't save new file id reference in modelThrough...");
                if (!Object.keys(modelThroughProperties).includes(fileKey)) return logFile(`The field "${fileKey}" doesnt exist in modelThrough ${modelThrough}, skipping upsert to that field...`);

                // Creating a new row at modelThrough to include the relation between the newModelInstance & newFile
                let [modelTroughErr, modelTroughRes] = await to(modelThrough.create(newModelThroughInstance));
                if (modelTroughErr || !modelTroughRes) return logFile("Error creating new instance in modelThrough, aborting...", modelTroughErr);
                logFile(`New row created at model ${modelThrough.name} with ${keyTo}=${modelInstance.id}, ${fileKey}=${newFileId}`);
            }
        }
        else {
            // If [fileKey] doesn't exist in Model then don't upsert
            let [findErr, findRes] = await to(Model.findOne({ where: { id: modelInstance.id } }));
            if (findErr || !findRes) return logFile("Error finding field, aborting...", findErr);

            if (typeof findRes !== 'object') return;
            let findResKeys = (findRes && findRes.__data) ? Object.keys(findRes.__data) : Object.keys(findRes);
            if (!findResKeys) return;
            if (!findResKeys.includes(fileKey)) { logFile(`The field "${fileKey}" doesnt exist in model, skipping upsert to that field...`); }
            else {
                // logFile('modelInstance', modelInstance)
                // Updating the row to include the id of the file added
                let [upsertErr, upsertRes] = await to(Model.upsertWithWhere(
                    { id: modelInstance.id }, { [fileKey]: newFileId }
                ));
                logFile("Updated model with key,val:%s,%s", fileKey, newFileId);

                if (upsertErr) return logFile(`Error upserting field "${fileKey}", aborting...`, upsertErr);
            }
        }

        // giving the owner of the file/image permission to view it
        const rpModel = Model.app.models.RecordsPermissions;
        let rpData = {
            model: FileModelName,
            recordId: newFileId,
            principalType: Consts.USER,
            principalId: fileOwnerId,
            permission: Consts.ALLOW
        }
        let [rpErr, rpRes] = await to(rpModel.findOrCreate(rpData));
        logFile("New permission row is created on RecordsPermissions model with data", rpData);
        if (rpErr) return logFile(`Error granting permissions to file owner, aborting...`, rpErr);

        //calling a custom remote method after FilesHandler is done
        let afhData = { model: FileModelName, recordId: newFileId, principalId: fileOwnerId, fileKey };
        Model.afterFilesHandler && await Model.afterFilesHandler(afhData, oldFileId, modelInstance, ctx);
    }

    Model.beforeRemote('*', function (ctx, modelInstance, next) {

        logFile("Model.beforeRemote is launched", ctx.req.method);
        if (ctx.req.method !== "POST" && ctx.req.method !== "PUT" && ctx.req.method !== "PATCH")
            return next()

        let args = ctx.args;
        let data, field, key;

        (async () => {
            const argsKeys = Object.keys(args);

            // we are not using map funcs, because we cannot put async inside it.
            for (let i = 0; i < argsKeys.length; i++) {
                field = argsKeys[i];
                if (field === "options") continue;
                data = args[field];
                if (!data || typeof data !== "object" || Array.isArray(data)) continue;
                const dataKeys = Object.keys(data);

                for (let j = 0; j < dataKeys.length; j++) {
                    key = dataKeys[j];
                    let keyData = data[key];
                    if (!keyData || typeof keyData !== "object") continue;

                    let isFileInRange = true;

                    if (!Array.isArray(keyData)) {
                        if (!keyData.src || !keyData.type) continue;
                        isFileInRange = await FileProperties.isFileSizeInRange(keyData);
                        keyData.src = isFileInRange ? keyData.src : null;
                        logFile('isFileInRange', isFileInRange)
                    }
                    else { // keyData is an array
                        if (!keyData.every(val =>
                            (typeof val === "object" && val.src && val.type))) continue; // the arr is not from multiFilesHandler

                        for (let z = 0; z < keyData.length; z++) {
                            isFileInRange = await FileProperties.isFileSizeInRange(keyData[z]);
                            keyData[z].src = isFileInRange ? keyData[z].src : null;
                            logFile("isFileInRange", isFileInRange)
                        }
                    }

                    // take the data in dataObj and put it in obj called filesToSave inside dataObj
                    // so we can later take it and add it to the file/img/audio table
                    let filesToSave = ctx.args[field].filesToSave || {};
                    if (keyData.length) {
                        filesToSave[key] = keyData;
                        ctx.args[field]["filesToSave"] = filesToSave;
                        ctx.args[field][key] = null;
                    }
                };
            }

            return next();
        })();
    });

    Model.afterRemote('*', function (ctx, modelInstance, next) {
        logFile("Model.afterRemote(*) is launched", ctx.req.method);
        if (ctx.req.method !== "POST" && ctx.req.method !== "PUT" && ctx.req.method !== "PATCH")
            return next();
        if (!modelInstance) return next();
        modelInstance = modelInstance.success || modelInstance;
        let fileOwnerId = (ctx.args.options && ctx.args.options.accessToken) ?
            ctx.args.options.accessToken.userId : //if there's accessToken use userId
            (Model === Model.app.models.CustomUser ? //else, if we are creating new user use new user's id
                (modelInstance && modelInstance.id) : null);

        logFile("The owner of the file is fileOwnerId", fileOwnerId);
        //Access is always restricted without authentication
        if (!fileOwnerId) { logFile("No owner for this file, aborting..."); return next(); }

        let args = ctx.args;

        (async () => {
            const argsKeys = Object.keys(args);
            let newRes = {};
            let isEmptyRowHandled = { val: false };

            for (let i = 0; i < argsKeys.length; i++) { // we are not using map func, because we cannot put async inside it.

                let field = argsKeys[i];

                logFile("Iterating with field (%s)", field);

                if (field === "options") continue;

                if (!args[field] || !args[field].filesToSave) return next();

                let filesToSave = args[field].filesToSave;

                for (let fileKey in filesToSave) {
                    const fileOrFiles = filesToSave[fileKey];

                    if (Array.isArray(fileOrFiles)) {
                        for (let j = 0; j < fileOrFiles.length; j++) {
                            if (typeof fileOrFiles[j] !== "object") continue;
                            await Model.saveFileWithPermissions(fileOrFiles[j], fileKey, fileOwnerId, filesToSave, modelInstance, ctx, newRes, isEmptyRowHandled, true);
                        }
                    }
                    else {
                        if (typeof fileOrFiles !== "object") continue;
                        await Model.saveFileWithPermissions(fileOrFiles, fileKey, fileOwnerId, filesToSave, modelInstance, ctx, newRes, isEmptyRowHandled, false);
                        logFile("isEmptyRowHandled", isEmptyRowHandled)
                    }
                }
            }

            Model.updateRes(newRes, ctx);
            return next();
        })();
    });

    Model.updateRes = function (newRes, ctx) {
        logFile("updateRes is launched")
        let res = (ctx.result && ctx.result.__data) || ctx.result;
        if (!res || !res.filesToSave) return;
        delete res.filesToSave;
        for (let fileKey in newRes) {
            delete res[fileKey];
        }
        res.filesUploadStatus = newRes;
        ctx.result = res;
    }

    Model.updateNewRes = function (fileRes, fileKey, newRes, isMultiFilesSave) {
        if (isMultiFilesSave) {
            if (!(fileKey in newRes)) newRes[fileKey] = [];
            newRes[fileKey].push(fileRes);
        }
        else {
            newRes[fileKey] = fileRes;
        }
    }
}