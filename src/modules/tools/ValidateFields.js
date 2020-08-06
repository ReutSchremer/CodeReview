
function validateNameInput(input, required, placeholder = "שם") {

    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return `אנא הכנס ${placeholder}`;
    else if (input.length > 20) return `חייב להכיל פחות מ20 תווים`;
    else {
        let res = /[\u0590-\u05FF   \"\-\'a-zA-Z]*/i.exec(input);
        if (res[0] !== input) return `חייב להכיל רק אותיות`;
    }

    return '';
}

function validateUsernameInput(input, required, placeholder = "שם משתמש") {

    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return `אנא הכנס ${placeholder}`;
    else if (input.length > 20) return `${placeholder} חייב להכיל פחות מ20 תווים`;
    else {
        let res = /[a-z0-9\u0590-\u05FF_.-]*/i.exec(input);
        if (res[0] !== input)
            return `${placeholder} חייב להכיל רק אותיות ומספרים`;
    }

    return '';
}

// lan = ['he'], ['en'], ['he', 'en']
function validateFullNameInput(input, required, placeholder, length, lan = ['he']) {
    let res, resEn, resHe;
    let he = lan.includes('he')
    let en = lan.includes('en')
    if (he && en) {
        resEn = /[a-zA-Z \" \' \s]*/i.exec(input);
        resHe = /[\u0590-\u05FF \" \' \s]*/i.exec(input);
    }
    else if (he) res = /[\u0590-\u05FF \" \' \s]*/i.exec(input);
    else if (en) res = /[a-zA-Z \" \' \s]*/i.exec(input);
    if (!res && !resEn && !resHe) return ""
    if (input && !input.length && !required) return '';
    else if (input.length > 30) return 'השם חייב להכיל פחות מ30 תווים';
    //TODO make sure that the following regex is only hebrew letters and at least one space between leters
    //without counting spaces at beggining or end of input
    else if ((res && res[0] !== input) || ((resEn && resEn[0] !== input) && (resHe && resHe[0] !== input))) {
        if (he && en)
            return `השם חייב להכיל אותיות בעברית או באנגלית `;
        else if (he) return `השם חייב להכיל אותיות רק בעברית`;
        else if (en) return `השם חייב להכיל אותיות רק באנגלית `;
    }
    else if (!input || !input.length || (!/[\u0590-\u05FF \" \' \s]\s{1,}[\s \" \' \u0590-\u05FF]/.test(input) && !/[a-zA-Z \" \' \s]\s{1,}[\s \" \' a-zA-Z]/.test(input))) return 'אנא הכנס שם פרטי ושם משפחה';

    return '';
}

//TODO one day- allow +972

// validatePhoneInput supports the following phone formats: (the first part can be either 2 or 3 numbers)
// (023) 456 7899
// (023)-456-7899
// 023-456-7899
// 023 456 7899
// 0234567899
function validatePhoneInput(input, required, placeholder, length = 10) {
    input = input && input.replace(/[^0-9]/g, "");
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return 'אנא הכנס מספר טלפון (ספרות בלבד)';
    else if (Array.isArray(length) && !length.includes(input.length)) return `מספר הטלפון חייב להכיל ${length} תווים`;
    else if (!Array.isArray(length) && input.length !== length) {
        return `מספר הטלפון חייב להכיל ${length} תווים`;
    }
    else if (!(/^0\(?([0-9]{1,2})\)?([ -]?)([0-9]{3})\2([0-9]{4})/.test(input))) return 'מספר הטלפון לא תקין (ספרות בלבד)';
    // else if(/^\d+$/.test(input)) return 'Must include only numbers';
    return '';
}

function validateEmailInput(input, required) {
    let regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{1,}))$/;
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return 'אנא הכנס כתובת מייל';
    else if (!regex.test(input)) return 'כתובת המייל שגויה';

    return '';
}

function validatePasswordInput(input, required) {
    let regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^().~`\[\]{}\|\\-_=+<>:"?])[A-Za-z\d@$!%*?&#^().~`\[\]{}\|\\-_=+<>:"?]{8,}$/;
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return 'אנא הכנס סיסמא';
    else if (input.length < 8) return 'הסיסמא חייבת להכיל לפחות 8 תווים';
    else if (!regex.test(input)) return 'הסיסמא חייבת להכיל מספר, תו מיוחד, אות גדולה ואות קטנה באנגלית';

    return '';
}

function validateConfirmPasswordInput(input, required, pw) {
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return 'אנא הכנס אימות סיסמא';
    if (input !== pw) return 'הסיסמאות אינן תואמות';

    return '';
}

function validateSelectInput(input, required, placeholder) {
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return `אנא בחר ${placeholder}`;

    return '';
}

function validateStringInput(input, required, placeholder, length) {
    if ((!input || !input.length) && !required) return '';
    else if (!input || !input.length) return `אנא הכנס ${placeholder}`;
    else if (input.length > length) return `חייב להכיל פחות מ${length} תווים`;
    // else if (/\d/.test(input)) return 'לא יכול להכיל מספרים';

    return '';
}

function validateAddressInput(input, required) {
    let res = /['",./\u0590-\u05FF \s 0-9]*/i.exec(input);
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return 'אנא הכנס כתובת ומספר בית';
    else if (!/\d/.test(input) || res[0] !== input || !/['\u0590-\u05FF]/.test(input)) return 'חייב להכיל כתובת בעברית ומספר';
    else if (!/^['",.\u0590-\u05FF ]* [0-9]*\/{0,1}([0-9]+|[\u0590-\u05FF]\'{0,1})[,.'"\u0590-\u05FF ]*[0-9]*$/.test(input) && !/^[0-9  ][0-9]*\/{0,1}([0-9]*|[\u0590-\u05FF]\'{0,1})['",.\u0590-\u05FF ]*$/.test(input)) return 'כתובת המגורים שהזנת שגויה';

    return '';
}

//should check max of number (smaller than largest int/int(11))

const maxIntValue = 999999999;//2147483647;
function validateNumberInput(input, required, placeholder) {
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return `אנא הכנס ${placeholder}`;
    else if (input <= 0) return `על ה${placeholder} להיות גדול מ-0`;
    else if (input > maxIntValue) return `על ה${placeholder} להכיל עד 9 ספרות`;//return `על ה${placeholder} להיות קטן מ-${maxIntValue}`;
    else if (!Number.isInteger(Number(input))) return `על ה${placeholder} להיות מספר שלם`;

    return '';
}

export default {
    validateFullNameInput,
    validateNameInput,
    validatePhoneInput,
    validateEmailInput,
    validatePasswordInput,
    validateConfirmPasswordInput,
    validateSelectInput,
    validateStringInput,
    validateAddressInput,
    validateNumberInput,
    validateUsernameInput
}

