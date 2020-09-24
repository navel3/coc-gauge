import { workspace, WorkspaceConfiguration } from 'coc.nvim';

class Config {
  private conf: WorkspaceConfiguration;
  constructor() {
    this.conf = workspace.getConfiguration('coc-gauge');
    workspace.onDidChangeConfiguration((e) => {
      this.conf = workspace.getConfiguration('coc-gauge');
    });
  }

  get enable(): boolean {
    return this.conf.get<boolean>('enable', true);
  }

  get verbose(): boolean {
    return this.conf.get<boolean>('verbose', false);
  }

  get autoScrollOutputWindow(): boolean {
    return this.conf.get<boolean>('autoScrollOutputWindow', true);
  }
}

export default new Config();
