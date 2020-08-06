import React, { Component } from 'react';
import Consts from '../../../fileshandler/consts/Consts.json';
import './UploadedFile.scss';

export default class UploadedFile extends Component {

    constructor(props) {
        super(props);

        this.preview = this.getFilePreview();
    }

    getFilePreview = () => {
        let filePreview = null;

        switch (this.props.type) {
            case Consts.FILE_TYPE_FILE:
                filePreview = <h2>"{this.props.title}" was successsfully uploaded</h2>;
                break;

            case Consts.FILE_TYPE_IMAGE:
                if (this.props.isMultiSizes) {
                    filePreview =
                        <div>
                            {this.props.multipleSizes.map((path, i) =>
                                <img key={i} src={path} alt={this.props.title} title={this.props.title} />
                            )}
                        </div>
                }
                else filePreview = <img src={this.props.path} alt={this.props.title} title={this.props.title} />;
                break;

            case Consts.FILE_TYPE_VIDEO:
                filePreview = <video controls src={this.props.path} type={"video/*"} />;
                break;

            case Consts.FILE_TYPE_AUDIO:
                filePreview = <audio controls src={this.props.path} type={"audio/*"} />;
                break;

            default: break;
        }

        return (
            <div className={`${this.props.type}-preview`}>
                {filePreview}
            </div>
        );
    }

    render() {
        return (
            <div className="uploaded-file">
                {this.preview}
            </div>
        );
    }
}
