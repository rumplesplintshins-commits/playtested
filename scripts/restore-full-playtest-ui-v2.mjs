import fs from "node:fs";

const path = "app/components/StartPlaytest.tsx";
let src = fs.readFileSync(path, "utf8");

const duration = `<div className="block">
                    <span className="text-sm font-medium text-zinc-200">Estimated testing time</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      Set an expectation for how long testers should spend on this round.
                    </span>
                    <DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />
                  </div>`;

const manageStart = src.indexOf('                  <div className="block">\n                    <span className="text-sm font-medium text-zinc-200">Estimated testing time</span>');
const manageEndMarker = '                  {buildLocked && (';
const manageEnd = src.indexOf(manageEndMarker, manageStart);
if (manageStart < 0 || manageEnd < 0) throw new Error("Could not locate damaged manage-playtest section.");

const manageRestored = `                  <label className="block">
                    <span className="text-sm font-medium text-zinc-200">How will testers access this build?</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">This controls the action testers see when they start testing.</span>
                    <select value={accessType} disabled={buildLocked} onChange={(event) => setAccessType(event.target.value as PlaytestAccessType)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b] disabled:cursor-not-allowed disabled:opacity-60">
                      <option value="steam_demo">Steam demo</option><option value="steam_game">Steam game</option><option value="browser_game">Browser game</option><option value="download_build">Downloadable build</option><option value="other">Other external access</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-200">Tester access link</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">The exact page or download location testers should use for this round. Start a new playtest for a materially different build.</span>
                    <input type="url" required value={accessLink} disabled={buildLocked} onChange={(event) => setAccessLink(event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b] disabled:cursor-not-allowed disabled:opacity-60" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-200">Testing instructions</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">Explain what testers should play and anything they need to know.</span>
                    <textarea required minLength={20} maxLength={5000} rows={4} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="For this test, please play through the opening section and focus on how clear the controls and objectives feel." className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]" />
                  </label>

                  <div>
                    <p className="text-sm font-medium text-zinc-200">What should testers focus on?</p>
                    <p className="mt-1 text-xs text-zinc-500">Select as many areas as you need.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {focusOptions.map((area) => { const selected = focusAreas.includes(area); return (<button key={area} type="button" onClick={() => toggleFocusArea(area)} className={\`rounded-full border px-3 py-2 text-xs font-medium transition \${selected ? "border-[#77f29b]/40 bg-[#77f29b]/10 text-[#77f29b]" : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"}\`}>{area}</button>); })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-zinc-200">Testing audience</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Choose independent Playtested testers, your own community, or both.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => setAudience(includesPlaytestedTesters(audience) ? "own_community" : "both")} className={\`rounded-lg border p-4 text-left transition \${includesPlaytestedTesters(audience) ? "border-[#77f29b]/40 bg-[#77f29b]/[0.07]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}\`}><p className="text-sm font-semibold text-zinc-100">Playtested testers</p><p className="mt-1 text-xs leading-5 text-zinc-500">Available in Tester Hub.</p></button>
                      <button type="button" onClick={() => setAudience(includesOwnCommunity(audience) ? "playtested_testers" : "both")} className={\`rounded-lg border p-4 text-left transition \${includesOwnCommunity(audience) ? "border-[#77f29b]/40 bg-[#77f29b]/[0.07]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}\`}><p className="text-sm font-semibold text-zinc-100">My own community</p><p className="mt-1 text-xs leading-5 text-zinc-500">Invite players with the share link.</p></button>
                    </div>
                  </div>

                  {includesPlaytestedTesters(audience) && (<label className="block"><span className="text-sm font-medium text-zinc-200">{existingPlaytest?.targetTesters ?? capacityPolicy?.places ?? "Checking"} Tester Hub places</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Community responses are counted separately.</span><PlacesRules/></label>)}

                  <div className="grid gap-4 sm:grid-cols-2">
                    ${duration}
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-200">Build / release label</span>
                      <input type="text" maxLength={100} value={releaseLabel} disabled={buildLocked} onChange={(event) => setReleaseLabel(event.target.value)} placeholder="Demo 0.3" className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b] disabled:cursor-not-allowed disabled:opacity-60" />
                    </label>
                  </div>

`;
src = src.slice(0, manageStart) + manageRestored + src.slice(manageEnd);

