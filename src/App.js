import React, { Component } from "react";
/* eslint import/no-webpack-loader-syntax: 0 */
import PDFWorker from "worker-loader!pdfjs-dist/lib/pdf.worker.js";
// import { PDFFindBar } from "pdfjs-dist/lib/web/pdf_find_bar.js";
// import { PDFFindController } from "pdfjs-dist/lib/web/pdf_find_controller.js";


import firebase from 'firebase/app';
import 'firebase/storage';

import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  setPdfWorker
} from "react-pdf-highlighter";

import Spinner from "./Spinner";
import ColorfulHighlight from "./ColorfulHighlight"
import ColorfulAreaHighlight from "./ColorfulAreaHighlight"
import './App.css';
import HighlightPopup from './HighlightPopup';
import ModPopup from './ModPopup';
import PdfToolbar from './PdfToolbar';


setPdfWorker(PDFWorker);

if (!firebase.apps.length) {
  firebase.initializeApp({ storageBucket: 'roampdf.appspot.com' });
}
const storage = firebase.storage();
const storageRef = storage.ref().child('public');

const getNextId = () => {
  let nanoid = (t = 21) => {
    let e = "", r = crypto.getRandomValues(new Uint8Array(t)); for (; t--;) {
      let n = 63 & r[t]; e += n < 36 ? n.toString(36) : n < 62 ? (n - 26).toString(36).toUpperCase() : n < 63 ? "_" : "-"
    }
    return e
  };
  return nanoid(9);
}

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const url = decodeURI(document.location.search.split('url=')[1])

