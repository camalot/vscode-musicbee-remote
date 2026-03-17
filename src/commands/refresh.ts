import BaseCommand from '../common/baseCommand';
import * as vscode from 'vscode';

export class RefreshCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super('refresh', context);

  }

  async run(): Promise<void> {
    
  }
}
