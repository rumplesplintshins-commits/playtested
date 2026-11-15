
import CommunityDiscussion from "./CommunityDiscussion";

export const instant = false;

export default async function CommunityDiscussionPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return <CommunityDiscussion postId={postId} />;
}