class App extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      highlights: [],
      pdfReady: false,
      zoomString: '',
      curPage: 1
    };

    this.removeHighlight = this.removeHighlight.bind(this);
    this.updateHighlightColor = this.updateHighlightColor.bind(this);
    this.copyBlockRfHighlight = this.copyBlockRfHighlight.bind(this);
    this.openHighlightBlock = this.openHighlightBlock.bind(this);
    this.pageNav = this.pageNav.bind(this);
    this.fit = this.fit.bind(this);
    this.contZoom = this.contZoom.bind(this);
    this.zoom = this.zoom.bind(this);
    this.resizeend = this.resizeend.bind(this);
  }

  dictionary = new Set();
  hasLoadedHighlights = false;

  scrollViewerTo = (highlight) => { }; // provided by PdfHighligher

  scrollToHighlightFromHash = () => {
    const highlight = this.getHighlightById(parseIdFromHash());

    if (highlight) {
      this.scrollViewerTo(highlight);
    }
  };


  timeout = false;
  rtime = 0;
  delta = 500;
  async componentDidMount() {
    window.fetch('dict.txt').then(async (res) => {
      const text = await res.text();
      // TODO: remove extra space from lines in dictionary
      this.dictionary = new Set(text.split(/\s*\n/));
    });
    window.addEventListener('hashchange',
      this.scrollToHighlightFromHash,
      false
    );
    window.addEventListener('message',
      e => this.handleMessage(e),
      false
    );

    window.addEventListener('resize',
      () => {
        this.rtime = new Date();
        if (this.timeout === false) {
          this.timeout = true;
          setTimeout(this.resizeend, this.delta);
        }
      });
  }

  resizeend() {
    if (new Date() - this.rtime < this.delta) {
      setTimeout(this.resizeend, this.delta);
    } else {
      this.timeout = false;      
      this.setState({ zoomString: Math.round(window.PdfViewer.viewer._currentScale * 100) + '%' })
    }
  }

  async componentDidUpdate() {
    if(!typeof(window.PdfViewer)) return;
    if (!this.state.pdfReady) {
      if(!window.PdfViewer) return; 
      window.PdfViewer.eventBus.on('pagechanging', (e) => {
        this.setState({ curPage: window.PdfViewer.viewer.currentPageNumber })
      });
      this.setState({ pdfReady: true })
      this.setState({ zoomString: Math.round(window.PdfViewer.viewer._currentScale * 100) + '%' })
    }
  }


  getHighlightById(id) {
    const highlights = this.state.highlights;
    return highlights.find(highlight => highlight.id === id);
  }

  copyBlockRfHighlight = (e) => {
    const highlightId = e.target.dataset.highlightid;
    const highlights = this.state.highlights;
    const hlIndex = highlights.findIndex(hl => hl.id === highlightId);
    const highlight = highlights[hlIndex];
    window.parent.postMessage({
      highlight, actionType: 'copyRef', url: encodeURI(url)
    }, '*');
  }

  openHighlightBlock = (e) => {
    const highlightId = e.target.dataset.highlightid;
    const highlights = this.state.highlights;
    const hlIndex = highlights.findIndex(hl => hl.id === highlightId);
    const highlight = highlights[hlIndex];
    window.parent.postMessage({
      highlight, actionType: 'openHlBlock', url: encodeURI(url)
    }, '*');
  }

  updateHighlightColor = (e) => {
    const highlightId = e.target.dataset.highlightid;
    const clickedColor = e.target.className.match(/hl-col(\d+)/)[1]
    let highlights = this.state.highlights;
    const updateIndex = highlights.findIndex(hl => hl.id === highlightId);
    if (updateIndex >= 0) {
      highlights[updateIndex].color = clickedColor;
      const highlight = highlights[updateIndex];
      this.setState({
        highlights: highlights
      });
      window.parent.postMessage({
        highlight, actionType: 'updated', url: encodeURI(url)
      }, '*');
    }
  }

  deleteHighlight = (highlightId) => {
    const highlights = this.state.highlights;
    const removeIndex = highlights.findIndex(hl => hl.id === highlightId);
    if (removeIndex >= 0) {
      const highlight = highlights[removeIndex];
      highlights.splice(removeIndex, 1)
      this.setState({
        highlights: highlights
      });
      return highlight;
    }
    return null;
  }

  removeHighlight = (e) => {
    const highlightId = e.target.dataset.highlightid;
    const highlight = this.deleteHighlight(highlightId);
    window.parent.postMessage({
      highlight, actionType: 'deleted', url: encodeURI(url)
    }, '*');
    //e.target.style.display = "none";
  }

  handleMessage(event) {
    // handle scroll
    if (event.data.scrollTo) {
      this.scrollViewerTo(event.data.scrollTo);
      return;
    }
    // handl deleted highlight
    if (event.data.deleted) {
      const highlightId = event.data.deleted.id;
      this.deleteHighlight(highlightId);
    }
    // handle load highlights
    if (!event.data.highlights || this.hasLoadedHighlights) return;
    for (let i = 0; i < event.data.highlights.length; i++) {
      this.addHighlight(event.data.highlights[i], false);
    }
    this.hasLoadedHighlights = true;
  }

  addHighlight(highlight, sendMessage) {
    const highlights = this.state.highlights;

    // Send message with highlight content to hosting window
    if (sendMessage) {
      highlight.id = getNextId()
      highlight.color = 0;
      if (highlight.content.image) {
        const filename = `${new Date().getTime()}.png`
        const imageRef = storageRef.child(`images/${filename}`)
        imageRef.putString(highlight.content.image, 'data_url').then(() =>
          imageRef.getDownloadURL().then(imageUrl => {
            const highlightWithImage = { ...highlight };
            highlightWithImage.imageUrl = imageUrl;
            window.parent.postMessage({
              highlight: highlightWithImage, actionType: 'added', url: encodeURI(url)
            }, '*');
          }))
      } else {
        highlight.content.text = this.fixText(highlight.content.text);
        window.parent.postMessage({
          highlight, actionType: 'added', url: encodeURI(url)
        }, '*');
      }
    }

    this.setState({
      highlights: [{ ...highlight }, ...highlights]
    });
  }

  fixText(text) {
    // Attempts to fix words that are joined across new lines.
    const inDict = (word) => this.dictionary.has(word.toLowerCase());
    const bisect = (word, index) => [word.slice(0, index), word.slice(index)];
    return text.split(' ').map(word => {
      if (inDict(word)) return word;
      else {
        // For any bisection of the word, are both parts in the dictionary?
        const index = word.split('').findIndex((_, i) => bisect(word, i).every(w => inDict(w)));
        if (index === -1) return word;
        const splits = bisect(word, index);
        return `${splits[0]} ${splits[1]}`;
      }
    }).join(' ');
  }

  updateHighlight(highlightId, position, content, color) {
    this.setState({
      highlights: this.state.highlights.map(h => {
        return h.id === highlightId
          ? {
            ...h,
            position: { ...h.position, ...position },
            content: { ...h.content, ...content },
            color: { ...h.color, ...color }
          }
          : h;
      })
    });
  }

  pageNav = (e) => {
    if (this.state.pdfReady) {
      if (e.key === 'Enter') {
        let proposedPageNr = parseInt(e.target.value)
        if (isNaN(proposedPageNr) || proposedPageNr < 1 || proposedPageNr > window.PdfViewer.viewer.pagesCount)
          e.target.value = window.PdfViewer.viewer.currentPageNumber
        else
          window.PdfViewer.viewer.currentPageNumber = proposedPageNr
      }
    }
  }  // style="--page-length-digits:2;"> window.PdfViewer.viewer.pagesCount

  fit = (e) => {
    if (this.state.pdfReady) {
      let el = e.target;
      if (el.title === "Fit to page") {
        el.title = "Fit to width";
        el.innerText = '\u2194';
        window.PdfViewer.viewer.currentScaleValue = 'page-fit';
      } else {
        el.title = "Fit to page";
        el.innerText = '\u2195';
        window.PdfViewer.viewer.currentScaleValue = 'page-width';
      }
      this.setState({
        zoomString: Math.round(window.PdfViewer.viewer._currentScale * 100) + '%'
      });
    }
  }

  contZoom = (e) => {
    if (this.state.pdfReady) {
      if (e.key === 'Enter') {
        let curZoom = window.PdfViewer.viewer._currentScale;
        let zoomStr, zoomVal;
        let enteredZoomStr = e.target.value;
        if (enteredZoomStr[enteredZoomStr.length - 1] === '%')
          enteredZoomStr = enteredZoomStr.slice(0, -1)
        let proposedZoom = parseInt(enteredZoomStr)
        if (isNaN(proposedZoom)) {
          zoomStr = Math.round(curZoom * 100) + '%';
          zoomVal = curZoom;
        } else if (proposedZoom < 25) {
          zoomStr = '25%';
          zoomVal = .25;
        } else if (proposedZoom > 500) {
          zoomStr = '500%';
          zoomVal = 5;
        } else {
          zoomStr = proposedZoom + '%'
          zoomVal = proposedZoom / 100
        }
        e.target.value = zoomStr
        window.PdfViewer.viewer.currentScaleValue = zoomVal
      }
    }
  }

  zoom = (delta) => {
    if (this.state.pdfReady) {
      let current = window.PdfViewer.viewer._currentScale;      
      const zoomVal = Math.min(Math.max(.2, current + delta), 5);
      window.PdfViewer.viewer.currentScaleValue = zoomVal;
      this.setState({
        zoomString: Math.round(zoomVal * 100) + '%'
      });
    }
  }


  render() {
    const highlights = this.state.highlights;
    return (
      <div className="App">
        {
          this.state.pdfReady &&
          <PdfToolbar
            pageNav={this.pageNav} fit={this.fit} contZoom={this.contZoom} zoom={this.zoom}
            curPage={this.state.curPage}
            totalPages={window.PdfViewer.viewer.pagesCount}
            zoomString={this.state.zoomString}
          />
        }

        <div>
          <PdfLoader url={url} beforeLoad={<Spinner />} cMapUrl={"https://cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/cmaps/"} cMapPacked={true}>
            {pdfDocument => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={event => event.altKey}
                onScrollChange={resetHash}
                ref={x => x?.resizeObserver.disconnect()}
                scrollRef={scrollTo => {
                  this.scrollViewerTo = scrollTo;
                  this.scrollToHighlightFromHash();
                }}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection) => (
                  <Tip
                    onOpen={() => {
                      this.addHighlight({ content, position, comment: '' }, true);
                      hideTipAndSelection();
                    }}
                  />
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {

                  const isTextHighlight = !Boolean(
                    highlight.content && highlight.content.image
                  );

                  const component = isTextHighlight ? (
                    <ColorfulHighlight
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                      color={highlight.color}
                    />
                  ) : (
                    <ColorfulAreaHighlight
                      highlight={highlight}
                      onChange={boundingRect => {
                        this.updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) },
                        );
                      }}
                    />
                  );

                  return (
                    <ModPopup
                      popupContent={
                        <HighlightPopup
                          highlightId={highlight.id}
                          removeHighlight={this.removeHighlight}
                          updateColor={this.updateHighlightColor}
                          copyBlockRfHighlight={this.copyBlockRfHighlight}
                          openHighlightBlock={this.openHighlightBlock}
                        />
                      }
                      onMouseOver={popupContent =>
                        setTip(highlight, highlight => popupContent)
                      }
                      onMouseOut={hideTip}
                      key={index}
                      children={component}
                    />
                  );
                }}
                highlights={highlights}
              />
            )}
          </PdfLoader>
        </div>
      </div>
    );
  }
}

export default App;
