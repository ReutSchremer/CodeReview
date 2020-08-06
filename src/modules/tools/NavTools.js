export default class NavTools {

    static redirect = (props, pathname, newState = {}) => {

        pathname = pathname.replace("//", "/");
        props.history.push({
            pathname: pathname,
            state: {
                prevState: {
                    ...this.state,
                    ...newState
                },
            }
        });
    }

    static reload = () => {
        window.location.reload(true);
    }

    static goBackwards = (props, pathname) => {
        let arr = pathname.split('/');
        arr.pop();
        let newPathname = arr.join('/');
        newPathname = newPathname === "" ? "/" : newPathname;
        this.redirect(props, newPathname, {});
    }
}