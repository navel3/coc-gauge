'use strict';

import { ReferenceProvider, ReferenceContext, LanguageClient, workspace } from 'coc.nvim';
import {
  TextDocumentIdentifier,
  Position,
  Location,
  TextDocument,
  CancellationToken,
} from 'vscode-languageserver-protocol';

export class GaugeReferenceProvider implements ReferenceProvider {
  public constructor(private readonly client: LanguageClient) {}

  public async provideReferences(
    document: TextDocument,
    position: Position,
    _context: ReferenceContext,
    token: CancellationToken
  ): Promise<Location[]> {
    const documentId = TextDocumentIdentifier.create(document.uri);
    const params = { textDocument: documentId, position };
    const stepValue = await this.client.sendRequest<string>('gauge/stepValueAt', params, token);
    return this.client.sendRequest<Location[]>('gauge/stepReferences', stepValue, token);
  }
}
