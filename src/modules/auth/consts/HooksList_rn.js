import consts from "./../../tools/client/hooks/consts.json"
// import { AsyncStorage } from 'react-native';

class HooksList {

    constructor(hooksRepository) {

        this.hooksRepository = hooksRepository;


    }

    addHooks() {

        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__BEFORE_LOGIN, this.beforeLogin);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__AFTER_LOGIN, this.afterLogin);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__AFTER_REGISTER, this.afterRegister);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__LOGOUT, this.deleteAsyncStorage);
        this.hooksRepository.addFilterHook(consts.AUTH, consts.FILTER_HOOK__FETCH_URL, this.filterHookUrlTry);
        this.hooksRepository.addFilterHook(consts.AUTH, consts.FILTER_HOOK__FETCH_URL, this.filterHookUrl);
    }

    filterHookUrl(url) {
        if (url) {
            url = "pumba.carmel6000.com" + url
        }
        return url

    }
    filterHookUrlTry(url) {
        console.log("url: ", url)
        url = "https://" + url
        return url;
    }

    async afterLogin(res) {

        // await AsyncStorage.setItem('klo', res.klo);
        // await AsyncStorage.setItem('kl', res.kl);
        // await AsyncStorage.setItem('kloo', res.kloo);
        // await AsyncStorage.setItem('klk', res.klk);
        // await AsyncStorage.setItem('access_token', res.id);

    }
    async afterRegister(res) {
        console.log("res register", res)
    }

    async setUserData(res) {

    }
    beforeLogin() {
        console.log("hhh auth beforeLogin")
    }

    async  deleteAsyncStorage() {

        // await AsyncStorage.removeItem('userName');
        // await AsyncStorage.removeItem('klo');
        // await AsyncStorage.removeItem('kl');
        // await AsyncStorage.removeItem('kloo');
        // await AsyncStorage.removeItem('klk');
        // await AsyncStorage.removeItem('access_token');
    }
}
export default HooksList;
