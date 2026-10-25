import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

/* ============================================================
   PLAYTESTED V5 REPEATABILITY VALIDATION
   ============================================================ */

const RUNS_PER_BENCHMARK = 10;
const PROFILE = "quick";
const CONCURRENCY = 10;
const GAME_TITLE = "Neon Dodge";

const projectRoot = process.cwd();

const workerPath = resolve(
  projectRoot,
  "scripts",
  "technical-test-worker.mjs"
);

const benchmarkDirectory = resolve(
  projectRoot,
  "benchmarks"
);

const technicalResultsDirectory = resolve(
  projectRoot,
  "technical-test-results"
);

const validationResultsDirectory = resolve(
  projectRoot,
  "technical-test-validation-results"
);

/*
 * Expected values are for ONE quick-profile worker execution.
 *
 * errors:
 *   Matches V5 summary.genericDetection.sessionsWithErrors.
 *
 * failedRequests:
 *   Matches V5 summary.genericDetection.sessionsWithFailedRequests.
 *
 * Important:
 * Benchmark 06 intentionally causes a missing HTTP resource.
 * V5 currently counts those sessions in BOTH:
 *   - sessionsWithFailedRequests
 *   - sessionsWithErrors
 *
 * That is the current known V4 reporting behaviour, so the
 * repeatability validator intentionally expects both values.
 */
