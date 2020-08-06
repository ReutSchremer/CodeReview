import React, { Component } from 'react';
import ValidateFields from '../../../tools/ValidateFields'
import Auth from '../../Auth'
import { Dialog, DialogTitle, Button, DialogContent, DialogActions } from '@material-ui/core';
import '../../_Login.scss';

class RegistrationScene extends Component {
    constructor(props) {
        super(props);
        this.state = {
            errEmail: '',
            errPass: '',
            errConfPass: '',
            infoModal: false,
            modalText: "",
            modalTitle: "",
            registerAsyncEmailErr: false
        }
    }

    getHebrewError = (error) => {
        while (error.length > 0 && typeof error !== 'string') error = error[0];
        switch (error) {
            case 'Email already exists':
                return "האימייל שהכנסת כבר קיים במערכת.";
            default:
                return error || 'אין חיבור לאינטרנט, נסה שנית מאוחר יותר.';
        }
    }

    showRegisterErrorPopup = (error) => {
        if (error = 'האימייל שהכנסת כבר קיים במערכת.') {
            this.setState({
                infoModal: true, modalText: error,
                modalTitle: "הרשמת משתמש חדש", errEmail: error,
                registerAsyncEmailErr: true
            });
            return;
        }
        this.setState({
            infoModal: true, modalTitle: "הרשמת משתמש חדש",
            modalText: (error || "אין חיבור לאינטרנט, נסה שנית מאוחר יותר."),
            registerAsyncEmailErr: true
        });
    }

    onBlurPwd = () => {
        this.setState({ errPass: "", errConfPass: "" });
        let pass = this.refs.pwd.value, confPass = this.refs.confPwd.value;
        let passErr, confErr;
        passErr = ValidateFields.validatePasswordInput(pass, true)
        confErr = ValidateFields.validateConfirmPasswordInput(confPass, true, pass);
        if (passErr + confErr !== '')
            this.setState({ errPass: passErr, errConfPass: confErr });
        return;
    }

    onBluremail = () => {
        let email = this.refs.email.value;
        let emailErr;
        emailErr = ValidateFields.validateEmailInput(email, true)
        if (emailErr === '' && !this.state.registerAsyncEmailErr) this.setState({ errEmail: emailErr });
        return;

    }

    submit = async (e) => {
        e.preventDefault();
        this.setState({ errPass: "", errEmail: "", errConfPass: "" });
        let email = this.refs.email.value, pass = this.refs.pwd.value, confPass = this.refs.confPwd.value;
        let passErr, confErr, emailErr;
        emailErr = ValidateFields.validateEmailInput(email, true)
        passErr = ValidateFields.validatePasswordInput(pass, true)
        confErr = ValidateFields.validateConfirmPasswordInput(confPass, true, pass);
        if (passErr + confErr + emailErr === '') {
            //fd is object with the new user data that will be in the database
            let fd = {
                'email': email,
                'password': pass
            }
            //emailMessage is the text that will be in the email
            let emailMessage = {
                subject: 'תודה על ההרשמה',
                start: 'נא אשר את ההרשמה על ידי לחיצה : ',
                end: ' תודה, <br> צוות ', click: " כאן "
            }
            const { error, ok } = await Auth.registerAsync(fd, emailMessage);
            if (error || !ok) {
                let hebrewError = this.getHebrewError(error);
                this.showRegisterErrorPopup(hebrewError);
            } else {
                this.setState({
                    infoModal: true, modalTitle: "תודה על ההרשמה", registerAsyncEmailErr: true,
                    modalText: "אנא אשר את ההרשמה בקישור שנשלח אליך למייל ובדוק את הדואר ספאם"
                });
            }
        }
        else this.setState({ errPass: passErr, errEmail: emailErr, errConfPass: confErr });
    }



    render() {
        return (
            <div>
                <div className='loginBox'>
                    <h1 className="mt-1">משתמש חדש</h1>
                    <form onSubmit={this.submit} className="collapses show form"
                        data-toggle="collapse">
                        <div className='form-group'>
                            <label >אימייל</label>
                            <input className="form-control" type="email"
                                required placeholder="אימייל*" ref="email"
                                onBlur={this.onBluremail} />
                            <p>{this.state.errEmail}</p>
                        </div>
                        <div className='form-group'>
                            <label >סיסמה</label>
                            <input className="form-control" type="password"
                                required placeholder="סיסמה*" ref="pwd"
                                onBlur={this.onBlurPwd} />
                            <p>{this.state.errPass}</p>
                        </div>
                        <div className='form-group'>
                            <label >אימות סיסמא</label>
                            <input className="form-control" type="password"
                                required placeholder="אימות סיסמא*" ref="confPwd"
                                onBlur={this.onBlurPwd} />
                            <p>{this.state.errConfPass}</p>

                        </div>
                        <div className='form-group'>
                            <button type='submit'
                                className='btn btn-warning login_input'  >המשך</button>
                        </div>
                    </form>
                </div>

                <Dialog open={this.state.infoModal} aria-labelledby="reset-modal">
                    <DialogTitle id="reset-modal" className="float-right" >
                        <p style={{ float: "right", margin: "0" }}>{this.state.modalTitle}</p>
                    </DialogTitle>
                    <DialogContent>
                        {this.state.modalText}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => this.setState({ infoModal: false })} children="אישור" color="primary" />
                    </DialogActions>
                </Dialog>
            </div >
        );
    }
}

export default RegistrationScene;
