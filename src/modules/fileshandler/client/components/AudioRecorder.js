// import React from 'react';
// import { ReactMic } from 'react-mic';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// export default class AudioRecorder extends React.Component {

//     constructor(props) {
//         super(props);
//         this.state = {
//             isRecord: false,
//             audioSrc: null,
//             minutesLabel: 0,
//             secondsLabel: 0,
//             totalSeconds: 0
//         }
//     }

//     componentWillReceiveProps(nextProps) {
//         console.log("this.state. componentWillReceiveProps", nextProps.exitRecording)
//     }

//     componentWillMount() {
//         setInterval(this.setTime, 1000);
//     }

//     toggleRecordBtn = () => {
//         this.setState({ isRecord: !this.state.isRecord });
//     }

//     onStop = async (recordedBlob) => {
//         console.log("this.props.exitRecording", this.props.exitRecording, recordedBlob.blob.type)
//         if (!this.props.exitRecording)
//             await this.props.onChangeAudio(recordedBlob.blob);
//     }

//     setTime = () => {
//         if (this.state.isRecord) {
//             this.setState({ totalSeconds: this.state.totalSeconds + 1 })
//             let second = this.pad(this.state.totalSeconds % 60);
//             let minutes = this.pad(parseInt(this.state.totalSeconds / 60));
//             this.setState({ secondsLabel: second, minutesLabel: minutes })
//         }
//     }

//     pad = (val) => {
//         let valString = val + "";
//         if (valString.length < 2) {
//             return "0" + valString;
//         } else {
//             return valString;
//         }
//     }

//     render() {
//         return (
//             <div id="audio-recorder">
//                 <ReactMic
//                     className="no-wave"
//                     record={this.state.isRecord}
//                     onStop={this.onStop} />

//                 <div className="btn">
//                     <FontAwesomeIcon icon={this.state.isRecord ? "stop-circle" : "play-circle"} onClick={this.toggleRecordBtn} className="btn-icon" />
//                 </div>

//                 <div id="timer">
//                     {this.state.minutesLabel == 0 ?
//                         "00" : this.state.minutesLabel}
//                     :
//                     {this.state.secondsLabel == 0 ?
//                         "00" : this.state.secondsLabel}
//                 </div>
//             </div>
//         );
//     }
// }