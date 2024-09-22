export function invertHash(
  hash: Record<string, string>
): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const key in hash) {
    inv[hash[key]] = key;
  }
  return inv;
}

export function getBrowserType() {
  if (navigator.userAgent.toLowerCase().indexOf("firefox") != -1) {
    return "fx";
  } else if (navigator.userAgent.toLowerCase().indexOf("edge") != -1) {
    return "msg";
  } else {
    return "cr";
  }
}

export function regURL(txt: string): boolean {
  const reg =
    /^((http|https|ftp):\/\/)?(\w(\:\w)?@)?([0-9a-z_-]+\.)*?([a-z0-9-]+\.[a-z]{2,6}(\.[a-z]{2})?(\:[0-9]{2,6})?)((\/[^?#<>\/\\*":]*)+(\?[^#]*)?(#.*)?)?$/i;
  return reg.test(txt.trim());
}
