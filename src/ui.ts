import browser from "webextension-polyfill";

export interface UIConfig {
  enable: boolean;
  color: string;
  width: number;
  opacity: number;
  style: string;
  withdir?: boolean;
  bgcolor?: string;
}

async function getURL(path: string): Promise<string> {
  return browser.runtime.getURL(path);
}

function directimg(direct: string) {
  var myDeg = { L: "0deg", U: "90deg", R: "180deg", D: "270deg" };
  return myDeg[direct];
}

async function domDir2(img: string, directionConfig: UIConfig) {
  var domimg = document.createElement("img");
  domimg.src = await getURL("image/direct.png");
  domimg.style.cssText +=
    "float:left;" +
    "height:" +
    directionConfig.width +
    "px;" +
    "vertical-align: text-top;" +
    "transform:rotate(+" +
    directimg(img) +
    ");";
  return domimg;
}

function domCreate(
  edom: string,
  eele: { setValue: string[]; setName: string[] } | null,
  einner: string | null,
  ecss: string | null,
  edata?: { setValue: string[]; setName: string[] } | null,
  etxt?: string
) {
  var dom = document.createElement(edom);
  if (eele) {
    for (var i = 0; i < eele.setName.length; i++) {
      if (eele.setName[i] == "for") {
        dom.setAttribute(eele.setName[i], eele.setValue[i]);
      } else if (eele.setName[i] == "checked") {
        eele.setValue[i] ? dom.setAttribute(eele.setName[i], "checked") : null;
      } else {
        dom[eele.setName[i]] = eele.setValue[i];
      }
    }
  }
  if (einner) {
  }
  if (ecss) {
    dom.style.cssText += ecss;
  }
  if (edata) {
    for (var i = 0; i < edata.setName.length; i++) {
      dom.dataset[edata.setName[i]] = edata.setValue[i];
    }
  }
  if (etxt) {
    dom.innerText = etxt;
  }
  return dom;
}

export async function ui_direct(
  directionArray: string,
  doc: HTMLElement | null,
  directionConfig: UIConfig
) {
  if (!directionConfig.enable || !doc) {
    return;
  }
  var uidom = doc.querySelector<HTMLDivElement>(
    "div[data-suui=uibox][data-sustyle=" + directionConfig.style + "]"
  );
  if (!uidom) {
    return;
  }
  var ui_dir = uidom.querySelector<HTMLDivElement>("div[data-suui=dir]");
  if (ui_dir) {
    var _img = document.createElement("img");
    _img.src = await getURL("image/direct.png");
    _img.style.cssText +=
      "float:left;" +
      "height:" +
      directionConfig.width +
      "px;" +
      "transform:rotate(+" +
      directimg(directionArray[directionArray.length - 1]) +
      ");";
    ui_dir.appendChild(_img);
  } else {
    ui_dir = document.createElement("div");
    ui_dir.dataset.suui = "dir";
    ui_dir.style.cssText +=
      "display:inline-block;text-align:center;border-radius:2px;padding:0 5px;" +
      "background-color:" +
      directionConfig.color +
      " !important;" +
      "opacity:" +
      directionConfig.opacity / 100;
    ui_dir.appendChild(
      await domDir2(directionArray[directionArray.length - 1], directionConfig)
    );
    uidom.appendChild(ui_dir);

    var _br = document.createElement("br");
    _br.style.cssText += "/*display:none;*/";
    uidom.appendChild(_br);
  }
}

