import { OutputChannel, workspace } from 'coc.nvim';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

type RunProps = {
  specFile?: string;
  line?: number;
};

export class GaugeRunner {
  private proc: ChildProcessWithoutNullStreams | undefined;
  constructor(private channel: OutputChannel) {}

  async run({ specFile, line }: RunProps = {}) {
    this.channel.clear();
    this.channel.show(true);

    if (this.proc) {
      workspace.showMessage('Gauge is running.', 'error');
      return;
    }

    const args = ['run', '--simple-console'];
    if (specFile) {
      args.push(`${specFile}${line ? ':' + line.toString() : ''}`);
    }
    this.proc = spawn('gauge', args);
    this.proc.stdout.on('data', (chunk) => {
      this.channel.append(chunk.toString());
    });
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
}
