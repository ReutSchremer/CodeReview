import React, { Component } from 'react';
import './_Login.scss';
import Auth from './Auth';
// import { Redirect } from 'react-router';
import ValidateTool from '../tools/ValidateTool'
import ElementsHandler from '../../handlers/ElementsHandler'
import { Dialog, DialogTitle, Button, DialogContent, DialogActions } from '@material-ui/core';
import GenericTools from '../tools/GenericTools'

class Login extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            redirTo: false,
            registerModal: false,
            email: { text: "", isvalid: false }, //validations texts
            username: { text: "", isvalid: false },
            password: { text: "", isvalid: false },
            realm: { text: "", isvalid: false },
            isValid: false,
            resetPassDialog: false,
            resetPassMsg: "",
            loginMsg: ''
        }
        this.elementsHandler = new ElementsHandler(this);
        this.handleLogin = this.handleLogin.bind(this);
    }

    async handleLogin(e) {
        e.preventDefault();

        let email = this.refs.email.value;
        let pw = this.refs.pw.value;

        this.setState({ isLoading: true });

        let res = await Auth.login(email, pw, null);
        // console.log("Auth.authenticate res", res);

        this.setState({ isLoading: false });

        if (!res.success) {
            // console.log("login failed with error", res.msg);
            this.setState({ loginMsg: res.msg.error.msg });
            if (res.msg.error.remaining) {
                this.count = res.msg.error.remaining;
                if (this.interval) clearInterval(this.interval);
                this.interval = setInterval(() => {
                    this.count--;
                    this.setState({ loginMsg: `נחסמת עקב יותר מדי נסיונות כניסה, נסה שוב בעוד ${this.count} דקות` });
                    if (!this.count) {
                        clearInterval(this.interval);
                        this.setState({ loginMsg: "זמן ההמתנה תם, אתה יכול לנסות להתחבר מחדש" });

                    }
                }, 60000);
            }
            return;
        }
        //if res.success is true
        let pwdResetRequired = res.user && res.user.pwdResetRequired;
        // console.log(this.props.redirectUrl, 'this.props.redirectUrl')
        let redirTo = this.props.redirectUrl || "/";
        if (pwdResetRequired) redirTo = "/new-password";
        GenericTools.safe_redirect(redirTo);
    }

    openRegModal = () => {
        this.setState({ registerModal: !this.state.registerModal });
    }

    handleInputChange = (event) => {
        let val = event.target.value;
        if (val.length < 3) return;
        switch (event.target.id) {
            case "registerPrivateName":
                {
                    if (/[0-9]/.test(val)) {
                        event.target.value = val.substring(0, val.length - 1);
                        this.setState({ realm: { text: "Name cannot contain digits!", isvalid: false } });
                        return;
                    }
                    let part = val.split(" ");
                    if (part.length === 1) {
                        this.setState({ realm: { text: "Include family name please.", isvalid: false } });
                        return;
                    }
                    let regex = /^[a-zA-zא-ת]{4,20}/;
                    if (regex.test(val)) {
                        this.setState({ realm: { text: "", isvalid: true } });
                        return;
                    }
                    else
                        this.setState({ realm: { text: "Name must be at least 4 chars and limited for 20.", isvalid: false } });
                    break;
                }
            case "registerEmail":
                {
                    let part = val.split("@");
                    if (part.length > 2) {
                        this.setState({ email: { text: "Sould contain only one @.", isvalid: false } });
                        return;
                    }
                    if (/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(val) && !this.state.email.isvalid) {
                        this.setState({ email: { text: "", isvalid: true } });
                        return;
                    }
                    break;
                }
            case "registerUserName":
                {
                    if (/[!@#$%^&*)(_+-=)]/.test(val)) {
                        this.setState({ username: { text: "Do not include !@#$%^&*)(_+=-)", isvalid: false } });
                        return;
                    }
                    if (val.length > 16) {
                        this.setState({ username: { text: "Try shorter user-name", isvalid: false } });
                        return;
                    }
                    if (val.includes(" ")) {
                        this.setState({ username: { text: "User name cannot include blank space.", isvalid: false } });
                        return;
                    }
                    if (val.length < 16 && val.length > 3) {
                        this.setState({ username: { text: "", isvalid: true } });
                        return;
                    }
                    break;
                }
            case "registerPasswd":
                {
                    let reg = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&()]).{8,18}/;

                    if (reg.test(val)) {
                        this.setState({ password: { text: "", isvalid: true } });
                        return;
                    }
                    if (!/[A-Z]/.test(val)) {
                        this.setState({ password: { text: "Password must contain at least one uppercase letter", isvalid: false } });
                        return;
                    }
                    if (!/[a-z]/.test(val)) {
                        this.setState({ password: { text: "Password must contain at least one lowercase letter (a-z)", isvalid: false } });
                        return;
                    }
                    if (!/[!@#$%^&()]/.test(val)) {
                        this.setState({ password: { text: "Password should contain one of the following carachters: !@#$%^&() ", isvalid: false } });
                        return;
                    }
                    if (!/[0-9]/.test(val)) {
                        this.setState({ password: { text: "Password must contain digits.", isvalid: false } });
                        return;
                    }
                    break;
                }
            default:
                break;
        }

    }


    register = (e) => {
        e.preventDefault();
        if (!(this.state.realm.isvalid && this.state.username.isvalid &&
            this.state.password && this.state.email.isvalid)) {
            console.log("One of the fields is invalid");
            return false;
        }
        let fd = new FormData(document.getElementById("registrationForm"));
        Auth.register(fd, 'Login successed!!');
    }


    reset = async (e, emailMsg = null) => {
        e.preventDefault();
        let email = this.refs.resetEmailInput.value;
        let [res, err] = await Auth.superAuthFetch('/api/CustomUsers/reset', {
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            method: "POST",
            body: JSON.stringify({ email, origin: window.location.origin + (window.location.hash[0] === "#" ? "/#" : "") })
        })
        if (err) {
            console.log("err")
        }
        this.setState({
            resetPassDialog: true,
            resetPassMsg: res ? "נשלחה הודעת אימות לכתובת המייל" : "הכתובת אינה רשומה במערכת"
        });
    }


    render() {
        return (
            <div className='loginPage'>

                <div className='loginBox'>
                    <div className='frow'>
                    </div>
                    <p className="mt-1">ברוכים הבאים !</p>
                    <form onSubmit={this.handleLogin} id="logForm" className="collapses show form" data-toggle="collapse">
                        <div className='form-group'>
                            <input className="form-control" type='email' ref='email' placeholder='מייל' required />
                        </div>
                        <div className='form-group'>
                            <input className="form-control" type='password' ref='pw' placeholder='סיסמא' required />
                            {this.state.loginMsg !== '' && <div className='msg-error'>{this.state.loginMsg}</div>}
                        </div>
                        <div className='form-group'>
                            {this.state.isLoading ?
                                <button className='btn btn-warning'>מתחבר...</button> :
                                <button onClick={this.handleLogin} type='button' className='btn btn-warning login_input'  >היכנס</button>
                            }
                        </div>
                    </form>

                    {/* Reset section */}
                    <div id="resetPassDiv" className="collapse collapses">
                        <form onSubmit={this.reset}>
                            <input ref="resetEmailInput" id="reset" type="email" className="form-control login_input" placeholder="Email" required />
                            <button type="submit" className="btn btn-warning login_input mt-3" >
                                אפס סיסמה
                        </button>
                        </form>
                    </div>

                    <p>
                        <button className="btn btn-link login_input" id="toggle" type="button" data-toggle="collapse" data-target=".collapses" aria-expanded="false" aria-controls="resetPassDiv logForm" onClick={(event) => {
                            event.target.innerHTML = event.target.innerHTML === "התחבר" ? 'שכחת סיסמה?' : "התחבר"
                        }}>
                            שכחת סיסמה?
                            </button>
                    </p>

                </div>

                <Dialog open={this.state.resetPassDialog} aria-labelledby="reset-modal">
                    <DialogTitle id="reset-modal" className="float-right" >
                        <p style={{ float: "right", margin: "0" }}>שינוי סיסמה</p>
                    </DialogTitle>

                    <DialogContent>
                        {this.state.resetPassMsg}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => this.setState({ resetPassDialog: false })} children="סבבה" color="primary" />
                    </DialogActions>
                </Dialog>
                {/* End of reset section */}
            </div>
        )
    }
}

