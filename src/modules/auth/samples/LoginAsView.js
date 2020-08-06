import React, { Component } from 'react';
import Auth from './../Auth';
// import Styles from './Samples.scss';

export default class LoginAsView extends Component {

    constructor(props) {
        super(props);

        this.state={users:[]};

    }

    componentDidMount(){
        this.getUsersList();
    }

    getUsersList=()=>{

        (async()=>{

            let [res,err]=await Auth.superFetch('/api/CustomUsers');
            
            console.log("Users list",res);
            console.log("Users list err",err);
            if (res!==null){
                this.setState({users:res});    
            }
            

        })();

    }

    loginAs=()=>{
        
        (async()=>{

            
            let res=await Auth.loginAs(3);
            console.log("RES?",res);
            if (res.success==true){
                alert("User has changed to user id (%d)",3)
            }
            //window.location.reload();

        })();
        
        
    }


    render() {
        return (

            <div> <br /> <h2>Login as another user</h2>
                
                <ul>
                    {this.state.users.map(u=><li><input type='checkbox' />{u.id}. {u.username}</li>)}
                </ul>

                <button onClick={this.loginAs}>Login as this user</button>

            </div>
        );
    }
}

