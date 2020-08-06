import consts from "./../../tools/client/hooks/consts.json"
import GenericTools from "../../tools/GenericTools";
import Auth from "../../auth/Auth.js";

class HooksList {

    constructor(hooksRepository) {
        this.hooksRepository = hooksRepository;
        console.log("addHooks rn")
    }

    addHooks() {
        //---- normal functions -----
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__LOGOUT, this.deleteUserItems);
        this.hooksRepository.addHook(consts.AUTH, consts.HOOK__REDIRECT_HOME, this.redirectToHome);
        // ----- filter -----
       
    }

   async deleteUserItems() {
        if (GenericTools.isCordova()) {
            let [at, err] = await Auth.superAuthFetch('/api/CustomUsers/deleteUserItems', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            });
            this.removeItem('access_token');
            this.removeItem('kl');
            this.removeItem('klo');
            this.removeItem('klk');
            this.removeItem('kloo');
            this.removeItem('olk');
        }
    }
    redirectToHome(){
        GenericTools.safe_redirect('/');

    }


}
export default HooksList;

