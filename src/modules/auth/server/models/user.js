
// Copyright IBM Corp. 2014,2019. All Rights Reserved.
// Node module: loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/*!
 * Module Dependencies.
 */

'use strict';
var g = require('../../../../../node_modules/loopback/lib/globalize');
var isEmail = require('isemail');
var loopback = require('loopback');
var utils = require('../../../../../node_modules/loopback/lib/utils');
const path = require('path');
var qs = require('querystring');
var SALT_WORK_FACTOR = 10;
var crypto = require('crypto');
var logUser = require('debug')('model:user');
const fs = require('fs');
const base64 = require('base-64');
const randomstring = require("randomstring");

// bcrypt's max length is 72 bytes;

// See https://github.com/kelektiv/node.bcrypt.js/blob/45f498ef6dc6e8234e58e07834ce06a50ff16352/src/node_blf.h#L59
var MAX_PASSWORD_LENGTH = 72;
var bcrypt;
try {
  // Try the native module first
  bcrypt = require('bcrypt');
  // Browserify returns an empty object
  if (bcrypt && typeof bcrypt.compare !== 'function') {
    bcrypt = require('bcryptjs');
  }
} catch (err) {
  // Fall back to pure JS impl
  bcrypt = require('bcryptjs');
}

var DEFAULT_TTL = 1209600; // 2 weeks in seconds
var DEFAULT_RESET_PW_TTL = 15 * 60; // 15 mins in seconds
var DEFAULT_MAX_TTL = 31556926; // 1 year in seconds
const HILMA_DEFAULT_MAX_AGE = 18000000;//five hours ms 1000 * 60 * 60 * 5
const HILMA_DEFAULT_TTL = HILMA_DEFAULT_MAX_AGE / 1000;//five hours seconds 60*60*5
var assert = require('assert');

var debug = require('debug')('loopback:user');

//Const Error Codes
const USER_BLOCKED_ERROR_CODE = "USER_BLOCKED";
const PASSWORD_ALREADY_USED_ERROR_CODE = "PASSWORD_ALREADY_USED";

/**
 * Built-in User model.
 * Extends LoopBack [PersistedModel](#persistedmodel-new-persistedmodel).
 *
 * Default `User` ACLs.
 *
 * - DENY EVERYONE `*`
 * - ALLOW EVERYONE `create`
 * - ALLOW OWNER `deleteById`
 * - ALLOW EVERYONE `login`
 * - ALLOW EVERYONE `logout`
 * - ALLOW OWNER `findById`
 * - ALLOW OWNER `updateAttributes`
 *
 * @property {String} username Must be unique.
 * @property {String} password Hidden from remote clients.
 * @property {String} email Must be valid email.
 * @property {Boolean} emailVerified Set when a user's email has been verified via `confirm()`.
 * @property {String} verificationToken Set when `verify()` is called.
 * @property {String} realm The namespace the user belongs to. See [Partitioning users with realms](http://loopback.io/doc/en/lb2/Partitioning-users-with-realms.html) for details.
 * @property {Object} settings Extends the `Model.settings` object.
 * @property {Boolean} settings.emailVerificationRequired Require the email verification
 * process before allowing a login.
 * @property {Number} settings.ttl Default time to live (in seconds) for the `AccessToken` created by `User.login() / user.createAccessToken()`.
 * Default is `1209600` (2 weeks)
 * @property {Number} settings.maxTTL The max value a user can request a token to be alive / valid for.
 * Default is `31556926` (1 year)
 * @property {Boolean} settings.realmRequired Require a realm when logging in a user.
 * @property {String} settings.realmDelimiter When set a realm is required.
 * @property {Number} settings.resetPasswordTokenTTL Time to live for password reset `AccessToken`. Default is `900` (15 minutes).
 * @property {Number} settings.saltWorkFactor The `bcrypt` salt work factor. Default is `10`.
 * @property {Boolean} settings.caseSensitiveEmail Enable case sensitive email.
 *
 * @class User
 * @inherits {PersistedModel}
 */

