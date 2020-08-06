import React, { Component } from 'react';
import SingleFileUploaderView from '../single-file-uploader-view/SingleFileUploaderView';
import VideoUploader from '../../client/components/VideoUploader';
import TableInfo from './TableInfo.json';
import Consts from '../../consts/Consts.json';

export default class VideoUploaderView extends Component {
    render() {
        return (
            <div>
                <SingleFileUploaderView
                    type={Consts.FILE_TYPE_VIDEO}
                    uploader={<VideoUploader />}
                    tableInfo={TableInfo}
                    defaultChosenFileName={'myVideo.webm'}
                />
            </div>
        );
    }
}