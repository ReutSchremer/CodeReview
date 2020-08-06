import { getT } from '../translation/amigoI18Next';

function validateNameInput(input, required) {
    const t = getT();
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return t("ValidateUserFields.name.empty");
    else if (input.length > 30) return t("ValidateUserFields.name.tooLong");
    else {
        let res = /^[0-9ء-يa-zA-zא-ת ]+$/i.test(input);
        if (!res) return t("ValidateUserFields.name.onlyLettersAndNumbers");
    }

    return '';
}

function validateFirstName(input, required) {
    const t = getT();
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return t("ValidateUserFields.firstName.empty");
    else if (input.length > 30) return t("ValidateUserFields.firstName.tooLong");
    else {
        let res = /^[ء-يa-zA-zא-ת ]+$/i.test(input);
        if (!res) return t("ValidateUserFields.firstName.onlyLetters");
    }

    return '';
}

function validateLastName(input, required) {
    const t = getT();
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return t("ValidateUserFields.lastName.empty");
    else if (input.length > 30) return t("ValidateUserFields.lastName.tooLong");
    else {
        let res = /^[0-9ء-يa-zA-zא-ת ]+$/i.test(input);
        if (!res) return t("ValidateUserFields.lastName.onlyLettersAndNumbers");
    }

    return '';
}



function validatePhoneInput(input, required, length = 10) {
    const t = getT();
    
    if (input && !input.length && !required){
         return '';
    }
    else if (!input || !input.length){
         return t("ValidateUserFields.phone.empty");
    }
    else if (input.length < length){
         return t("ValidateUserFields.phone.wrong");
    }
    input = input.replace(/[^0-9]/g, "");
    if (!(/^(?:[1-9]\d*|\d)$/.test(input))) return t("ValidateUserFields.phone.wrong");
    // else if(/^\d+$/.test(input)) return 'Must include only numbers';
    return '';
}

function validateEmailInput(input, required) {
    const t = getT();
    let regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{1,}))$/;
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return t("ValidateUserFields.email.empty");
    else if (!regex.test(input)) return t("ValidateUserFields.email.wrong");

    return '';
}

function validatePasswordInput(input, required) {
    const t = getT();
    let regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^().~`\[\]{}\|\\-_=+<>:"?])[A-Za-z\d@$!%*?&#^().~`\[\]{}\|\\-_=+<>:"?]{8,}$/;
    if (input && !input.length && !required) return '';
    else if (!input || !input.length) return t("ValidateUserFields.password.empty");
    else if (input.length < 8) return t("ValidateUserFields.password.tooShort");
    else if (!regex.test(input)) return t("ValidateUserFields.password.invalid");

    return '';
}



export default {
    validateNameInput,
    validateFirstName,
    validateLastName,
    validatePhoneInput,
    validateEmailInput,
    validatePasswordInput,
}