module.exports = function (User) {
  /**
   * Create access token for the logged in user. This method can be overridden to
   * customize how access tokens are generated
   *
   * Supported flavours:
   *
   * ```js
   * createAccessToken(ttl, cb)
   * createAccessToken(ttl, options, cb);
   * createAccessToken(options, cb);
   * // recent addition:
   * createAccessToken(data, options, cb);
   * ```
   *
   * @options {Number|Object} [ttl|data] Either the requested ttl,
   * or an object with token properties to set (see below).
   * @property {Number} [ttl] The requested ttl
   * @property {String[]} [scopes] The access scopes granted to the token.
   * @param {Object} [options] Additional options including remoting context
   * @callback {Function} cb The callback function
   * @param {String|Error} err The error string or object
   * @param {AccessToken} token The generated access token object
   * @promise
   *
   */
  User.prototype.createAccessToken = function (ttl, options, cb) {
    if (cb === undefined && typeof options === 'function') {
      // createAccessToken(ttl, cb)
      cb = options;
      options = undefined;
    }

    cb = cb || utils.createPromiseCallback();

    let tokenData;
    if (typeof ttl !== 'object') {
      // createAccessToken(ttl[, options], cb)
      tokenData = { ttl };
    } else if (options) {
      // createAccessToken(data, options, cb)
      tokenData = ttl;
    } else {
      // createAccessToken(options, cb);
      tokenData = {};
    }

    var userSettings = this.constructor.settings;
    tokenData.ttl = Math.min(tokenData.ttl || userSettings.ttl, userSettings.maxTTL);
    this.accessTokens.create(tokenData, options, cb);
    return cb.promise;
  };

  function splitPrincipal(name, realmDelimiter) {
    var parts = [null, name];
    if (!realmDelimiter) {
      return parts;
    }
    var index = name.indexOf(realmDelimiter);
    if (index !== -1) {
      parts[0] = name.substring(0, index);
      parts[1] = name.substring(index + realmDelimiter.length);
    }
    return parts;
  }

  /**
   * Normalize the credentials
   * @param {Object} credentials The credential object
   * @param {Boolean} realmRequired
   * @param {String} realmDelimiter The realm delimiter, if not set, no realm is needed
   * @returns {Object} The normalized credential object
   */
  User.normalizeCredentials = function (credentials, realmRequired, realmDelimiter) {
    var query = {};
    credentials = credentials || {};
    if (!realmRequired) {
      if (credentials.email) {
        query.email = credentials.email;
      } else if (credentials.username) {
        query.username = credentials.username;
      }
    } else {
      if (credentials.realm) {
        query.realm = credentials.realm;
      }
      var parts;
      if (credentials.email) {
        parts = splitPrincipal(credentials.email, realmDelimiter);
        query.email = parts[1];
        if (parts[0]) {
          query.realm = parts[0];
        }
      } else if (credentials.username) {
        parts = splitPrincipal(credentials.username, realmDelimiter);
        query.username = parts[1];
        if (parts[0]) {
          query.realm = parts[0];
        }
      }
    }
    return query;
  };

  /**
   * Login a user by with the given `credentials`.
   *
   * ```js
   *    User.login({username: 'foo', password: 'bar'}, function (err, token) {
   *      console.log(token.id);
   *    });
   * ```
   *
   * If the `emailVerificationRequired` flag is set for the inherited user model
   * and the email has not yet been verified then the method will return a 401
   * error that will contain the user's id. This id can be used to call the
   * `api/verify` remote method to generate a new email verification token and
   * send back the related email to the user.
   *
   * @param {Object} credentials username/password or email/password
   * @param {String[]|String} [include] Optionally set it to "user" to include
   * the user info
   * @callback {Function} callback Callback function
   * @param {Error} err Error object
   * @param {AccessToken} token Access token if login is successful
   * @promise
   */

  User.login = function (credentials, include, fn) {
    var self = this;
    if (typeof include === 'function') {
      fn = include;
      include = undefined;
    }

    fn = fn || utils.createPromiseCallback();

    include = (include || '');
    if (Array.isArray(include)) {
      include = include.map(function (val) {
        return val.toLowerCase();
      });
    } else {
      include = include.toLowerCase();
    }

    var realmDelimiter;
    // Check if realm is required
    var realmRequired = !!(self.settings.realmRequired ||
      self.settings.realmDelimiter);
    if (realmRequired) {
      realmDelimiter = self.settings.realmDelimiter;
    }
    var query = self.normalizeCredentials(credentials, realmRequired,
      realmDelimiter);

    if (realmRequired) {
      if (!query.realm) {
        var err1 = new Error(g.f('{{realm}} is required'));
        err1.statusCode = 400;
        err1.code = 'REALM_REQUIRED';
        fn(err1);
        return fn.promise;
      } else if (typeof query.realm !== 'string') {
        var err5 = new Error(g.f('Invalid realm'));
        err5.statusCode = 400;
        err5.code = 'INVALID_REALM';
        fn(err5);
        return fn.promise;
      }
    }
    if (!query.email && !query.username) {
      var err2 = new Error(g.f('{{username}} or {{email}} is required'));
      err2.statusCode = 400;
      err2.code = 'USERNAME_EMAIL_REQUIRED';
      fn(err2);
      return fn.promise;
    }
    if (query.username && typeof query.username !== 'string') {
      var err3 = new Error(g.f('Invalid username'));
      err3.statusCode = 400;
      err3.code = 'INVALID_USERNAME';
      fn(err3);
      return fn.promise;
    } else if (query.email && typeof query.email !== 'string') {
      var err4 = new Error(g.f('Invalid email'));
      err4.statusCode = 400;
      err4.code = 'INVALID_EMAIL';
      fn(err4);
      return fn.promise;
    }


    self.findOne({ where: query }, function (err, user) {
      var defaultError = new Error(g.f('login failed'));
      defaultError.statusCode = 401;
      defaultError.code = 'LOGIN_FAILED';

      function tokenHandler(err, token) {
        if (err) return fn(err);
        if (Array.isArray(include) ? include.indexOf('user') !== -1 : include === 'user') {
          // NOTE(bajtos) We can't set token.user here:
          //  1. token.user already exists, it's a function injected by
          //     "AccessToken belongsTo User" relation
          //  2. ModelBaseClass.toJSON() ignores own properties, thus
          //     the value won't be included in the HTTP response
          // See also loopback#161 and loopback#162
          token.__data.user = user;
        }
        fn(err, token);
      }

      if (err) {
        debug('An error is reported from User.findOne: %j', err);
        fn(defaultError);
      } else if (user) {
        user.hasPassword(credentials.password, function (err, isMatch) {
          if (err) {
            debug('An error is reported from User.hasPassword: %j', err);
            fn(defaultError);
          } else if (isMatch) {
            if (self.settings.emailVerificationRequired && !user.emailVerified) {
              // Fail to log in if email verification is not done yet
              debug('User email has not been verified');
              err = new Error(g.f('login failed as the email has not been verified'));
              err.statusCode = 401;
              err.code = 'LOGIN_FAILED_EMAIL_NOT_VERIFIED';
              err.details = {
                userId: user.id,
              };
              fn(err);
            } else {
              if (user.createAccessToken.length === 2) {
                user.createAccessToken(credentials.ttl, tokenHandler);
              } else {
                user.createAccessToken(credentials.ttl, credentials, tokenHandler);
              }
            }
          } else {
            debug('The password is invalid for user %s', query.email || query.username);
            fn(defaultError);
          }
        });
      } else {
        debug('No matching record is found for user %s', query.email || query.username);
        fn(defaultError);
      }
    });
    return fn.promise;
  };




  User.registerOrLoginByUniqueField = function (uField, uData, roleId, cb, ctx = null, updateCustomFields = [], ttl = null) {
    /**
     * @param {String} uField Unique field that identifies the user.
     * @param {Object} uData  User data to create.
     * @param {Number} roleId Role number to save in case that the user dosent exists.
     * @param {function} cb Callback (obviously)
     * @param ctx OPTIONAL if you have ctx, send it and your cookies will be filled with accessToken, kl, klo.
     * @param {Array} updateCustomFields OPTIONAL, array of fields names to compare and update if there is a diff betweem uData and what we have in DB.  
     */

    (async () => {
      const { RoleMapping } = User.app.models;
      let query = { where: {} };
      query.where[uField] = uData[uField];
      logUser("query", query);
      let [err, res] = await to(this.findOne(query));
      if (err) {
        logUser("Error on serch by field", err);
        return cb(err);
      }
      if (res) {
        logUser(`found by ${uField}`, res);
        let dataToUpdate = {};

        updateCustomFields.forEach(field_name => {
          if (typeof uData[field_name] !== 'undefined' && uData[field_name] != res[field_name]) {//I used != because some fields gets a string and saved as number.
            dataToUpdate[field_name] = uData[field_name];
          }
        });
        if (Object.keys(dataToUpdate).length) {
          let [err] = await to(res.updateAttributes(dataToUpdate));
          if (err) {
            return cb(err);
          }
          logUser("Updated fields to be:", dataToUpdate);
        }

        return this.directLoginAs(res.id, roleId, cb, ctx, ttl);
      }
      //create new user in db.
      let pass = generatePassword(8);
      uData.password = pass;
      uData.emailVerified = 1;
      uData.verificationToken = null;
      let [error, newUser] = await to(this.create(uData));
      if (error) {
        return cb(error);
      }

      if (roleId) {
        let roleMapData = {
          principalType: "USER",
          principalId: newUser.id,
          roleId
        }
        let [error, newRole] = await to(RoleMapping.create(roleMapData));
        if (error) {
          return cb(error);
        }
        logUser("~~we created new user~~\n", newUser, newUser.id, newRole.id);
      }

      return this.directLoginAs(newUser.id, roleId, cb, ctx, ttl); //creates accessToken for user
    })();
  }


  User.loginAs = function (uid, ctx, cb) {

    const token = ctx && ctx.accessToken;
    const userId = token && token.userId;

    if (!userId) {
      logUser("loginAs is launched without authentication, aborting");
      return cb({}, null);
    }


    logUser("User.loginAs is launched with uid", uid);

    this.directLoginAs(uid, null, (err, at) => {
      logUser("err?", err);
      logUser("Returning Access token (only id)?", at);

      if (err) return cb(err);
      cb(null, { accessToken: at.id, kl: at.__data.kl, klo: at.__data.klo });

    })

  }



  User.directLoginAs = function (userId, roleId = null, fn, ctx = null, ttl = null) {
    // const { CustomUser } = User.app.models;
    logUser("User.directLoginAs is launched with userId", userId);

    userId = parseInt(userId);
    if (typeof roleId == "function") { //make roleid optional 
      if (!fn) fn = roleId;
      roleId = null;
    }
    fn = fn || utils.createPromiseCallback();
    var realmDelimiter;
    var realmRequired = false;//!!(self.settings.realmRequired || self.settings.realmDelimiter); 
    var query = { id: userId };
    logUser("query?", query, this);
    this.findOne({ where: query, include: { "roleMapping": 'role' } }, (err, user) => {
      logUser("User.findOne results", user);
      var defaultError = new Error('login failed');
      defaultError.statusCode = 401;
      if (this.settings.emailVerificationRequired && !user.emailVerified) {
        // Fail to log in if email verification is not done yet
        let errToReturn = new Error(g.f('login failed as the email has not been verified'));
        errToReturn.statusCode = 401;
        errToReturn.code = 'LOGIN_FAILED_EMAIL_NOT_VERIFIED';
        logUser('User email has not been verified');
        return fn(errToReturn)
      }
      defaultError.code = 'LOGIN_FAILED';
      var credentials = { ttl: ttl || 60 * 60, password: 'wrong-one', email: user.email }; //todo check 
      async function tokenHandler(err, token) {
        if (err) return fn(err);
        token.__data.user = user;
        if (!user.roleMapping || !user.roleMapping) {
          token.__data.roleCode = null;
          token.__data.klo = "";
          token.__data.kl = "";
          return fn(err, token);
        }

        getKlos(userId, user.roleMapping()).then(klos => {
          token.__data.klo = klos.klo;
          token.__data.kl = klos.kl;
          return fn(null, token);
        })
      }


      if (err) {
        logUser('An error is reported from User.findOne: %j', err);
        return fn(defaultError);
      }

      if (!user) {
        logUser('No matching record is found for user %s', query.email || query.username);
        return fn(defaultError);
      }

      if (user.createAccessToken.length === 2) {
        logUser("user.createAccessToken.length is 2 ?", user.createAccessToken.length);
        user.createAccessToken(credentials.ttl, tokenHandler);
      } else {

        logUser("user.createAccessToken.length is NOT 2 ?", user.createAccessToken.length);
        user.createAccessToken(credentials.ttl, credentials, tokenHandler);
      }

      if (ctx) {
        // setAuthCookies(ctx)
      }
    });
    return fn.promise;
  }


  const TimeCalcs = require('./../../../tools/server/lib/TimeCalcs.js');

  User.checkAccessBeforeLogin = async function (credentials, authConfig) {
    //get auth config for block count and block time
    const block_count_login = authConfig && authConfig.block_count_login || 5;
    const block_time_ms_login = authConfig && authConfig.block_time_ms_login || 600000;
    const now = TimeCalcs.getTimezoneDatetime(Date.now());

    //define app and models
    const app = User.app;
    const models = app && app.models;
    if (!app || !models) throw "Error: app or models is null..";
    const alModel = models.AccessLogger;
    const cuModel = models.CustomUser;

    //check if user has access or is blocked before trying login
    let [alFindErr, alFindRes] = await to(alModel.find({
      where: { email: credentials.email }, order: 'created DESC', limit: block_count_login
    }));
    if (alFindErr || !alFindRes) throw alFindErr || 'LOGIN_ERROR';

    for (const row of alFindRes) {
      if (row.success) { //success === true
        logUser("User has access to login, now trying to login user...");
        let [cuUpsertErr, cuUpsertRes] = await to(cuModel.upsertWithWhere(
          { email: credentials.email }, { loginAccess: 0 }
        ));
        if (cuUpsertErr) throw cuUpsertErr;
        return;
      }
    }

    //check if user has login access
    let created = null;
    if (alFindRes[0] && alFindRes[0].created && alFindRes[0].email === credentials.email) {
      created = new Date(alFindRes[0].created);
      let diff = (now - created);

      if (diff >= block_time_ms_login) {
        let [cuUpsertErr, cuUpsertRes] = await to(cuModel.upsertWithWhere(
          { email: credentials.email }, { loginAccess: 0 }
        ));
        if (cuUpsertErr) throw cuUpsertErr;
        return;
      }
    }

    //check if user is blocked
    let [cuAccessErr, cuAccessRes] = await to(cuModel.findOne({
      where: { email: credentials.email, loginAccess: 1 },
      fields: { loginAccess: true, id: true }
    }));
    if (cuAccessErr) throw cuAccessErr;

    if (created && cuAccessRes) {

      const accessTime = TimeCalcs.getTimezoneDatetime((created.getTime() + block_time_ms_login), false);
      const now = TimeCalcs.getTimezoneDateString();
      throw {
        callback: true,
        error: {
          code: USER_BLOCKED_ERROR_CODE,
          access_time: accessTime,
          remaining: Math.ceil((accessTime.getTime() - now.getTime()) / (60000)),
        }
      };
    }
  }

  User.updateLoginAccessOnError = async function (credentials, authConfig) {
    const models = User.app.models;
    const alModel = models.AccessLogger;
    const cuModel = models.CustomUser;
    const now = TimeCalcs.getTimezoneDatetime(Date.now());

    let [uFindErr, uFindRes] = await to(User.findOne({ where: { email: credentials.email } }));
    if (uFindRes) {
      let [alCreateErr, alCreateRes] = await to(alModel.create({
        email: credentials.email, created: now, success: false
      }));
    }

    const block_count_login = authConfig && authConfig.block_count_login || 5;
    const block_time_ms_login = authConfig && authConfig.block_time_ms_login || 600000;

    let [alFindErr, alFindRes] = await to(alModel.find({
      where: { email: credentials.email }, order: 'created DESC', limit: block_count_login
    }));
    if (alFindRes && alFindRes.length >= block_count_login) {
      let counter = 0;
      for (let alElem of alFindRes) {
        if (alElem.success) return;
        alElem.created = new Date(alElem.created);
        if (now - alElem.created <= block_time_ms_login) counter++;
      }

      if (counter >= block_count_login) {
        let [cuUpsertErr, cuUpsertRes] = await to(cuModel.upsertWithWhere(
          { email: credentials.email }, { loginAccess: 1 }
        ));
        if (cuUpsertErr || !cuUpsertRes) logUser("Error blocking user from logging in..");
      }
    }
  }

  User.updateLoginAccessOnSuccess = async function (credentials) {
    const alModel = User.app.models.AccessLogger;
    const now = TimeCalcs.getTimezoneDatetime(Date.now());
    //success = true is success = 1
    let [alCreateErr, alCreateRes] = await to(alModel.create({ email: credentials.email, success: true, created: now }));
    if (alCreateErr) throw alCreateErr;
  }

  User.extendedLogin = function (credentials, include, callback) {
    // Invoke the default login function\
    //let userModel = CustomUser.app.models.User;
    //logUser("this: ", this);
    //logUser("login: ", CustomUser.login);

    (async (callback) => {
      const app = User.app;
      const models = app && app.models;
      if (!app || !models) return callback("LOGIN_ERROR");
      const pwdModel = models.Stop;

      //get auth config from config.json
      const modulesConfig = app.get("modules");
      const authConfig = modulesConfig && modulesConfig.auth;
      if (!authConfig) console.log("Your config doesn't include module auth. Please add it for security reasons.");
      logUser("Auth config is: ", authConfig);

      if (authConfig && authConfig.access_logger_enabled) {
        try {
          await User.checkAccessBeforeLogin(credentials, authConfig);
        } catch (error) {
          console.log("Error checking login access or user is blocked. Please make sure access_logger table exists for security reasons.");
          if (error && error.callback && error.error) return callback(error.error);
        }
      }

      credentials.ttl = authConfig && authConfig.login_ttl || HILMA_DEFAULT_TTL;
      this.login(credentials, include, async function (loginErr, loginToken) {
        if (loginErr) {
          if (authConfig && authConfig.access_logger_enabled) {
            try {
              await User.updateLoginAccessOnError(credentials, authConfig);
            } catch (error) {
              console.log("Error updating login access. Please make sure access_logger table exists for security reasons.");
            }
          }

          logUser("Login error", loginErr);
          return callback(loginErr);
        }

        if (authConfig && authConfig.access_logger_enabled) {
          try {
            await User.updateLoginAccessOnSuccess(credentials);
          } catch (error) {
            console.log("Error checking login access. Please make sure access_logger table exists for security reasons.");
          }
        }

        logUser("User is logged in with loginToken", loginToken);
        loginToken = loginToken.toObject();

        if (pwdModel && authConfig && authConfig.check_reset_password_enabled) {
          let pwdResetRequired = await pwdModel.checkForResetPassword(loginToken.userId);
          if (pwdResetRequired) loginToken.pwdResetRequired = true;
        }

        getKlos(loginToken.userId).then(klos => {
          //kl == role key, that represents user role
          loginToken.kl = klos.kl;
          //klo == array of view components that user is allowed to access on base64
          loginToken.klo = klos.klo;
          logUser("Extended login output:", loginToken);
          delete loginToken.userId;
          return callback(null, loginToken);
        });
        //return component arr and save in session storage
      });

    })(callback);
  };

  async function getKlos(userId, userRoleMap = null) {
    let rolemap = User.app.models.RoleMapping;
    let res = { kl: "", klo: "" };
    try {

      if (!userRoleMap)
        userRoleMap = await rolemap.findOne({ include: ['role'], where: { principalId: userId } });


      let uRole = {};
      try {
        logUser("user role map", userRoleMap)
        uRole = JSON.parse(JSON.stringify(userRoleMap));
        uRole = uRole == null || !uRole ? {} : uRole;
      } catch (err) {
        logUser("The current user is not associated with any role");
        return res;
      }

      const configFile = path.join(__dirname, '../../../../consts/', 'roles-access.config.json');
      let comps = { a: [], b: "" };
      logUser("configFile", configFile);
      try {
        const rolesAccess = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        //if (rolesAccess[])
        logUser("uRole", uRole);
        if (uRole.role && uRole.role.name && uRole.role.name !== '' && rolesAccess.hasOwnProperty(uRole.role.name) && rolesAccess[uRole.role.name]['comps']) {
          comps.a = rolesAccess[uRole.role.name]['comps'];
          logUser("Valid comps for role %s", uRole.role.name, comps);
          if (rolesAccess[uRole.role.name]['defaultHomePage']) {
            comps.b = rolesAccess[uRole.role.name]['defaultHomePage'];
          }
        }
        logUser("COMPS?", comps);
        let regex = /==|=/gm;
        res.kl = uRole.role && uRole.role.roleKey ? uRole.role.roleKey : "";
        res.klo = base64.encode(JSON.stringify(comps)).replace(regex, '');
        // res.klo = JSON.stringify(comps);
        return res;

      } catch (err) {
        logUser("Could not fetch /src/consts/roles-access.config.json and parse it");
        return { kl: "", klo: "" }
      }
    } catch (err) {
      console.log("ERROR on get klos:", err);
      return { kl: "", klo: "" }
    }
  }



  User.authenticate = function (options, cb) {

    //console.log("authenticate is launched?!");

    const token = options && options.accessToken;
    const userId = token && token.userId;

    if (!userId) {
      //console.log("No authentication");
      return cb(null, { isAuthenticated: false });
    } else {
      //console.log("Authenticated");
      return cb(null, { isAuthenticated: true });
    }

  }


  /**
   * Logout a user with the given accessToken id.
   *
   * ```js
   *    User.logout('asd0a9f8dsj9s0s3223mk', function (err) {
  *      console.log(err || 'Logged out');
  *    });
   * ```
   *
   * @param {String} accessTokenID
   * @callback {Function} callback
   * @param {Error} err
   * @promise
   */

  User.logout = function (tokenId, fn) {
    fn = fn || utils.createPromiseCallback();

    var err;
    if (!tokenId) {
      err = new Error(g.f('{{accessToken}} is required to logout'));
      err.statusCode = 401;
      process.nextTick(fn, err);
      return fn.promise;
    }

    this.relations.accessTokens.modelTo.destroyById(tokenId, function (err, info) {
      if (err) {
        fn(err);
      } else if ('count' in info && info.count === 0) {
        err = new Error(g.f('Could not find {{accessToken}}'));
        err.statusCode = 401;
        fn(err);
      } else {
        fn();
      }
    });
    return fn.promise;
  };

  User.observe('before delete', function (ctx, next) {
    // Do nothing when the access control was disabled for this user model.
    if (!ctx.Model.relations.accessTokens) return next();

    var AccessToken = ctx.Model.relations.accessTokens.modelTo;
    var pkName = ctx.Model.definition.idName() || 'id';
    ctx.Model.find({ where: ctx.where, fields: [pkName] }, function (err, list) {
      if (err) return next(err);

      var ids = list.map(function (u) { return u[pkName]; });
      ctx.where = {};
      ctx.where[pkName] = { inq: ids };

      AccessToken.destroyAll({ userId: { inq: ids } }, next);
    });
  });

  /**
   * Compare the given `password` with the users hashed password.
   *
   * @param {String} password The plain text password
   * @callback {Function} callback Callback function
   * @param {Error} err Error object
   * @param {Boolean} isMatch Returns true if the given `password` matches record
   * @promise
   */

  User.prototype.hasPassword = function (plain, fn) {
    fn = fn || utils.createPromiseCallback();
    if (this.password && plain) {
      bcrypt.compare(plain, this.password, function (err, isMatch) {
        if (err) return fn(err);
        fn(null, isMatch);
      });
    } else {
      fn(null, false);
    }
    return fn.promise;
  };

  /**
   * Change this user's password.
   *
   * @param {*} userId Id of the user changing the password
   * @param {string} oldPassword Current password, required in order
   *   to strongly verify the identity of the requesting user
   * @param {string} newPassword The new password to use.
   * @param {object} [options]
   * @callback {Function} callback
   * @param {Error} err Error object
   * @promise
   */
  User.changePassword = function (userId, oldPassword, newPassword, options, cb) {
    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }
    cb = cb || utils.createPromiseCallback();

    // Make sure to use the constructor of the (sub)class
    // where the method is invoked from (`this` instead of `User`)
    this.findById(userId, options, (err, inst) => {
      if (err) return cb(err);

      if (!inst) {
        const err = new Error(`User ${userId} not found`);
        Object.assign(err, {
          code: 'USER_NOT_FOUND',
          statusCode: 401,
        });
        return cb(err);
      }

      inst.changePassword(oldPassword, newPassword, options, cb);
    });

    return cb.promise;
  };

  /**
   * Change this user's password (prototype/instance version).
   *
   * @param {string} oldPassword Current password, required in order
   *   to strongly verify the identity of the requesting user
   * @param {string} newPassword The new password to use.
   * @param {object} [options]
   * @callback {Function} callback
   * @param {Error} err Error object
   * @promise
   */
  User.prototype.changePassword = function (oldPassword, newPassword, options, cb) {
    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }
    cb = cb || utils.createPromiseCallback();

    this.hasPassword(oldPassword, (err, isMatch) => {
      if (err) return cb(err);
      if (!isMatch) {
        const err = new Error('Invalid current password');
        Object.assign(err, {
          code: 'INVALID_PASSWORD',
          statusCode: 400,
        });
        return cb(err);
      }

      this.setPassword(newPassword, options, cb);
    });
    return cb.promise;
  };

  /**
   * Set this user's password after a password-reset request was made.
   *
   * @param {*} userId Id of the user changing the password
   * @param {string} newPassword The new password to use.
   * @param {Object} [options] Additional options including remoting context
   * @callback {Function} callback
   * @param {Error} err Error object
   * @promise
   */
  User.setPassword = function (userId, newPassword, options, cb) {
    assert(userId != null && userId !== '', 'userId is a required argument');
    assert(!!newPassword, 'newPassword is a required argument');

    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }
    cb = cb || utils.createPromiseCallback();

    // Make sure to use the constructor of the (sub)class
    // where the method is invoked from (`this` instead of `User`)
    this.findById(userId, options, async (err, inst) => {
      if (err) return cb(err);

      if (!inst) {
        const err = new Error(`User ${userId} not found`);
        Object.assign(err, {
          code: 'USER_NOT_FOUND',
          statusCode: 401,
        });
        return cb(err);
      }

      const passwordsModel = this.app.models.Stop;
      if (passwordsModel) {
        let pwdExists = await passwordsModel.checkIfPasswordExists(userId, newPassword);
        if (pwdExists.exists) return cb({ code: PASSWORD_ALREADY_USED_ERROR_CODE });
        let pwdUpsertRes = await passwordsModel.upsertPwd(userId, newPassword);
        if (!pwdUpsertRes.success) logUser("Error upserting new password to Stop model");
      }
      inst.setPassword(newPassword, options, cb);

    });

    return cb.promise;
  };

  /**
   * Set this user's password. The callers of this method
   * must ensure the client making the request is authorized
   * to change the password, typically by providing the correct
   * current password or a password-reset token.
   *
   * @param {string} newPassword The new password to use.
   * @param {Object} [options] Additional options including remoting context
   * @callback {Function} callback
   * @param {Error} err Error object
   * @promise
   */
  User.prototype.setPassword = function (newPassword, options, cb) {
    assert(!!newPassword, 'newPassword is a required argument');

    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }
    cb = cb || utils.createPromiseCallback();

    try {
      this.constructor.validatePassword(newPassword);
    } catch (err) {
      cb(err);
      return cb.promise;
    }

    // We need to modify options passed to patchAttributes, but we don't want
    // to modify the original options object passed to us by setPassword caller
    options = Object.assign({}, options);

    // patchAttributes() does not allow callers to modify the password property
    // unless "options.setPassword" is set.
    options.setPassword = true;

    const delta = { password: newPassword };
    this.patchAttributes(delta, options, (err, updated) => cb(err));

    return cb.promise;
  };

  /**
   * Returns default verification options to use when calling User.prototype.verify()
   * from remote method /user/:id/verify.
   *
   * NOTE: the User.getVerifyOptions() method can also be used to ease the
   * building of identity verification options.
   *
   * ```js
   * var verifyOptions = MyUser.getVerifyOptions();
   * user.verify(verifyOptions);
   * ```
   *
   * This is the full list of possible params, with example values
   *
   * ```js
   * {
   *   type: 'email',
   *   mailer: {
   *     send(verifyOptions, options, cb) {
   *       // send the email
   *       cb(err, result);
   *     }
   *   },
   *   to: 'test@email.com',
   *   from: 'noreply@email.com'
   *   subject: 'verification email subject',
   *   text: 'Please verify your email by opening this link in a web browser',
   *   headers: {'Mime-Version': '1.0'},
   *   template: 'path/to/template.ejs',
   *   templateFn: function(verifyOptions, options, cb) {
   *     cb(null, 'some body template');
   *   }
   *   redirect: '/',
   *   verifyHref: 'http://localhost:3000/api/user/confirm',
   *   host: 'localhost'
   *   protocol: 'http'
   *   port: 3000,
   *   restApiRoot= '/api',
   *   generateVerificationToken: function (user, options, cb) {
   *     cb(null, 'random-token');
   *   }
   * }
   * ```
   *
   * NOTE: param `to` internally defaults to user's email but can be overriden for
   * test purposes or advanced customization.
   *
   * Static default params can be modified in your custom user model json definition
   * using `settings.verifyOptions`. Any default param can be programmatically modified
   * like follows:
   *
   * ```js
   * customUserModel.getVerifyOptions = function() {
   *   const base = MyUser.base.getVerifyOptions();
   *   return Object.assign({}, base, {
   *     // custom values
   *   });
   * }
   * ```
   *
   * Usually you should only require to modify a subset of these params
   * See `User.verify()` and `User.prototype.verify()` doc for params reference
   * and their default values.
   */

  User.getVerifyOptions = function () {
    const defaultOptions = {
      type: 'email',
      from: 'noreply@example.com',
    };
    return Object.assign({}, this.settings.verifyOptions || defaultOptions);
  };

  /**
   * Verify a user's identity by sending them a confirmation message.
   * NOTE: Currently only email verification is supported
   *
   * ```js
   * var verifyOptions = {
   *   type: 'email',
   *   from: 'noreply@example.com'
   *   template: 'verify.ejs',
   *   redirect: '/',
   *   generateVerificationToken: function (user, options, cb) {
   *     cb('random-token');
   *   }
   * };
   *
   * user.verify(verifyOptions);
   * ```
   *
   * NOTE: the User.getVerifyOptions() method can also be used to ease the
   * building of identity verification options.
   *
   * ```js
   * var verifyOptions = MyUser.getVerifyOptions();
   * user.verify(verifyOptions);
   * ```
   *
   * @options {Object} verifyOptions
   * @property {String} type Must be `'email'` in the current implementation.
   * @property {Function} mailer A mailer function with a static `.send() method.
   *  The `.send()` method must accept the verifyOptions object, the method's
   *  remoting context options object and a callback function with `(err, email)`
   *  as parameters.
   *  Defaults to provided `userModel.email` function, or ultimately to LoopBack's
   *  own mailer function.
   * @property {String} to Email address to which verification email is sent.
   *  Defaults to user's email. Can also be overriden to a static value for test
   *  purposes.
   * @property {String} from Sender email address
   *  For example `'noreply@example.com'`.
   * @property {String} subject Subject line text.
   *  Defaults to `'Thanks for Registering'` or a local equivalent.
   * @property {String} text Text of email.
   *  Defaults to `'Please verify your email by opening this link in a web browser:`
   *  followed by the verify link.
   * @property {Object} headers Email headers. None provided by default.
   * @property {String} template Relative path of template that displays verification
   *  page. Defaults to `'../../templates/verify.ejs'`.
   * @property {Function} templateFn A function generating the email HTML body
   *  from `verify()` options object and generated attributes like `options.verifyHref`.
   *  It must accept the verifyOptions object, the method's remoting context options
   *  object and a callback function with `(err, html)` as parameters.
   *  A default templateFn function is provided, see `createVerificationEmailBody()`
   *  for implementation details.
   * @property {String} redirect Page to which user will be redirected after
   *  they verify their email. Defaults to `'/'`.
   * @property {String} verifyHref The link to include in the user's verify message.
   *  Defaults to an url analog to:
   *  `http://host:port/restApiRoot/userRestPath/confirm?uid=userId&redirect=/``
   * @property {String} host The API host. Defaults to app's host or `localhost`.
   * @property {String} protocol The API protocol. Defaults to `'http'`.
   * @property {Number} port The API port. Defaults to app's port or `3000`.
   * @property {String} restApiRoot The API root path. Defaults to app's restApiRoot
   *  or `'/api'`
   * @property {Function} generateVerificationToken A function to be used to
   *  generate the verification token.
   *  It must accept the verifyOptions object, the method's remoting context options
   *  object and a callback function with `(err, hexStringBuffer)` as parameters.
   *  This function should NOT add the token to the user object, instead simply
   *  execute the callback with the token! User saving and email sending will be
   *  handled in the `verify()` method.
   *  A default token generation function is provided, see `generateVerificationToken()`
   *  for implementation details.
   * @callback {Function} cb Callback function.
   * @param {Object} options remote context options.
   * @param {Error} err Error object.
   * @param {Object} object Contains email, token, uid.
   * @promise
   */

  User.prototype.verify = function (verifyOptions, options, cb) {
    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }
    cb = cb || utils.createPromiseCallback();

    var user = this;
    var userModel = this.constructor;
    var registry = userModel.registry;
    verifyOptions = Object.assign({}, verifyOptions);
    // final assertion is performed once all options are assigned
    assert(typeof verifyOptions === 'object',
      'verifyOptions object param required when calling user.verify()');

    // Shallow-clone the options object so that we don't override
    // the global default options object
    verifyOptions = Object.assign({}, verifyOptions);

    // Set a default template generation function if none provided
    verifyOptions.templateFn = verifyOptions.templateFn || createVerificationEmailBody;

    // Set a default token generation function if none provided
    verifyOptions.generateVerificationToken = verifyOptions.generateVerificationToken ||
      User.generateVerificationToken;

    // Set a default mailer function if none provided
    verifyOptions.mailer = verifyOptions.mailer || userModel.email ||
      registry.getModelByType(loopback.Email);

    var pkName = userModel.definition.idName() || 'id';
    verifyOptions.redirect = verifyOptions.redirect || '/';
    var defaultTemplate = path.join(__dirname, '..', '..', 'templates', 'verify.ejs');
    verifyOptions.template = path.resolve(verifyOptions.template || defaultTemplate);
    verifyOptions.user = user;
    verifyOptions.protocol = verifyOptions.protocol || 'http';

    var app = userModel.app;
    verifyOptions.host = verifyOptions.host || (app && app.get('host')) || 'localhost';
    verifyOptions.port = verifyOptions.port || (app && app.get('port')) || 3000;
    verifyOptions.restApiRoot = verifyOptions.restApiRoot || (app && app.get('restApiRoot')) || '/api';

    var displayPort = (
      (verifyOptions.protocol === 'http' && verifyOptions.port == '80') ||
      (verifyOptions.protocol === 'https' && verifyOptions.port == '443')
    ) ? '' : ':' + verifyOptions.port;

    if (!verifyOptions.verifyHref) {
      const confirmMethod = userModel.sharedClass.findMethodByName('confirm');
      if (!confirmMethod) {
        throw new Error(
          'Cannot build user verification URL, ' +
          'the default confirm method is not public. ' +
          'Please provide the URL in verifyOptions.verifyHref.'
        );
      }

      const urlPath = joinUrlPath(
        verifyOptions.restApiRoot,
        userModel.http.path,
        confirmMethod.http.path
      );

      verifyOptions.verifyHref =
        verifyOptions.protocol +
        '://' +
        verifyOptions.host +
        displayPort +
        urlPath +
        '?' + qs.stringify({
          uid: '' + verifyOptions.user[pkName],
          redirect: verifyOptions.redirect,
        });
    }

    verifyOptions.to = verifyOptions.to || user.email;
    verifyOptions.subject = verifyOptions.subject || g.f('Thanks for Registering');
    verifyOptions.headers = verifyOptions.headers || {};

    // assert the verifyOptions params that might have been badly defined
    assertVerifyOptions(verifyOptions);

    // argument "options" is passed depending on verifyOptions.generateVerificationToken function requirements
    var tokenGenerator = verifyOptions.generateVerificationToken;
    if (tokenGenerator.length == 3) {
      tokenGenerator(user, options, addTokenToUserAndSave);
    } else {
      tokenGenerator(user, addTokenToUserAndSave);
    }

    function addTokenToUserAndSave(err, token) {
      if (err) return cb(err);
      user.verificationToken = token;
      user.save(options, function (err) {
        if (err) return cb(err);
        sendEmail(user);
      });
    }

    // TODO - support more verification types
    function sendEmail(user) {
      verifyOptions.verifyHref +=
        verifyOptions.verifyHref.indexOf('?') === -1 ? '?' : '&';
      verifyOptions.verifyHref += 'token=' + user.verificationToken;

      verifyOptions.verificationToken = user.verificationToken;
      verifyOptions.text = verifyOptions.text || g.f('Please verify your email by opening ' +
        'this link in a web browser:\n\t%s', verifyOptions.verifyHref);
      verifyOptions.text = verifyOptions.text.replace(/\{href\}/g, verifyOptions.verifyHref);

      // argument "options" is passed depending on templateFn function requirements
      var templateFn = verifyOptions.templateFn;
      if (templateFn.length == 3) {
        templateFn(verifyOptions, options, setHtmlContentAndSend);
      } else {
        templateFn(verifyOptions, setHtmlContentAndSend);
      }

      function setHtmlContentAndSend(err, html) {
        if (err) return cb(err);

        verifyOptions.html = html;

        // Remove verifyOptions.template to prevent rejection by certain
        // nodemailer transport plugins.
        delete verifyOptions.template;

        // argument "options" is passed depending on Email.send function requirements
        var Email = verifyOptions.mailer;
        if (Email.send.length == 3) {
          Email.send(verifyOptions, options, handleAfterSend);
        } else {
          Email.send(verifyOptions, handleAfterSend);
        }

        function handleAfterSend(err, email) {
          if (err) return cb(err);
          cb(null, { email: email, token: user.verificationToken, uid: user[pkName] });
        }
      }
    }

    return cb.promise;
  };

  function assertVerifyOptions(verifyOptions) {
    assert(verifyOptions.type, 'You must supply a verification type (verifyOptions.type)');
    assert(verifyOptions.type === 'email', 'Unsupported verification type');
    assert(verifyOptions.to, 'Must include verifyOptions.to when calling user.verify() ' +
      'or the user must have an email property');
    assert(verifyOptions.from, 'Must include verifyOptions.from when calling user.verify()');
    assert(typeof verifyOptions.templateFn === 'function',
      'templateFn must be a function');
    assert(typeof verifyOptions.generateVerificationToken === 'function',
      'generateVerificationToken must be a function');
    assert(verifyOptions.mailer, 'A mailer function must be provided');
    assert(typeof verifyOptions.mailer.send === 'function', 'mailer.send must be a function ');
  }

  function createVerificationEmailBody(verifyOptions, options, cb) {
    var template = loopback.template(verifyOptions.template);
    var body = template(verifyOptions);
    cb(null, body);
  }

  /**
   * A default verification token generator which accepts the user the token is
   * being generated for and a callback function to indicate completion.
   * This one uses the crypto library and 64 random bytes (converted to hex)
   * for the token. When used in combination with the user.verify() method this
   * function will be called with the `user` object as it's context (`this`).
   *
   * @param {object} user The User this token is being generated for.
   * @param {object} options remote context options.
   * @param {Function} cb The generator must pass back the new token with this function call.
   */
  User.generateVerificationToken = function (user, options, cb) {
    crypto.randomBytes(64, function (err, buf) {
      cb(err, buf && buf.toString('hex'));
    });
  };

  /**
   * Confirm the user's identity.
   *
   * @param {Any} userId
   * @param {String} token The validation token
   * @param {String} redirect URL to redirect the user to once confirmed
   * @callback {Function} callback
   * @param {Error} err
   * @promise
   */
  User.confirm = function (uid, token, redirect, fn) {
    fn = fn || utils.createPromiseCallback();
    this.findById(uid, function (err, user) {
      if (err) {
        fn(err);
      } else {
        if (user && user.verificationToken === token) {
          user.verificationToken = null;
          user.emailVerified = true;
          user.save(function (err) {
            if (err) {
              fn(err);
            } else {
              fn();
            }
          });
        } else {
          if (user) {
            err = new Error(g.f('Invalid token: %s', token));
            err.statusCode = 400;
            err.code = 'INVALID_TOKEN';
          } else {
            err = new Error(g.f('User not found: %s', uid));
            err.statusCode = 404;
            err.code = 'USER_NOT_FOUND';
          }
          fn(err);
        }
      }
    });
    return fn.promise;
  };

  /**
   * Create a short lived access token for temporary login. Allows users
   * to change passwords if forgotten.
   *
   * @options {Object} options
   * @prop {String} email The user's email address
   * @property {String} realm The user's realm (optional)
   * @callback {Function} callback
   * @param {Error} err
   * @promise
   */

  User.resetPassword = function (options, cb) {
    cb = cb || utils.createPromiseCallback();
    var UserModel = this;
    var ttl = UserModel.settings.resetPasswordTokenTTL || DEFAULT_RESET_PW_TTL;
    options = options || {};
    if (typeof options.email !== 'string') {
      var err = new Error(g.f('Email is required'));
      err.statusCode = 400;
      err.code = 'EMAIL_REQUIRED';
      cb(err);
      return cb.promise;
    }

    try {
      if (options.password) {
        UserModel.validatePassword(options.password);
      }
    } catch (err) {
      return cb(err);
    }
    var where = {
      email: options.email,
    };
    if (options.realm) {
      where.realm = options.realm;
    }
    UserModel.findOne({ where: where }, function (err, user) {
      if (err) {
        return cb(err);
      }
      if (!user) {
        err = new Error(g.f('Email not found'));
        err.statusCode = 404;
        err.code = 'EMAIL_NOT_FOUND';
        return cb(err);
      }
      // create a short lived access token for temp login to change password
      // TODO(ritch) - eventually this should only allow password change
      if (UserModel.settings.emailVerificationRequired && !user.emailVerified) {
        err = new Error(g.f('Email has not been verified'));
        err.statusCode = 401;
        err.code = 'RESET_FAILED_EMAIL_NOT_VERIFIED';
        return cb(err);
      }

      if (UserModel.settings.restrictResetPasswordTokenScope) {
        const tokenData = {
          ttl: ttl,
          scopes: ['reset-password'],
        };
        user.createAccessToken(tokenData, options, onTokenCreated);
      } else {
        // We need to preserve backwards-compatibility with
        // user-supplied implementations of "createAccessToken"
        // that may not support "options" argument (we have such
        // examples in our test suite).
        user.createAccessToken(ttl, onTokenCreated);
      }

      function onTokenCreated(err, accessToken) {
        if (err) {
          return cb(err);
        }
        cb();
        UserModel.emit('resetPasswordRequest', {
          email: options.email,
          accessToken: accessToken,
          user: user,
          options: options
        });
      }
    });

    return cb.promise;
  };

  User.setNewPassword = function (userId, oldPassword, newPassword, options, cb) {
    assert(userId != null && userId !== '', 'userId is a required argument');
    assert(!!newPassword, 'newPassword is a required argument');
    assert(!!oldPassword, 'newPassword is a required argument');

    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }
    cb = cb || utils.createPromiseCallback();

    // Make sure to use the constructor of the (sub)class
    // where the method is invoked from (`this` instead of `User`)
    this.findById(userId, options, async (err, inst) => {
      if (err) return cb(err);

      if (!inst) {
        const err = new Error(`User ${userId} not found`);
        Object.assign(err, {
          code: 'USER_NOT_FOUND',
          statusCode: 401,
        });
        return cb(err);
      }
      let userPwd = inst.password;
      let [errComp, isMatch] = await to(bcrypt.compare(oldPassword, userPwd))
      if (errComp) { return cb(err) }
      if (!isMatch) {
        return cb({ success: false, code: "NOT_MATCH_PASSWORDS" })
      }

      const passwordsModel = User.app.models.Stop;
      if (passwordsModel) {
        let pwdExists = await passwordsModel.checkIfPasswordExists(userId, newPassword);
        if (pwdExists.exists) return cb({ code: PASSWORD_ALREADY_USED_ERROR_CODE });
        let pwdUpsertRes = await passwordsModel.upsertPwd(userId, newPassword);
        if (!pwdUpsertRes.success) logUser("Error upserting new password to Stop model");
      }
      inst.setPassword(newPassword, options, cb);

    });

    return cb.promise

  }

  User.deleteUserItems = function (id, cb) {
    console.log("id", id);
    this.relations.accessTokens.modelTo.destroyById(id, function (err, info) {
      if (err) {
        console.log("err", err)
        cb(err, null);
      } else if ('count' in info && info.count === 0) {
        err = new Error(g.f('Could not find {{accessToken}}'));
        console.log("err", err)
        cb(err);
      } else {
        return cb(null, info)
      }
    });
  };

  /*!
   * Hash the plain password
   */
  User.hashPassword = function (plain) {
    this.validatePassword(plain);
    var salt = bcrypt.genSaltSync(this.settings.saltWorkFactor || SALT_WORK_FACTOR);
    return bcrypt.hashSync(plain, salt);
  };

  User.validatePassword = function (plain) {
    var err;
    if (!plain || typeof plain !== 'string') {
      err = new Error(g.f('Invalid password.'));
      err.code = 'INVALID_PASSWORD';
      err.statusCode = 422;
      throw err;
    }

    // Bcrypt only supports up to 72 bytes; the rest is silently dropped.
    var len = Buffer.byteLength(plain, 'utf8');
    if (len > MAX_PASSWORD_LENGTH) {
      err = new Error(g.f('The password entered was too long. Max length is %d (entered %d)',
        MAX_PASSWORD_LENGTH, len));
      err.code = 'PASSWORD_TOO_LONG';
      err.statusCode = 422;
      throw err;
    }
  };

  User._invalidateAccessTokensOfUsers = function (userIds, options, cb) {
    if (typeof options === 'function' && cb === undefined) {
      cb = options;
      options = {};
    }

    if (!Array.isArray(userIds) || !userIds.length)
      return process.nextTick(cb);

    var accessTokenRelation = this.relations.accessTokens;
    if (!accessTokenRelation)
      return process.nextTick(cb);

    var AccessToken = accessTokenRelation.modelTo;
    var query = { userId: { inq: userIds } };
    var tokenPK = AccessToken.definition.idName() || 'id';
    if (options.accessToken && tokenPK in options.accessToken) {
      query[tokenPK] = { neq: options.accessToken[tokenPK] };
    }
    // add principalType in AccessToken.query if using polymorphic relations
    // between AccessToken and User
    var relatedUser = AccessToken.relations.user;
    var isRelationPolymorphic = relatedUser && relatedUser.polymorphic &&
      !relatedUser.modelTo;
    if (isRelationPolymorphic) {
      query.principalType = this.modelName;
    }
    AccessToken.deleteAll(query, options, cb);
  };

  /*!
   * Setup an extended user model.
   */

  User.setup = function () {
    // We need to call the base class's setup method
    User.base.setup.call(this);
    var UserModel = this;

    // max ttl
    this.settings.maxTTL = this.settings.maxTTL || DEFAULT_MAX_TTL;
    this.settings.ttl = this.settings.ttl || DEFAULT_TTL;

    UserModel.setter.email = function (value) {
      if (!UserModel.settings.caseSensitiveEmail && typeof value === 'string') {
        this.$email = value.toLowerCase();
      } else {
        this.$email = value;
      }
    };

    UserModel.setter.password = function (plain) {
      if (typeof plain !== 'string') {
        return;
      }
      if ((plain.indexOf('$2a$') === 0 || plain.indexOf('$2b$') === 0) && plain.length === 60) {
        // The password is already hashed. It can be the case
        // when the instance is loaded from DB
        this.$password = plain;
      } else {
        this.$password = this.constructor.hashPassword(plain);
      }
    };

    // Make sure emailVerified is not set by creation
    UserModel.beforeRemote('create', function (ctx, user, next) {
      var body = ctx.req.body;
      if (body && body.emailVerified) {
        body.emailVerified = false;
      }
      next();
    });


    //send verification email after registration 
    UserModel.afterRemote('create', function (context, user, next) {

      const defaultEmailOptions = {
        url: "localhost:3000",
        host: "0.0.0.0",
        port: "8080",
        from: "carmelvideos@gmail.com",
        redirect: `http://localhost:3000/#/login?popup=verifiedLogin`,
        protocol: "http"
      };

      const dataSources = UserModel.app.dataSources;
      const myEmailDataSource = dataSources && dataSources.myEmailDataSource && dataSources.myEmailDataSource.settings;
      let emailOptions = myEmailDataSource && myEmailDataSource.emailOptions;

      if (!emailOptions) emailOptions = defaultEmailOptions;
      else if (!emailOptions.redirect) {
        let url = emailOptions.url || defaultEmailOptions.url;
        let protocol = emailOptions.protocol || defaultEmailOptions.protocol;
        emailOptions.redirect = `${protocol}://${url}/login?popup=verifiedLogin`;
      }

      logUser("Verification email options are", emailOptions);
      logUser("If you wish to have different email options, you can declare them in datasources.");

      (async () => {
        const passwordsModel = UserModel.app.models.Stop;
        if (passwordsModel) {
          let pwdUpsertRes = await passwordsModel.upsertPwd(user.id, user.password);
          if (!pwdUpsertRes.success) logUser("Error upserting new password to Stop model");
        }
      })();

      //get auth config from config.json
      const modulesConfig = UserModel.app.get("modules");
      const authConfig = modulesConfig && modulesConfig.auth;
      if (!authConfig) console.log("Your config doesn't include module auth. A deafult registration email will be sent.");
      logUser("Auth config is: ", authConfig);

      const emailText = (authConfig && authConfig.registration_verification_email_text) ?
        (authConfig.registration_verification_email_text.start +
          '<a style="text-decoration: none;" href="{href}">' +
          authConfig.registration_verification_email_text.click +
          '</a><br>' +
          authConfig.registration_verification_email_text.end) :
        'Click <a style="text-decoration: none;" href="{href}">here</a> to verify your email.';
      const emailSubject = (authConfig && authConfig.registration_verification_email_text.subject) || "Verify Registration";

      const options = {
        mailer: UserModel.app.models.Email,
        type: 'email',
        to: user.email,
        // "from" is not relevant if we are sending via nodemailer 
        // and there's a from email in datasources
        // (user.js has to get a not empty from)
        from: emailOptions.from || defaultEmailOptions.from,
        subject: emailSubject,
        text: emailText,
        template: path.resolve(__dirname, '../../server/views/verify.ejs'),
        templateFn: (verifyOptions, options, cb) => {
          return cb(null, verifyOptions.text)
        },
        redirect: emailOptions.redirect,
        user: user,
        host: emailOptions.host || defaultEmailOptions.host,
        port: emailOptions.port || defaultEmailOptions.port,
        protocol: emailOptions.protocol || defaultEmailOptions.protocol
      };

      //send the email, and callback is invoked after the actions takes place
      if (!user.emailVerified) { //not sure this if is neccessary
        user.verify(options, function (err, response) {
          if (err) {
            UserModel.deleteById(user.id);
            return next(err);
          }

          logUser("The verification email was now sent with the email-options: ", options);
          return next();
        });
      } else { logUser("error sending verification email"); return next(); }
    });


    UserModel.beforeRemote('resetPassword', function (ctx, model, next) {
      ctx.req.body.origin = ctx.req.body.origin || ctx.req.headers['x-forwarded-host'];
      next();
    });

    UserModel.on('resetPasswordRequest', function (info) {
      let origin = info.options.origin;
      logUser(info.email); // the email of the requested user
      logUser(info.accessToken.id); // the temp access token to allow password reset

      if (origin.indexOf("http") != 0)
        origin = "http://" + origin;
      let url = origin + '/reset-password';

      //get auth config from config.json
      const modulesConfig = UserModel.app.get("modules");
      const authConfig = modulesConfig && modulesConfig.auth;
      if (!authConfig) console.log("Your config doesn't include module auth. A deafult reset password email will be sent.");
      logUser("Auth config is: ", authConfig);

      let html = (authConfig && authConfig.reset_password_email_text && authConfig.reset_password_email_text.start) ?
        (authConfig.reset_password_email_text.start +
          ' <a href="' + url + '?access_token=' + info.accessToken.id + '">' + authConfig.reset_password_email_text.click + '</a> ' +
          authConfig.reset_password_email_text.end) :
        ('Click <a href="' + url + '?access_token=' + info.accessToken.id + '">here</a> to reset your password');

      UserModel.app.models.Email.send({
        to: info.email,
        subject: (authConfig.reset_password_email_text && authConfig.reset_password_email_text.subject) || 'Password Reset',
        html: html
      }, function (err) {
        if (err) return console.log('> error sending password reset email', err);
        console.log('> sending password reset email to:', info.email);
      });
    });




    UserModel.remoteMethod(
      'login',
      {
        description: 'Login a user with username/email and password.',
        accepts: [
          { arg: 'credentials', type: 'object', required: true, http: { source: 'body' } },
          {
            arg: 'include', type: ['string'], http: { source: 'query' },
            description: 'Related objects to include in the response. ' +
              'See the description of return value for more details.'
          },
        ],
        returns: {
          arg: 'accessToken', type: 'object', root: true,
          description:
            g.f('The response body contains properties of the {{AccessToken}} created on login.\n' +
              'Depending on the value of `include` parameter, the body may contain ' +
              'additional properties:\n\n' +
              '  - `user` - `U+007BUserU+007D` - Data of the currently logged in user. ' +
              '{{(`include=user`)}}\n\n'),
        },
        http: { verb: 'post' },
      }
    );

    UserModel.remoteMethod("loginAs", {
      description: 'Carmel: Enables to login as another user by user id',
      'http': {
        path: '/login-as',
        'verb': 'post'
      },
      'accepts': [
        { arg: 'uid', type: 'number', required: true },
        { arg: 'options', type: 'object', http: 'optionsFromRequest' }
      ],
      'returns': [
        { arg: 'accessToken', type: 'string', root: true }
      ]

    });

    UserModel.remoteMethod('extendedLogin', {
      description: 'Carmel: This login matches also user roles',
      'http': {
        'path': '/elogin',
        'verb': 'post'
      },
      'accepts': [
        {
          'arg': 'credentials',
          'type': 'object',
          'description': 'Login credentials',
          'required': true,
          'http': {
            'source': 'body'
          }
        },
        {
          'arg': 'include',
          'type': 'string',
          'description': 'Related objects to include in the response. See the description of return value for more details.',
          'http': {
            'source': 'query'
          }
        }
      ],
      'returns': [
        {
          'arg': 'token',
          'type': 'object',
          'root': true
        }
      ]
    });


    UserModel.remoteMethod(
      'logout',
      {
        description: 'Logout a user with access token.',
        accepts: [
          {
            arg: 'access_token', type: 'string', http: function (ctx) {
              var req = ctx && ctx.req;
              var accessToken = req && req.accessToken;
              var tokenID = accessToken ? accessToken.id : undefined;

              return tokenID;
            }, description: 'Do not supply this argument, it is automatically extracted ' +
              'from request headers.',
          },
        ],
        http: { verb: 'all' },
      }
    );

    UserModel.remoteMethod(
      'prototype.verify',
      {
        description: 'Trigger user\'s identity verification with configured verifyOptions',
        accepts: [
          { arg: 'verifyOptions', type: 'object', http: ctx => this.getVerifyOptions() },
          { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        ],
        http: { verb: 'post' },
      }
    );

    UserModel.remoteMethod(
      'confirm',
      {
        description: 'Confirm a user registration with identity verification token.',
        accepts: [
          { arg: 'uid', type: 'string', required: true },
          { arg: 'token', type: 'string', required: true },
          { arg: 'redirect', type: 'string' },
        ],
        http: { verb: 'get', path: '/confirm' },
      }
    );

    UserModel.remoteMethod(
      'resetPassword',
      {
        description: 'Reset password for a user with email.',
        accepts: [
          { arg: 'options', type: 'object', required: true, http: { source: 'body' } },
        ],
        http: { verb: 'post', path: '/reset' },
      }
    );

    UserModel.remoteMethod(
      'changePassword',
      {
        description: 'Change a user\'s password.',
        accepts: [
          { arg: 'id', type: 'any', http: getUserIdFromRequestContext },
          { arg: 'oldPassword', type: 'string', required: true, http: { source: 'form' } },
          { arg: 'newPassword', type: 'string', required: true, http: { source: 'form' } },
          { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        ],
        http: { verb: 'POST', path: '/change-password' },
      }
    );
    UserModel.remoteMethod(
      'setNewPassword',
      {
        description: 'Change a user\'s password.',
        accepts: [
          { arg: 'id', type: 'any', http: getUserIdFromRequestContext },
          { arg: 'oldPassword', type: 'string', required: true, http: { source: 'form' } },
          { arg: 'newPassword', type: 'string', required: true, http: { source: 'form' } },
          { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        ],
        http: { verb: 'POST', path: '/set-new-password' },
      }
    );
    const setPasswordScopes = UserModel.settings.restrictResetPasswordTokenScope ?
      ['reset-password'] : undefined;

    UserModel.remoteMethod(
      'setPassword',
      {
        description: 'Reset user\'s password via a password-reset token.',
        accepts: [
          { arg: 'id', type: 'any', http: getUserIdFromRequestContext },
          { arg: 'newPassword', type: 'string', required: true, http: { source: 'form' } },
          { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        ],
        accessScopes: setPasswordScopes,
        http: { verb: 'POST', path: '/reset-password' },
      }
    );

    UserModel.remoteMethod(
      'deleteUserItems',
      {
        description: 'deleteUserItems',
        accepts: [
          {
            arg: 'access_token', type: 'string', http: function (ctx) {
              var req = ctx && ctx.req;
              var accessToken = req && req.accessToken;
              var tokenID = accessToken ? accessToken.id : undefined;

              return tokenID;
            }
          },
        ],
        http: { verb: 'POST', path: '/deleteUserItems' },
        returns: { arg: 'res', type: "object", root: true },
      }
    );

    function getUserIdFromRequestContext(ctx) {
      const token = ctx.req.accessToken;
      if (!token) return;

      const hasPrincipalType = 'principalType' in token;
      if (hasPrincipalType && token.principalType !== UserModel.modelName) {
        // We have multiple user models related to the same access token model
        // and the token used to authorize reset-password request was created
        // for a different user model.
        const err = new Error(g.f('Access Denied'));
        err.statusCode = 403;
        throw err;
      }

      return token.userId;
    }

    UserModel.afterRemote('confirm', function (ctx, inst, next) {
      if (ctx.args.redirect !== undefined) {
        if (!ctx.res) {
          return next(new Error(g.f('The transport does not support HTTP redirects.')));
        }
        ctx.res.location(ctx.args.redirect);
        ctx.res.status(302);
      }
      next();
    });

    UserModel.afterRemote('extendedLogin', function (ctx) {
      console.log("After remote extendedlogin is launched");

      let expires;
      if (ctx.result && ctx.result.ttl) {
        expires = new Date(Date.now() + (ctx.result.ttl * 1000));
      }
      else expires = new Date(Date.now() + HILMA_DEFAULT_MAX_AGE);

      ctx.res.cookie('access_token', ctx.result.id, { signed: true, expires });
      // //These are all 'trash' cookies in order to confuse the hacker who tries to penetrate kl,klo cookies
      ctx.res.cookie('kloo', randomstring.generate(), { signed: true, expires });
      ctx.res.cookie('klk', randomstring.generate(), { signed: true, expires });
      ctx.res.cookie('olk', randomstring.generate(), { signed: true, expires });
      ctx.res.cookie('klo', ctx.result.klo, { signed: false, expires });
      ctx.res.cookie('kl', ctx.result.kl, { signed: false, expires });

      return Promise.resolve();
    });

    UserModel.afterRemote('loginAs', (ctx, model, next) => {
      console.log("After remote loginAs is launched");
      ctx = removeAuthCookies(ctx);//for cordova, remove server cookies dont work in client side
      ctx = setAuthCookies(ctx);
      next();
    });


    UserModel.afterRemote('deleteUserItems', (ctx, model, next) => {
      ctx = removeAuthCookies(ctx);
      next();
    });

    UserModel.afterRemote('registerOrLoginByUniqueField', (ctx, model, next) => {
      console.log("After remote registerOrLoginByUniqueField is launched");
      ctx = setAuthCookies(ctx);
      next();
    });

    function setAuthCookies(ctx) {
      let expires;
      if (ctx.result && ctx.result.ttl)
        expires = new Date(Date.now() + (ctx.result.ttl * 60));
      else expires = new Date(Date.now() + HILMA_DEFAULT_MAX_AGE);

      ctx.res.cookie('access_token', ctx.result.accessToken, { signed: true, expires });
      ctx.res.cookie('klo', ctx.result.klo, { signed: false, expires });
      ctx.res.cookie('kl', ctx.result.kl, { signed: false, expires });
      // //These are all 'trash' cookies in order to confuse the hacker who tries to penetrate kl,klo cookies
      ctx.res.cookie('kloo', randomstring.generate(), { signed: true, expires });
      ctx.res.cookie('klk', randomstring.generate(), { signed: true, expires });
      ctx.res.cookie('olk', randomstring.generate(), { signed: true, expires });
      return ctx;
    }

    function removeAuthCookies(ctx) {
      ctx.res.cookie('access_token', { maxAge: Date.now() });
      ctx.res.cookie('kloo', { maxAge: Date.now() });
      ctx.res.cookie('klk', { maxAge: Date.now() });
      ctx.res.cookie('olk', { maxAge: Date.now() });
      ctx.res.cookie('klo', { maxAge: Date.now() });
      ctx.res.cookie('kl', { maxAge: Date.now() });
      return ctx;
    }

    UserModel.afterRemote('logout', function (ctx) {
      console.log("After remote logout is launched");
      ctx.res.clearCookie('access_token');
      return Promise.resolve();
    });

    UserModel.remoteMethod('authenticate', {
      http: { verb: 'get' },
      description: 'Carmel:Confirm a user authentication',
      accepts: [
        { arg: "options", type: "object", http: "optionsFromRequest" }
      ],
      returns: { type: 'object', root: true }
    }
    );

    // default models
    assert(loopback.Email, 'Email model must be defined before User model');
    UserModel.email = loopback.Email;

    assert(loopback.AccessToken, 'AccessToken model must be defined before User model');
    UserModel.accessToken = loopback.AccessToken;

    UserModel.validate('email', emailValidator, {
      message: g.f('Must provide a valid email'),
    });

    // Realm users validation
    if (UserModel.settings.realmRequired && UserModel.settings.realmDelimiter) {
      UserModel.validatesUniquenessOf('email', {
        message: 'Email already exists',
        scopedTo: ['realm'],
      });
      UserModel.validatesUniquenessOf('username', {
        message: 'User already exists',
        scopedTo: ['realm'],
      });
    } else {
      // Regular(Non-realm) users validation
      UserModel.validatesUniquenessOf('email', { message: 'Email already exists' });
      UserModel.validatesUniquenessOf('username', { message: 'User already exists' });
    }

    return UserModel;
  };

  /*!
   * Setup the base user.
   */

  User.setup();

  // --- OPERATION HOOKS ---
  //
  // Important: Operation hooks are inherited by subclassed models,
  // therefore they must be registered outside of setup() function

  // Access token to normalize email credentials
  User.observe('access', function normalizeEmailCase(ctx, next) {
    if (!ctx.Model.settings.caseSensitiveEmail && ctx.query.where &&
      ctx.query.where.email && typeof (ctx.query.where.email) === 'string') {
      ctx.query.where.email = ctx.query.where.email.toLowerCase();
    }
    next();
  });

  User.observe('before save', function rejectInsecurePasswordChange(ctx, next) {
    const UserModel = ctx.Model;
    if (!UserModel.settings.rejectPasswordChangesViaPatchOrReplace) {
      // In legacy password flow, any DAO method can change the password
      return next();
    }

    if (ctx.isNewInstance) {
      // The password can be always set when creating a new User instance
      return next();
    }
    const data = ctx.data || ctx.instance;
    const isPasswordChange = 'password' in data;

    // This is the option set by `setPassword()` API
    // when calling `this.patchAttritubes()` to change user's password
    if (ctx.options.setPassword) {
      // Verify that only the password is changed and nothing more or less.
      if (Object.keys(data).length > 1 || !isPasswordChange) {
        // This is a programmer's error, use the default status code 500
        return next(new Error(
          'Invalid use of "options.setPassword". Only "password" can be ' +
          'changed when using this option.'
        ));
      }

      return next();
    }

    if (!isPasswordChange) {
      return next();
    }

    const err = new Error(
      'Changing user password via patch/replace API is not allowed. ' +
      'Use changePassword() or setPassword() instead.'
    );
    err.statusCode = 401;
    err.code = 'PASSWORD_CHANGE_NOT_ALLOWED';
    next(err);
  });

  User.observe('before save', function prepareForTokenInvalidation(ctx, next) {
    if (ctx.isNewInstance) return next();
    if (!ctx.where && !ctx.instance) return next();

    var pkName = ctx.Model.definition.idName() || 'id';
    var where = ctx.where;
    if (!where) {
      where = {};
      where[pkName] = ctx.instance[pkName];
    }

    ctx.Model.find({ where: where }, ctx.options, function (err, userInstances) {
      if (err) return next(err);
      ctx.hookState.originalUserData = userInstances.map(function (u) {
        var user = {};
        user[pkName] = u[pkName];
        user.email = u.email;
        user.password = u.password;
        return user;
      });
      var emailChanged;
      if (ctx.instance) {
        // Check if map does not return an empty array
        // Fix server crashes when try to PUT a non existent id
        if (ctx.hookState.originalUserData.length > 0) {
          emailChanged = ctx.instance.email !== ctx.hookState.originalUserData[0].email;
        } else {
          emailChanged = true;
        }

        if (emailChanged && ctx.Model.settings.emailVerificationRequired) {
          ctx.instance.emailVerified = false;
        }
      } else if (ctx.data.email) {
        emailChanged = ctx.hookState.originalUserData.some(function (data) {
          return data.email != ctx.data.email;
        });
        if (emailChanged && ctx.Model.settings.emailVerificationRequired) {
          ctx.data.emailVerified = false;
        }
      }

      next();
    });
  });

  User.observe('after save', function invalidateOtherTokens(ctx, next) {
    if (!ctx.instance && !ctx.data) return next();
    if (!ctx.hookState.originalUserData) return next();

    var pkName = ctx.Model.definition.idName() || 'id';
    var newEmail = (ctx.instance || ctx.data).email;
    var newPassword = (ctx.instance || ctx.data).password;

    if (!newEmail && !newPassword) return next();

    if (ctx.options.preserveAccessTokens) return next();

    var userIdsToExpire = ctx.hookState.originalUserData.filter(function (u) {
      return (newEmail && u.email !== newEmail) ||
        (newPassword && u.password !== newPassword);
    }).map(function (u) {
      return u[pkName];
    });
    ctx.Model._invalidateAccessTokensOfUsers(userIdsToExpire, ctx.options, next);
  });





};

function emailValidator(err, done) {
  var value = this.email;
  if (value == null)
    return;
  if (typeof value !== 'string')
    return err('string');
  if (value === '') return;
  if (!isEmail.validate(value))
    return err('email');
}

function joinUrlPath(args) {
  var result = arguments[0];
  for (var ix = 1; ix < arguments.length; ix++) {
    var next = arguments[ix];
    result += result[result.length - 1] === '/' && next[0] === '/' ?
      next.slice(1) : next;
  }
  return result;
}

function generatePassword(length = 8) {
  var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$",
    retVal = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

function to(promise) {
  return promise.then(data => {
    return [null, data];
  })
    .catch(err => [err]);
}
