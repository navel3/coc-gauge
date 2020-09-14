import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import DemoList from './lists';

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.showMessage(`coc-gauge works!`);

  context.subscriptions.push(
    commands.registerCommand('coc-gauge.Command', async () => {
      workspace.showMessage(`coc-gauge Commands works!`);
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
