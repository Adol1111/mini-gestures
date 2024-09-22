import browser from "webextension-polyfill";
import { invertHash } from "./utils";
import { commandTrans } from "./action";

function getI18n(str: string): string {
  if (!str) return "";
  var _i18n = browser.i18n.getMessage(str);
  return _i18n ? _i18n : str;
}

async function getCurrentTab() {
  const tabs = await browser.tabs.query({
    active: true,
    windowId: browser.windows.WINDOW_ID_CURRENT,
  });
  if (tabs.length > 0) {
    return tabs[0];
  }
  return null;
}

browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details);
});

browser.runtime.onMessage.addListener(async function (request) {
  if (request.msg == "newtab") {
    await browser.tabs.create({});
    return { resp: "tab open" };
  }

  if (request.msg == "closetab") {
    const tab = await getCurrentTab();
    tab?.id && (await browser.tabs.remove(tab.id));
    return { resp: "tab closed" };
  }

  if (request.msg == "lasttab") {
    const sessions = await browser.sessions.getRecentlyClosed({
      maxResults: 1,
    });
    if (sessions.length && sessions[0].tab) {
      await browser.sessions.restore(sessions[0].tab.sessionId);
    }
    return { resp: "tab opened" };
  }

  if (request.msg == "reloadall") {
    const tab = await getCurrentTab();
    tab?.id && (await browser.tabs.update(tab.id, { url: tab.url }));
    return { resp: "tabs reloaded" };
  }

  if (request.msg == "nexttab") {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      return { resp: "no tab" };
    }

    const tabs = await browser.tabs.query({
      windowId: browser.windows.WINDOW_ID_CURRENT,
    });

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      if (tab.id == currentTab.id) {
        if (i == tabs.length - 1) {
          const first = tabs[0];
          first.id && (await browser.tabs.update(first.id, { active: true }));
        } else {
          const next = tabs[i + 1];
          next.id && (await browser.tabs.update(next.id, { active: true }));
        }
        break;
      }
    }
    return { resp: "tab switched" };
  }

  if (request.msg == "prevtab") {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      return { resp: "no tab" };
    }

    const tabs = await browser.tabs.query({
      windowId: browser.windows.WINDOW_ID_CURRENT,
    });
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].id == currentTab.id) {
        if (i == 0) {
          const last = tabs[tabs.length - 1];
          last.id && (await browser.tabs.update(last.id, { active: true }));
        } else {
          const prev = tabs[i - 1];
          prev.id && (await browser.tabs.update(prev.id, { active: true }));
        }
        break;
      }
    }
    return { resp: "tab switched" };
  }

  if (request.msg == "closeback") {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      return { resp: "no tab" };
    }
    const tabs = await browser.tabs.query({
      windowId: browser.windows.WINDOW_ID_CURRENT,
    });
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].id != currentTab.id) {
        const tab = tabs[i];
        tab.id && (await browser.tabs.remove(tab.id));
      }
    }
    return { resp: "background closed" };
  }

  if (request.msg == "closeall") {
    const tabs = await browser.tabs.query({
      windowId: browser.windows.WINDOW_ID_CURRENT,
    });
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      tab.id && (await browser.tabs.remove(tab.id));
    }
    return { resp: "tabs closed" };
  }

  if (request.msg == "configs") {
    const items = await browser.storage.sync.get(null);
    const { colorCode, width, rocker, trail, debug, ...gests } = items;
    const commands = invertHash(commandTrans);
    const tips = Object.entries(commands).reduce((acc, [key, value]) => {
      acc[key] = getI18n(value);
      return acc;
    }, {});
    return { resp: { colorCode, width, rocker, trail, gests, debug, tips } };
  }

  return { resp: "probs" };
});
