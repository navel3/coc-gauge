import { OutputChannel, workspace } from 'coc.nvim';
import { outputChannelName } from './util';

const INTERVAL = 300;

export class AutoScroll {
  private lock?: Promise<void>;
  private to?: NodeJS.Timeout;
  constructor(private channel: OutputChannel) {}

  start() {
    this.stop();
    this.to = setInterval(() => this.scroll(), INTERVAL);
  }

  stop() {
    if (this.to) {
      clearInterval(this.to);
      this.to = undefined;
      setTimeout(() => this.scroll(), INTERVAL);
    }
  }

  private async scroll() {
    if (this.lock) await this.lock;
    this.lock = this.scrollInner();
  }

  private async scrollInner() {
    const { nvim } = workspace;
    const doc = workspace.getDocument(outputChannelName(this.channel.name));
    if (!doc) return;

    const chBuf = doc.buffer;
    const curBuf = await nvim.buffer;
    const curWin = await nvim.window;
    for (const w of await (await nvim.tabpage).windows) {
      const b = await w.buffer;
      if (b.id !== chBuf.id) continue;

      await nvim.setWindow(w);
      await nvim.setBuffer(chBuf);
      await nvim.command('normal G');
      await nvim.setWindow(curWin);
      await nvim.setBuffer(curBuf);
      break;
    }
  }
}
