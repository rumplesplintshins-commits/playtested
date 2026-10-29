// Shared with the database mapping; parity is checked by test-genre-mapping.mjs.
export const GAME_GENRES = [
  "Action", "Action RPG", "Adventure", "Casual", "Horror", "Platformer",
  "RPG", "Racing", "Simulation", "Sports", "Strategy", "Survival", "Other",
] as const;

const aliases: Record<string, string[]> = {
  "action adventure": ["Action", "Adventure"],
  "action-adventure": ["Action", "Adventure"],
  "action-rpg": ["Action RPG"],
  "actionrpg": ["Action RPG"],
  "role playing": ["RPG"],
  "role-playing": ["RPG"],
  "roleplaying": ["RPG"],
  "platform": ["Platformer"],
  "platformers": ["Platformer"],
};

export function gameGenres(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const found = new Set<string>();
  for (const part of value.split(/[,;|/&]+/)) {
    const key = part.trim().toLowerCase().replace(/\s+/g, " ");
    const canonical = GAME_GENRES.find(genre => genre.toLowerCase() === key);
    for (const genre of aliases[key] || (canonical ? [canonical] : [])) found.add(genre);
  }
  // Mixed imported tags retain meaningful genres rather than an extra Other tag.
  const specific = GAME_GENRES.filter(genre => genre !== "Other" && found.has(genre));
  return specific.length ? specific : ["Other"];
}

export function normalizeGenrePreferences(values: readonly string[]): string[] {
  const found = new Set(values.flatMap(gameGenres));
  return GAME_GENRES.filter(genre => found.has(genre));
}

export function matchesGenrePreferences(value: string | null | undefined, preferences: readonly string[]): boolean {
  const wanted = new Set(normalizeGenrePreferences(preferences));
  return gameGenres(value).some(genre => wanted.has(genre));
}
