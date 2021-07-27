import React, { Component } from "react";

class PdfToolbar extends Component {
    constructor(props) {
        super(props);
        this.handleChangeZoom = this.handleChangeZoom.bind(this);
        this.handleChangePage = this.handleChangePage.bind(this);
        this.state = {
            zoomString: this.props.zoomString,
            curPage: this.props.curPage
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.zoomString !== this.props.zoomString) {
            this.setState({ zoomString: this.props.zoomString });
        }
        if (prevProps.curPage !== this.props.curPage) {
            this.setState({ curPage: this.props.curPage });
        }
    }


    handleChangeZoom(e) {
        this.setState({ zoomString: e.target.value });
    }

    handleChangePage(e) {
        this.setState({ curPage: e.target.value });
    }


    render() {
        return (
            
                    <div className="toolbar">
                        <div id="zoomToolbar">
                            <button id="zoom-out" title="Zoom out"
                                onClick={() => { this.props.zoom(-0.25) }}>
                                -
                            </button>
                            <input type="text" id="zoom-selector" autoComplete="off" size="3" 
                                value={this.state.zoomString}
                                onKeyDown={(e) => { this.props.contZoom(e) }}
                                onChange={this.handleChangeZoom}
                            />
                            <button id="zoom-in" title="Zoom in" onClick={() => { this.props.zoom(+0.25) }}>+</button>
                            <button id="page-width-fit" title="Fit to page" onClick={(e) => this.props.fit(e)}>&#8597;</button>
                            <button id="page-rotate-right" title="Rotate clockwise" onClick={() => window.PdfViewer.viewer.pagesRotation += 90}>&#8635;</button>
                            <button id="page-rotate-left" title="Rotate counterclockwise" onClick={() => window.PdfViewer.viewer.pagesRotation -= 90}>&#8634;</button>
                        </div>
                        <div id="pageToolbar">
                            <input type="text" id="page-selector" autoComplete="off" size="1"
                                value={this.state.curPage}
                                onKeyDown={(e) => this.props.pageNav(e)}
                                onChange={this.handleChangePage}
                            />
                            <span id="divider"> / </span>
                            <span id="pagelength">{this.props.totalPages}</span>
                        </div>
                    </div>
            
        )
    }
}


export default PdfToolbar


