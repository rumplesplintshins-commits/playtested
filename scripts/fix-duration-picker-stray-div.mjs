import fs from "node:fs";

const path = "app/components/StartPlaytest.tsx";
let source = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const editNeedle = `                    </label>\n                  </div>\n\n                  {buildLocked && (`;
const editReplacement = `                    </label>\n\n                  {buildLocked && (`;

if (!source.includes(editNeedle)) {
  throw new Error("Exact stray edit-form </div> was not found; no changes made.");
}
source = source.replace(editNeedle, editReplacement);

const publishNeedle = `          </label>\n        </div>\n\n        <label className="block">\n          <span className="text-sm font-medium text-zinc-200">\n            Build / release label`;
const publishReplacement = `          </label>\n\n        <label className="block">\n          <span className="text-sm font-medium text-zinc-200">\n            Build / release label`;

if (!source.includes(publishNeedle)) {
  throw new Error("Exact stray publish-form </div> was not found; no changes made.");
}
source = source.replace(publishNeedle, publishReplacement);

fs.writeFileSync(path, source);
console.log("Removed the two stray closing divs left by the duration-picker replacement.");