const publishStart = src.indexOf('        <div className="block">\n          <span className="text-sm font-medium text-zinc-200">Estimated testing time</span>');
const publishEndMarker = '        {message && (';
const publishEnd = src.indexOf(publishEndMarker, publishStart);
if (publishStart < 0 || publishEnd < 0) throw new Error("Could not locate damaged new-playtest section.");

const publishRestored = `        <label className="block">
          <span className="text-sm font-medium text-zinc-200">How will testers access this build?</span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">Choose the access method so Playtested can show testers the right action.</span>
          <select value={accessType} onChange={(event) => setAccessType(event.target.value as PlaytestAccessType)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"><option value="steam_demo">Steam demo</option><option value="steam_game">Steam game</option><option value="browser_game">Browser game</option><option value="download_build">Downloadable build</option><option value="other">Other external access</option></select>
        </label>

        <label className="block"><span className="text-sm font-medium text-zinc-200">Tester access link</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Paste the exact Steam page, browser game, private build or download location testers should use for this playtest round.</span><input type="url" required value={accessLink} onChange={(event) => setAccessLink(event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]" /></label>

        <label className="block"><span className="text-sm font-medium text-zinc-200">Testing instructions</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Explain what testers should play and anything they need to know.</span><textarea required minLength={20} maxLength={5000} rows={5} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="For this test, please play through the opening section and focus on how clear the controls and objectives feel." className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]" /></label>

        <div><p className="text-sm font-medium text-zinc-200">What should testers focus on?</p><p className="mt-1 text-xs text-zinc-500">Select as many areas as you need.</p><div className="mt-3 flex flex-wrap gap-2">{focusOptions.map((area) => { const selected=focusAreas.includes(area); return (<button key={area} type="button" onClick={() => toggleFocusArea(area)} className={\`rounded-full border px-3 py-2 text-xs font-medium transition \${selected ? "border-[#77f29b]/40 bg-[#77f29b]/10 text-[#77f29b]" : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"}\`}>{area}</button>); })}</div></div>

        <label className="block"><span className="text-sm font-medium text-zinc-200">Testing audience</span><select value={audience} onChange={(event) => setAudience(event.target.value as PlaytestAudience)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]"><option value="playtested_testers">Playtested testers</option><option value="own_community">My own community</option><option value="both">Playtested testers + my community</option></select></label>

        <CampaignAudienceFields minimumRank={minimumRank} setMinimumRank={setMinimumRank} genre={testingGenre} setGenre={setTestingGenre} restricted={genreRestricted} setRestricted={setGenreRestricted} onAvailability={setAudienceAvailability} enabled={testerHubSelected} />
        <div className="grid gap-4 sm:grid-cols-2">
          {includesPlaytestedTesters(audience) && (<label className="block"><span className="text-sm font-medium text-zinc-200">{capacityPolicy?.places ?? "Checking"} Tester Hub places</span><PlacesRules/></label>)}
          ${duration.replaceAll('                  ', '          ')}
        </div>

        <label className="block"><span className="text-sm font-medium text-zinc-200">Build / release label</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Optional. For example: Demo 0.3, Alpha 2 or October build.</span><input type="text" maxLength={100} value={releaseLabel} onChange={(event) => setReleaseLabel(event.target.value)} placeholder="Demo 0.3" className="mt-2 w-full rounded-lg border border-white/10 bg-[#111412] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b]" /></label>

`;
src = src.slice(0, publishStart) + publishRestored + src.slice(publishEnd);

fs.writeFileSync(path, src);
console.log("Restored full manage/new playtest forms, including plan targeting, with DurationPicker retained.");