window.ValidateTool = ValidateTool;
export default Login;


/*
<div className='frow'>
        <p className="registerLink" onClick={this.openRegModal}>לא רשומים? הירשמו עכשיו!</p>

            <form className="form" id="registrationForm" style={{ textAlign: 'center' }} onSubmit={this.register}>
                <p className="mt-3">מלאו את הפרטים הבאים</p>
                <div className="form-group">
                    <label for="registerPrivateName">הכנס שם פרטי</label>
                    <input onChange={this.handleInputChange} name='realm' id="registerPrivateName" className="form-control" type='text' required placeholder="הכנס את שמך"></input>
                    <div className="validationError">{this.state.realm.text}</div>
                </div>
                <div className="form-group">
                    <label for="registerEmail">הכנס כתובת מייל</label>
                    <input onChange={this.handleInputChange} name='email' id="registerEmail" className="form-control" type='email' required placeholder={"example@gmail.com"}></input>
                    <div className="validationError">{this.state.email.text}</div>
                </div>
                <div className="form-group">
                    <label for="registerUserName">הכנס שם משתמש</label>
                    <input onChange={this.handleInputChange} name='username' id="registerUserName" className="form-control" type='text' required placeholder="הכנס שם משתמש"></input>
                    <div className="validationError">{this.state.username.text}</div>
                </div>
                <div className="form-group">
                    <label for="registerPasswd">הכנס סיסמא</label>
                    <input required name='password' id="registerPasswd" className="form-control" type='password' required placeholder="הכנס סיסמא" onChange={this.handleInputChange}></input>
                    <div className="validationError">{this.state.password.text}</div>
                </div>
                <button className='btn btn-warning' type='submit'>הירשם!</button>
            </form>

    </div>
*/
