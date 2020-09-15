import {
  commands,
  CompleteResult,
  ExtensionContext,
  listManager,
  sources,
  workspace,
  LanguageClient,
  ServerOptions,
  LanguageClientOptions,
  services,
  OutputChannel,
} from 'coc.nvim';
import DemoList from './lists';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

export async function activate(context: ExtensionContext): Promise<void> {
  const serverOptions: ServerOptions = {
    command: 'gauge',
    args: ['daemon', '--lsp', '--dir', '.'],
  };

  // TODO: More precise selector
  const clientOptions: LanguageClientOptions = {
    documentSelector: ['spec'],
  };

  const client = new LanguageClient('gauge', 'gauge', serverOptions, clientOptions);

  const gaugeChannel = workspace.createOutputChannel('Gauge');

  await workspace.nvim.command('au BufWinEnter output:///Gauge set syntax=markdown');

  const getCurrentFileName = () => workspace.uri.replace(/^file:\/\/\//, '/');

  let gaugeProc: ChildProcessWithoutNullStreams | undefined;
  const runGauge = async ({ specFile, line }: { specFile: string; line?: number }) => {
    gaugeChannel.clear();
    gaugeChannel.show(true);

    if (gaugeProc) {
      workspace.showMessage('Gauge is running.', 'error');
      return;
    }

    gaugeProc = spawn('gauge', ['run', '--simple-console', `${specFile}${line ? ':' + line.toString() : ''}`]);
    gaugeProc.stdout.on('data', (chunk) => {
      gaugeChannel.append(chunk.toString());
    });
    gaugeProc.stderr.on('data', (e) => {
      gaugeChannel.append(e.message);
    });
    gaugeProc.on('close', (code) => {
      gaugeChannel.appendLine(`Closed: ${code}`);
    });
    gaugeProc.on('exit', (code) => {
      gaugeChannel.appendLine(`Exited: ${code}`);
      gaugeProc = undefined;
    });
  };

  context.subscriptions.push(
    services.registLanguageClient(client),

    commands.registerCommand('coc-gauge.RunScenarioOnCursor', async () => {
      const state = await workspace.getCurrentState();
      runGauge({ specFile: getCurrentFileName(), line: state.position.line });
    }),

    commands.registerCommand('coc-gauge.RunSpec', async () => {
      runGauge({ specFile: getCurrentFileName() });
    }),

    commands.registerCommand('coc-gauge.Stop', async () => {
      if (gaugeProc) {
        gaugeProc.kill();
      }
    }),

    listManager.registerList(new DemoList(workspace.nvim)),

    sources.createSource({
      name: 'coc-gauge completion source', // unique id
      shortcut: '[CS]', // [CS] is custom source
      priority: 1,
      triggerPatterns: [], // RegExp pattern
      doComplete: async () => {
        const items = await getCompletionItems();
        return items;
      },
    }),

    workspace.registerKeymap(
      ['n'],
      'coc-gauge-keymap',
      async () => {
        workspace.showMessage(`registerKeymap`);
      },
      { sync: false }
    ),

    workspace.registerAutocmd({
      event: 'InsertLeave',
      request: true,
      callback: () => {
        workspace.showMessage(`registerAutocmd on InsertLeave`);
      },
    })
  );
}

async function getCompletionItems(): Promise<CompleteResult> {
  return {
    items: [
      {
        word: 'TestCompletionItem 1',
      },
      {
        word: 'TestCompletionItem 2',
      },
    ],
  };
}
