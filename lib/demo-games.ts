export const DEMO_GAMES = [
  {
    slug: "neon-courier", title: "Neon Courier", genre: "Action", restricted: true,
    id: "d3100000-0000-4000-8000-000000000001", campaignId: "d3100000-0000-4000-8000-000000000101",
    color: "#67e8f9", background: "#082f49", symbol: "◈",
    description: "A tiny neon delivery challenge. Collect eight highlighted parcels while avoiding empty delivery bays.",
    instructions: "Play two short rounds of this demo. Are the highlighted targets clear? Describe one specific interaction that worked and one improvement. Game score does not award tester XP.",
    goal: "Collect 8 highlighted parcels. Click or tap the glowing bay; other bays count as misses.",
  },
  {
    slug: "mosslight-grove", title: "Mosslight Grove", genre: "Adventure", restricted: false,
    id: "d3100000-0000-4000-8000-000000000002", campaignId: "d3100000-0000-4000-8000-000000000102",
    color: "#a3e635", background: "#1a2e05", symbol: "✦",
    description: "Explore a lantern-lit grove and recover three lost lights. The central thicket cannot be crossed.",
    instructions: "Explore the demo and collect its three lights. Are the movement controls and blocked tile understandable? Mention the route you tried and how the instructions could improve.",
    goal: "Find all 3 lights. Move with arrow keys or the on-screen arrows. Walk around the central thicket.",
  },
  {
    slug: "orbit-foundry", title: "Orbit Foundry", genre: "Strategy", restricted: true,
    id: "d3100000-0000-4000-8000-000000000003", campaignId: "d3100000-0000-4000-8000-000000000103",
    color: "#c4b5fd", background: "#2e1065", symbol: "⬡",
    description: "Run a pocket-sized orbital foundry. Balance energy and metal to prepare the station before your eight turns expire.",
    instructions: "Try the resource-management demo. Reach 6 energy and 6 metal within 8 turns. Explain whether the goals and resource choices were clear, and suggest one concrete improvement.",
    goal: "Reach 6 energy AND 6 metal in 8 turns. Each solar or mining order adds 2 of its resource and uses one turn.",
  },
] as const;

export type DemoGame = typeof DEMO_GAMES[number];
export const demoInitialState = { hits: 0, misses: 0, position: 0, lights: [] as number[], moves: 0, energy: 0, metal: 0, turns: 0 };
export type DemoAction = { type: "reset" } | { type: "hit"; tile: number } | { type: "move"; dx: number; dy: number } | { type: "order"; resource: "energy" | "metal" };
export function demoGameReducer(state: typeof demoInitialState, action: DemoAction): typeof demoInitialState {
  if (action.type === "reset") return { ...demoInitialState, lights: [] };
  if (action.type === "hit") {
    if (state.hits >= 8) return state;
    return action.tile === (state.hits * 7 + 4) % 9 ? { ...state, hits: state.hits + 1 } : { ...state, misses: state.misses + 1 };
  }
  if (action.type === "move") {
    if (state.lights.length === 3) return state;
    const x = state.position % 3 + action.dx, y = Math.floor(state.position / 3) + action.dy;
    if (x < 0 || x > 2 || y < 0 || y > 2 || x + y * 3 === 4) return state;
    const position = x + y * 3;
    return { ...state, position, moves: state.moves + 1, lights: [2, 6, 8].includes(position) ? [...new Set([...state.lights, position])] : state.lights };
  }
  if (state.turns >= 8 || (state.energy >= 6 && state.metal >= 6)) return state;
  return { ...state, [action.resource]: state[action.resource] + 2, turns: state.turns + 1 };
}
