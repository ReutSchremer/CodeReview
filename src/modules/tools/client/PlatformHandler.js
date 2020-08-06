// import GenericTools from "./../../tools/GenericTools"

const PlatformHandler = {


    PLATFORM_WEB: "PLATFORM_WEB",
    PLATFORM_CORDOVA: "PLATFORM_CORDOVA",
    PLATFORM_REACT_NATIVE: "PLATFORM_REACT_NATIVE",
    PLATFORM_EXPO_REACT_NATIVE: "PLATFORM_EXPO_REACT_NATIVE",

    platformArr: [
        {
            PLATFORM_WEB:
            {
                suffix: 'web'
            }
        },
        {
            PLATFORM_CORDOVA:
            {
                suffix: 'cordova'
            }
        },
        {
            PLATFORM_REACT_NATIVE:
            {
                suffix: 'rn'
            }
        },
        {
            PLATFORM_EXPO_REACT_NATIVE: {
                suffix: 'rn'
            }
        }
    ],

    // {PLATFORM_WEB:{suffix:'web'},

    // {suffix:'rn'},{suffix:'cordova'}}



    getPlatformOptions() {
        let platform = this.getPlatformName()
        let platformOptions = { suffix: "" }

        this.platformArr.forEach(plat => {
            if (Object.keys(plat).includes(platform)) {
                platformOptions = Object.values(plat)[0]
            }
        })
        return platformOptions;
    },

    getPlatformName() {
        //if react native
        if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
            return this.PLATFORM_REACT_NATIVE
        }

        //if react native with expo
        if (localStorage.getItem("EXPO_CONSTANTS_INSTALLATION_ID")) {
            return this.PLATFORM_EXPO_REACT_NATIVE
        }

        //if web
        if (typeof navigator !== 'undefined' && navigator.product === 'Gecko') {
            return this.PLATFORM_WEB
        }

        //if cordova
        if (window.hasOwnProperty("cordova")) {
            return this.PLATFORM_CORDOVA;
        }

        // if (document && typeof document != 'undefined') {
        //     return this.PLATFORM_WEB
        // }
    }
}

export default PlatformHandler;