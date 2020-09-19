import {
  commands,
  ExtensionContext,
  workspace,
  LanguageClient,
  ServerOptions,
  LanguageClientOptions,
  languages,
  services,
} from 'coc.nvim';
import { GaugeReferenceProvider } from './referenceProvider';
import { GaugeRunner } from './run';
import { Command } from 'coc.nvim/lib/commands';
import { RunScenarioOnCursorCommand, RunSpecCommand, StopCommand, RenameStepCommand } from './commands';

const startGaugeLsp = (projectDir: string) => {
  const serverOptions: ServerOptions = {
    command: 'gauge',
    args: ['daemon', '--lsp', '--dir', projectDir],
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['spec'],
  };

  return new LanguageClient('gauge', 'gauge', serverOptions, clientOptions);
};

export async function activate(context: ExtensionContext): Promise<void> {
  // TODO: init on first spec file is opened
  const client = startGaugeLsp('.');
  languages.registerReferencesProvider(['javascript'], new GaugeReferenceProvider(client));
  context.subscriptions.push(services.registLanguageClient(client));

  const channelName = 'Gauge';
  const outputChannel = workspace.createOutputChannel(channelName);
  await workspace.nvim.command(`au BufWinEnter output:///${channelName} set syntax=markdown`);
  const runner = new GaugeRunner(outputChannel);

  function registCommand(cmd: Command): void {
    const { id, execute } = cmd;
    context.subscriptions.push(commands.registerCommand(id as string, execute, cmd));
  }

  registCommand(new RunScenarioOnCursorCommand(runner));
  registCommand(new RunSpecCommand(runner));
  registCommand(new StopCommand(runner));
  registCommand(new RenameStepCommand());
}
