import * as vscode from "vscode";
import { MusicBeeRemoteService } from "./musicbee/service";
import { MusicBeeRemoteViewProvider } from "./views/musicBeeRemoteViewProvider";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("MusicBee Remote");
  const service = new MusicBeeRemoteService(context, outputChannel);
  const viewProvider = new MusicBeeRemoteViewProvider(context.extensionUri, service);

  context.subscriptions.push(
    outputChannel,
    service,
    viewProvider,
    vscode.window.registerWebviewViewProvider(MusicBeeRemoteViewProvider.viewType, viewProvider),

    registerCommand("musicBeeRemote.connect", async () => {
      await service.connect();
    }),
    registerCommand("musicBeeRemote.disconnect", () => service.disconnect()),
    registerCommand("musicBeeRemote.refresh", () => service.refresh()),
    registerCommand("musicBeeRemote.previous", () => service.previousTrack()),
    registerCommand("musicBeeRemote.playPause", () => service.playPause()),
    registerCommand("musicBeeRemote.next", () => service.nextTrack()),
    registerCommand("musicBeeRemote.openSettings", () => service.openSettings())
  );
}

export function deactivate(): void {}

function registerCommand(command: string, callback: () => Promise<void>): vscode.Disposable {
  return vscode.commands.registerCommand(command, async () => {
    try {
      await callback();
    } catch (error) {
      void vscode.window.showErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
    }
  });
}
