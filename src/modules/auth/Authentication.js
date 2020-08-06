// import AsyncTools from '../tools/AsyncTools';
import Auth from './Auth';

export default class Authentication {

    static myInstance = null;

    _isAuthenticated = null;

    static getInstance() {
        if (Authentication.myInstance == null) {
            Authentication.myInstance = new Authentication();
        }

        return this.myInstance;
    }

    async isAuthenticated(){
               
        if (this._isAuthenticated===null){
          console.log("PERFORMING REQUEST (isAuthenticated)");
          let [res,err]=await Auth.superAuthFetch('/api/CustomUsers/authenticate');
          
          console.log("is authenticated res",res);
          if (err){this._isAuthenticated=false;  return false;}
          
          try{
            if (res && res.hasOwnProperty('isAuthenticated')) {
                this._isAuthenticated=res.isAuthenticated;
            }else{
                this._isAuthenticated=res[0].isAuthenticated;
            }
            
          }catch(err){
                console.log("ERR?",err);
                this._isAuthenticated=false;
          }


        }
        return this._isAuthenticated;
    }

    isAuthenticatedSync(cb){
        
        if (this._isAuthenticated===null){

          console.log("PERFORMING REQUEST (isAuthenticatedSync)");
          Auth.superAuthFetch('/api/CustomUsers/authenticate').then((res,err)=>{
            console.log("is authenticated res",res);
            if (err){this._isAuthenticated=false;cb(false);}
            
            try{
                if (res && res.hasOwnProperty('isAuthenticated')) {
                    this._isAuthenticated=res.isAuthenticated;
                }else{
                    this._isAuthenticated=res[0].isAuthenticated;    
                }
                
            }catch(err){
                    console.log("ERR?",err);
                    this._isAuthenticated=false;
            }
            
            cb(this._isAuthenticated);
          });

        }else{
          cb(this._isAuthenticated);
        }
    }   
}