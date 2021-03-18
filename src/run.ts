import { OutputChannel, window, workspace } from 'coc.nvim';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import config from './config';
import { getWorkspaceFolderPath } from './util';
import { AutoScroll } from './autoScroll';

export interface RunOption {
  specFile?: string;
  line?: number;
  debug?: boolean;
}

export class GaugeRunner {
  private proc: ChildProcessWithoutNullStreams | undefined;
  constructor(private channel: OutputChannel) {}

  async run({ specFile, line, debug }: RunOption) {
    if (this.proc) {
      window.showMessage('Gauge is running.', 'error');
      return;
    }

    const args = ['run', '--simple-console'];
    if (config.verbose) {
      args.push('--verbose');
    }
    if (debug) {
      args.push('--hide-suggestion');
    }
    if (specFile) {
      args.push(`${specFile}${line ? ':' + line.toString() : ''}`);
    }

    this.proc = spawn('gauge', args, {
      cwd: getWorkspaceFolderPath(),
      env: this.createEnv(!!debug),
    });
    if (!this.proc.pid) {
      this.proc.on('error', (e) => {
        window.showMessage('Failed to run gauge: ' + e.message);
      });
      this.proc = undefined;
      return;
    }

    // launched

    this.channel.clear();
    this.channel.show(true);

    let scroll: AutoScroll;
    if (config.autoScrollOutputWindow && !debug) {
      scroll = new AutoScroll(this.channel);
      scroll.start();
    }

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
      if (scroll) {
        scroll.stop();
      }
    });
  }

  stop() {
    if (this.proc) {
      this.proc.kill();
      this.proc = undefined;
    }
  }

  private createEnv(debug: boolean) {
    const env = Object.create(process.env);
    if (debug) {
      env.DEBUGGING = debug;
    }
    return env;
  }

  // https://github.com/getgauge/gauge-vscode/blob/8c227a2071aed643b017eb579c0f83e2eccbf309/src/execution/gaugeExecutor.ts#L87
  private filterStdoutDataDumpsToTextLines(callback: any) {
    let acc = '';
    return (data: any) => {
      const splitted = data.toString().split(/\r?\n/);
      const lines = splitted.slice(0, splitted.length - 1);
      if (lines.length > 0) {
        lines[0] = `${acc}${lines[0]}`;
        acc = '';
      }
      acc = `${acc}${splitted[splitted.length - 1]}`;
      lines.forEach((line: string) => callback(`${line}\n`));
    };
  }
}
