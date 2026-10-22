
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
  description: string;
  image: string;
  verdict?: string;
  strengths?: string[];
  weaknesses?: string[];
  reviews?: GameReview[];
};

// Fictional demo listings have been removed.
// The catalogue should now use database-backed Steam listings
// and genuine Playtested developer submissions.
export const games: Game[] = [];
