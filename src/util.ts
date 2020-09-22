import { workspace } from 'coc.nvim';
export const getWorkspaceFolderPath = () => workspace.workspaceFolder.uri.replace(/^file:\/\//, '');
