let enable = false;

export function setLogEnable(e: boolean): void {
  enable = e;
}

export function log(...data: any[]): void {
  if (enable) {
    console.log(...data);
  }
}
