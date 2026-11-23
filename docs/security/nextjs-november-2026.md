# Next.js November 2026 security verification

Verified against the upstream [November 2026 Next.js security release](https://nextjs.org/blog/november-2026-security-release) on 2026-11-23.

## Dependency state

The `v11` base already pins Next.js `16.4.6` and `eslint-config-next` `16.4.6`. Next.js `16.4.5` is the upstream patched release for this advisory set, so the current framework version includes those fixes. React and React DOM are both pinned to `19.3.0`; the installed dependency tree resolves both to that same version. No dependency version changes were needed.

Next.js `16.x` is Active LTS according to the [Next.js support policy](https://nextjs.org/support-policy).

## Vulnerabilities covered by the patched release

The upstream release describes these seven issues. The security conditions below are the affected application patterns stated by Next.js; this verification does not claim that this application exercises each pattern.

| Advisory | Severity | Issue |
| --- | --- | --- |
| [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) | High | Cross-tenant cache disclosure when Cache Components combine `unstable_cache` and `use cache` while reading root parameters. |
| [GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8) | Medium | Cross-root-parameter disclosure from nested public `use cache` functions when an outer cache entry is stored before inner dependencies are recorded. |
| [GHSA-rhh4-g77r-r9qj](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj) | Medium | Cross-user cache disclosure or poisoning when security-significant binary arguments collide in `use cache` identity. |
| No GHSA listed in the release | Medium | Shared shell cache poisoning in certain self-hosted `next start` applications with Cache Components enabled and Partial Prefetching disabled or unset. |
| [GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385) | Medium | Cross-client response injection or disclosure through stale compressed response framing behind affected HTTP/1.1 reverse-proxy configurations. |
| [GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2) | Medium | Cookie values exposed through `x-middleware-set-cookie` in affected Edge routes. |
| [GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2) | Medium | SVG rejection bypass in image optimization for permitted sources and affected native image backends. |

## Verification

`npm ci` completed successfully in the isolated worktree. The resolved dependency tree contains Next.js and `eslint-config-next` `16.4.6`, with React and React DOM `19.3.0`.

Regression tests, TypeScript, lint, and production-build results are recorded in the accompanying change review. Browser tests requiring `.env.local` or a separately running app and concurrency tests requiring Docker need those local services/configuration to run.
