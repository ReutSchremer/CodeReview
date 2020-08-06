const path = require('path');
const fs = require('fs');
const Consts = require('../../consts/Consts.json');
const ModulesConfig = require('../../../../consts/ModulesConfig');
const config = ModulesConfig.fileshandler;
const logFile = require('debug')('model:file');

module.exports = class FileProperties {

    static getSaveDir(type) {
        logFile("type", type)
        try {
            //also on production we save into public (and not to build because the file can get delete from 'build')
            const baseFileDirPath = '../../../../../public';
            const saveDir = path.join(__dirname, `${baseFileDirPath}/${Consts.FOLDERS[type]}/`);
            if (!fs.existsSync(saveDir)) {//create dir if dosent exist.
                fs.mkdirSync(saveDir, { recursive: true });
                logFile("New folder was created ", saveDir);
            }
            return saveDir;
        } catch (err) {
            logFile("Err creating a base folder for our files :(", err);
            return;
        }
    }

    static getRegex(extension) {
        /* 
        Instruction for supporting a new file format:

        1. In consts/Consts.json:
            - Add to the right array at FILE_EXTENSION the new format
            - Add to FILE_MIMES {<format>: <mime_type>},
              if there are different mime_types for the same format, put them in an array

        2. In server/lib/FileProperties.js:
            - Add to FILE_REGEXS at getRegex(), {<format>: <regex>}.
              The regex is derived from the first line of the file's base64 string.
              If there are different mime_types for the same format,
              there will be different first first lines in base64,
              therefore, create one regex that includes all of them. (for example, webm).

        3. In alters.sql:
            - Add the new format as an enum option at 'format' column of the right table (Images/Audio/Video/Files)
            - Apply this change to the SQL database
        */
        const FILE_REGEXS = {
            "pdf": /^data:application+\/pdf?;base64,/,
            "doc": /^data:application+\/msword?;base64,/,
            "docx": /^data:application+\/vnd.openxmlformats-officedocument.wordprocessingml.document?;base64,/,
            "jpg":  /^data:image\/jpeg;base64,/,
            "png": /^data:image+\/png?;base64,/,
            "jpeg": /^data:image+\/jpeg?;base64,/,
            "gif": /^data:image+\/gif?;base64,/,
            "svg": /^data:image+\/svg+\++\xml;base64,?/,
            "mp3": /^data:(audio+\/mp3?|application\/octet-stream);base64,/,
            "m4a": /^data:audio\/x-m4a;base64,/,
            "wav": /^data:(audio+\/wav?|audio\/x-wav);base64,/,
            "mpeg": /^data:audio\/mpeg;base64,/,
            "webm": /^data:(video|audio)\/[a-zA-Z0-9?><;,{}[\]\-_+=!@#$%\^&*|']+;base64,/,
            "mp4": /^data:video+\/mp4?;base64,/,
            "ogg": /^data:video+\/ogg?;base64,/,
            "avi": /^data:video+\/avi?;base64,/,
            "mov": /^data:video\/quicktime;base64,/
        };
        if (!Object.keys(FILE_REGEXS).includes(extension)) return null;
        return FILE_REGEXS[extension];
    }

    static getFileExtension(fileSrc, fileType) {
        let mimeType = this.base64MimeType(fileSrc);
        logFile("Base64 mimeType of file", mimeType);
        if (!mimeType) return null;
        let extension = this.getExtensionOfMime(mimeType, fileType);
        return extension;
    }

    static getExtensionOfMime(mimeType, fileType) {
        let extensions = Consts.FILE_EXTENSIONS[fileType];
        for (let extension of extensions) {
            let mimeOrMimes = Consts.FILE_MIMES[extension];
            if (Array.isArray(mimeOrMimes)) {
                if (mimeOrMimes.includes(mimeType)) return extension;
                continue;
            }
            if (mimeOrMimes === mimeType) return extension;
        }
        return null;
    }

    static getMimeOfExtension(extension) {
        if (!extension) return null;
        let mimeType = Consts.FILE_MIMES[extension];
        if (Array.isArray(mimeType)) {
            logFile("mimeType", mimeType)
            return mimeType[0];
        }
        return mimeType;
    }

    static base64MimeType(encodedString) {
        if (typeof encodedString !== 'string') return null;

        var mime = encodedString.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        if (mime && mime.length) return mime[1];
        return null;
    }

    static base64FileSizeInKB(encodedString) {
        if (typeof encodedString !== 'string') return null;

        let length = encodedString.length;
        let twoLastChars = encodedString.slice(length - 2, length);
        let count = 0;
        for (let char in twoLastChars) if (char === "=") count++;
        let sizeInBytes = (3 * (length / 4)) - count;
        let sizeInKB = sizeInBytes / 1000;

        return sizeInKB;
    }

    static async isFileSizeInRange(file) {
        logFile("isFileSizeInRange is launched")
        logFile("base64 first line", file.src.slice(0, 50));
        let extension = this.getFileExtension(file.src, file.type);
        logFile("extension", extension);
        if (!extension) return false;
        let regex = this.getRegex(extension);
        logFile("regex", regex);
        if (!regex) return false;

        let sizeKB = this.base64FileSizeInKB(file.src);
        logFile("sizeKB", sizeKB)

        if (sizeKB < config.FILE_SIZE_RANGE_IN_KB[file.type].MIN_SIZE) {
            logFile("ERROR: File is too small");
            return false;
        }

        if (sizeKB > config.FILE_SIZE_RANGE_IN_KB[file.type].MAX_SIZE) {
            logFile("ERROR: File is too big");
            return false;
        }
        return true;
    }
}
