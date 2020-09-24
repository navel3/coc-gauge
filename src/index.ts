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
import {
  RunScenarioAtCursorCommand,
  RunSpecCommand,
  StopCommand,
  RenameStepCommand,
  DebugScenarioAtCursorCommand,
  DebugSpecCommand,
  RunLastLaunchedCommand,
  DebugLastLaunchedCommand,
  RestartGaugeServiceCommand,
  RunAllCommand,
  DebugAllCommand,
} from './commands';
import config from './config';
import { spawn } from 'child_process';
import { getWorkspaceFolderPath, outputChannelName } from './util';

const startGaugeService = () => {
  const serverOptions: ServerOptions = async () =>
    spawn('gauge', ['daemon', '--lsp', '--dir', getWorkspaceFolderPath()]);

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['spec'],
  };

  return new LanguageClient('gauge', 'gauge', serverOptions, clientOptions);
};

export async function activate(context: ExtensionContext): Promise<void> {
  if (!config.enable) return;

  // Start language server
  const client = startGaugeService();
  languages.registerReferencesProvider(['javascript'], new GaugeReferenceProvider(client));
  context.subscriptions.push(services.registLanguageClient(client));

  // Create output channel for gauge
  const channelName = 'Gauge';
  const outputChannel = workspace.createOutputChannel(channelName);

  // Create gauge runner
  const runner = new GaugeRunner(outputChannel);

  // Register commands
  function registCommand(cmd: Command): void {
    const { id, execute } = cmd;
    context.subscriptions.push(commands.registerCommand(id as string, execute, cmd));
  }

  registCommand(new RunAllCommand(runner));
  registCommand(new RunSpecCommand(runner));
  registCommand(new RunScenarioAtCursorCommand(runner));
  registCommand(new RunLastLaunchedCommand(runner));
  registCommand(new DebugAllCommand(runner));
  registCommand(new DebugSpecCommand(runner));
  registCommand(new DebugScenarioAtCursorCommand(runner));
  registCommand(new DebugLastLaunchedCommand(runner));
  registCommand(new StopCommand(runner));
  registCommand(new RenameStepCommand());
  registCommand(new RestartGaugeServiceCommand(client));

  // Register auto commands
  await workspace.nvim.command('au BufEnter *.cpt set filetype=spec');
  await workspace.nvim.command(
    `au BufWinEnter ${outputChannelName(
      channelName
    )} set syntax=markdown | setlocal nospell nofoldenable nowrap noswapfile buftype=nofile bufhidden=hide`
  );
}
