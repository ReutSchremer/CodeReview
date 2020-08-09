import React from 'react';

class Compi extends React.Component {

    constructor(props) {
        super(props);
        this.state = { input: "" }
    }
    onChangeInput = (event) => {
        this.setState({ input: event.target.value })
    }

    render() {
        return <div dir="ltr">
            this is a simple <input value={this.state.input} type="text" onChange={(bla) => {
                console.log("hello from change", this.state.input); this.onChangeInput(bla)
            }} />
        </div>

    }
}
export default Compi;