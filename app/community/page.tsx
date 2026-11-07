import type { Metadata } from "next";
import CommunityFeed from "./CommunityFeed";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = publicMetadata(
  "Playtested Community | Indie Game Discussions",
  "Join Playtested community discussions about indie games, playtesting and player feedback.",
  "/community"
);

export default function CommunityPage() {
  return <CommunityFeed />;
}
