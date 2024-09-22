export const commandTrans = {
  "History Back": "back",
  "History Forward": "forward",
  Reload: "reload",
  "Stop Loading": "stop",
  "Open New Tab": "newtab",
  "Close Current Tab": "closetab",
  "Close Background Tabs": "closeback",
  "Close Window": "closeall",
  "Reload All Tabs": "reloadall",
  "Next Tab": "nexttab",
  "Previous Tab": "prevtab",
  "Scroll to Top": "scrolltop",
  "Scroll to Bottom": "scrollbottom",
  "Re-open Last Closed Tab": "lasttab",
};

export type CommandTransKey = keyof typeof commandTrans;
