import AsyncTools from '../tools/AsyncTools';
import GenericTools from '../tools/GenericTools'
// import hooksFactory from "../tools/client/hooks/HooksFactory"
// import consts from "./../tools/client/hooks/consts.json"
import Authentication from './Authentication';

const Auth = {
  _isAuthenticated: false,
  // async isHooksRepository() {
  //   try {
  //     if (!this.hooksRepository) {
  //       // let hooksFactory = require(`./../tools/client/hooks/HooksFactory`).default
  //       if (hooksFactory) {
  //         this.hooksRepository = hooksFactory.getRepository()
  //       }
  //     }
  //     return true;
  //   } catch (err) {
  //     console.log("Hooks factory error", err)
  //     return false;
  //   }
  // },

  getKls() {
    let kls = { kl: this.getItem('kl'), klo: this.getItem('klo') };
    return kls;
  },
  getAccessToken() {
    return this.getItem("access_token");
  },
  isAuthenticated() {
    let at = this.getAccessToken();
    this._isAuthenticated = (at !== null && at !== undefined && at !== "");
    return this._isAuthenticated;
  },

  //Since we are now using cookies, there is no need to use this method anymore
  isAuthenticatedSync(cb) {
    let authentication = Authentication.getInstance();
    authentication.isAuthenticatedSync(cb);
  },

  setItem(id, item, localStorageOnly = false, cookiesOnly = false) {
    if (!localStorageOnly)
      document.cookie = `${id}=${item};path=/`;
    // document.cookie = `${id}=${item};path=/;max-age=${1000 * 60 * 60 * 5}`;
    if (!cookiesOnly)
      localStorage.setItem(id, item);
  },

  getItem(id) {
    let cookie = GenericTools.getCookieByKey(id);
    if (cookie) return cookie;
    return localStorage.getItem(id);
  },

  removeItem(id) {
    localStorage.removeItem(id);
    GenericTools.deleteCookieByKey(id);
  },

  jsonify(res) {
    if (res && res.ok) {
      return res.json();
    } else {
      //console.log("Could not fetch data from server, make sure your server is running? (2)");
      return new Promise((resolve, reject) => {
        reject([]);
      });
    }
  },

  async superAuthFetch(url, payload = null, redirOnFailure = false, fetchOffline = false) {
    if (!navigator.onLine && !fetchOffline) return [null, 'NO_INTERNET'];

    let [res, err] = await AsyncTools.superFetch(url, payload);
    if (err && err.error && err.error.statusCode === 401 && redirOnFailure === true) {
      Auth.logout(() => window.location.href = window.location.origin); //FORCE LOGOUT.      
    }
    return [res, err];
  },

  async loginWithUniqueField(key, value, pw, cb) {
    const [res, err] = await AsyncTools.superFetch('/api/CustomUsers/elogin/', {
      method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, password: pw })
    });

    if (err) {
      this._isAuthenticated = false;
      return new Promise((res, rej) => { res({ success: false, msg: err }) });
    }
    this._isAuthenticated = true;
    if (GenericTools.isCordova()) {
      window.cordova && window.device && window.device.platform !== "iOS" && window.cordova.plugins.CookieManagementPlugin && window.cordova.plugins.CookieManagementPlugin.flush(); //in cordova Android, only after 30 sec the cookies are lunch. This plugin solved the problem: cordova plugin add https://github.com/surgeventures/cordova-plugin-cookie-manager
      this.setItem('klo', res.klo, true, false);
      this.setItem('kl', res.kl, true, false);
      this.setItem('kloo', res.kloo, true, false);
      this.setItem('klk', res.klk, true, false);
      this.setItem('access_token', res.id, true, false);
    }
    return new Promise((resolve, rej) => { resolve({ success: true, user: res }) });
  },

  async login(email, pw, cb, obj = {}) {
    return this.authenticate(email, pw, cb, obj);
  },

  async authenticate(email, pw, cb, { ttl = (60 * 60 * 5) }) {
    let url = "/api/CustomUsers/elogin";
    //     if (await this.isHooksRepository()) {
    //       this.hooksRepository.applyHook(consts.AUTH, consts.HOOK__BEFORE_LOGIN);
    //   //    url = (this.hooksRepository.applyFilterHook && this.hooksRepository.applyFilterHook(consts.AUTH, consts.FILTER_HOOK__FETCH_URL, url)) || 
    // // 
    //       url ="/api/CustomUsers/elogin";
    //     }
    const [res, err] = await AsyncTools.superFetch(url, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pw })
    });

    if (err) {
      this._isAuthenticated = false;
      if (err.error) {
        err.error.msg = 'אחד או יותר מן הפרטים שהזנת אינם נכונים';
        if (err.error.statusCode === 500) {
          if (err.error.code === "USER_BLOCKED") {

            if (err.error.remaining > 0) {
              err.error.msg = `נחסמת עקב יותר מדי נסיונות כניסה, נסה שוב בעוד ${err.error.remaining} דקות`;
            }
            else err.error.msg = "נסה שנית";

          }
          else err.error.msg = 'אין תגובה, בדוק את החיבור לרשת שלך'
        }
      }
      return new Promise((res, rej) => { res({ success: false, msg: err }) });
    }

    this._isAuthenticated = true;
    // if (await this.isHooksRepository()) {
    //   this.hooksRepository.applyHook(consts.AUTH, consts.HOOK__AFTER_LOGIN, res);// HOOK__AFTER_LOGIN
    // }

    if (GenericTools.isCordova()) {
      window.cordova && window.device && window.device.platform !== "iOS" && window.cordova.plugins.CookieManagementPlugin && window.cordova.plugins.CookieManagementPlugin.flush(); //in cordova Android, only after 30 sec the cookies are lunch. This plugin solved the problem: cordova plugin add https://github.com/surgeventures/cordova-plugin-cookie-manager
      this.setItem('klo', res.klo, true, false);
      this.setItem('kl', res.kl, true, false);
      this.setItem('kloo', res.kloo, true, false);
      this.setItem('klk', res.klk, true, false);
      this.setItem('access_token', res.id, true, false);
    }
    if (cb && typeof cb === "function") return cb({ success: true, user: res });
    return new Promise((resolve, rej) => { resolve({ success: true, user: res }) });
  },

  async loginAs(uid, cb) {

    let [at, err] = await Auth.superAuthFetch('/api/CustomUsers/login-as', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid })
    });

    if (err) {
      this._isAuthenticated = false;
      return new Promise((res, rej) => { res({ success: false, msg: err }) });
    }

    console.log("Login res", at);
    this._isAuthenticated = true;

    if (GenericTools.isCordova()) {
      window.cordova && window.device && window.device.platform !== "iOS" && window.cordova.plugins.CookieManagementPlugin && window.cordova.plugins.CookieManagementPlugin.flush(); //in cordova Android, only after 30 sec the cookies are lunch. This plugin solved the problem: cordova plugin add https://github.com/surgeventures/cordova-plugin-cookie-manager
      this.setItem('klo', at.klo, true, false);
      this.setItem('kl', at.kl, true, false);
      this.setItem('access_token', at.id, true, false);
      this.setItem('kloo', at.kloo, true, false);
      this.setItem('klk', at.klk, true, false);
    }

    return new Promise((res, rej) => { res({ success: true }) });
  },
  async logout(cb) {
    await Auth.superAuthFetch('/api/CustomUsers/logout', {
      method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    });
    // if (await this.isHooksRepository()) {
    //   this.hooksRepository.applyHook(consts.AUTH, consts.HOOK__LOGOUT);
    // }

    if (GenericTools.isCordova()) {
      await Auth.superAuthFetch('/api/CustomUsers/deleteUserItems', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });
      this.removeItem('access_token');
      this.removeItem('kl');
      this.removeItem('klo');
      this.removeItem('klk');
      this.removeItem('kloo');
      this.removeItem('olk');
    }


    GenericTools.deleteAllCookies();
    // NtfFactory.getInstance().unsubscribe();
    this._isAuthenticated = false;
    typeof cb === "function" && cb();
    // if (await this.isHooksRepository()) {
    //   this.hooksRepository.applyHook(consts.AUTH, consts.HOOK__REDIRECT_HOME);
    // }
    GenericTools.safe_redirect('/');
    return;
  },


  register(fd, message) {
    var payload = {};
    fd.forEach(function (value, key) {
      payload[key] = value;
    });

    fetch('/api/CustomUsers', {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      method: "POST",
      body: JSON.stringify(payload)
    }).then((res => res.json()))
      .then(res => {
        if (!res.error) {
          // console.log("User registered!!", res);
          // console.log(message)
          return false;
        }
        else {
          if (res.error.code)
            console.log(res.error.message)
          else if (res.error.details.codes.email[0] === "uniqueness")
            console.log("This email is alredy registered in our system.")

        }
      }).catch(error => {
        // console.log("error!!", error);
      })

  },

  // input: fd - array or object - that consist of data of a new user
  //        message - customized confirm email text
  // output: { error: _string_, ok: _bool_ }
  // this function asyncronically adds a new user to the CustomUser table
  // if it succeeds it return {ok:true}
  // if there's an error it returns the error and ok:false
  async registerAsync(fd, message = null) {
    if (!navigator.onLine) return { error: 'NO_INTERNET', ok: false };

    let payload = {};
    if (!fd || typeof fd !== "object") return { error: 'EMPTY_DATA', ok: false };
    if (Array.isArray(fd)) fd.forEach(function (value, key) { payload[key] = value; });
    else for (const [key, value] of Object.entries(fd)) { payload[key] = value; }

    let url = "/api/CustomUsers";

    // if (await this.isHooksRepository()) {
    //   url = (this.hooksRepository.applyFilterHook && this.hooksRepository.applyFilterHook(consts.AUTH, consts.FILTER_HOOK__FETCH_URL, url)) || "/api/CustomUsers";
    // }
    let res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let [err, res2] = await AsyncTools.to(res.json());
      if (err) return { error: err, ok: false };
      return {
        error: res2.error.details ? Object.values(res2.error.details.messages) :
          (res2.error.code ? Object.values(res2.error.code) : "REGISTRATION_ERROR"), ok: false
      };
    }
    // if (await this.isHooksRepository()) {
    //   this.hooksRepository.applyHook(consts.AUTH, consts.HOOK__AFTER_REGISTER, res);
    // }
    return { ok: true };
  },

  inactivityTime(cb) {
    let time;

    function resetTimer() {
      clearTimeout(time);
      time = setTimeout(() => Auth.logout(cb), 10 * 60 * 1000) //10 mins
    }

    window.onload = resetTimer();
    // DOM Events - addeventlisteners
    document.addEventListener("load", resetTimer);
    document.addEventListener("mousemove", resetTimer);
    document.addEventListener("mousedown", resetTimer); // touchscreen presses
    document.addEventListener("touchstart", resetTimer);
    document.addEventListener("click", resetTimer);     // touchpad clicks
    document.addEventListener("scroll", resetTimer);    // scrolling with arrow keys
    document.addEventListener("keypress", resetTimer);
    document.addEventListener("mousewheel", resetTimer);
    document.addEventListener("DOMMouseScroll", resetTimer);
    document.addEventListener("keypress", resetTimer);
  },


  superFetch(url, payload = null, redirOnFailure = false) { return this.superAuthFetch(url, payload, redirOnFailure); },
  //DEPRECATED
  authFetchJsonify(url, payload = null, redirOnFailure = false) { return this.superAuthFetch(url, payload, redirOnFailure); },
  //DEPRECATED
  authFetch(url, payload = null, redirOnFailure = false) { return this.superAuthFetch(url, payload, redirOnFailure); },
  //DEPRECATED 
  getUserId() { return 0; },

}

export default Auth;
