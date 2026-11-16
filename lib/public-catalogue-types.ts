export type PublicCatalogueRow = {
  source_type: "approved" | "steam";
  game_id: string;
  steam_app_id: string | null;
  title: string;
  developer_name: string;
  genre: string;
  description: string;
  image_url: string;
  game_link: string;
  ai_type: string;
  verification_status: "Verified" | "Assessed" | "Not yet verified";
  quality_score: number | string | null;
  submitted_at: string | null;
  is_nsfw: boolean;
  has_playtested_profile: boolean;
  total_count: number | string;
  platform: string | null;
  community_reception?: {
    accepted_test_count: number | string;
    rated_test_count: number | string;
    average_overall_score: number | string | null;
    recommend_positive_percent: number | string | null;
    continue_positive_percent: number | string | null;
    reception_status: 'Early results' | 'Excellent reception' | 'Positive reception' | 'Mixed reception' | 'Poor reception';
  } | null;
};

export type HomepageCatalogueSeed = {
  rows: PublicCatalogueRow[];
  total: number;
  error: boolean;
};
