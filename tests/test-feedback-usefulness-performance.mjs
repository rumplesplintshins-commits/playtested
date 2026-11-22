import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page = readFileSync(new URL("../app/components/StartPlaytest.tsx", import.meta.url),"utf8");
const rating = readFileSync(new URL("../app/components/FeedbackUsefulness.tsx", import.meta.url),"utf8");
const sql = readFileSync(new URL("../supabase/migrations/20261122193340_optimize_feedback_usefulness_batch_and_rating_lock.sql", import.meta.url),"utf8");

assert(page.includes('supabase.rpc("get_developer_feedback_usefulness_for_campaign", { p_playtest_id: playtestId })'),"one campaign rating fetch");
assert(page.includes("usefulnessResult] = await Promise.all(["),"ratings fetched concurrently with feedback");
assert(page.includes("setUsefulnessPrefetched(!usefulnessResult.error)"),"fallback when batch fails");
assert(page.includes("setUsefulnessByTest(Object.fromEntries("),"batch results used for badges");
assert(page.includes("initialRating={usefulnessByTest[response.test_id] ?? null}"),"historical saved values passed to form");
assert(page.includes("onUsefulnessChange={onUsefulnessChange}"),"saved rating updates badge without refresh");
assert(page.includes("usefulnessByTest[response.test_id]"),"badge uses stored status");
assert(rating.includes("if (request.prefetched) return;") && rating.indexOf("if (request.prefetched) return;") < rating.indexOf('.rpc("get_test_feedback_usefulness_for_developer"'),"skip per-report reader on success");
assert(rating.includes("matchesRequest ? feedbackState.value : prefetched ? initialRating : null") && rating.includes("matchesRequest ? feedbackState.loading : !prefetched"),"batch rating and loading state stay derived from current props while the fallback loads");
assert(rating.includes("p_reason: next ==="),"not-useful private reason validation preserved");
assert(rating.includes("onRatingChange?.(testId, confirmedValue)"),"badge only updates on confirmed save");
assert(sql.includes("AND c.developer_id=auth.uid()"),"batch restricted to owner");
assert(sql.includes("REVOKE ALL ON FUNCTION public.get_developer_feedback_usefulness_for_campaign(uuid) FROM PUBLIC,anon"),"anonymous cannot call reader");
assert(sql.includes("AFTER INSERT OR UPDATE OF status,review_outcome,replacement_at,playtest_id"),"completion only on capacity-related updates");
assert(sql.includes("AFTER INSERT OR DELETE OR UPDATE OF"),"availability retains delete and insert paths");
assert(!sql.includes("perform public._lock_feedback_review(p_test_id);"),"rating no longer takes campaign capacity lock");
assert(sql.includes("select t.* into v_test from public.community_game_tests t where t.id = p_test_id for update;"),"individual review remains locked");
assert(sql.includes("'tester_feedback_useful'") && sql.includes("'feedback_review'"),"XP and notifications maintained");
console.log("PASS: one batched rating read, safe fallback, useful badge, private negative reason, capacity trigger scoping and XP preservation");
