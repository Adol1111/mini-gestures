import { clearUI, createUI, ui_direct, ui_tip, UIConfig, uiPos } from "./ui";
import browser from "webextension-polyfill";
import { getBrowserType, regURL } from "./utils";
import { log } from "./log";

const minlength = 10;

export interface UIConfigs {
  direction: UIConfig;
  tip: UIConfig;
  line: UIConfig;
}

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

function getSelectionText(e: MouseEvent) {
  const target = e.target;
  if (getBrowserType() == "fx" && target) {
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

export class LineDrawer {
  document: HTMLElement;

  #_lastX = 0;
  #_lastY = 0;
  #startX = 0;
  #startY = 0;

  moved = false;
  #directionArray = "";
  #win: Window;
  #drawPolyline: SVGPolylineElement | null = null;
  #drawSvgTag: SVGSVGElement | null = null;
  #lineConfig: UIConfig;
  #directionConfig: UIConfig;
  #tipConfig: UIConfig;

  #selectElement: SelectionElement = {
    txt: "",
    link: "",
    img: "",
    innerText: "",
  };

  constructor(e: MouseEvent, uiconfig: UIConfigs) {
    this.#_lastX = e.clientX;
    this.#_lastY = e.clientY;
    this.#directionArray = "";

    // if (supportDrag) {
    //   selectElement = initSelection(e);
    // }

    this.#win = window;
    this.document = document.documentElement;

    const _uiarray: (keyof UIConfigs)[] = ["direction", "tip"];
    for (let i = 0; i < _uiarray.length; i++) {
      const config = uiconfig[_uiarray[i]];
      if (config.enable) {
        createUI(config.style, this.document);
      }
    }
    this.#lineConfig = uiconfig.line;
    this.#directionConfig = uiconfig.direction;
    this.#tipConfig = uiconfig.tip;
  }

  createPolyline(): SVGPolylineElement {
    let polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline"
    );
    let color = this.#lineConfig.color;
    if (!color.startsWith("#")) {
      color = "#" + color;
    }
    polyline.style.stroke = color;
    polyline.style.strokeOpacity = String(this.#lineConfig.opacity / 100);
    polyline.style.strokeWidth = this.#lineConfig.width + "px";
    polyline.style.fill = "none";
    return polyline;
  }

  createLineDiv(win: Window) {
    this.#drawPolyline = this.createPolyline();

    let svgtag = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgtag.style.cssText +=
      "width:" + win.innerWidth + "px;" + "height:" + win.innerHeight + "px;";
    svgtag.appendChild(this.#drawPolyline);
    this.#drawSvgTag = svgtag;

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

  async lineDraw(
    e: MouseEvent,
    actions: Record<string, string>,
    tips: Record<string, string>
  ) {
    let x = e.clientX;
    let y = e.clientY;
    let dx = Math.abs(x - this.#_lastX);
    let dy = Math.abs(y - this.#_lastY);
    let dz = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

    if (dz < 1) {
      return;
    }
    this.moved = true;
    uiPos(e, this.document);

    if (this.#lineConfig.enable) {
      this.ui_line(e);
    }
    if (dx < minlength && dy < minlength) {
      return;
    }

    let direction =
      dx > dy ? (x < this.#_lastX ? "L" : "R") : y < this.#_lastY ? "U" : "D";
    let lastDir = this.#directionArray[this.#directionArray.length - 1];

    if (direction != lastDir) {
      this.#directionArray += direction;
      if (this.#directionConfig.enable) {
        await ui_direct(
          this.#directionArray,
          this.document,
          this.#directionConfig
        );
      }
      if (this.#tipConfig.enable) {
        await ui_tip(
          tips[actions[this.#directionArray]],
          this.#directionArray,
          this.document,
          this.#tipConfig
        );
      }
    }
    this.#_lastX = e.clientX;
    this.#_lastY = e.clientY;

    return true;
  }

  ui_line(event: MouseEvent | TouchEvent) {
    if (!this.document.querySelector("div[data-suui=line]")) {
      this.document.appendChild(this.createLineDiv(this.#win));
    }

    let e: MouseEvent | Touch =
      event instanceof TouchEvent ? event.touches[0] : event;

    this.#startX = e.clientX;
    this.#startY = e.clientY;

    if (this.#drawSvgTag && this.#drawPolyline) {
      let p = this.#drawSvgTag.createSVGPoint();
      p.x = this.#startX;
      p.y = this.#startY;
      this.#drawPolyline.points.appendItem(p);
    }
  }

  async runAction(
    e: MouseEvent,
    actions: Record<string, string>,
    _break: boolean,
    _timeout: number
  ) {
    if (this.#directionArray) {
      this.#exeFunc(this.#directionArray, actions);
      this.#stopMges(e, _break, _timeout);
    }
  }

  #stopMges(e: MouseEvent, _break: boolean, _timeout: number) {
    if (_break) {
      this.clearUI();
      return;
    }

    this.clearUI();
    if (_timeout) {
      window.clearTimeout(_timeout);
    }

    e.preventDefault();
  }

  async #exeFunc(move: string, actions: Record<string, string>) {
    const action = actions[move];
    if (action) {
      if (action == "back") {
        window.history.back();
      } else if (action == "forward") {
        window.history.forward();
      } else if (action == "newtab") {
        if (this.#selectElement.link == null) {
          try {
            const response = await browser.runtime.sendMessage({
              msg: "newtab",
            });
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
          window.open(this.#selectElement.link);
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

  clearUI() {
    clearUI(this.document);
  }
}
