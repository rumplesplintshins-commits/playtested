import fs from "node:fs";

const path = "app/components/StartPlaytest.tsx";
let src = fs.readFileSync(path, "utf8");

const formStartMarker = `      <form
        className="mt-6 space-y-6"
        onSubmit={handlePublish}
      >`;
const formEndMarker = `      </form>`;

const start = src.lastIndexOf(formStartMarker);
if (start < 0) throw new Error("Could not find New Playtest form start. No changes written.");
const endStart = src.indexOf(formEndMarker, start);
if (endStart < 0) throw new Error("Could not find New Playtest form end. No changes written.");
const end = endStart + formEndMarker.length;

const currentBlock = src.slice(start, end);
if (!currentBlock.includes("Estimated testing time") || !currentBlock.includes("Build / release label")) {
  throw new Error("New Playtest form did not match the known damaged shape. No changes written.");
}
if (currentBlock.includes("How will testers access this build?") || currentBlock.includes("Testing instructions")) {
  throw new Error("New Playtest form already appears restored. No changes written.");
}

const restored = `      <form
        className="mt-6 space-y-6"
        onSubmit={handlePublish}
      >
        <CampaignAllowancePanel
          eligibility={eligibility}
          loading={eligibilityLoading}
          error={eligibilityError}
          currentPlaytest={existingPlaytest}
          onRetry={retryAllowance}
        />
        {shareControls}

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            How will testers access this build?
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Choose the access method so Playtested can show testers the right action.
          </span>
          <select
            value={accessType}
            onChange={(event) =>
              setAccessType(event.target.value as PlaytestAccessType)
            }
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          >
            <option value="steam_demo">Steam demo</option>
            <option value="steam_game">Steam game</option>
            <option value="browser_game">Browser game</option>
            <option value="download_build">Downloadable build</option>
            <option value="other">Other external access</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Tester access link
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Paste the exact Steam page, browser game, private build or download location testers should use for this playtest round.
          </span>
          <input
            type="url"
            required
            value={accessLink}
            onChange={(event) => setAccessLink(event.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Testing instructions
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Explain what testers should play and anything they need to know.
          </span>
          <textarea
            required
            minLength={20}
            maxLength={5000}
            rows={5}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
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
                  className={\`rounded-full border px-3 py-2 text-xs font-medium transition \${
                    selected
                      ? "border-[#77f29b]/40 bg-[#77f29b]/10 text-[#77f29b]"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }\`}
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
            onChange={(event) => setAudience(event.target.value as PlaytestAudience)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          >
            <option value="playtested_testers">Playtested testers</option>
            <option value="own_community">My own community</option>
            <option value="both">Playtested testers + my community</option>
          </select>
        </label>

        <CampaignAudienceFields
          minimumRank={minimumRank}
          setMinimumRank={setMinimumRank}
          genre={testingGenre}
          setGenre={setTestingGenre}
          restricted={genreRestricted}
          setRestricted={setGenreRestricted}
          onAvailability={setAudienceAvailability}
          enabled={testerHubSelected}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {includesPlaytestedTesters(audience) && (
            <label className="block">
              <span className="text-sm font-medium text-zinc-200">
                {capacityPolicy?.places ?? "Checking"} Tester Hub places
              </span>
              <PlacesRules />
            </label>
          )}

          <div className="block">
            <span className="text-sm font-medium text-zinc-200">Estimated testing time</span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">
              Set an expectation for how long testers should spend on this round.
            </span>
            <DurationPicker
              value={estimatedMinutes}
              onChange={setEstimatedMinutes}
              isPro={developerPlan.data?.plan === "pro"}
            />
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            Build / release label
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Optional. For example: Demo 0.3, Alpha 2 or October build.
          </span>
          <input
            type="text"
            maxLength={100}
            value={releaseLabel}
            onChange={(event) => setReleaseLabel(event.target.value)}
            placeholder="Demo 0.3"
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"
          />
        </label>

        {message && (
          <div
            role={messageType === "error" ? "alert" : "status"}
            className={\`rounded-lg border p-4 text-sm \${
              messageType === "error"
                ? "border-red-400/40 bg-red-400/10 text-red-200"
                : "border-[#77f29b]/30 bg-[#77f29b]/10 text-[#b9f9ca]"
            }\`}
          >
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={saving || testerHubBlocked || audienceBlocked}
            className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Publishing..." : "Publish playtest"}
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
      </form>`;

src = src.slice(0, start) + restored + src.slice(end);
fs.writeFileSync(path, src, "utf8");
console.log("Restored exact New Playtest form from production source with DurationPicker retained.");
