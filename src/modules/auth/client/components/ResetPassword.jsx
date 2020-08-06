import React, { Component } from 'react';
import queryString from 'querystring';
import Auth from '../../Auth'
import ValidateFields from '../../../tools/ValidateFields'
import { Dialog, DialogTitle, Button, DialogContent, DialogActions } from '@material-ui/core';
import GenericTools from '../../../tools/GenericTools';

class ResetPassword extends Component {
    constructor(props) {
        super(props);
        let params = queryString.parse(this.props.location.search);
        this.state = { errPass: '', errConf: '', infoModal: false, modalText: "",errorCode:"" };
        try {
            this.token = params['?access_token'];
        }
        catch (err) {
            GenericTools.safe_redirect('/');
        }
    }

    submit = async (e) => {
        e.preventDefault();
        let pass = this.refs.pwd.value, confPass = this.refs.confPwd.value, passErr, confErr;
        passErr = ValidateFields.validatePasswordInput(pass, true)
        confErr = ValidateFields.validateConfirmPasswordInput(confPass, true, pass);
        if (passErr + confErr === '') {

            let [res, err] = await Auth.superAuthFetch('/api/CustomUsers/reset-password?access_token=' + this.token, {
                method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: pass })
            });
            let modalText = "פג תוקף מייל האימות. חזור לדף הבית ושלח מייל חדש.";
            let errorCode = "";
            if(err || !res) {
                errorCode = "EMAIL_NOT_VALID"
                if(err.error && err.error.code === "PASSWORD_ALREADY_USED") {
                    modalText = "סיסמה זו הייתה כבר בשימוש, בחר סיסמה אחרת.";
                    errorCode = "PASSWORD_ALREADY_USED";
                }
            } 
            else modalText = "הסיסמה שונתה בהצלחה!";
            this.setState({ infoModal: true, modalText, errorCode });
        }
        else this.setState({ errConf: confErr, errPass: passErr });
    }

    render() {
        //console.log('render')
        return <div className="container justify-content-center mt-5 reset-password">
            <div className='loginBox'>

                <form className="form" onSubmit={this.submit}>
                    <div className='form-group'>
                        <label >הכנס סיסמה חדשה</label>
                        <input className="form-control" ref="pwd" type="password" id="password" required placeholder="password" />
                        <p>{this.state.errPass}</p>
                    </div>
                    <div className='form-group'>
                        <label >הכנס שנית</label>
                        <input className="form-control" ref="confPwd" type="password" id="passwordConfirm" placeholder="password comfirm" />
                        <p>{this.state.errConf}</p>

                    </div>
                    <button className='btn btn-warning' type="submit">שמור סיסמה</button>

                    <Dialog open={this.state.infoModal} aria-labelledby="reset-modal">
                        <DialogTitle id="reset-modal" className="float-right" >
                            <p style={{ float: "right", margin: "0" }}>שינוי סיסמה</p>
                        </DialogTitle>

                        <DialogContent>
                            {this.state.modalText}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => this.setState({ infoModal: false })} children="סבבה" color="primary" />
                        </DialogActions>
                    </Dialog>
                </form>
            </div>
        </div>
    }
}
export default ResetPassword;
