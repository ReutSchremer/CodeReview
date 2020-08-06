import React, { Component } from 'react';
import SingleFileUploader from './single-file-uploader/SingleFileUploader';
import Consts from '../../consts/Consts.json';

export default class AudioUploader extends Component {

    updateProps = () => {
        let props = { ...this.props };
        props.type = Consts.FILE_TYPE_AUDIO;
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