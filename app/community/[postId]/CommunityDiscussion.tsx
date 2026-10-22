
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { createClient } from "@/lib/supabase";

type DiscussionPost = {
  id: number;
  community: string;
  title: string;
  body: string;
  user_id: string | null;
  created_at: string;
  author: string;
};

type DiscussionComment = {
  id: number;
  post_id: number;
  user_id: string | null;
  body: string;
  created_at: string;
  author: string;
};

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CommunityDiscussion({
  postId,
}: {
  postId: string;
}) {
  const [post, setPost] = useState<DiscussionPost | null>(null);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const supabase = createClient();

  const loadDiscussion = useCallback(async () => {
    setLoading(true);
    setError("");

    const numericPostId = Number(postId);

    if (!Number.isSafeInteger(numericPostId) || numericPostId < 1) {
      setPost(null);
      setComments([]);
      setLoading(false);
      return;
    }

    const { data: postData, error: postError } = await supabase
      .from("community_posts")
      .select("id, community, title, body, user_id, created_at")
      .eq("id", numericPostId)
      .maybeSingle();

    if (postError) {
      setError(`Could not load this post: ${postError.message}`);
      setLoading(false);
      return;
    }

    if (!postData) {
      setPost(null);
      setComments([]);
      setLoading(false);
      return;
    }

    let postAuthor = "Community member";

    if (postData.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", postData.user_id)
        .maybeSingle();

      if (profile?.display_name) {
        postAuthor = profile.display_name;
      }
    }

    setPost({
      ...postData,
      author: postAuthor,
    });

    const { data: commentData, error: commentError } = await supabase
      .from("community_comments")
      .select("id, post_id, user_id, body, created_at")
      .eq("post_id", numericPostId)
      .order("created_at", { ascending: true });

    if (commentError) {
      setError(`The post loaded, but comments could not be loaded: ${commentError.message}`);
      setComments([]);
      setLoading(false);
      return;
    }

    const loadedComments: DiscussionComment[] = (commentData ?? []).map(
      (comment) => ({
        ...comment,
        author: "Community member",
      })
    );

    const userIds = [
      ...new Set(
        loadedComments
          .map((comment) => comment.user_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const profileNames = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile.display_name,
        ])
      );

      for (const comment of loadedComments) {
        if (comment.user_id) {
          comment.author =
            profileNames.get(comment.user_id) || "Community member";
        }
      }
    }

    setComments(loadedComments);
    setLoading(false);
  }, [postId, supabase]);

  useEffect(() => {
    void loadDiscussion();
  }, [loadDiscussion]);

  async function submitComment() {
    const body = commentText.trim();

    if (!body || !post || submitting) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setSubmitting(false);
      window.location.href = "/login";
      return;
    }

    const { error: insertError } = await supabase
      .from("community_comments")
      .insert({
        post_id: post.id,
        user_id: userData.user.id,
        body,
      });

    if (insertError) {
      setError(`Could not post your comment: ${insertError.message}`);
      setSubmitting(false);
      return;
    }

    setCommentText("");
    setNotice("Your comment has been posted.");
    await loadDiscussion();
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/community"
          className="text-sm text-zinc-400 transition hover:text-[#77f29b]"
        >
          ← Back to Community
        </Link>

        {loading ? (
          <p className="py-20 text-center text-zinc-400">
            Loading discussion...
          </p>
        ) : error && !post ? (
          <section className="mt-8 rounded-xl border border-red-500/20 bg-[#0e110f] p-6">
            <h1 className="text-xl font-bold">Could not load discussion</h1>
            <p className="mt-3 break-words text-sm text-red-300">{error}</p>
            <button
              onClick={() => void loadDiscussion()}
              className="mt-5 rounded-md bg-[#77f29b] px-4 py-2 text-sm font-semibold text-[#09100b]"
            >
              Try again
            </button>
          </section>
        ) : !post ? (
          <section className="py-20">
            <h1 className="text-2xl font-bold">Discussion not found</h1>
            <p className="mt-3 text-zinc-400">
              This post may have been removed or the link may be incorrect.
            </p>
          </section>
        ) : (
          <>
            <article className="mt-6 rounded-xl border border-white/[0.08] bg-[#0e110f] p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="font-semibold text-[#77f29b]">
                  p/{post.community.toLowerCase().replaceAll(" ", "-")}
                </span>
                <span>·</span>
                <span>Posted by {post.author}</span>
                <span>·</span>
                <span>{formatTime(post.created_at)}</span>
              </div>

              <h1 className="mt-5 text-2xl font-bold leading-tight sm:text-3xl">
                {post.title}
              </h1>

              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-300 sm:text-base">
                {post.body}
              </p>

              <div className="mt-6 border-t border-white/[0.08] pt-4 text-sm text-zinc-500">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </div>
            </article>

            {error && (
              <p className="mt-4 break-words rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                {error}
              </p>
            )}

            {notice && (
              <p className="mt-4 rounded-lg border border-[#77f29b]/20 bg-[#77f29b]/5 p-4 text-sm text-[#77f29b]">
                {notice}
              </p>
            )}

            <section className="mt-8">
              <h2 className="text-xl font-bold">
                Discussion ({comments.length})
              </h2>

              <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0e110f] p-5">
                <label
                  htmlFor="comment"
                  className="mb-3 block text-sm font-medium text-zinc-300"
                >
                  Add your comment
                </label>

                <textarea
                  id="comment"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={4}
                  maxLength={3000}
                  placeholder="Join the discussion..."
                  className="w-full rounded-lg border border-white/10 bg-[#090b0a] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-[#77f29b]/50"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-zinc-600">
                    {commentText.length}/3000
                  </span>
                  <button
                    type="button"
                    onClick={() => void submitComment()}
                    disabled={!commentText.trim() || submitting}
                    className="rounded-md bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? "Posting..." : "Post comment"}
                  </button>
                </div>
                <p className="mt-3 text-xs text-zinc-600">
                  You must be signed in to comment.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-xl border border-white/[0.08] bg-[#0e110f] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#77f29b]">
                        {comment.author}
                      </p>
                      <span className="text-xs text-zinc-600">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {comment.body}
                    </p>
                  </article>
                ))}

                {comments.length === 0 && (
                  <p className="rounded-xl border border-white/[0.08] bg-[#0e110f] p-6 text-sm text-zinc-500">
                    No comments yet. Start the discussion.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}