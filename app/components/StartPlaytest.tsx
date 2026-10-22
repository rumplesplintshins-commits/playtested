"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../lib/supabase";

type GameSource = {
  importedGameId: string | null;
  approvedGameId: string | null;
  submissionId: string | null;
};

type ExistingPlaytest = {
  id: string;
  status: "draft" | "open" | "paused" | "closed";
  focusAreas: string[];
  audience: "playtested_testers" | "own_community" | "both";
  targetTesters: number;
  estimatedMinutes: number | null;
  releaseLabel: string | null;
  createdAt: string;
  publishedAt: string | null;
};

type StartPlaytestProps = {
  gameTitle: string;
  gameSource: GameSource;
  existingPlaytest: ExistingPlaytest | null;
};

const focusOptions = [
  "Overall experience",
  "Gameplay",
  "Controls",
  "Difficulty & balance",
  "Tutorial / onboarding",
  "Performance",
  "Bugs",
  "UI / UX",
  "Art & presentation",
  "Audio",
];

function playtestStatusClasses(
  status: ExistingPlaytest["status"]
) {
  if (status === "open") {
    return "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#77f29b]";
  }

  if (status === "draft") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  }

  if (status === "paused") {
    return "border-sky-300/30 bg-sky-300/10 text-sky-200";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

function playtestStatusLabel(
  status: ExistingPlaytest["status"]
) {
  if (status === "open") {
    return "Playtest open";
  }

  if (status === "draft") {
    return "Draft playtest";
  }

  if (status === "paused") {
    return "Playtest paused";
  }

  return "Playtest closed";
}

function audienceLabel(
  audience: ExistingPlaytest["audience"]
) {
  if (audience === "playtested_testers") {
    return "Playtested testers";
  }

  if (audience === "own_community") {
    return "Own community";
  }

  return "Playtested testers + own community";
}

export default function StartPlaytest({
  gameTitle,
  gameSource,
  existingPlaytest,
}: StartPlaytestProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [accessLink, setAccessLink] = useState("");
  const [instructions, setInstructions] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([
    "Overall experience",
  ]);
  const [audience, setAudience] = useState<
    "playtested_testers" | "own_community" | "both"
  >("playtested_testers");
  const [targetTesters, setTargetTesters] = useState("5");
  const [estimatedMinutes, setEstimatedMinutes] =
    useState("30");
  const [releaseLabel, setReleaseLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  function toggleFocusArea(area: string) {
    setFocusAreas((current) =>
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area]
    );
  }

  async function createPlaytest(publish: boolean) {
    setMessage("");
    setMessageType("");

    const trimmedAccessLink = accessLink.trim();
    const trimmedInstructions = instructions.trim();

    if (!trimmedAccessLink) {
      setMessage("Enter a playable game or build link.");
      setMessageType("error");
      return;
    }

    if (
      !trimmedAccessLink.startsWith("http://") &&
      !trimmedAccessLink.startsWith("https://")
    ) {
      setMessage(
        "The game access link must start with http:// or https://."
      );
      setMessageType("error");
      return;
    }

    if (trimmedInstructions.length < 20) {
      setMessage(
        "Testing instructions must contain at least 20 characters."
      );
      setMessageType("error");
      return;
    }

    if (focusAreas.length === 0) {
      setMessage(
        "Select at least one area for testers to focus on."
      );
      setMessageType("error");
      return;
    }

    const target = Number(targetTesters);

    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > 100
    ) {
      setMessage(
        "Target testers must be between 1 and 100."
      );
      setMessageType("error");
      return;
    }

    const minutes =
      estimatedMinutes.trim() === ""
        ? null
        : Number(estimatedMinutes);

    if (
      minutes !== null &&
      (!Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 1440)
    ) {
      setMessage(
        "Estimated testing time must be between 1 and 1440 minutes."
      );
      setMessageType("error");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "create_community_playtest",
      {
        p_imported_game_id: gameSource.importedGameId,
        p_approved_game_id: gameSource.approvedGameId,
        p_submission_id: gameSource.submissionId,
        p_access_link: trimmedAccessLink,
        p_instructions: trimmedInstructions,
        p_focus_areas: focusAreas,
        p_audience: audience,
        p_target_testers: target,
        p_estimated_minutes: minutes,
        p_release_label:
          releaseLabel.trim() === ""
            ? null
            : releaseLabel.trim(),
        p_publish: publish,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);

    router.refresh();
  }

  function handlePublish(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void createPlaytest(true);
  }

  if (!open && existingPlaytest) {
    return (
      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${playtestStatusClasses(
                  existingPlaytest.status
                )}`}
              >
                {existingPlaytest.status === "open" && (
                  <span className="mr-1.5">●</span>
                )}

                {playtestStatusLabel(existingPlaytest.status)}
              </span>

              {existingPlaytest.releaseLabel && (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                  {existingPlaytest.releaseLabel}
                </span>
              )}
            </div>

            <h4 className="mt-4 text-lg font-semibold text-zinc-100">
              {existingPlaytest.status === "open"
                ? "Players can test this game"
                : existingPlaytest.status === "draft"
                  ? "Playtest setup in progress"
                  : existingPlaytest.status === "paused"
                    ? "This playtest is paused"
                    : "Previous playtest"}
            </h4>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {existingPlaytest.status === "open"
                ? "This playtest is published and available to the selected testing audience."
                : existingPlaytest.status === "draft"
                  ? "This playtest has been saved but is not visible to testers yet."
                  : existingPlaytest.status === "paused"
                    ? "This playtest is currently unavailable to new testers."
                    : "This playtest has finished and is no longer accepting new testers."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Target
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-200">
              {existingPlaytest.targetTesters}{" "}
              {existingPlaytest.targetTesters === 1
                ? "tester"
                : "testers"}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Test time
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-200">
              {existingPlaytest.estimatedMinutes
                ? `~${existingPlaytest.estimatedMinutes} minutes`
                : "Not specified"}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Audience
            </p>

            <p className="mt-2 text-sm font-medium text-zinc-200">
              {audienceLabel(existingPlaytest.audience)}
            </p>
          </div>
        </div>

        {existingPlaytest.focusAreas.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Testing focus
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {existingPlaytest.focusAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[#77f29b]/20 bg-[#77f29b]/[0.06] px-3 py-1.5 text-xs text-[#b9f9ca]"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {existingPlaytest.status === "closed" && (
          <div className="mt-5 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
            >
              Start another playtest
            </button>
          </div>
        )}

        {existingPlaytest.status === "draft" && (
          <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-4">
            <p className="text-sm text-amber-100">
              Draft editing and publishing controls are the next
              management step. This draft is safely stored.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-black/10 p-5">
        <p className="font-semibold text-zinc-200">
          No active playtest
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Start a playtest to collect structured feedback from
          players about this game.
        </p>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setMessageType("");
            setOpen(true);
          }}
          className="mt-4 rounded-lg bg-[#77f29b] px-4 py-2.5 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
        >
          Start playtest
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-[#77f29b]/20 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#77f29b]">
            New playtest
          </p>

          <h4 className="mt-2 text-lg font-semibold">
            Start testing {gameTitle}
          </h4>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Give testers access to the game and tell them what you
            want feedback on.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-400 transition hover:text-white disabled:opacity-50"
        >
          Close
        </button>
      </div>

      <form
        className="mt-6 space-y-6"
        onSubmit={handlePublish}
      >
        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Game access link
          </span>

          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Steam page, private build link, itch.io page or another
            location where the tester can access the game.
          </span>

          <input
            type="url"
            required
            value={accessLink}
            onChange={(event) =>
              setAccessLink(event.target.value)
            }
            placeholder="https://..."
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Testing instructions
          </span>

          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Explain what testers should play and anything they need
            to know.
          </span>

          <textarea
            required
            minLength={20}
            maxLength={5000}
            rows={5}
            value={instructions}
            onChange={(event) =>
              setInstructions(event.target.value)
            }
            placeholder="For this test, please play through the opening section and focus on how clear the controls and objectives feel."
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        <div>
          <p className="text-sm font-medium text-zinc-200">
            What should testers focus on?
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Select as many areas as you need.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {focusOptions.map((area) => {
              const selected = focusAreas.includes(area);

              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleFocusArea(area)}
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                    selected
                      ? "border-[#77f29b]/40 bg-[#77f29b]/10 text-[#77f29b]"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Testing audience
          </span>

          <select
            value={audience}
            onChange={(event) =>
              setAudience(
                event.target.value as
                  | "playtested_testers"
                  | "own_community"
                  | "both"
              )
            }
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          >
            <option value="playtested_testers">
              Playtested testers
            </option>

            <option value="own_community">
              My own community
            </option>

            <option value="both">
              Playtested testers + my community
            </option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-200">
              Target testers
            </span>

            <input
              type="number"
              required
              min="1"
              max="100"
              value={targetTesters}
              onChange={(event) =>
                setTargetTesters(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-200">
              Estimated test time
            </span>

            <div className="relative mt-2">
              <input
                type="number"
                min="1"
                max="1440"
                value={estimatedMinutes}
                onChange={(event) =>
                  setEstimatedMinutes(event.target.value)
                }
                className="w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 pr-20 text-sm text-white outline-none focus:border-[#77f29b]"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                minutes
              </span>
            </div>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Build / release label
          </span>

          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Optional. For example: Demo 0.3, Alpha 2 or October
            build.
          </span>

          <input
            type="text"
            maxLength={100}
            value={releaseLabel}
            onChange={(event) =>
              setReleaseLabel(event.target.value)
            }
            placeholder="Demo 0.3"
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        {message && (
          <div
            role={
              messageType === "error" ? "alert" : "status"
            }
            className={`rounded-lg border p-4 text-sm ${
              messageType === "error"
                ? "border-red-400/40 bg-red-400/10 text-red-200"
                : "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#b9f9ca]"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Publishing..."
              : "Publish playtest"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void createPlaytest(false)}
            className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-sm text-zinc-400 transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}