import React from 'react'
import ColorBtn from './ColorBtn';


function HighlightPopup(props) {
        const colorBtns1 = [2, 4, 5, 0].map(num =>
                <ColorBtn key={num}
                        colNum={num}
                        highlightId={props.highlightId}
                        onColorClick={props.updateColor}
                />)
        const colorBtns2 = [1, 3, 6].map(num =>
                <ColorBtn key={num}
                        colNum={num}
                        highlightId={props.highlightId}
                        onColorClick={props.updateColor}
                />)
        return (
                <div>
                        <div className="updateHighlightPopup firstRow">
                                <button className="openBlock"
                                        onClick={props.openHighlightBlock}
                                        data-highlightid={props.highlightId}>
                                        o
                                </button>
                                {colorBtns1}                                
                        </div>
                        <div className="updateHighlightPopup secondRow">
                                <button className="copyBlockRf"
                                        onClick={props.copyBlockRfHighlight}
                                        data-highlightid={props.highlightId}>
                                        c
                                </button>
                                {colorBtns2}
                                <button className="remove"
                                        onClick={props.removeHighlight}
                                        data-highlightid={props.highlightId}>
                                        ×
                                </button>
                        </div>
                </div>
        );
}

export default HighlightPopup