import browser from "webextension-polyfill";
import { getBrowserType, invertHash, regURL } from "./utils";
import {
  clearUI,
  createUI,
  ui_direct,
  ui_tip,
  uiPos,
  type UIConfig,
} from "./ui";

const minlength = 10;

interface UIConfigs {
  direction: UIConfig;
  tip: UIConfig;
}

const uiconfig: UIConfigs = {
  direction: {
    enable: true,
    color: "#8e9bd5",
    width: 32,
    opacity: 80,
    style: "center",
  },
  tip: {
    enable: true,
    color: "#ffffff",
    bgcolor: "#5677fc",
    width: 18,
    opacity: 80,
    style: "follow", //center hover
    withdir: false,
  },
};

let browserType = getBrowserType();

let log = console.log;
let loaded = false;

// configs
let myColor = "#FF0000";
let myWidth = 3;
let myGests: Record<string, string> = {};
let ginv: Record<string, string> = {};
let myRocker: string | boolean = false;
let myTrail: string | boolean = false;
let myOpacity = 90;
let myTips: Record<string, string> = {};

let supportDrag = false;
let suppress = 1;
let moved = false;

// drawing
let _lastX = 0;
let _lastY = 0;
let _directionArray = "";
let drawing = false;
let drawPolyline: SVGPolylineElement | null = null;
let drawSvgTag: SVGSVGElement | null = null;
let startX = 0;
let startY = 0;
let _break = false;
let _timeout = 0;

let doc: HTMLElement | null = null;
let win: Window | null = null;

interface SelectionElement {
  txt: string;
  link: string;
  img: string;
  innerText: string;
  objLink?: {
    href: string;
    innerText: string;
  };
}

let selectElement: SelectionElement = {
  txt: "",
  link: "",
  img: "",
  innerText: "",
};

async function loadOptions() {
  const response = await browser.runtime.sendMessage({ msg: "configs" });
  const { debug, colorCode, width, rocker, trail, gests, tips } = response.resp;

  if (!debug) {
    log = () => {};
  } else {
    log = console.log;
  }
  myColor = colorCode;
  myWidth = width;
  myGests = gests;
  ginv = invertHash(myGests);
  myRocker = rocker === true || rocker === "true";
  myTrail = trail === true || trail === "true";
  myTips = tips;

  log("myColor", myColor);
  log("myWidth", myWidth);
  log("myGests", myGests);
  log("ginv", ginv);
  log("myRocker", myRocker);
  log("myTrail", myTrail);
}

function getSelectionText(e: MouseEvent) {
  const target = e.target;
  if (browserType == "fx" && target) {
    if (target instanceof Element) {
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type == "text")
      ) {
        return target.value.substring(
          target.selectionStart || 0,
          target.selectionEnd || 0
        );
      }
    }
  }
  return window.getSelection()?.toString() || "";
}

function initSelection(e: MouseEvent) {
  let selectElement: SelectionElement = {
    txt: "",
    link: "",
    img: "",
    innerText: "",
  };
  selectElement.txt = getSelectionText(e);
  if (e.target instanceof HTMLElement) {
    selectElement.innerText = e.target.innerText;
  }
  if (e.target instanceof HTMLLinkElement) {
    selectElement.link = e.target.href;
  }
  if (e.target instanceof HTMLImageElement) {
    selectElement.img = e.target.src;
  }

  if (selectElement.txt && regURL(selectElement.txt)) {
    selectElement.link = selectElement.txt;
  }

  if (e.target instanceof Element) {
    const link = e.target.closest("a");
    if (link) {
      selectElement.objLink = {
        href: link.href,
        innerText: link.innerText,
      };
    }
  }
  return selectElement;
}

function _clearUI() {
  if (!doc) {
    return;
  }
  clearUI(doc);
  doc = null;
  drawing = false;
  drawPolyline = null;
  drawSvgTag = null;
}

function stopMges(e: MouseEvent) {
  if (_break) {
    _clearUI();
    _break = false;
    return;
  }
  _clearUI();

  if (_timeout) {
    window.clearTimeout(_timeout);
    _break = false;
  }

  e.preventDefault();
  _directionArray = "";
  drawing = false;
}

function handleMouseDownEvent(e: MouseEvent) {
  if (e.button == 2 && suppress) {
    if (!loaded) {
      loadOptions();
      loaded = true;
    }
    lineDrawReady(e);
  }
}

function handleMouseUpEvent(e: MouseEvent) {
  if (e.button == 2) {
    if (moved) {
      if (_directionArray && drawing) {
        exeFunc(_directionArray);
        stopMges(e);
      }
    } else {
      suppress--;
    }
    _clearUI();
    drawing = false;
    _lastX = e.clientX;
    _lastY = e.clientY;
  }
}

async function handleMouseMoveEvent(e: MouseEvent) {
  if (drawing) {
    await lineDraw(e);
  }
}
function handleMouseOverEvent(e: MouseEvent) {}
function handleContextmenuEvent(e: MouseEvent) {
  if (suppress) {
    e.preventDefault();
  } else {
    suppress++;
  }
}

function initHandleForElement(document: HTMLElement) {
  document.addEventListener("mousemove", handleMouseMoveEvent, false);
  document.addEventListener("mouseover", handleMouseOverEvent, false);
  document.addEventListener("contextmenu", handleContextmenuEvent, false);
}

