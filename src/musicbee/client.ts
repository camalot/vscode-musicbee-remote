import * as net from "node:net";
import {
  CURRENT_PROTOCOL_VERSION,
  MIN_SUPPORTED_PROTOCOL_VERSION,
  PAGE_LIMIT,
  PROTOCOL,
  type ProtocolContext
} from "./protocol";
import type {
  AlbumDto,
  ArtistDto,
  ConnectionSettings,
  CoverPayload,
  MusicBeeRemoteState,
  NowPlayingDetails,
  NowPlayingDto,
  NowPlayingTrack,
  OutputResponse,
  Page,
  PageRange,
  PlayerStatus,
  PlaylistDto,
  PositionPayload,
  SocketMessage,
  TrackDto
} from "./types";

class JsonLineReader {
  private buffer = "";

  private readonly lines: string[] = [];

  private readonly waiters: Array<{
    resolve: (line: string) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  private ended = false;

  private endError?: Error;

  public constructor(private readonly socket: net.Socket, private readonly timeoutMs: number) {
    this.socket.on("data", (chunk: Buffer | string) => {
      this.buffer += chunk.toString();
      this.flush();
    });

    this.socket.on("error", (error) => {
      this.finish(error);
    });

    this.socket.on("close", () => {
      this.finish(new Error("MusicBee socket closed."));
    });

    this.socket.on("end", () => {
      this.finish(new Error("MusicBee socket ended."));
    });
  }

  public async readLine(): Promise<string> {
    if (this.lines.length > 0) {
      return this.lines.shift() ?? "";
    }

    if (this.ended) {
      throw this.endError ?? new Error("MusicBee socket is unavailable.");
    }

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeWaiter(waiter);
        reject(new Error("Timed out waiting for MusicBee socket data."));
      }, this.timeoutMs);

      const waiter = {
        resolve: (line: string) => {
          clearTimeout(timer);
          resolve(line);
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          reject(error);
        },
        timer
      };

      this.waiters.push(waiter);
    });
  }

  private flush(): void {
    const normalized = this.buffer.replace(/\r\n/g, "\n");
    const parts = normalized.split("\n");
    this.buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) {
        continue;
      }

      if (this.waiters.length > 0) {
        const waiter = this.waiters.shift();
        waiter?.resolve(part);
      } else {
        this.lines.push(part);
      }
    }
  }

  private finish(error: Error): void {
    if (this.ended) {
      return;
    }

    this.ended = true;
    this.endError = error;

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.reject(error);
      }
    }
  }

  private removeWaiter(target: { timer: NodeJS.Timeout }): void {
    const index = this.waiters.findIndex((waiter) => waiter.timer === target.timer);
    if (index >= 0) {
      this.waiters.splice(index, 1);
    }
  }
}

class SocketConnection {
  private readonly reader: JsonLineReader;

  public constructor(private readonly socket: net.Socket, timeoutMs: number) {
    this.reader = new JsonLineReader(socket, timeoutMs);
  }

  public async readMessage<T = unknown>(): Promise<SocketMessage<T>> {
    const line = await this.reader.readLine();
    return JSON.parse(line) as SocketMessage<T>;
  }

