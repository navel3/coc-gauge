import { workspace } from 'coc.nvim';

export const getWorkspaceFolderPath = () =>
  workspace.workspaceFolder ? workspace.workspaceFolder.uri.replace(/^file:\/\//, '') : workspace.cwd;

export const outputChannelName = (name: string) => `output:///${name}`;
