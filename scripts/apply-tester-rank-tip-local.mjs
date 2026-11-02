import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "app", "components", "StartPlaytest.tsx");
let source = fs.readFileSync(file, "utf8");

function replaceOnce(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Could not find ${label}. StartPlaytest.tsx may have changed.`);
  source = source.replace(from, to);
}

replaceOnce(
  'import FeedbackUsefulness from "./FeedbackUsefulness";',
  'import FeedbackUsefulness from "./FeedbackUsefulness";\nimport AnonymousTesterLabel from "./AnonymousTesterLabel";',
  "FeedbackUsefulness import"
);

source = source.replaceAll(
  'Playtested tester {index + 1}',
  '<AnonymousTesterLabel testId={response.test_id} number={index + 1} />'
);

source = source.replaceAll(
  'Playtested {index + 1}',
  '<AnonymousTesterLabel testId={response.test_id} number={index + 1} compact />'
);

replaceOnce(
  '  const enjoyedResponses = [',
  '  type TesterFeedbackDisplayItem = { id: string; source: string; sourceClass: string; text: string; testId?: string; testerNumber?: number };\n\n  const enjoyedResponses: TesterFeedbackDisplayItem[] = [',
  "enjoyed display item type"
);
replaceOnce(
  '  const frustrationResponses = [',
  '  const frustrationResponses: TesterFeedbackDisplayItem[] = [',
  "frustration display item type"
);
replaceOnce(
  '  const improvementResponses = [',
  '  const improvementResponses: TesterFeedbackDisplayItem[] = [',
  "improvement display item type"
);

replaceOnce(
  'source: `Playtested ${index + 1}`,\n        sourceClass: "text-[#77f29b]",\n        text: response.enjoyed_most as string,',
  'source: `Playtested ${index + 1}`,\n        sourceClass: "text-[#77f29b]",\n        testId: response.test_id,\n        testerNumber: index + 1,\n        text: response.enjoyed_most as string,',
  "enjoyed tester metadata"
);
replaceOnce(
  'source: `Playtested ${index + 1}`,\n        sourceClass: "text-[#77f29b]",\n        text: response.frustrations as string,',
  'source: `Playtested ${index + 1}`,\n        sourceClass: "text-[#77f29b]",\n        testId: response.test_id,\n        testerNumber: index + 1,\n        text: response.frustrations as string,',
  "frustration tester metadata"
);
replaceOnce(
  'source: `Playtested ${index + 1}`,\n        sourceClass: "text-[#77f29b]",\n        text: response.biggest_improvement as string,',
  'source: `Playtested ${index + 1}`,\n        sourceClass: "text-[#77f29b]",\n        testId: response.test_id,\n        testerNumber: index + 1,\n        text: response.biggest_improvement as string,',
  "improvement tester metadata"
);

source = source.replaceAll(
  '{item.testId && item.testerNumber ? (\n                        <AnonymousTesterLabel testId={item.testId} number={item.testerNumber} compact />\n                      ) : item.source}\n                    </p>',
  '{item.testId && item.testerNumber !== undefined ? (\n                        <AnonymousTesterLabel testId={item.testId} number={item.testerNumber} compact />\n                      ) : item.source}\n                    </p>'
);
source = source.replaceAll(
  '{"testId" in item && item.testId ? (\n                        <AnonymousTesterLabel testId={item.testId} number={item.testerNumber} compact />\n                      ) : item.source}\n                    </p>',
  '{item.testId && item.testerNumber !== undefined ? (\n                        <AnonymousTesterLabel testId={item.testId} number={item.testerNumber} compact />\n                      ) : item.source}\n                    </p>'
);

source = source.replaceAll(
  'id:`independent:${response.test_id}`,source:`Playtested tester ${index+1}${isFeedbackStressTest ? " · includes preview data" : ""}`,date:',
  'id:`independent:${response.test_id}`,source:`Playtested tester ${index+1}${isFeedbackStressTest ? " · includes preview data" : ""}`,testId:response.test_id,testerNumber:index+1,date:'
);

fs.writeFileSync(file, source);
console.log("Tester rank labels wired into all developer feedback tabs for local testing.");
