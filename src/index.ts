import {
  commands,
  ExtensionContext,
  workspace,
  LanguageClient,
  ServerOptions,
  LanguageClientOptions,
  languages,
  services,
  window,
} from 'coc.nvim';
import { GaugeReferenceProvider } from './referenceProvider';
import { GaugeRunner } from './run';
import { Command } from './commands';
import {
  RunScenarioUnderCursorCommand,
  RunSpecCommand,
  StopCommand,
  RenameStepCommand,
  DebugScenarioUnderCursorCommand,
  DebugSpecCommand,
  RunRepeatCommand,
  DebugRepeatCommand,
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
  const outputChannel = window.createOutputChannel(channelName);

  // Create gauge runner
  const runner = new GaugeRunner(outputChannel);

  // Register commands and keymaps
  function registCommandAndKeymap(cmd: Command, key: string): void {
    const { id, execute } = cmd;
    context.subscriptions.push(commands.registerCommand(id as string, execute, cmd));
    workspace.registerKeymap(['n'], key, () => cmd.execute(), { sync: false });
  }

  registCommandAndKeymap(new RunAllCommand(runner), 'gauge-run-all');
  registCommandAndKeymap(new RunSpecCommand(runner), 'gauge-run-spec');
  registCommandAndKeymap(new RunScenarioUnderCursorCommand(runner), 'gauge-run-scenario-under-cursor');
  registCommandAndKeymap(new RunRepeatCommand(runner), 'gauge-run-repeat');
  registCommandAndKeymap(new DebugAllCommand(runner), 'gauge-debug-all');
  registCommandAndKeymap(new DebugSpecCommand(runner), 'gauge-debug-spec');
  registCommandAndKeymap(new DebugScenarioUnderCursorCommand(runner), 'gauge-debug-under-cursor');
  registCommandAndKeymap(new DebugRepeatCommand(runner), 'gauge-debug-repeat');
  registCommandAndKeymap(new StopCommand(runner), 'gauge-stop');
  registCommandAndKeymap(new RenameStepCommand(), 'gauge-rename-step');
  registCommandAndKeymap(new RestartGaugeServiceCommand(client), 'gauge-restart-service');

  // Register auto commands
  await workspace.nvim.command('au BufEnter *.cpt set filetype=spec');
  await workspace.nvim.command(
    `au BufWinEnter ${outputChannelName(
      channelName
    )} set syntax=markdown | setlocal nospell nofoldenable nowrap noswapfile buftype=nofile bufhidden=hide`
  );
}
