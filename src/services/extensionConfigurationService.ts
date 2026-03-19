import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LoggerService } from './loggerService';

const HOST_SYNC_KEYS = ['musicBeeRemote.host', 'musicBeeRemote.port'];

export class ExtensionConfigurationService {
  private static instance: ExtensionConfigurationService;
  private packageJson: any;
  private logger = LoggerService.getInstance();

  private constructor() {}

  public static getInstance(): ExtensionConfigurationService {
    if (!ExtensionConfigurationService.instance) {
      ExtensionConfigurationService.instance = new ExtensionConfigurationService();
    }
    return ExtensionConfigurationService.instance;
  }

  public initialize(context: vscode.ExtensionContext) {
    const packageJsonPath = path.join(context.extensionPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf8');
        this.packageJson = JSON.parse(content);
      } catch (e) {
        this.logger.error('[ExtensionConfigurationService] Failed to load package.json', e);
      }
    }

    void this.updateHostSyncSettings();
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('musicBeeRemote.syncHostInfo')) {
          void this.updateHostSyncSettings();
        }
      })
    );
  }

  public get(key: string): any {
    if (!this.packageJson) {
      return undefined;
    }
    return key.split('.').reduce((o, i) => o?.[i], this.packageJson);
  }

  private async updateHostSyncSettings(): Promise<void> {
    const shouldSyncHostInfo = vscode.workspace
      .getConfiguration('musicBeeRemote')
      .get<boolean>('syncHostInfo', true);
    const config = vscode.workspace.getConfiguration('settingsSync');
    const currentIgnoredSettings = config.get<string[]>('ignoredSettings', []);
    const nextIgnoredSettings = shouldSyncHostInfo
      ? currentIgnoredSettings.filter((key) => !HOST_SYNC_KEYS.includes(key))
      : [...new Set([...currentIgnoredSettings, ...HOST_SYNC_KEYS])];

    if (currentIgnoredSettings.length === nextIgnoredSettings.length &&
      currentIgnoredSettings.every((key, index) => key === nextIgnoredSettings[index])) {
      return;
    }

    try {
      await config.update('ignoredSettings', nextIgnoredSettings, vscode.ConfigurationTarget.Global);
    } catch (error) {
      this.logger.error('[ExtensionConfigurationService] Failed to update settingsSync.ignoredSettings', error);
    }
  }
}
