// import React, { Component } from 'react';
// import SingleFileUploader from './single-file-uploader/SingleFileUploader';
// import Consts from '../../consts/Consts.json';
// import AudioRecorder from './AudioRecorder'
// import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
// import { blobToDataURL } from 'blob-util';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import './NewAudioUploader.scss';

// export default class NewAudioUploader extends Component {

//     constructor(props) {
//         super(props);

//         this.state = {
//             isRecord: false,
//             isAudioSaved: false,
//             exitRecording: false
//         };
//     }

//     updateProps = () => {
//         let props = { ...this.props };
//         props.type = Consts.FILE_TYPE_AUDIO;
//         return props;
//     }

//     readBlobToBase64 = (fileInfo) => {
//         return new Promise((resolve, reject) => {
//             blobToDataURL(fileInfo).then(function (res, err) {
//                 if (res) {
//                     resolve(res)
//                 }
//                 else {
//                     reject(err)
//                 }
//             })
//         });
//     }

//     deleteAudio = () => {
//         this.props.deleteAudio();
//         this.setState({ isRecord: false })
//     }

//     saveAudio = () => {
//         this.setState({ isAudioSaved: true })
//         this.props.onChange(this.state.eventObj);
//     }

//     onChangeAudio = async (blob) => {
//         let base64String = await this.readBlobToBase64(blob);

//         let audioObj = {
//             src: base64String,
//             type: 'audio',
//             title: this.props.title || "default_audio_title",
//             category: this.props.category || "default_audio_category",
//             description: this.props.description || "default_audio_description"
//         };

//         let eventObj = { target: { name: this.props.name, value: audioObj } }
//         this.props.onChange(eventObj);
//     }

//     exitModal = () => {
//         this.props.deleteAudio();
//         this.setState({ isRecord: false, exitRecording: true })
//     }

//     openRecordingModal = () => {
//         this.setState({ isRecord: true });
//     }

//     // <div id="audio-saved-display" className="d-flex border border-light">
//     //                 <AudioPlayer
//     //                     showJumpControls={false}
//     //                     src={require('../../imgs/background.mp3')}
//     //                     onPlay={e => console.log("onPlay")}
//     //                     customAdditionalControls={
//     //                         [
//     //                             RHAP_UI.LOOP,
//     //                             <div className="audio-msg clickAble" onClick={this.deleteAudio}>בטל הקלטה</div>
//     //                         ]}
//     //                 />
//     //             </div>
//     render() {
//         return (
//             <>
//                 {this.props.enableLoadFile &&
//                     <SingleFileUploader
//                         {...this.updateProps()}
//                         theme="button-theme"
//                         isErrorPopup={true}
//                     />}

//                 <div className="audio-display upload-display enable-record">

//                     {this.props.enableRecord && !this.state.isRecord &&
//                         <label className="record-audio" onClick={this.openRecordingModal}>
//                             <FontAwesomeIcon icon={"microphone"} className="ml-2 h-100" color="##FFFFFF" />
//                             <div>Record</div>
//                         </label>}

//                     {this.props.enableRecord && this.state.isRecord &&
//                         <div className="record-modal">
//                             <AudioRecorder onChangeAudio={this.onChangeAudio} exitRecording={this.state.exitRecording} />
//                             <p>מקליט</p>
//                         </div>}
//                 </div>
//             </>
//         );
//     }
// }