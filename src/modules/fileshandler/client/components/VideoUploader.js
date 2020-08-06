import React, { Component } from 'react';
import SingleFileUploader from './single-file-uploader/SingleFileUploader';
import Consts from '../../consts/Consts.json';

export default class VideoUploader extends Component {

    updateProps = () => {
        let props = { ...this.props };
        props.type = Consts.FILE_TYPE_VIDEO;
        return props;
    }

    render() {
        return (
            <>
                <SingleFileUploader
                    {...this.updateProps()}
                />
            </>
        );
    }
}
