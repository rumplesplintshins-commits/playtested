import { chromium } from "playwright";

import AdmZip from "adm-zip";

import {

  createReadStream,

  existsSync,

  mkdirSync,

  readFileSync,

  rmSync,

  statSync,

  writeFileSync,

} from "node:fs";

import { createServer } from "node:http";

import { extname, join, normalize, resolve } from "node:path";

import { tmpdir } from "node:os";



const WORKER_VERSION = "v4";

const REPORT_SCHEMA_VERSION = 4;



/* ============================================================

   TEST TIMINGS

   ============================================================ */



const SAMPLE_INTERVAL_MS = 100;

const STALL_THRESHOLD_MS = 550;



const LAUNCH_SETTLE_MS = 250;

const RESTART_SETTLE_MS = 250;



const INTERACTION_OBSERVATION_MS = 1200;

const STABILITY_OBSERVATION_MS = 3000;

const SOAK_OBSERVATION_MS = 10000;



/* ============================================================

   PROFILES

   ============================================================ */



const PROFILES = {

  quick: {

    launch: 50,

    restart: 50,

    interaction: 10,

    stability: 5,

    soak: 1,

  },



  standard: {

    launch: 250,

    restart: 250,

    interaction: 50,

    stability: 25,

    soak: 5,

  },



  deep: {

    launch: 500,

    restart: 500,

    interaction: 100,

    stability: 50,

    soak: 10,

  },

};



const DEFAULT_PROFILE = "standard";

const DEFAULT_CONCURRENCY = 10;



/* ============================================================

   GLOBAL STATE

   ============================================================ */



let currentDatabaseRunId = null;

let supabaseUrl = null;

let supabaseServiceRoleKey = null;



/* ============================================================

   ARGUMENTS

   ============================================================ */



function getArg(name, fallback = null) {

  const prefix = `--${name}=`;



  const argument = process.argv.find((item) =>

    item.startsWith(prefix)

  );



  if (!argument) {

    return fallback;

  }



  return argument.slice(prefix.length);

}



function getNumberArg(name, fallback, min, max) {

  const rawValue = getArg(name);



  if (rawValue === null) {

    return fallback;

  }



  const value = Number(rawValue);



  if (!Number.isFinite(value)) {

    throw new Error(`--${name} must be a number.`);

  }



  return Math.max(

    min,

    Math.min(max, Math.floor(value))

  );

}



const zipArgument = getArg("zip");



const gameTitle = getArg(

  "game",

  "Neon Dodge"

);



const buildLabel = getArg(

  "build",

  "Automated Technical Test"

);



const profileName = getArg(

  "profile",

  DEFAULT_PROFILE

).toLowerCase();



if (!PROFILES[profileName]) {

  console.error("");

  console.error(

    `Unknown profile "${profileName}".`

  );

  console.error(

    "Available profiles: quick, standard, deep"

  );

  console.error("");



  process.exit(1);

}



if (!zipArgument) {

  console.error("");

  console.error("Missing --zip argument.");

  console.error("");

  console.error("Example:");

  console.error(

    'node scripts/technical-test-worker.mjs --zip="C:\\\Users\\\OWNER\\\Downloads\\\playtested-neon-dodge-faulty-build-0.1.zip" --game="Neon Dodge" --build="Fault Build 0.1" --profile=quick'

  );

  console.error("");



  process.exit(1);

}



const zipPath = resolve(zipArgument);



const concurrency = getNumberArg(

  "concurrency",

  DEFAULT_CONCURRENCY,

  1,

  20

);



if (

  !existsSync(zipPath) ||

  !statSync(zipPath).isFile()

) {

  console.error("");

  console.error(`ZIP not found: ${zipPath}`);

  console.error("");



  process.exit(1);

}



const profile = PROFILES[profileName];



const totalChecks =

  profile.launch +

  profile.restart +

  profile.interaction +

  profile.stability +

  profile.soak;



const timestampId = new Date()

  .toISOString()

  .replace(/[:.]/g, "-");



const extractDirectory = join(

  tmpdir(),

  `playtested-technical-test-${timestampId}`

);



const reportDirectory = resolve(

  "technical-test-results"

);



const reportPath = join(

  reportDirectory,

  `technical-test-${timestampId}.json`

);



mkdirSync(extractDirectory, {

  recursive: true,

});



mkdirSync(reportDirectory, {

  recursive: true,

});



/* ============================================================

   GENERAL HELPERS

   ============================================================ */



function wait(milliseconds) {

  return new Promise((resolveWait) => {

    setTimeout(resolveWait, milliseconds);

  });

}



function percentage(part, total) {

  if (!total) {

    return 0;

  }



  return Number(

    ((part / total) * 100).toFixed(1)

  );

}



function median(values) {

  const validValues = values

    .filter((value) => Number.isFinite(value))

    .sort((a, b) => a - b);



  if (validValues.length === 0) {

    return null;

  }



  const middle = Math.floor(

    validValues.length / 2

  );



  if (validValues.length % 2 === 0) {

    return Math.round(

      (

        validValues[middle - 1] +

        validValues[middle]

      ) / 2

    );

  }



  return validValues[middle];

}



function formatDuration(milliseconds) {

  if (!Number.isFinite(milliseconds)) {

    return "n/a";

  }



  if (milliseconds < 1000) {

    return `${milliseconds}ms`;

  }



  return `${(milliseconds / 1000).toFixed(1)}s`;

}



function createSeed(

  family,

  familyIndex

) {

  const familyOffsets = {

    launch: 100000,

    restart: 200000,

    interaction: 300000,

    stability: 400000,

    soak: 500000,

  };



  return (

    familyOffsets[family] +

    familyIndex * 7919

  );

}



/* ============================================================

   ENVIRONMENT

   ============================================================ */



function loadEnvironmentFile() {

  const envPath = resolve(".env.local");



  if (!existsSync(envPath)) {

    throw new Error(

      `.env.local was not found at ${envPath}`

    );

  }



  const contents = readFileSync(

    envPath,

    "utf8"

  );



  const lines = contents.split(/\r?\n/);



  for (const rawLine of lines) {

    const line = rawLine.trim();



    if (

      !line ||

      line.startsWith("#")

    ) {

      continue;

    }



    const separatorIndex =

      line.indexOf("=");



    if (separatorIndex === -1) {

      continue;

    }



    const key = line

      .slice(0, separatorIndex)

      .trim();



    let value = line

      .slice(separatorIndex + 1)

      .trim();



    if (

      (value.startsWith('"') &&

        value.endsWith('"')) ||

      (value.startsWith("'") &&

        value.endsWith("'"))

    ) {

      value = value.slice(1, -1);

    }



    if (

      key &&

      process.env[key] === undefined

    ) {

      process.env[key] = value;

    }

  }

}



function initialiseSupabaseEnvironment() {

  loadEnvironmentFile();



  supabaseUrl =

    process.env.NEXT_PUBLIC_SUPABASE_URL ||

    process.env.SUPABASE_URL;



  supabaseServiceRoleKey =

    process.env.SUPABASE_SERVICE_ROLE_KEY;



  if (!supabaseUrl) {

    throw new Error(

      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in .env.local."

    );

  }



  if (!supabaseServiceRoleKey) {

    throw new Error(

      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local."

    );

  }



  supabaseUrl =

    supabaseUrl.replace(/\/+$/, "");

}



/* ============================================================

   SUPABASE REST

   ============================================================ */



