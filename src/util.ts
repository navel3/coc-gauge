import { workspace } from 'coc.nvim';

export const getWorkspaceFolderPath = () => workspace.workspaceFolder.uri.replace(/^file:\/\//, '');

export const outputChannelName = (name: string) => `output:///${name}`;
