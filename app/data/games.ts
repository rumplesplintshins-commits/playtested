
export type AIClassification =
  | "AI-generated"
  | "AI-assisted"
  | "No AI disclosed";

export type GameReview = {
  user: string;
  rating: string;
  tag: string;
  text: string;
};

export type Game = {
  slug: string;
  title: string;
  developer: string;
  genre: string;
  aiType: AIClassification;
  score: number | null;
  price: number | null;
  description: string;
  image: string;
  verdict?: string;
  strengths?: string[];
  weaknesses?: string[];
  reviews?: GameReview[];
};

const originalGames: Game[] = [
  {
    slug: "echoes-of-elsewhere",
    title: "Echoes of Elsewhere",
    developer: "Northstar Studio",
    genre: "Adventure",
    aiType: "AI-generated",
    score: 8.4,
    price: 14.99,
    description: "A surreal world that changes with your decisions.",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=85",
    verdict: "An intriguing concept with room to grow. The big question is whether its reactive world creates meaningful choices or just novelty.",
    strengths: [
      "Reactive world concept",
      "Strong atmosphere",
      "Interesting exploration",
    ],
    weaknesses: [
      "Some repetitive encounters",
      "Long-term variety remains unproven",
    ],
    reviews: [
      {
        user: "PixelNomad",
        rating: "9/10",
        tag: "Gameplay",
        text: "The world feels unpredictable. I want to see how far the developers take the idea.",
      },
      {
        user: "FramePerfect",
        rating: "7/10",
        tag: "Exploration",
        text: "Great atmosphere, but a few encounters feel similar. Lots of potential.",
      },
      {
        user: "IndieScope",
        rating: "8/10",
        tag: "Overall",
        text: "A promising experiment. It needs more polish, but I would keep playing.",
      },
    ],
  },
  {
    slug: "hollow-reach",
    title: "Hollow Reach",
    developer: "Black Lantern",
    genre: "Survival",
    aiType: "No AI disclosed",
    score: 7.8,
    price: 19.99,
    description: "Survive on an abandoned world where nothing stays dead.",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=85",
    verdict: "A tense survival concept with a strong setting. Its lasting appeal depends on exploration and survival variety.",
    strengths: [
      "Atmospheric setting",
      "Tense survival gameplay",
      "Memorable premise",
    ],
    weaknesses: [
      "Pacing can dip",
      "Resource gathering needs balance",
    ],
    reviews: [
      {
        user: "OrbitFox",
        rating: "8/10",
        tag: "Exploration",
        text: "Exploring feels tense, and the setting is excellent. I would like more tools to discover.",
      },
      {
        user: "SavePoint",
        rating: "7/10",
        tag: "Survival",
        text: "Solid survival foundations, though gathering resources gets repetitive.",
      },
    ],
  },
  {
    slug: "neon-protocol",
    title: "Neon Protocol",
    developer: "Circuit Breaker",
    genre: "Action RPG",
    aiType: "AI-assisted",
    score: 7.2,
    price: 24.99,
    description: "Fight through a city ruled by adaptive machines.",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
    verdict: "Adaptive enemies are an interesting idea, but combat quality and quest design need to carry the experience.",
    strengths: [
      "Adaptive enemy concept",
      "Distinct setting",
      "Build experimentation",
    ],
    weaknesses: [
      "Uneven combat balance",
      "Some repetitive quests",
    ],
    reviews: [
      {
        user: "ByteKnight",
        rating: "8/10",
        tag: "Combat",
        text: "Enemies adapting to my approach makes encounters interesting. Balancing needs work.",
      },
      {
        user: "QuestLog",
        rating: "6/10",
        tag: "Story",
        text: "Good atmosphere, but the quests need more variety.",
      },
    ],
  },
  {
    slug: "kingdoms-of-ash",
    title: "Kingdoms of Ash",
    developer: "Ironwood Games",
    genre: "Strategy",
    aiType: "No AI disclosed",
    score: 9.1,
    price: 29.99,
    description: "Rebuild a fallen kingdom and reclaim your empire.",
    image: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=85",
    verdict: "A strategy experience built around long-term planning and meaningful decisions. Conventional games belong here just as much as experimental ones.",
    strengths: [
      "Strategic depth",
      "Replay potential",
      "Meaningful decisions",
    ],
    weaknesses: [
      "Steep learning curve",
      "Long play sessions",
    ],
    reviews: [
      {
        user: "GrandStrategist",
        rating: "10/10",
        tag: "Strategy",
        text: "Lots of interesting decisions. I can see myself replaying campaigns to try different approaches.",
      },
      {
        user: "TurnOne",
        rating: "8/10",
        tag: "Learning curve",
        text: "Deep and rewarding, though the first few hours take patience.",
      },
    ],
  },
  {
    slug: "last-light",
    title: "Last Light",
    developer: "Quiet Signal",
    genre: "Horror",
    aiType: "AI-assisted",
    score: 8.1,
    price: 12.99,
    description: "Something moves whenever the lights go out.",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=85",
  },
  {
    slug: "starfall",
    title: "Starfall",
    developer: "Orbit Foundry",
    genre: "RPG",
    aiType: "AI-generated",
    score: 7.9,
    price: 17.99,
    description: "Explore forgotten systems at the edge of the galaxy.",
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=85",
  },
  {
    slug: "wildwood",
    title: "Wildwood",
    developer: "Fern & Flame",
    genre: "Simulation",
    aiType: "AI-assisted",
    score: 8.6,
    price: 9.99,
    description: "Build a home in a forest full of secrets.",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85",
  },
  {
    slug: "redline-zero",
    title: "Redline Zero",
    developer: "Velocity Lab",
    genre: "Racing",
    aiType: "No AI disclosed",
    score: 7.5,
    price: 15.99,
    description: "High-speed racing through a rain-soaked future.",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
  },
  {
    slug: "deep-blue",
    title: "Deep Blue",
    developer: "Abyss Works",
    genre: "Exploration",
    aiType: "AI-generated",
    score: null,
    price: 0,
    description: "Descend into an ocean no human has mapped.",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=85",
  },
  {
    slug: "emberfall",
    title: "Emberfall",
    developer: "Ashen Studio",
    genre: "Action RPG",
    aiType: "AI-assisted",
    score: 8.0,
    price: 21.99,
    description: "Master elemental powers in a world on the brink.",
    image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=85",
  },
  {
    slug: "tiny-galaxy",
    title: "Tiny Galaxy",
    developer: "Little Comet",
    genre: "Puzzle",
    aiType: "No AI disclosed",
    score: 8.7,
    price: 4.99,
    description: "Solve cosmic puzzles in miniature worlds.",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=85",
  },
  {
    slug: "grave-meridian",
    title: "Grave Meridian",
    developer: "Night Archive",
    genre: "Horror",
    aiType: "AI-generated",
    score: 7.7,
    price: 11.99,
    description: "Uncover the truth buried beneath a forgotten town.",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=85",
  },
];


