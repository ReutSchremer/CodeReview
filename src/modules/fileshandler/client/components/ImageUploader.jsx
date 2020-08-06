import React, { Component } from 'react';
import SingleFileUploader from './single-file-uploader/SingleFileUploader';
import Consts from '../../consts/Consts.json';
import { fileshandler as config } from '../../../../consts/ModulesConfig';
import Tooltip from '@material-ui/core/Tooltip';
import ErrorPopup from './ErrorPopup';
import './ImageUploader.scss';

// Change to functional component
export default class ImageUploader extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showPreviewPopup: null
        };
    }

    togglePreviewPopup = () => {
        this.setState({ showPreviewPopup: !this.state.showPreviewPopup });
    }

    addExtraProps = (Component, extraProps) => {
        return <Component.type {...Component.props} {...extraProps} />;
    }

    updateProps = () => {
        let props = { ...this.props };

        props.type = Consts.FILE_TYPE_IMAGE;

        let propsDefaultTumbnail = props.defaultValue || props.thumbnail || props.defaultThumbnailImageSrc;
        let defaultThumbnail = propsDefaultTumbnail || (props.theme === "circle-theme" ?
            require(`../../imgs/circle-theme-default-thumbnail.svg`) :
            require(`../../imgs/default-thumbnail.svg`));
        props.defaultThumbnailImageSrc = defaultThumbnail;

        props.extraFileObjProps = {
            isMultiSizes: props.isMultiSizes || false
        };

        return props;
    }

    getExtraVars = (vars, parentThis) => {
        let previewWidgetChosenImg = this.props.previewWidget ? <div className="chosen-img-preview" style={{ backgroundImage: `url(${vars.file.preview})` }} /> : null;
        let filePreviewHtml = this.addExtraProps(parentThis.getFilePreviewHtml(vars.file, vars.isDefaultPreview), { onClick: this.props.previewWidget && this.togglePreviewPopup });
        return { previewWidgetChosenImg, filePreviewHtml };
    }

    replaceReturn = (vars, parentThis) => {
        // Supports previous versions (AKA default-theme)
        if (!parentThis.props.theme && !parentThis.props.previewWidget)
            return (
                <div className="image-uploader-container single-file-uploader">
                    <div className="default-theme single-file-preview">

                        {// Add remove button
                            !parentThis.props.previewWidget && !parentThis.props.disabled && !vars.isDefaultPreview &&
                            <div className="remove-icon" onClick={parentThis.removeFile}>
                                {parentThis.props.removeFileIcon || 'x'}
                            </div>}

                        <label>
                            <input
                                className="default-theme-input"
                                name={parentThis.type}
                                type="file"
                                onChange={parentThis.onChange}
                                disabled={parentThis.props.disabled || false}
                                required={parentThis.props.required || false}
                                accept={parentThis.acceptedExtensions}
                                ref={parentThis.uploaderInputRef}
                            />
                            <img
                                className="default-theme-image"
                                ref={parentThis.props.previewRef}
                                src={vars.file.preview}
                                alt={`uploading ${parentThis.type}`}
                                onError={() => {
                                    let defaltPreviewObj = parentThis.getFilePreviewObj(null, parentThis.defaultTumbnail, Consts.DEFAULT_THUMBNAIL);
                                    let fileData = { previewObj: defaltPreviewObj, acceptedObj: null };
                                    parentThis.setState({ fileData });
                                }}
                            />
                            <div className="default-theme-label">{parentThis.props.label || "Defalt-theme is not recommended and will be deprecated"}</div>
                        </label>

                        {/* {// Add error icon if needed
                            file.status === Consts.FILE_REJECTED &&
                            <div className="error-icon">
                                <Tooltip title={file.errMsg} placement="left" className="tool-tip">
                                    <img src={require('../../imgs/error.svg')} alt={file.errMsg} />
                                </Tooltip>
                            </div>} */}

                        {vars.isErrorPopup && typeof parentThis.state.showErrPopup === "boolean" &&
                            <ErrorPopup
                                message={vars.file.errMsg}
                                showPopup={parentThis.state.showErrPopup}
                                toggleShowPopup={parentThis.turnOffErrPopup} />}
                    </div>
                </div>
            );

        return (
            <div className="image-uploader-container single-file-uploader">
                <div className={parentThis.props.theme}>
                    <input
                        id={parentThis.props.name}
                        name={parentThis.type}
                        type="file"
                        onChange={parentThis.onChange}
                        disabled={parentThis.props.disabled}
                        required={parentThis.props.required || false}
                        accept={parentThis.acceptedExtensions}
                        ref={parentThis.uploaderInputRef}
                    />

                    <div className={`${parentThis.props.previewWidget && 'chosen-image-parent'} single-file-preview ${vars.type}-preview`}>

                        {!parentThis.props.previewWidget ?
                            <label htmlFor={parentThis.props.name}>
                                {vars.filePreviewHtml}
                                <div className="label">{parentThis.props.label || `Load ${parentThis.type}`}</div>
                            </label> : vars.filePreviewHtml}

                        {// Add remove button
                            !parentThis.props.previewWidget && !parentThis.props.disabled && !vars.isDefaultPreview &&
                            <div className="remove-icon" onClick={parentThis.removeFile}>
                                <img src={parentThis.props.removeFileIcon || require('../../imgs/x-icon.png')} alt="x" />
                            </div>}

                        {// Add error icon if needed
                            vars.file.status === Consts.FILE_REJECTED && !vars.isDefaultPreview &&
                            <div className="error-icon">
                                <Tooltip title={vars.file.errMsg} placement="left" className="tool-tip">
                                    <img src={require('../../imgs/error.svg')} alt={vars.file.errMsg} />
                                </Tooltip>
                            </div>}
                    </div>

                    {vars.isErrorPopup && typeof parentThis.state.showErrPopup === "boolean" &&
                        <ErrorPopup
                            message={vars.file.errMsg}
                            showPopup={parentThis.state.showErrPopup}
                            toggleShowPopup={parentThis.turnOffErrPopup} />}

                    {parentThis.props.previewWidget && typeof this.state.showPreviewPopup === "boolean" &&
                        this.addExtraProps(parentThis.props.previewWidget, {
                            chosenImg: vars.previewWidgetChosenImg,
                            showPopup: this.state.showPreviewPopup,
                            toggleShowPopup: this.togglePreviewPopup,
                            removeFile: parentThis.removeFile,
                            inputId: parentThis.props.name,
                            disabled: parentThis.props.disabled
                        })}
                </div>
            </div>
        )
    }

    /* 
    Below code enables extending the SingleFileUploader's return function without literly extending it.
    We needs to change SingleFileUploader component default props,
    such as type/theme/defaultThumbnailImageSrc etc, so it can't be an extention of SingleFileUploader.
    Otherwise, when trying to change props obj before passing it to super(), an error accures:
    "...When calling super() make sure to pass up the same props that your component's constructor was passed".
    The solution is using getExtraVars and replaceReturn props.
    */
    render() {
        return (
            <>
                <SingleFileUploader
                    {...this.updateProps()}
                    getExtraVars={this.getExtraVars}
                    replaceReturn={this.replaceReturn}
                />
            </>
        );
    }
}