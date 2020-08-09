import React, { Component, Suspense } from 'react';
import './App.scss';
import { BrowserRouter as Router, Route, Redirect, Switch } from "react-router-dom";
import Auth from "./modules/auth/Auth";
import Login from "./modules/auth/Login";
import Home from './scenes/Home';
import { PrivateRoute } from './modules/auth/PrivateRoute';
import { HomeRoute } from './modules/auth/PrivateRoute';
import loadable from '@loadable/component';
import ResetPassword from './modules/auth/client/components/ResetPassword';


const SimpleUserHome = loadable(() => import('./scenes/SimpleUserHome'));

class App extends Component {

    constructor(props) {
        super(props);
        this.state = { isAuth: false };

    }

    async componentDidMount() {

        this.isAuth = await Auth.isAuthenticated();
        this.setState({ isAuth: this.isAuth });
    }

    render() {

        const homePages = { SimpleUserHome };

        return (
            <Suspense fallback={<div>Loading...</div>}>
                <Router>
                    <Switch>
                        <div className="App">
                            <HomeRoute exact path="/" component={Home} comps={homePages} />
                            <Route path="/reset-password" component={ResetPassword} />
                            <Route path="/login" render={(props) => <Login {...props} />} />
                        </div>
                    </Switch>
                </Router>
            </Suspense>
        );
    }
}

//export default inject('ExampleStore')(observer(App));
export default App;