async function supabaseRequest(

  path,

  options = {}

) {

  const {

    method = "GET",

    body = undefined,

    headers = {},

  } = options;



  const response = await fetch(

    `${supabaseUrl}/rest/v1/${path}`,

    {

      method,



      headers: {

        apikey:

          supabaseServiceRoleKey,



        Authorization:

          `Bearer ${supabaseServiceRoleKey}`,



        "Content-Type":

          "application/json",



        ...headers,

      },



      body:

        body === undefined

          ? undefined

          : JSON.stringify(body),

    }

  );



  const responseText =

    await response.text();



  let responseBody = null;



  if (responseText) {

    try {

      responseBody =

        JSON.parse(responseText);

    } catch {

      responseBody =

        responseText;

    }

  }



  if (!response.ok) {

    throw new Error(

      `Supabase request failed (${response.status} ${response.statusText}): ${

        typeof responseBody === "string"

          ? responseBody

          : JSON.stringify(responseBody)

      }`

    );

  }



  return responseBody;

}



async function findGameByTitle(title) {

  const encodedTitle =

    encodeURIComponent(title);



  const submissions =

    await supabaseRequest(

      `game_submissions?select=id,title,status&title=eq.${encodedTitle}&limit=2`

    );



  if (

    Array.isArray(submissions) &&

    submissions.length === 1

  ) {

    return {

      sourceType: "submission",

      id: submissions[0].id,

      title: submissions[0].title,

    };

  }



  if (

    Array.isArray(submissions) &&

    submissions.length > 1

  ) {

    throw new Error(

      `More than one game submission named "${title}" was found.`

    );

  }



  const importedGames =

    await supabaseRequest(

      `imported_games?select=id,title,steam_app_id&title=eq.${encodedTitle}&limit=2`

    );



  if (

    Array.isArray(importedGames) &&

    importedGames.length === 1

  ) {

    return {

      sourceType: "imported",

      id: importedGames[0].id,

      title: importedGames[0].title,

      steamAppId:

        importedGames[0].steam_app_id,

    };

  }



  if (

    Array.isArray(importedGames) &&

    importedGames.length > 1

  ) {

    throw new Error(

      `More than one imported Steam game named "${title}" was found.`

    );

  }



  throw new Error(

    `Could not find "${title}" in game_submissions or imported_games.`

  );

}



async function createTechnicalTestRun(game) {

  const payload = {

    imported_game_id:

      game.sourceType === "imported"

        ? game.id

        : null,



    approved_game_id: null,



    submission_id:

      game.sourceType === "submission"

        ? game.id

        : null,



    build_label: buildLabel,



    build_file_name:

      zipPath

        .split(/[\\/]/)

        .pop(),



    build_source:

      "local_zip",



    worker_version:

      WORKER_VERSION,



    test_type:

      "browser-build-technical-test-suite",



    status: "running",



    requested_sessions:

      totalChecks,



    completed_sessions: 0,



    concurrency,



    started_at:

      new Date().toISOString(),



    summary_json: {

      profile:

        profileName,



      plannedChecks:

        profile,



      totalPlannedChecks:

        totalChecks,

    },

  };



  const rows =

    await supabaseRequest(

      "technical_test_runs",

      {

        method: "POST",



        headers: {

          Prefer:

            "return=representation",

        },



        body: payload,

      }

    );



  if (

    !Array.isArray(rows) ||

    rows.length !== 1

  ) {

    throw new Error(

      "Supabase did not return the created technical test run."

    );

  }



  currentDatabaseRunId =

    rows[0].id;



  return rows[0];

}



async function updateTechnicalTestRun(

  runId,

  payload

) {

  await supabaseRequest(

    `technical_test_runs?id=eq.${encodeURIComponent(

      runId

    )}`,

    {

      method: "PATCH",



      headers: {

        Prefer:

          "return=minimal",

      },



      body: payload,

    }

  );

}



async function insertTechnicalTestSessions(

  runId,

  results

) {

  const rows = results.map(

    (result) => ({

      run_id:

        runId,



      /*

       * This is intentionally GLOBAL rather

       * than restarting at 1 for each family.

       *

       * The existing DB constraint is:

       * unique(run_id, session_number)

       */

      session_number:

        result.globalSessionNumber,



      test_family:

        result.testFamily,



      seed:

        result.seed,



      duration_ms:

        result.durationMs,



      load_ms:

        result.loadMs,



      build_loaded:

        result.buildLoaded,



      start_succeeded:

        result.startSucceeded,



      restart_succeeded:

        result.restartSucceeded,



      start_status:

        result.startStatus ||

        null,



      restart_status:

        result.restartStatus ||

        null,



      stall_detected:

        result

          .genericObservations

          .stallDetected,



      console_errors:

        result

          .genericObservations

          .consoleErrors,



      page_errors:

        result

          .genericObservations

          .pageErrors,



      failed_requests:

        result

          .genericObservations

          .failedRequests,



      fatal_error:

        result

          .genericObservations

          .fatalError,



      benchmark_startup_failures:

        result

          .benchmarkGroundTruth

          .startupFailures,



      benchmark_restart_failures:

        result

          .benchmarkGroundTruth

          .restartFailures,



      benchmark_simulation_stalls:

        result

          .benchmarkGroundTruth

          .simulationStalls,



      benchmark_runtime_errors:

        result

          .benchmarkGroundTruth

          .runtimeErrors,



      benchmark_run_starts:

        result

          .benchmarkGroundTruth

          .runStarts,



      benchmark_run_ends:

        result

          .benchmarkGroundTruth

          .runEnds,



      observation_json: {

        familyIndex:

          result.familyIndex,



        testFamily:

          result.testFamily,



        interactionSucceeded:

          result.interactionSucceeded,



        genericObservations:

          result.genericObservations,

      },



      telemetry_json:

        result.telemetryEvents,

    })

  );



  const chunkSize = 100;



  for (

    let start = 0;

    start < rows.length;

    start += chunkSize

  ) {

    const chunk =

      rows.slice(

        start,

        start + chunkSize

      );



    await supabaseRequest(

      "technical_test_sessions",

      {

        method: "POST",



        headers: {

          Prefer:

            "return=minimal",

        },



        body: chunk,

      }

    );

  }

}



/* ============================================================

   LOCAL BUILD SERVER

   ============================================================ */



function getContentType(filePath) {

  switch (

    extname(filePath).toLowerCase()

  ) {

    case ".html":

      return "text/html; charset=utf-8";



    case ".js":

      return "text/javascript; charset=utf-8";



    case ".css":

      return "text/css; charset=utf-8";



    case ".json":

      return "application/json; charset=utf-8";



    case ".png":

      return "image/png";



    case ".jpg":

    case ".jpeg":

      return "image/jpeg";



    case ".svg":

      return "image/svg+xml";



    case ".webp":

      return "image/webp";



    case ".wav":

      return "audio/wav";



    case ".mp3":

      return "audio/mpeg";



    default:

      return "application/octet-stream";

  }

}