  public send(context: string, data: unknown = ""): Promise<void> {
    const payload = JSON.stringify({
      context,
      data
    });

    return new Promise<void>((resolve, reject) => {
      this.socket.write(`${payload}\r\n`, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  public close(): void {
    this.socket.end();
    this.socket.destroy();
  }
}

export class MusicBeeSocketClient {
  private static readonly socketTimeoutMs = 20_000;

  private broadcastConnection?: SocketConnection;

  private broadcastLoopPromise?: Promise<void>;

  private intentionalDisconnect = false;

  public constructor(private readonly settings: ConnectionSettings) {}

  public getConnectionSummary(): MusicBeeRemoteState["settings"] {
    return {
      host: this.settings.host,
      port: this.settings.port,
      clientName: this.settings.clientName
    };
  }

  public async connectBroadcast(
    onMessage: (message: SocketMessage) => Promise<void> | void,
    onDisconnect: (error?: Error) => void
  ): Promise<void> {
    if (this.broadcastConnection) {
      return;
    }

    const connection = await this.openConnection(false);
    this.broadcastConnection = connection;
    this.intentionalDisconnect = false;

    this.broadcastLoopPromise = this.readBroadcastLoop(connection, onMessage, onDisconnect);
  }

  public async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.broadcastConnection?.close();
    this.broadcastConnection = undefined;
    await this.broadcastLoopPromise?.catch(() => undefined);
    this.broadcastLoopPromise = undefined;
  }

  public async sendBroadcastCommand(context: ProtocolContext, data: unknown = ""): Promise<void> {
    if (!this.broadcastConnection) {
      throw new Error("MusicBee Remote is not connected.");
    }

    await this.broadcastConnection.send(context, data);
  }

  public async getNowPlayingTrack(): Promise<NowPlayingTrack> {
    return this.requestItem<NowPlayingTrack>(PROTOCOL.nowPlayingTrack);
  }

  public async getPlayerStatus(): Promise<PlayerStatus> {
    return this.requestItem<PlayerStatus>(PROTOCOL.playerStatus);
  }

  public async getPosition(): Promise<PositionPayload> {
    return this.requestItem<PositionPayload>(PROTOCOL.nowPlayingPosition);
  }

  public async getCover(): Promise<CoverPayload> {
    return this.requestItem<CoverPayload>(PROTOCOL.nowPlayingCover);
  }

  public async getTrackDetails(): Promise<NowPlayingDetails> {
    return this.requestItem<NowPlayingDetails>(PROTOCOL.nowPlayingDetails);
  }

  public async getRating(): Promise<string> {
    return this.requestItem<string>(PROTOCOL.nowPlayingRating);
  }

  public async getLfmRating(): Promise<string> {
    return this.requestItem<string>(PROTOCOL.nowPlayingLfmRating);
  }

  public async getNowPlayingList(): Promise<NowPlayingDto[]> {
    return this.getAllPages<NowPlayingDto>(PROTOCOL.nowPlayingList);
  }

  public async getPlaylists(): Promise<PlaylistDto[]> {
    return this.getAllPages<PlaylistDto>(PROTOCOL.playlistList);
  }

  public async getArtists(): Promise<ArtistDto[]> {
    return this.getAllPages<ArtistDto>(PROTOCOL.libraryBrowseArtists);
  }

  public async getAlbums(): Promise<AlbumDto[]> {
    return this.getAllPages<AlbumDto>(PROTOCOL.libraryBrowseAlbums);
  }

  public async getTracks(): Promise<TrackDto[]> {
    return this.getAllPages<TrackDto>(PROTOCOL.libraryBrowseTracks);
  }

  public async getOutputs(): Promise<OutputResponse> {
    return this.requestItem<OutputResponse>(PROTOCOL.playerOutput);
  }

  public async activateOutput(deviceName: string): Promise<OutputResponse> {
    return this.requestItem<OutputResponse>(PROTOCOL.playerOutputSwitch, deviceName);
  }

  public async playPlaylist(url: string): Promise<void> {
    await this.sendBroadcastCommand(PROTOCOL.playlistPlay, url);
  }

  private async requestItem<T>(context: ProtocolContext, payload: unknown = ""): Promise<T> {
    const connection = await this.openConnection(true);

    try {
      await connection.send(context, payload);
      const message = await connection.readMessage<T>();
      this.throwIfProtocolError(message);
      return message.data;
    } finally {
      connection.close();
    }
  }

  private async getAllPages<T>(context: ProtocolContext): Promise<T[]> {
    const connection = await this.openConnection(true);
    const allItems: T[] = [];

    try {
      for (let pageIndex = 0; pageIndex < Number.MAX_SAFE_INTEGER; pageIndex += 1) {
        const range: PageRange = {
          offset: pageIndex * PAGE_LIMIT,
          limit: PAGE_LIMIT
        };

        await connection.send(context, range);
        const message = await connection.readMessage<Page<T>>();
        this.throwIfProtocolError(message);

        const page = message.data;
        allItems.push(...page.data);

        if (page.offset + page.limit > page.total) {
          break;
        }
      }
    } finally {
      connection.close();
    }

    return allItems;
  }

  private async openConnection(noBroadcast: boolean): Promise<SocketConnection> {
    const socket = await this.createSocket();
    const connection = new SocketConnection(socket, MusicBeeSocketClient.socketTimeoutMs);

    await connection.send(PROTOCOL.player, this.settings.clientName);

    let handshakeComplete = false;

    while (!handshakeComplete) {
      const message = await connection.readMessage();
      this.throwIfProtocolError(message);

      switch (message.context) {
        case PROTOCOL.player:
          await connection.send(PROTOCOL.protocol, {
            client_id: this.settings.clientId,
            no_broadcast: noBroadcast,
            protocol_version: CURRENT_PROTOCOL_VERSION
          });
          break;

        case PROTOCOL.protocol: {
          const version = Number(message.data);
          if (!Number.isFinite(version) || version < MIN_SUPPORTED_PROTOCOL_VERSION) {
            throw new Error(`Unsupported MusicBee Remote protocol version: ${message.data}`);
          }

          if (!noBroadcast) {
            await connection.send(PROTOCOL.init);
          }

          handshakeComplete = true;
          break;
        }

        default:
          break;
      }
    }

    return connection;
  }

  private async createSocket(): Promise<net.Socket> {
    return new Promise<net.Socket>((resolve, reject) => {
      const socket = net.createConnection({
        host: this.settings.host,
        port: this.settings.port
      });

      socket.setNoDelay(true);
      socket.setKeepAlive(true);
      socket.setTimeout(MusicBeeSocketClient.socketTimeoutMs);

      const cleanup = (): void => {
        socket.off("connect", onConnect);
        socket.off("error", onError);
        socket.off("timeout", onTimeout);
      };

      const onConnect = (): void => {
        cleanup();
        resolve(socket);
      };

      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      const onTimeout = (): void => {
        cleanup();
        socket.destroy();
        reject(new Error("Timed out connecting to MusicBee Remote."));
      };

      socket.once("connect", onConnect);
      socket.once("error", onError);
      socket.once("timeout", onTimeout);
    });
  }

  private async readBroadcastLoop(
    connection: SocketConnection,
    onMessage: (message: SocketMessage) => Promise<void> | void,
    onDisconnect: (error?: Error) => void
  ): Promise<void> {
    try {
      while (this.broadcastConnection === connection) {
        const message = await connection.readMessage();
        await onMessage(message);
      }
    } catch (error) {
      if (!this.intentionalDisconnect) {
        onDisconnect(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      if (this.broadcastConnection === connection) {
        this.broadcastConnection = undefined;
      }

      connection.close();
    }
  }

  private throwIfProtocolError(message: SocketMessage): void {
    if (message.context === PROTOCOL.clientNotAllowed) {
      throw new Error("The MusicBee Remote plugin rejected this client.");
    }

    if (message.context === PROTOCOL.commandUnavailable) {
      throw new Error("MusicBee reported that the requested command is unavailable.");
    }

    if (message.context === PROTOCOL.unknownCommand) {
      throw new Error("MusicBee reported an unknown protocol command.");
    }
  }
}
