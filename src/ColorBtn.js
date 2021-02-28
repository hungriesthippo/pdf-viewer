import React from 'react'

function ColorBtn(props){ 
    return (
        <button className={`hl-col${props.colNum}`} 
                onClick={props.onColorClick} 
                data-highlightid={props.highlightId}>
            &nbsp;
        </button>
    )
}

export default ColorBtn
