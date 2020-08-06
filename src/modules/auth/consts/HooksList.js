import consts from "./../../tools/client/hooks/consts.json"

class HooksList {

    constructor(hooksRepository) {

        this.hooksRepository = hooksRepository;
        console.log("addHooks")


    }

    addHooks() {

        console.log("addHooks normal")
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__BEFORE_LOGIN, this.beforeLogin);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__AFTER_LOGIN, this.afterLogin);
        this.hooksRepository.addFilterHook(consts.AUTH, consts.FILTER_HOOK__LOGIN_URL, this.filterHookUrl);
        this.hooksRepository.addFilterHook(consts.AUTH, consts.FILTER_HOOK__REGISTER_URL, this.filterHookUrl);
    }

    filterHookUrl(url) {
        // let x = url[0];	
        if (url) {
            url = "https://pumba.carmel6000.com" + url
        }
        // url = "https://pumba.carmel6000.com"+url
        // url[0] = x;

        console.log("url after", url)
        return url

    }
    filterHookUrlTry(urlObj) {
        console.log("url",urlObj.url)
        // let x = url[0];	
        if (urlObj.url) {
            urlObj.url = "https://pumba.carmel6000.com" + urlObj.url
        }
        // url = "https://pumba.carmel6000.com"+url
        // url[0] = x;

        console.log("url after", urlObj)

    }

    afterLogin() {

        console.log("hhh auth afterLogin")



    }
    beforeLogin() {
        console.log("hhh auth beforeLogin")

    }
}
export default HooksList;
