import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import Consts from '../../../consts/Consts.json';
import { fileshandler as config } from '../../../../../consts/ModulesConfig';
import Tooltip from '@material-ui/core/Tooltip';
import './MultiFilesUploader.scss';

export default class MultiFilesUploader extends Component {
    constructor(props) {
        super(props);

        this.state = {
            filesData: []
        };

        this.filesPreviews = [];
        this.isOverFilesNumLimit = false;

        this.type = Consts.FILE_TYPES.includes(this.props.type) ?
            this.props.type : Consts.FILE_TYPE_IMAGE;

        this.acceptedExtensions = this.getAcceptedExtensions();
        this.acceptedMimes = this.getAcceptedMimes();

        this.minSizeInBytes = (this.props.minSizeInKB && this.props.minSizeInKB > config.FILE_SIZE_RANGE_IN_KB[this.type].MIN_SIZE ?
            this.props.minSizeInKB : config.FILE_SIZE_RANGE_IN_KB[this.type].MIN_SIZE) * 1000;

        this.maxSizeInBytes = (this.props.maxSizeInKB && this.props.maxSizeInKB < config.FILE_SIZE_RANGE_IN_KB[this.type].MAX_SIZE ?
            this.props.maxSizeInKB : config.FILE_SIZE_RANGE_IN_KB[this.type].MAX_SIZE) * 1000;
    }

    onDrop = async (acceptedfiles, rejectedFiles) => {
        console.log("acceptedfiles", acceptedfiles)
        console.log("rejectedFiles", rejectedFiles)

        let filesData = [...this.state.filesData];

        for (let i = 0; i < acceptedfiles.length; i++) {
            if (filesData.length >= config.MULTI_FILES_LIMIT) { this.isOverFilesNumLimit = true; break; }
            let base64String = await this.readFileToBase64(acceptedfiles[i]);

            let fileObj = {
                src: base64String,
                type: this.type,
                title: this.props.title || "default_title",
                category: this.props.category || "default_category",
                description: this.props.description || "default_description",
                isMultiSizes: this.props.isMultiSizes || false
            };

            let filePreview = await this.getFilePreviewObj(acceptedfiles[i], base64String, Consts.FILE_ACCEPTED);

            filesData.push({ previewObj: filePreview, acceptedObj: fileObj });
        }

        for (let i = 0; i < rejectedFiles.length; i++) {
            if (filesData.length >= config.MULTI_FILES_LIMIT) { this.isOverFilesNumLimit = true; break; }
            if (!this.acceptedMimes.includes(rejectedFiles[i].type)) continue;

            let filePreview = await this.getFilePreviewObj(rejectedFiles[i], null, Consts.FILE_REJECTED, Consts.ERROR_MSG_FILE_TOO_BIG);

            filesData.push({ previewObj: filePreview });
        }

        // Display previews of dropped files and calls the onChange callback with the accepted files
        this.setState({ filesData }, this.parentOnChange);
    };

    getFilesData = () => {
        let filesData = this.state.filesData;
        let acceptedFilesObj = [];
        let isThereRejectedFiles = false;

        for (let i = 0; i < filesData.length; i++) {
            if (filesData[i].acceptedObj)
                acceptedFilesObj.push(filesData[i].acceptedObj);
            else isThereRejectedFiles = true;
        }

        return [acceptedFilesObj, isThereRejectedFiles];
    }

    readFileToBase64 = (fileInfo) => {
        return new Promise((resolve, reject) => {
            if (fileInfo) {

                var FR = new FileReader();
                FR.addEventListener("load", function (e) {
                    resolve(e.target.result);
                });

                FR.readAsDataURL(fileInfo);
            }
            else reject("no file");
        })
    }

    getAcceptedExtensions = () => {
        let accept = Consts.FILE_EXTENSIONS[this.type];
        accept = "." + accept.join(", .");
        return accept;
    }

    getAcceptedMimes = () => {
        let extensions = Consts.FILE_EXTENSIONS[this.type];
        let mimes = [];
        for (let i = 0; i <= extensions.length; i++) {
            let extension = extensions[i];
            let mimeOrMimes = Consts.FILE_MIMES[extension];
            if (Array.isArray(mimeOrMimes)) mimes = [...mimes, ...mimeOrMimes];
            else mimes.push(mimeOrMimes);
        }
        return mimes;
    }

    getExtension = (mime) => {
        let extensions = Consts.FILE_EXTENSIONS[this.type];
        for (let extension of extensions) {
            let mimeOrMimes = Consts.FILE_MIMES[extension];
            if (Array.isArray(mimeOrMimes)) {
                if (mimeOrMimes.includes(mime)) return extension;
                continue;
            }
            if (mimeOrMimes === mime) return extension;
        }
        return null;
    }

