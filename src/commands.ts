import { GaugeRunner, RunOption } from './run';
import { window, workspace, LanguageClient } from 'coc.nvim';

const getCurrentFileName = () => workspace.document.then((doc) => doc.uri.replace(/^file:\/\/\//, '/'));
const checkSpec = async () => {
  if ((await workspace.document).filetype !== 'spec') {
    window.showMessage('Current buffer is not a spec file.', 'error');
    return false;
  }
  return true;
};

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

export class RunAllCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.runAll', runner);
  }

  async execute() {
    this.run({});
  }
}

export class RunSpecCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.runSpec', runner);
  }

  async execute() {
    if (!(await checkSpec())) return;
    this.run({ specFile: await getCurrentFileName() });
  }
}

export class RunScenarioUnderCursorCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.runScenarioUnderCursor', runner);
  }

  async execute() {
    if (!(await checkSpec())) return;
    const state = await workspace.getCurrentState();
    this.run({ specFile: await getCurrentFileName(), line: state.position.line });
  }
}

export class DebugAllCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.debugAll', runner);
  }

  async execute() {
    this.run({ debug: true });
  }
}

export class DebugSpecCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.debugSpec', runner);
  }

  async execute() {
    if (!(await checkSpec())) return;
    this.run({ specFile: await getCurrentFileName(), debug: true });
  }
}

export class DebugScenarioUnderCursorCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.debugScenarioUnderCursor', runner);
  }

  async execute() {
    if (!(await checkSpec())) return;
    const state = await workspace.getCurrentState();
    this.run({ specFile: await getCurrentFileName(), line: state.position.line, debug: true });
  }
}

export class DebugRepeatCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.debugRepeat', runner);
  }

  async execute() {
    return this.run({ ...lastLaunchedOption, debug: true });
  }
}

export class RunRepeatCommand extends RunGaugeCommandBase {
  constructor(runner: GaugeRunner) {
    super('coc-gauge.runRepeat', runner);
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
    if (!(await checkSpec())) return;

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
      window.showMessage('Empty name, canceled', 'warning');
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
      window.showMessage('Restarted Gauge Service');
      this.client.restart();
    });
  }
}
