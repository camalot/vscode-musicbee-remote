import * as vscode from 'vscode';
import * as buyMeACoffee from './buyMeACoffee';
import * as githubSponsor from './githubSponsor';
import * as githubIssues from './githubIssues';
// import * as openSettings from './openSettings';
// import * as refresh from './refresh';

import { LoggerService } from '../services/loggerService';


export function loadCommands(context: vscode.ExtensionContext) {
  const logger = LoggerService.getInstance();
  const modules = [
    buyMeACoffee,
    githubIssues,
    githubSponsor,
    // refresh,
    // openSettings,
  ];

  for (const mod of modules) {
    for (const key of Object.keys(mod)) {
      if (key.endsWith('Command')) {
        const CommandClass = (mod as any)[key];
        if (typeof CommandClass === 'function') {
          try {
            // instantiate; constructor will register the command via BaseCommand
            new CommandClass(context);
          } catch (err) {
            logger.error(`[Commands] Failed to load command ${key}:`, err);
          }
        }
      }
    }
  }
}