    getFilePreviewObj = async (file, base64String = null, status, errMsg = null) => {
        let preview = null;
        let extension = null;

        if (this.type === Consts.FILE_TYPE_FILE) {
            preview = file.name;
            extension = this.getExtension(file.type);
        }
        else {
            if (!base64String) base64String = await this.readFileToBase64(file);
            preview = base64String;
        }

        let filePreview = {
            preview: preview,
            extension: extension,
            status: status,
            errMsg: errMsg
        };

        return filePreview;
    }

    getFilePreview = (file, index) => {
        let filePreview = null;

        switch (this.type) {
            case Consts.FILE_TYPE_FILE:
                filePreview =
                    <div>
                        <img src={require(`../../../imgs/fileThumbnails/${file.extension}-file-thumbnail.svg`)} />
                        <h2>{file.preview.length <= 11 ? file.preview : (file.preview.slice(0, 8) + "...")}</h2>
                    </div>;
                break;

            case Consts.FILE_TYPE_IMAGE:
                filePreview = <img src={file.preview} />;
                break;


            case Consts.FILE_TYPE_VIDEO:
                filePreview = <video src={file.preview} type={"video/*"} />;
                break;


            case Consts.FILE_TYPE_AUDIO:
                filePreview = <audio controls src={file.preview} type={"audio/*"} />;
                break;


            default:
                filePreview = null;
                break;
        }

        return (
            <div className="file-preview ">
                <div className={`thumb ${this.type}-thumb`}>
                    <div className='thumb-inner'>
                        {filePreview}
                    </div>
                </div>
                {!this.props.disabled && <div className="remove-icon" onClick={() => this.removeFile(index)}>
                    <img src={require('../../../imgs/x-icon.png')} alt="x" />
                </div>}
                {file.status === Consts.FILE_REJECTED &&
                    <div className="error-icon">
                        <Tooltip title={file.errMsg} placement="left" className="tool-tip">
                            <img src={require('../../../imgs/error.svg')} alt={file.errMsg} />
                        </Tooltip>
                    </div>}
            </div>
        )
    }

    removeFile = (fileIndex) => {
        let filesData = this.state.filesData;
        filesData.splice(fileIndex, 1);
        if (filesData.length < config.MULTI_FILES_LIMIT) this.isOverFilesNumLimit = false;
        this.setState({ filesData }, this.parentOnChange);
    }

    parentOnChange = () => {
        let [acceptedFilesObj, isThereRejectedFiles] = this.getFilesData();

        let errorMsg = null;
        if (this.isOverFilesNumLimit) errorMsg = Consts.ERROR_MSG_FILES_NUM_LIMIT.replace('%', config.MULTI_FILES_LIMIT);
        else if (isThereRejectedFiles) errorMsg = Consts.ERROR_MSG_SOME_FILES;

        let eventObj = {
            target: {
                name: this.props.name || "multiFilesUploader",
                value: acceptedFilesObj
            },
            error: errorMsg
        };

        // Calls the onChange callback with the accepted files ang an errMsg if there was rejected files
        this.props.onChange && this.props.onChange !== "function" && this.props.onChange(eventObj);
    }

    replaceAll = (str, a, b) => {
        return str.split(a).join(b);
    }

    render() {
        /* After every drop, the component is rendered twice due to usage of Dropzone,
        the following condition is to prevent unnecessary updates of filesPreviews */
        this.filesPreviews = this.state.filesData.length !== this.filesPreviews.length || this.props.disabled ?
            this.state.filesData.map((file, i) => (
                <div key={i}>
                    {this.getFilePreview(file.previewObj, i)}
                </div>
            )) : this.filesPreviews;

        return (
            <div className="multi-files-uploader">
                <Dropzone
                    onDrop={this.onDrop}
                    accept={this.acceptedExtensions}
                    minSize={this.minSizeInBytes}
                    maxSize={this.maxSizeInBytes}
                    noClick={this.props.noClick}
                    noDrag={this.props.noDrag}
                    noKeyBoard={this.props.noKeyBoard}
                    disabled={this.props.disabled || this.isOverFilesNumLimit}>

                    {({ getRootProps, getInputProps, isDragActive }) => {
                        let classNames = `dropzone ${isDragActive && 'drag-active'}`;

                        return (
                            <section className="container">
                                <div {...getRootProps({ className: classNames })}>
                                    <input {...getInputProps()} />
                                    <p>{this.isOverFilesNumLimit ?
                                        Consts.ERROR_MSG_FILES_NUM_LIMIT.replace('%', config.MULTI_FILES_LIMIT) :
                                        (this.props.label || this.replaceAll(Consts.MULTI_FILES_DEFAULT_MSG, '%', this.type))}</p>
                                </div>
                                <aside className='file-previews-container'>
                                    {this.filesPreviews}
                                </aside>
                            </section>)
                    }}
                </Dropzone>
            </div>
        )
    }
}