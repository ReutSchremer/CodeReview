import React, { Component } from 'react';

import ValidateFields from '../../../tools/ValidateFields'
import { TextField, Button } from '@material-ui/core';

import InputAdornment from '@material-ui/core/InputAdornment';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';

import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import IconButton from '@material-ui/core/IconButton';

const passwordStyle = {
    display: "flex",
    flexDirection: "column",
    width: "55vw",
    margin: "5vh auto"
}
const fieldStyle = {
    direction: "ltr",
}
const showMessageStyle = {
    color: "red",
    fontSize: "2vw"
}
const progressBarStyle = {
    direction: "ltr",
    margin: " 5vh 0"
}
const buttonStyle = {
    margin: "5vh 0"
}

class PasswordInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            password: "",
            verifyPassword: "",
            strength: 0,
            color: "",
            displyPassword: false,
            validatePasswordMsg: "",
            confirmPassowrdMsg: ""
        }
    }

    onChangePassword = (e) => {

        this.setState({ password: e.target.value })
        var matchedCase = new Array();
        // matchedCase.push("[$@!%*#?&^]"); // Special Charector
        matchedCase.push("[A-Z]");      // Uppercase Alpabates
        matchedCase.push("[0-9]");      // Numbers
        matchedCase.push("[a-z]");     // Lowercase Alphabates
        matchedCase.push("^.{6,}$");

        var ctr = 0;
        for (var i = 0; i < matchedCase.length; i++) {
            if (new RegExp(matchedCase[i]).test(e.target.value)) {
                ctr++;
            }


        }

        var color = "";
        var strength = 0;
        switch (ctr) {
            case 0:
                strength = 0;
                color = "red";
                break;
            case 1:
                strength = 25;
                color = "red";
                break;
            case 2:
                strength = 50;
                color = "orange";
                break;
            case 3:
                strength =75;
                color = "orange";
                break;
            case 4:
                strength = 100;
                color = "green";
                break;
            // case 5:
            //     strength = 100;
            //     color = "green";
            //     break;
        }

        let validatePasswordMsg = ValidateFields.validatePasswordInput(e.target.value, false)
        this.setState({ strength: strength, color: color, validatePasswordMsg: validatePasswordMsg })
    }

    onChangeVerifyPassword = (e) => {
        this.checkVerify(e)
        this.setState({ verifyPassword: e.target.value })
    }

    checkVerify = (e) => {
        let confirmPassowrdMsg = ValidateFields.validateConfirmPasswordInput(e.target.value, false, this.state.password)
        this.setState({ confirmPassowrdMsg })
    }

    onSubmit = () => {
        let validatePasswordMsg = ValidateFields.validatePasswordInput(this.state.password, true)
        let confirmPassowrfMsg = ValidateFields.validateConfirmPasswordInput(this.state.verifyPassword, false, this.state.password)
        if (this.props.onSubmit && typeof this.props.onSubmit === "function") {
            this.props.onSubmit(validatePasswordMsg,confirmPassowrfMsg)
        }

    }

    showPassord = () => {
        this.setState({ displyPassword: !this.state.displyPassword })
    }

    onCopy = (e) => {
        e.preventDefault();
        return false
    }
    render() {
        return (
            <div>
                <div style={passwordStyle}>
                    <FormControl autoComplete='off'>
                        <InputLabel htmlFor="standard-adornment-password" >{this.props.passwordLabel || "enter password"}</InputLabel>
                        <Input onCopy={this.onCopy} style={fieldStyle}
                            // type: "password",
                            type={!this.state.displyPassword ? "password" : "text"} value={this.state.password} onKeyUp={this.onKeyUpPassword}  onChange={this.onChangePassword}
                            endAdornment={<InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={this.showPassord}
                                >
                                    {this.state.displyPassword ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                            </InputAdornment>}
                        />
                    </FormControl>

                    <div style={showMessageStyle}>{this.state.validatePasswordMsg}</div>
                    <TextField style={fieldStyle} type={!this.state.displyPassword ? "password" : "text"} value={this.state.verifyPassword} label={this.props.verifyPasswordLabel || "enter password again"} onChange={this.onChangeVerifyPassword} />
                    <div style={showMessageStyle}>{this.state.confirmPassowrdMsg}</div>
                    <Button style={buttonStyle} variant="outlined" color="primary" onClick={this.onSubmit}>submit</Button>

                    <div className="progress " style={progressBarStyle}>
                        <div className="progress-bar" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style={{ width: this.state.strength + "%", backgroundColor: this.state.color }}>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default PasswordInput;
