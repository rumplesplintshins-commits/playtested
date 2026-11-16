# Issue 60: catalogue thumbnails, PR 62 release review

Base v11, independent of PRs 59, 61 and 63. No production database, Storage, RLS or Render configuration was changed.

The release-readiness failure was a test assumption: test-browser-security.mjs read headers()[0], which is now the thumbnail-only cache rule. Installed Next.js documentation confirms matching rules are cumulative; only duplicate header keys override earlier values. The unconditional security rule remains intact. Select that rule by its unconditional /:path* scope in both production and development tests. Actual production HTTP tests verify X-Frame-Options DENY, nosniff, CSP/report-only CSP, permissions/referrer/COOP headers on pages and image files; HSTS is still HTTPS-apex-only, account pages remain private/no-store, and ordinary pages do not inherit image immutable caching.

## Publication audit and correction

The original 70-object Storage inventory was too broad: public bucket readability does not establish catalogue publication. A read-only anonymous-role audit on 16 November 2026 identified 27 publicly visible catalogue source references. It used approved/eligible predicates, metadata completeness, Steam deduplication and beta/hidden exclusions, then checked published listing overrides in batches of at most 12. No image overrides were returned. Only this reviewed publication inventory is retained in lib/catalogue-thumbnail-publication.json.

Remove 43 unverified source mappings and 69 orphan static files from the earlier draft. The release tree now has exactly 27 public mappings and 81 referenced WebPs. None of the excluded object URLs or their unreferenced derivatives remain in the runtime manifest/public directory. Originals remain untouched in Storage and ignored local exports. The generator requires the publication inventory, rejects unknown/hidden/private/unpublished sources, and prunes stale generated files rather than merely unlinking them. CI checks exact manifest/static-file coverage and negative publication cases. This is a point-in-time audit, not automatic visibility synchronisation: refresh it before deployment if publication changes, and remove/rebuild derivatives when retiring public artwork. Previously public immutable assets can remain in browser/CDN caches; these assets must never be treated as private storage.

## Delivery and uploads

The 27 verified originals total 33,409,783 bytes; 640-width variants total 897,492 bytes (97.31% smaller). These replace the superseded 70-object draft measurements. Actual local production delivery for the largest verified source is 3,946,040 bytes versus 70,996 bytes at desktop and 150% zoom-equivalent density, or 148,288 bytes on high-DPI mobile. These are asset/HTTP byte sizes, not billed egress totals.

Prebuilt 320/640/960 WebPs correct orientation, strip metadata, preserve proportions and never upscale. Content-versioned URLs receive one-year immutable headers. Unknown/external URLs retain existing delivery. A failed variant tries the original once, then the placeholder, including failure before hydration. No next/image optimiser, runtime sharp dependency, image decoding/resizing worker, image buffers/cache or new API route is introduced. The runtime addition is a small static URL manifest; serving files still uses ordinary HTTP resources and application-host bandwidth, so absolute zero memory/egress overhead is not claimed. This PR does not change server cache budgets or settings.

Both submission and edit use the same browser-side encoder/uploader: untouched UUID-named original, separate max-960-width WebP, no overwrite. A failed derivative upload keeps the successful original URL. Existing image_url values and originals are not rewritten. Tests verify original file identity, unique paths, immutable metadata, upsert:false, error handling and both callers' shared helper.

Rebuild from approved local sources using: node scripts/prepare-catalogue-thumbnails.mjs inventory.json lib/catalogue-thumbnail-publication.json. Sources are never committed. Never use a bucket listing as publication authority.

## Focused validation

Production build, TypeScript/lint baseline, browser-security, publication boundary, actual WebP decoding, real-browser upload encoding/preservation/failure tests, production response headers and desktop/mobile/150%-equivalent DPR rendering, fallback, and disposable listing-edit regressions pass. The image HTTP harness supports the existing fake CI backend and performs no hosted reads/writes. The release-readiness workflow now runs publication, upload and production image/header regressions in addition to its existing checks. PR 59 compatibility is checked in an isolated local scratch branch; PRs 59/61/63 are not modified.

GO requires green GitHub checks and owner release approval. Do not merge, deploy, mutate production Storage/database or change Render settings as part of this draft.
