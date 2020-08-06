import React, { Component } from 'react';
import Auth from '../../../auth/Auth';
import MultiFilesUploader from '../../client/components/multi-files-uploader/MultiFilesUploader';
import TableInfo from './TableInfo.json';
import UploadedFile from '../uploaded-file/UploadedFile';
import Consts from "../../consts/Consts";
import './MultiFilesUploaderView.scss';
import '../Samples.scss';

export default class MultiFilesUploaderView extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isTable: false,
            uploadedImages: [],
            isSubmitDisabled: true,
            isUploaderDisabled: false
        };
    }

    onChange = (event) => {
        let name = (event.target && event.target.name) || null;
        let value = (event.target && event.target.value) || null;
        let isSubmitDisabled = true;
        if (isSubmitDisabled && value) isSubmitDisabled = false;
        this.setState({ [name]: value, isSubmitDisabled });
    }

    getFilesData = () => {
        const fieldsToSave = ['imgId'];

        let fieldsToSaveObj = {};
        for (let field of fieldsToSave) {
            if (this.state[field]) fieldsToSaveObj[field] = this.state[field];
        }

        return fieldsToSaveObj;
    }

    upload = async () => {
        this.setState({ isSubmitDisabled: true, isUploaderDisabled: true });
        let filesData = this.getFilesData();
        console.log("about to upload files", filesData);

        let [pRes, pErr] = await Auth.superAuthFetch('/api/Images', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(filesData)
        });

        console.log("pRes", pRes);

        if (pErr) return console.log("ERR:", pErr);

        await this.previewUploadedImages(pRes);
    };

    getUploadedFilesIds = (filesUploadStatus, filterByType = Consts.FILE_TYPE_IMAGE) => {
        let fileIds = [];
        for (let fileKeys in filesUploadStatus) {
            let fileOrFiles = filesUploadStatus[fileKeys];

            const pushToFileIds = (file) => {
                if (file.status === Consts.FILE_ACCEPTED && file.type === filterByType) {
                    fileIds.push(file.id)
                }
            }

            if (Array.isArray(fileOrFiles)) {
                fileOrFiles.forEach(file => pushToFileIds(file));
            }
            else {
                pushToFileIds(fileOrFiles);
            }
        }

        return fileIds;
    }

    previewUploadedImages = async (postRes) => {
        if (!postRes || !postRes.filesUploadStatus) return;
        let uploadedFilesIds = this.getUploadedFilesIds(postRes.filesUploadStatus, Consts.FILE_TYPE_IMAGE);
        let filter = JSON.stringify({ "where": { "id": { "inq": uploadedFilesIds } } });
        let [gRes, gErr] = await Auth.superAuthFetch('/api/Images?filter=' + filter);

        if (gErr) return console.log("ERR:", gErr);
        console.log("GET res", gRes);

        this.setState({ uploadedImages: gRes });
    }

    toggleTable = () => {
        let isTable = !this.state.isTable;
        this.setState({ isTable });
    }

    render() {
        let isSubmited = Object.keys(this.state.uploadedImages).length !== 0;

        return (
            <div className="multi-files-uploader-sample uploader-sample">

                <h1>Multi Files Uploader</h1>
                <h2>Supported types: image, audio, video, file</h2>

                <div className="multi-input-samples">
                    <div className="multi-input-sample">
                        <MultiFilesUploader
                            name="imgId" // keyToSaveImgId
                            title="my-images"
                            category="my-images"
                            onChange={this.onChange}
                            disabled={this.state.isUploaderDisabled}
                            type="image"

                        // NOT SUPPORTED YET
                        // previewFiles={[accepted, rejected]}
                        />
                    </div>
                </div>

                <div className="usage">
                    <p>import ImageUploader from '/src/modules/fileshandler/client/components/multi-files-uploader/MultiFilesUploader.js</p>
                    <p>{`<MultiFilesUploader
                        name="imgId"
                        title="my-images"
                        category="my-images"
                        label="Drop your images"
                        onChange={this.onChange}
                        disabled={this.state.isUploaderDisabled}
                        type="image" />`}</p>
                </div>

                <div className="description p-1">

                    {this.state.isTable && <div className="m-2 mt-4 props-details" dir='ltr'>
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    {TableInfo.thead.map((col, i) => <th key={i} scope="col">{col}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {TableInfo.tbody.map((row, i) =>
                                    <tr key={i}>
                                        <td>{row.Property}</td>
                                        <td>{row.Type}</td>
                                        <td>{row.Description}</td>
                                        <td>{row.Default}</td>
                                    </tr>)}
                            </tbody>
                        </table>
                    </div>}

                    <button onClick={this.toggleTable}>{!this.state.isTable ? "Show props details" : "Show less"}</button>
                </div>

                <p className="explanation">There are a few different types of uploaders.<br />
                    <strong>Notice:</strong> The folowing uploaders are for preview only and are <strong>not</strong> connected to the Submit button,
                    therefore, the chosen files <strong>won't be uploaded to the server</strong>.<br/>
                    <br/>
                    Mind that chosen files which exceeds the size limitation as they defiend at src/consts/ModulesConfig.json<br/>
                    (which can be generated by activating config-generator.sh script), 
                    will be previewed, with an error icon and a tooltip that describes the issue.<br/>
                    To see the effect try to play with the values at ModulesConfig<br/>
                    (for example change fileshandler.FILE_SIZE_RANGE_IN_KB.audio.MAX_SIZE to 0 and upload a file)<br/>
                    <br/>
                    Another important thing to know, is that there is a limited number of files that can be selected through a MultiFilesUploader.
                    The default maximum files number is 8, but it can be changed at field MULTI_FILES_LIMIT at ModulesConfig.
                    The MultiFilesUploader will reject an attemt to select more files than it's limit.<br/>
                    <br/>
                    In any case of files rejection, a proper message will be sent at the eventObj which is sent to onChange functions.
                    </p>

                <div className="multi-input-samples">
                    <div className="multi-input-sample">
                        <p>Below is an example of a MultiFilesUploader with <em>type="image"</em> prop.</p>
                        <MultiFilesUploader
                            name="MultiFilesUploader1"
                            title="my-images"
                            category="my-images"
                            onChange={this.onChange}
                            disabled={this.state.isUploaderDisabled}
                            type="image"
                        />
                    </div>

                    <div className="multi-input-sample">
                        <p>Below is an example of a MultiFilesUploader with <em>type="audio"</em> prop.</p>
                        <MultiFilesUploader
                            name="MultiFilesUploader2"
                            title="my-images"
                            category="my-images"
                            onChange={this.onChange}
                            disabled={this.state.isUploaderDisabled}
                            type="audio"
                        />
                    </div>

                    <div className="multi-input-sample">
                        <p>Below is an example of a MultiFilesUploader with <em>type="video"</em> prop.</p>
                        <MultiFilesUploader
                            name="MultiFilesUploader3"
                            title="my-images"
                            category="my-images"
                            onChange={this.onChange}
                            disabled={this.state.isUploaderDisabled}
                            type="video"
                        />
                    </div>

                    <div className="multi-input-sample">
                        <p>Below is an example of a MultiFilesUploader with <em>type="file"</em> prop.</p>
                        <MultiFilesUploader
                            name="MultiFilesUploader4"
                            title="my-images"
                            category="my-images"
                            onChange={this.onChange}
                            disabled={this.state.isUploaderDisabled}
                            type="file"
                        />
                    </div>
                </div>

                <p className="explanation">
                    <strong>Note:</strong> In this example the Submit button uploads all the chosen images to Images model<br />
                    (without saving a reference image_id in another model like in "Upload image to relative model (by creating a new game)" sample).<br />
                    <strong>Notice:</strong> The MultiImageHandler does not support <em>required</em> prop.</p>

                {!isSubmited ?
                    <button onClick={this.upload} disabled={this.state.isSubmitDisabled}>Submit</button> :
                    <div className="uploaded-images">
                        {this.state.uploadedImages.map((uploadedImage, i) =>
                            <div key={i}>
                                <UploadedFile {...uploadedImage} type={Consts.FILE_TYPE_IMAGE} />
                            </div>)}
                    </div>}
            </div>
        );
    }
}