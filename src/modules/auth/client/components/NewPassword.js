import React, { Component } from 'react';
import PasswordInput from "./PasswordInput"
import { TextField, Dialog, DialogTitle, Button, DialogContent, DialogActions } from '@material-ui/core';

export default class NewPassword extends PasswordInput {
    constructor(props) {
        super(props)
    }
    render() {
        return (
            <div>
                <TextField
                    style={{ direction: "ltr" }}
                    type={!this.state.displyPassword ? "password" : "text"}
                    value={this.state.verifyPassword}
                    label={this.props.verifyPasswordLabel || "enter password again"}
                    onChange={this.onChangeVerifyPassword}
                />

                <PasswordInput />
            </div>
        )
    }
}