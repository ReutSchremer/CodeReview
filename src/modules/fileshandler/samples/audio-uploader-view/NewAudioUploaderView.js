// import React, { Component } from 'react';
// import SingleFileUploaderView from '../single-file-uploader-view/SingleFileUploaderView';
// import AudioUploader from '../../client/components/NewAudioUploader';
// import TableInfo from './TableInfo.json';
// import Consts from '../../consts/Consts.json';
// import { isIOS, isSafari } from 'react-device-detect';
// import 'react-h5-audio-player/src/styles.scss';

// export default class AudioUploaderView extends Component {
//     render() {
//         return (
//             <div>
//                 <SingleFileUploaderView
//                     type={Consts.FILE_TYPE_AUDIO}
//                     uploader={<AudioUploader
//                         name="audio"
//                         enableLoadFile
//                         enableRecord={(isIOS || isSafari) ? false : true}
//                         deleteAudio={this.deleteAudio}
//                         onChange={this.handleFileChange} />}
//                     tableInfo={TableInfo}
//                 />
//             </div>
//         );
//     }
// }