import consts from "./../../tools/client/hooks/consts.json";
import GenericTools from "../../tools/GenericTools";

class HooksList {

    constructor(hooksRepository) {

        this.hooksRepository = hooksRepository;

    }

    addHooks() {
        // console.log("addHooks web")
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__BEFORE_LOGIN, this.beforeLogin);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__AFTER_LOGIN, this.afterLogin);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__LOGOUT, this.deleteAllCookies);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__REDIRECT_HOME, this.redirectToHome);

    }

    async afterLogin(res) {
        // console.log("hhh auth afterLogin web", res)
    }

    beforeLogin() {
        // console.log("hhh auth beforeLogin web")
    }

    deleteAllCookies() {
        GenericTools.deleteAllCookies();
    }

    redirectToHome(){
        GenericTools.safe_redirect('/');

    }
}

export default HooksList;