function startStaticServer(rootDirectory) {

  return new Promise(

    (

      resolveServer,

      rejectServer

    ) => {

      const server =

        createServer(

          (

            request,

            response

          ) => {

            try {

              const requestUrl =

                new URL(

                  request.url ?? "/",

                  "http\://127.0.0.1"

                );



              const decodedPath =

                decodeURIComponent(

                  requestUrl.pathname

                );



              const requestedPath =

                decodedPath === "/"

                  ? "/index.html"

                  : decodedPath;



              const safeRelativePath =

                normalize(

                  requestedPath

                )

                  .replace(

                    /^(\.\.(\/|\\|$))+/,

                    ""

                  )

                  .replace(

                    /^[\/\\]+/,

                    ""

                  );



              const filePath =

                resolve(

                  rootDirectory,

                  safeRelativePath

                );



              const rootPath =

                resolve(

                  rootDirectory

                );



              const isInsideRoot =

                filePath === rootPath ||

                filePath.startsWith(

                  `${rootPath}\\`

                ) ||

                filePath.startsWith(

                  `${rootPath}/`

                );



              if (!isInsideRoot) {

                response.writeHead(403);

                response.end("Forbidden");

                return;

              }



              if (

                !existsSync(filePath) ||

                !statSync(filePath).isFile()

              ) {

                response.writeHead(404);

                response.end("Not found");

                return;

              }



              response.writeHead(

                200,

                {

                  "Content-Type":

                    getContentType(

                      filePath

                    ),



                  "Cache-Control":

                    "no-store",

                }

              );



              createReadStream(

                filePath

              ).pipe(response);

            } catch {

              response.writeHead(500);

              response.end(

                "Server error"

              );

            }

          }

        );



      server.once(

        "error",

        rejectServer

      );



      server.listen(

        0,

        "127.0.0.1",

        () => {

          const address =

            server.address();



          if (

            !address ||

            typeof address ===

              "string"

          ) {

            rejectServer(

              new Error(

                "Could not determine local test server port."

              )

            );



            return;

          }



          resolveServer({

            server,



            url:

              `http\://127.0.0.1:` +

              `${address.port}/`,

          });

        }

      );

    }

  );

}



function closeServer(server) {

  return new Promise(

    (resolveClose) => {

      server.close(() => {

        resolveClose();

      });

    }

  );

}



/* ============================================================

   PAGE / GAME HELPERS

   ============================================================ */



async function readGameState(page) {

  return page.evaluate(() => {

    const statusText =

      document

        .querySelector("#status")

        ?.textContent

        ?.trim() ?? "";



    const scoreText =

      document

        .querySelector("#score")

        ?.textContent

        ?.trim() ?? "";



    const parsedScore =

      Number(scoreText);



    let apiStatus = null;



    try {

      if (

        window.PlaytestedTestAPI &&

        typeof window

          .PlaytestedTestAPI

          .status ===

          "function"

      ) {

        apiStatus =

          window

            .PlaytestedTestAPI

            .status();

      }

    } catch {

      apiStatus = null;

    }



    return {

      statusText,



      score:

        Number.isFinite(

          parsedScore

        )

          ? parsedScore

          : null,



      apiStatus,

    };

  });

}



async function getBenchmarkTelemetry(page) {

  return page.evaluate(() => {

    try {

      if (

        window.PlaytestedTestAPI &&

        typeof window

          .PlaytestedTestAPI

          .telemetry ===

          "function"

      ) {

        return window

          .PlaytestedTestAPI

          .telemetry();

      }



      return (

        window

          .__PLAYTESTED_TELEMETRY__ ??

        null

      );

    } catch {

      return null;

    }

  });

}



async function observeRuntime(

  page,

  durationMilliseconds

) {

  const startedAt =

    Date.now();



  let previousScore = null;



  let lastProgressAt =

    Date.now();



  let longestNoProgressMs = 0;



  let samples = 0;

  let sawRunning = false;

  let ended = false;



  while (

    Date.now() - startedAt <

    durationMilliseconds

  ) {

    const state =

      await readGameState(page);



    samples += 1;



    const statusLower =

      state.statusText

        .toLowerCase();



    const running =

      state.apiStatus

        ?.running === true ||

      statusLower === "running";



    if (running) {

      sawRunning = true;

    } else if (sawRunning) {

      ended = true;

      break;

    }



    if (

      running &&

      state.score !== null

    ) {

      if (

        previousScore === null ||

        state.score !==

          previousScore

      ) {

        previousScore =

          state.score;



        lastProgressAt =

          Date.now();

      } else {

        const noProgressMs =

          Date.now() -

          lastProgressAt;



        longestNoProgressMs =

          Math.max(

            longestNoProgressMs,

            noProgressMs

          );

      }

    }



    await wait(

      SAMPLE_INTERVAL_MS

    );

  }



  return {

    sawRunning,

    ended,

    samples,

    longestNoProgressMs,



    genericStallDetected:

      longestNoProgressMs >=

      STALL_THRESHOLD_MS,

  };

}



function countTelemetryEvents(

  telemetry

) {

  const telemetryEvents =

    Array.isArray(

      telemetry?.events

    )

      ? telemetry.events

      : [];



  const eventCounts = {};



  for (

    const event of

    telemetryEvents

  ) {

    const type =

      String(

        event?.type ??

          "unknown"

      );



    eventCounts[type] =

      (eventCounts[type] ?? 0) +

      1;

  }



  return {

    telemetryEvents,



    groundTruth: {

      startupFailures:

        eventCounts

          .startup_failure ?? 0,



      restartFailures:

        eventCounts

          .restart_failure ?? 0,



      simulationStalls:

        eventCounts

          .simulation_stall ?? 0,



      runtimeErrors:

        eventCounts

          .runtime_error ?? 0,



      runStarts:

        eventCounts

          .run_started ?? 0,



      runEnds:

        eventCounts

          .run_ended ?? 0,

    },

  };

}



/* ============================================================

   SESSION FOUNDATION

   ============================================================ */



async function createSessionEnvironment(

  browser,

  baseUrl,

  seed

) {

  const context =

    await browser.newContext();



  const page =

    await context.newPage();



  const consoleErrors = [];

  const pageErrors = [];

  const failedRequests = [];



  page.on(

    "console",

    (message) => {

      if (

        message.type() ===

        "error"

      ) {

        consoleErrors.push(

          message.text()

        );

      }

    }

  );



  page.on(

    "pageerror",

    (error) => {

      pageErrors.push(

        error.message

      );

    }

  );



  page.on(

    "requestfailed",

    (request) => {

      failedRequests.push({

        url:

          request.url(),



        error:

          request.failure()

            ?.errorText ??

          "Unknown request failure",

      });

    }

  );



  /* HTTP 4xx/5xx responses do not fire requestfailed. */
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const request = response.request();
    failedRequests.push({
      url: response.url(),
      status,
      statusText: response.statusText(),
      resourceType: request.resourceType(),
      error: `HTTP ${status} ${response.statusText()}`.trim(),
    });
  });


  const navigationStartedAt =

    Date.now();



  await page.goto(

    `${baseUrl}?seed=${seed}`,

    {

      waitUntil: "load",

      timeout: 10000,

    }

  );



  const loadMs =

    Date.now() -

    navigationStartedAt;



  await page.waitForSelector(

    "#start",

    {

      timeout: 5000,

    }

  );



  return {

    context,

    page,

    loadMs,

    consoleErrors,

    pageErrors,

    failedRequests,

  };

}



