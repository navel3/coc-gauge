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
  languages,
  services,
} from 'coc.nvim';
import DemoList from './lists';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import ReferenceProvider from './referenceProvider';

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

  languages.registerReferencesProvider(['javascript'], new ReferenceProvider(client));

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

    commands.registerCommand('coc-gauge.RenameStep', async () => {
      const { document, position: pos } = await workspace.getCurrentState();
      const line = await workspace.getLine(document.uri, pos.line);
      if (!line.match(/^(?:[*])([^*].*)$/)) return;

      // Find the end of the step
      const lines = [line.trim()];
      for (;;) {
        const nline = await workspace.getLine(document.uri, pos.line + 1);

        // check the next line is continuation of the step or not
        if (nline.length === 0 || ['#', '*', ' ', '\t'].includes(nline[0])) {
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
