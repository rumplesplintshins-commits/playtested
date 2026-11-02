import fs from "node:fs";

const path = "app/components/StartPlaytest.tsx";
let source = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

// V2 replaced the entire access-method controls with DurationPicker but left the old
// surrounding label/div closures behind. Repair the exact local shape captured by the inspector.
const editBroken = `                  <label className="block">
                    <span className="text-sm font-medium text-zinc-200">
                      How will testers access this build?
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      This controls the action testers see when they start testing.
                    </span>
                    <DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />
                    </label>

                    <label className="block">`;

const editFixed = `                  <div className="block">
                    <span className="text-sm font-medium text-zinc-200">Estimated testing time</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      Set an expectation for how long testers should spend on this round.
                    </span>
                    <DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />
                  </div>

                  <label className="block">`;

const createBroken = `        <label className="block">
          <span className="text-sm font-medium text-zinc-200">
            How will testers access this build?
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Choose the access method so Playtested can show testers the right action.
          </span>
          <DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />
          </label>
        </div>

        <label className="block">`;

const createFixed = `        <div className="block">
          <span className="text-sm font-medium text-zinc-200">Estimated testing time</span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Set an expectation for how long testers should spend on this round.
          </span>
          <DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />
        </div>

        <label className="block">`;

function replaceExact(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  source = source.replace(before, after);
}

replaceExact(editBroken, editFixed, "edit duration block");
replaceExact(createBroken, createFixed, "create duration block");

// V2 inserted this effect before the estimatedMinutes state declaration. Move it below the state
// so the component does not access a block-scoped variable before initialization.
const earlyEffect = `  useEffect(()=>{if(developerPlan.data?.plan !== "pro" && estimatedMinutes && Number(estimatedMinutes) > 30)setEstimatedMinutes("30");},[developerPlan.data?.plan,estimatedMinutes]);\n`;
const stateLine = `  const [estimatedMinutes, setEstimatedMinutes] = useState("30");\n`;
const earlyCount = source.split(earlyEffect).length - 1;
if (earlyCount !== 1) throw new Error(`duration clamp effect: expected exactly 1 match, found ${earlyCount}`);
const stateCount = source.split(stateLine).length - 1;
if (stateCount !== 1) throw new Error(`estimatedMinutes state: expected exactly 1 match, found ${stateCount}`);
source = source.replace(earlyEffect, "");
source = source.replace(stateLine, stateLine + earlyEffect);

// Clamp legacy campaigns when the edit form is populated too, rather than briefly restoring 45+.
const legacySetter = `    setEstimatedMinutes(
      existingPlaytest.estimatedMinutes === null
        ? ""
        : String(existingPlaytest.estimatedMinutes)
    );`;
const clampedSetter = `    setEstimatedMinutes(
      existingPlaytest.estimatedMinutes === null
        ? ""
        : developerPlan.data?.plan !== "pro" && existingPlaytest.estimatedMinutes > 30
          ? "30"
          : String(existingPlaytest.estimatedMinutes)
    );`;
const setterCount = source.split(legacySetter).length - 1;
if (setterCount !== 1) throw new Error(`legacy duration setter: expected exactly 1 match, found ${setterCount}`);
source = source.replace(legacySetter, clampedSetter);

fs.writeFileSync(path, source);
console.log("Repaired exact duration picker JSX and Free legacy-duration clamp.");
