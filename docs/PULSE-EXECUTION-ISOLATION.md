# PR #40 — PULSE execution isolation (design and implementation gate)

Status: **design / security audit only — not a sandbox implementation**. This branch must remain draft. Do not enable `PULSE_EXECUTION_ENABLED` or run untrusted ZIPs. No migrations or production configuration changes.

## Verified current execution path (v11, after PRs #38 and #39)

1. `scripts/workers/pulse-job-runner-v9.mjs` claims jobs using Supabase service credentials, then POSTs to `/api/pulse/preflight`.
2. `app/api/pulse/preflight/route.ts` authenticates the runner, downloads and scans ZIP, then calls `execFileAsync(process.execPath, [workerPath, ...], {cwd: process.cwd(), env: process.env, timeout: 15 * 60 * 1000, maxBuffer: 50 * 1024 * 1024})`.
3. `scripts/workers/technical-test-worker-v6.10.mjs` extracts ZIP and serves browser build to Playwright Chromium.
4. ZIP download SSRF and extraction validation are present. Neither provides a security boundary for active game content.

## Threat model / current blockers

- **Critical:** The technical worker inherits the host environment, potentially including `SUPABASE_SERVICE_ROLE_KEY` and `PULSE_RUNNER_SECRET`. Browser content and worker must not share a credential-bearing security domain.
- **Critical:** There is no enforced OS/container boundary between untrusted browser content and trusted API/worker, and no default-deny network policy for the untrusted workload.
- **Critical:** `execFile` timeout is not a CPU/memory/pid/disk quota and may leave descendants; archive parsing and browser children need cgroup/process-tree containment.
- **High:** Current trusted preflight route performs download, scan and execution in one request. HTTP timeouts, retries, stale jobs and interrupted processes must not result in orphaned workloads or duplicate reporting.
- **High:** The runner's service-role key and job authentication must never be mounted inside the sandbox.

## Target design

Separate **trusted controller** (claim, authentication, ZIP acquisition, scanning, job updates, report validation) from **untrusted execution sandbox** (extracted browser build, local static server, Chromium and all descendants). A dedicated execution host, not the ordinary Render web service, provisions one disposable sandbox per job.

Sandbox minimum: rootless/unprivileged user; read-only root filesystem; no host mounts or Docker socket; no host networking; deny all outbound traffic and metadata/private-network access; loopback permitted only within its own network namespace for the local browser build; no secrets or service tokens; Linux no-new-privileges, seccomp/AppArmor or equivalent; drop all capabilities; explicit cgroup v2 CPU/memory/pids; tmpfs/workspace byte and inode quotas; wall-clock deadline; kill/remove entire sandbox and network namespace on any exit path. Prevent privilege escalation and access to host services. Pin base image by digest, maintain SBOM and vulnerability scanning.

Transfer only verified build bytes into the sandbox, with a size cap and no writable shared host paths. Return a size-capped, schema-validated result over a trusted controller-owned channel; do not trust logs or result claims from the game. Treat browser navigation, localhost services and any URLs as untrusted. Preserve QUICK 116-check semantics and result fields; compare known-good fixture output before and after.

**Architecture decision required before implementation:** choose an isolated Linux/container host with enforceable networking, cgroup and storage controls. Ordinary Render web service is not an acceptable fallback. Do not use environment toggles as a substitute for isolation.

## Required acceptance tests before activation

1. A benign browser ZIP completes and produces compatible QUICK results; verify all 116 checks remain represented.
2. Malicious fixture attempts to read `SUPABASE_SERVICE_ROLE_KEY`, `PULSE_RUNNER_SECRET`, filesystem secrets and host mounts: none accessible.
3. Browser attempts public internet, RFC1918, localhost host services, cloud metadata and DNS rebinding: blocked except sandbox-local static server.
4. CPU spin, memory exhaustion, fork bomb and disk/inode exhaustion: contained within explicit quotas; host stays healthy.
5. Browser spawns child/grandchild processes then hangs: all descendants are killed after deadline and after controller crash/restart.
6. ZIP bomb, path traversal and symlink fixtures still rejected before execution.
7. Controller restart, duplicate claim, network interruption and failed report delivery: at-most-one active sandbox per job, durable status, no credential leakage.
8. Invalid/oversized/malicious result payload: rejected; logs scrubbed of sensitive values.
9. Verify the public website has `PULSE_EXECUTION_ENABLED` unset/false and cannot start a sandbox.
10. Independent security review, infrastructure configuration review, and live-host smoke test using harmless fixtures only.

## Release gates

- Phase A: architecture + threat model (this draft).
- Phase B: controller/sandbox implementation, integration tests and evidence on dedicated host.
- Phase C: independent review and manual operator approval.
- Phase D: separately approved deployment and staged activation with rollback.

**This document is not evidence that isolation has been implemented or that PULSE is ready to enable.**