export async function ui_tip(
  tip: string,
  directionArray: string,
  doc: HTMLElement | null,
  tipConfig: UIConfig
) {
  if (!tipConfig.enable || !doc) {
    return;
  }
  let uidom = doc.querySelector<HTMLDivElement>(
    "div[data-suui=uibox][data-sustyle=" + tipConfig.style + "]"
  );
  if (!uidom) {
    return;
  }
  let dom = uidom
    ? uidom.querySelector<HTMLDivElement>("div[data-suui=tip]")
    : null;
  if (!dom) {
    dom = document.createElement("div");
    dom.dataset.suui = "tip";
    dom.style.cssText +=
      "display:inline-block;padding:2px 5px 2px 5px;border-radius: 3px;font-family: arial,sans-serif !important;" +
      "background-color:" +
      tipConfig.bgcolor +
      ";" +
      "color:" +
      tipConfig.color +
      ";" +
      "font-size:" +
      tipConfig.width +
      "px;" +
      "opacity:" +
      tipConfig.opacity / 100 +
      ";";
    uidom.appendChild(dom);
    let _br = document.createElement("br");
    _br.style.cssText += "/*display:none;*/";
    uidom.appendChild(_br);
  }
  dom.textContent = "";
  if (tip) {
    if (tipConfig.withdir) {
      for (let i = 0; i < directionArray.length; i++) {
        let _dir = domCreate(
          "img",
          {
            setName: ["src"],
            setValue: [await getURL("image/direct.png")],
          },
          null,
          "vertical-align: text-top;transform:rotate(+" +
            directimg(directionArray[i]) +
            ");height: " +
            tipConfig.width +
            "px;"
        );
        dom.appendChild(_dir);
      }
    }
    let _spanTip = domCreate("span", null, null, null, null, tip);
    dom.appendChild(_spanTip);
    dom.style.cssText += "display:inline-block;";
  } else {
    dom.style.cssText += "display:none;";
  }
}

export function uiPos(event: MouseEvent | TouchEvent, doc: HTMLElement) {
  let domUIs = doc.querySelectorAll<HTMLDivElement>("div[data-suui=uibox]");
  let i = 0;
  let domWidth: number = 0;
  let domHeight = 0;

  let e: MouseEvent | Touch =
    event instanceof TouchEvent ? event.touches[0] : event;

  for (i = 0; i < domUIs.length; i++) {
    if (
      ["center", "top", "ui_bottom", "left", "right"].includes(
        domUIs[i].dataset.sustyle || ""
      )
    ) {
      let width = window.getComputedStyle(domUIs[i]).width;
      width = width.substring(0, width.length - 2);
      domWidth = parseInt(width);
      domWidth = (window.innerWidth - domWidth) / 2;

      let height = window.getComputedStyle(domUIs[i]).height;
      height = height.substring(0, height.length - 2);
      domHeight = parseInt(height);
      domHeight = (window.innerHeight - domHeight) / 2;
    }
    switch (domUIs[i].dataset.sustyle) {
      case "follow":
        domUIs[i].style.cssText +=
          "left:" + (e.clientX + 10) + "px;" + "top:" + (e.clientY + 30) + "px";
        break;
      case "center":
        domUIs[i].style.cssText +=
          "left:" + domWidth + "px;" + "top:" + domHeight + "px;";
        break;
      case "top":
        domUIs[i].style.cssText += "left:" + domWidth + "px;" + "top:0";
        break;
      case "ui_bottom":
        domUIs[i].style.cssText += "left:" + domWidth + "px;" + "bottom:-1px;";
        break;
      case "left":
        domUIs[i].style.cssText += "left:0px;" + "top:" + domHeight + "px;";
        break;
      case "right":
        domUIs[i].style.cssText += "right:0px;" + "top:" + domHeight + "px;";
        break;
    }
  }
}

export function createUI(style: string, doc: HTMLElement) {
  let domui = doc.querySelector<HTMLDivElement>(
    "div[data-suui=uibox][data-sustyle=" + style + "]"
  );
  if (!domui) {
    domui = document.createElement("div");
    domui.dataset.suui = "uibox";
    domui.dataset.sustyle = style;
    domui.style.cssText +=
      "position:fixed;text-align:right;" +
      "z-index:" +
      parseInt(String(new Date().getTime() / 1000));
    let objStyle = {
      leftbottom: "left:0;bottom:0px;",
      lefttop: "left:0;top:0px;",
      righttop: "right:0;top:0px;",
      hover: "right:0px;bottom:0;",
      top: "top:0;",
      ui_bottom: "bottom:0",
    };
    domui.style.cssText += objStyle[style];
    doc.appendChild(domui);
  }
}

export function clearUI(doc: HTMLElement) {
  doc.querySelector("div[data-suui=line]")
    ? doc.querySelector("div[data-suui=line]")?.remove()
    : null;
  var doms = doc.querySelectorAll("div[data-suui=uibox]");
  for (let i = 0; i < doms.length; i++) {
    if (doms[i]) {
      doms[i].remove();
    }
  }
}
