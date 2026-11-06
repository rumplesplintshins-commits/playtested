"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CONTROLS_HIDE_DELAY_MS = 3000;
const SEEK_INCREMENT_SECONDS = 5;

type PlayerStatus = "idle" | "loading" | "ready" | "error";

interface GameplayVideoPlayerProps {
  videoId: string;
  onReady?: () => void;
  onError?: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// YouTube player state constants (matching the YT.PlayerState enum).
const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

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

export default function GameplayVideoPlayer({
  videoId,
  onReady,
  onError,
}: GameplayVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const apiScriptRef = useRef<HTMLScriptElement | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const [phase, setPhase] = useState<PlayerStatus>("idle");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const stopInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    stopInactivityTimer();
    if (!isPlaying) return;
    inactivityTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY_MS);
  }, [isPlaying, stopInactivityTimer]);

  const resetControls = useCallback(() => {
    if (!mountedRef.current) return;
    setControlsVisible(true);
    if (isPlaying) {
      startInactivityTimer();
    }
  }, [isPlaying, startInactivityTimer]);

  const hideControls = useCallback(() => {
    stopInactivityTimer();
    if (mountedRef.current) setControlsVisible(false);
  }, [stopInactivityTimer]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const currentState = player.getPlayerState();
    if (currentState === PLAYER_STATE.PLAYING || currentState === PLAYER_STATE.BUFFERING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, []);

  const seekTo = useCallback(
    (fraction: number) => {
      const player = playerRef.current;
      if (!player || duration <= 0) return;
      const targetTime = Math.max(0, Math.min(duration, fraction * duration));
      player.seekTo(targetTime, true);
      if (mountedRef.current) {
        setCurrentTime(targetTime);
        setIsSeeking(true);
      }
      setTimeout(() => {
        if (mountedRef.current) setIsSeeking(false);
      }, 500);
      resetControls();
    },
    [duration, resetControls]
  );

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
      if (mountedRef.current) {
        setIsMuted(false);
        setVolume(100);
      }
    } else {
      player.mute();
      if (mountedRef.current) {
        setIsMuted(true);
        setVolume(0);
      }
    }
    resetControls();
  }, [resetControls]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
      webkitFullscreenElement?: Element | null;
      exitFullscreen?: () => Promise<void>;
      fullscreenElement?: Element | null;
    };
    const requestFullscreen =
      el.requestFullscreen || el.webkitRequestFullscreen;
    const exitFullscreen =
      doc.exitFullscreen || doc.webkitExitFullscreen;
    const isFullscreen = !!(
      doc.fullscreenElement || doc.webkitFullscreenElement
    );

    if (isFullscreen) {
      exitFullscreen?.call(doc);
    } else {
      requestFullscreen?.call(container).catch((error: unknown) => {
        // Fullscreen may be blocked by browser policy or iframe permissions.
        console.warn("Unable to enter fullscreen:", error);
      });
    }
  }, []);

  // Create the YT.Player instance once both the iframe and API are ready.
  const createPlayer = useCallback(() => {
    const iframe = iframeRef.current;
    const YT = window.YT;
    if (!iframe || playerRef.current || !YT || !apiReady) return;
    playerRef.current = new YT.Player(iframe, {
      events: {
        onReady: (event: YTPlayerEvent) => {
          if (!mountedRef.current) return;
          setPhase("ready");
          try {
            const vol = event.target.getVolume();
            setVolume(vol);
            setIsMuted(vol === 0);
            const dur = event.target.getDuration();
            setDuration(dur);
          } catch {
            // Player not fully ready yet
          }
          // Do NOT set isPlaying here — derive from player-state events.
          resetControls();
          onReady?.();
        },
        onStateChange: (event: YTPlayerEvent) => {
          if (!mountedRef.current) return;
          switch (event.data) {
            case PLAYER_STATE.PLAYING:
              setIsPlaying(true);
              resetControls();
              break;
            case PLAYER_STATE.PAUSED:
              setIsPlaying(false);
              setControlsVisible(true);
              stopInactivityTimer();
              break;
            case PLAYER_STATE.ENDED:
              setIsPlaying(false);
              setControlsVisible(true);
              stopInactivityTimer();
              break;
            case PLAYER_STATE.BUFFERING:
              resetControls();
              break;
          }
        },
        onError: () => {
          if (!mountedRef.current) return;
          setPhase("error");
          onError?.();
        },
      },
    });
  }, [apiReady, onReady, onError, resetControls, stopInactivityTimer]);

  // Update current time while playing
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (player && isPlaying && !isSeeking && mountedRef.current) {
        try {
          setCurrentTime(player.getCurrentTime());
        } catch {
          // Player might not be ready yet
        }
      }
    }, 1000);
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, [isPlaying, isSeeking]);

  // Load YouTube IFrame API script when component mounts
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src*="youtube.com/iframe_api"]'
    );
    if (existingScript) {
      if (window.YT) {
        queueMicrotask(() => {
          if (mountedRef.current) setApiReady(true);
        });
      }
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    apiScriptRef.current = tag;

    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

    return () => {
      apiScriptRef.current = null;
    };
  }, []);

  // Global YouTube API ready callback — registry pattern to support
  // repeated openings and multiple player instances without callback races.
  useEffect(() => {
    const handleApiReady = () => {
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        setApiReady(true);
        if (iframeRef.current && !playerRef.current && window.YT) {
          createPlayer();
        }
      });
    };

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      handleApiReady();
    };

    return () => {
      // Restore the previous callback only if we still own the slot.
      if (window.onYouTubeIframeAPIReady === handleApiReady) {
        window.onYouTubeIframeAPIReady = previousReady;
      } else {
        // A later instance took over; leave it in place.
        window.onYouTubeIframeAPIReady = previousReady;
      }
    };
  }, [createPlayer]);

  // Create player when iframe loads and API is ready
  useEffect(() => {
    if (apiReady && !playerRef.current && window.YT && iframeRef.current) {
      createPlayer();
    }
  }, [apiReady, createPlayer]);

  // Mouse move on document - reset inactivity timer when over player
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (container.contains(e.target as Node)) {
        resetControls();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [resetControls]);

  // Outside click - hide controls
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(e.target as Node)) {
        hideControls();
      }
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [hideControls]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const isWithinPlayer =
        container.contains(e.target as Node) ||
        document.activeElement?.closest("[data-video-player]");
      if (!isWithinPlayer) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "ArrowLeft":
          e.preventDefault();
          const player = playerRef.current;
          if (player) {
            player.seekTo(player.getCurrentTime() - SEEK_INCREMENT_SECONDS, true);
          }
          resetControls();
          break;
        case "ArrowRight":
          e.preventDefault();
          const player2 = playerRef.current;
          if (player2) {
            player2.seekTo(player2.getCurrentTime() + SEEK_INCREMENT_SECONDS, true);
          }
          resetControls();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlay, toggleMute, toggleFullscreen, resetControls]);

  // Touch handler for mobile
  useEffect(() => {
    const handleTouch = () => {
      resetControls();
    };

    const container = containerRef.current;
    container?.addEventListener("touchstart", handleTouch, { passive: true });
    return () => {
      container?.removeEventListener("touchstart", handleTouch);
    };
  }, [resetControls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopInactivityTimer();
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
      const player = playerRef.current;
      if (player) {
        player.destroy();
        playerRef.current = null;
      }
    };
  }, [stopInactivityTimer]);

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&controls=0&playsinline=1`;

  return (
    <div
      ref={containerRef}
      data-video-player
      className={`relative aspect-video w-full overflow-hidden rounded-xl border border-emerald-300/15 bg-[#0c120f] group ${isPlaying ? "cursor-default" : ""}`}
      onMouseEnter={resetControls}
      onMouseLeave={() => {
        if (isPlaying) startInactivityTimer();
      }}
      onTouchStart={resetControls}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title="YouTube gameplay footage"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        onLoad={() => {
          if (phase === "idle") setPhase("loading");
        }}
        onError={() => setPhase("error")}
      />

      {/* Custom controls overlay — pointer-events-none so it does not
          intercept iframe interactions; interactive controls re-enable it. */}
      {phase === "ready" && controlsVisible && (
        <div
          data-video-controls
          className="absolute inset-0 flex items-end justify-between p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white transition-opacity duration-300 pointer-events-none"
        >
          <div className="flex items-center gap-3 w-full max-w-lg mx-auto pointer-events-auto">
            <button
              type="button"
              aria-label={isPlaying ? "Pause video" : "Play video"}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            {duration > 0 && (
              <div className="flex-1 h-1 bg-white/30 mt-1.5">
                <input
                  type="range"
                  min="0"
                  max={Math.round(duration)}
                  value={isSeeking ? currentTime : Math.round(currentTime)}
                  onChange={(e) => {
                    const val = Number((e.target as HTMLInputElement).value);
                    seekTo(val / Math.max(duration, 1));
                  }}
                  onInput={(e) => {
                    const val = Number((e.target as HTMLInputElement).value);
                    setCurrentTime(val);
                    setIsSeeking(true);
                  }}
                  onBlur={() => setIsSeeking(false)}
                  className="w-full h-1 bg-white/40 rounded-lg appearance-none cursor-pointer accent-white"
                  aria-label="Seek timeline"
                />
              </div>
            )}

            <span className="text-xs font-mono text-white/90 whitespace-nowrap shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              type="button"
              aria-label={isMuted ? "Unmute" : "Mute"}
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              {isMuted || volume === 0 ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v-2.21c2.89.86 5 3.54 5 6.74s-2.11 5.88-5 6.74v-2.21c-2.49-.74-3.99-2.26-3.99-4.46 0-2.2 1.5-3.92 3.99-4.46zM3.79 4.19c-.32-.32-.77-.33-1.09-.05l-1.3 1.3c-.3.3-.32.77-.05 1.09v15.22c0 .32.28.81.72 1.09l1.3-1.3c.3-.3.32-.77.05-1.09l-1.06-1.06v-13z" />
                  <path d="M5.12 10c-.27-.27-.4-.63-.4-1 0-.37.13-.73.4-1 .54-.54 1.4-.54 2 0 .27.27.4.63.4 1 0 .37-.13.73-.4 1-.54.54-1.41.54-2 0zm11.76 0c-.27-.27-.4-.63-.4-1 0-.37.13-.73.4-1 .54-.54 1.4-.54 2 0 .27.27.4.63.4 1 0 .37-.13.73-.4 1-.54.54-1.41.54-2 0z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v-2.21c2.89.86 5 3.54 5 6.74s-2.11 5.88-5 6.74v-2.21c-2.49-.74-3.99-2.26-3.99-4.46 0-2.2 1.5-3.92 3.99-4.46zM12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-4.97-4.03-9-9-9z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              aria-label="Enter fullscreen"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M7,14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12.7-1.5L19.5,12.7C19.9,12.3 19.9,11.7 19.5,11.3l-7.1-7.1c-0.8-0.8-2-0.8-2.8,0s-0.8,2 0,2.8l6.4,6.4c0.8,0.8 2,0.8 2.8,0c0.8-0.8 0.8-2 0-2.8zM5.3,5.3l7.1,7.1c-0.8,0.8-0.8,2 0,2.8l-6.4,6.4c-0.4,0.4-0.8,0.6-1.2,0.6s-0.8-0.2-1.2-0.6l-7.1-7.1c-0.8-0.8-0.8-2 0-2.8s2-0.8 2.8,0l6.4,6.4c0.4,0.4 0.8,0.6 1.2,0.6s0.8-0.2 1.2-0.6z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error state overlay */}
      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center bg-black/60">
          <p role="alert" className="text-sm font-semibold text-amber-200">
            Video unavailable
          </p>
        </div>
      )}
    </div>
  );
}
