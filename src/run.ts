import { OutputChannel, workspace } from 'coc.nvim';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

type RunProps = {
  specFile?: string;
  line?: number;
  debug?: boolean;
};

export class GaugeRunner {
  private proc: ChildProcessWithoutNullStreams | undefined;
  constructor(private channel: OutputChannel) {}

  async run({ specFile, line, debug }: RunProps = {}) {
    this.channel.clear();
    this.channel.show(true);

    if (this.proc) {
      workspace.showMessage('Gauge is running.', 'error');
      return;
    }

    const env = Object.create(process.env);

    //const args = ['run', '--simple-console'];
    const args = ['run', '--simple-console'];
    if (debug) {
      args.push('--hide-suggestion');
      env.DEBUGGING = true;
    }

    if (specFile) {
      args.push(`${specFile}${line ? ':' + line.toString() : ''}`);
    }
    this.proc = spawn('gauge', args, {
      //cwd: TODO
      env,
    });
    this.proc.stdout.on(
      'data',
      this.filterStdoutDataDumpsToTextLines((lineText: string) => {
        this.channel.append(lineText);
        lineText.split('\n').forEach((lineText) => {
          if (lineText === 'Runner Ready for Debugging') {
            workspace.callAsync('vimspector#Launch', []);
          }
        });
      })
    );
    this.proc.stderr.on('data', (e) => {
      this.channel.append(e.message);
    });
    this.proc.on('exit', (code) => {
      this.channel.appendLine(`Exited: ${code}`);
      this.proc = undefined;
    });
  }

  stop() {
    if (this.proc) {
      this.proc.kill();
      this.proc = undefined;
    }
  }

  // https://github.com/getgauge/gauge-vscode/blob/8c227a2071aed643b017eb579c0f83e2eccbf309/src/execution/gaugeExecutor.ts#L87
  private filterStdoutDataDumpsToTextLines(callback) {
    let acc = '';
    return (data) => {
      const splitted = data.toString().split(/\r?\n/);
      const lines = splitted.slice(0, splitted.length - 1);
      if (lines.length > 0) {
        lines[0] = `${acc}${lines[0]}`;
        acc = '';
      }
      acc = `${acc}${splitted[splitted.length - 1]}`;
      lines.forEach((line) => callback(`${line}\n`));
    };
  }
}