function lineDrawReady(e: MouseEvent) {
  _lastX = e.clientX;
  _lastY = e.clientY;
  _directionArray = "";
  drawing = true;
  moved = false;

  if (supportDrag) {
    selectElement = initSelection(e);
  }

  win = window;
  doc = document.documentElement;
  initHandleForElement(document.documentElement);

  const _uiarray: (keyof UIConfigs)[] = ["direction", "tip"];
  for (let i = 0; i < _uiarray.length; i++) {
    const config = uiconfig[_uiarray[i]];
    if (config.enable) {
      createUI(config.style, doc);
    }
  }
}

function createPolyline(): SVGPolylineElement {
  let polyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  polyline.style.stroke = "#" + myColor;
  polyline.style.strokeOpacity = String(myOpacity / 100);
  polyline.style.strokeWidth = myWidth + "px";
  polyline.style.fill = "none";
  return polyline;
}

function createLineDiv(win: Window) {
  drawPolyline = createPolyline();

  let svgtag = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgtag.style.cssText +=
    "width:" + win.innerWidth + "px;" + "height:" + win.innerHeight + "px;";
  svgtag.appendChild(drawPolyline);
  drawSvgTag = svgtag;

  let svgdiv = document.createElement("div");
  svgdiv.dataset.suui = "line";
  svgdiv.style.cssText +=
    "position:fixed;left:0;top:0;display:block;background:transparent;border:none;" +
    "width:" +
    win.innerWidth +
    "px;" +
    "height:" +
    win.innerHeight +
    "px;" +
    "z-index:" +
    parseInt(String(new Date().getTime() / 1000));
  svgdiv.appendChild(svgtag);

  return svgdiv;
}

function ui_line(
  event: MouseEvent | TouchEvent,
  doc: HTMLElement,
  win: Window
) {
  if (!doc.querySelector("div[data-suui=line]")) {
    doc.appendChild(createLineDiv(win));
  }

  let e: MouseEvent | Touch =
    event instanceof TouchEvent ? event.touches[0] : event;

  startX = e.clientX;
  startY = e.clientY;

  if (drawSvgTag && drawPolyline) {
    let p = drawSvgTag.createSVGPoint();
    p.x = startX;
    p.y = startY;
    drawPolyline.points.appendItem(p);
  }
}

async function lineDraw(e: MouseEvent) {
  if (!doc || !win) {
    return;
  }

  let x = e.clientX;
  let y = e.clientY;
  let dx = Math.abs(x - _lastX);
  let dy = Math.abs(y - _lastY);
  let dz = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

  if (dz < 1) {
    return;
  }
  moved = true;
  uiPos(e, doc);

  if (myTrail) {
    ui_line(e, doc, win);
  }
  if (dx < minlength && dy < minlength) {
    return;
  }

  let direction = dx > dy ? (x < _lastX ? "L" : "R") : y < _lastY ? "U" : "D";
  let lastDir = _directionArray[_directionArray.length - 1];

  if (direction != lastDir) {
    _directionArray += direction;
    //show direct
    if (uiconfig.direction.enable) {
      await ui_direct(_directionArray, doc, uiconfig.direction);
    }

    if (uiconfig.tip.enable) {
      await ui_tip(
        myTips[ginv[_directionArray]],
        _directionArray,
        doc,
        uiconfig.tip
      );
    }
  }
  _lastX = e.clientX;
  _lastY = e.clientY;
}

async function exeFunc(move: string) {
  const action = ginv[move];
  log("exeFunc", move, action);
  if (action) {
    if (action == "back") {
      window.history.back();
    } else if (action == "forward") {
      window.history.forward();
    } else if (action == "newtab") {
      if (selectElement.link == null) {
        try {
          const response = await browser.runtime.sendMessage({ msg: "newtab" });
          if (response != null) {
            log(response.resp);
          }
        } catch (e) {
          log("problem executing open tab");
          if (e instanceof Error) {
            log(e.message);
          }
        }
      } else {
        window.open(selectElement.link);
      }
    } else if (action == "closetab") {
      browser.runtime.sendMessage({ msg: "closetab" });
    } else if (action == "lasttab") {
      browser.runtime.sendMessage({ msg: "lasttab" });
    } else if (action == "reloadall") {
      browser.runtime.sendMessage({ msg: "reloadall" });
    } else if (action == "closeall") {
      browser.runtime.sendMessage({ msg: "closeall" });
    } else if (action == "nexttab") {
      browser.runtime.sendMessage({ msg: "nexttab" });
    } else if (action == "prevtab") {
      browser.runtime.sendMessage({ msg: "prevtab" });
    } else if (action == "closeback") {
      browser.runtime.sendMessage({ msg: "closeback" });
    } else if (action == "scrolltop") window.scrollTo(0, 0);
    else if (action == "scrollbottom")
      window.scrollTo(0, document.body.scrollHeight);
    else if (action == "reload") window.location.reload();
    else if (action == "stop") window.stop();
  }
}

function initHandle() {
  document.addEventListener("mousedown", handleMouseDownEvent, false);
  document.addEventListener("mouseup", handleMouseUpEvent, false);
  document.addEventListener("mousemove", handleMouseMoveEvent, false);
  document.addEventListener("mouseover", handleMouseOverEvent, false);
  //   document.addEventListener("contextmenu", handleContextmenuEvent, false);
}

function init() {
  initHandle();
}

init();
