
module.exports = function (app) {
    app.get('/', function (req, res, next) {
        console.log("auth middleware for / is launched");
        let cookieVal = (req.accessToken && req.accessToken.id) ? req.accessToken.id : '';
        if (!cookieVal) {
            console.log("AccessToken is not valid, deleting cookies...");
            let cookieKeys = ['access_token', 'kl', 'klo', 'klk', 'kloo', 'olk'];
            for (let key of cookieKeys) { res.clearCookie(key); }
        }
        
        next();
    });
}