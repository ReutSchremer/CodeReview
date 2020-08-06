const PermissionsFilter = require('./../lib/PermissionsFilter');

module.exports = function (RecordsPermissions) {

    RecordsPermissions.allowFileAccess = (fileInfo, options, cb) => {

        // fileInfo = {
        //     model:'Files', //or Images....
        //     path: '/[path_to_file]' //in public folder
        // };

        (async (cb) => {
            const token = options && options.accessToken;
            const userId = token && token.userId;
            if (!userId) return cb("AUTHORIZATION_ERROR", null);

            fileInfo.accessToken = { userId };
            const permissionsFilter = new PermissionsFilter(fileInfo, RecordsPermissions.app, fileInfo.model);
            const allowAccess = await permissionsFilter.filterByPermissions(); //true/false
            if (!allowAccess) { return cb(null, false) }

            return cb(null, allowAccess);
        })(cb);
    }

    //-----------------REMOTE METHODS DECLARATION BEGINS

    RecordsPermissions.remoteMethod('allowFileAccess', {
        http: {
            path: '/allowFileAccess',
            verb: 'get'
        },
        accepts: [
            { arg: 'fileInfo', type: 'object' },
            { arg: "options", type: "object", http: "optionsFromRequest" }
        ],
        returns: { arg: 'res', type: 'object', root: true }
    });
    //-----------------REMOTE METHODS DECLARATION ENDS

};