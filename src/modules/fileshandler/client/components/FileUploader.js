import React, { Component } from 'react';
import SingleFileUploader from './single-file-uploader/SingleFileUploader';
import Consts from '../../consts/Consts.json';

export default class FileUploader extends Component {

    updateProps = () => {
        let props = { ...this.props };
        props.type = Consts.FILE_TYPE_FILE;
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
