import * as fs from "fs";
import * as vscode from "vscode";
import type { MusicBeeRemoteState } from "../musicbee/types";
import { MusicBeeRemoteService } from "../musicbee/service";

type WebviewMessage =
  | { type: "ready" }
  | { type: "connect" }
  | { type: "disconnect" }
  | { type: "refresh" }
  | { type: "control"; action: "previous" | "playPause" | "next" | "mute" | "favorite" | "volume" | "rating"; value?: number }
  | { type: "openSettings" };

const RETRY_INTERVAL_SECONDS = 10;

export class NowPlayingViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = "musicBeeRemote.nowPlaying";

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

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("musicBeeRemote.theme")) {
          return;
        }

        this.refreshWebviewTheme();
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
          if (message.action === "mute") {
            await this.service.toggleMute();
            return;
          }
          if (message.action === "previous") {
            await this.service.previousTrack();
            return;
          }
          if (message.action === "playPause") {
            await this.service.playPause();
            return;
          }
          if (message.action === "next") {
            await this.service.nextTrack();
            return;
          }
          if (message.action === "volume" && typeof message.value === "number") {
            this.service.log?.(`[ui] set volume ${message.value}`);
            await this.service.setVolume(message.value);
            return;
          }
          if (message.action === "rating" && typeof message.value === "number") {
            this.service.log?.(`[ui] set rating ${message.value}`);
            await this.service.setRating(message.value);
            return;
          }
          if (message.action === "favorite") {
            this.service.log?.(`[ui] toggle favorite`);
            await this.service.toggleFavorite();
            return;
          }
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

  private refreshWebviewTheme(): void {
    if (!this.webviewView) {
      return;
    }

    this.webviewView.webview.html = this.getHtml(this.webviewView.webview);
    this.postState(this.service.getState());
  }

  private getConfiguredTheme(): string {
    const configuredTheme = vscode.workspace
      .getConfiguration("musicBeeRemote")
      .get<string>("theme", "default")
      .toLowerCase();

    if (!configuredTheme) {
      return "default";
    } else {
      return configuredTheme;
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const theme = this.getConfiguredTheme();
    const mediaUri = vscode.Uri.joinPath(this.extensionUri, "media");
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "css", "now-playing.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "js", "now-playing.js")
    );
    const playTrackUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "play-track.svg")
    );
    const pauseTrackUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "pause-track.svg")
    );
    const nextTrackUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "next-track.svg")
    );
    const previousTrackUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "previous-track.svg")
    );
    const noArtUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "no-art.png")
    );
    const volume0Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "volume-0.svg")
    );
    const volume1Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "volume-1.svg")
    );
    const volume2Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "volume-2.svg")
    );
    const volume3Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "volume-3.svg")
    );
    const volume4Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaUri, "assets", "images", "controls", "volume-4.svg")
    );
    const htmlPath = vscode.Uri.joinPath(mediaUri, "webviews", "now-playing.html").fsPath;
    const html = fs.readFileSync(htmlPath, "utf8");
    return html
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{cssUri\}\}/g, cssUri.toString())
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString())
      .replace(/\{\{playTrackUri\}\}/g, playTrackUri.toString())
      .replace(/\{\{pauseTrackUri\}\}/g, pauseTrackUri.toString())
      .replace(/\{\{nextTrackUri\}\}/g, nextTrackUri.toString())
      .replace(/\{\{previousTrackUri\}\}/g, previousTrackUri.toString())
      .replace(/\{\{theme\}\}/g, theme)
        .replace(/\{\{volume0Uri\}\}/g, volume0Uri.toString())
        .replace(/\{\{volume1Uri\}\}/g, volume1Uri.toString())
        .replace(/\{\{volume2Uri\}\}/g, volume2Uri.toString())
        .replace(/\{\{volume3Uri\}\}/g, volume3Uri.toString())
        .replace(/\{\{volume4Uri\}\}/g, volume4Uri.toString())
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
