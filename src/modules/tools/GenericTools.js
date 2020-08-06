const GenericTools = {
  getCookieByKey(name) { // mv to tools/cookeis  getcookieByKey
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
  },
  deleteAllCookies() {
    var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  },
  deleteCookieByKey(name, path = '/', domain = null) {
    if (this.getCookieByKey(name)) {
      document.cookie = name + "=" +
        ((path) ? ";path=" + path : "") +
        ((domain) ? ";domain=" + domain : "") +
        ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
    }
  },
  safe_redirect(path) { //works for cordova, and regular browser too.
    if (window.location.hash === "") //normal 
    {
      if (window.location.pathname === path)
        window.location.reload(true);
      else window.location.pathname = path;

    }
    else //hash is probably #/, cordova and hash router case.
    {
      if (window.location.hash === ("#" + path))
        window.location.reload(true);
      else window.location.hash = "#" + path;
    }
  },
  isCordova() {
    return document.URL.indexOf('http://') === -1 &&
      document.URL.indexOf('https://') === -1
  }
}

export default GenericTools;