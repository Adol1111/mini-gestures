import browser from "webextension-polyfill";
import { invertHash } from "./utils";
import { LineDrawer, UIConfigs } from "./line";
import { log, setLogEnable } from "./log";

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
  line: {
    enable: true,
    color: "#FF0000",
    width: 3,
    opacity: 90,
    style: "center",
  },
};

let loaded = false;

// configs
let ginv: Record<string, string> = {};
let myRocker: string | boolean = false;
let myTips: Record<string, string> = {};

let suppress = 1;

// drawing
let drawer: LineDrawer | null = null;
let _break = false;
let _timeout = 0;

async function loadOptions() {
  const response = await browser.runtime.sendMessage({ msg: "configs" });
  const { debug, colorCode, width, rocker, trail, gests, tips } = response.resp;

  setLogEnable(debug);

  uiconfig.line = {
    enable: trail === true || trail === "true",
    color: "#" + colorCode,
    width: width,
    opacity: 90,
    style: "center",
  };

  ginv = invertHash(gests);
  myRocker = rocker === true || rocker === "true";
  myTips = tips;

  log("lineconfig", uiconfig.line);
  log("myGests", gests);
  log("ginv", ginv);
  log("myRocker", myRocker);
}

async function handleMouseDownEvent(e: MouseEvent) {
  if (e.button == 2 && suppress) {
    if (!loaded) {
      await loadOptions();
      loaded = true;
    }
    lineDrawReady(e);
  }
}

function handleMouseUpEvent(e: MouseEvent) {
  if (e.button == 2) {
    if (drawer?.moved) {
      drawer.runAction(e, ginv, _break, _timeout);
    } else {
      suppress--;
    }
    drawer?.clearUI();
    drawer = null;
  }
}

async function handleMouseMoveEvent(e: MouseEvent) {
  await drawer?.lineDraw(e, ginv, myTips);
}

function handleMouseOverEvent(e: MouseEvent) {}
function handleContextmenuEvent(e: MouseEvent) {
  if (suppress) {
    e.preventDefault();
  } else {
    suppress++;
  }
}

function lineDrawReady(e: MouseEvent) {
  drawer = new LineDrawer(e, uiconfig);

  let document = drawer.document;
  document.addEventListener("mousemove", handleMouseMoveEvent, false);
  document.addEventListener("mouseover", handleMouseOverEvent, false);
  //   document.addEventListener("contextmenu", handleContextmenuEvent, false);
}

function initHandle() {
  document.addEventListener("mousedown", handleMouseDownEvent, false);
  document.addEventListener("mouseup", handleMouseUpEvent, false);
  document.addEventListener("mousemove", handleMouseMoveEvent, false);
  document.addEventListener("mouseover", handleMouseOverEvent, false);
  document.addEventListener("contextmenu", handleContextmenuEvent, false);
}

function init() {
  initHandle();
}

init();
