import React, { Component } from 'react';
import Auth from '../../../auth/Auth';
import ImageUploader from '../../client/components/ImageUploader.jsx';
import MultiFilesUploader from '../../client/components/multi-files-uploader/MultiFilesUploader';
import UploadedFile from '../uploaded-file/UploadedFile';
import Consts from "../../consts/Consts";
import './CreateGame.scss';
import '../Samples.scss';

export default class CreateGame extends Component {

    constructor(props) {
        super(props);
        this.state = {
            uploadedImages: [],
            isSubmitDisabled: true,
            isInputDisabled: false
        };
    }

    onInputChange = (event) => {
        let name = (event.target && event.target.name) || null;
        let value = (event.target && event.target.value) || null;
        let isSubmitDisabled = true;
        if (isSubmitDisabled && value) isSubmitDisabled = false;
        this.setState({ [name]: value, isSubmitDisabled });
    }

    getGameData = () => {
        const fieldsToSave = ["title", "description", "imgId", "imageId"];

        let fieldsToSaveObj = {};
        for (let field of fieldsToSave) {
            fieldsToSaveObj[field] = this.state[field];
        }

        return fieldsToSaveObj;
    }

    createGame = async () => {
        this.setState({ isSubmitDisabled: true, isInputDisabled: true });

        let newGame = this.getGameData();

        let [res, err] = await Auth.superAuthFetch('/api/Games/createNewGame', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ newGameData: newGame })
        });

        if (err) return console.log("ERR:", err);
        console.log("POST res", res)

        this.gameId = res.id;

        await this.previewUploadedImages(res);
    };

    updateImage = async () => {
        let newImage = { imgId: this.state.imgId };

        let [res, err] = await Auth.superAuthFetch('/api/Games/updateImage', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageObj: newImage, gameId: this.gameId })
        });

        if (err) return console.log("ERR:", err);
        console.log("POST res", res)
    }

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

    render() {
        return (
            <div className="create-game-sample uploader-sample">

                <h2>Create a new game</h2>

                <div className="form">
                    <div className="row">
                        <div className="col">
                            <div className="field">
                                <label>Title:</label>
                                <input
                                    onChange={this.onInputChange}
                                    name="title"
                                    type="text"
                                    disabled={this.state.isInputDisabled}
                                />
                            </div>

                            <div className="field">
                                <label>Description:</label>
                                <textarea
                                    onChange={this.onInputChange}
                                    name="description"
                                    disabled={this.state.isInputDisabled}
                                />
                            </div>
                        </div>

                        <div className="col">
                            <ImageUploader
                                category="games-cover-images"
                                name="imgId"
                                title="cover-image"
                                theme="basic-theme"
                                label="Load a cover image"
                                // isMultiSizes={true}
                                onChange={this.onInputChange}
                                disabled={this.state.isInputDisabled}
                            />
                        </div>
                    </div>

                    <MultiFilesUploader
                        name="imageId" // keyToSaveImgId
                        title="my-images"
                        category="games-images"
                        label="Drop images of the game's process"
                        onChange={this.onInputChange}
                        disabled={this.state.isInputDisabled}
                    />
                </div>

                <button onClick={this.createGame} disabled={this.state.isSubmitDisabled}>Create Game</button>

                {/* <button onClick={this.updateImage} disabled={this.state.uploadedImages.length === 0}>Update Image</button> */}

                <p className="explanation">
                    <strong>Note:</strong> In this example the Submit button creates a new game and uploads all the chosen images to Images model.<br />
                    It saves the reference of cover-image id at imgId field in games model.<br />
                    It saves the references of game-process-images at games-images model.</p>

                <div className="uploaded-images">
                    {this.state.uploadedImages.map((uploadedImage, i) =>
                        <div key={i}>
                            <UploadedFile {...uploadedImage} type={Consts.FILE_TYPE_IMAGE} />
                        </div>)}
                </div>
            </div>
        );
    }
}