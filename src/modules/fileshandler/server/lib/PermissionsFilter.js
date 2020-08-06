const squel = require('squel');
const logFile = require('debug')('model:file');
const Consts = require('../../consts/Consts.json');

function to(promise) { return promise.then(data => { return [null, data]; }).catch(err => [err]); }
async function exeQuery(sql, app) { return await to(new Promise(function (resolve, reject) { let ds = app.dataSources['msql']; ds.connector.execute(sql, [], function (err, res) { if (err) reject(res); else resolve(res); }); })); }

module.exports = class PermissionsFilter {

    constructor(req, app, fileModel) {
        this.request = req;
        this.app = app;
        this.pRecords = [];
        this.fileModel = fileModel;
    }

    findByKeys(args) {
        let isMatch = false;

        for (let pRecord of this.pRecords) {
            isMatch = true;
            Object.keys(args).forEach((argKey) => {
                let argValue = args[argKey];

                if (!pRecord[argKey] || Array.isArray(argValue) || argValue != pRecord[argKey])
                    isMatch = false;

                if (argKey === 'recordId' && argValue === pRecord[argKey]) isMatch = true;
            })

            if (isMatch) return pRecord;
        };

        return isMatch; //false
    }

    async filterByPermissions() {

        logFile("Permissions.Filter.filterByPermissions is launched");
        let authStatus = Consts.NOT_AUTHENTICATED;

        //extract access token and find out user id
        logFile("this.request.accessToken", this.request.accessToken)
        const userId = this.request.accessToken && this.request.accessToken.userId;
        if (!userId) {
            logFile("no user id (user is logged out), aborting...");
            authStatus = Consts.NOT_AUTHENTICATED;
        } else authStatus = Consts.AUTHENTICATED;

        const filePath = this.request.path ? this.request.path.split('/') : this.request.params[0].split('/');
        const fileName = filePath[filePath.length - 1];

        let fileId = fileName.split('.')[0]; //principalId
        const model = this.fileModel;

        const [rmRoleErr, rmRole] = await to(this.app.models.RoleMapping.findOne({
            where: { principalId: userId },
            fields: { roleId: true },
            include: 'role'
        }));
        if (rmRoleErr) {
            logFile("error finding user role from rolemapping", rmRoleErr);
        }

        logFile("user role from rolemapping: rmRole", rmRole)
        if (!(rmRole && rmRole.role && rmRole.role.name)) {
            logFile("no user role found, try %s...", authStatus);
        }

        let userRole = null;
        try {
            const parsedRmRole = JSON.parse(JSON.stringify(rmRole));
            userRole = parsedRmRole && parsedRmRole.role && parsedRmRole.role.name;
        } catch (err) {
            logFile("Could not parse rmRole into object, userRole, err", userRole, err);
        }

        logFile("userRole", userRole);
        let query = squel
            .select({ separator: "\n" })
            .field("*")
            .from('records_permissions')
            .where("model=?", model)
            .where(
                squel.expr()
                    .and("principalId is null")
                    .or("principalId=?", userId)
                    .or("principalId=?", userRole)
                    .or("principalId=?", Consts.EVERYONE)
                    .or("principalId=?", authStatus)
            )
            .where(
                squel.expr().and("recordId is null").or("recordId=?", fileId)
            );

        logFile("\nSQL Query", query.toString());
        logFile("\n");

        let [err, pRecords] = await exeQuery(query.toString(), this.app);
        if (err) { logFile("exeQuery err", err); return false; }
        if (!pRecords) { logFile("no precords, aborting..."); return false; }

        logFile("pRecords", pRecords);

        this.pRecords = pRecords;

        let allow = false;

        let record = null;

        record = this.findByKeys({ recordId: null });
        if ((record && record.permission == Consts.ALLOW)) allow = true;

        logFile("Step 0 (all " + model + ") are allowed?", allow);

        record = this.findByKeys({ principalType: Consts.ROLE, principalId: Consts.EVERYONE });
        if (record && record.permission == Consts.ALLOW) allow = true;

        logFile("Step 1 ($everyone) is allowed?", allow);

        record = this.findByKeys({ principalType: Consts.ROLE, principalId: authStatus });
        if ((record && record.permission == Consts.ALLOW) || (allow && !record)) allow = true;

        logFile("Step 2 (authenticated/unathenticated) is allowed?", allow);

        record = this.findByKeys({ principalType: Consts.ROLE, principalId: userRole });
        if ((record && record.permission == Consts.ALLOW) || (allow && !record)) allow = true;

        logFile("Step 3 (userRole: " + userRole + ") is allowed?", allow);

        record = this.findByKeys({ principalType: Consts.USER, principalId: userId });
        if ((record && record.permission == Consts.ALLOW) || (allow && !record)) allow = true;
        else allow = false;

        logFile("Step 4 Final (principalId " + userId + ") is allowed?", allow);

        return allow;
    }
}
