import * as fs from "fs";
import * as vscode from "vscode";
import type { MusicBeeRemoteState } from "../musicbee/types";
import { MusicBeeRemoteService } from "../musicbee/service";

type WebviewMessage =
  | { type: "ready" }
  | { type: "connect" }
  | { type: "disconnect" }
  | { type: "refresh" }
  | { type: "control"; action: "previous" | "playPause" | "next" | "mute" }
  | { type: "openSettings" };

const RETRY_INTERVAL_SECONDS = 10;

export class MusicBeeRemoteViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = "musicBeeRemote.explorer";

  private webviewView?: vscode.WebviewView;

  private readonly disposables: vscode.Disposable[] = [];

  private retryTimer?: NodeJS.Timeout;

  private retrySecondsLeft = 0;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly service: MusicBeeRemoteService
  ) {
    void vscode.commands.executeCommand("setContext", "musicBeeRemote.connected", false);

    this.disposables.push(
      this.service.onDidChangeState((state) => {
        void vscode.commands.executeCommand(
          "setContext",
          "musicBeeRemote.connected",
          state.connectionStatus === "connected"
        );
        this.postState(state);
        if (state.connectionStatus === "error" && !this.retryTimer) {
          this.scheduleRetry();
        } else if (state.connectionStatus === "connected" || state.connectionStatus === "disconnected") {
          this.cancelRetry();
        }
      })
    );
  }

  public dispose(): void {
    this.cancelRetry();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    this.disposables.push(
      webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
        void this.handleMessage(message);
      })
    );

    this.postState(this.service.getState());

    if (this.service.getState().connectionStatus === "disconnected") {
      this.autoConnect();
    }
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case "ready":
          this.postState(this.service.getState());
          return;
        case "connect":
          this.cancelRetry();
          await this.service.connect();
          return;
        case "disconnect":
          this.cancelRetry();
          await this.service.disconnect();
          return;
        case "refresh":
          await this.service.refresh();
          return;
        case "openSettings":
          await this.service.openSettings();
          return;
        case "control":
          // log will appear in MusicBee Remote output channel
          void this.service.log?.(`[ui] control message received: ${message.action}`);
          if (message.action === "mute")     { await this.service.toggleMute(); return; }
          if (message.action === "previous") { await this.service.previousTrack(); return; }
          if (message.action === "playPause") { await this.service.playPause(); return; }
          await this.service.nextTrack();
          return;
      }
    } catch (error) {
      void vscode.window.showErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private postState(state: MusicBeeRemoteState): void {
    void this.webviewView?.webview.postMessage({
      type: "state",
      state
    });
  }

  private autoConnect(): void {
    this.cancelRetry();
    void this.service.connect().catch(() => {
      // onDidChangeState will fire with "error" status and schedule the retry
    });
  }

  private scheduleRetry(): void {
    this.cancelRetry();
    this.retrySecondsLeft = RETRY_INTERVAL_SECONDS;
    this.postRetryCountdown(this.retrySecondsLeft);
    this.retryTimer = setInterval(() => {
      this.retrySecondsLeft--;
      if (this.retrySecondsLeft <= 0) {
        this.cancelRetry();
        this.autoConnect();
      } else {
        this.postRetryCountdown(this.retrySecondsLeft);
      }
    }, 1000);
  }

  private cancelRetry(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }
    this.retrySecondsLeft = 0;
  }

  private postRetryCountdown(seconds: number): void {
    void this.webviewView?.webview.postMessage({ type: "retryCountdown", seconds });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const mediaUri = vscode.Uri.joinPath(this.extensionUri, "media");
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "css", "now-playing.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "js", "now-playing.js")
    );
    const noArtUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "no-art.png")
    );
    const htmlPath = vscode.Uri.joinPath(mediaUri, "webviews", "now-playing.html").fsPath;
    const html = fs.readFileSync(htmlPath, "utf8");
    return html
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{cssUri\}\}/g, cssUri.toString())
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString())
      .replace(/\{\{noArtUri\}\}/g, noArtUri.toString());
  }
}


function getNonce(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let index = 0; index < 32; index += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
