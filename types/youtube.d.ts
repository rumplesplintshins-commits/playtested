declare global {
  interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getVolume(): number;
    setVolume(volume: number): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    getPlayerState(): number;
    destroy(): void;
  }

  interface YTPlayerEvent {
    target: YTPlayer;
    data?: number;
  }

  interface YTPlayerOptions {
    videoId?: string;
    events?: {
      onReady?: (event: YTPlayerEvent) => void;
      onStateChange?: (event: YTPlayerEvent) => void;
      onError?: (event: YTPlayerEvent) => void;
    };
  }

  var YT: {
    Player: new (element: string | HTMLElement, options?: YTPlayerOptions) => YTPlayer;
    PlayerState: {
      UNSTARTED: -1;
      ENDED: 0;
      PLAYING: 1;
      PAUSED: 2;
      BUFFERING: 3;
      CUED: 5;
    };
  };

  var onYouTubeIframeAPIReady: () => void;

  interface Window {
    YT?: {
      Player: new (element: string | HTMLElement, options?: YTPlayerOptions) => YTPlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
