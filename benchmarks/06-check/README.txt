NEON DODGE - PLAYTESTED FAULT BUILD 0.1

Purpose:
A tiny browser game built specifically to prove Playtested's external-build and automated technical-testing workflow.

Run:
Open index.html in a modern browser, or serve this folder with:
  python -m http.server 8080
Then open:
  http://localhost:8080/?seed=123

Deliberate intermittent faults:
- Startup failure
- Restart failure
- Short simulation stalls
- Synthetic runtime errors

The page exposes window.PlaytestedTestAPI and window.__PLAYTESTED_TELEMETRY__ for the future worker.

Automation should report technical behaviour only. Fun, creativity, art, music, game feel and subjective balance remain human testing responsibilities.

Recommended first automated run: 100 sessions.
After the pipeline is proven: 1,000 sessions.
