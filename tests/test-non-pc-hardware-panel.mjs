import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component=readFileSync(new URL("../app/components/GamePcRequirements.tsx",import.meta.url),"utf8");
const tester=readFileSync(new URL("../app/tester/page.tsx",import.meta.url),"utf8");
const detail=readFileSync(new URL("../app/submissions/[id]/page.tsx",import.meta.url),"utf8");

assert(component.includes("platform?:string|null"),"Component must accept recorded game platform");
assert(component.includes('resolvedPlatform!=="steam"&&resolvedPlatform!=="pc"'),"Only actual non-PC platforms skip empty PC panels");
assert(component.includes("if(nonPcGame&&!tiers.length)return null"),"Roblox/Web/mobile cards must not show a no-specs PC panel");
assert(!component.includes("if(nonPcGame)return null"),"Never suppress actual developer-supplied PC specs");
assert(tester.includes('kind="campaign" compact platform={game.platform}'),"Tester Hub must pass its recorded Roblox/Web platform");
assert(detail.includes('id={id} platform={game.platform}'),"Public game details must pass platform");
assert(tester.includes("testerPlatformLabel(game.platform)"),"The existing Roblox badge remains in the card header");
console.log("PASS non-PC platforms hide empty PC hardware panels; existing specs and badges remain");