const additionalDemoRows: Array<[
  string, string, string, string, AIClassification,
  number | null, number | null, string
]> = [
  ["ashen-crown", "Ashen Crown", "Morrow Forge", "Action RPG", "No AI disclosed", 8.2, 19.99, "Fight through a shattered kingdom where every alliance has a cost."],
  ["moonlit-vale", "Moonlit Vale", "Cloverfield Studio", "Adventure", "AI-assisted", 8.5, 12.99, "Explore a quiet valley filled with ancient ruins and strange wildlife."],
  ["void-harvest", "Void Harvest", "Black Orbit Games", "Survival", "AI-generated", 7.6, 14.99, "Gather resources and survive on a hostile planet at the edge of known space."],
  ["iron-tactician", "Iron Tactician", "Redoubt Interactive", "Strategy", "No AI disclosed", 8.8, 24.99, "Command armies, manage supply lines and outmanoeuvre rival generals."],
  ["little-lantern", "Little Lantern", "Mosslight Games", "Puzzle", "AI-assisted", 8.1, 4.99, "Solve environmental puzzles in a hand-crafted world of light and shadow."],
  ["neon-drift", "Neon Drift", "Velocity Arc", "Racing", "No AI disclosed", 7.9, 9.99, "Race through glowing city streets and master demanding time trials."],
  ["below-the-static", "Below the Static", "Signal Lost Studio", "Horror", "AI-generated", 8.3, 11.99, "Investigate an abandoned broadcast station where the transmissions never stop."],
  ["harbour-days", "Harbour Days", "Saltwind Games", "Simulation", "No AI disclosed", 8.0, 7.99, "Restore a neglected seaside town, meet its residents and rebuild the harbour."],
  ["starbound-cartographer", "Starbound Cartographer", "Far Horizon Studio", "Exploration", "AI-assisted", 8.4, 14.99, "Chart unexplored systems and piece together the history of a vanished civilisation."],
  ["crypt-delver", "Crypt Delver", "Grim Pickaxe", "Roguelike", "No AI disclosed", 8.1, 8.99, "Descend into shifting crypts and build a new character every run."],
  ["paper-kingdom", "Paper Kingdom", "Folded Fox", "Puzzle", "AI-assisted", 8.6, 5.99, "Manipulate a folding paper world to reveal paths through impossible landscapes."],
  ["frostline-outpost", "Frostline Outpost", "Northglass Interactive", "Survival", "No AI disclosed", 7.8, 17.99, "Keep a remote research outpost alive through brutal polar winters."],
  ["spellcraft-academy", "Spellcraft Academy", "Blue Ember Studio", "RPG", "AI-assisted", 8.0, 19.99, "Study unusual magic, form friendships and uncover secrets beneath your school."],
  ["last-train-home", "Last Train Home", "Platform Nine Games", "Adventure", "AI-generated", 7.7, 6.99, "Travel through forgotten stations in a story about memory and belonging."],
  ["mech-frontier", "Mech Frontier", "Titan Circuit", "Action", "No AI disclosed", 8.2, 22.99, "Customise a combat mech and defend frontier settlements from hostile machines."],
  ["garden-of-embers", "Garden of Embers", "Fernlight Studio", "Simulation", "AI-assisted", 8.7, 9.99, "Grow a magical garden in the ruins of a long-abandoned city."],
  ["blackwater-case", "Blackwater Case", "Cold Case Collective", "Detective", "No AI disclosed", 8.3, 12.99, "Examine evidence and question witnesses in a small-town mystery."],
  ["pixel-pitstop", "Pixel Pitstop", "Eight Bit Garage", "Racing", "AI-assisted", 7.5, 3.99, "Build a racing garage, tune compact cars and compete in arcade championships."],
  ["dragonfall-chronicles", "Dragonfall Chronicles", "Cinderpeak Games", "RPG", "No AI disclosed", 8.9, 29.99, "Gather companions and challenge ancient dragons across a fractured continent."],
  ["deep-space-salvage", "Deep Space Salvage", "Vacuum Works", "Simulation", "AI-generated", 7.9, 11.99, "Recover valuable wreckage while keeping your ageing salvage ship operational."],
  ["whispering-pines", "Whispering Pines", "Hearthwood Studio", "Horror", "AI-assisted", 8.0, 9.99, "Explore woodland trails where the same path never seems to lead home."],
  ["kingdoms-in-miniature", "Kingdoms in Miniature", "Pocket Realm Games", "Strategy", "No AI disclosed", 8.5, 14.99, "Build a tiny kingdom, balance its resources and defend its borders."],
  ["comet-courier", "Comet Courier", "Little Comet Works", "Arcade", "AI-assisted", 7.8, 2.99, "Deliver packages between planets in increasingly chaotic flying challenges."],
  ["the-sunken-library", "The Sunken Library", "Blue Depth Studio", "Adventure", "AI-generated", 8.4, 13.99, "Search an underwater archive for books that should not exist."],
  ["wildtrack-rally", "Wildtrack Rally", "Dustline Interactive", "Racing", "No AI disclosed", 8.1, 18.99, "Drive rough rally stages across forests, deserts and mountain passes."],
  ["clockwork-orchard", "Clockwork Orchard", "Brass Apple Games", "Puzzle", "AI-assisted", 8.2, 6.99, "Repair mechanical trees and restore a peculiar automated orchard."],
  ["red-moon-protocol", "Red Moon Protocol", "Lunar Signal", "Action RPG", "AI-generated", 7.6, 16.99, "Investigate a lunar colony after its security network turns against its crew."],
  ["village-after-rain", "Village After Rain", "Softstone Studio", "Simulation", "No AI disclosed", 8.8, 12.99, "Restore cottages, help villagers and bring a rain-soaked valley back to life."],
  ["tomb-of-the-sun", "Tomb of the Sun", "Relic Lantern", "Action", "No AI disclosed", 8.0, 10.99, "Explore ancient tombs packed with traps, relics and dangerous guardians."],
  ["orbital-foundry", "Orbital Foundry", "Stellar Assembly", "Strategy", "AI-assisted", 8.3, 21.99, "Construct factories in orbit and connect a growing interplanetary supply chain."],
  ["midnight-motors", "Midnight Motors", "Afterhours Studio", "Racing", "No AI disclosed", 7.7, 7.99, "Build a street racing crew and compete in nocturnal city events."],
  ["moss-and-moonlight", "Moss and Moonlight", "Thimble Games", "Adventure", "AI-assisted", 8.6, 8.99, "Help forest spirits repair a woodland disturbed by an ancient storm."],
  ["last-stand-at-ember", "Last Stand at Ember", "Siege Engine Studio", "Strategy", "No AI disclosed", 8.1, 15.99, "Defend a frontier fortress through escalating waves of enemy attacks."],
  ["glacier-run", "Glacier Run", "Whiteout Works", "Survival", "AI-generated", 7.4, 5.99, "Navigate crevasses and blizzards while searching for a missing expedition."],
  ["dreams-of-copper", "Dreams of Copper", "Copper Kite", "Puzzle", "AI-assisted", 8.5, 9.99, "Rearrange dreamlike machines to uncover a family's forgotten history."],
  ["rogue-signal", "Rogue Signal", "Dead Air Games", "Roguelike", "No AI disclosed", 8.2, 11.99, "Fight through a hostile signal network that rebuilds itself after every run."],
  ["meadowbrook-market", "Meadowbrook Market", "Daisy Chain Studio", "Simulation", "AI-assisted", 8.0, 6.99, "Run a small village market and discover what your neighbours need."],
  ["starforge-legends", "Starforge Legends", "Nova Anvil", "RPG", "AI-generated", 8.4, 23.99, "Craft unusual weapons and explore the ruins of a stellar empire."],
  ["haunted-switchboard", "Haunted Switchboard", "Dead Line Studio", "Horror", "No AI disclosed", 7.9, 8.99, "Answer late-night calls and decide which voices deserve your help."],
  ["tidal-engineers", "Tidal Engineers", "Breakwater Interactive", "Simulation", "AI-assisted", 8.3, 17.99, "Design coastal defences and manage a city threatened by rising seas."],
  ["sandstone-saga", "Sandstone Saga", "Dune Lantern", "Adventure", "No AI disclosed", 7.8, 12.99, "Cross a vast desert to reconnect isolated settlements."],
  ["circuit-sorcerer", "Circuit Sorcerer", "Voltage Wizard", "Action", "AI-generated", 8.1, 9.99, "Combine programmable spells to overcome increasingly complex arenas."],
  ["tiny-tavern-tales", "Tiny Tavern Tales", "Mug and Mantle", "Simulation", "No AI disclosed", 8.7, 7.99, "Serve travellers, hear their stories and turn a rundown tavern into a home."],
  ["black-ice-expedition", "Black Ice Expedition", "Polar Frame", "Survival", "AI-assisted", 7.6, 13.99, "Lead a small expedition across frozen terrain with dwindling supplies."],
  ["emberglass", "Emberglass", "Sable Torch Games", "Action RPG", "No AI disclosed", 8.5, 18.99, "Master glass-forged weapons in a land scarred by volcanic eruptions."],
  ["the-last-greenhouse", "The Last Greenhouse", "Verdant Signal", "Simulation", "AI-generated", 8.2, 4.99, "Keep the final botanical research station alive on a dying world."],
  ["castle-of-mirrors", "Castle of Mirrors", "Silver Stair Studio", "Puzzle", "AI-assisted", 8.4, 10.99, "Solve perspective puzzles in a castle where reflections change reality."],
  ["iron-coast-command", "Iron Coast Command", "Harbourline Games", "Strategy", "No AI disclosed", 8.0, 19.99, "Coordinate naval patrols and protect a contested coastline."],
  ["neon-nightshift", "Neon Nightshift", "Afterglow Interactive", "Arcade", "AI-generated", 7.7, 3.99, "Manage a futuristic service station during the strangest shift of your life."],
  ["wild-island-atlas", "Wild Island Atlas", "Compass Fox", "Exploration", "No AI disclosed", 8.6, 14.99, "Map remote islands and document the creatures that inhabit them."],
  ["bone-and-briar", "Bone and Briar", "Thornkeep Studio", "Roguelike", "AI-assisted", 8.0, 9.99, "Descend into overgrown ruins and discover a different path on every attempt."],
  ["city-of-small-things", "City of Small Things", "Pocket Window", "Simulation", "No AI disclosed", 8.5, 11.99, "Shape a compact city block through the choices of its residents."],
  ["eclipse-outpost", "Eclipse Outpost", "Darkside Foundry", "Survival", "AI-generated", 7.8, 16.99, "Maintain a remote outpost through long periods without sunlight."],
  ["fable-of-the-fallen-star", "Fable of the Fallen Star", "Story Lantern", "RPG", "AI-assisted", 8.7, 20.99, "Follow branching stories across a kingdom touched by a fallen star."],
  ["driftwood-detective", "Driftwood Detective", "Shoreline Stories", "Detective", "No AI disclosed", 8.1, 8.99, "Solve coastal mysteries by studying clues left behind by the tide."],
  ["machine-garden", "Machine Garden", "Gearleaf Studio", "Puzzle", "AI-generated", 7.9, 6.99, "Build a working garden from gears, pipes and eccentric mechanical plants."],
  ["frontier-of-ash", "Frontier of Ash", "Cinder Road Games", "Strategy", "No AI disclosed", 8.3, 22.99, "Expand settlements across a volcanic frontier and negotiate scarce resources."],
  ["underpass-13", "Underpass 13", "Concrete Ghost", "Horror", "AI-assisted", 7.8, 7.99, "Find your way through a transit network that appears after midnight."],
  ["planetary-post", "Planetary Post", "Orbit Parcel", "Simulation", "No AI disclosed", 8.2, 5.99, "Build a delivery network between small settlements across the solar system."],
  ["sapphire-depths", "Sapphire Depths", "Blue Current Games", "Exploration", "AI-generated", 8.0, 12.99, "Dive into underwater caverns and uncover a lost civilisation."],
  ["spellbound-railway", "Spellbound Railway", "Copper Ticket Studio", "Adventure", "AI-assisted", 8.5, 15.99, "Operate a magical railway connecting towns that move between worlds."],
  ["pixel-farm-rush", "Pixel Farm Rush", "Turnip Byte", "Arcade", "No AI disclosed", 7.6, 2.99, "Harvest crops and deliver orders before the clock runs out."],
  ["war-room-omega", "War Room Omega", "Vector Command", "Strategy", "AI-generated", 8.1, 18.99, "Plan operations across a changing tactical battlefield."],
  ["lost-in-the-canopy", "Lost in the Canopy", "Green Horizon Studio", "Survival", "AI-assisted", 8.4, 13.99, "Find your way through a dense rainforest filled with hidden paths."],
  ["starlight-apothecary", "Starlight Apothecary", "Moonjar Games", "Simulation", "No AI disclosed", 8.8, 9.99, "Collect unusual ingredients and prepare remedies for otherworldly visitors."],
  ["the-hollow-observatory", "The Hollow Observatory", "Nightglass Studio", "Horror", "AI-generated", 7.7, 10.99, "Investigate a deserted observatory whose telescope points somewhere impossible."],
  ["rune-and-rivet", "Rune and Rivet", "Forgeleaf Interactive", "Action RPG", "No AI disclosed", 8.2, 17.99, "Combine runic magic and mechanical tools to overcome dangerous ruins."],
  ["cloudline-architect", "Cloudline Architect", "Highrise Bird", "Simulation", "AI-assisted", 8.3, 14.99, "Design settlements on floating islands connected by bridges and lifts."],
  ["midwinter-mystery", "Midwinter Mystery", "Snowbound Stories", "Detective", "No AI disclosed", 8.5, 9.99, "Investigate a locked-room mystery in a remote mountain hotel."],
  ["crater-crawlers", "Crater Crawlers", "Dust Mite Games", "Roguelike", "AI-generated", 7.9, 7.99, "Explore unstable lunar craters and assemble a build from salvaged equipment."],
  ["quiet-corners", "Quiet Corners", "Window Seat Studio", "Puzzle", "AI-assisted", 8.6, 4.99, "Solve gentle spatial puzzles in miniature, carefully crafted rooms."],
  ["kingmaker-of-the-march", "Kingmaker of the March", "Banner and Bell", "Strategy", "No AI disclosed", 8.7, 26.99, "Balance noble rivalries, military campaigns and a fragile royal succession."],
  ["coral-keeper", "Coral Keeper", "Reeflight Studio", "Simulation", "AI-generated", 8.0, 6.99, "Restore a damaged reef and encourage marine life to return."],
  ["night-drive-88", "Night Drive 88", "Cassette Road", "Racing", "No AI disclosed", 8.1, 8.99, "Race along retro highways with changing weather and synth-inspired scenery."],
  ["the-broken-compass", "The Broken Compass", "Northbound Tales", "Adventure", "AI-assisted", 8.4, 13.99, "Follow an unreliable compass through a land missing from every map."],
  ["factory-of-fables", "Factory of Fables", "Storyworks Foundry", "Simulation", "No AI disclosed", 8.2, 16.99, "Automate a workshop that manufactures objects from forgotten fairy tales."],
  ["graveyard-shift-manager", "Graveyard Shift Manager", "Moonbeam Works", "Simulation", "AI-generated", 7.8, 5.99, "Manage a cemetery at night and keep its unusual residents in order."],
  ["thunderhead-tactics", "Thunderhead Tactics", "Stormboard Games", "Strategy", "No AI disclosed", 8.3, 12.99, "Use terrain, weather and unit positioning to win compact tactical battles."],
  ["the-glass-frontier", "The Glass Frontier", "Mirage Peak", "RPG", "AI-assisted", 8.1, 18.99, "Explore crystalline wastelands and decide who controls their rare resources."],
  ["little-witch-workshop", "Little Witch Workshop", "Acorn Cauldron", "Simulation", "No AI disclosed", 8.7, 8.99, "Craft potions, fulfil village requests and improve a cosy woodland workshop."],
  ["abyssal-frequency", "Abyssal Frequency", "Low Tide Audio", "Horror", "AI-generated", 8.2, 10.99, "Track an unexplained underwater signal through a failing research station."],
  ["skybridge-express", "Skybridge Express", "Cloudrail Studio", "Strategy", "AI-assisted", 8.0, 11.99, "Plan routes and keep a growing network of airborne trains running."],
  ["last-orchard-standing", "Last Orchard Standing", "Applewood Games", "Survival", "No AI disclosed", 8.4, 9.99, "Protect a remote orchard against unpredictable seasons and hungry wildlife."],
  ["echo-circuit", "Echo Circuit", "Pulseframe Studio", "Roguelike", "AI-assisted", 8.1, 8.99, "Race through a shifting electronic maze and adapt your upgrades each run."],
  ["lanterns-of-the-deep", "Lanterns of the Deep", "Tidepool Tales", "Adventure", "No AI disclosed", 8.5, 12.99, "Guide a tiny submersible through caves lit by strange bioluminescent life."],
  ["scrapstar-arena", "Scrapstar Arena", "Junkyard Rocket", "Action", "AI-generated", 7.9, 4.99, "Build improvised machines and compete in chaotic arena challenges."],
  ["evergreen-post", "Evergreen Post", "Pinecone Studio", "Simulation", "AI-assisted", 8.6, 7.99, "Deliver letters through a mountain village and reconnect its scattered residents."],
  ["siege-of-the-salt-king", "Siege of the Salt King", "Grey Banner Games", "Strategy", "No AI disclosed", 8.2, 19.99, "Lead a besieging army through a campaign of difficult strategic choices."],
  ["orbiting-home", "Orbiting Home", "Small World Signal", "Exploration", "AI-generated", 8.3, 9.99, "Restore a drifting habitat and discover why its original crew disappeared."],
  ["moonstone-mercantile", "Moonstone Mercantile", "Silver Till Studio", "Simulation", "No AI disclosed", 8.5, 6.99, "Trade rare goods between villages and grow a travelling merchant business."],
  ["the-clocktower-below", "The Clocktower Below", "Pendulum House", "Puzzle", "AI-assisted", 8.4, 11.99, "Descend beneath a clocktower and solve mechanisms that bend time."],
  ["wildfire-watch", "Wildfire Watch", "Red Pine Interactive", "Simulation", "No AI disclosed", 8.0, 14.99, "Monitor a remote forest, respond to emergencies and protect nearby communities."],
  ["starship-scrappers", "Starship Scrappers", "Broken Hull Games", "Roguelike", "AI-generated", 7.8, 7.99, "Salvage ship components and improvise a build between dangerous encounters."],
  ["marshlight-mysteries", "Marshlight Mysteries", "Reed and Raven", "Detective", "AI-assisted", 8.3, 9.99, "Follow a trail of clues through a misty wetland community."],
  ["ember-island", "Ember Island", "Volcanic Finch", "Survival", "No AI disclosed", 8.1, 12.99, "Build shelter and explore an island shaped by an active volcano."],
  ["the-gilded-menagerie", "The Gilded Menagerie", "Velvet Paw Studio", "Simulation", "AI-generated", 8.2, 10.99, "Care for unusual creatures and redesign the habitats where they live."],
  ["crossroads-of-iron", "Crossroads of Iron", "Marchland Studio", "Strategy", "No AI disclosed", 8.4, 17.99, "Control vital trade routes and negotiate with rival frontier powers."],
  ["dreamcatcher-station", "Dreamcatcher Station", "Soft Static Games", "Adventure", "AI-assisted", 8.5, 8.99, "Explore a railway station where passengers arrive from different dreams."],
  ["tiny-titan-forge", "Tiny Titan Forge", "Pocket Anvil", "Action RPG", "No AI disclosed", 8.1, 6.99, "Craft equipment and challenge oversized bosses in compact arenas."],
  ["blue-hour-boulevard", "Blue Hour Boulevard", "Last Light Interactive", "Racing", "AI-generated", 7.8, 9.99, "Drive through atmospheric city routes at dusk and master precision corners."]
];

const demoArtwork = [
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=85",
];

const additionalDemoGames: Game[] = additionalDemoRows.map(
  ([slug, title, developer, genre, aiType, score, price, description], index) => ({
    slug,
    title,
    developer,
    genre,
    aiType,
    score,
    price,
    description: `DEMO LISTING: ${description}`,
    image: demoArtwork[index % demoArtwork.length],
  })
);

export const games: Game[] = [...originalGames, ...additionalDemoGames];