import { platformOf } from "./platforms";

export type PlatformCatalogueGame = {
  submission_id: string;
  title: string;
  developer_name: string;
  platform?: string | null;
};

export function testerGamePlatformKey(title: string, developer: string): string {
  return JSON.stringify([title.trim().toLowerCase(), developer.trim().toLowerCase()]);
}

// Some catalogue RPC responses omit platform. Do not erase a previously
// resolved platform when a focus/notification/claim refresh updates games.
export function preserveTesterGamePlatforms<T extends PlatformCatalogueGame>(
  incoming: readonly T[],
  previous: readonly T[],
  knownByName: ReadonlyMap<string, string>,
): T[] {
  const previousByCampaign = new Map(
    previous.map((game) => [game.submission_id, platformOf(game.platform)] as const),
  );
  return incoming.map((game) => ({
    ...game,
    platform: platformOf(game.platform) ??
      knownByName.get(testerGamePlatformKey(game.title, game.developer_name)) ??
      previousByCampaign.get(game.submission_id) ??
      null,
  }));
}