function createBaseResult({

  testFamily,

  familyIndex,

  globalSessionNumber,

  seed,

}) {

  return {

    testFamily,

    familyIndex,

    globalSessionNumber,

    seed,



    durationMs: 0,

    loadMs: null,



    buildLoaded: false,



    startSucceeded: false,

    restartSucceeded: false,

    interactionSucceeded: null,



    startStatus: "",

    restartStatus: "",



    genericObservations: {

      stallDetected: false,



      runtimeObservation: null,



      consoleErrors: [],

      pageErrors: [],

      failedRequests: [],



      fatalError: null,

    },



    benchmarkGroundTruth: {

      startupFailures: 0,

      restartFailures: 0,

      simulationStalls: 0,

      runtimeErrors: 0,

      runStarts: 0,

      runEnds: 0,

    },



    telemetryEvents: [],

  };

}



async function finaliseResult(

  result,

  environment

) {

  if (environment) {

    result.genericObservations

      .consoleErrors =

      environment.consoleErrors;



    result.genericObservations

      .pageErrors =

      environment.pageErrors;



    result.genericObservations

      .failedRequests =

      environment.failedRequests;



    try {

      const telemetry =

        await getBenchmarkTelemetry(

          environment.page

        );



      const {

        telemetryEvents,

        groundTruth,

      } =

        countTelemetryEvents(

          telemetry

        );



      result.telemetryEvents =

        telemetryEvents;



      result.benchmarkGroundTruth =

        groundTruth;

    } catch {

      // Benchmark telemetry is optional.

    }

  }



  return result;

}



/* ============================================================

   LAUNCH TEST

   ============================================================ */



async function runLaunchTest(

  browser,

  baseUrl,

  task

) {

  const startedAt =

    Date.now();



  const result =

    createBaseResult(task);



  let environment = null;



  try {

    environment =

      await createSessionEnvironment(

        browser,

        baseUrl,

        task.seed

      );



    result.loadMs =

      environment.loadMs;



    result.buildLoaded = true;



    await environment.page.click(

      "#start"

    );



    await wait(

      LAUNCH_SETTLE_MS

    );



    const state =

      await readGameState(

        environment.page

      );



    result.startStatus =

      state.statusText;



    result.startSucceeded =

      state.apiStatus

        ?.running === true ||

      state.statusText

        .toLowerCase() ===

        "running";

  } catch (error) {

    result.genericObservations

      .fatalError =

      error instanceof Error

        ? error.message

        : String(error);

  }



  await finaliseResult(

    result,

    environment

  );



  if (environment) {

    await environment.context.close();

  }



  result.durationMs =

    Date.now() -

    startedAt;



  return result;

}



/* ============================================================

   RESTART TEST

   ============================================================ */



async function runRestartTest(

  browser,

  baseUrl,

  task

) {

  const startedAt =

    Date.now();



  const result =

    createBaseResult(task);



  let environment = null;



  try {

    environment =

      await createSessionEnvironment(

        browser,

        baseUrl,

        task.seed

      );



    result.loadMs =

      environment.loadMs;



    result.buildLoaded = true;



    await environment.page.click(

      "#start"

    );



    await wait(

      LAUNCH_SETTLE_MS

    );



    let state =

      await readGameState(

        environment.page

      );



    result.startStatus =

      state.statusText;



    result.startSucceeded =

      state.apiStatus

        ?.running === true ||

      state.statusText

        .toLowerCase() ===

        "running";



    /*

     * Only attempt a restart if we

     * successfully established a run.

     */

    if (result.startSucceeded) {

      await environment.page.click(

        "#restart"

      );



      await wait(

        RESTART_SETTLE_MS

      );



      state =

        await readGameState(

          environment.page

        );



      result.restartStatus =

        state.statusText;



      result.restartSucceeded =

        state.apiStatus

          ?.running === true ||

        state.statusText

          .toLowerCase() ===

          "running";

    }

  } catch (error) {

    result.genericObservations

      .fatalError =

      error instanceof Error

        ? error.message

        : String(error);

  }



  await finaliseResult(

    result,

    environment

  );



  if (environment) {

    await environment.context.close();

  }



  result.durationMs =

    Date.now() -

    startedAt;



  return result;

}



function readInteractionPosition(state) {
  const apiStatus = state?.apiStatus;
  if (!apiStatus || typeof apiStatus !== "object") return null;
  const candidates = [
    [apiStatus.playerX, apiStatus.playerY],
    [apiStatus.x, apiStatus.y],
    [apiStatus.player?.x, apiStatus.player?.y],
    [apiStatus.position?.x, apiStatus.position?.y],
  ];
  for (const [x, y] of candidates) {
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }
  return null;
}

