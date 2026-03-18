import * as vscode from "vscode";
import { PROTOCOL } from "./protocol";
import { MusicBeeSocketClient } from "./client";
import type {
  AlbumDto,
  ArtistDto,
  BrowseViewId,
  ConnectionSettings,
  CoverPayload,
  MusicBeeRemoteState,
  NowPlayingDetails,
  NowPlayingTrack,
  OutputResponse,
  PlayerStatus,
  PositionPayload,
  SocketMessage,
  TrackDto
} from "./types";

export class MusicBeeRemoteService implements vscode.Disposable {
  private readonly onDidChangeStateEmitter = new vscode.EventEmitter<MusicBeeRemoteState>();

  private client?: MusicBeeSocketClient;

  private state: MusicBeeRemoteState;

  private progressTimer?: NodeJS.Timeout;

  private ratingTimer?: NodeJS.Timeout;

  private coverRetryTimer?: NodeJS.Timeout;

  private coverRetryCount = 0;

  public readonly onDidChangeState = this.onDidChangeStateEmitter.event;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    this.state = this.createInitialState();

    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("musicBeeRemote")) {
          this.state.settings = this.readSettings();
          this.emitState();
        }
      }),
      this.onDidChangeStateEmitter
    );
  }

  public dispose(): void {
    void this.disconnect();
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
    this.stopCoverRetry();
  }

  public getState(): MusicBeeRemoteState {
    return this.state;
  }

  public async connect(): Promise<void> {
    const settings = this.getValidatedConnectionSettings();

    await this.disconnect();

    this.client = new MusicBeeSocketClient(settings);
    this.state.settings = this.client.getConnectionSummary();
    this.state.connectionStatus = "connecting";
    this.state.errorMessage = undefined;
    this.emitState();

    this.log(`Connecting to MusicBee Remote at ${settings.host}:${settings.port}...`);

    try {
      await this.client.connectBroadcast(
        (message) => this.handleBroadcast(message),
        (error) => this.handleDisconnect(error)
      );

      this.state.connectionStatus = "connected";
      this.state.errorMessage = undefined;
      this.startProgressTimer();
      this.startRatingTimer();
      this.startCoverRetry();
      this.emitState();
      this.log("Connected to MusicBee Remote.");
      await this.refresh();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log(`Connection failed: ${err.message}`);
      this.handleDisconnect(err);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }

    this.stopRatingTimer();
    this.stopCoverRetry();

    if (this.client) {
      await this.client.disconnect();
      this.client = undefined;
      this.log("Disconnected from MusicBee Remote.");
    }

    this.state.connectionStatus = "disconnected";
    this.state.errorMessage = undefined;
    this.emitState();
  }

  public async refresh(): Promise<void> {
    const client = this.requireClient();

    const results = await Promise.allSettled([
      this.safeApply(() => client.getNowPlayingTrack(), (value) => this.applyNowPlayingTrack(value)),
      this.safeApply(() => client.getPlayerStatus(), (value) => this.applyPlayerStatus(value)),
      this.safeApply(() => client.getPosition(), (value) => this.applyPosition(value)),
      this.safeApply(() => client.getCover(), (value) => this.applyCover(value)),
      this.safeApply(() => client.getTrackDetails(), (value) => this.applyTrackDetails(value)),
      this.safeApply(() => client.getRating(), (value) => { this.state.nowPlaying.trackRating = String(value ?? ""); }),
      this.safeApply(() => client.getLfmRating(), (value) => { this.state.nowPlaying.lfmRating = String(value ?? ""); }),
      this.safeApply(() => client.getNowPlayingList(), (value) => {
        this.state.nowPlaying.queue = value;
      }),
      this.refreshBrowseView(this.state.activeView, false)
    ]);

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failures.length > 0) {
      this.state.errorMessage = failures[0].reason instanceof Error ? failures[0].reason.message : String(failures[0].reason);
      if (this.state.connectionStatus === "connected") {
        this.state.connectionStatus = "error";
      }
    } else if (this.state.connectionStatus !== "disconnected") {
      this.state.connectionStatus = "connected";
      this.state.errorMessage = undefined;
    }

    this.state.lastUpdated = new Date().toISOString();
    this.emitState();

    // If the cover is still missing after all concurrent requests settled (e.g. due
    // to a race between refresh() and refreshSupplementalNowPlaying() leaving
    // coverDataUrl cleared with no retry running), start a retry to fetch it.
    if (!this.state.nowPlaying.track.coverDataUrl && this.state.connectionStatus === "connected") {
      this.startCoverRetry();
    }
  }

  public async setActiveView(view: BrowseViewId): Promise<void> {
    this.state.activeView = view;
    this.emitState();

    if (this.client) {
      await this.refreshBrowseView(view, false);
      this.emitState();
    }
  }

  public async previousTrack(): Promise<void> {
    await this.sendCommand(PROTOCOL.playerPrevious);
  }

  public async playPause(): Promise<void> {
    await this.sendCommand(PROTOCOL.playerPlayPause);
  }

  public async nextTrack(): Promise<void> {
    await this.sendCommand(PROTOCOL.playerNext);
  }

  public async setVolume(volume: number): Promise<void> {
    const client = this.requireClient();
    await client.sendBroadcastCommand(PROTOCOL.playerVolume, String(volume));
    this.state.nowPlaying.status.volume = volume;
    this.emitState();
  }

  public async setRating(rating: number): Promise<void> {
    const client = this.requireClient();
    await client.sendBroadcastCommand(PROTOCOL.nowPlayingRating, String(rating));
    this.state.nowPlaying.trackRating = String(rating);
    this.emitState();
  }

  public async toggleFavorite(): Promise<void> {
    const client = this.requireClient();
    const isFavorite = this.state.nowPlaying.lfmRating.toLowerCase() === "love";
    const nextValue = isFavorite ? "None" : "Love";
    this.log(`[favorite] toggling lfmRating from "${this.state.nowPlaying.lfmRating}" to "${nextValue}"`);
    await client.sendBroadcastCommand(PROTOCOL.nowPlayingLfmRating, nextValue);
    this.state.nowPlaying.lfmRating = nextValue;
    this.emitState();
  }

  public async toggleRepeat(): Promise<void> {
    const client = this.requireClient();
    await client.sendBroadcastCommand(PROTOCOL.playerRepeat, PROTOCOL.toggle);
    await this.refresh();
  }

  public async toggleShuffle(): Promise<void> {
    const client = this.requireClient();
    await client.sendBroadcastCommand(PROTOCOL.playerShuffle, PROTOCOL.toggle);
    await this.refresh();
  }

  public async toggleMute(): Promise<void> {
    this.log(`[mute] toggleMute called, client present: ${!!this.client}, current mute state: ${this.state.nowPlaying.status.mute}`);
    const client = this.requireClient();
    this.log(`[mute] sending playerMute with data: "${PROTOCOL.toggle}"`);
    await client.sendBroadcastCommand(PROTOCOL.playerMute, PROTOCOL.toggle);
    // State is updated via the broadcast response — no need for a full refresh
  }

  public async playPlaylist(url: string): Promise<void> {
    const client = this.requireClient();
    await client.playPlaylist(url);
    await this.refresh();
  }

  public async activateOutput(deviceName: string): Promise<void> {
    const client = this.requireClient();
    const outputs = await client.activateOutput(deviceName);
    this.state.library.outputs = outputs;
    this.state.lastUpdated = new Date().toISOString();
    this.emitState();
  }

  public async openSettings(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:darthminos.musicbee-remote");
  }

  private async handleBroadcast(message: SocketMessage): Promise<void> {
    if (message.context === PROTOCOL.nowPlayingCover) {
      this.log(`[broadcast] context: ${message.context}  cover present: ${!!(message.data as CoverPayload)?.cover}`);
    } else {
      this.log(`[broadcast] context: ${message.context}  data: ${JSON.stringify(message.data)}`);
    }

    switch (message.context) {
      case PROTOCOL.playerStatus:
        this.applyPlayerStatus(message.data as PlayerStatus);
        break;

      case PROTOCOL.playerMute:
        this.state.nowPlaying.status.mute = message.data === true || message.data === "true";
        break;

      case PROTOCOL.playerVolume:
        this.state.nowPlaying.status.volume = Number(message.data ?? 0);
        break;

      case PROTOCOL.playerState:
        this.state.nowPlaying.status.playState = String(message.data ?? "");
        break;

      case PROTOCOL.playerRepeat:
        this.state.nowPlaying.status.repeat = String(message.data ?? "off");
        break;

      case PROTOCOL.playerShuffle:
        this.state.nowPlaying.status.shuffle = String(message.data ?? "off");
        break;

      case PROTOCOL.nowPlayingTrack:
        this.applyNowPlayingTrack(message.data as NowPlayingTrack);
        await this.refreshSupplementalNowPlaying();
        break;

      case PROTOCOL.nowPlayingPosition:
        this.applyPosition(message.data as PositionPayload);
        break;

      case PROTOCOL.nowPlayingCover:
        this.applyCover(message.data as CoverPayload);
        if (this.state.nowPlaying.track.coverDataUrl) {
          this.stopCoverRetry();
        }
        break;

      case PROTOCOL.nowPlayingDetails:
        this.applyTrackDetails(message.data as NowPlayingDetails);
        break;

      case PROTOCOL.nowPlayingRating:
        this.state.nowPlaying.trackRating = String(message.data ?? "");
        break;

      case PROTOCOL.nowPlayingLfmRating:
        this.state.nowPlaying.lfmRating = String(message.data ?? "");
        break;

      case PROTOCOL.nowPlayingListChanged:
        await this.safeApply(
          () => this.requireClient().getNowPlayingList(),
          (value) => {
            this.state.nowPlaying.queue = value;
          }
        );
        break;

      case PROTOCOL.ping:
        await this.requireClient().sendBroadcastCommand(PROTOCOL.pong);
        break;

      default:
        break;
    }

    this.state.lastUpdated = new Date().toISOString();
    if (this.state.connectionStatus !== "disconnected") {
      this.state.connectionStatus = "connected";
      this.state.errorMessage = undefined;
    }
    this.emitState();
  }

  private handleDisconnect(error?: Error): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }

    this.stopRatingTimer();

    const message = error?.message ?? "Disconnected from MusicBee Remote.";
    this.log(`Lost connection: ${message}`);

    this.client = undefined;
    this.state.connectionStatus = "error";
    this.state.errorMessage = message;
    this.emitState();
  }

  private async refreshSupplementalNowPlaying(): Promise<void> {
    if (!this.client) {
      return;
    }

    this.stopCoverRetry();

    await Promise.allSettled([
      this.safeApply(() => this.client!.getCover(), (value) => this.applyCover(value)),
      this.safeApply(() => this.client!.getTrackDetails(), (value) => this.applyTrackDetails(value))
    ]);

    if (!this.state.nowPlaying.track.coverDataUrl) {
      this.startCoverRetry();
    }
  }

  private async refreshBrowseView(view: BrowseViewId, emitAfter: boolean): Promise<void> {
    const client = this.requireClient();

    this.state.loadingView = view;
    if (emitAfter) {
      this.emitState();
    }

    try {
      switch (view) {
        case "playlists":
          this.state.library.playlists = await client.getPlaylists();
          break;

        case "artists":
          this.state.library.artists = await client.getArtists();
          break;

        case "albums":
          this.state.library.albums = await client.getAlbums();
          break;

        case "tracks":
          this.state.library.tracks = await client.getTracks();
          break;

        case "outputs":
          this.state.library.outputs = await client.getOutputs();
          break;

        case "nowPlaying":
        default:
          break;
      }
    } finally {
      if (this.state.loadingView === view) {
        this.state.loadingView = undefined;
      }
    }
  }

  private applyNowPlayingTrack(track: NowPlayingTrack): void {
    const previousPath = this.state.nowPlaying.track.path;
    const incomingPath = track.path;

    // Reset cover when the track changes so stale art from a prior song is not shown.
    if (incomingPath && previousPath && incomingPath !== previousPath) {
      this.state.nowPlaying.track.coverDataUrl = undefined;
    }

    this.state.nowPlaying.track = {
      ...this.state.nowPlaying.track,
      ...track
    };
  }

  private applyPlayerStatus(status: PlayerStatus): void {
    this.state.nowPlaying.status = {
      mute: status.playermute,
      playState: status.playerstate,
      repeat: String(status.playerrepeat ?? "off"),
      shuffle: String(status.playershuffle ?? "off"),
      scrobbling: status.scrobbler,
      volume: status.playervolume
    };
  }

  private applyPosition(position: PositionPayload): void {
    this.state.nowPlaying.position = {
      current: Number(position.current ?? 0),
      total: Number(position.total ?? 0)
    };
  }

  private applyTrackDetails(details: NowPlayingDetails): void {
    this.state.nowPlaying.details = details;
  }

  private applyCover(payload: CoverPayload): void {
    if (!payload.cover) {
      if (this.state.nowPlaying.track.coverDataUrl) {
        this.log(`[cover] applyCover: empty payload ignored because cover is already set (status: ${payload.status})`);
        return;
      }
      this.log(`[cover] applyCover: no cover in payload (status: ${payload.status})`);
      this.state.nowPlaying.track.coverDataUrl = undefined;
      return;
    }
    this.log(`[cover] applyCover: cover received (${payload.cover.length} chars, status: ${payload.status})`);
    this.stopCoverRetry();
    this.state.nowPlaying.track.coverDataUrl = normalizeCoverData(payload.cover);
  }

  private startCoverRetry(): void {
    this.stopCoverRetry();
    this.log(`[cover] starting cover retry polling`);
    this.coverRetryTimer = setInterval(async () => {
      if (this.state.nowPlaying.track.coverDataUrl) {
        this.log(`[cover] cover already present, stopping retry`);
        this.stopCoverRetry();
        return;
      }
      this.coverRetryCount++;
      if (this.coverRetryCount > 20 || !this.client) {
        this.log(`[cover] retry limit reached (${this.coverRetryCount}), giving up`);
        this.stopCoverRetry();
        return;
      }
      this.log(`[cover] retry attempt ${this.coverRetryCount} — requesting cover via dedicated connection`);
      try {
        const payload = await this.client.getCover();
        this.log(`[cover] getCover response: cover present=${!!payload.cover}, status=${payload.status}`);
        if (payload.cover) {
          this.applyCover(payload);
          this.emitState();
          this.stopCoverRetry();
        }
      } catch (err) {
        this.log(`[cover] getCover error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 1000);
  }

  private stopCoverRetry(): void {
    if (this.coverRetryTimer) {
      clearInterval(this.coverRetryTimer);
      this.coverRetryTimer = undefined;
    }
    this.coverRetryCount = 0;
  }

  private startProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }

    this.progressTimer = setInterval(() => {
      if (this.state.connectionStatus !== "connected") {
        return;
      }

      if (!/play/i.test(this.state.nowPlaying.status.playState)) {
        return;
      }

      const total = this.state.nowPlaying.position.total;
      if (total <= 0) {
        return;
      }

      this.state.nowPlaying.position.current = Math.min(
        total,
        this.state.nowPlaying.position.current + 1000
      );
      this.emitState();
    }, 1000);
  }

  private startRatingTimer(): void {
    if (this.ratingTimer) {
      clearInterval(this.ratingTimer);
    }

    // Poll now playing details (including rating) periodically so changes made
    // directly in MusicBee show up in the UI.
    this.ratingTimer = setInterval(async () => {
      if (this.state.connectionStatus !== "connected") {
        return;
      }

      try {
        await this.refreshTrackDetails();
      } catch {
        // ignore; refreshTrackDetails handles errors internally
      }
    }, 10_000);
  }

  private stopRatingTimer(): void {
    if (this.ratingTimer) {
      clearInterval(this.ratingTimer);
      this.ratingTimer = undefined;
    }
  }

  private async refreshTrackDetails(): Promise<void> {
    if (!this.client) {
      return;
    }

    // Only poll track details (genre, disc info, etc.).
    // Rating and LFM rating are handled exclusively via broadcast events — polling
    // them via a dedicated connection causes MusicBee to re-broadcast the value,
    // which can overwrite a just-set rating with stale data.
    await this.safeApply(() => this.client!.getTrackDetails(), (value) => this.applyTrackDetails(value));
  }

  private async sendCommand(context: typeof PROTOCOL.playerPrevious | typeof PROTOCOL.playerPlayPause | typeof PROTOCOL.playerNext): Promise<void> {
    const client = this.requireClient();
    await client.sendBroadcastCommand(context);
    await this.refresh();
  }

  private readSettings(): MusicBeeRemoteState["settings"] {
    const config = vscode.workspace.getConfiguration("musicBeeRemote");
    return {
      host: config.get<string>("host", "127.0.0.1").trim(),
      port: config.get<number>("port", 3000),
      clientName: config.get<string>("clientName", "VS Code").trim() || "VS Code"
    };
  }

  private getValidatedConnectionSettings(): ConnectionSettings {
    const settings = this.readSettings();
    if (!settings.host) {
      throw new Error("Set musicBeeRemote.host before connecting.");
    }

    return {
      ...settings,
      clientId: this.context.globalStorageUri.toString()
    };
  }

  private requireClient(): MusicBeeSocketClient {
    if (!this.client) {
      throw new Error("Connect to MusicBee Remote first.");
    }

    return this.client;
  }

  private emitState(): void {
    this.onDidChangeStateEmitter.fire({
      ...this.state,
      nowPlaying: {
        ...this.state.nowPlaying,
        track: { ...this.state.nowPlaying.track },
        status: { ...this.state.nowPlaying.status },
        position: { ...this.state.nowPlaying.position },
        queue: [...this.state.nowPlaying.queue]
      },
      library: {
        playlists: [...this.state.library.playlists],
        artists: [...this.state.library.artists],
        albums: [...this.state.library.albums],
        tracks: [...this.state.library.tracks],
        outputs: {
          devices: [...this.state.library.outputs.devices],
          active: this.state.library.outputs.active
        }
      }
    });
  }

  private createInitialState(): MusicBeeRemoteState {
    return {
      connectionStatus: "disconnected",
      settings: this.readSettings(),
      activeView: "nowPlaying",
      nowPlaying: {
        track: {},
        status: {
          mute: false,
          repeat: "off",
          shuffle: "off",
          scrobbling: false,
          volume: 0,
          playState: ""
        },
        trackRating: "",
        lfmRating: "",
        position: {
          current: 0,
          total: 0
        },
        queue: []
      },
      library: {
        playlists: [],
        artists: [],
        albums: [],
        tracks: [],
        outputs: {
          devices: [],
          active: ""
        }
      }
    };
  }

  private async safeApply<T>(producer: () => Promise<T>, consumer: (value: T) => void): Promise<void> {
    const value = await producer();
    consumer(value);
  }

  public log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }
}

function normalizeCoverData(value: string): string {
  if (value.startsWith("data:image/")) {
    return value;
  }

  if (value.startsWith("iVBOR")) {
    return `data:image/png;base64,${value}`;
  }

  if (value.startsWith("/9j/")) {
    return `data:image/jpeg;base64,${value}`;
  }

  return `data:image/jpeg;base64,${value}`;
}
