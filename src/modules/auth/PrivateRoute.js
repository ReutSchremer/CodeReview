import React, { Component } from 'react';//, Suspense, lazy
import { Route } from "react-router-dom";
import { Redirect } from 'react-router';
import Auth from './Auth';
import b from 'base-64';


class PrivateRouteAsync extends Component {

  state = { haveAccess: false, loaded: false, }

  componentDidMount() {
    this.checkAcces();
  }

  checkAcces = () => {

    // const { userRole, history } = this.props;
    // let { haveAccess } = this.state;
    Auth.isAuthenticatedSync((isAuth) => {
      this.setState({ haveAccess: isAuth, loaded: true });
    });

  }

  render() {
    const { component: Component, ...rest } = this.props;
    const { loaded, haveAccess } = this.state;
    if (!loaded) return null;
    // console.log("pathname", this.props.location.pathname);


    return (
      <Route key={0}
        {...rest}
        render={props => {
          // console.log("have access?", haveAccess);
          return haveAccess ?
            (<Component {...props} />)
            :
            (<Redirect to={{ pathname: '/', }} />);
        }}
      />
    );

  }
}


// PrivateRoute purpose
// This component aims to provide a distinct separation between two access modes:
// (1) No access: either there's no authentication (anonymous user), or either there's no access according to roles-access.config.json
// In that case (no access), we will NOT expose any route at all to the user for the sake of security, 
// we will render a <div /> which stands for NULL.
// (2) Access permitted: The desired component will be rendered into the route.
// Please do not change any of this functionality without consulting Eran
class PrivateRoute extends Component {

  constructor(props) {
    super(props);
    let kls = Auth.getKls();
    this.klsk = [];
    this.dhp = null;
    //console.log("KLS?",kls);
    //console.log("klo?",JSON.parse(b.decode(kls.klo)));
    try {
      let klsk = JSON.parse(b.decode(kls.klo));
      this.klsk = klsk.a;
      this.dhp = klsk.b;

    } catch (err) { }
    this.haveAccess = Auth.isAuthenticated();
  }

  render() {
    const { compName, component: Component, defaultRedirectComp: Drc, ...rest } = this.props;
    return (

      <Route key={0} {...rest} render={props => {

        if (this.klsk.indexOf(compName) == -1 || !this.haveAccess) {
          return Drc ? <Drc {...props} /> : <Redirect to='/' />
        }
        return <Component {...props} />;
      }} />

    );
  }
}


// MultipleRoute purpose
// This component aims to provide a distinct separation between two access modes:
// (1) No access: either there's no authentication (anonymous user), or either there's no access according to roles-access.config.json
// In that case (no access), we will NOT expose any route at all to the user for the sake of security, 
// we will redirect to '/'.
// (2) Access permitted: The desired component will be rendered into the route.
// Use case scenario:
// Used if you want different components for different roles, 
// and you want to use the same path for those components. (its like HomeRoute without default component.)
// Example:
//     <MultipleRoute path="/example" comps={{ "ex1": HiImAComp, "ex5w": CanYouBelieve }} />
class MultipleRoute extends Component {
  constructor(props) {
    super(props);
    let kls = Auth.getKls();
    this.dhp = null;
    try {
      let klsk = JSON.parse(b.decode(kls.klo));
      this.klsk = klsk.a;

    } catch (err) { }

    this.haveAccess = Auth.isAuthenticated();
  }

  render() {
    const { comps, component: Component, defaultRedirectComp: Drc, ...rest } = this.props;
    let k = Object.keys(comps);
    let intersection = [];
    intersection = Array.isArray(this.klsk) && this.klsk.length > 0 && this.klsk.filter(element => k.includes(element));

    return (
      <Route exact key={0} {...rest} render={props => {
        if (!this.haveAccess || intersection.length === 0 || this.klsk.length === 0) {
          // console.log("Multipleroutes - not authorized!")
          return Drc ? <Drc {...props} /> : <Redirect to="/" />;
        }

        let Co = comps[intersection[0]];
        return <Co {...props} />;
      }} />
    );
  }
}


class HomeRoute extends Component {
  constructor(props) {
    super(props);
    this.initKls();
  }

  shouldComponentUpdate() {

    let oldDhp = this.dhp, oldAc = this.haveAccess;
    this.haveAccess = Auth.isAuthenticated();
    if (oldAc === this.haveAccess)
      return false;
    this.initKls(this.haveAccess)
    return oldDhp !== this.dhp;
  }

  initKls = (isAuth = null) => {
    let kls = Auth.getKls();
    this.dhp = null;
    try {
      let klsk = JSON.parse(b.decode(kls.klo));
      this.dhp = klsk.b;
    } catch (err) { }
    if (isAuth === null) {
      this.haveAccess = Auth.isAuthenticated();
    }
  }

  render() {
    const { comps, component: Component, ...rest } = this.props;
    return (
      <Route exact key={0} {...rest} render={props => {
        let hasDhp = this.dhp !== null && comps[this.dhp] && this.haveAccess;
        let Dhp = <div />;
        if (hasDhp) { Dhp = comps[this.dhp]; }
        return hasDhp ? (<Dhp {...props} />) : (<Component {...props} />);
      }} />
    );
  }
}


// PublicPrivateRoute purpose
// It separates between two access modes and user types:
// (1) Anonymous users:
//     The desired component will be rendered into the route.
// (2) Logged-in users: 
//     Authenticated users cannot access a public route unless it's specified in roles-access.config
// Use case scenario: 
// If a page should be restricted to authenticated users but enabled to anonymous users we should use PublicPrivateRoute
// Whereas inside roles-access.config the user's role access is specified.
// Example:
// login or registration pages should be PUBLIC for anonymous users but DISABLED for logged-in users!
const PublicPrivateRoute = ({ component: Component, ...rest }) => {
  if (Auth.isAuthenticated()) return <PrivateRoute component={Component} {...rest} />
  return (
    <Route {...rest} render={(props) => (<Component {...props} />)} />
  );
}

export { PrivateRoute, PrivateRouteAsync, HomeRoute, MultipleRoute, PublicPrivateRoute };
