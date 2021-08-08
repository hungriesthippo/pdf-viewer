import React, { Component } from "react";
import ModMouseMonitor from "./ModMouseMonitor";


function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


class ModPopup extends Component {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "state", {
      mouseIn: false
    });
  }

  render() {
    const {
      onMouseOver,
      popupContent,
      onMouseOut
    } = this.props;
    return /*#__PURE__*/React.createElement("div", {
      onMouseOver: () => {
        this.setState({
          mouseIn: true
        });
        onMouseOver( /*#__PURE__*/React.createElement(ModMouseMonitor, {
          onMoveAway: () => {
            if (this.state.mouseIn) {
              return;
            }

            onMouseOut();
          },
          paddingX: 60,
          paddingY: 30,
          children: popupContent
        }));
      },
      onMouseOut: () => {
        setTimeout(function () { //Start the timer
          this.setState({ mouseIn: false })
        }.bind(this), 300);
      }
    }, this.props.children);
  }

}

export default ModPopup;