const BENCHMARKS = [
  {
    id: "01",
    name: "Clean",
    zip: "01-clean.zip",
    expected: {
      launchSuccessful: 50,
      restartSuccessful: 50,
      interactionSuccessful: 10,
      errors: 0,
      failedRequests: 0,
      stalls: 0,
      workerErrors: 0,
      startupGroundTruth: 0,
      restartGroundTruth: 0,
      stallGroundTruth: 0,
      runtimeErrorGroundTruth: 0,
      overall: "PASS",
    },
  },

  {
    id: "02",
    name: "Launch Fault",
    zip: "02-launch-fault.zip",
    expected: {
      launchSuccessful: 45,
      restartSuccessful: 50,
      interactionSuccessful: 10,
      errors: 0,
      failedRequests: 0,
      stalls: 0,
      workerErrors: 0,
      startupGroundTruth: 5,
      restartGroundTruth: 0,
      stallGroundTruth: 0,
      runtimeErrorGroundTruth: 0,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "03",
    name: "Restart Fault",
    zip: "03-restart-fault.zip",
    expected: {
      launchSuccessful: 50,
      restartSuccessful: 45,
      interactionSuccessful: 10,
      errors: 0,
      failedRequests: 0,
      stalls: 0,
      workerErrors: 0,
      startupGroundTruth: 0,
      restartGroundTruth: 5,
      stallGroundTruth: 0,
      runtimeErrorGroundTruth: 0,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "04",
    name: "Stall Fault",
    zip: "04-stall-fault.zip",
    expected: {
      launchSuccessful: 50,
      restartSuccessful: 50,
      interactionSuccessful: 10,
      errors: 0,
      failedRequests: 0,
      stalls: 3,
      workerErrors: 0,
      startupGroundTruth: 0,
      restartGroundTruth: 0,
      stallGroundTruth: 3,
      runtimeErrorGroundTruth: 0,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "05",
    name: "Runtime Error",
    zip: "05-runtime-error.zip",
    expected: {
      launchSuccessful: 50,
      restartSuccessful: 50,
      interactionSuccessful: 10,
      errors: 3,
      failedRequests: 0,
      stalls: 0,
      workerErrors: 0,
      startupGroundTruth: 0,
      restartGroundTruth: 0,
      stallGroundTruth: 0,
      runtimeErrorGroundTruth: 3,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "06",
    name: "Load Fault",
    zip: "06-load-fault.zip",
    expected: {
      launchSuccessful: 50,
      restartSuccessful: 50,
      interactionSuccessful: 10,
      errors: 116,
      failedRequests: 116,
      stalls: 0,
      workerErrors: 0,
      startupGroundTruth: 0,
      restartGroundTruth: 0,
      stallGroundTruth: 0,
      runtimeErrorGroundTruth: 0,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "07",
    name: "Interaction Fault",
    zip: "07-interaction-fault.zip",
    expected: {
      launchSuccessful: 50,
      restartSuccessful: 50,
      interactionSuccessful: 0,
      errors: 0,
      failedRequests: 0,
      stalls: 0,
      workerErrors: 0,
      startupGroundTruth: 0,
      restartGroundTruth: 0,
      stallGroundTruth: 0,
      runtimeErrorGroundTruth: 0,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "08",
    name: "Mixed Fault",
    zip: "08-mixed-fault.zip",
    expected: {
      launchSuccessful: 45,
      restartSuccessful: 45,
      interactionSuccessful: 10,
      errors: 1,
      failedRequests: 0,
      stalls: 2,
      workerErrors: 0,
      startupGroundTruth: 5,
      restartGroundTruth: 5,
      stallGroundTruth: 2,
      runtimeErrorGroundTruth: 1,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "09",
    name: "Rare Fault",
    zip: "09-rare-fault.zip",
    expected: {
      launchSuccessful: 49,
      restartSuccessful: 49,
      interactionSuccessful: 10,
      errors: 0,
      failedRequests: 0,
      stalls: 1,
      workerErrors: 0,
      startupGroundTruth: 1,
      restartGroundTruth: 1,
      stallGroundTruth: 1,
      runtimeErrorGroundTruth: 0,
      overall: "ISSUES DETECTED",
    },
  },

  {
    id: "10",
    name: "Heavy Fault",
    zip: "10-heavy-fault.zip",
    expected: {
      launchSuccessful: 25,
      restartSuccessful: 25,
      interactionSuccessful: 10,
      errors: 3,
      failedRequests: 0,
      stalls: 4,
      workerErrors: 0,
      startupGroundTruth: 25,
      restartGroundTruth: 25,
      stallGroundTruth: 4,
      runtimeErrorGroundTruth: 3,
      overall: "ISSUES DETECTED",
    },
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function wait(milliseconds) {
  return new Promise((resolveWait) => {
    setTimeout(resolveWait, milliseconds);
  });
}

function getJsonReports() {
  if (!existsSync(technicalResultsDirectory)) {
    return [];
  }

  return readdirSync(technicalResultsDirectory)
    .filter((fileName) => {
      return (
        fileName.startsWith("technical-test-") &&
        fileName.endsWith(".json")
      );
    })
    .map((fileName) => {
      const fullPath = join(
        technicalResultsDirectory,
        fileName
      );

      return {
        fileName,
        fullPath,
      };
    });
}

function readJson(filePath) {
  return JSON.parse(
    readFileSync(filePath, "utf8")
  );
}

function getReportForBuild(buildLabel) {
  const reports = getJsonReports();

  const matches = [];

  for (const reportFile of reports) {
    try {
      const report = readJson(
        reportFile.fullPath
      );

      if (
        report?.build?.label === buildLabel
      ) {
        matches.push({
          ...reportFile,
          report,
        });
      }
    } catch {
      // Ignore invalid/unrelated JSON files.
    }
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => {
    const aTime = new Date(
      a.report.generatedAt ?? 0
    ).getTime();

    const bTime = new Date(
      b.report.generatedAt ?? 0
    ).getTime();

    return bTime - aTime;
  });

  return matches[0];
}

function runWorker({
  zipPath,
  buildLabel,
}) {
  return new Promise(
    (resolveRun, rejectRun) => {
      const args = [
        workerPath,
        `--zip=${zipPath}`,
        `--game=${GAME_TITLE}`,
        `--build=${buildLabel}`,
        `--profile=${PROFILE}`,
        `--concurrency=${CONCURRENCY}`,
      ];

      const child = spawn(
        process.execPath,
        args,
        {
          cwd: projectRoot,
          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on(
        "data",
        (chunk) => {
          const text = chunk.toString();
          stdout += text;
          process.stdout.write(text);
        }
      );

      child.stderr.on(
        "data",
        (chunk) => {
          const text = chunk.toString();
          stderr += text;
          process.stderr.write(text);
        }
      );

      child.on(
        "error",
        rejectRun
      );

      child.on(
        "close",
        (exitCode) => {
          resolveRun({
            exitCode,
            stdout,
            stderr,
          });
        }
      );
    }
  );
}

function compareValue(
  differences,
  label,
  actual,
  expected
) {
  if (actual !== expected) {
    differences.push({
      field: label,
      expected,
      actual,
    });
  }
}

function validateReport(
  benchmark,
  report
) {
  const differences = [];

  const summary = report?.summary;

  if (!summary) {
    return {
      passed: false,
      differences: [
        {
          field: "summary",
          expected: "present",
          actual: "missing",
        },
      ],
    };
  }

  const expected =
    benchmark.expected;

  compareValue(
    differences,
    "totalChecks",
    summary.totalChecks,
    116
  );

  compareValue(
    differences,
    "launchSuccessful",
    summary.launchReliability
      ?.successful,
    expected.launchSuccessful
  );

  compareValue(
    differences,
    "restartSuccessful",
    summary.restartReliability
      ?.successful,
    expected.restartSuccessful
  );

  compareValue(
    differences,
    "interactionSuccessful",
    summary.interaction?.successful,
    expected.interactionSuccessful
  );

  compareValue(
    differences,
    "sessionsWithErrors",
    summary.genericDetection
      ?.sessionsWithErrors,
    expected.errors
  );

  compareValue(
    differences,
    "sessionsWithFailedRequests",
    summary.genericDetection
      ?.sessionsWithFailedRequests,
    expected.failedRequests
  );

  compareValue(
    differences,
    "sessionsWithStalls",
    summary.genericDetection
      ?.sessionsWithStalls,
    expected.stalls
  );

  compareValue(
    differences,
    "sessionsWithWorkerErrors",
    summary.genericDetection
      ?.sessionsWithWorkerErrors,
    expected.workerErrors
  );

  compareValue(
    differences,
    "groundTruth.startupFailures",
    summary.benchmarkGroundTruth
      ?.sessionsWithStartupFailure,
    expected.startupGroundTruth
  );

  compareValue(
    differences,
    "groundTruth.restartFailures",
    summary.benchmarkGroundTruth
      ?.sessionsWithRestartFailure,
    expected.restartGroundTruth
  );

  compareValue(
    differences,
    "groundTruth.stalls",
    summary.benchmarkGroundTruth
      ?.sessionsWithStall,
    expected.stallGroundTruth
  );

  compareValue(
    differences,
    "groundTruth.runtimeErrors",
    summary.benchmarkGroundTruth
      ?.sessionsWithRuntimeError,
    expected.runtimeErrorGroundTruth
  );

  compareValue(
    differences,
    "overall",
    summary.result,
    expected.overall
  );

  return {
    passed:
      differences.length === 0,

    differences,
  };
}

function printDifferences(
  differences
) {
  for (const difference of differences) {
    console.log(
      `    ${difference.field}: expected ${JSON.stringify(
        difference.expected
      )}, got ${JSON.stringify(
        difference.actual
      )}`
    );
  }
}

/* ============================================================
   PRE-FLIGHT
   ============================================================ */

function validateEnvironment() {
  if (!existsSync(workerPath)) {
    throw new Error(
      `Worker not found: ${workerPath}`
    );
  }

  for (const benchmark of BENCHMARKS) {
    const zipPath = resolve(
      benchmarkDirectory,
      benchmark.zip
    );

    if (!existsSync(zipPath)) {
      throw new Error(
        `Benchmark ZIP not found: ${zipPath}`
      );
    }
  }

  mkdirSync(
    technicalResultsDirectory,
    {
      recursive: true,
    }
  );

  mkdirSync(
    validationResultsDirectory,
    {
      recursive: true,
    }
  );
}

/* ============================================================
   MAIN VALIDATION
   ============================================================ */

async function main() {
  validateEnvironment();

  const validationStartedAt =
    Date.now();

  const validationId =
    timestamp();

  const results = [];

  const totalRuns =
    BENCHMARKS.length *
    RUNS_PER_BENCHMARK;

  const totalChecks =
    totalRuns * 116;

  console.log("");
  console.log(
    "PLAYTESTED V5 REPEATABILITY VALIDATION"
  );
  console.log(
    "--------------------------------------"
  );
  console.log(
    `Benchmarks:          ${BENCHMARKS.length}`
  );
  console.log(
    `Runs per benchmark:  ${RUNS_PER_BENCHMARK}`
  );
  console.log(
    `Independent runs:    ${totalRuns}`
  );
  console.log(
    `Checks per run:      116`
  );
  console.log(
    `Planned checks:      ${totalChecks}`
  );
  console.log(
    `Profile:             ${PROFILE}`
  );
  console.log(
    `Concurrency/run:     ${CONCURRENCY}`
  );
  console.log("");
  console.log(
    "Runs are sequential to avoid cross-run resource contention."
  );
  console.log("");

  let globalRunNumber = 0;

  for (const benchmark of BENCHMARKS) {
    const zipPath = resolve(
      benchmarkDirectory,
      benchmark.zip
    );

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      `BENCHMARK ${benchmark.id}: ${benchmark.name}`
    );
    console.log(
      "========================================"
    );

    for (
      let repetition = 1;
      repetition <=
      RUNS_PER_BENCHMARK;
      repetition += 1
    ) {
      globalRunNumber += 1;

      const buildLabel =
        `V5 Repeatability B${benchmark.id} ` +
        `Run ${String(repetition).padStart(
          2,
          "0"
        )} ` +
        `[${validationId}]`;

      console.log("");
      console.log(
        `VALIDATION RUN ${globalRunNumber}/${totalRuns}`
      );
      console.log(
        `Benchmark: ${benchmark.id} ${benchmark.name}`
      );
      console.log(
        `Repetition: ${repetition}/${RUNS_PER_BENCHMARK}`
      );
      console.log("");

      const runStartedAt =
        Date.now();

      let processResult;

      try {
        processResult =
          await runWorker({
            zipPath,
            buildLabel,
          });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.log("");
        console.log(
          `VALIDATION RESULT: FAIL`
        );
        console.log(
          `Worker could not be started: ${message}`
        );

        results.push({
          benchmarkId:
            benchmark.id,

          benchmarkName:
            benchmark.name,

          repetition,

          buildLabel,

          passed: false,

          processExitCode: null,

          reportPath: null,

          databaseRunId: null,

          durationMs:
            Date.now() -
            runStartedAt,

          differences: [
            {
              field:
                "workerProcess",

              expected:
                "completed",

              actual:
                message,
            },
          ],
        });

        continue;
      }

      /*
       * Give the filesystem a moment to
       * settle before reading the report.
       */
      await wait(100);

      const reportMatch =
        getReportForBuild(
          buildLabel
        );

      if (!reportMatch) {
        console.log("");
        console.log(
          "VALIDATION RESULT: FAIL"
        );
        console.log(
          "Could not locate the JSON report for this run."
        );

        results.push({
          benchmarkId:
            benchmark.id,

          benchmarkName:
            benchmark.name,

          repetition,

          buildLabel,

          passed: false,

          processExitCode:
            processResult.exitCode,

          reportPath: null,

          databaseRunId: null,

          durationMs:
            Date.now() -
            runStartedAt,

          differences: [
            {
              field:
                "jsonReport",

              expected:
                "present",

              actual:
                "missing",
            },
          ],
        });

        continue;
      }

      const validation =
        validateReport(
          benchmark,
          reportMatch.report
        );

      const processPassed =
        processResult.exitCode === 0;

      const passed =
        processPassed &&
        validation.passed;

      const differences = [
        ...validation.differences,
      ];

      if (!processPassed) {
        differences.unshift({
          field:
            "workerExitCode",

          expected: 0,

          actual:
            processResult.exitCode,
        });
      }

      console.log("");
      console.log(
        passed
          ? "VALIDATION RESULT: EXACT MATCH"
          : "VALIDATION RESULT: MISMATCH"
      );

      if (
        differences.length > 0
      ) {
        printDifferences(
          differences
        );
      }

      results.push({
        benchmarkId:
          benchmark.id,

        benchmarkName:
          benchmark.name,

        repetition,

        buildLabel,

        passed,

        processExitCode:
          processResult.exitCode,

        reportPath:
          reportMatch.fullPath,

        databaseRunId:
          reportMatch.report
            .databaseRunId ??
          null,

        durationMs:
          Date.now() -
          runStartedAt,

        actual: {
          totalChecks:
            reportMatch.report
              .summary
              ?.totalChecks,

          launchSuccessful:
            reportMatch.report
              .summary
              ?.launchReliability
              ?.successful,

          restartSuccessful:
            reportMatch.report
              .summary
              ?.restartReliability
              ?.successful,

          interactionSuccessful:
            reportMatch.report
              .summary
              ?.interaction
              ?.successful,

          errors:
            reportMatch.report
              .summary
              ?.genericDetection
              ?.sessionsWithErrors,

          failedRequests:
            reportMatch.report
              .summary
              ?.genericDetection
              ?.sessionsWithFailedRequests,

          stalls:
            reportMatch.report
              .summary
              ?.genericDetection
              ?.sessionsWithStalls,

          workerErrors:
            reportMatch.report
              .summary
              ?.genericDetection
              ?.sessionsWithWorkerErrors,

          startupGroundTruth:
            reportMatch.report
              .summary
              ?.benchmarkGroundTruth
              ?.sessionsWithStartupFailure,

          restartGroundTruth:
            reportMatch.report
              .summary
              ?.benchmarkGroundTruth
              ?.sessionsWithRestartFailure,

          stallGroundTruth:
            reportMatch.report
              .summary
              ?.benchmarkGroundTruth
              ?.sessionsWithStall,

          runtimeErrorGroundTruth:
            reportMatch.report
              .summary
              ?.benchmarkGroundTruth
              ?.sessionsWithRuntimeError,

          overall:
            reportMatch.report
              .summary
              ?.result,
        },

        expected:
          benchmark.expected,

        differences,
      });
    }
  }

  /* ==========================================================
     FINAL SUMMARY
     ========================================================== */

  const passedRuns =
    results.filter(
      (result) => result.passed
    ).length;

  const failedRuns =
    results.length -
    passedRuns;

  const benchmarkSummaries =
    BENCHMARKS.map(
      (benchmark) => {
        const benchmarkRuns =
          results.filter(
            (result) =>
              result.benchmarkId ===
              benchmark.id
          );

        const passed =
          benchmarkRuns.filter(
            (result) =>
              result.passed
          ).length;

        return {
          id: benchmark.id,
          name: benchmark.name,

          runs:
            benchmarkRuns.length,

          passed,

          failed:
            benchmarkRuns.length -
            passed,

          repeatabilityPercent:
            benchmarkRuns.length > 0
              ? Number(
                  (
                    (passed /
                      benchmarkRuns.length) *
                    100
                  ).toFixed(1)
                )
              : 0,
        };
      }
    );

  const validationDurationMs =
    Date.now() -
    validationStartedAt;

  const finalReport = {
    schemaVersion: 1,

    validationId,

    generatedAt:
      new Date().toISOString(),

    workerVersion:
      "v5",

    configuration: {
      game:
        GAME_TITLE,

      profile:
        PROFILE,

      concurrency:
        CONCURRENCY,

      benchmarks:
        BENCHMARKS.length,

      runsPerBenchmark:
        RUNS_PER_BENCHMARK,

      plannedRuns:
        totalRuns,

      plannedChecks:
        totalChecks,

      executionMode:
        "sequential-independent-worker-processes",
    },

    summary: {
      completedRuns:
        results.length,

      passedRuns,

      failedRuns,

      exactMatchRate:
        results.length > 0
          ? Number(
              (
                (passedRuns /
                  results.length) *
                100
              ).toFixed(2)
            )
          : 0,

      completedChecks:
        results.length * 116,

      durationMs:
        validationDurationMs,

      allRunsExact:
        results.length ===
          totalRuns &&
        failedRuns === 0,
    },

    benchmarks:
      benchmarkSummaries,

    runs:
      results,
  };

  const outputPath = join(
    validationResultsDirectory,
    `v5-repeatability-${validationId}.json`
  );

  writeFileSync(
    outputPath,
    JSON.stringify(
      finalReport,
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "PLAYTESTED V5 VALIDATION COMPLETE"
  );
  console.log(
    "========================================"
  );
  console.log(
    `Independent runs: ${results.length}/${totalRuns}`
  );
  console.log(
    `Exact matches:    ${passedRuns}/${results.length}`
  );
  console.log(
    `Mismatches:       ${failedRuns}`
  );
  console.log(
    `Checks executed:  ${results.length * 116}`
  );
  console.log(
    `Duration:         ${(validationDurationMs / 60000).toFixed(
      1
    )} minutes`
  );
  console.log("");

  for (
    const benchmark of
    benchmarkSummaries
  ) {
    console.log(
      `${benchmark.id} ${benchmark.name.padEnd(
        20
      )} ${benchmark.passed}/${benchmark.runs} exact (${benchmark.repeatabilityPercent}%)`
    );
  }

  console.log("");

  if (
    finalReport.summary
      .allRunsExact
  ) {
    console.log(
      "FINAL RESULT: 100/100 RUNS MATCHED EXPECTED RESULTS"
    );
  } else {
    console.log(
      `FINAL RESULT: ${failedRuns} RUN(S) DID NOT MATCH EXPECTED RESULTS`
    );
  }

  console.log("");
  console.log(
    `Validation report: ${outputPath}`
  );
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error(
    "VALIDATION RUNNER FAILED"
  );
  console.error(
    "------------------------"
  );
  console.error(
    error instanceof Error
      ? error.stack
      : String(error)
  );
  console.error("");

  process.exit(1);
});
