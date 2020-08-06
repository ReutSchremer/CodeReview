import React, { Component } from 'react';
import SingleFileUploaderView from '../single-file-uploader-view/SingleFileUploaderView';
import AudioUploader from '../../client/components/AudioUploader';
import TableInfo from './TableInfo.json';
import Consts from '../../consts/Consts.json';

export default class AudioUploaderView extends Component {
    render() {
        return (
            <div>
                <SingleFileUploaderView
                    type={Consts.FILE_TYPE_AUDIO}
                    uploader={<AudioUploader />}
                    tableInfo={TableInfo}
                    defaultChosenFileName={'myAudio.wav'}
                />
            </div>
        );
    }
}