import { GaugeRunner, RunOption } from './run';
import { workspace, LanguageClient } from 'coc.nvim';

const getCurrentFileName = () => workspace.uri.replace(/^file:\/\/\//, '/');

export interface Command {
  readonly id: string;
  execute(...args: any[]): void | Promise<any>;
}

let lastLaunchedOption: RunOption;

abstract class RunGaugeCommandBase {
  constructor(public readonly id: string, private runner: GaugeRunner) {}

  protected async run(option: RunOption) {
    lastLaunchedOption = option;
    this.runner.run(option);
  }
}

export class RunScenarioAtCursorCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.runScenarioAtCursor', runner);
  }

  async execute() {
    const state = await workspace.getCurrentState();
    this.run({ specFile: getCurrentFileName(), line: state.position.line });
  }
}

export class RunSpecCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.runSpec', runner);
  }

  async execute() {
    this.run({ specFile: getCurrentFileName() });
  }
}

export class DebugScenarioAtCursorCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.debugScenarioAtCursor', runner);
  }

  async execute() {
    const state = await workspace.getCurrentState();
    this.run({ specFile: getCurrentFileName(), line: state.position.line, debug: true });
  }
}

export class DebugSpecCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.debugSpec', runner);
  }

  async execute() {
    this.run({ specFile: getCurrentFileName(), debug: true });
  }
}

export class DebugLastLaunchedCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.debugLastLaunched', runner);
  }

  async execute() {
    return this.run({ ...lastLaunchedOption, debug: true });
  }
}

export class RunLastLaunchedCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.runLastLaunched', runner);
  }

  async execute() {
    this.run({ ...lastLaunchedOption, debug: false });
  }
}

export class StopCommand {
  public readonly id = 'coc-gauge.stop';
  constructor(private runner: GaugeRunner) {}

  async execute() {
    this.runner.stop();
  }
}

export class RenameStepCommand {
  public readonly id = 'coc-gauge.renameStep';
  constructor() {}

  async execute() {
    const { document, position: pos } = await workspace.getCurrentState();
    const line = await workspace.getLine(document.uri, pos.line);
    if (!line.match(/^(?:[*])([^*].*)$/)) return;

    // Find the end of the step
    const lines = [line.trim()];
    for (;;) {
      const nline = await workspace.getLine(document.uri, pos.line + 1);

      // check the next line is continuation of the step or not
      const trimmed = nline.trim();
      if (trimmed.trim().length === 0 || ['#', '*', '|'].includes(trimmed[0])) {
        // end of the step
        break;
      }
      lines.push(nline);
      pos.line += 1;
    }

    // https://github.com/neoclide/coc.nvim/blob/c8f0c2ee355d141d3c13021d926a6e9a255010a9/src/handler/index.ts#L472
    const curname = lines.join(' ');
    const newName = await workspace.callAsync<string>('input', ['New name: ', curname]);
    workspace.nvim.command('normal! :<C-u>', true);
    if (!newName) {
      workspace.showMessage('Empty name, canceled', 'warning');
      return;
    }
    if (newName !== curname) {
      workspace.callAsync('CocAction', ['rename', newName]);
    }
  }
}

export class RestartGaugeServiceCommand {
  public readonly id = 'coc-gauge.restartGaugeService';
  constructor(private client: LanguageClient) {}

  async execute() {
    this.client.stop().then(() => {
      workspace.showMessage('Restarted Gauge Service');
      this.client.restart();
    });
  }
}
