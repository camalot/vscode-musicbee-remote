export interface SocketMessage<T = unknown> {
  context: string;
  data: T;
}

export interface ProtocolPayload {
  client_id: string;
  no_broadcast: boolean;
  protocol_version: number;
}

export interface PageRange {
  offset: number;
  limit: number;
}

export interface Page<T> {
  total: number;
  offset: number;
  limit: number;
  data: T[];
}

export interface GenreDto {
  genre: string;
  count: number;
}

export interface ArtistDto {
  artist: string;
  count: number;
}

export interface AlbumDto {
  artist: string;
  album: string;
  count: number;
}

export interface TrackDto {
  artist: string;
  title: string;
  src: string;
  trackno: number;
  disc: number;
  album_artist: string;
  album: string;
  genre: string;
  year: string;
}

export interface NowPlayingDto {
  title: string;
  artist: string;
  path: string;
  position: number;
}

export interface PlaylistDto {
  name: string;
  url: string;
}

export interface RadioStationDto {
  name: string;
  url: string;
}

export interface OutputResponse {
  devices: string[];
  active: string;
}

export interface CoverPayload {
  status: number;
  cover: string;
}

export interface PlayerStatus {
  playermute: boolean;
  playerstate: string;
  playerrepeat: string;
  playershuffle: string;
  scrobbler: boolean;
  playervolume: number;
}

export interface NowPlayingTrack {
  artist: string;
  album: string;
  title: string;
  year: string;
  path: string;
}

export interface PositionPayload {
  current: number;
  total: number;
}

export interface NowPlayingDetails {
  albumArtist: string;
  genre: string;
  trackNo: string;
  trackCount: string;
  discNo: string;
  discCount: string;
  grouping: string;
  publisher: string;
  ratingAlbum: string;
  composer: string;
  comment: string;
  encoder: string;
  kind: string;
  format: string;
  size: string;
  channels: string;
  sampleRate: string;
  bitrate: string;
  dateModified: string;
  dateAdded: string;
  lastPlayed: string;
  playCount: string;
  skipCount: string;
  duration: string;
}

export interface ConnectionSettings {
  host: string;
  port: number;
  clientName: string;
  clientId: string;
}

export type BrowseViewId =
  | "nowPlaying"
  | "playlists"
  | "artists"
  | "albums"
  | "tracks"
  | "outputs";

export interface MusicBeeRemoteState {
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  errorMessage?: string;
  settings: Omit<ConnectionSettings, "clientId">;
  activeView: BrowseViewId;
  loadingView?: BrowseViewId;
  lastUpdated?: string;
  nowPlaying: {
    track: Partial<NowPlayingTrack> & {
      coverDataUrl?: string;
    };
    status: {
      mute: boolean;
      repeat: string;
      shuffle: string;
      scrobbling: boolean;
      volume: number;
      playState: string;
    };
    details?: NowPlayingDetails;
    trackRating: string;
    lfmRating: string;
    position: PositionPayload;
    queue: NowPlayingDto[];
  };
  library: {
    playlists: PlaylistDto[];
    artists: ArtistDto[];
    albums: AlbumDto[];
    tracks: TrackDto[];
    outputs: OutputResponse;
  };
}
