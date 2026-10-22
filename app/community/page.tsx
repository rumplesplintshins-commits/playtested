
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import { createClient } from "@/lib/supabase";

type Post = {
  id: number;
  community: string;
  category: string;
  author: string;
  time: string;
  title: string;
  body: string;
  votes: number;
  comments: number;
  tag: string;
};

type DatabasePost = {
  id: number;
  user_id: string | null;
  community: string;
  title: string;
  body: string;
  created_at: string;
};

const initialPosts: Post[] = [
  {
    id: -1,
    community: "general",
    category: "Discussion",
    author: "Playtested",
    time: "Example",
    title: "Welcome to the Playtested community",
    body: "Discuss games, share discoveries and help build a catalogue where players can find games worth their time.",
    votes: 12,
    comments: 3,
    tag: "Community",
  },
  {
    id: -2,
    community: "ai-gaming",
    category: "AI Gaming",
    author: "Playtested",
    time: "Example",
    title: "What should a trustworthy game verification system check?",
    body: "Should verification focus on AI disclosure, gameplay quality, originality, security, or a combination of these?",
    votes: 8,
    comments: 2,
    tag: "Verification",
  },
  {
    id: -3,
    community: "recommendations",
    category: "Recommendations",
    author: "Playtested",
    time: "Example",
    title: "Share an indie game that deserves more attention",
    body: "Tell the community about a game you have enjoyed and explain what makes it worth playing.",
    votes: 6,
    comments: 1,
    tag: "Indie Games",
  },
];

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function CommunityPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Hot");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [votingPostId, setVotingPostId] = useState<number | null>(null);

  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newCommunity, setNewCommunity] = useState("general");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  const loadPosts = useCallback(async () => {
    const supabase = createClient();

    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id ?? null);

      const { data: databasePosts, error: postsError } = await supabase
        .from("community_posts")
        .select("id, user_id, community, title, body, created_at")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const rows = (databasePosts ?? []) as DatabasePost[];

      if (rows.length === 0) {
        setPosts(initialPosts);
        setVotes({});
        return;
      }

      const postIds = rows.map((post) => post.id);
      const authorIds = [
        ...new Set(
          rows
            .map((post) => post.user_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const [commentsResult, profilesResult, votesResult] = await Promise.all([
        supabase
          .from("community_comments")
          .select("post_id")
          .in("post_id", postIds),

        authorIds.length > 0
          ? supabase
              .from("profiles")
              .select("id, display_name")
              .in("id", authorIds)
          : Promise.resolve({ data: [], error: null }),

        supabase
          .from("community_votes")
          .select("post_id, user_id, value")
          .in("post_id", postIds),
      ]);

      if (commentsResult.error) throw commentsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (votesResult.error) throw votesResult.error;

      const commentCounts: Record<number, number> = {};

      for (const comment of commentsResult.data ?? []) {
        commentCounts[comment.post_id] =
          (commentCounts[comment.post_id] ?? 0) + 1;
      }

      const authorNames: Record<string, string> = {};

      for (const profile of profilesResult.data ?? []) {
        authorNames[profile.id] = profile.display_name || "Community member";
      }

      const scores: Record<number, number> = {};
      const currentVotes: Record<number, number> = {};

      for (const vote of votesResult.data ?? []) {
        scores[vote.post_id] =
          (scores[vote.post_id] ?? 0) + Number(vote.value);

        if (user && vote.user_id === user.id) {
          currentVotes[vote.post_id] = Number(vote.value);
        }
      }

      const loadedPosts: Post[] = rows.map((post) => {
        const community = post.community || "general";

        return {
          id: post.id,
          community,
          category:
            community === "ai-gaming"
              ? "AI Gaming"
              : community === "recommendations"
                ? "Recommendations"
                : community === "reviews"
                  ? "Reviews"
                  : "Discussion",
          author: post.user_id
            ? authorNames[post.user_id] || "Community member"
            : "Community member",
          time: formatTime(post.created_at),
          title: post.title,
          body: post.body,
          votes: scores[post.id] ?? 0,
          comments: commentCounts[post.id] ?? 0,
          tag: community.replace(/-/g, " "),
        };
      });

      setPosts(loadedPosts);
      setVotes(currentVotes);
    } catch (err) {
      console.error("Error loading community posts:", err);
      setError("Couldn't load the community feed. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function castVote(postId: number, direction: number) {
    if (postId < 0) return;

    if (!userId) {
      router.push("/login");
      return;
    }

    if (votingPostId !== null) return;

    setVotingPostId(postId);

    const supabase = createClient();
    const existingVote = votes[postId] ?? 0;

    try {
      setError("");

      if (existingVote === direction) {
        const { error: deleteError } = await supabase
          .from("community_votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (deleteError) throw deleteError;
      } else if (existingVote !== 0) {
        const { error: updateError } = await supabase
          .from("community_votes")
          .update({ value: direction })
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("community_votes")
          .insert({
            post_id: postId,
            user_id: userId,
            value: direction,
          });

        if (insertError) throw insertError;
      }

      await loadPosts();
    } catch (err) {
      console.error("Error saving vote:", err);
      setError("Your vote couldn't be saved. Please try again.");
    } finally {
      setVotingPostId(null);
    }
  }

  async function createPost() {
    const title = newTitle.trim();
    const body = newBody.trim();

    if (!title || !body || creatingPost) return;

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setCreatingPost(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          community: newCommunity,
          title,
          body,
        });

      if (insertError) throw insertError;

      setNewTitle("");
      setNewBody("");
      setShowCreatePost(false);

      await loadPosts();
    } catch (err) {
      console.error("Error creating post:", err);
      setError("Your post couldn't be published. Please try again.");
    } finally {
      setCreatingPost(false);
    }
  }

  const categories = [
    "All",
    "general",
    "ai-gaming",
    "recommendations",
    "reviews",
  ];

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = posts.filter((post) => {
      const matchesCategory =
        selectedCategory === "All" || post.community === selectedCategory;

      const matchesSearch =
        !query ||
        `${post.title} ${post.body} ${post.author} ${post.community}`
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });

    if (sort === "Top") {
      result.sort((a, b) => b.votes - a.votes);
    } else if (sort === "Hot") {
      result.sort(
        (a, b) =>
          b.votes + b.comments * 2 - (a.votes + a.comments * 2)
      );
    } else {
      result.sort((a, b) => {
        if (a.id < 0 && b.id < 0) return 0;
        if (a.id < 0) return 1;
        if (b.id < 0) return -1;
        return b.id - a.id;
      });
    }

    return result;
  }, [posts, search, selectedCategory, sort]);

  return (
    <main className="min-h-screen bg-[#090b0f] text-white">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#77f29b]">
            Playtested community
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The player <span className="text-[#77f29b]">community.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
            Discuss games, share recommendations and help players discover
            games worth their time.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search discussions..."
                aria-label="Search discussions"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#11151c] px-4 py-3 text-sm outline-none transition placeholder:text-gray-500 focus:border-[#77f29b]/60"
              />

              <button
                onClick={() => {
                  if (!userId) {
                    router.push("/login");
                    return;
                  }
                  setShowCreatePost((current) => !current);
                }}
                className="rounded-xl bg-[#77f29b] px-5 py-3 text-sm font-bold text-[#07110a] transition hover:bg-[#9bffb5]"
              >
                + Create post
              </button>
            </div>

            {showCreatePost && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-[#11151c] p-5">
                <h2 className="mb-4 text-lg font-bold">Create a discussion</h2>

                <label
                  htmlFor="community"
                  className="mb-2 block text-sm text-gray-300"
                >
                  Community
                </label>
                <select
                  id="community"
                  value={newCommunity}
                  onChange={(event) => setNewCommunity(event.target.value)}
                  className="mb-4 w-full rounded-lg border border-white/10 bg-[#090b0f] px-3 py-3 text-sm outline-none focus:border-[#77f29b]/60"
                >
                  <option value="general">General discussion</option>
                  <option value="ai-gaming">AI gaming</option>
                  <option value="recommendations">Recommendations</option>
                  <option value="reviews">Reviews</option>
                </select>

                <label
                  htmlFor="post-title"
                  className="mb-2 block text-sm text-gray-300"
                >
                  Title
                </label>
                <input
                  id="post-title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  maxLength={150}
                  placeholder="What do you want to discuss?"
                  className="mb-4 w-full rounded-lg border border-white/10 bg-[#090b0f] px-3 py-3 text-sm outline-none focus:border-[#77f29b]/60"
                />

                <label
                  htmlFor="post-body"
                  className="mb-2 block text-sm text-gray-300"
                >
                  Your post
                </label>
                <textarea
                  id="post-body"
                  value={newBody}
                  onChange={(event) => setNewBody(event.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="Share your thoughts with the community..."
                  className="mb-4 w-full resize-y rounded-lg border border-white/10 bg-[#090b0f] px-3 py-3 text-sm outline-none focus:border-[#77f29b]/60"
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => void createPost()}
                    disabled={
                      creatingPost || !newTitle.trim() || !newBody.trim()
                    }
                    className="rounded-lg bg-[#77f29b] px-5 py-2.5 text-sm font-bold text-[#07110a] transition hover:bg-[#9bffb5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingPost ? "Publishing..." : "Publish post"}
                  </button>

                  <button
                    onClick={() => setShowCreatePost(false)}
                    className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mb-5 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                    selectedCategory === category
                      ? "bg-[#77f29b] text-[#07110a]"
                      : "border border-white/10 bg-[#11151c] text-gray-400 hover:text-white"
                  }`}
                >
                  {category === "All"
                    ? "All posts"
                    : category.replace(/-/g, " ")}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between border-b border-white/10">
              <div className="flex gap-5">
                {["Hot", "New", "Top"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSort(tab)}
                    className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                      sort === tab
                        ? "border-[#77f29b] text-white"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <span className="pb-3 text-xs text-gray-500">
                {filteredPosts.length} posts
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-[#11151c] p-10 text-center text-sm text-gray-400">
                Loading community posts...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#11151c] p-10 text-center">
                <p className="font-semibold">No posts found</p>
                <p className="mt-2 text-sm text-gray-500">
                  Try another search or be the first to start a discussion.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const myVote = votes[post.id] ?? 0;
                  const isSavingVote = votingPostId === post.id;

                  return (
                    <article
                      key={post.id}
                      className="rounded-2xl border border-white/10 bg-[#11151c] p-5 transition hover:border-white/20 sm:p-6"
                    >
                      <div className="flex gap-4">
                        <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
                          <button
                            onClick={() => void castVote(post.id, 1)}
                            disabled={isSavingVote || post.id < 0}
                            aria-label="Upvote post"
                            aria-pressed={myVote === 1}
                            title={
                              !userId
                                ? "Sign in to vote"
                                : "Upvote"
                            }
                            className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              myVote === 1
                                ? "bg-[#77f29b]/15 text-[#77f29b]"
                                : "text-gray-500 hover:bg-white/5 hover:text-[#77f29b]"
                            }`}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="m18 15-6-6-6 6" />
                            </svg>
                          </button>

                          <span
                            className={`min-w-6 text-center text-sm font-bold tabular-nums ${
                              myVote === 1
                                ? "text-[#77f29b]"
                                : myVote === -1
                                  ? "text-orange-400"
                                  : "text-gray-300"
                            }`}
                          >
                            {post.votes}
                          </span>

                          <button
                            onClick={() => void castVote(post.id, -1)}
                            disabled={isSavingVote || post.id < 0}
                            aria-label="Downvote post"
                            aria-pressed={myVote === -1}
                            title={
                              !userId
                                ? "Sign in to vote"
                                : "Downvote"
                            }
                            className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              myVote === -1
                                ? "bg-orange-400/15 text-orange-400"
                                : "text-gray-500 hover:bg-white/5 hover:text-orange-400"
                            }`}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="rounded-md bg-white/5 px-2 py-1 capitalize text-gray-300">
                              {post.community.replace(/-/g, " ")}
                            </span>
                            <span>·</span>
                            <span>{post.author}</span>
                            <span>·</span>
                            <span>{post.time}</span>
                          </div>

                          <button
                            onClick={() =>
                              post.id > 0 &&
                              router.push(`/community/${post.id}`)
                            }
                            disabled={post.id < 0}
                            className="text-left text-lg font-bold leading-snug transition hover:text-[#77f29b] disabled:cursor-default sm:text-xl"
                          >
                            {post.title}
                          </button>

                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-400">
                            {post.body}
                          </p>

                          <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-gray-500">
                            <button
                              onClick={() =>
                                post.id > 0 &&
                                router.push(`/community/${post.id}`)
                              }
                              disabled={post.id < 0}
                              className="flex items-center gap-2 transition hover:text-white disabled:cursor-default"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
                              </svg>
                              {post.comments} comments
                            </button>

                            {isSavingVote && (
                              <span className="text-[#77f29b]">
                                Saving vote...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#11151c] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#77f29b]">
                About Playtested
              </p>
              <h2 className="mt-3 text-xl font-bold">
                Better discovery. Better games.
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                A community for players who want to discover worthwhile games
                and understand how they are made.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#11151c] p-5">
              <h2 className="mb-4 font-bold">Community spaces</h2>

              <div className="space-y-4">
                {[
                  {
                    name: "General discussion",
                    description: "Talk about gaming",
                    value: "general",
                  },
                  {
                    name: "AI gaming",
                    description: "AI disclosure and verification",
                    value: "ai-gaming",
                  },
                  {
                    name: "Recommendations",
                    description: "Find your next game",
                    value: "recommendations",
                  },
                  {
                    name: "Reviews",
                    description: "Share your experiences",
                    value: "reviews",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setSelectedCategory(item.value)}
                    className="group flex w-full items-start gap-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#77f29b] transition group-hover:bg-[#77f29b]/10">
                      #
                    </span>
                    <span>
                      <span className="block text-sm font-semibold transition group-hover:text-[#77f29b]">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {item.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#77f29b]/20 bg-[#77f29b]/5 p-5">
              <h2 className="font-bold">Your voice matters</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Helpful votes and thoughtful discussions can help the community
                identify useful recommendations.
              </p>
              <button
                onClick={() => {
                  if (!userId) {
                    router.push("/login");
                  } else {
                    setShowCreatePost(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="mt-4 text-sm font-bold text-[#77f29b] hover:text-[#9bffb5]"
              >
                Start a discussion →
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

