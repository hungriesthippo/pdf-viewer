import './App.css';

import React, { Component } from "react";

import firebase from 'firebase/app';
import 'firebase/storage';

import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  Highlight,
  Popup,
  AreaHighlight
} from "react-pdf-highlighter";

import Spinner from "./Spinner";

if (!firebase.apps.length) {
  firebase.initializeApp({ storageBucket: 'roampdf.appspot.com' });
}
const storage = firebase.storage();
const storageRef = storage.ref().child('public');

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const url = decodeURI(document.location.search.split('url=')[1])

class App extends Component {
  hasLoadedHighlights = false
  state = {
    highlights: []
  };

  scrollViewerTo = (highlight) => {}; // provided by PdfHighligher

  scrollToHighlightFromHash = () => {
    const highlight = this.getHighlightById(parseIdFromHash());

    if (highlight) {
      this.scrollViewerTo(highlight);
    }
  };

  componentDidMount() {
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

  HighlightPopup = (data) =>
    <button className="remove" onClick={this.removeHighlight} data-highlightid={data.highlightId}>
      ×
    </button>;

  removeHighlight = (e) => {
    const highlightId = e.target.dataset.highlightId;
    const { highlights } = this.state;
    const removeIndex = highlights.findIndex(hl => hl.id === highlightId);
    if (removeIndex >= 0) {
      const highlight = highlights[removeIndex];
      this.setState({
        highlights: highlights.splice(removeIndex, removeIndex)
      });
      window.parent.postMessage({ deleted: highlight, url: encodeURI(url) }, '*');
    }
    e.target.style.display = "none";
  }

  handleMessage(event) {
    // handle scroll
    if (event.data.scrollTo) {
      this.scrollViewerTo(event.data.scrollTo);
      return;
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
      if (highlight.content.image) {
        const filename = `${new Date().getTime()}.png`
        const imageRef = storageRef.child(`images/${filename}`)
        imageRef.putString(highlight.content.image, 'data_url').then(() =>
          imageRef.getDownloadURL().then(imageUrl => {
            const highlightWithImage = { ...highlight };
            highlightWithImage.imageUrl = imageUrl;
            window.parent.postMessage({ highlight: highlightWithImage, url: encodeURI(url) }, '*');
          }))
      } else {
        window.parent.postMessage({ highlight, url: encodeURI(url) }, '*');
      }
    }

    this.setState({
      highlights: [{ ...highlight, id: getNextId() }, ...highlights]
    });
  }

  updateHighlight(highlightId, position, content) {
    this.setState({
      highlights: this.state.highlights.map(h => {
        return h.id === highlightId
          ? {
              ...h,
              position: { ...h.position, ...position },
              content: { ...h.content, ...content }
            }
          : h;
      })
    });
  }

  zoom(delta) {
    const current = isNaN(window.PdfViewer.viewer.currentScaleValue) ? 1 : parseFloat(window.PdfViewer.viewer.currentScaleValue);
    window.PdfViewer.viewer.currentScaleValue = Math.max(0, current + delta);
    console.log(window.PdfViewer.viewer.currentScaleValue);
  }

  render() {
    const { highlights } = this.state;

    return (
      <div className="App">
        <div className="toolbar">
          <button id="zoom-in" onClick={() => this.zoom(0.2)}>+</button>
          <button id="zoom-out" onClick={() => this.zoom(-0.2)}>-</button>
        </div>
        <div>
          <PdfLoader url={url} beforeLoad={<Spinner />}>
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
                      this.addHighlight({ content, position, comment: ''}, true);

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
                    <Highlight
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                    />
                  ) : (
                    <AreaHighlight
                      highlight={highlight}
                      onChange={boundingRect => {
                        this.updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) }
                        );
                      }}
                    />
                  );

                  return (
                    <Popup
                      popupContent={<this.HighlightPopup highlightId={highlight.id} />}
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
