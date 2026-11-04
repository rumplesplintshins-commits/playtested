export type GameplayVideo = { provider: "YouTube" | "Vimeo" | "Google Drive"; url: string; embed: string | null };
export function gameplayVideo(value: string): GameplayVideo | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(?:shorts|embed)\/([\w-]+)$/.exec(url.pathname)?.[1];
      if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
      return { provider: "YouTube", url: `https://www.youtube.com/watch?v=${id}`, embed: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === "vimeo.com") {
      const id = /^\/([0-9]{1,12})\/?$/.exec(url.pathname)?.[1];
      if (id) return { provider: "Vimeo", url: `https://vimeo.com/${id}`, embed: `https://player.vimeo.com/video/${id}?dnt=1` };
    }
    if (host === "drive.google.com") {
      const id = /^\/file\/d\/([a-zA-Z0-9_-]{10,150})(?:\/(?:view|preview))?\/?$/.exec(url.pathname)?.[1];
      if (id) return { provider: "Google Drive", url: `https://drive.google.com/file/d/${id}/view`, embed: null };
    }
  } catch { /* Invalid links cannot become embeds. */ }
  return null;
}
export const gameplayGuidance = "Optional: representative gameplay, around 30 seconds to 5 minutes. No professional editing or commentary needed. Use an HTTPS YouTube watch/share/shorts link, public Vimeo video link, or Google Drive file-sharing link. Drive files must be shared with viewers; Playtested cannot change access permissions. No video uploads.";
