import React from 'react'
import ColorBtn from './ColorBtn';


function HighlightPopup(props){     
    const colorNums = [1, 2, 3, 4, 5];
    const colorBtns = colorNums.map(num => 
        <ColorBtn key={num} 
                colNum={num} 
                highlightId={props.highlightId}
                onColorClick={props.updateColor}
        />)
    return (
        <div className="updateHighlightPopup">  
        <button className="remove" 
                onClick={props.removeHighlight} 
                data-highlightid={props.highlightId}>
        × 
        </button>
        {colorBtns}
        </div>
        );
}

export default HighlightPopup