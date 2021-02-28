import React, { Component } from "react";
/* eslint import/no-webpack-loader-syntax: 0 */
import PDFWorker from "worker-loader!pdfjs-dist/lib/pdf.worker.js";

import firebase from 'firebase/app';
import 'firebase/storage';

import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  Popup,
  setPdfWorker
} from "react-pdf-highlighter";

import Spinner from "./Spinner";
import ColorfulHighlight from "./ColorfulHighlight"
import ColorfulAreaHighlight from "./ColorfulAreaHighlight"
import './App.css';
import HighlightPopup from './HighlightPopup';


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
    this.fit = this.fit.bind(this);
    this.removeHighlight = this.removeHighlight.bind(this);
    this.updateHighlightColor = this.updateHighlightColor.bind(this);
  }

  dictionary = new Set();
  hasLoadedHighlights = false
  state = {
    highlights: []
  };

  scrollViewerTo = (highlight) => { }; // provided by PdfHighligher

  scrollToHighlightFromHash = () => {
    const highlight = this.getHighlightById(parseIdFromHash());

    if (highlight) {
      this.scrollViewerTo(highlight);
    }
  };

  async componentDidMount() {
    window.fetch('dict.txt').then(async (res) => {
      const text = await res.text();
      // TODO: remove extra space from lines in dictionary
      this.dictionary = new Set(text.split(/\s*\n/));
    });
    window.addEventListener(
      "hashchange",
      this.scrollToHighlightFromHash,
      false
    );
    window.addEventListener(
      'message',
      e => this.handleMessage(e),
      false);
  }

  getHighlightById(id) {
    const { highlights } = this.state;
    return highlights.find(highlight => highlight.id === id);
  }

  updateHighlightColor = (e) => {
    const highlightId = e.target.dataset.highlightid;
    const clickedColor = e.target.className.match(/hl-col(\d+)/)[1]
    let { highlights } = this.state;
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
    const { highlights } = this.state;
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
    const { highlights } = this.state;

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

  zoom(delta) {
    let current = window.PdfViewer.viewer.currentScaleValue
    current = isNaN(current) ? 1 : parseFloat(current);
    window.PdfViewer.viewer.currentScaleValue = Math.max(0, current + delta);
  }

  fit(event) {
    let el = event.target;
    if (el.title === "Fit to page") {
      el.title = "Fit to width";
      window.PdfViewer.viewer.currentScaleValue = 'page-fit';
    } else {
      el.title = "Fit to page";
      window.PdfViewer.viewer.currentScaleValue = 'page-width';
    }
  }

  render() {
    const { highlights } = this.state;
    return (
      <div className="App">
        <div className="toolbar">
          <button id="zoom-in" title="Zoom in" onClick={() => this.zoom(0.2)}>+</button>
          <button id="zoom-out" title="Zoom out" onClick={() => this.zoom(-0.2)}>-</button>
          <button id="page-width-fit" title="Fit to page" onClick={this.fit}>◽</button>
        </div>
        <div>
          <PdfLoader url={url} beforeLoad={<Spinner />} cMapUrl={"https://cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/cmaps/"} cMapPacked={true}>
            {pdfDocument => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={event => event.altKey}
                onScrollChange={resetHash}
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
                    <Popup
                      popupContent={
                        <HighlightPopup
                          highlightId={highlight.id}
                          removeHighlight={this.removeHighlight}
                          updateColor={this.updateHighlightColor}
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
