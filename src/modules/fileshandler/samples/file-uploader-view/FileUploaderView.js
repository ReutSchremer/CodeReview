import React, { Component } from 'react';
import SingleFileUploaderView from '../single-file-uploader-view/SingleFileUploaderView';
import FileUploader from '../../client/components/FileUploader';
import TableInfo from './TableInfo.json';
import Consts from '../../consts/Consts.json';

export default class FileUploaderView extends Component {
    render() {
        return (
            <div>
                <SingleFileUploaderView
                    type={Consts.FILE_TYPE_FILE}
                    uploader={<FileUploader />}
                    tableInfo={TableInfo}
                    sqlImage={require('./files-sql.png')}
                    defaultChosenFileName={'myFile.pdf'}
                />
            </div>
        );
    }
}