async function setInteractionInput(page, direction, on) {
  const usedApi = await page.evaluate(({ direction, on }) => {
    try {
      if (window.PlaytestedTestAPI && typeof window.PlaytestedTestAPI.move === "function") {
        window.PlaytestedTestAPI.move(direction, on);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }, { direction, on });
  if (usedApi) return "api";
  const key = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" }[direction];
  if (!key) return "none";
  if (on) await page.keyboard.down(key);
  else await page.keyboard.up(key);
  return "keyboard";
}


/* ============================================================

   INTERACTION TEST

   ============================================================ */



async function runInteractionTest(browser, baseUrl, task) {
  const startedAt = Date.now();
  const result = createBaseResult(task);
  let environment = null;

  try {
    environment = await createSessionEnvironment(browser, baseUrl, task.seed);
    result.loadMs = environment.loadMs;
    result.buildLoaded = true;

    await environment.page.click("#start");
    await wait(LAUNCH_SETTLE_MS);

    const initialState = await readGameState(environment.page);
    result.startStatus = initialState.statusText;
    result.startSucceeded = initialState.apiStatus?.running === true || initialState.statusText.toLowerCase() === "running";

    if (result.startSucceeded) {
      const scoreBefore = initialState.score;
      const positionBefore = readInteractionPosition(initialState);
      const inputMethod = await setInteractionInput(environment.page, "right", true);
      await wait(300);
      await setInteractionInput(environment.page, "right", false);

      const stateAfterRight = await readGameState(environment.page);
      const positionAfterRight = readInteractionPosition(stateAfterRight);

      await setInteractionInput(environment.page, "up", true);
      const observation = await observeRuntime(environment.page, INTERACTION_OBSERVATION_MS);
      await setInteractionInput(environment.page, "up", false);

      const finalState = await readGameState(environment.page);
      const positionFinal = readInteractionPosition(finalState);

      result.genericObservations.runtimeObservation = observation;
      result.genericObservations.stallDetected = observation.genericStallDetected;

      const scoreChanged = scoreBefore !== null && finalState.score !== null && finalState.score !== scoreBefore;
      const hasPositionEvidence = positionBefore !== null && (positionAfterRight !== null || positionFinal !== null);
      const positionChanged = hasPositionEvidence && (
        (positionAfterRight !== null && (positionAfterRight.x !== positionBefore.x || positionAfterRight.y !== positionBefore.y)) ||
        (positionFinal !== null && (positionFinal.x !== positionBefore.x || positionFinal.y !== positionBefore.y))
      );

      result.genericObservations.interactionEvidence = {
        inputMethod,
        positionBefore,
        positionAfterRight,
        positionFinal,
        hasPositionEvidence,
        positionChanged,
        scoreBefore,
        scoreAfter: finalState.score,
        scoreChanged,
      };

      result.interactionSucceeded = observation.sawRunning && (
        hasPositionEvidence
          ? positionChanged
          : scoreChanged || finalState.apiStatus?.running === true
      );
    } else {
      result.interactionSucceeded = false;
    }
  } catch (error) {
    result.interactionSucceeded = false;
    result.genericObservations.fatalError = error instanceof Error ? error.message : String(error);
  }

  await finaliseResult(result, environment);
  if (environment) await environment.context.close();
  result.durationMs = Date.now() - startedAt;
  return result;
}


/* ============================================================

   STABILITY TEST

   ============================================================ */



async function runStabilityTest(

  browser,

  baseUrl,

  task

) {

  const startedAt =

    Date.now();



  const result =

    createBaseResult(task);



  let environment = null;



  try {

    environment =

      await createSessionEnvironment(

        browser,

        baseUrl,

        task.seed

      );



    result.loadMs =

      environment.loadMs;



    result.buildLoaded = true;



    await environment.page.click(

      "#start"

    );



    await wait(

      LAUNCH_SETTLE_MS

    );



    const state =

      await readGameState(

        environment.page

      );



    result.startStatus =

      state.statusText;



    result.startSucceeded =

      state.apiStatus

        ?.running === true ||

      state.statusText

        .toLowerCase() ===

        "running";



    if (result.startSucceeded) {

      await environment.page

        .keyboard

        .down("ArrowRight");



      const observation =

        await observeRuntime(

          environment.page,

          STABILITY_OBSERVATION_MS

        );



      await environment.page

        .keyboard

        .up("ArrowRight");



      result.genericObservations

        .runtimeObservation =

        observation;



      result.genericObservations

        .stallDetected =

        observation

          .genericStallDetected;

    }

  } catch (error) {

    result.genericObservations

      .fatalError =

      error instanceof Error

        ? error.message

        : String(error);

  }



  await finaliseResult(

    result,

    environment

  );



  if (environment) {

    await environment.context.close();

  }



  result.durationMs =

    Date.now() -

    startedAt;



  return result;

}



/* ============================================================

   SOAK TEST

   ============================================================ */



async function runSoakTest(

  browser,

  baseUrl,

  task

) {

  const startedAt =

    Date.now();



  const result =

    createBaseResult(task);



  let environment = null;



  try {

    environment =

      await createSessionEnvironment(

        browser,

        baseUrl,

        task.seed

      );



    result.loadMs =

      environment.loadMs;



    result.buildLoaded = true;



    await environment.page.click(

      "#start"

    );



    await wait(

      LAUNCH_SETTLE_MS

    );



    const state =

      await readGameState(

        environment.page

      );



    result.startStatus =

      state.statusText;



    result.startSucceeded =

      state.apiStatus

        ?.running === true ||

      state.statusText

        .toLowerCase() ===

        "running";



    if (result.startSucceeded) {

      await environment.page

        .keyboard

        .down("ArrowRight");



      const observation =

        await observeRuntime(

          environment.page,

          SOAK_OBSERVATION_MS

        );



      await environment.page

        .keyboard

        .up("ArrowRight");



      result.genericObservations

        .runtimeObservation =

        observation;



      result.genericObservations

        .stallDetected =

        observation

          .genericStallDetected;

    }

  } catch (error) {

    result.genericObservations

      .fatalError =

      error instanceof Error

        ? error.message

        : String(error);

  }



  await finaliseResult(

    result,

    environment

  );



  if (environment) {

    await environment.context.close();

  }



  result.durationMs =

    Date.now() -

    startedAt;



  return result;

}



/* ============================================================

   TASK CREATION

   ============================================================ */



function buildTasks() {

  const tasks = [];



  let globalSessionNumber = 1;



  const addFamily = (

    testFamily,

    count

  ) => {

    for (

      let familyIndex = 1;

      familyIndex <= count;

      familyIndex += 1

    ) {

      tasks.push({

        testFamily,

        familyIndex,



        globalSessionNumber,



        seed:

          createSeed(

            testFamily,

            familyIndex

          ),

      });



      globalSessionNumber += 1;

    }

  };



  /*

   * Put the high-volume fast tests

   * first. Longer tests follow.

   */



  addFamily(

    "launch",

    profile.launch

  );



  addFamily(

    "restart",

    profile.restart

  );



  addFamily(

    "interaction",

    profile.interaction

  );



  addFamily(

    "stability",

    profile.stability

  );



  addFamily(

    "soak",

    profile.soak

  );



  return tasks;

}



/* ============================================================

   TASK EXECUTION

   ============================================================ */



async function executeTask(

  browser,

  baseUrl,

  task

) {

  switch (task.testFamily) {

    case "launch":

      return runLaunchTest(

        browser,

        baseUrl,

        task

      );



    case "restart":

      return runRestartTest(

        browser,

        baseUrl,

        task

      );



    case "interaction":

      return runInteractionTest(

        browser,

        baseUrl,

        task

      );



    case "stability":

      return runStabilityTest(

        browser,

        baseUrl,

        task

      );



    case "soak":

      return runSoakTest(

        browser,

        baseUrl,

        task

      );



    default:

      throw new Error(

        `Unknown test family: ${task.testFamily}`

      );

  }

}



/* ============================================================

   FAMILY SUMMARIES

   ============================================================ */



function summariseFamily(

  family,

  results

) {

  const familyResults =

    results.filter(

      (result) =>

        result.testFamily ===

        family

    );



  const count =

    familyResults.length;



  const successfulLoads =

    familyResults.filter(

      (result) =>

        result.buildLoaded

    ).length;



  const successfulStarts =

    familyResults.filter(

      (result) =>

        result.startSucceeded

    ).length;



  const restartAttempted =

    familyResults.filter(

      (result) =>

        result.startSucceeded

    ).length;



  const successfulRestarts =

    familyResults.filter(

      (result) =>

        result.restartSucceeded

    ).length;



  const interactionAttempted =

    familyResults.filter(

      (result) =>

        result.interactionSucceeded !==

        null

    ).length;



  const successfulInteractions =

    familyResults.filter(

      (result) =>

        result.interactionSucceeded ===

        true

    ).length;



  const sessionsWithErrors =

    familyResults.filter(

      (result) =>

        result

          .genericObservations

          .consoleErrors

          .length > 0 ||

        result

          .genericObservations

          .pageErrors

          .length > 0 ||
        result.genericObservations.failedRequests.length > 0

    ).length;



  const sessionsWithStalls =

    familyResults.filter(

      (result) =>

        result

          .genericObservations

          .stallDetected

    ).length;



  const sessionsWithWorkerErrors =

    familyResults.filter(

      (result) =>

        Boolean(

          result

            .genericObservations

            .fatalError

        )

    ).length;



  const benchmarkSessionsWithStartupFailure =

    familyResults.filter(

      (result) =>

        result

          .benchmarkGroundTruth

          .startupFailures > 0

    ).length;



  const benchmarkSessionsWithRestartFailure =

    familyResults.filter(

      (result) =>

        result

          .benchmarkGroundTruth

          .restartFailures > 0

    ).length;



  const benchmarkSessionsWithStall =

    familyResults.filter(

      (result) =>

        result

          .benchmarkGroundTruth

          .simulationStalls > 0

    ).length;



  const benchmarkSessionsWithRuntimeError =

    familyResults.filter(

      (result) =>

        result

          .benchmarkGroundTruth

          .runtimeErrors > 0

    ).length;



  const benchmarkStartupFailureEvents =

    familyResults.reduce(

      (sum, result) =>

        sum +

        result

          .benchmarkGroundTruth

          .startupFailures,

      0

    );



  const benchmarkRestartFailureEvents =

    familyResults.reduce(

      (sum, result) =>

        sum +

        result

          .benchmarkGroundTruth

          .restartFailures,

      0

    );



  const benchmarkStallEvents =

    familyResults.reduce(

      (sum, result) =>

        sum +

        result

          .benchmarkGroundTruth

          .simulationStalls,

      0

    );



  const benchmarkRuntimeErrorEvents =

    familyResults.reduce(

      (sum, result) =>

        sum +

        result

          .benchmarkGroundTruth

          .runtimeErrors,

      0

    );



  return {

    family,

    checks: count,



    successfulLoads,



    buildLoadSuccessRate:

      percentage(

        successfulLoads,

        count

      ),



    successfulStarts,



    startSuccessRate:

      percentage(

        successfulStarts,

        count

      ),



    restartAttempted,



    successfulRestarts,



    restartSuccessRate:

      restartAttempted > 0

        ? percentage(

            successfulRestarts,

            restartAttempted

          )

        : null,



    interactionAttempted,



    successfulInteractions,



    interactionSuccessRate:

      interactionAttempted > 0

        ? percentage(

            successfulInteractions,

            interactionAttempted

          )

        : null,



    sessionsWithErrors,

    sessionsWithStalls,

    sessionsWithWorkerErrors,



    medianLoadMs:

      median(

        familyResults.map(

          (result) =>

            result.loadMs

        )

      ),



    medianDurationMs:

      median(

        familyResults.map(

          (result) =>

            result.durationMs

        )

      ),



    benchmark: {

      sessionsWithStartupFailure:

        benchmarkSessionsWithStartupFailure,



      sessionsWithRestartFailure:

        benchmarkSessionsWithRestartFailure,



      sessionsWithStall:

        benchmarkSessionsWithStall,



      sessionsWithRuntimeError:

        benchmarkSessionsWithRuntimeError,



      startupFailureEvents:

        benchmarkStartupFailureEvents,



      restartFailureEvents:

        benchmarkRestartFailureEvents,



      stallEvents:

        benchmarkStallEvents,



      runtimeErrorEvents:

        benchmarkRuntimeErrorEvents,

    },

  };

}



/* ============================================================

   COMPLETE SUMMARY

   ============================================================ */



function aggregateResults(results) {

  const familySummaries = {

    launch:

      summariseFamily(

        "launch",

        results

      ),



    restart:

      summariseFamily(

        "restart",

        results

      ),



    interaction:

      summariseFamily(

        "interaction",

        results

      ),



    stability:

      summariseFamily(

        "stability",

        results

      ),



    soak:

      summariseFamily(

        "soak",

        results

      ),

  };



  const successfulLoads =

    results.filter(

      (result) =>

        result.buildLoaded

    ).length;



  const sessionsWithErrors =

    results.filter(

      (result) =>

        result

          .genericObservations

          .consoleErrors

          .length > 0 ||

        result

          .genericObservations

          .pageErrors

          .length > 0 ||
        result.genericObservations.failedRequests.length > 0

    ).length;



  const sessionsWithFailedRequests =

    results.filter((result) => result.genericObservations.failedRequests.length > 0).length;


  const sessionsWithStalls =

    results.filter(

      (result) =>

        result

          .genericObservations

          .stallDetected

    ).length;



  const sessionsWithWorkerErrors =

    results.filter(

      (result) =>

        Boolean(

          result

            .genericObservations

            .fatalError

        )

    ).length;



  /*

   * Reliability headline values come

   * from their dedicated test families.

   */



  const launchChecks =

    familySummaries.launch.checks;



  const successfulLaunches =

    familySummaries.launch

      .successfulStarts;



  const restartChecks =

    familySummaries.restart

      .restartAttempted;



  const successfulRestarts =

    familySummaries.restart

      .successfulRestarts;



  const interactionChecks =

    familySummaries.interaction

      .interactionAttempted;



  const successfulInteractions =

    familySummaries.interaction

      .successfulInteractions;



  /*

   * Benchmark totals across ALL families.

   */



  const benchmark = {

    sessionsWithStartupFailure:

      results.filter(

        (result) =>

          result

            .benchmarkGroundTruth

            .startupFailures > 0

      ).length,



    sessionsWithRestartFailure:

      results.filter(

        (result) =>

          result

            .benchmarkGroundTruth

            .restartFailures > 0

      ).length,



    sessionsWithStall:

      results.filter(

        (result) =>

          result

            .benchmarkGroundTruth

            .simulationStalls > 0

      ).length,



    sessionsWithRuntimeError:

      results.filter(

        (result) =>

          result

            .benchmarkGroundTruth

            .runtimeErrors > 0

      ).length,



    startupFailureEvents:

      results.reduce(

        (sum, result) =>

          sum +

          result

            .benchmarkGroundTruth

            .startupFailures,

        0

      ),



    restartFailureEvents:

      results.reduce(

        (sum, result) =>

          sum +

          result

            .benchmarkGroundTruth

            .restartFailures,

        0

      ),



    simulationStallEvents:

      results.reduce(

        (sum, result) =>

          sum +

          result

            .benchmarkGroundTruth

            .simulationStalls,

        0

      ),



    runtimeErrorEvents:

      results.reduce(

        (sum, result) =>

          sum +

          result

            .benchmarkGroundTruth

            .runtimeErrors,

        0

      ),

  };



  const issueReasons = [];



  if (

    successfulLaunches <

    launchChecks

  ) {

    issueReasons.push(

      `${

        launchChecks -

        successfulLaunches

      } of ${launchChecks} dedicated launch checks failed`

    );

  }



  if (

    successfulRestarts <

    restartChecks

  ) {

    issueReasons.push(

      `${

        restartChecks -

        successfulRestarts

      } of ${restartChecks} dedicated restart checks failed`

    );

  }



  if (

    interactionChecks > 0 &&

    successfulInteractions <

      interactionChecks

  ) {

    issueReasons.push(

      `${

        interactionChecks -

        successfulInteractions

      } of ${interactionChecks} interaction checks failed`

    );

  }



  if (sessionsWithFailedRequests > 0) {
    issueReasons.push(`${sessionsWithFailedRequests} test session(s) contained failed HTTP/resource requests`);
  }


  if (

    sessionsWithErrors > 0

  ) {

    issueReasons.push(

      `${sessionsWithErrors} test session(s) contained browser/runtime errors`

    );

  }



  if (

    sessionsWithStalls > 0

  ) {

    issueReasons.push(

      `${sessionsWithStalls} runtime test session(s) contained detected stalls`

    );

  }



  if (

    sessionsWithWorkerErrors > 0

  ) {

    issueReasons.push(

      `${sessionsWithWorkerErrors} test infrastructure/session error(s)`

    );

  }



  const result =

    issueReasons.length === 0

      ? "PASS"

      : "ISSUES DETECTED";



  return {

    profile:

      profileName,



    totalChecks:

      results.length,



    plannedChecks:

      profile,



    successfulBuildLoads:

      successfulLoads,



    buildLoadSuccessRate:

      percentage(

        successfulLoads,

        results.length

      ),



    launchReliability: {

      checks:

        launchChecks,



      successful:

        successfulLaunches,



      failed:

        launchChecks -

        successfulLaunches,



      successRate:

        percentage(

          successfulLaunches,

          launchChecks

        ),

    },



    restartReliability: {

      checks:

        restartChecks,



      successful:

        successfulRestarts,



      failed:

        restartChecks -

        successfulRestarts,



      successRate:

        restartChecks > 0

          ? percentage(

              successfulRestarts,

              restartChecks

            )

          : 0,

    },



    interaction: {

      checks:

        interactionChecks,



      successful:

        successfulInteractions,



      failed:

        interactionChecks -

        successfulInteractions,



      successRate:

        interactionChecks > 0

          ? percentage(

              successfulInteractions,

              interactionChecks

            )

          : 0,

    },



    genericDetection: {

      sessionsWithErrors,

      sessionsWithFailedRequests,

      sessionsWithStalls,

      sessionsWithWorkerErrors,

    },



    benchmarkGroundTruth:

      benchmark,



    medianLoadMs:

      median(

        results.map(

          (result) =>

            result.loadMs

        )

      ),



    familySummaries,



    result,

    issueReasons,

  };

}



/* ============================================================

   CONSOLE RESULT MARKERS

   ============================================================ */



function buildResultMarkers(result) {

  const markers = [];



  if (!result.buildLoaded) {

    markers.push(

      "LOAD FAIL"

    );

  }



  if (

    result.testFamily ===

      "launch" &&

    !result.startSucceeded

  ) {

    markers.push(

      "START FAIL"

    );

  }



  if (

    result.testFamily ===

      "restart"

  ) {

    if (

      !result.startSucceeded

    ) {

      markers.push(

        "START FAIL"

      );

    } else if (

      !result.restartSucceeded

    ) {

      markers.push(

        "RESTART FAIL"

      );

    }

  }



  if (

    result.testFamily ===

      "interaction" &&

    result.interactionSucceeded ===

      false

  ) {

    markers.push(

      "INTERACTION FAIL"

    );

  }



  if (

    result

      .genericObservations

      .stallDetected

  ) {

    markers.push(

      "STALL"

    );

  }



  if (

    result

      .genericObservations

      .consoleErrors

      .length > 0 ||

    result

      .genericObservations

      .pageErrors

      .length > 0 ||
    result.genericObservations.failedRequests.length > 0

  ) {

    markers.push(

      "ERROR"

    );

  }



  if (

    result

      .genericObservations

      .fatalError

  ) {

    markers.push(

      "WORKER ERROR"

    );

  }



  if (markers.length === 0) {

    markers.push("OK");

  }



  return markers;

}



/* ============================================================

   MAIN

   ============================================================ */



async function main() {

  const fullRunStartedAt =

    Date.now();



  console.log("");

  console.log(

    "PLAYTESTED AUTOMATED TECHNICAL TEST ENGINE"

  );

  console.log(

    "------------------------------------------"

  );



  console.log(

    `Worker:      ${WORKER_VERSION}`

  );



  console.log(

    `Game:        ${gameTitle}`

  );



  console.log(

    `Build:       ${buildLabel}`

  );



  console.log(

    `Profile:     ${profileName.toUpperCase()}`

  );



  console.log(

    `Concurrency: ${concurrency}`

  );



  console.log(

    `Total checks: ${totalChecks}`

  );



  console.log("");



  console.log(

    "Test plan"

  );



  console.log(

    `  Launch reliability:  ${profile.launch}`

  );



  console.log(

    `  Restart reliability: ${profile.restart}`

  );



  console.log(

    `  Interaction:         ${profile.interaction}`

  );



  console.log(

    `  Stability:           ${profile.stability}`

  );



  console.log(

    `  Soak:                ${profile.soak}`

  );



  console.log("");



  initialiseSupabaseEnvironment();



  console.log(

    "Finding game in Playtested..."

  );



  const game =

    await findGameByTitle(

      gameTitle

    );



  console.log(

    `Found: ${game.title} (${game.sourceType})`

  );



  const databaseRun =

    await createTechnicalTestRun(

      game

    );



  console.log(

    `Technical run created: ${databaseRun.id}`

  );



  console.log("");



  /*

   * Extract the browser build.

   */



  const zip =

    new AdmZip(zipPath);



  zip.extractAllTo(

    extractDirectory,

    true

  );



  const indexPath =

    join(

      extractDirectory,

      "index.html"

    );



  if (!existsSync(indexPath)) {

    throw new Error(

      "The ZIP must contain index.html at its root for this browser-build worker."

    );

  }



  const {

    server,

    url,

  } =

    await startStaticServer(

      extractDirectory

    );



  const browser =

    await chromium.launch({

      headless: true,

    });



  console.log(

    `Local build server: ${url}`

  );



  console.log("");

  console.log(

    "Running test suite..."

  );

  console.log("");



  const tasks =

    buildTasks();



  const results =

    new Array(

      tasks.length

    );



  let nextTaskIndex = 0;

  let completed = 0;



  let currentFamily = null;



  async function worker() {

    while (true) {

      const taskIndex =

        nextTaskIndex;



      nextTaskIndex += 1;



      if (

        taskIndex >=

        tasks.length

      ) {

        return;

      }



      const task =

        tasks[taskIndex];



      if (

        currentFamily !==

        task.testFamily

      ) {

        currentFamily =

          task.testFamily;



        console.log(

          `--- ${task.testFamily.toUpperCase()} TESTS ---`

        );

      }



      const result =

        await executeTask(

          browser,

          url,

          task

        );



      results[taskIndex] =

        result;



      completed += 1;



      const markers =

        buildResultMarkers(

          result

        );



      console.log(

        `${String(

          completed

        ).padStart(

          4,

          "0"

        )}/${totalChecks} ` +

          `${task.testFamily.padEnd(

            11

          )} ` +

          `${String(

            task.familyIndex

          ).padStart(

            3,

            "0"

          )} ` +

          `[${markers.join(

            ", "

          )}]`

      );

    }

  }



  try {

    await Promise.all(

      Array.from(

        {

          length:

            concurrency,

        },

        () => worker()

      )

    );

  } finally {

    await browser.close();



    await closeServer(

      server

    );

  }



  const summary =

    aggregateResults(

      results

    );



  const totalDurationMs =

    Date.now() -

    fullRunStartedAt;



  const report = {

    schemaVersion:

      REPORT_SCHEMA_VERSION,



    generatedAt:

      new Date()

        .toISOString(),



    databaseRunId:

      databaseRun.id,



    workerVersion:

      WORKER_VERSION,



    game: {

      title:

        game.title,



      sourceType:

        game.sourceType,



      id:

        game.id,



      steamAppId:

        game.steamAppId ??

        null,

    },



    build: {

      label:

        buildLabel,



      zipPath,



      fileName:

        zipPath

          .split(/[\\/]/)

          .pop(),

    },



    configuration: {

      profile:

        profileName,



      concurrency,



      testPlan:

        profile,



      totalChecks,



      timings: {

        launchSettleMs:

          LAUNCH_SETTLE_MS,



        restartSettleMs:

          RESTART_SETTLE_MS,



        interactionObservationMs:

          INTERACTION_OBSERVATION_MS,



        stabilityObservationMs:

          STABILITY_OBSERVATION_MS,



        soakObservationMs:

          SOAK_OBSERVATION_MS,



        sampleIntervalMs:

          SAMPLE_INTERVAL_MS,



        stallThresholdMs:

          STALL_THRESHOLD_MS,

      },

    },



    durationMs:

      totalDurationMs,



    summary,



    sessions:

      results,

  };



  writeFileSync(

    reportPath,

    JSON.stringify(

      report,

      null,

      2

    ),

    "utf8"

  );



  console.log("");

  console.log(

    "Saving test evidence to Supabase..."

  );



  await insertTechnicalTestSessions(

    databaseRun.id,

    results

  );



  /*

   * Existing run columns remain useful

   * for high-level catalogue/admin reporting.

   *

   * Detailed V4 family data lives in

   * summary_json.

   */



  await updateTechnicalTestRun(

    databaseRun.id,

    {

      status:

        "completed",



      overall_result:

        summary.result,



      completed_sessions:

        summary.totalChecks,



      successful_build_loads:

        summary

          .successfulBuildLoads,



      successful_initial_starts:

        summary

          .launchReliability

          .successful,



      successful_restarts:

        summary

          .restartReliability

          .successful,



      build_load_success_rate:

        summary

          .buildLoadSuccessRate,



      initial_start_success_rate:

        summary

          .launchReliability

          .successRate,



      restart_success_rate:

        summary

          .restartReliability

          .successRate,



      sessions_with_errors:

        summary

          .genericDetection

          .sessionsWithErrors,



      sessions_with_stalls:

        summary

          .genericDetection

          .sessionsWithStalls,



      sessions_with_worker_errors:

        summary

          .genericDetection

          .sessionsWithWorkerErrors,



      median_load_ms:

        summary.medianLoadMs,



      duration_ms:

        totalDurationMs,



      benchmark_startup_failures:

        summary

          .benchmarkGroundTruth

          .startupFailureEvents,



      benchmark_restart_failures:

        summary

          .benchmarkGroundTruth

          .restartFailureEvents,



      benchmark_simulation_stalls:

        summary

          .benchmarkGroundTruth

          .simulationStallEvents,



      benchmark_runtime_errors:

        summary

          .benchmarkGroundTruth

          .runtimeErrorEvents,



      issue_reasons:

        summary.issueReasons,



      summary_json:

        summary,



      report_reference:

        reportPath,



      completed_at:

        new Date()

          .toISOString(),

    }

  );



  /* ==========================================================

     FINAL CONSOLE REPORT

     ========================================================== */



  console.log("");

  console.log(

    "PLAYTESTED TECHNICAL TEST REPORT"

  );

  console.log(

    "--------------------------------"

  );



  console.log(

    `Game                     ${game.title}`

  );



  console.log(

    `Build                    ${buildLabel}`

  );



  console.log(

    `Profile                  ${profileName.toUpperCase()}`

  );



  console.log(

    `Total checks             ${summary.totalChecks}`

  );



  console.log(

    `Concurrency              ${concurrency}`

  );



  console.log(

    `Total duration           ${formatDuration(

      totalDurationMs

    )}`

  );



  console.log(

    `Median build load        ${

      summary.medianLoadMs ===

      null

        ? "n/a"

        : `${summary.medianLoadMs}ms`

    }`

  );



  console.log("");



  console.log(

    "RELIABILITY"

  );

  console.log(

    "-----------"

  );



  console.log(

    `Launch                   ${summary.launchReliability.successful}/${summary.launchReliability.checks} (${summary.launchReliability.successRate}%)`

  );



  console.log(

    `Restart                  ${summary.restartReliability.successful}/${summary.restartReliability.checks} (${summary.restartReliability.successRate}%)`

  );



  console.log(

    `Interaction              ${summary.interaction.successful}/${summary.interaction.checks} (${summary.interaction.successRate}%)`

  );



  console.log("");



  console.log(

    "RUNTIME DETECTION"

  );

  console.log(

    "-----------------"

  );



  console.log(

    `Sessions with errors     ${summary.genericDetection.sessionsWithErrors}`

  );

  console.log(
    `Sessions with failed requests ${summary.genericDetection.sessionsWithFailedRequests}`
  );



  console.log(

    `Sessions with stalls     ${summary.genericDetection.sessionsWithStalls}`

  );



  console.log(

    `Worker/session errors    ${summary.genericDetection.sessionsWithWorkerErrors}`

  );



  console.log("");



  console.log(

    "TEST FAMILY BREAKDOWN"

  );

  console.log(

    "---------------------"

  );



  for (

    const family of [

      "launch",

      "restart",

      "interaction",

      "stability",

      "soak",

    ]

  ) {

    const familySummary =

      summary

        .familySummaries[

          family

        ];



    console.log(

      `${family.padEnd(

        12

      )} ${String(

        familySummary.checks

      ).padStart(

        4

      )} checks | errors ${String(

        familySummary.sessionsWithErrors

      ).padStart(

        3

      )} | stalls ${String(

        familySummary.sessionsWithStalls

      ).padStart(

        3

      )} | median ${formatDuration(

        familySummary.medianDurationMs

      )}`

    );

  }



  console.log("");



  console.log(

    "BENCHMARK GROUND TRUTH"

  );

  console.log(

    "----------------------"

  );



  console.log(

    `Sessions with startup failure   ${summary.benchmarkGroundTruth.sessionsWithStartupFailure}`

  );



  console.log(

    `Startup failure events          ${summary.benchmarkGroundTruth.startupFailureEvents}`

  );



  console.log(

    `Sessions with restart failure   ${summary.benchmarkGroundTruth.sessionsWithRestartFailure}`

  );



  console.log(

    `Restart failure events          ${summary.benchmarkGroundTruth.restartFailureEvents}`

  );



  console.log(

    `Sessions with actual stalls     ${summary.benchmarkGroundTruth.sessionsWithStall}`

  );



  console.log(

    `Actual stall events             ${summary.benchmarkGroundTruth.simulationStallEvents}`

  );



  console.log(

    `Sessions with runtime errors    ${summary.benchmarkGroundTruth.sessionsWithRuntimeError}`

  );



  console.log(

    `Runtime error events            ${summary.benchmarkGroundTruth.runtimeErrorEvents}`

  );



  console.log("");



  console.log(

    `OVERALL RESULT: ${summary.result}`

  );



  if (

    summary.issueReasons

      .length > 0

  ) {

    console.log("");

    console.log(

      "Observed issues:"

    );



    for (

      const issue of

      summary.issueReasons

    ) {

      console.log(

        `- ${issue}`

      );

    }

  }



  console.log("");

  console.log(

    "PLAYTESTED DATABASE"

  );

  console.log(

    "-------------------"

  );



  console.log(

    `Run ID: ${databaseRun.id}`

  );



  console.log(

    `Evidence rows stored: ${summary.totalChecks}`

  );



  console.log("");



  console.log(

    `Full JSON report: ${reportPath}`

  );



  console.log("");

}



/* ============================================================

   EXECUTION

   ============================================================ */



main()

  .catch(

    async (error) => {

      console.error("");

      console.error(

        "Technical test worker failed:"

      );



      console.error(error);

      console.error("");



      if (

        currentDatabaseRunId &&

        supabaseUrl &&

        supabaseServiceRoleKey

      ) {

        try {

          await updateTechnicalTestRun(

            currentDatabaseRunId,

            {

              status:

                "failed",



              overall_result:

                "FAILED",



              completed_at:

                new Date()

                  .toISOString(),



              issue_reasons: [

                error instanceof Error

                  ? error.message

                  : String(error),

              ],

            }

          );



          console.error(

            `Database run ${currentDatabaseRunId} marked as failed.`

          );

        } catch (

          databaseError

        ) {

          console.error(

            "Could not mark database run as failed:"

          );



          console.error(

            databaseError

          );

        }

      }



      process.exitCode = 1;

    }

  )

  .finally(() => {

    try {

      rmSync(

        extractDirectory,

        {

          recursive: true,

          force: true,

        }

      );

    } catch {

      // Cleanup failure must not hide the test result.

    }

  });
