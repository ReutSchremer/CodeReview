import Validate from 'validate.js';

const CarmelValidate = {
    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    },

    mergeDeep(target, source) { // this function merges objects. it also merges the sub-objects.
        let output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        if (key !== "eTarget") {
                            Object.assign(output, { [key]: source[key] });
                        }
                    }
                    else {
                        output[key] = this.mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    },

    runValidate(data, rules = null, whitelist = null, depth = 10) {
        if (depth < 0)
            // throw 'TOO DEEP BRO.' + depth;
            throw new Error('TOO DEEP BRO.' + depth);
        if (whitelist) {
            data = Validate.cleanAttributes(data, whitelist);
            // if (rules) rules = Validate.cleanAttributes(rules, whitelist); //clean up rules isnt helping anythig.
        }
        let res;
        if (this.isObject(data)) {
            try {
                if (rules && rules.type) {
                    if (rules.type !== "object" && !this.isObject(rules.type)) {
                        // throw `WANTED ${rules.type} GOT object.`
                        throw new Error(`WANTED ${rules.type} GOT object.`);
                    }
                    else
                        delete rules.type; //cannot run that way
                }
                rules = this.createDefaultRules(data, rules, depth);
                res = Validate.validate(data, rules);
            }
            catch (err) {
                console.log(err);
                return { success: 0 };
            }
        }

        else {
            if (rules.eTarget && rules.eTarget.type === 'number' && !data) return;
            return this.ValidateVar(data, rules);
        }


        if (res === undefined)
            return { data: data, success: 1 };
        console.log("ERROR:", res);
        return { success: 0, errors: res };


    },

    createDefaultRules(data, rules, depth, originPath = "") {
        if (depth < 0)
            throw 'TOO DEEP BRO.' + depth;
        if (!rules) rules = {};
        if (this.isObject(data))
            rules = this.getObjectRules(data, rules, depth, originPath);

        else if (Validate.isArray(data))
            rules[originPath] = this.getArrayRules(data, rules[originPath], depth);

        else if (Validate.isDate(data))
            rules[originPath] = this.getDateRules(rules[originPath]);

        else if (Validate.isString(data))
            rules[originPath] = this.getStringRules(rules[originPath], originPath);

        else if (Validate.isNumber(data))
            rules[originPath] = this.getNumberRules(rules[originPath]);

        return rules;

    },

    ValidateVar(data, rule) { // for variable who is not inside an object we use validate.single and not validate.validate(). 
        if (this.isObject(data))
            return this.runValidate(data, rule);

        else if (Validate.isArray(data)) {
            Validate.single(data);
        }

        if (Validate.isDate(data))
            rule = this.getDateRules();

        else if (Validate.isString(data)) {
            rule = this.getStringRules(rule);
        }

        else if (Validate.isNumber(data)) {
            rule = this.getNumberRules(rule);

        }
        if (Validate.single(data, rule) === undefined) {
            return { success: 1 };
        }
        else {
            return { success: 0, rule: rule.format ? rule : { ...rule, format: { message: "כתובת לא מאומתת" } } }
        }
    },


    getObjectRules(data, rules, depth = 0, originKey = "") { // in this function we dont clean attr BECAUSE its the fileds names.
        if (depth < 0)
            throw new Error('TOO DEEP BRO.' + depth);


        let keys = Object.keys(data);
        if (keys.length > this.originRules.object.maximum) {
            throw new Error("DATA OUT OF RANGE");
        }

        if (!rules) rules = {};
        if (data)
            if (originKey !== "") originKey += '.'
        keys.map(key => {
            rules = this.mergeDeep(rules, this.createDefaultRules(data[key], rules, depth - 1, originKey + key));
        });
        return rules;
    },


    getArrayRules(data, rules, depth) { // we run extra validations on array: this is not the default of validate.js.
        if (data.length > 100)
            throw new Error("DATA OUT OF RANGE");
        let extendedRules = {};
        if (rules && rules.extendedRules) {
            extendedRules = rules.extendedRules;
        }

        rules = Validate.cleanAttributes(rules, this.rulesWhitelist);

        if (data.length) {

            let type = typeof data[0];
            let res;
            for (let i = 0; i < data.length; i++) {

                if (extendedRules.consistent && typeof data[i] !== type)
                    throw new Error("ARRAY DOES NOT CONATINS CONSISTENT DATA");

                //inside extended rules, set rule by index(as 0:{...}) or by setting 'all'. 
                res = this.runValidate(data[i], extendedRules[i] || extendedRules.all, null, depth - 1);

                if (!res.success)
                    throw res;
            }
        }

        return {
            length: { minimum: 0, maximum: 100 }
        }
    },


    getDateRules() { }, //todo?? 



    getStringRules(rule = {}, originPath = "") {
        if (originPath.split('.').pop() === "email")
            return { email: true, length: { maximum: 100 } }
        if (rule.email) {
            return this.mergeDeep({
                length: { maximum: 10000 }
            }, rule);
        }
        if (rule.eTarget && rule.eTarget.type === 'password') {
            return this.mergeDeep(
                this.originRules.password, rule)
        }
        return this.mergeDeep(
            this.originRules.string, rule)
    },


    getNumberRules(rule = null) {
        if (!rule) rule = {};
        rule = Validate.cleanAttributes(rule, this.rulesWhitelist)
        if ((rule.type && rule.type === "number") || !rule.type) {
            let newRules = {
                type: 'number',
                numericality: {
                    greaterThan: -10000000000,
                    lessThanOrEqualTo: 10000000000
                }
            }
            return this.mergeDeep(newRules, rule);
        }
        else return rule;
    },

    originRules: {
        array: {
            range: {
                min: 0,
                max: 100
            }
        },
        object: {
            maximum: 30
        },
        number: {
            range: {
                min: -1000000000,
                max: 1000000000
            }
        },
        string: {

            format: {
                pattern: "[a-z0-9א-ת -:._]*",
                flags: "i",
                message: "חייב להכיל אותיות או מספרים בלבד"
            },
            length: { maximum: 10000 }
        }
        ,
        password: {
            format: {
                pattern: '(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}',
                message: "הסיסמה חייבת להכיל אות קטנה ואות גדולה באנגלית מספר ולהיות באורך של 8 ספרות "
            },
            length: { maximum: 10000 }
        }
    },


    rulesWhitelist: {
        earliest: true,
        latest: true,
        dateOnly: true,
        equality: true,

        email: true,
        length: true,
        exclusion: true,
        inclusion: true,
        message: true,
        format: true,

        numericality: true,
        presence: true,
        type: true,
        url: true

    }

};

export default CarmelValidate;


// console.log(" WELL,",

//     CarmelValidate.runValidate(
//         {
//             email: "kopgfkdp@fds.com",
//             arr: ["str$$"],
//             username: { ar: { trrt: 4 } },
//             you: 42,
//             password: '230jvjvjve'
//         },
//         {
//             password: { type: 'string', length: { minimum: 3 } },
//             you: {
//                 numericality: {
//                     greaterThan: 32
//                 }
//             },
//             arr: {
//                 extendedRules: {
//                     consistent: false, all: {
//                         type: 'string',
//                         format: {
//                             pattern: "[a-z0-9א-ת $]*",
//                             flags: "i",
//                             message: "hahaha"
//                         },
//                     }
//                 }
//             }
//         }))
