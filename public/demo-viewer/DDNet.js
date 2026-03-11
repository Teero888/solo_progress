// include: shell.js
// include: minimum_runtime_check.js
(function() {
  // "30.0.0" -> 300000
  function humanReadableVersionToPacked(str) {
    str = str.split("-")[0];
    // Remove any trailing part from e.g. "12.53.3-alpha"
    var vers = str.split(".").slice(0, 3);
    while (vers.length < 3) vers.push("00");
    vers = vers.map((n, i, arr) => n.padStart(2, "0"));
    return vers.join("");
  }
  // 300000 -> "30.0.0"
  var packedVersionToHumanReadable = n => [ n / 1e4 | 0, (n / 100 | 0) % 100, n % 100 ].join(".");
  var TARGET_NOT_SUPPORTED = 2147483647;
  // Note: We use a typeof check here instead of optional chaining using
  // globalThis because older browsers might not have globalThis defined.
  var currentNodeVersion = typeof process !== "undefined" && process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
  if (currentNodeVersion < 160400) {
    throw new Error(`This emscripten-generated code requires node v${packedVersionToHumanReadable(160400)} (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
  }
  var userAgent = typeof navigator !== "undefined" && navigator.userAgent;
  if (!userAgent) {
    return;
  }
  var currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentSafariVersion < 15e4) {
    throw new Error(`This emscripten-generated code requires Safari v${packedVersionToHumanReadable(15e4)} (detected v${currentSafariVersion})`);
  }
  var currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentFirefoxVersion < 79) {
    throw new Error(`This emscripten-generated code requires Firefox v79 (detected v${currentFirefoxVersion})`);
  }
  var currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentChromeVersion < 85) {
    throw new Error(`This emscripten-generated code requires Chrome v85 (detected v${currentChromeVersion})`);
  }
})();

// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != "undefined" ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).
// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;

var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;

// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";

var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() running directly in a worker. (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
// The way we signal to a worker that it is hosting a pthread is to construct
// it with a specific name.
var ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && self.name?.startsWith("em-pthread");

if (ENVIRONMENT_IS_NODE) {
  var worker_threads = require("worker_threads");
  global.Worker = worker_threads.Worker;
  ENVIRONMENT_IS_WORKER = !worker_threads.isMainThread;
  // Under node we set `workerData` to `em-pthread` to signal that the worker
  // is hosting a pthread.
  ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && worker_threads["workerData"] == "em-pthread";
}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: /tmp/tmp3_ea7ryx.js
if (!Module["expectedDataFileDownloads"]) Module["expectedDataFileDownloads"] = 0;

Module["expectedDataFileDownloads"]++;

(() => {
  // Do not attempt to redownload the virtual filesystem data when in a pthread or a Wasm Worker context.
  var isPthread = typeof ENVIRONMENT_IS_PTHREAD != "undefined" && ENVIRONMENT_IS_PTHREAD;
  var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != "undefined" && ENVIRONMENT_IS_WASM_WORKER;
  if (isPthread || isWasmWorker) return;
  var isNode = globalThis.process && globalThis.process.versions && globalThis.process.versions.node && globalThis.process.type != "renderer";
  async function loadPackage(metadata) {
    var PACKAGE_PATH = "";
    if (typeof window === "object") {
      PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")) + "/");
    } else if (typeof process === "undefined" && typeof location !== "undefined") {
      // web worker
      PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf("/")) + "/");
    }
    var PACKAGE_NAME = "DDNet.data";
    var REMOTE_PACKAGE_BASE = "DDNet.data";
    var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
    var REMOTE_PACKAGE_SIZE = metadata["remote_package_size"];
    async function fetchRemotePackage(packageName, packageSize) {
      if (isNode) {
        var contents = require("fs").readFileSync(packageName);
        return new Uint8Array(contents).buffer;
      }
      if (!Module["dataFileDownloads"]) Module["dataFileDownloads"] = {};
      try {
        var response = await fetch(packageName);
      } catch (e) {
        throw new Error(`Network Error: ${packageName}`, {
          e
        });
      }
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.url}`);
      }
      const chunks = [];
      const headers = response.headers;
      const total = Number(headers.get("Content-Length") || packageSize);
      let loaded = 0;
      Module["setStatus"] && Module["setStatus"]("Downloading data...");
      const reader = response.body.getReader();
      while (1) {
        var {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        Module["dataFileDownloads"][packageName] = {
          loaded,
          total
        };
        let totalLoaded = 0;
        let totalSize = 0;
        for (const download of Object.values(Module["dataFileDownloads"])) {
          totalLoaded += download.loaded;
          totalSize += download.total;
        }
        Module["setStatus"] && Module["setStatus"](`Downloading data... (${totalLoaded}/${totalSize})`);
      }
      const packageData = new Uint8Array(chunks.map(c => c.length).reduce((a, b) => a + b, 0));
      let offset = 0;
      for (const chunk of chunks) {
        packageData.set(chunk, offset);
        offset += chunk.length;
      }
      return packageData.buffer;
    }
    var fetchPromise;
    var fetched = Module["getPreloadedPackage"] && Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
    if (!fetched) {
      // Note that we don't use await here because we want to execute the
      // the rest of this function immediately.
      fetchPromise = fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
    }
    async function runWithFS(Module) {
      function assert(check, msg) {
        if (!check) throw new Error(msg);
      }
      Module["FS_createPath"]("/", "data", true, true);
      Module["FS_createPath"]("/data", "assets", true, true);
      Module["FS_createPath"]("/data/assets", "entities", true, true);
      Module["FS_createPath"]("/data/assets/entities", "comfort", true, true);
      Module["FS_createPath"]("/data/assets", "game", true, true);
      Module["FS_createPath"]("/data", "audio", true, true);
      Module["FS_createPath"]("/data", "communityicons", true, true);
      Module["FS_createPath"]("/data", "countryflags", true, true);
      Module["FS_createPath"]("/data", "editor", true, true);
      Module["FS_createPath"]("/data/editor", "automap", true, true);
      Module["FS_createPath"]("/data/editor", "entities", true, true);
      Module["FS_createPath"]("/data/editor", "entities_clear", true, true);
      Module["FS_createPath"]("/data", "fonts", true, true);
      Module["FS_createPath"]("/data", "languages", true, true);
      Module["FS_createPath"]("/data", "mapres", true, true);
      Module["FS_createPath"]("/data", "maps", true, true);
      Module["FS_createPath"]("/data", "maps7", true, true);
      Module["FS_createPath"]("/data", "menuimages", true, true);
      Module["FS_createPath"]("/data", "shader", true, true);
      Module["FS_createPath"]("/data/shader", "vulkan", true, true);
      Module["FS_createPath"]("/data", "skins", true, true);
      Module["FS_createPath"]("/data", "skins7", true, true);
      Module["FS_createPath"]("/data/skins7", "body", true, true);
      Module["FS_createPath"]("/data/skins7", "decoration", true, true);
      Module["FS_createPath"]("/data/skins7", "eyes", true, true);
      Module["FS_createPath"]("/data/skins7", "feet", true, true);
      Module["FS_createPath"]("/data/skins7", "hands", true, true);
      Module["FS_createPath"]("/data/skins7", "marking", true, true);
      Module["FS_createPath"]("/data", "themes", true, true);
      for (var file of metadata["files"]) {
        var name = file["filename"];
        Module["addRunDependency"](`fp ${name}`);
      }
      async function processPackageData(arrayBuffer) {
        assert(arrayBuffer, "Loading data file failed.");
        assert(arrayBuffer.constructor.name === ArrayBuffer.name, "bad input to processPackageData " + arrayBuffer.constructor.name);
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        // Reuse the bytearray from the XHR as the source for file reads.
        for (var file of metadata["files"]) {
          var name = file["filename"];
          var data = byteArray.subarray(file["start"], file["end"]);
          // canOwn this data in the filesystem, it is a slice into the heap that will never change
          Module["FS_createDataFile"](name, null, data, true, true, true);
          Module["removeRunDependency"](`fp ${name}`);
        }
        Module["removeRunDependency"]("datafile_DDNet.data");
      }
      Module["addRunDependency"]("datafile_DDNet.data");
      if (!Module["preloadResults"]) Module["preloadResults"] = {};
      Module["preloadResults"][PACKAGE_NAME] = {
        fromCache: false
      };
      if (!fetched) {
        fetched = await fetchPromise;
      }
      processPackageData(fetched);
    }
    if (Module["calledRun"]) {
      runWithFS(Module);
    } else {
      if (!Module["preRun"]) Module["preRun"] = [];
      Module["preRun"].push(runWithFS);
    }
  }
  loadPackage({
    "files": [ {
      "filename": "/data/announcement.txt",
      "start": 0,
      "end": 0
    }, {
      "filename": "/data/arrow.png",
      "start": 0,
      "end": 696
    }, {
      "filename": "/data/assets/entities/comfort/ddnet.png",
      "start": 696,
      "end": 127861
    }, {
      "filename": "/data/assets/entities/license.txt",
      "start": 127861,
      "end": 127957
    }, {
      "filename": "/data/assets/game/game_06.png",
      "start": 127957,
      "end": 287742
    }, {
      "filename": "/data/audio/foley_body_impact-01.wv",
      "start": 287742,
      "end": 297368
    }, {
      "filename": "/data/audio/foley_body_impact-02.wv",
      "start": 297368,
      "end": 305732
    }, {
      "filename": "/data/audio/foley_body_impact-03.wv",
      "start": 305732,
      "end": 313028
    }, {
      "filename": "/data/audio/foley_body_splat-01.wv",
      "start": 313028,
      "end": 340816
    }, {
      "filename": "/data/audio/foley_body_splat-02.wv",
      "start": 340816,
      "end": 365334
    }, {
      "filename": "/data/audio/foley_body_splat-03.wv",
      "start": 365334,
      "end": 391192
    }, {
      "filename": "/data/audio/foley_body_splat-04.wv",
      "start": 391192,
      "end": 418708
    }, {
      "filename": "/data/audio/foley_dbljump-01.wv",
      "start": 418708,
      "end": 420580
    }, {
      "filename": "/data/audio/foley_dbljump-02.wv",
      "start": 420580,
      "end": 423126
    }, {
      "filename": "/data/audio/foley_dbljump-03.wv",
      "start": 423126,
      "end": 425072
    }, {
      "filename": "/data/audio/foley_foot_left-01.wv",
      "start": 425072,
      "end": 431428
    }, {
      "filename": "/data/audio/foley_foot_left-02.wv",
      "start": 431428,
      "end": 438202
    }, {
      "filename": "/data/audio/foley_foot_left-03.wv",
      "start": 438202,
      "end": 445330
    }, {
      "filename": "/data/audio/foley_foot_left-04.wv",
      "start": 445330,
      "end": 451832
    }, {
      "filename": "/data/audio/foley_foot_right-01.wv",
      "start": 451832,
      "end": 457964
    }, {
      "filename": "/data/audio/foley_foot_right-02.wv",
      "start": 457964,
      "end": 464976
    }, {
      "filename": "/data/audio/foley_foot_right-03.wv",
      "start": 464976,
      "end": 471692
    }, {
      "filename": "/data/audio/foley_foot_right-04.wv",
      "start": 471692,
      "end": 478348
    }, {
      "filename": "/data/audio/foley_land-01.wv",
      "start": 478348,
      "end": 486508
    }, {
      "filename": "/data/audio/foley_land-02.wv",
      "start": 486508,
      "end": 494886
    }, {
      "filename": "/data/audio/foley_land-03.wv",
      "start": 494886,
      "end": 503176
    }, {
      "filename": "/data/audio/foley_land-04.wv",
      "start": 503176,
      "end": 512352
    }, {
      "filename": "/data/audio/hook_attach-01.wv",
      "start": 512352,
      "end": 517872
    }, {
      "filename": "/data/audio/hook_attach-02.wv",
      "start": 517872,
      "end": 523050
    }, {
      "filename": "/data/audio/hook_attach-03.wv",
      "start": 523050,
      "end": 528206
    }, {
      "filename": "/data/audio/hook_loop-01.wv",
      "start": 528206,
      "end": 556916
    }, {
      "filename": "/data/audio/hook_loop-02.wv",
      "start": 556916,
      "end": 580384
    }, {
      "filename": "/data/audio/hook_noattach-01.wv",
      "start": 580384,
      "end": 583376
    }, {
      "filename": "/data/audio/hook_noattach-02.wv",
      "start": 583376,
      "end": 587512
    }, {
      "filename": "/data/audio/hook_noattach-03.wv",
      "start": 587512,
      "end": 590272
    }, {
      "filename": "/data/audio/music_menu.wv",
      "start": 590272,
      "end": 1269056
    }, {
      "filename": "/data/audio/sfx_ctf_cap_pl.wv",
      "start": 1269056,
      "end": 1307428
    }, {
      "filename": "/data/audio/sfx_ctf_drop.wv",
      "start": 1307428,
      "end": 1332362
    }, {
      "filename": "/data/audio/sfx_ctf_grab_en.wv",
      "start": 1332362,
      "end": 1346730
    }, {
      "filename": "/data/audio/sfx_ctf_grab_pl.wv",
      "start": 1346730,
      "end": 1357298
    }, {
      "filename": "/data/audio/sfx_ctf_rtn.wv",
      "start": 1357298,
      "end": 1374592
    }, {
      "filename": "/data/audio/sfx_hit_strong-01.wv",
      "start": 1374592,
      "end": 1379090
    }, {
      "filename": "/data/audio/sfx_hit_strong-02.wv",
      "start": 1379090,
      "end": 1383750
    }, {
      "filename": "/data/audio/sfx_hit_weak-01.wv",
      "start": 1383750,
      "end": 1387788
    }, {
      "filename": "/data/audio/sfx_hit_weak-02.wv",
      "start": 1387788,
      "end": 1392402
    }, {
      "filename": "/data/audio/sfx_hit_weak-03.wv",
      "start": 1392402,
      "end": 1396664
    }, {
      "filename": "/data/audio/sfx_msg-client.wv",
      "start": 1396664,
      "end": 1400818
    }, {
      "filename": "/data/audio/sfx_msg-highlight.wv",
      "start": 1400818,
      "end": 1402466
    }, {
      "filename": "/data/audio/sfx_msg-server.wv",
      "start": 1402466,
      "end": 1408150
    }, {
      "filename": "/data/audio/sfx_pickup_arm-01.wv",
      "start": 1408150,
      "end": 1414712
    }, {
      "filename": "/data/audio/sfx_pickup_arm-02.wv",
      "start": 1414712,
      "end": 1420254
    }, {
      "filename": "/data/audio/sfx_pickup_arm-03.wv",
      "start": 1420254,
      "end": 1426400
    }, {
      "filename": "/data/audio/sfx_pickup_arm-04.wv",
      "start": 1426400,
      "end": 1432134
    }, {
      "filename": "/data/audio/sfx_pickup_gun.wv",
      "start": 1432134,
      "end": 1444224
    }, {
      "filename": "/data/audio/sfx_pickup_hrt-01.wv",
      "start": 1444224,
      "end": 1448992
    }, {
      "filename": "/data/audio/sfx_pickup_hrt-02.wv",
      "start": 1448992,
      "end": 1453982
    }, {
      "filename": "/data/audio/sfx_pickup_launcher.wv",
      "start": 1453982,
      "end": 1475728
    }, {
      "filename": "/data/audio/sfx_pickup_ninja.wv",
      "start": 1475728,
      "end": 1519948
    }, {
      "filename": "/data/audio/sfx_pickup_sg.wv",
      "start": 1519948,
      "end": 1541478
    }, {
      "filename": "/data/audio/sfx_skid-01.wv",
      "start": 1541478,
      "end": 1546042
    }, {
      "filename": "/data/audio/sfx_skid-02.wv",
      "start": 1546042,
      "end": 1552170
    }, {
      "filename": "/data/audio/sfx_skid-03.wv",
      "start": 1552170,
      "end": 1558034
    }, {
      "filename": "/data/audio/sfx_skid-04.wv",
      "start": 1558034,
      "end": 1562658
    }, {
      "filename": "/data/audio/sfx_spawn_wpn-01.wv",
      "start": 1562658,
      "end": 1576050
    }, {
      "filename": "/data/audio/sfx_spawn_wpn-02.wv",
      "start": 1576050,
      "end": 1588462
    }, {
      "filename": "/data/audio/sfx_spawn_wpn-03.wv",
      "start": 1588462,
      "end": 1600320
    }, {
      "filename": "/data/audio/vo_teefault_cry-01.wv",
      "start": 1600320,
      "end": 1655492
    }, {
      "filename": "/data/audio/vo_teefault_cry-02.wv",
      "start": 1655492,
      "end": 1696526
    }, {
      "filename": "/data/audio/vo_teefault_ninja-01.wv",
      "start": 1696526,
      "end": 1708832
    }, {
      "filename": "/data/audio/vo_teefault_ninja-02.wv",
      "start": 1708832,
      "end": 1737556
    }, {
      "filename": "/data/audio/vo_teefault_ninja-03.wv",
      "start": 1737556,
      "end": 1754556
    }, {
      "filename": "/data/audio/vo_teefault_ninja-04.wv",
      "start": 1754556,
      "end": 1768276
    }, {
      "filename": "/data/audio/vo_teefault_pain_long-01.wv",
      "start": 1768276,
      "end": 1820930
    }, {
      "filename": "/data/audio/vo_teefault_pain_long-02.wv",
      "start": 1820930,
      "end": 1868378
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-01.wv",
      "start": 1868378,
      "end": 1875506
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-02.wv",
      "start": 1875506,
      "end": 1885718
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-03.wv",
      "start": 1885718,
      "end": 1891392
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-04.wv",
      "start": 1891392,
      "end": 1900744
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-05.wv",
      "start": 1900744,
      "end": 1906944
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-06.wv",
      "start": 1906944,
      "end": 1919118
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-07.wv",
      "start": 1919118,
      "end": 1926014
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-08.wv",
      "start": 1926014,
      "end": 1933604
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-09.wv",
      "start": 1933604,
      "end": 1940352
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-10.wv",
      "start": 1940352,
      "end": 1959208
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-11.wv",
      "start": 1959208,
      "end": 1971344
    }, {
      "filename": "/data/audio/vo_teefault_pain_short-12.wv",
      "start": 1971344,
      "end": 1977068
    }, {
      "filename": "/data/audio/vo_teefault_sledge-01.wv",
      "start": 1977068,
      "end": 2005518
    }, {
      "filename": "/data/audio/vo_teefault_sledge-02.wv",
      "start": 2005518,
      "end": 2042668
    }, {
      "filename": "/data/audio/vo_teefault_sledge-03.wv",
      "start": 2042668,
      "end": 2060664
    }, {
      "filename": "/data/audio/vo_teefault_spawn-01.wv",
      "start": 2060664,
      "end": 2071502
    }, {
      "filename": "/data/audio/vo_teefault_spawn-02.wv",
      "start": 2071502,
      "end": 2099614
    }, {
      "filename": "/data/audio/vo_teefault_spawn-03.wv",
      "start": 2099614,
      "end": 2133856
    }, {
      "filename": "/data/audio/vo_teefault_spawn-04.wv",
      "start": 2133856,
      "end": 2144414
    }, {
      "filename": "/data/audio/vo_teefault_spawn-05.wv",
      "start": 2144414,
      "end": 2169902
    }, {
      "filename": "/data/audio/vo_teefault_spawn-06.wv",
      "start": 2169902,
      "end": 2201684
    }, {
      "filename": "/data/audio/vo_teefault_spawn-07.wv",
      "start": 2201684,
      "end": 2224306
    }, {
      "filename": "/data/audio/wp_flump_explo-01.wv",
      "start": 2224306,
      "end": 2262942
    }, {
      "filename": "/data/audio/wp_flump_explo-02.wv",
      "start": 2262942,
      "end": 2301040
    }, {
      "filename": "/data/audio/wp_flump_explo-03.wv",
      "start": 2301040,
      "end": 2340754
    }, {
      "filename": "/data/audio/wp_flump_launch-01.wv",
      "start": 2340754,
      "end": 2358770
    }, {
      "filename": "/data/audio/wp_flump_launch-02.wv",
      "start": 2358770,
      "end": 2376808
    }, {
      "filename": "/data/audio/wp_flump_launch-03.wv",
      "start": 2376808,
      "end": 2394004
    }, {
      "filename": "/data/audio/wp_gun_fire-01.wv",
      "start": 2394004,
      "end": 2419156
    }, {
      "filename": "/data/audio/wp_gun_fire-02.wv",
      "start": 2419156,
      "end": 2445910
    }, {
      "filename": "/data/audio/wp_gun_fire-03.wv",
      "start": 2445910,
      "end": 2472812
    }, {
      "filename": "/data/audio/wp_hammer_hit-01.wv",
      "start": 2472812,
      "end": 2491564
    }, {
      "filename": "/data/audio/wp_hammer_hit-02.wv",
      "start": 2491564,
      "end": 2510500
    }, {
      "filename": "/data/audio/wp_hammer_hit-03.wv",
      "start": 2510500,
      "end": 2529076
    }, {
      "filename": "/data/audio/wp_hammer_swing-01.wv",
      "start": 2529076,
      "end": 2544758
    }, {
      "filename": "/data/audio/wp_hammer_swing-02.wv",
      "start": 2544758,
      "end": 2560708
    }, {
      "filename": "/data/audio/wp_hammer_swing-03.wv",
      "start": 2560708,
      "end": 2577804
    }, {
      "filename": "/data/audio/wp_laser_bnce-01.wv",
      "start": 2577804,
      "end": 2580002
    }, {
      "filename": "/data/audio/wp_laser_bnce-02.wv",
      "start": 2580002,
      "end": 2582236
    }, {
      "filename": "/data/audio/wp_laser_bnce-03.wv",
      "start": 2582236,
      "end": 2584436
    }, {
      "filename": "/data/audio/wp_laser_fire-01.wv",
      "start": 2584436,
      "end": 2595066
    }, {
      "filename": "/data/audio/wp_laser_fire-02.wv",
      "start": 2595066,
      "end": 2605256
    }, {
      "filename": "/data/audio/wp_laser_fire-03.wv",
      "start": 2605256,
      "end": 2615740
    }, {
      "filename": "/data/audio/wp_ninja_attack-01.wv",
      "start": 2615740,
      "end": 2698918
    }, {
      "filename": "/data/audio/wp_ninja_attack-02.wv",
      "start": 2698918,
      "end": 2780104
    }, {
      "filename": "/data/audio/wp_ninja_attack-03.wv",
      "start": 2780104,
      "end": 2871950
    }, {
      "filename": "/data/audio/wp_ninja_attack-04.wv",
      "start": 2871950,
      "end": 2976758
    }, {
      "filename": "/data/audio/wp_ninja_hit-01.wv",
      "start": 2976758,
      "end": 3010828
    }, {
      "filename": "/data/audio/wp_ninja_hit-02.wv",
      "start": 3010828,
      "end": 3036138
    }, {
      "filename": "/data/audio/wp_ninja_hit-03.wv",
      "start": 3036138,
      "end": 3061618
    }, {
      "filename": "/data/audio/wp_ninja_hit-04.wv",
      "start": 3061618,
      "end": 3090620
    }, {
      "filename": "/data/audio/wp_noammo-01.wv",
      "start": 3090620,
      "end": 3098780
    }, {
      "filename": "/data/audio/wp_noammo-02.wv",
      "start": 3098780,
      "end": 3107614
    }, {
      "filename": "/data/audio/wp_noammo-03.wv",
      "start": 3107614,
      "end": 3115982
    }, {
      "filename": "/data/audio/wp_noammo-04.wv",
      "start": 3115982,
      "end": 3124208
    }, {
      "filename": "/data/audio/wp_noammo-05.wv",
      "start": 3124208,
      "end": 3132240
    }, {
      "filename": "/data/audio/wp_shotty_fire-01.wv",
      "start": 3132240,
      "end": 3158838
    }, {
      "filename": "/data/audio/wp_shotty_fire-02.wv",
      "start": 3158838,
      "end": 3185340
    }, {
      "filename": "/data/audio/wp_shotty_fire-03.wv",
      "start": 3185340,
      "end": 3210546
    }, {
      "filename": "/data/audio/wp_switch-01.wv",
      "start": 3210546,
      "end": 3221768
    }, {
      "filename": "/data/audio/wp_switch-02.wv",
      "start": 3221768,
      "end": 3232998
    }, {
      "filename": "/data/audio/wp_switch-03.wv",
      "start": 3232998,
      "end": 3243848
    }, {
      "filename": "/data/autoexec_server.cfg",
      "start": 3243848,
      "end": 3250315
    }, {
      "filename": "/data/background_noise.png",
      "start": 3250315,
      "end": 3260077
    }, {
      "filename": "/data/blob.png",
      "start": 3260077,
      "end": 3286966
    }, {
      "filename": "/data/censorlist.txt",
      "start": 3286966,
      "end": 3286966
    }, {
      "filename": "/data/communityicons/none.png",
      "start": 3286966,
      "end": 3289457
    }, {
      "filename": "/data/countryflags/AD.png",
      "start": 3289457,
      "end": 3291929
    }, {
      "filename": "/data/countryflags/AE.png",
      "start": 3291929,
      "end": 3292636
    }, {
      "filename": "/data/countryflags/AF.png",
      "start": 3292636,
      "end": 3295180
    }, {
      "filename": "/data/countryflags/AG.png",
      "start": 3295180,
      "end": 3297217
    }, {
      "filename": "/data/countryflags/AI.png",
      "start": 3297217,
      "end": 3299567
    }, {
      "filename": "/data/countryflags/AL.png",
      "start": 3299567,
      "end": 3301739
    }, {
      "filename": "/data/countryflags/AM.png",
      "start": 3301739,
      "end": 3302375
    }, {
      "filename": "/data/countryflags/AO.png",
      "start": 3302375,
      "end": 3303996
    }, {
      "filename": "/data/countryflags/AQ.png",
      "start": 3303996,
      "end": 3305572
    }, {
      "filename": "/data/countryflags/AR.png",
      "start": 3305572,
      "end": 3306981
    }, {
      "filename": "/data/countryflags/AS.png",
      "start": 3306981,
      "end": 3310841
    }, {
      "filename": "/data/countryflags/AT.png",
      "start": 3310841,
      "end": 3311564
    }, {
      "filename": "/data/countryflags/AU.png",
      "start": 3311564,
      "end": 3313850
    }, {
      "filename": "/data/countryflags/AW.png",
      "start": 3313850,
      "end": 3315012
    }, {
      "filename": "/data/countryflags/AX.png",
      "start": 3315012,
      "end": 3315922
    }, {
      "filename": "/data/countryflags/AZ.png",
      "start": 3315922,
      "end": 3317342
    }, {
      "filename": "/data/countryflags/BA.png",
      "start": 3317342,
      "end": 3319400
    }, {
      "filename": "/data/countryflags/BB.png",
      "start": 3319400,
      "end": 3320647
    }, {
      "filename": "/data/countryflags/BD.png",
      "start": 3320647,
      "end": 3321686
    }, {
      "filename": "/data/countryflags/BE.png",
      "start": 3321686,
      "end": 3322253
    }, {
      "filename": "/data/countryflags/BF.png",
      "start": 3322253,
      "end": 3323235
    }, {
      "filename": "/data/countryflags/BG.png",
      "start": 3323235,
      "end": 3323944
    }, {
      "filename": "/data/countryflags/BH.png",
      "start": 3323944,
      "end": 3325250
    }, {
      "filename": "/data/countryflags/BI.png",
      "start": 3325250,
      "end": 3327734
    }, {
      "filename": "/data/countryflags/BJ.png",
      "start": 3327734,
      "end": 3328411
    }, {
      "filename": "/data/countryflags/BL.png",
      "start": 3328411,
      "end": 3335150
    }, {
      "filename": "/data/countryflags/BM.png",
      "start": 3335150,
      "end": 3338305
    }, {
      "filename": "/data/countryflags/BN.png",
      "start": 3338305,
      "end": 3342057
    }, {
      "filename": "/data/countryflags/BO.png",
      "start": 3342057,
      "end": 3343639
    }, {
      "filename": "/data/countryflags/BR.png",
      "start": 3343639,
      "end": 3346167
    }, {
      "filename": "/data/countryflags/BS.png",
      "start": 3346167,
      "end": 3347247
    }, {
      "filename": "/data/countryflags/BT.png",
      "start": 3347247,
      "end": 3351348
    }, {
      "filename": "/data/countryflags/BW.png",
      "start": 3351348,
      "end": 3351987
    }, {
      "filename": "/data/countryflags/BY.png",
      "start": 3351987,
      "end": 3354894
    }, {
      "filename": "/data/countryflags/BZ.png",
      "start": 3354894,
      "end": 3359913
    }, {
      "filename": "/data/countryflags/CA.png",
      "start": 3359913,
      "end": 3361237
    }, {
      "filename": "/data/countryflags/CC.png",
      "start": 3361237,
      "end": 3363107
    }, {
      "filename": "/data/countryflags/CD.png",
      "start": 3363107,
      "end": 3365808
    }, {
      "filename": "/data/countryflags/CF.png",
      "start": 3365808,
      "end": 3366858
    }, {
      "filename": "/data/countryflags/CG.png",
      "start": 3366858,
      "end": 3368326
    }, {
      "filename": "/data/countryflags/CH.png",
      "start": 3368326,
      "end": 3369153
    }, {
      "filename": "/data/countryflags/CI.png",
      "start": 3369153,
      "end": 3369822
    }, {
      "filename": "/data/countryflags/CK.png",
      "start": 3369822,
      "end": 3373010
    }, {
      "filename": "/data/countryflags/CL.png",
      "start": 3373010,
      "end": 3373924
    }, {
      "filename": "/data/countryflags/CM.png",
      "start": 3373924,
      "end": 3374963
    }, {
      "filename": "/data/countryflags/CN.png",
      "start": 3374963,
      "end": 3376160
    }, {
      "filename": "/data/countryflags/CO.png",
      "start": 3376160,
      "end": 3376858
    }, {
      "filename": "/data/countryflags/CR.png",
      "start": 3376858,
      "end": 3378244
    }, {
      "filename": "/data/countryflags/CU.png",
      "start": 3378244,
      "end": 3379718
    }, {
      "filename": "/data/countryflags/CV.png",
      "start": 3379718,
      "end": 3381250
    }, {
      "filename": "/data/countryflags/CW.png",
      "start": 3381250,
      "end": 3382257
    }, {
      "filename": "/data/countryflags/CX.png",
      "start": 3382257,
      "end": 3384668
    }, {
      "filename": "/data/countryflags/CY.png",
      "start": 3384668,
      "end": 3386439
    }, {
      "filename": "/data/countryflags/CZ.png",
      "start": 3386439,
      "end": 3387329
    }, {
      "filename": "/data/countryflags/DE.png",
      "start": 3387329,
      "end": 3387890
    }, {
      "filename": "/data/countryflags/DJ.png",
      "start": 3387890,
      "end": 3389490
    }, {
      "filename": "/data/countryflags/DK.png",
      "start": 3389490,
      "end": 3390293
    }, {
      "filename": "/data/countryflags/DM.png",
      "start": 3390293,
      "end": 3392416
    }, {
      "filename": "/data/countryflags/DO.png",
      "start": 3392416,
      "end": 3393971
    }, {
      "filename": "/data/countryflags/DZ.png",
      "start": 3393971,
      "end": 3395477
    }, {
      "filename": "/data/countryflags/EC.png",
      "start": 3395477,
      "end": 3397966
    }, {
      "filename": "/data/countryflags/EE.png",
      "start": 3397966,
      "end": 3398525
    }, {
      "filename": "/data/countryflags/EG.png",
      "start": 3398525,
      "end": 3399821
    }, {
      "filename": "/data/countryflags/EH.png",
      "start": 3399821,
      "end": 3401185
    }, {
      "filename": "/data/countryflags/ER.png",
      "start": 3401185,
      "end": 3404331
    }, {
      "filename": "/data/countryflags/ES-CT.png",
      "start": 3404331,
      "end": 3405071
    }, {
      "filename": "/data/countryflags/ES-GA.png",
      "start": 3405071,
      "end": 3409176
    }, {
      "filename": "/data/countryflags/ES.png",
      "start": 3409176,
      "end": 3411229
    }, {
      "filename": "/data/countryflags/ET.png",
      "start": 3411229,
      "end": 3413711
    }, {
      "filename": "/data/countryflags/EU.png",
      "start": 3413711,
      "end": 3415366
    }, {
      "filename": "/data/countryflags/FI.png",
      "start": 3415366,
      "end": 3416131
    }, {
      "filename": "/data/countryflags/FJ.png",
      "start": 3416131,
      "end": 3419211
    }, {
      "filename": "/data/countryflags/FK.png",
      "start": 3419211,
      "end": 3423086
    }, {
      "filename": "/data/countryflags/FM.png",
      "start": 3423086,
      "end": 3424393
    }, {
      "filename": "/data/countryflags/FO.png",
      "start": 3424393,
      "end": 3425311
    }, {
      "filename": "/data/countryflags/FR.png",
      "start": 3425311,
      "end": 3426062
    }, {
      "filename": "/data/countryflags/GA.png",
      "start": 3426062,
      "end": 3426786
    }, {
      "filename": "/data/countryflags/GB-ENG.png",
      "start": 3426786,
      "end": 3427600
    }, {
      "filename": "/data/countryflags/GB-NIR.png",
      "start": 3427600,
      "end": 3429654
    }, {
      "filename": "/data/countryflags/GB-SCT.png",
      "start": 3429654,
      "end": 3431731
    }, {
      "filename": "/data/countryflags/GB-WLS.png",
      "start": 3431731,
      "end": 3436375
    }, {
      "filename": "/data/countryflags/GB.png",
      "start": 3436375,
      "end": 3439070
    }, {
      "filename": "/data/countryflags/GD.png",
      "start": 3439070,
      "end": 3441601
    }, {
      "filename": "/data/countryflags/GE.png",
      "start": 3441601,
      "end": 3443056
    }, {
      "filename": "/data/countryflags/GF.png",
      "start": 3443056,
      "end": 3444553
    }, {
      "filename": "/data/countryflags/GG.png",
      "start": 3444553,
      "end": 3445589
    }, {
      "filename": "/data/countryflags/GH.png",
      "start": 3445589,
      "end": 3446657
    }, {
      "filename": "/data/countryflags/GI.png",
      "start": 3446657,
      "end": 3448971
    }, {
      "filename": "/data/countryflags/GL.png",
      "start": 3448971,
      "end": 3450736
    }, {
      "filename": "/data/countryflags/GM.png",
      "start": 3450736,
      "end": 3451456
    }, {
      "filename": "/data/countryflags/GN.png",
      "start": 3451456,
      "end": 3452105
    }, {
      "filename": "/data/countryflags/GP.png",
      "start": 3452105,
      "end": 3458529
    }, {
      "filename": "/data/countryflags/GQ.png",
      "start": 3458529,
      "end": 3460021
    }, {
      "filename": "/data/countryflags/GR.png",
      "start": 3460021,
      "end": 3460942
    }, {
      "filename": "/data/countryflags/GS.png",
      "start": 3460942,
      "end": 3465597
    }, {
      "filename": "/data/countryflags/GT.png",
      "start": 3465597,
      "end": 3467438
    }, {
      "filename": "/data/countryflags/GU.png",
      "start": 3467438,
      "end": 3469577
    }, {
      "filename": "/data/countryflags/GW.png",
      "start": 3469577,
      "end": 3470636
    }, {
      "filename": "/data/countryflags/GY.png",
      "start": 3470636,
      "end": 3473442
    }, {
      "filename": "/data/countryflags/HK.png",
      "start": 3473442,
      "end": 3475400
    }, {
      "filename": "/data/countryflags/HN.png",
      "start": 3475400,
      "end": 3476716
    }, {
      "filename": "/data/countryflags/HR.png",
      "start": 3476716,
      "end": 3478922
    }, {
      "filename": "/data/countryflags/HT.png",
      "start": 3478922,
      "end": 3480406
    }, {
      "filename": "/data/countryflags/HU.png",
      "start": 3480406,
      "end": 3481169
    }, {
      "filename": "/data/countryflags/ID.png",
      "start": 3481169,
      "end": 3481870
    }, {
      "filename": "/data/countryflags/IE.png",
      "start": 3481870,
      "end": 3482563
    }, {
      "filename": "/data/countryflags/IL.png",
      "start": 3482563,
      "end": 3484001
    }, {
      "filename": "/data/countryflags/IM.png",
      "start": 3484001,
      "end": 3485922
    }, {
      "filename": "/data/countryflags/IN.png",
      "start": 3485922,
      "end": 3487342
    }, {
      "filename": "/data/countryflags/IO.png",
      "start": 3487342,
      "end": 3494339
    }, {
      "filename": "/data/countryflags/IQ.png",
      "start": 3494339,
      "end": 3495696
    }, {
      "filename": "/data/countryflags/IR.png",
      "start": 3495696,
      "end": 3498171
    }, {
      "filename": "/data/countryflags/IS.png",
      "start": 3498171,
      "end": 3499118
    }, {
      "filename": "/data/countryflags/IT.png",
      "start": 3499118,
      "end": 3499809
    }, {
      "filename": "/data/countryflags/JE.png",
      "start": 3499809,
      "end": 3502915
    }, {
      "filename": "/data/countryflags/JM.png",
      "start": 3502915,
      "end": 3505179
    }, {
      "filename": "/data/countryflags/JO.png",
      "start": 3505179,
      "end": 3506147
    }, {
      "filename": "/data/countryflags/JP.png",
      "start": 3506147,
      "end": 3507428
    }, {
      "filename": "/data/countryflags/KE.png",
      "start": 3507428,
      "end": 3509443
    }, {
      "filename": "/data/countryflags/KG.png",
      "start": 3509443,
      "end": 3512372
    }, {
      "filename": "/data/countryflags/KH.png",
      "start": 3512372,
      "end": 3514674
    }, {
      "filename": "/data/countryflags/KI.png",
      "start": 3514674,
      "end": 3518746
    }, {
      "filename": "/data/countryflags/KM.png",
      "start": 3518746,
      "end": 3520434
    }, {
      "filename": "/data/countryflags/KN.png",
      "start": 3520434,
      "end": 3522816
    }, {
      "filename": "/data/countryflags/KP.png",
      "start": 3522816,
      "end": 3524278
    }, {
      "filename": "/data/countryflags/KR.png",
      "start": 3524278,
      "end": 3526986
    }, {
      "filename": "/data/countryflags/KW.png",
      "start": 3526986,
      "end": 3527997
    }, {
      "filename": "/data/countryflags/KY.png",
      "start": 3527997,
      "end": 3531824
    }, {
      "filename": "/data/countryflags/KZ.png",
      "start": 3531824,
      "end": 3534658
    }, {
      "filename": "/data/countryflags/LA.png",
      "start": 3534658,
      "end": 3535607
    }, {
      "filename": "/data/countryflags/LB.png",
      "start": 3535607,
      "end": 3537412
    }, {
      "filename": "/data/countryflags/LC.png",
      "start": 3537412,
      "end": 3539181
    }, {
      "filename": "/data/countryflags/LI.png",
      "start": 3539181,
      "end": 3540617
    }, {
      "filename": "/data/countryflags/LK.png",
      "start": 3540617,
      "end": 3544576
    }, {
      "filename": "/data/countryflags/LR.png",
      "start": 3544576,
      "end": 3545735
    }, {
      "filename": "/data/countryflags/LS.png",
      "start": 3545735,
      "end": 3547030
    }, {
      "filename": "/data/countryflags/LT.png",
      "start": 3547030,
      "end": 3547715
    }, {
      "filename": "/data/countryflags/LU.png",
      "start": 3547715,
      "end": 3548459
    }, {
      "filename": "/data/countryflags/LV.png",
      "start": 3548459,
      "end": 3549154
    }, {
      "filename": "/data/countryflags/LY.png",
      "start": 3549154,
      "end": 3550289
    }, {
      "filename": "/data/countryflags/MA.png",
      "start": 3550289,
      "end": 3551821
    }, {
      "filename": "/data/countryflags/MC.png",
      "start": 3551821,
      "end": 3552504
    }, {
      "filename": "/data/countryflags/MD.png",
      "start": 3552504,
      "end": 3555020
    }, {
      "filename": "/data/countryflags/ME.png",
      "start": 3555020,
      "end": 3558141
    }, {
      "filename": "/data/countryflags/MF.png",
      "start": 3558141,
      "end": 3559625
    }, {
      "filename": "/data/countryflags/MG.png",
      "start": 3559625,
      "end": 3560330
    }, {
      "filename": "/data/countryflags/MH.png",
      "start": 3560330,
      "end": 3563532
    }, {
      "filename": "/data/countryflags/MK.png",
      "start": 3563532,
      "end": 3566105
    }, {
      "filename": "/data/countryflags/ML.png",
      "start": 3566105,
      "end": 3566762
    }, {
      "filename": "/data/countryflags/MM.png",
      "start": 3566762,
      "end": 3568208
    }, {
      "filename": "/data/countryflags/MN.png",
      "start": 3568208,
      "end": 3570173
    }, {
      "filename": "/data/countryflags/MO.png",
      "start": 3570173,
      "end": 3572122
    }, {
      "filename": "/data/countryflags/MP.png",
      "start": 3572122,
      "end": 3577340
    }, {
      "filename": "/data/countryflags/MQ.png",
      "start": 3577340,
      "end": 3578781
    }, {
      "filename": "/data/countryflags/MR.png",
      "start": 3578781,
      "end": 3580454
    }, {
      "filename": "/data/countryflags/MS.png",
      "start": 3580454,
      "end": 3583189
    }, {
      "filename": "/data/countryflags/MT.png",
      "start": 3583189,
      "end": 3584302
    }, {
      "filename": "/data/countryflags/MU.png",
      "start": 3584302,
      "end": 3585061
    }, {
      "filename": "/data/countryflags/MV.png",
      "start": 3585061,
      "end": 3586104
    }, {
      "filename": "/data/countryflags/MW.png",
      "start": 3586104,
      "end": 3588222
    }, {
      "filename": "/data/countryflags/MX.png",
      "start": 3588222,
      "end": 3590346
    }, {
      "filename": "/data/countryflags/MY.png",
      "start": 3590346,
      "end": 3592293
    }, {
      "filename": "/data/countryflags/MZ.png",
      "start": 3592293,
      "end": 3594242
    }, {
      "filename": "/data/countryflags/NA.png",
      "start": 3594242,
      "end": 3597434
    }, {
      "filename": "/data/countryflags/NC.png",
      "start": 3597434,
      "end": 3599809
    }, {
      "filename": "/data/countryflags/NE.png",
      "start": 3599809,
      "end": 3600781
    }, {
      "filename": "/data/countryflags/NF.png",
      "start": 3600781,
      "end": 3603446
    }, {
      "filename": "/data/countryflags/NG.png",
      "start": 3603446,
      "end": 3604072
    }, {
      "filename": "/data/countryflags/NI.png",
      "start": 3604072,
      "end": 3605412
    }, {
      "filename": "/data/countryflags/NL.png",
      "start": 3605412,
      "end": 3606147
    }, {
      "filename": "/data/countryflags/NO.png",
      "start": 3606147,
      "end": 3607044
    }, {
      "filename": "/data/countryflags/NP.png",
      "start": 3607044,
      "end": 3609008
    }, {
      "filename": "/data/countryflags/NR.png",
      "start": 3609008,
      "end": 3610166
    }, {
      "filename": "/data/countryflags/NU.png",
      "start": 3610166,
      "end": 3612798
    }, {
      "filename": "/data/countryflags/NZ.png",
      "start": 3612798,
      "end": 3614811
    }, {
      "filename": "/data/countryflags/OM.png",
      "start": 3614811,
      "end": 3616190
    }, {
      "filename": "/data/countryflags/PA.png",
      "start": 3616190,
      "end": 3617415
    }, {
      "filename": "/data/countryflags/PE.png",
      "start": 3617415,
      "end": 3618069
    }, {
      "filename": "/data/countryflags/PF.png",
      "start": 3618069,
      "end": 3619922
    }, {
      "filename": "/data/countryflags/PG.png",
      "start": 3619922,
      "end": 3622068
    }, {
      "filename": "/data/countryflags/PH.png",
      "start": 3622068,
      "end": 3623982
    }, {
      "filename": "/data/countryflags/PK.png",
      "start": 3623982,
      "end": 3625511
    }, {
      "filename": "/data/countryflags/PL.png",
      "start": 3625511,
      "end": 3626180
    }, {
      "filename": "/data/countryflags/PM.png",
      "start": 3626180,
      "end": 3633846
    }, {
      "filename": "/data/countryflags/PN.png",
      "start": 3633846,
      "end": 3638380
    }, {
      "filename": "/data/countryflags/PR.png",
      "start": 3638380,
      "end": 3639903
    }, {
      "filename": "/data/countryflags/PS.png",
      "start": 3639903,
      "end": 3641128
    }, {
      "filename": "/data/countryflags/PT.png",
      "start": 3641128,
      "end": 3643609
    }, {
      "filename": "/data/countryflags/PW.png",
      "start": 3643609,
      "end": 3644862
    }, {
      "filename": "/data/countryflags/PY.png",
      "start": 3644862,
      "end": 3646656
    }, {
      "filename": "/data/countryflags/QA.png",
      "start": 3646656,
      "end": 3647724
    }, {
      "filename": "/data/countryflags/RE.png",
      "start": 3647724,
      "end": 3652684
    }, {
      "filename": "/data/countryflags/RO.png",
      "start": 3652684,
      "end": 3653311
    }, {
      "filename": "/data/countryflags/RS.png",
      "start": 3653311,
      "end": 3656233
    }, {
      "filename": "/data/countryflags/RU.png",
      "start": 3656233,
      "end": 3656849
    }, {
      "filename": "/data/countryflags/RW.png",
      "start": 3656849,
      "end": 3658296
    }, {
      "filename": "/data/countryflags/SA.png",
      "start": 3658296,
      "end": 3660759
    }, {
      "filename": "/data/countryflags/SB.png",
      "start": 3660759,
      "end": 3663010
    }, {
      "filename": "/data/countryflags/SC.png",
      "start": 3663010,
      "end": 3665061
    }, {
      "filename": "/data/countryflags/SD.png",
      "start": 3665061,
      "end": 3665998
    }, {
      "filename": "/data/countryflags/SE.png",
      "start": 3665998,
      "end": 3666765
    }, {
      "filename": "/data/countryflags/SG.png",
      "start": 3666765,
      "end": 3668003
    }, {
      "filename": "/data/countryflags/SH.png",
      "start": 3668003,
      "end": 3670997
    }, {
      "filename": "/data/countryflags/SI.png",
      "start": 3670997,
      "end": 3672370
    }, {
      "filename": "/data/countryflags/SK.png",
      "start": 3672370,
      "end": 3674090
    }, {
      "filename": "/data/countryflags/SL.png",
      "start": 3674090,
      "end": 3674834
    }, {
      "filename": "/data/countryflags/SM.png",
      "start": 3674834,
      "end": 3677283
    }, {
      "filename": "/data/countryflags/SN.png",
      "start": 3677283,
      "end": 3678321
    }, {
      "filename": "/data/countryflags/SO.png",
      "start": 3678321,
      "end": 3679409
    }, {
      "filename": "/data/countryflags/SR.png",
      "start": 3679409,
      "end": 3680573
    }, {
      "filename": "/data/countryflags/SS.png",
      "start": 3680573,
      "end": 3682979
    }, {
      "filename": "/data/countryflags/ST.png",
      "start": 3682979,
      "end": 3684213
    }, {
      "filename": "/data/countryflags/SV.png",
      "start": 3684213,
      "end": 3685779
    }, {
      "filename": "/data/countryflags/SX.png",
      "start": 3685779,
      "end": 3688312
    }, {
      "filename": "/data/countryflags/SY.png",
      "start": 3688312,
      "end": 3690215
    }, {
      "filename": "/data/countryflags/SZ.png",
      "start": 3690215,
      "end": 3692541
    }, {
      "filename": "/data/countryflags/TC.png",
      "start": 3692541,
      "end": 3694809
    }, {
      "filename": "/data/countryflags/TD.png",
      "start": 3694809,
      "end": 3695443
    }, {
      "filename": "/data/countryflags/TF.png",
      "start": 3695443,
      "end": 3697043
    }, {
      "filename": "/data/countryflags/TG.png",
      "start": 3697043,
      "end": 3698145
    }, {
      "filename": "/data/countryflags/TH.png",
      "start": 3698145,
      "end": 3698857
    }, {
      "filename": "/data/countryflags/TJ.png",
      "start": 3698857,
      "end": 3700329
    }, {
      "filename": "/data/countryflags/TK.png",
      "start": 3700329,
      "end": 3702429
    }, {
      "filename": "/data/countryflags/TL.png",
      "start": 3702429,
      "end": 3703703
    }, {
      "filename": "/data/countryflags/TM.png",
      "start": 3703703,
      "end": 3706825
    }, {
      "filename": "/data/countryflags/TN.png",
      "start": 3706825,
      "end": 3708416
    }, {
      "filename": "/data/countryflags/TO.png",
      "start": 3708416,
      "end": 3709115
    }, {
      "filename": "/data/countryflags/TR.png",
      "start": 3709115,
      "end": 3710582
    }, {
      "filename": "/data/countryflags/TT.png",
      "start": 3710582,
      "end": 3712375
    }, {
      "filename": "/data/countryflags/TV.png",
      "start": 3712375,
      "end": 3715489
    }, {
      "filename": "/data/countryflags/TW.png",
      "start": 3715489,
      "end": 3716471
    }, {
      "filename": "/data/countryflags/TZ.png",
      "start": 3716471,
      "end": 3718645
    }, {
      "filename": "/data/countryflags/UA.png",
      "start": 3718645,
      "end": 3719317
    }, {
      "filename": "/data/countryflags/UG.png",
      "start": 3719317,
      "end": 3720555
    }, {
      "filename": "/data/countryflags/US.png",
      "start": 3720555,
      "end": 3722828
    }, {
      "filename": "/data/countryflags/UY.png",
      "start": 3722828,
      "end": 3724862
    }, {
      "filename": "/data/countryflags/UZ.png",
      "start": 3724862,
      "end": 3726130
    }, {
      "filename": "/data/countryflags/VA.png",
      "start": 3726130,
      "end": 3728562
    }, {
      "filename": "/data/countryflags/VC.png",
      "start": 3728562,
      "end": 3729940
    }, {
      "filename": "/data/countryflags/VE.png",
      "start": 3729940,
      "end": 3731182
    }, {
      "filename": "/data/countryflags/VG.png",
      "start": 3731182,
      "end": 3734222
    }, {
      "filename": "/data/countryflags/VI.png",
      "start": 3734222,
      "end": 3739132
    }, {
      "filename": "/data/countryflags/VN.png",
      "start": 3739132,
      "end": 3740297
    }, {
      "filename": "/data/countryflags/VU.png",
      "start": 3740297,
      "end": 3742503
    }, {
      "filename": "/data/countryflags/WF.png",
      "start": 3742503,
      "end": 3743658
    }, {
      "filename": "/data/countryflags/WS.png",
      "start": 3743658,
      "end": 3744781
    }, {
      "filename": "/data/countryflags/YE.png",
      "start": 3744781,
      "end": 3745403
    }, {
      "filename": "/data/countryflags/ZA.png",
      "start": 3745403,
      "end": 3747513
    }, {
      "filename": "/data/countryflags/ZM.png",
      "start": 3747513,
      "end": 3748677
    }, {
      "filename": "/data/countryflags/ZW.png",
      "start": 3748677,
      "end": 3750610
    }, {
      "filename": "/data/countryflags/default.png",
      "start": 3750610,
      "end": 3752134
    }, {
      "filename": "/data/countryflags/index.txt",
      "start": 3752134,
      "end": 3755912
    }, {
      "filename": "/data/deadtee.png",
      "start": 3755912,
      "end": 3759999
    }, {
      "filename": "/data/debug_font.png",
      "start": 3759999,
      "end": 3764047
    }, {
      "filename": "/data/editor/audio_source.png",
      "start": 3764047,
      "end": 3769725
    }, {
      "filename": "/data/editor/automap/basic_freeze.rules",
      "start": 3769725,
      "end": 3777667
    }, {
      "filename": "/data/editor/automap/ddmax_freeze.rules",
      "start": 3777667,
      "end": 3780255
    }, {
      "filename": "/data/editor/automap/ddnet_grass.rules",
      "start": 3780255,
      "end": 3798102
    }, {
      "filename": "/data/editor/automap/ddnet_tiles.rules",
      "start": 3798102,
      "end": 3799100
    }, {
      "filename": "/data/editor/automap/ddnet_walls.rules",
      "start": 3799100,
      "end": 3804229
    }, {
      "filename": "/data/editor/automap/desert_main.rules",
      "start": 3804229,
      "end": 3806682
    }, {
      "filename": "/data/editor/automap/fadeout.rules",
      "start": 3806682,
      "end": 3807704
    }, {
      "filename": "/data/editor/automap/generic_clear.rules",
      "start": 3807704,
      "end": 3812257
    }, {
      "filename": "/data/editor/automap/generic_unhookable.rules",
      "start": 3812257,
      "end": 3832356
    }, {
      "filename": "/data/editor/automap/generic_unhookable_0.7.rules",
      "start": 3832356,
      "end": 3857049
    }, {
      "filename": "/data/editor/automap/grass_main.rules",
      "start": 3857049,
      "end": 3864935
    }, {
      "filename": "/data/editor/automap/jungle_main.rules",
      "start": 3864935,
      "end": 3868816
    }, {
      "filename": "/data/editor/automap/jungle_midground.rules",
      "start": 3868816,
      "end": 3889614
    }, {
      "filename": "/data/editor/automap/round_tiles.rules",
      "start": 3889614,
      "end": 3891373
    }, {
      "filename": "/data/editor/automap/water.rules",
      "start": 3891373,
      "end": 3906837
    }, {
      "filename": "/data/editor/automap/winter_main.rules",
      "start": 3906837,
      "end": 3910054
    }, {
      "filename": "/data/editor/checker.png",
      "start": 3910054,
      "end": 3910168
    }, {
      "filename": "/data/editor/cursor.png",
      "start": 3910168,
      "end": 3911885
    }, {
      "filename": "/data/editor/cursor_resize.png",
      "start": 3911885,
      "end": 3917366
    }, {
      "filename": "/data/editor/cursor_text.png",
      "start": 3917366,
      "end": 3917945
    }, {
      "filename": "/data/editor/entities/DDNet.png",
      "start": 3917945,
      "end": 4219069
    }, {
      "filename": "/data/editor/entities/F-DDrace.png",
      "start": 4219069,
      "end": 4784562
    }, {
      "filename": "/data/editor/entities/FNG.png",
      "start": 4784562,
      "end": 4851961
    }, {
      "filename": "/data/editor/entities/Race.png",
      "start": 4851961,
      "end": 4926924
    }, {
      "filename": "/data/editor/entities/Vanilla.png",
      "start": 4926924,
      "end": 4978060
    }, {
      "filename": "/data/editor/entities/blockworlds.png",
      "start": 4978060,
      "end": 5040919
    }, {
      "filename": "/data/editor/entities_clear/blockworlds.png",
      "start": 5040919,
      "end": 5096635
    }, {
      "filename": "/data/editor/entities_clear/ddnet.png",
      "start": 5096635,
      "end": 5395696
    }, {
      "filename": "/data/editor/entities_clear/ddrace.png",
      "start": 5395696,
      "end": 5589712
    }, {
      "filename": "/data/editor/entities_clear/f-ddrace.png",
      "start": 5589712,
      "end": 6159896
    }, {
      "filename": "/data/editor/entities_clear/fng.png",
      "start": 6159896,
      "end": 6224144
    }, {
      "filename": "/data/editor/entities_clear/race.png",
      "start": 6224144,
      "end": 6295989
    }, {
      "filename": "/data/editor/entities_clear/vanilla.png",
      "start": 6295989,
      "end": 6343985
    }, {
      "filename": "/data/editor/front.png",
      "start": 6343985,
      "end": 6717919
    }, {
      "filename": "/data/editor/speed_arrow.png",
      "start": 6717919,
      "end": 6718333
    }, {
      "filename": "/data/editor/speed_arrow_array.png",
      "start": 6718333,
      "end": 6833962
    }, {
      "filename": "/data/editor/speedup.png",
      "start": 6833962,
      "end": 6859836
    }, {
      "filename": "/data/editor/switch.png",
      "start": 6859836,
      "end": 7057573
    }, {
      "filename": "/data/editor/tele.png",
      "start": 7057573,
      "end": 7077437
    }, {
      "filename": "/data/editor/tune.png",
      "start": 7077437,
      "end": 7094876
    }, {
      "filename": "/data/emoticons.png",
      "start": 7094876,
      "end": 7135677
    }, {
      "filename": "/data/extras.png",
      "start": 7135677,
      "end": 7144296
    }, {
      "filename": "/data/fonts/DejaVuSans.ttf",
      "start": 7144296,
      "end": 7901372
    }, {
      "filename": "/data/fonts/Font_Awesome_6_Free-Solid-900.otf",
      "start": 7901372,
      "end": 8933020
    }, {
      "filename": "/data/fonts/GlowSansJ-Compressed-Book.otf",
      "start": 8933020,
      "end": 17934232
    }, {
      "filename": "/data/fonts/SourceHanSans.ttc",
      "start": 17934232,
      "end": 38265492
    }, {
      "filename": "/data/fonts/index.json",
      "start": 38265492,
      "end": 38266007
    }, {
      "filename": "/data/game.png",
      "start": 38266007,
      "end": 38413066
    }, {
      "filename": "/data/gui_buttons.png",
      "start": 38413066,
      "end": 38419469
    }, {
      "filename": "/data/gui_cursor.png",
      "start": 38419469,
      "end": 38421211
    }, {
      "filename": "/data/gui_icons.png",
      "start": 38421211,
      "end": 38429713
    }, {
      "filename": "/data/gui_logo.png",
      "start": 38429713,
      "end": 38508499
    }, {
      "filename": "/data/hud.png",
      "start": 38508499,
      "end": 38592396
    }, {
      "filename": "/data/languages/arabic.txt",
      "start": 38592396,
      "end": 38631542
    }, {
      "filename": "/data/languages/azerbaijani.txt",
      "start": 38631542,
      "end": 38676432
    }, {
      "filename": "/data/languages/belarusian.txt",
      "start": 38676432,
      "end": 38733874
    }, {
      "filename": "/data/languages/bosnian.txt",
      "start": 38733874,
      "end": 38765923
    }, {
      "filename": "/data/languages/brazilian_portuguese.txt",
      "start": 38765923,
      "end": 38815630
    }, {
      "filename": "/data/languages/bulgarian.txt",
      "start": 38815630,
      "end": 38846389
    }, {
      "filename": "/data/languages/catalan.txt",
      "start": 38846389,
      "end": 38880423
    }, {
      "filename": "/data/languages/chuvash.txt",
      "start": 38880423,
      "end": 38910805
    }, {
      "filename": "/data/languages/czech.txt",
      "start": 38910805,
      "end": 38956846
    }, {
      "filename": "/data/languages/danish.txt",
      "start": 38956846,
      "end": 38999064
    }, {
      "filename": "/data/languages/dutch.txt",
      "start": 38999064,
      "end": 39042142
    }, {
      "filename": "/data/languages/esperanto.txt",
      "start": 39042142,
      "end": 39079629
    }, {
      "filename": "/data/languages/estonian.txt",
      "start": 39079629,
      "end": 39119539
    }, {
      "filename": "/data/languages/finnish.txt",
      "start": 39119539,
      "end": 39160058
    }, {
      "filename": "/data/languages/french.txt",
      "start": 39160058,
      "end": 39204886
    }, {
      "filename": "/data/languages/galician.txt",
      "start": 39204886,
      "end": 39243154
    }, {
      "filename": "/data/languages/german.txt",
      "start": 39243154,
      "end": 39290220
    }, {
      "filename": "/data/languages/greek.txt",
      "start": 39290220,
      "end": 39321546
    }, {
      "filename": "/data/languages/hungarian.txt",
      "start": 39321546,
      "end": 39360650
    }, {
      "filename": "/data/languages/index.txt",
      "start": 39360650,
      "end": 39362363
    }, {
      "filename": "/data/languages/italian.txt",
      "start": 39362363,
      "end": 39398459
    }, {
      "filename": "/data/languages/japanese.txt",
      "start": 39398459,
      "end": 39433840
    }, {
      "filename": "/data/languages/korean.txt",
      "start": 39433840,
      "end": 39484691
    }, {
      "filename": "/data/languages/kyrgyz.txt",
      "start": 39484691,
      "end": 39515603
    }, {
      "filename": "/data/languages/license.txt",
      "start": 39515603,
      "end": 39515767
    }, {
      "filename": "/data/languages/norwegian.txt",
      "start": 39515767,
      "end": 39548066
    }, {
      "filename": "/data/languages/persian.txt",
      "start": 39548066,
      "end": 39610892
    }, {
      "filename": "/data/languages/polish.txt",
      "start": 39610892,
      "end": 39658859
    }, {
      "filename": "/data/languages/portuguese.txt",
      "start": 39658859,
      "end": 39702748
    }, {
      "filename": "/data/languages/romanian.txt",
      "start": 39702748,
      "end": 39747959
    }, {
      "filename": "/data/languages/russian.txt",
      "start": 39747959,
      "end": 39809064
    }, {
      "filename": "/data/languages/serbian.txt",
      "start": 39809064,
      "end": 39849717
    }, {
      "filename": "/data/languages/serbian_cyrillic.txt",
      "start": 39849717,
      "end": 39891518
    }, {
      "filename": "/data/languages/simplified_chinese.txt",
      "start": 39891518,
      "end": 39937378
    }, {
      "filename": "/data/languages/slovak.txt",
      "start": 39937378,
      "end": 39983544
    }, {
      "filename": "/data/languages/spanish.txt",
      "start": 39983544,
      "end": 40030992
    }, {
      "filename": "/data/languages/swedish.txt",
      "start": 40030992,
      "end": 40075832
    }, {
      "filename": "/data/languages/traditional_chinese.txt",
      "start": 40075832,
      "end": 40121237
    }, {
      "filename": "/data/languages/turkish.txt",
      "start": 40121237,
      "end": 40170357
    }, {
      "filename": "/data/languages/ukrainian.txt",
      "start": 40170357,
      "end": 40235717
    }, {
      "filename": "/data/mapres/basic_freeze.png",
      "start": 40235717,
      "end": 40259031
    }, {
      "filename": "/data/mapres/bg_cloud1.png",
      "start": 40259031,
      "end": 40317155
    }, {
      "filename": "/data/mapres/bg_cloud2.png",
      "start": 40317155,
      "end": 40369496
    }, {
      "filename": "/data/mapres/bg_cloud3.png",
      "start": 40369496,
      "end": 40385657
    }, {
      "filename": "/data/mapres/ddmax_freeze.png",
      "start": 40385657,
      "end": 40392528
    }, {
      "filename": "/data/mapres/ddnet_grass.png",
      "start": 40392528,
      "end": 40566295
    }, {
      "filename": "/data/mapres/ddnet_start.png",
      "start": 40566295,
      "end": 40580441
    }, {
      "filename": "/data/mapres/ddnet_tiles.png",
      "start": 40580441,
      "end": 40626850
    }, {
      "filename": "/data/mapres/ddnet_walls.png",
      "start": 40626850,
      "end": 40631644
    }, {
      "filename": "/data/mapres/desert_background.png",
      "start": 40631644,
      "end": 40661576
    }, {
      "filename": "/data/mapres/desert_doodads.png",
      "start": 40661576,
      "end": 40821646
    }, {
      "filename": "/data/mapres/desert_main.png",
      "start": 40821646,
      "end": 40903669
    }, {
      "filename": "/data/mapres/desert_mountains.png",
      "start": 40903669,
      "end": 40919508
    }, {
      "filename": "/data/mapres/desert_mountains2.png",
      "start": 40919508,
      "end": 40925605
    }, {
      "filename": "/data/mapres/desert_mountains_new_background.png",
      "start": 40925605,
      "end": 40937990
    }, {
      "filename": "/data/mapres/desert_mountains_new_foreground.png",
      "start": 40937990,
      "end": 40971622
    }, {
      "filename": "/data/mapres/desert_sun.png",
      "start": 40971622,
      "end": 41153130
    }, {
      "filename": "/data/mapres/easter_0.7.png",
      "start": 41153130,
      "end": 41321378
    }, {
      "filename": "/data/mapres/entities.png",
      "start": 41321378,
      "end": 41578002
    }, {
      "filename": "/data/mapres/fadeout.png",
      "start": 41578002,
      "end": 41584485
    }, {
      "filename": "/data/mapres/font_teeworlds.png",
      "start": 41584485,
      "end": 41660265
    }, {
      "filename": "/data/mapres/font_teeworlds_alt.png",
      "start": 41660265,
      "end": 41688514
    }, {
      "filename": "/data/mapres/generic_clear.png",
      "start": 41688514,
      "end": 41711259
    }, {
      "filename": "/data/mapres/generic_deathtiles.png",
      "start": 41711259,
      "end": 41791803
    }, {
      "filename": "/data/mapres/generic_lamps.png",
      "start": 41791803,
      "end": 41808927
    }, {
      "filename": "/data/mapres/generic_shadows_0.7.png",
      "start": 41808927,
      "end": 41821113
    }, {
      "filename": "/data/mapres/generic_unhookable.png",
      "start": 41821113,
      "end": 41939995
    }, {
      "filename": "/data/mapres/generic_unhookable_0.7.png",
      "start": 41939995,
      "end": 42098185
    }, {
      "filename": "/data/mapres/grass_doodads.png",
      "start": 42098185,
      "end": 42212965
    }, {
      "filename": "/data/mapres/grass_doodads_0.7.png",
      "start": 42212965,
      "end": 42384988
    }, {
      "filename": "/data/mapres/grass_main.png",
      "start": 42384988,
      "end": 42479885
    }, {
      "filename": "/data/mapres/grass_main_0.7.png",
      "start": 42479885,
      "end": 42679030
    }, {
      "filename": "/data/mapres/jungle_background.png",
      "start": 42679030,
      "end": 42705706
    }, {
      "filename": "/data/mapres/jungle_deathtiles.png",
      "start": 42705706,
      "end": 42959938
    }, {
      "filename": "/data/mapres/jungle_doodads.png",
      "start": 42959938,
      "end": 43190676
    }, {
      "filename": "/data/mapres/jungle_main.png",
      "start": 43190676,
      "end": 43354017
    }, {
      "filename": "/data/mapres/jungle_midground.png",
      "start": 43354017,
      "end": 43410418
    }, {
      "filename": "/data/mapres/jungle_unhookables.png",
      "start": 43410418,
      "end": 43676253
    }, {
      "filename": "/data/mapres/light.png",
      "start": 43676253,
      "end": 43690269
    }, {
      "filename": "/data/mapres/mixed_tiles.png",
      "start": 43690269,
      "end": 43701095
    }, {
      "filename": "/data/mapres/moon.png",
      "start": 43701095,
      "end": 43817786
    }, {
      "filename": "/data/mapres/mountains.png",
      "start": 43817786,
      "end": 43876313
    }, {
      "filename": "/data/mapres/round_tiles.png",
      "start": 43876313,
      "end": 43887036
    }, {
      "filename": "/data/mapres/snow.png",
      "start": 43887036,
      "end": 43887412
    }, {
      "filename": "/data/mapres/snow_mountain.png",
      "start": 43887412,
      "end": 43939019
    }, {
      "filename": "/data/mapres/stars.png",
      "start": 43939019,
      "end": 43945783
    }, {
      "filename": "/data/mapres/sun.png",
      "start": 43945783,
      "end": 43960731
    }, {
      "filename": "/data/mapres/water.png",
      "start": 43960731,
      "end": 43995723
    }, {
      "filename": "/data/mapres/winter_doodads.png",
      "start": 43995723,
      "end": 44186584
    }, {
      "filename": "/data/mapres/winter_main.png",
      "start": 44186584,
      "end": 44375528
    }, {
      "filename": "/data/mapres/winter_main_0.7.png",
      "start": 44375528,
      "end": 44667650
    }, {
      "filename": "/data/mapres/winter_mountains.png",
      "start": 44667650,
      "end": 44717830
    }, {
      "filename": "/data/mapres/winter_mountains2.png",
      "start": 44717830,
      "end": 44759408
    }, {
      "filename": "/data/mapres/winter_mountains3.png",
      "start": 44759408,
      "end": 44766354
    }, {
      "filename": "/data/maps/Gold Mine.map",
      "start": 44766354,
      "end": 44995134
    }, {
      "filename": "/data/maps/LearnToPlay.map",
      "start": 44995134,
      "end": 45507622
    }, {
      "filename": "/data/maps/Sunny Side Up.map",
      "start": 45507622,
      "end": 46526491
    }, {
      "filename": "/data/maps/Tsunami.map",
      "start": 46526491,
      "end": 46938208
    }, {
      "filename": "/data/maps/Tutorial.map",
      "start": 46938208,
      "end": 47998691
    }, {
      "filename": "/data/maps/coverage.map",
      "start": 47998691,
      "end": 48002496
    }, {
      "filename": "/data/maps/ctf1.map",
      "start": 48002496,
      "end": 48007160
    }, {
      "filename": "/data/maps/ctf2.map",
      "start": 48007160,
      "end": 48032786
    }, {
      "filename": "/data/maps/ctf3.map",
      "start": 48032786,
      "end": 48038689
    }, {
      "filename": "/data/maps/ctf4.map",
      "start": 48038689,
      "end": 48050719
    }, {
      "filename": "/data/maps/ctf5.map",
      "start": 48050719,
      "end": 48062827
    }, {
      "filename": "/data/maps/ctf6.map",
      "start": 48062827,
      "end": 48089754
    }, {
      "filename": "/data/maps/ctf7.map",
      "start": 48089754,
      "end": 48095265
    }, {
      "filename": "/data/maps/dm1.map",
      "start": 48095265,
      "end": 48101070
    }, {
      "filename": "/data/maps/dm2.map",
      "start": 48101070,
      "end": 48109741
    }, {
      "filename": "/data/maps/dm6.map",
      "start": 48109741,
      "end": 48117570
    }, {
      "filename": "/data/maps/dm7.map",
      "start": 48117570,
      "end": 48127596
    }, {
      "filename": "/data/maps/dm8.map",
      "start": 48127596,
      "end": 48168233
    }, {
      "filename": "/data/maps/dm9.map",
      "start": 48168233,
      "end": 48176442
    }, {
      "filename": "/data/maps/license.txt",
      "start": 48176442,
      "end": 48176777
    }, {
      "filename": "/data/maps7/Gold Mine.map",
      "start": 48176777,
      "end": 48775472
    }, {
      "filename": "/data/maps7/LearnToPlay.map",
      "start": 48775472,
      "end": 49288285
    }, {
      "filename": "/data/maps7/Sunny Side Up.map",
      "start": 49288285,
      "end": 50656288
    }, {
      "filename": "/data/maps7/Tsunami.map",
      "start": 50656288,
      "end": 51124330
    }, {
      "filename": "/data/maps7/Tutorial.map",
      "start": 51124330,
      "end": 52589221
    }, {
      "filename": "/data/maps7/readme.txt",
      "start": 52589221,
      "end": 52589338
    }, {
      "filename": "/data/menuimages/demos.png",
      "start": 52589338,
      "end": 52614012
    }, {
      "filename": "/data/menuimages/editor.png",
      "start": 52614012,
      "end": 52646761
    }, {
      "filename": "/data/menuimages/local_server.png",
      "start": 52646761,
      "end": 52678739
    }, {
      "filename": "/data/menuimages/play_game.png",
      "start": 52678739,
      "end": 52713894
    }, {
      "filename": "/data/menuimages/settings.png",
      "start": 52713894,
      "end": 52750267
    }, {
      "filename": "/data/particles.png",
      "start": 52750267,
      "end": 52794096
    }, {
      "filename": "/data/race_flag.png",
      "start": 52794096,
      "end": 52796095
    }, {
      "filename": "/data/shader/pipeline.frag",
      "start": 52796095,
      "end": 52796766
    }, {
      "filename": "/data/shader/pipeline.vert",
      "start": 52796766,
      "end": 52797465
    }, {
      "filename": "/data/shader/prim.frag",
      "start": 52797465,
      "end": 52797731
    }, {
      "filename": "/data/shader/prim.vert",
      "start": 52797731,
      "end": 52798093
    }, {
      "filename": "/data/shader/primex.frag",
      "start": 52798093,
      "end": 52798449
    }, {
      "filename": "/data/shader/primex.vert",
      "start": 52798449,
      "end": 52799164
    }, {
      "filename": "/data/shader/quad.frag",
      "start": 52799164,
      "end": 52799744
    }, {
      "filename": "/data/shader/quad.vert",
      "start": 52799744,
      "end": 52800975
    }, {
      "filename": "/data/shader/spritemulti.frag",
      "start": 52800975,
      "end": 52801234
    }, {
      "filename": "/data/shader/spritemulti.vert",
      "start": 52801234,
      "end": 52802136
    }, {
      "filename": "/data/shader/text.frag",
      "start": 52802136,
      "end": 52803445
    }, {
      "filename": "/data/shader/text.vert",
      "start": 52803445,
      "end": 52803900
    }, {
      "filename": "/data/shader/tile.frag",
      "start": 52803900,
      "end": 52804322
    }, {
      "filename": "/data/shader/tile.vert",
      "start": 52804322,
      "end": 52804682
    }, {
      "filename": "/data/shader/tile_border.frag",
      "start": 52804682,
      "end": 52805237
    }, {
      "filename": "/data/shader/tile_border.vert",
      "start": 52805237,
      "end": 52805890
    }, {
      "filename": "/data/shader/vulkan/prim.frag",
      "start": 52805890,
      "end": 52806330
    }, {
      "filename": "/data/shader/vulkan/prim.vert",
      "start": 52806330,
      "end": 52806875
    }, {
      "filename": "/data/shader/vulkan/prim3d.frag",
      "start": 52806875,
      "end": 52807391
    }, {
      "filename": "/data/shader/vulkan/prim3d.vert",
      "start": 52807391,
      "end": 52807986
    }, {
      "filename": "/data/shader/vulkan/primex.frag",
      "start": 52807986,
      "end": 52808583
    }, {
      "filename": "/data/shader/vulkan/primex.vert",
      "start": 52808583,
      "end": 52809556
    }, {
      "filename": "/data/shader/vulkan/quad.frag",
      "start": 52809556,
      "end": 52810927
    }, {
      "filename": "/data/shader/vulkan/quad.vert",
      "start": 52810927,
      "end": 52812897
    }, {
      "filename": "/data/shader/vulkan/spritemulti.frag",
      "start": 52812897,
      "end": 52813475
    }, {
      "filename": "/data/shader/vulkan/spritemulti.vert",
      "start": 52813475,
      "end": 52814866
    }, {
      "filename": "/data/shader/vulkan/text.frag",
      "start": 52814866,
      "end": 52816468
    }, {
      "filename": "/data/shader/vulkan/text.vert",
      "start": 52816468,
      "end": 52817127
    }, {
      "filename": "/data/shader/vulkan/tile.frag",
      "start": 52817127,
      "end": 52817701
    }, {
      "filename": "/data/shader/vulkan/tile.vert",
      "start": 52817701,
      "end": 52818224
    }, {
      "filename": "/data/shader/vulkan/tile_border.frag",
      "start": 52818224,
      "end": 52818930
    }, {
      "filename": "/data/shader/vulkan/tile_border.vert",
      "start": 52818930,
      "end": 52819807
    }, {
      "filename": "/data/skins/PaladiN.png",
      "start": 52819807,
      "end": 52824690
    }, {
      "filename": "/data/skins/antiantey.png",
      "start": 52824690,
      "end": 52831574
    }, {
      "filename": "/data/skins/beast.png",
      "start": 52831574,
      "end": 52837985
    }, {
      "filename": "/data/skins/blacktee.png",
      "start": 52837985,
      "end": 52839952
    }, {
      "filename": "/data/skins/bluekitty.png",
      "start": 52839952,
      "end": 52844666
    }, {
      "filename": "/data/skins/bluestripe.png",
      "start": 52844666,
      "end": 52849025
    }, {
      "filename": "/data/skins/bomb.png",
      "start": 52849025,
      "end": 52855009
    }, {
      "filename": "/data/skins/brownbear.png",
      "start": 52855009,
      "end": 52859529
    }, {
      "filename": "/data/skins/cammo.png",
      "start": 52859529,
      "end": 52864284
    }, {
      "filename": "/data/skins/cammostripes.png",
      "start": 52864284,
      "end": 52868503
    }, {
      "filename": "/data/skins/chinese_by_whis.png",
      "start": 52868503,
      "end": 52880388
    }, {
      "filename": "/data/skins/coala.png",
      "start": 52880388,
      "end": 52884919
    }, {
      "filename": "/data/skins/coala_bluekitty.png",
      "start": 52884919,
      "end": 52890502
    }, {
      "filename": "/data/skins/coala_bluestripe.png",
      "start": 52890502,
      "end": 52898259
    }, {
      "filename": "/data/skins/coala_cammo.png",
      "start": 52898259,
      "end": 52905016
    }, {
      "filename": "/data/skins/coala_cammostripes.png",
      "start": 52905016,
      "end": 52912119
    }, {
      "filename": "/data/skins/coala_default.png",
      "start": 52912119,
      "end": 52918839
    }, {
      "filename": "/data/skins/coala_limekitty.png",
      "start": 52918839,
      "end": 52924777
    }, {
      "filename": "/data/skins/coala_pinky.png",
      "start": 52924777,
      "end": 52931832
    }, {
      "filename": "/data/skins/coala_redbopp.png",
      "start": 52931832,
      "end": 52938684
    }, {
      "filename": "/data/skins/coala_redstripe.png",
      "start": 52938684,
      "end": 52944958
    }, {
      "filename": "/data/skins/coala_saddo.png",
      "start": 52944958,
      "end": 52951766
    }, {
      "filename": "/data/skins/coala_toptri.png",
      "start": 52951766,
      "end": 52957874
    }, {
      "filename": "/data/skins/coala_twinbop.png",
      "start": 52957874,
      "end": 52965042
    }, {
      "filename": "/data/skins/coala_twintri.png",
      "start": 52965042,
      "end": 52971243
    }, {
      "filename": "/data/skins/coala_warpaint.png",
      "start": 52971243,
      "end": 52978563
    }, {
      "filename": "/data/skins/coala_x_ninja.png",
      "start": 52978563,
      "end": 52983896
    }, {
      "filename": "/data/skins/default.png",
      "start": 52983896,
      "end": 52988399
    }, {
      "filename": "/data/skins/demonlimekitty.png",
      "start": 52988399,
      "end": 53002745
    }, {
      "filename": "/data/skins/dino.png",
      "start": 53002745,
      "end": 53011480
    }, {
      "filename": "/data/skins/dragon.png",
      "start": 53011480,
      "end": 53016341
    }, {
      "filename": "/data/skins/evil.png",
      "start": 53016341,
      "end": 53023105
    }, {
      "filename": "/data/skins/evilwolfe.png",
      "start": 53023105,
      "end": 53031558
    }, {
      "filename": "/data/skins/ghost.png",
      "start": 53031558,
      "end": 53038415
    }, {
      "filename": "/data/skins/ghostjtj.png",
      "start": 53038415,
      "end": 53047933
    }, {
      "filename": "/data/skins/giraffe.png",
      "start": 53047933,
      "end": 53056366
    }, {
      "filename": "/data/skins/greensward.png",
      "start": 53056366,
      "end": 53063828
    }, {
      "filename": "/data/skins/greyfox.png",
      "start": 53063828,
      "end": 53071845
    }, {
      "filename": "/data/skins/greyfox_2.png",
      "start": 53071845,
      "end": 53077775
    }, {
      "filename": "/data/skins/hammie-chew.png",
      "start": 53077775,
      "end": 53086294
    }, {
      "filename": "/data/skins/hammie-whis.png",
      "start": 53086294,
      "end": 53095604
    }, {
      "filename": "/data/skins/jeet.png",
      "start": 53095604,
      "end": 53104962
    }, {
      "filename": "/data/skins/kintaro_2.png",
      "start": 53104962,
      "end": 53113208
    }, {
      "filename": "/data/skins/kitty_bluestripe.png",
      "start": 53113208,
      "end": 53121001
    }, {
      "filename": "/data/skins/kitty_brownbear.png",
      "start": 53121001,
      "end": 53132177
    }, {
      "filename": "/data/skins/kitty_cammo.png",
      "start": 53132177,
      "end": 53139926
    }, {
      "filename": "/data/skins/kitty_cammostripes.png",
      "start": 53139926,
      "end": 53147217
    }, {
      "filename": "/data/skins/kitty_coala.png",
      "start": 53147217,
      "end": 53154319
    }, {
      "filename": "/data/skins/kitty_default.png",
      "start": 53154319,
      "end": 53161156
    }, {
      "filename": "/data/skins/kitty_pinky.png",
      "start": 53161156,
      "end": 53168271
    }, {
      "filename": "/data/skins/kitty_redbopp.png",
      "start": 53168271,
      "end": 53175363
    }, {
      "filename": "/data/skins/kitty_redstripe.png",
      "start": 53175363,
      "end": 53182713
    }, {
      "filename": "/data/skins/kitty_saddo.png",
      "start": 53182713,
      "end": 53190479
    }, {
      "filename": "/data/skins/kitty_toptri.png",
      "start": 53190479,
      "end": 53197625
    }, {
      "filename": "/data/skins/kitty_twinbop.png",
      "start": 53197625,
      "end": 53205025
    }, {
      "filename": "/data/skins/kitty_twintri.png",
      "start": 53205025,
      "end": 53212423
    }, {
      "filename": "/data/skins/kitty_warpaint.png",
      "start": 53212423,
      "end": 53219858
    }, {
      "filename": "/data/skins/kitty_x_ninja.png",
      "start": 53219858,
      "end": 53225889
    }, {
      "filename": "/data/skins/license.txt",
      "start": 53225889,
      "end": 53227438
    }, {
      "filename": "/data/skins/limekitty.png",
      "start": 53227438,
      "end": 53232150
    }, {
      "filename": "/data/skins/mermydon-coala.png",
      "start": 53232150,
      "end": 53239959
    }, {
      "filename": "/data/skins/mermydon.png",
      "start": 53239959,
      "end": 53247900
    }, {
      "filename": "/data/skins/mouse.png",
      "start": 53247900,
      "end": 53257700
    }, {
      "filename": "/data/skins/musmann.png",
      "start": 53257700,
      "end": 53266773
    }, {
      "filename": "/data/skins/nanami.png",
      "start": 53266773,
      "end": 53276120
    }, {
      "filename": "/data/skins/nanas.png",
      "start": 53276120,
      "end": 53289029
    }, {
      "filename": "/data/skins/nersif.png",
      "start": 53289029,
      "end": 53302496
    }, {
      "filename": "/data/skins/oldman.png",
      "start": 53302496,
      "end": 53312580
    }, {
      "filename": "/data/skins/oldschool.png",
      "start": 53312580,
      "end": 53318854
    }, {
      "filename": "/data/skins/penguin.png",
      "start": 53318854,
      "end": 53327880
    }, {
      "filename": "/data/skins/pinky.png",
      "start": 53327880,
      "end": 53331988
    }, {
      "filename": "/data/skins/random.png",
      "start": 53331988,
      "end": 53339946
    }, {
      "filename": "/data/skins/redbopp.png",
      "start": 53339946,
      "end": 53344254
    }, {
      "filename": "/data/skins/redstripe.png",
      "start": 53344254,
      "end": 53348466
    }, {
      "filename": "/data/skins/saddo.png",
      "start": 53348466,
      "end": 53352905
    }, {
      "filename": "/data/skins/santa_bluekitty.png",
      "start": 53352905,
      "end": 53362624
    }, {
      "filename": "/data/skins/santa_bluestripe.png",
      "start": 53362624,
      "end": 53370456
    }, {
      "filename": "/data/skins/santa_brownbear.png",
      "start": 53370456,
      "end": 53382951
    }, {
      "filename": "/data/skins/santa_cammo.png",
      "start": 53382951,
      "end": 53390878
    }, {
      "filename": "/data/skins/santa_cammostripes.png",
      "start": 53390878,
      "end": 53398402
    }, {
      "filename": "/data/skins/santa_coala.png",
      "start": 53398402,
      "end": 53406099
    }, {
      "filename": "/data/skins/santa_default.png",
      "start": 53406099,
      "end": 53413280
    }, {
      "filename": "/data/skins/santa_limekitty.png",
      "start": 53413280,
      "end": 53423015
    }, {
      "filename": "/data/skins/santa_pinky.png",
      "start": 53423015,
      "end": 53430736
    }, {
      "filename": "/data/skins/santa_redbopp.png",
      "start": 53430736,
      "end": 53438227
    }, {
      "filename": "/data/skins/santa_redstripe.png",
      "start": 53438227,
      "end": 53445617
    }, {
      "filename": "/data/skins/santa_saddo.png",
      "start": 53445617,
      "end": 53453563
    }, {
      "filename": "/data/skins/santa_toptri.png",
      "start": 53453563,
      "end": 53460830
    }, {
      "filename": "/data/skins/santa_twinbop.png",
      "start": 53460830,
      "end": 53469191
    }, {
      "filename": "/data/skins/santa_twintri.png",
      "start": 53469191,
      "end": 53476809
    }, {
      "filename": "/data/skins/santa_warpaint.png",
      "start": 53476809,
      "end": 53484392
    }, {
      "filename": "/data/skins/teerasta.png",
      "start": 53484392,
      "end": 53493398
    }, {
      "filename": "/data/skins/toptri.png",
      "start": 53493398,
      "end": 53497434
    }, {
      "filename": "/data/skins/twinbop.png",
      "start": 53497434,
      "end": 53501904
    }, {
      "filename": "/data/skins/twintri.png",
      "start": 53501904,
      "end": 53506075
    }, {
      "filename": "/data/skins/veteran.png",
      "start": 53506075,
      "end": 53520625
    }, {
      "filename": "/data/skins/voodoo_tee.png",
      "start": 53520625,
      "end": 53528830
    }, {
      "filename": "/data/skins/warpaint.png",
      "start": 53528830,
      "end": 53532935
    }, {
      "filename": "/data/skins/wartee.png",
      "start": 53532935,
      "end": 53542359
    }, {
      "filename": "/data/skins/whis.png",
      "start": 53542359,
      "end": 53550820
    }, {
      "filename": "/data/skins/x_ninja.png",
      "start": 53550820,
      "end": 53554506
    }, {
      "filename": "/data/skins/x_spec.png",
      "start": 53554506,
      "end": 53555387
    }, {
      "filename": "/data/skins7/beaver.json",
      "start": 53555387,
      "end": 53555954
    }, {
      "filename": "/data/skins7/bluekitty.json",
      "start": 53555954,
      "end": 53556552
    }, {
      "filename": "/data/skins7/bluestripe.json",
      "start": 53556552,
      "end": 53557026
    }, {
      "filename": "/data/skins7/body/bat.png",
      "start": 53557026,
      "end": 53567438
    }, {
      "filename": "/data/skins7/body/bear.png",
      "start": 53567438,
      "end": 53575890
    }, {
      "filename": "/data/skins7/body/beaver.png",
      "start": 53575890,
      "end": 53584291
    }, {
      "filename": "/data/skins7/body/dog.png",
      "start": 53584291,
      "end": 53593210
    }, {
      "filename": "/data/skins7/body/force.png",
      "start": 53593210,
      "end": 53601132
    }, {
      "filename": "/data/skins7/body/fox.png",
      "start": 53601132,
      "end": 53611645
    }, {
      "filename": "/data/skins7/body/greensward.png",
      "start": 53611645,
      "end": 53621533
    }, {
      "filename": "/data/skins7/body/hippo.png",
      "start": 53621533,
      "end": 53631535
    }, {
      "filename": "/data/skins7/body/kitty.png",
      "start": 53631535,
      "end": 53639819
    }, {
      "filename": "/data/skins7/body/koala.png",
      "start": 53639819,
      "end": 53649467
    }, {
      "filename": "/data/skins7/body/monkey.png",
      "start": 53649467,
      "end": 53658262
    }, {
      "filename": "/data/skins7/body/mouse.png",
      "start": 53658262,
      "end": 53669991
    }, {
      "filename": "/data/skins7/body/piglet.png",
      "start": 53669991,
      "end": 53680061
    }, {
      "filename": "/data/skins7/body/raccoon.png",
      "start": 53680061,
      "end": 53691163
    }, {
      "filename": "/data/skins7/body/spiky.png",
      "start": 53691163,
      "end": 53699693
    }, {
      "filename": "/data/skins7/body/standard.png",
      "start": 53699693,
      "end": 53706800
    }, {
      "filename": "/data/skins7/body/x_ninja.png",
      "start": 53706800,
      "end": 53713648
    }, {
      "filename": "/data/skins7/bot.png",
      "start": 53713648,
      "end": 53718090
    }, {
      "filename": "/data/skins7/brownbear.json",
      "start": 53718090,
      "end": 53718682
    }, {
      "filename": "/data/skins7/bumbler.json",
      "start": 53718682,
      "end": 53719248
    }, {
      "filename": "/data/skins7/cammo.json",
      "start": 53719248,
      "end": 53719771
    }, {
      "filename": "/data/skins7/cammostripes.json",
      "start": 53719771,
      "end": 53720300
    }, {
      "filename": "/data/skins7/cavebat.json",
      "start": 53720300,
      "end": 53720859
    }, {
      "filename": "/data/skins7/decoration/hair.png",
      "start": 53720859,
      "end": 53722510
    }, {
      "filename": "/data/skins7/decoration/twinbopp.png",
      "start": 53722510,
      "end": 53726397
    }, {
      "filename": "/data/skins7/decoration/twinmello.png",
      "start": 53726397,
      "end": 53728270
    }, {
      "filename": "/data/skins7/decoration/twinpen.png",
      "start": 53728270,
      "end": 53732365
    }, {
      "filename": "/data/skins7/decoration/unibop.png",
      "start": 53732365,
      "end": 53734890
    }, {
      "filename": "/data/skins7/decoration/unimelo.png",
      "start": 53734890,
      "end": 53736725
    }, {
      "filename": "/data/skins7/decoration/unipento.png",
      "start": 53736725,
      "end": 53739392
    }, {
      "filename": "/data/skins7/default.json",
      "start": 53739392,
      "end": 53739797
    }, {
      "filename": "/data/skins7/eyes/colorable.png",
      "start": 53739797,
      "end": 53744486
    }, {
      "filename": "/data/skins7/eyes/negative.png",
      "start": 53744486,
      "end": 53748819
    }, {
      "filename": "/data/skins7/eyes/standard.png",
      "start": 53748819,
      "end": 53751555
    }, {
      "filename": "/data/skins7/eyes/standardreal.png",
      "start": 53751555,
      "end": 53754397
    }, {
      "filename": "/data/skins7/eyes/x_ninja.png",
      "start": 53754397,
      "end": 53756593
    }, {
      "filename": "/data/skins7/feet/standard.png",
      "start": 53756593,
      "end": 53758188
    }, {
      "filename": "/data/skins7/force.json",
      "start": 53758188,
      "end": 53758739
    }, {
      "filename": "/data/skins7/fox.json",
      "start": 53758739,
      "end": 53759299
    }, {
      "filename": "/data/skins7/greensward.json",
      "start": 53759299,
      "end": 53759749
    }, {
      "filename": "/data/skins7/greycoon.json",
      "start": 53759749,
      "end": 53760311
    }, {
      "filename": "/data/skins7/greyfox.json",
      "start": 53760311,
      "end": 53760873
    }, {
      "filename": "/data/skins7/hands/standard.png",
      "start": 53760873,
      "end": 53762667
    }, {
      "filename": "/data/skins7/hippo.json",
      "start": 53762667,
      "end": 53763302
    }, {
      "filename": "/data/skins7/koala.json",
      "start": 53763302,
      "end": 53763822
    }, {
      "filename": "/data/skins7/limedog.json",
      "start": 53763822,
      "end": 53764416
    }, {
      "filename": "/data/skins7/limekitty.json",
      "start": 53764416,
      "end": 53765010
    }, {
      "filename": "/data/skins7/marking/bear.png",
      "start": 53765010,
      "end": 53765930
    }, {
      "filename": "/data/skins7/marking/belly1.png",
      "start": 53765930,
      "end": 53766887
    }, {
      "filename": "/data/skins7/marking/belly2.png",
      "start": 53766887,
      "end": 53768518
    }, {
      "filename": "/data/skins7/marking/blush.png",
      "start": 53768518,
      "end": 53769169
    }, {
      "filename": "/data/skins7/marking/bug.png",
      "start": 53769169,
      "end": 53770959
    }, {
      "filename": "/data/skins7/marking/cammo1.png",
      "start": 53770959,
      "end": 53775154
    }, {
      "filename": "/data/skins7/marking/cammo2.png",
      "start": 53775154,
      "end": 53779924
    }, {
      "filename": "/data/skins7/marking/cammostripes.png",
      "start": 53779924,
      "end": 53781385
    }, {
      "filename": "/data/skins7/marking/coonfluff.png",
      "start": 53781385,
      "end": 53783399
    }, {
      "filename": "/data/skins7/marking/donny.png",
      "start": 53783399,
      "end": 53784233
    }, {
      "filename": "/data/skins7/marking/downdony.png",
      "start": 53784233,
      "end": 53785232
    }, {
      "filename": "/data/skins7/marking/duodonny.png",
      "start": 53785232,
      "end": 53786246
    }, {
      "filename": "/data/skins7/marking/fox.png",
      "start": 53786246,
      "end": 53787422
    }, {
      "filename": "/data/skins7/marking/hipbel.png",
      "start": 53787422,
      "end": 53788685
    }, {
      "filename": "/data/skins7/marking/lowcross.png",
      "start": 53788685,
      "end": 53790557
    }, {
      "filename": "/data/skins7/marking/lowpaint.png",
      "start": 53790557,
      "end": 53792491
    }, {
      "filename": "/data/skins7/marking/marksman.png",
      "start": 53792491,
      "end": 53794135
    }, {
      "filename": "/data/skins7/marking/mice.png",
      "start": 53794135,
      "end": 53795147
    }, {
      "filename": "/data/skins7/marking/mixture1.png",
      "start": 53795147,
      "end": 53798463
    }, {
      "filename": "/data/skins7/marking/mixture2.png",
      "start": 53798463,
      "end": 53801825
    }, {
      "filename": "/data/skins7/marking/monkey.png",
      "start": 53801825,
      "end": 53803744
    }, {
      "filename": "/data/skins7/marking/panda1.png",
      "start": 53803744,
      "end": 53805933
    }, {
      "filename": "/data/skins7/marking/panda2.png",
      "start": 53805933,
      "end": 53807702
    }, {
      "filename": "/data/skins7/marking/purelove.png",
      "start": 53807702,
      "end": 53810540
    }, {
      "filename": "/data/skins7/marking/saddo.png",
      "start": 53810540,
      "end": 53812523
    }, {
      "filename": "/data/skins7/marking/setisu.png",
      "start": 53812523,
      "end": 53814712
    }, {
      "filename": "/data/skins7/marking/sidemarks.png",
      "start": 53814712,
      "end": 53815880
    }, {
      "filename": "/data/skins7/marking/singu.png",
      "start": 53815880,
      "end": 53817717
    }, {
      "filename": "/data/skins7/marking/stripe.png",
      "start": 53817717,
      "end": 53818908
    }, {
      "filename": "/data/skins7/marking/striped.png",
      "start": 53818908,
      "end": 53822260
    }, {
      "filename": "/data/skins7/marking/stripes.png",
      "start": 53822260,
      "end": 53824319
    }, {
      "filename": "/data/skins7/marking/stripes2.png",
      "start": 53824319,
      "end": 53825654
    }, {
      "filename": "/data/skins7/marking/thunder.png",
      "start": 53825654,
      "end": 53828051
    }, {
      "filename": "/data/skins7/marking/tiger1.png",
      "start": 53828051,
      "end": 53831650
    }, {
      "filename": "/data/skins7/marking/tiger2.png",
      "start": 53831650,
      "end": 53835023
    }, {
      "filename": "/data/skins7/marking/toptri.png",
      "start": 53835023,
      "end": 53836092
    }, {
      "filename": "/data/skins7/marking/triangular.png",
      "start": 53836092,
      "end": 53837577
    }, {
      "filename": "/data/skins7/marking/tricircular.png",
      "start": 53837577,
      "end": 53839751
    }, {
      "filename": "/data/skins7/marking/tripledon.png",
      "start": 53839751,
      "end": 53840957
    }, {
      "filename": "/data/skins7/marking/tritri.png",
      "start": 53840957,
      "end": 53842889
    }, {
      "filename": "/data/skins7/marking/twinbelly.png",
      "start": 53842889,
      "end": 53844048
    }, {
      "filename": "/data/skins7/marking/twincross.png",
      "start": 53844048,
      "end": 53847026
    }, {
      "filename": "/data/skins7/marking/twintri.png",
      "start": 53847026,
      "end": 53848224
    }, {
      "filename": "/data/skins7/marking/uppy.png",
      "start": 53848224,
      "end": 53849003
    }, {
      "filename": "/data/skins7/marking/warpaint.png",
      "start": 53849003,
      "end": 53851080
    }, {
      "filename": "/data/skins7/marking/warstripes.png",
      "start": 53851080,
      "end": 53852178
    }, {
      "filename": "/data/skins7/marking/whisker.png",
      "start": 53852178,
      "end": 53853102
    }, {
      "filename": "/data/skins7/marking/wildpaint.png",
      "start": 53853102,
      "end": 53856239
    }, {
      "filename": "/data/skins7/marking/wildpatch.png",
      "start": 53856239,
      "end": 53858611
    }, {
      "filename": "/data/skins7/marking/yinyang.png",
      "start": 53858611,
      "end": 53860508
    }, {
      "filename": "/data/skins7/monkey.json",
      "start": 53860508,
      "end": 53861143
    }, {
      "filename": "/data/skins7/paintgre.json",
      "start": 53861143,
      "end": 53861673
    }, {
      "filename": "/data/skins7/pandabear.json",
      "start": 53861673,
      "end": 53862301
    }, {
      "filename": "/data/skins7/panther.json",
      "start": 53862301,
      "end": 53862858
    }, {
      "filename": "/data/skins7/pento.json",
      "start": 53862858,
      "end": 53863502
    }, {
      "filename": "/data/skins7/piggy.json",
      "start": 53863502,
      "end": 53864071
    }, {
      "filename": "/data/skins7/pinky.json",
      "start": 53864071,
      "end": 53864605
    }, {
      "filename": "/data/skins7/raccoon.json",
      "start": 53864605,
      "end": 53865173
    }, {
      "filename": "/data/skins7/redbopp.json",
      "start": 53865173,
      "end": 53865815
    }, {
      "filename": "/data/skins7/redstripe.json",
      "start": 53865815,
      "end": 53866286
    }, {
      "filename": "/data/skins7/saddo.json",
      "start": 53866286,
      "end": 53866813
    }, {
      "filename": "/data/skins7/setisu.json",
      "start": 53866813,
      "end": 53867447
    }, {
      "filename": "/data/skins7/snowti.json",
      "start": 53867447,
      "end": 53868005
    }, {
      "filename": "/data/skins7/spiky.json",
      "start": 53868005,
      "end": 53868563
    }, {
      "filename": "/data/skins7/swardy.json",
      "start": 53868563,
      "end": 53869124
    }, {
      "filename": "/data/skins7/tiger.json",
      "start": 53869124,
      "end": 53869688
    }, {
      "filename": "/data/skins7/tooxy.json",
      "start": 53869688,
      "end": 53870325
    }, {
      "filename": "/data/skins7/toptri.json",
      "start": 53870325,
      "end": 53870798
    }, {
      "filename": "/data/skins7/twinbop.json",
      "start": 53870798,
      "end": 53871446
    }, {
      "filename": "/data/skins7/twintri.json",
      "start": 53871446,
      "end": 53871971
    }, {
      "filename": "/data/skins7/warmouse.json",
      "start": 53871971,
      "end": 53872526
    }, {
      "filename": "/data/skins7/warpaint.json",
      "start": 53872526,
      "end": 53872999
    }, {
      "filename": "/data/skins7/x_ninja.json",
      "start": 53872999,
      "end": 53873435
    }, {
      "filename": "/data/skins7/xmas_hat.png",
      "start": 53873435,
      "end": 53891322
    }, {
      "filename": "/data/strong_weak.png",
      "start": 53891322,
      "end": 53894578
    }, {
      "filename": "/data/themes/auto.png",
      "start": 53894578,
      "end": 53898923
    }, {
      "filename": "/data/themes/autumn.png",
      "start": 53898923,
      "end": 53902372
    }, {
      "filename": "/data/themes/autumn_day.map",
      "start": 53902372,
      "end": 53907688
    }, {
      "filename": "/data/themes/autumn_night.map",
      "start": 53907688,
      "end": 53914384
    }, {
      "filename": "/data/themes/heavens.png",
      "start": 53914384,
      "end": 53917058
    }, {
      "filename": "/data/themes/heavens_day.map",
      "start": 53917058,
      "end": 53922245
    }, {
      "filename": "/data/themes/heavens_night.map",
      "start": 53922245,
      "end": 53926782
    }, {
      "filename": "/data/themes/jungle.png",
      "start": 53926782,
      "end": 53928903
    }, {
      "filename": "/data/themes/jungle_day.map",
      "start": 53928903,
      "end": 53932610
    }, {
      "filename": "/data/themes/jungle_night.map",
      "start": 53932610,
      "end": 53936313
    }, {
      "filename": "/data/themes/newyear.map",
      "start": 53936313,
      "end": 54157674
    }, {
      "filename": "/data/themes/newyear.png",
      "start": 54157674,
      "end": 54162419
    }, {
      "filename": "/data/themes/none.png",
      "start": 54162419,
      "end": 54163145
    }, {
      "filename": "/data/themes/rand.png",
      "start": 54163145,
      "end": 54166166
    }, {
      "filename": "/data/themes/winter.png",
      "start": 54166166,
      "end": 54171068
    }, {
      "filename": "/data/themes/winter_day.map",
      "start": 54171068,
      "end": 54178038
    }, {
      "filename": "/data/themes/winter_night.map",
      "start": 54178038,
      "end": 54184994
    }, {
      "filename": "/data/touch_controls.json",
      "start": 54184994,
      "end": 54190022
    }, {
      "filename": "/data/wordlist.txt",
      "start": 54190022,
      "end": 54203682
    } ],
    "remote_package_size": 54203682
  });
})();

// end include: /tmp/tmp3_ea7ryx.js
// include: /tmp/tmpsqfcb3mr.js
// All the pre-js content up to here must remain later on, we need to run
// it.
if ((typeof ENVIRONMENT_IS_WASM_WORKER != "undefined" && ENVIRONMENT_IS_WASM_WORKER) || (typeof ENVIRONMENT_IS_PTHREAD != "undefined" && ENVIRONMENT_IS_PTHREAD) || (typeof ENVIRONMENT_IS_AUDIO_WORKLET != "undefined" && ENVIRONMENT_IS_AUDIO_WORKLET)) Module["preRun"] = [];

var necessaryPreJSTasks = Module["preRun"].slice();

// end include: /tmp/tmpsqfcb3mr.js
// include: /home/teero/emsdk/upstream/emscripten/src/emrun_prejs.js
/**
 * @license
 * Copyright 2013 The Emscripten Authors
 * SPDX-License-Identifier: MIT
 *
 * This file gets implicatly injected as a `--pre-js` file when
 * emcc is run with `--emrun`
 */ // Route URL GET parameters to argc+argv
if (globalThis.window) {
  Module["arguments"] = window.location.search.slice(1).trim().split("&");
  for (let i = 0; i < Module["arguments"].length; ++i) {
    Module["arguments"][i] = decodeURI(Module["arguments"][i]);
  }
  // If no args were passed arguments = [''], in which case kill the single empty string.
  if (!Module["arguments"][0]) {
    Module["arguments"] = [];
  }
}

// end include: /home/teero/emsdk/upstream/emscripten/src/emrun_prejs.js
// include: /tmp/tmp266ohr_f.js
if (!Module["preRun"]) throw "Module.preRun should exist because file support used it; did a pre-js delete it?";

necessaryPreJSTasks.forEach(task => {
  if (Module["preRun"].indexOf(task) < 0) throw "All preRun tasks that exist before user pre-js code should remain after; did you replace Module or modify Module.preRun?";
});

// end include: /tmp/tmp266ohr_f.js
var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
  throw toThrow;
};

// In MODULARIZE mode _scriptName needs to be captured already at the very top of the page immediately when the page is parsed, so it is generated there
// before the page load. In non-MODULARIZE modes generate it here.
var _scriptName = globalThis.document?.currentScript?.src;

if (typeof __filename != "undefined") {
  // Node
  _scriptName = __filename;
} else if (ENVIRONMENT_IS_WORKER) {
  _scriptName = self.location.href;
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = "";

function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  const isNode = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
  if (!isNode) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require("fs");
  scriptDirectory = __dirname + "/";
  // include: node_shell_read.js
  readBinary = filename => {
    // We need to re-wrap `file://` strings to URLs.
    filename = isFileURI(filename) ? new URL(filename) : filename;
    var ret = fs.readFileSync(filename);
    assert(Buffer.isBuffer(ret));
    return ret;
  };
  readAsync = async (filename, binary = true) => {
    // See the comment in the `readBinary` function.
    filename = isFileURI(filename) ? new URL(filename) : filename;
    var ret = fs.readFileSync(filename, binary ? undefined : "utf8");
    assert(binary ? Buffer.isBuffer(ret) : typeof ret == "string");
    return ret;
  };
  // end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, "/");
  }
  arguments_ = process.argv.slice(2);
  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  if (typeof module != "undefined") {
    module["exports"] = Module;
  }
  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };
} else if (ENVIRONMENT_IS_SHELL) {} else // Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL(".", _scriptName).href;
  } catch {}
  if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  if (!ENVIRONMENT_IS_NODE) {
    // include: web_or_worker_shell_read.js
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = url => {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response));
      };
    }
    readAsync = async url => {
      // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
      // See https://github.com/github/fetch/pull/92#issuecomment-140665932
      // Cordova or Electron apps are typically loaded from a file:// url.
      // So use XHR on webview if URL is a file URL.
      if (isFileURI(url)) {
        return new Promise((resolve, reject) => {
          var xhr = new XMLHttpRequest;
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
              // file URLs can return 0
              resolve(xhr.response);
              return;
            }
            reject(xhr.status);
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      }
      var response = await fetch(url, {
        credentials: "same-origin"
      });
      if (response.ok) {
        return response.arrayBuffer();
      }
      throw new Error(response.status + " : " + response.url);
    };
  }
} else {
  throw new Error("environment detection error");
}

// Set up the out() and err() hooks, which are how we can print to stdout or
// stderr, respectively.
// Normally just binding console.log/console.error here works fine, but
// under node (with workers) we see missing/out-of-order messages so route
// directly to stdout and stderr.
// See https://github.com/emscripten-core/emscripten/issues/14804
var defaultPrint = console.log.bind(console);

var defaultPrintErr = console.error.bind(console);

if (ENVIRONMENT_IS_NODE) {
  var utils = require("util");
  var stringify = a => typeof a == "object" ? utils.inspect(a) : a;
  defaultPrint = (...args) => fs.writeSync(1, args.map(stringify).join(" ") + "\n");
  defaultPrintErr = (...args) => fs.writeSync(2, args.map(stringify).join(" ") + "\n");
}

var out = defaultPrint;

var err = defaultPrintErr;

var IDBFS = "IDBFS is no longer included by default; build with -lidbfs.js";

var PROXYFS = "PROXYFS is no longer included by default; build with -lproxyfs.js";

var WORKERFS = "WORKERFS is no longer included by default; build with -lworkerfs.js";

var FETCHFS = "FETCHFS is no longer included by default; build with -lfetchfs.js";

var ICASEFS = "ICASEFS is no longer included by default; build with -licasefs.js";

var JSFILEFS = "JSFILEFS is no longer included by default; build with -ljsfilefs.js";

var OPFS = "OPFS is no longer included by default; build with -lopfs.js";

var NODEFS = "NODEFS is no longer included by default; build with -lnodefs.js";

// perform assertions in shell.js after we set up out() and err(), as otherwise
// if an assertion fails it cannot print the message
assert(ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER || ENVIRONMENT_IS_NODE, "Pthreads do not work in this environment yet (need Web Workers, or an alternative to them)");

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.");

// end include: shell.js
// include: preamble.js
// === Preamble library stuff ===
// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
var wasmBinary;

if (!globalThis.WebAssembly) {
  err("no native wasm support detected");
}

// Wasm globals
// For sending to workers.
var wasmModule;

//========================================
// Runtime essentials
//========================================
// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */ function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed" + (text ? ": " + text : ""));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.
/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

// include: runtime_common.js
// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((max) >> 2), "storing")] = 34821223;
  checkInt32(34821223);
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((max) + (4)) >> 2), "storing")] = 2310721022;
  checkInt32(2310721022);
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((max) >> 2), "loading")];
  var cookie2 = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((max) + (4)) >> 2), "loading")];
  if (cookie1 != 34821223 || cookie2 != 2310721022) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
  }
}

// end include: runtime_stack_check.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
// include: runtime_debug.js
var runtimeDebug = true;

// Switch to false at runtime to disable logging at the right times
// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  if (!runtimeDebug && typeof runtimeDebug != "undefined") return;
  // Avoid using the console for debugging in multi-threaded node applications
  // See https://github.com/emscripten-core/emscripten/issues/14804
  if (ENVIRONMENT_IS_NODE) {
    // TODO(sbc): Unify with err/out implementation in shell.sh.
    var fs = require("fs");
    var utils = require("util");
    function stringify(a) {
      switch (typeof a) {
       case "object":
        return utils.inspect(a);

       case "undefined":
        return "undefined";
      }
      return a;
    }
    fs.writeSync(2, args.map(stringify).join(" ") + "\n");
  } else // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}

// Endianness check
(() => {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 25459;
  if (h8[0] !== 115 || h8[1] !== 99) abort("Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)");
})();

function consumedModuleProp(prop) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      set() {
        abort(`Attempt to set \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`);
      }
    });
  }
}

function makeInvalidEarlyAccess(name) {
  return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);
}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_preloadFile" || name === "FS_unlink" || name === "addRunDependency" || // The old FS has some functionality that WasmFS lacks.
  name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
}

/**
 * Intercept access to a symbols in the global symbol.  This enables us to give
 * informative warnings/errors when folks attempt to use symbols they did not
 * include in their build, or no symbols that no longer exist.
 *
 * We don't define this in MODULARIZE mode since in that mode emscripten symbols
 * are never placed in the global scope.
 */ function hookGlobalSymbolAccess(sym, func) {
  if (!Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        func();
        return undefined;
      }
    });
  }
}

function missingGlobal(sym, msg) {
  hookGlobalSymbolAccess(sym, () => {
    warnOnce(`\`${sym}\` is no longer defined by emscripten. ${msg}`);
  });
}

missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");

missingGlobal("asm", "Please use wasmExports instead");

function missingLibrarySymbol(sym) {
  hookGlobalSymbolAccess(sym, () => {
    // Can't `abort()` here because it would break code that does runtime
    // checks.  e.g. `if (typeof SDL === 'undefined')`.
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
    // library.js, which means $name for a JS name with no prefix, or name
    // for a JS name like _name.
    var librarySymbol = sym;
    if (!librarySymbol.startsWith("_")) {
      librarySymbol = "$" + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
      msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    warnOnce(msg);
  });
  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (ENVIRONMENT_IS_PTHREAD) {
    return;
  }
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
        }
        abort(msg);
      }
    });
  }
}

/**
 * Override `err`/`out`/`dbg` to report thread / worker information
 */ function initWorkerLogging() {
  function getLogPrefix() {
    var t = 0;
    if (runtimeInitialized && typeof _pthread_self != "undefined" && !runtimeExited) {
      t = _pthread_self();
    }
    return `w:${workerID},t:${ptrToString(t)}:`;
  }
  // Prefix all dbg() messages with the calling thread info.
  var origDbg = dbg;
  dbg = (...args) => origDbg(getLogPrefix(), ...args);
}

initWorkerLogging();

var MAX_UINT8 = (2 ** 8) - 1;

var MAX_UINT16 = (2 ** 16) - 1;

var MAX_UINT32 = (2 ** 32) - 1;

var MAX_UINT53 = (2 ** 53) - 1;

var MAX_UINT64 = (2 ** 64) - 1;

var MIN_INT8 = -(2 ** (8 - 1));

var MIN_INT16 = -(2 ** (16 - 1));

var MIN_INT32 = -(2 ** (32 - 1));

var MIN_INT53 = -(2 ** (53 - 1));

var MIN_INT64 = -(2 ** (64 - 1));

function checkInt(value, bits, min, max) {
  assert(Number.isInteger(Number(value)), `attempt to write non-integer (${value}) into integer heap`);
  assert(value <= max, `value (${value}) too large to write as ${bits}-bit value`);
  assert(value >= min, `value (${value}) too small to write as ${bits}-bit value`);
}

var checkInt1 = value => checkInt(value, 1, 1);

var checkInt8 = value => checkInt(value, 8, MIN_INT8, MAX_UINT8);

var checkInt16 = value => checkInt(value, 16, MIN_INT16, MAX_UINT16);

var checkInt32 = value => checkInt(value, 32, MIN_INT32, MAX_UINT32);

var checkInt53 = value => checkInt(value, 53, MIN_INT53, MAX_UINT53);

var checkInt64 = value => checkInt(value, 64, MIN_INT64, MAX_UINT64);

// end include: runtime_debug.js
// include: runtime_safe_heap.js
function SAFE_HEAP_INDEX(arr, idx, action) {
  const bytes = arr.BYTES_PER_ELEMENT;
  const dest = idx * bytes;
  if (idx <= 0) abort(`segmentation fault ${action} ${bytes} bytes at address ${dest}`);
  if (runtimeInitialized && !runtimeExited) {
    var brk = _sbrk(0);
    if (dest + bytes > brk) abort(`segmentation fault, exceeded the top of the available dynamic heap when ${action} ${bytes} bytes at address ${dest}. DYNAMICTOP=${brk}`);
    if (brk < _emscripten_stack_get_base()) abort(`brk >= _emscripten_stack_get_base() (brk=${brk}, _emscripten_stack_get_base()=${_emscripten_stack_get_base()})`);
    // sbrk-managed memory must be above the stack
    if (brk > wasmMemory.buffer.byteLength) abort(`brk <= wasmMemory.buffer.byteLength (brk=${brk}, wasmMemory.buffer.byteLength=${wasmMemory.buffer.byteLength})`);
  }
  return idx;
}

function segfault() {
  abort("segmentation fault");
}

function alignfault() {
  abort("alignment fault");
}

// end include: runtime_safe_heap.js
// Support for growable heap + pthreads, where the buffer may change, so JS views
// must be updated.
function growMemViews() {
  // `updateMemoryViews` updates all the views simultaneously, so it's enough to check any of them.
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
}

if (ENVIRONMENT_IS_NODE && (ENVIRONMENT_IS_PTHREAD)) {
  // Create as web-worker-like an environment as we can.
  var parentPort = worker_threads["parentPort"];
  parentPort.on("message", msg => global.onmessage?.({
    data: msg
  }));
  Object.assign(globalThis, {
    self: global,
    postMessage: msg => parentPort["postMessage"](msg)
  });
  // Node.js Workers do not pass postMessage()s and uncaught exception events to the parent
  // thread necessarily in the same order where they were generated in sequential program order.
  // See https://github.com/nodejs/node/issues/59617
  // To remedy this, capture all uncaughtExceptions in the Worker, and sequentialize those over
  // to the same postMessage pipe that other messages use.
  process.on("uncaughtException", err => {
    postMessage({
      cmd: "uncaughtException",
      error: err
    });
    // Also shut down the Worker to match the same semantics as if this uncaughtException
    // handler was not registered.
    // (n.b. this will not shut down the whole Node.js app process, but just the Worker)
    process.exit(1);
  });
}

// include: runtime_pthread.js
// Pthread Web Worker handling code.
// This code runs only on pthread web workers and handles pthread setup
// and communication with the main thread via postMessage.
// Unique ID of the current pthread worker (zero on non-pthread-workers
// including the main thread).
var workerID = 0;

var startWorker;

if (ENVIRONMENT_IS_PTHREAD) {
  // Thread-local guard variable for one-time init of the JS state
  var initializedJS = false;
  // Turn unhandled rejected promises into errors so that the main thread will be
  // notified about them.
  self.onunhandledrejection = e => {
    throw e.reason || e;
  };
  function handleMessage(e) {
    try {
      var msgData = e["data"];
      //dbg('msgData: ' + Object.keys(msgData));
      var cmd = msgData.cmd;
      if (cmd === "load") {
        // Preload command that is called once per worker to parse and load the Emscripten code.
        workerID = msgData.workerID;
        // Until we initialize the runtime, queue up any further incoming messages.
        let messageQueue = [];
        self.onmessage = e => messageQueue.push(e);
        // And add a callback for when the runtime is initialized.
        startWorker = () => {
          // Notify the main thread that this thread has loaded.
          postMessage({
            cmd: "loaded"
          });
          // Process any messages that were queued before the thread was ready.
          for (let msg of messageQueue) {
            handleMessage(msg);
          }
          // Restore the real message handler.
          self.onmessage = handleMessage;
        };
        // Use `const` here to ensure that the variable is scoped only to
        // that iteration, allowing safe reference from a closure.
        for (const handler of msgData.handlers) {
          // The the main module has a handler for a certain even, but no
          // handler exists on the pthread worker, then proxy that handler
          // back to the main thread.
          if (!Module[handler] || Module[handler].proxy) {
            Module[handler] = (...args) => {
              postMessage({
                cmd: "callHandler",
                handler,
                args
              });
            };
            // Rebind the out / err handlers if needed
            if (handler == "print") out = Module[handler];
            if (handler == "printErr") err = Module[handler];
          }
        }
        wasmMemory = msgData.wasmMemory;
        updateMemoryViews();
        wasmModule = msgData.wasmModule;
        createWasm();
        run();
      } else if (cmd === "run") {
        assert(msgData.pthread_ptr);
        // Call inside JS module to set up the stack frame for this pthread in JS module scope.
        // This needs to be the first thing that we do, as we cannot call to any C/C++ functions
        // until the thread stack is initialized.
        establishStackSpace(msgData.pthread_ptr);
        // Pass the thread address to wasm to store it for fast access.
        __emscripten_thread_init(msgData.pthread_ptr, /*is_main=*/ 0, /*is_runtime=*/ 0, /*can_block=*/ 1, 0, 0);
        PThread.threadInitTLS();
        // Await mailbox notifications with `Atomics.waitAsync` so we can start
        // using the fast `Atomics.notify` notification path.
        __emscripten_thread_mailbox_await(msgData.pthread_ptr);
        if (!initializedJS) {
          initializedJS = true;
        }
        try {
          invokeEntryPoint(msgData.start_routine, msgData.arg);
        } catch (ex) {
          if (ex != "unwind") {
            // The pthread "crashed".  Do not call `_emscripten_thread_exit` (which
            // would make this thread joinable).  Instead, re-throw the exception
            // and let the top level handler propagate it back to the main thread.
            throw ex;
          }
        }
      } else if (msgData.target === "setimmediate") {} else if (cmd === "checkMailbox") {
        if (initializedJS) {
          checkMailbox();
        }
      } else if (cmd) {
        // The received message looks like something that should be handled by this message
        // handler, (since there is a cmd field present), but is not one of the
        // recognized commands:
        err(`worker: received unknown command ${cmd}`);
        err(msgData);
      }
    } catch (ex) {
      err(`worker: onmessage() captured an uncaught exception: ${ex}`);
      if (ex?.stack) err(ex.stack);
      __emscripten_thread_crashed();
      throw ex;
    }
  }
  self.onmessage = handleMessage;
}

// ENVIRONMENT_IS_PTHREAD
// end include: runtime_pthread.js
// Memory management
var /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /** @type {!Float64Array} */ HEAPF64;

// BigInt64Array type is not correctly defined in closure
var /** not-@type {!BigInt64Array} */ HEAP64, /* BigUint64Array type is not correctly defined in closure
/** not-@type {!BigUint64Array} */ HEAPU64;

var runtimeInitialized = false;

var runtimeExited = false;

function updateMemoryViews() {
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  HEAPU64 = new BigUint64Array(b);
}

// In non-standalone/normal mode, we create the memory here.
// include: runtime_init_memory.js
// Create the wasm memory. (Note: this only applies if IMPORTED_MEMORY is defined)
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
function initMemory() {
  if ((ENVIRONMENT_IS_PTHREAD)) {
    return;
  }
  if (Module["wasmMemory"]) {
    wasmMemory = Module["wasmMemory"];
  } else {
    var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
    assert(INITIAL_MEMORY >= 1048576, "INITIAL_MEMORY should be larger than STACK_SIZE, was " + INITIAL_MEMORY + "! (STACK_SIZE=" + 1048576 + ")");
    /** @suppress {checkTypes} */ wasmMemory = new WebAssembly.Memory({
      "initial": INITIAL_MEMORY / 65536,
      // In theory we should not need to emit the maximum if we want "unlimited"
      // or 4GB of memory, but VMs error on that atm, see
      // https://github.com/emscripten-core/emscripten/issues/14130
      // And in the pthreads case we definitely need to emit a maximum. So
      // always emit one.
      "maximum": 32e3,
      "shared": true
    });
  }
  updateMemoryViews();
}

// end include: runtime_init_memory.js
// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set, "JS engine does not provide full typed array support");

function preRun() {
  assert(!ENVIRONMENT_IS_PTHREAD);
  // PThreads reuse the runtime from the main thread.
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  consumedModuleProp("preRun");
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;
  if (ENVIRONMENT_IS_PTHREAD) return startWorker();
  setStackLimits();
  checkStackCookie();
  // Begin ATINITS hooks
  if (!Module["noFSInit"] && !FS.initialized) FS.init();
  TTY.init();
  SOCKFS.root = FS.mount(SOCKFS, {}, null);
  PIPEFS.root = FS.mount(PIPEFS, {}, null);
  // End ATINITS hooks
  wasmExports["__wasm_call_ctors"]();
  // Begin ATPOSTCTORS hooks
  FS.ignorePermissions = false;
}

function preMain() {
  checkStackCookie();
}

function exitRuntime() {
  assert(!runtimeExited);
  // ASYNCIFY cannot be used once the runtime starts shutting down.
  Asyncify.state = Asyncify.State.Disabled;
  checkStackCookie();
  if ((ENVIRONMENT_IS_PTHREAD)) {
    return;
  }
  // PThreads reuse the runtime from the main thread.
  ___funcs_on_exit();
  // Native atexit() functions
  // Begin ATEXITS hooks
  callRuntimeCallbacks(onExits);
  FS.quit();
  TTY.shutdown();
  // End ATEXITS hooks
  PThread.terminateAllThreads();
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();
  if ((ENVIRONMENT_IS_PTHREAD)) {
    return;
  }
  // PThreads reuse the runtime from the main thread.
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  consumedModuleProp("postRun");
  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
}

/** @param {string|number=} what */ function abort(what) {
  Module["onAbort"]?.(what);
  what = "Aborted(" + what + ")";
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);
  ABORT = true;
  if (what.indexOf("RuntimeError: unreachable") >= 0) {
    what += '. "unreachable" may be due to ASYNCIFY_STACK_SIZE not being large enough (try increasing it)';
  }
  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.
  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

function createExportWrapper(name, nargs) {
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    assert(!runtimeExited, `native function \`${name}\` called after runtime exit (use NO_EXIT_RUNTIME to keep it alive after main() exits)`);
    var f = wasmExports[name];
    assert(f, `exported native function \`${name}\` not found`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return f(...args);
  };
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile("DDNet.wasm");
}

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally adviables since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw "both async and sync fetching of the wasm failed";
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {}
  }
  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);
    // Warn on some common problems.
    if (isFileURI(binaryFile)) {
      err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
    try {
      var response = fetch(binaryFile, {
        credentials: "same-origin"
      });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err("falling back to ArrayBuffer instantiation");
    }
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  assignWasmImports();
  // instrumenting imports is used in asyncify in two ways: to add assertions
  // that check for proper import use, and for ASYNCIFY=2 we use them to set up
  // the Promise API on the import side.
  // In pthreads builds getWasmImports is called more than once but we only
  // and the instrument the imports once.
  if (!wasmImports.__instrumented) {
    wasmImports.__instrumented = true;
    Asyncify.instrumentWasmImports(wasmImports);
  }
  // prepare imports
  var imports = {
    "env": wasmImports,
    "wasi_snapshot_preview1": wasmImports
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
    wasmExports = instance.exports;
    wasmExports = Asyncify.instrumentWasmExports(wasmExports);
    registerTLSInit(wasmExports["_emscripten_tls_init"]);
    assignWasmExports(wasmExports);
    // We now have the Wasm module loaded up, keep a reference to the compiled module so we can post it to the workers.
    wasmModule = module;
    removeRunDependency("wasm-instantiate");
    return wasmExports;
  }
  addRunDependency("wasm-instantiate");
  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
    trueModule = null;
    return receiveInstance(result["instance"], result["module"]);
  }
  var info = getWasmImports();
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module["instantiateWasm"]) {
    return new Promise((resolve, reject) => {
      try {
        Module["instantiateWasm"](info, (inst, mod) => {
          resolve(receiveInstance(inst, mod));
        });
      } catch (e) {
        err(`Module.instantiateWasm callback failed with error: ${e}`);
        reject(e);
      }
    });
  }
  if ((ENVIRONMENT_IS_PTHREAD)) {
    // Instantiate from the module that was recieved via postMessage from
    // the main thread. We can just use sync instantiation in the worker.
    assert(wasmModule, "wasmModule should have been received via postMessage");
    var instance = new WebAssembly.Instance(wasmModule, getWasmImports());
    return receiveInstance(instance, wasmModule);
  }
  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js
// Begin JS library code
class ExitStatus {
  name="ExitStatus";
  constructor(status) {
    this.message = `Program terminated with exit(${status})`;
    this.status = status;
  }
}

var terminateWorker = worker => {
  worker.terminate();
  // terminate() can be asynchronous, so in theory the worker can continue
  // to run for some amount of time after termination.  However from our POV
  // the worker now dead and we don't want to hear from it again, so we stub
  // out its message handler here.  This avoids having to check in each of
  // the onmessage handlers if the message was coming from valid worker.
  worker.onmessage = e => {
    var cmd = e["data"].cmd;
    err(`received "${cmd}" command from terminated worker: ${worker.workerID}`);
  };
};

var cleanupThread = pthread_ptr => {
  assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! cleanupThread() can only ever be called from main application thread!");
  assert(pthread_ptr, "Internal Error! Null pthread_ptr in cleanupThread!");
  var worker = PThread.pthreads[pthread_ptr];
  assert(worker);
  PThread.returnWorkerToPool(worker);
};

var callRuntimeCallbacks = callbacks => {
  while (callbacks.length > 0) {
    // Pass the module as the first argument.
    callbacks.shift()(Module);
  }
};

var onPreRuns = [];

var addOnPreRun = cb => onPreRuns.push(cb);

var runDependencies = 0;

var dependenciesFulfilled = null;

var runDependencyTracking = {};

var runDependencyWatcher = null;

var removeRunDependency = id => {
  runDependencies--;
  Module["monitorRunDependencies"]?.(runDependencies);
  assert(id, "removeRunDependency requires an ID");
  assert(runDependencyTracking[id]);
  delete runDependencyTracking[id];
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
};

var addRunDependency = id => {
  runDependencies++;
  Module["monitorRunDependencies"]?.(runDependencies);
  assert(id, "addRunDependency requires an ID");
  assert(!runDependencyTracking[id]);
  runDependencyTracking[id] = 1;
  if (runDependencyWatcher === null && globalThis.setInterval) {
    // Check for missing dependencies every few seconds
    runDependencyWatcher = setInterval(() => {
      if (ABORT) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null;
        return;
      }
      var shown = false;
      for (var dep in runDependencyTracking) {
        if (!shown) {
          shown = true;
          err("still waiting on run dependencies:");
        }
        err(`dependency: ${dep}`);
      }
      if (shown) {
        err("(end of list)");
      }
    }, 1e4);
    // Prevent this timer from keeping the runtime alive if nothing
    // else is.
    runDependencyWatcher.unref?.();
  }
};

var spawnThread = threadParams => {
  assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! spawnThread() can only ever be called from main application thread!");
  assert(threadParams.pthread_ptr, "Internal error, no pthread ptr!");
  var worker = PThread.getNewWorker();
  if (!worker) {
    // No available workers in the PThread pool.
    return 6;
  }
  assert(!worker.pthread_ptr, "Internal error!");
  PThread.runningWorkers.push(worker);
  // Add to pthreads map
  PThread.pthreads[threadParams.pthread_ptr] = worker;
  worker.pthread_ptr = threadParams.pthread_ptr;
  var msg = {
    cmd: "run",
    start_routine: threadParams.startRoutine,
    arg: threadParams.arg,
    pthread_ptr: threadParams.pthread_ptr
  };
  if (ENVIRONMENT_IS_NODE) {
    // Mark worker as weakly referenced once we start executing a pthread,
    // so that its existence does not prevent Node.js from exiting.  This
    // has no effect if the worker is already weakly referenced (e.g. if
    // this worker was previously idle/unused).
    worker.unref();
  }
  // Ask the worker to start executing its pthread entry point function.
  worker.postMessage(msg, threadParams.transferList);
  return 0;
};

var runtimeKeepaliveCounter = 0;

var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;

var stackSave = () => _emscripten_stack_get_current();

var stackRestore = val => __emscripten_stack_restore(val);

var stackAlloc = sz => __emscripten_stack_alloc(sz);

/** @type{function(number, (number|boolean), ...number)} */ var proxyToMainThread = (funcIndex, emAsmAddr, sync, ...callArgs) => {
  // EM_ASM proxying is done by passing a pointer to the address of the EM_ASM
  // content as `emAsmAddr`.  JS library proxying is done by passing an index
  // into `proxiedJSCallArgs` as `funcIndex`. If `emAsmAddr` is non-zero then
  // `funcIndex` will be ignored.
  // Additional arguments are passed after the first three are the actual
  // function arguments.
  // The serialization buffer contains the number of call params, and then
  // all the args here.
  // We also pass 'sync' to C separately, since C needs to look at it.
  // Allocate a buffer, which will be copied by the C code.
  // First passed parameter specifies the number of arguments to the function.
  // When BigInt support is enabled, we must handle types in a more complex
  // way, detecting at runtime if a value is a BigInt or not (as we have no
  // type info here). To do that, add a "prefix" before each value that
  // indicates if it is a BigInt, which effectively doubles the number of
  // values we serialize for proxying. TODO: pack this?
  var serializedNumCallArgs = callArgs.length * 2;
  var sp = stackSave();
  var args = stackAlloc(serializedNumCallArgs * 8);
  var b = ((args) >> 3);
  for (var i = 0; i < callArgs.length; i++) {
    var arg = callArgs[i];
    if (typeof arg == "bigint") {
      // The prefix is non-zero to indicate a bigint.
      (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), b + 2 * i, "storing")] = 1n;
      (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), b + 2 * i + 1, "storing")] = arg;
    } else {
      // The prefix is zero to indicate a JS Number.
      (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), b + 2 * i, "storing")] = 0n;
      (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), b + 2 * i + 1, "storing")] = arg;
    }
  }
  var rtn = __emscripten_run_js_on_main_thread(funcIndex, emAsmAddr, serializedNumCallArgs, args, sync);
  stackRestore(sp);
  return rtn;
};

function _proc_exit(code) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(0, 0, 1, code);
  EXITSTATUS = code;
  if (!keepRuntimeAlive()) {
    PThread.terminateAllThreads();
    Module["onExit"]?.(code);
    ABORT = true;
  }
  quit_(code, new ExitStatus(code));
}

function exitOnMainThread(returnCode) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(1, 0, 0, returnCode);
  _exit(returnCode);
}

/** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
  EXITSTATUS = status;
  if (ENVIRONMENT_IS_PTHREAD) {
    // implicit exit can never happen on a pthread
    assert(!implicit);
    // When running in a pthread we propagate the exit back to the main thread
    // where it can decide if the whole process should be shut down or not.
    // The pthread may have decided not to exit its own runtime, for example
    // because it runs a main loop, but that doesn't affect the main thread.
    exitOnMainThread(status);
    throw "unwind";
  }
  if (!keepRuntimeAlive()) {
    exitRuntime();
  }
  // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
  if (keepRuntimeAlive() && !implicit) {
    var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
    err(msg);
  }
  _proc_exit(status);
};

var _exit = exitJS;

var ptrToString = ptr => {
  assert(typeof ptr === "number", `ptrToString expects a number, got ${typeof ptr}`);
  // Convert to 32-bit unsigned value
  ptr >>>= 0;
  return "0x" + ptr.toString(16).padStart(8, "0");
};

var PThread = {
  unusedWorkers: [],
  runningWorkers: [],
  tlsInitFunctions: [],
  pthreads: {},
  nextWorkerID: 1,
  init() {
    if ((!(ENVIRONMENT_IS_PTHREAD))) {
      PThread.initMainThread();
    }
  },
  initMainThread() {
    var pthreadPoolSize = 10;
    // Start loading up the Worker pool, if requested.
    while (pthreadPoolSize--) {
      PThread.allocateUnusedWorker();
    }
    // MINIMAL_RUNTIME takes care of calling loadWasmModuleToAllWorkers
    // in postamble_minimal.js
    addOnPreRun(async () => {
      var pthreadPoolReady = PThread.loadWasmModuleToAllWorkers();
      addRunDependency("loading-workers");
      await pthreadPoolReady;
      removeRunDependency("loading-workers");
    });
  },
  terminateAllThreads: () => {
    assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! terminateAllThreads() can only ever be called from main application thread!");
    // Attempt to kill all workers.  Sadly (at least on the web) there is no
    // way to terminate a worker synchronously, or to be notified when a
    // worker in actually terminated.  This means there is some risk that
    // pthreads will continue to be executing after `worker.terminate` has
    // returned.  For this reason, we don't call `returnWorkerToPool` here or
    // free the underlying pthread data structures.
    for (var worker of PThread.runningWorkers) {
      terminateWorker(worker);
    }
    for (var worker of PThread.unusedWorkers) {
      terminateWorker(worker);
    }
    PThread.unusedWorkers = [];
    PThread.runningWorkers = [];
    PThread.pthreads = {};
  },
  returnWorkerToPool: worker => {
    // We don't want to run main thread queued calls here, since we are doing
    // some operations that leave the worker queue in an invalid state until
    // we are completely done (it would be bad if free() ends up calling a
    // queued pthread_create which looks at the global data structures we are
    // modifying). To achieve that, defer the free() til the very end, when
    // we are all done.
    var pthread_ptr = worker.pthread_ptr;
    delete PThread.pthreads[pthread_ptr];
    // Note: worker is intentionally not terminated so the pool can
    // dynamically grow.
    PThread.unusedWorkers.push(worker);
    PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
    // Not a running Worker anymore
    // Detach the worker from the pthread object, and return it to the
    // worker pool as an unused worker.
    worker.pthread_ptr = 0;
    // Finally, free the underlying (and now-unused) pthread structure in
    // linear memory.
    __emscripten_thread_free_data(pthread_ptr);
  },
  threadInitTLS() {
    // Call thread init functions (these are the _emscripten_tls_init for each
    // module loaded.
    PThread.tlsInitFunctions.forEach(f => f());
  },
  loadWasmModuleToWorker: worker => new Promise(onFinishedLoading => {
    worker.onmessage = e => {
      var d = e["data"];
      var cmd = d.cmd;
      // If this message is intended to a recipient that is not the main
      // thread, forward it to the target thread.
      if (d.targetThread && d.targetThread != _pthread_self()) {
        var targetWorker = PThread.pthreads[d.targetThread];
        if (targetWorker) {
          targetWorker.postMessage(d, d.transferList);
        } else {
          err(`Internal error! Worker sent a message "${cmd}" to target pthread ${d.targetThread}, but that thread no longer exists!`);
        }
        return;
      }
      if (cmd === "checkMailbox") {
        checkMailbox();
      } else if (cmd === "spawnThread") {
        spawnThread(d);
      } else if (cmd === "cleanupThread") {
        // cleanupThread needs to be run via callUserCallback since it calls
        // back into user code to free thread data. Without this it's possible
        // the unwind or ExitStatus exception could escape here.
        callUserCallback(() => cleanupThread(d.thread));
      } else if (cmd === "loaded") {
        worker.loaded = true;
        // Check that this worker doesn't have an associated pthread.
        if (ENVIRONMENT_IS_NODE && !worker.pthread_ptr) {
          // Once worker is loaded & idle, mark it as weakly referenced,
          // so that mere existence of a Worker in the pool does not prevent
          // Node.js from exiting the app.
          worker.unref();
        }
        onFinishedLoading(worker);
      } else if (d.target === "setimmediate") {
        // Worker wants to postMessage() to itself to implement setImmediate()
        // emulation.
        worker.postMessage(d);
      } else if (cmd === "uncaughtException") {
        // Message handler for Node.js specific out-of-order behavior:
        // https://github.com/nodejs/node/issues/59617
        // A pthread sent an uncaught exception event. Re-raise it on the main thread.
        worker.onerror(d.error);
      } else if (cmd === "callHandler") {
        Module[d.handler](...d.args);
      } else if (cmd) {
        // The received message looks like something that should be handled by this message
        // handler, (since there is a e.data.cmd field present), but is not one of the
        // recognized commands:
        err(`worker sent an unknown command ${cmd}`);
      }
    };
    worker.onerror = e => {
      var message = "worker sent an error!";
      if (worker.pthread_ptr) {
        message = `Pthread ${ptrToString(worker.pthread_ptr)} sent an error!`;
      }
      err(`${message} ${e.filename}:${e.lineno}: ${e.message}`);
      throw e;
    };
    if (ENVIRONMENT_IS_NODE) {
      worker.on("message", data => worker.onmessage({
        data
      }));
      worker.on("error", e => worker.onerror(e));
    }
    assert(wasmMemory instanceof WebAssembly.Memory, "WebAssembly memory should have been loaded by now!");
    assert(wasmModule instanceof WebAssembly.Module, "WebAssembly Module should have been loaded by now!");
    // When running on a pthread, none of the incoming parameters on the module
    // object are present. Proxy known handlers back to the main thread if specified.
    var handlers = [];
    var knownHandlers = [ "onExit", "onAbort", "print", "printErr" ];
    for (var handler of knownHandlers) {
      if (Module.propertyIsEnumerable(handler)) {
        handlers.push(handler);
      }
    }
    // Ask the new worker to load up the Emscripten-compiled page. This is a heavy operation.
    worker.postMessage({
      cmd: "load",
      handlers,
      wasmMemory,
      wasmModule,
      "workerID": worker.workerID
    });
  }),
  async loadWasmModuleToAllWorkers() {
    // Instantiation is synchronous in pthreads.
    if (ENVIRONMENT_IS_PTHREAD) {
      return;
    }
    let pthreadPoolReady = Promise.all(PThread.unusedWorkers.map(PThread.loadWasmModuleToWorker));
    return pthreadPoolReady;
  },
  allocateUnusedWorker() {
    var worker;
    var pthreadMainJs = _scriptName;
    // We can't use makeModuleReceiveWithVar here since we want to also
    // call URL.createObjectURL on the mainScriptUrlOrBlob.
    if (Module["mainScriptUrlOrBlob"]) {
      pthreadMainJs = Module["mainScriptUrlOrBlob"];
      if (typeof pthreadMainJs != "string") {
        pthreadMainJs = URL.createObjectURL(pthreadMainJs);
      }
    }
    worker = new Worker(pthreadMainJs, {
      // This is the way that we signal to the node worker that it is hosting
      // a pthread.
      "workerData": "em-pthread",
      // This is the way that we signal to the Web Worker that it is hosting
      // a pthread.
      "name": "em-pthread-" + PThread.nextWorkerID
    });
    worker.workerID = PThread.nextWorkerID++;
    PThread.unusedWorkers.push(worker);
  },
  getNewWorker() {
    if (PThread.unusedWorkers.length == 0) {
      // PTHREAD_POOL_SIZE_STRICT should show a warning and, if set to level `2`, return from the function.
      // However, if we're in Node.js, then we can create new workers on the fly and PTHREAD_POOL_SIZE_STRICT
      // should be ignored altogether.
      if (!ENVIRONMENT_IS_NODE) {
        err("Tried to spawn a new thread, but the thread pool is exhausted.\n" + "This might result in a deadlock unless some threads eventually exit or the code explicitly breaks out to the event loop.\n" + "If you want to increase the pool size, use setting `-sPTHREAD_POOL_SIZE=...`.");
        return;
      }
      PThread.allocateUnusedWorker();
      PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0]);
    }
    return PThread.unusedWorkers.pop();
  }
};

var onExits = [];

var addOnExit = cb => onExits.push(cb);

var onPostRuns = [];

var addOnPostRun = cb => onPostRuns.push(cb);

var autoResumeAudioContext = ctx => {
  for (var event of [ "keydown", "mousedown", "touchstart" ]) {
    for (var element of [ document, document.getElementById("canvas") ]) {
      element?.addEventListener(event, () => {
        if (ctx.state === "suspended") ctx.resume();
      }, {
        "once": true
      });
    }
  }
};

var dynCalls = {};

var dynCallLegacy = (sig, ptr, args) => {
  sig = sig.replace(/p/g, "i");
  assert(sig in dynCalls, `bad function pointer type - sig is not in dynCalls: '${sig}'`);
  if (args?.length) {
    // j (64-bit integer) is fine, and is implemented as a BigInt. Without
    // legalization, the number of parameters should match (j is not expanded
    // into two i's).
    assert(args.length === sig.length - 1);
  } else {
    assert(sig.length == 1);
  }
  var f = dynCalls[sig];
  return f(ptr, ...args);
};

var dynCall = (sig, ptr, args = [], promising = false) => {
  assert(ptr, `null function pointer in dynCall`);
  assert(!promising, "async dynCall is not supported in this mode");
  var rtn = dynCallLegacy(sig, ptr, args);
  function convert(rtn) {
    return rtn;
  }
  return convert(rtn);
};

function establishStackSpace(pthread_ptr) {
  var stackHigh = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((pthread_ptr) + (52)) >> 2), "loading")];
  var stackSize = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((pthread_ptr) + (56)) >> 2), "loading")];
  var stackLow = stackHigh - stackSize;
  assert(stackHigh != 0);
  assert(stackLow != 0);
  assert(stackHigh > stackLow, "stackHigh must be higher then stackLow");
  // Set stack limits used by `emscripten/stack.h` function.  These limits are
  // cached in wasm-side globals to make checks as fast as possible.
  _emscripten_stack_set_limits(stackHigh, stackLow);
  setStackLimits();
  // Call inside wasm module to set up the stack frame for this pthread in wasm module scope
  stackRestore(stackHigh);
  // Write the stack cookie last, after we have set up the proper bounds and
  // current position of the stack.
  writeStackCookie();
}

/**
     * @param {number} ptr
     * @param {string} type
     */ function getValue(ptr, type = "i8") {
  if (type.endsWith("*")) type = "*";
  switch (type) {
   case "i1":
    return (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), ptr, "loading")];

   case "i8":
    return (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), ptr, "loading")];

   case "i16":
    return (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), ((ptr) >> 1), "loading")];

   case "i32":
    return (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((ptr) >> 2), "loading")];

   case "i64":
    return (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), ((ptr) >> 3), "loading")];

   case "float":
    return (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((ptr) >> 2), "loading")];

   case "double":
    return (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((ptr) >> 3), "loading")];

   case "*":
    return (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((ptr) >> 2), "loading")];

   default:
    abort(`invalid type for getValue: ${type}`);
  }
}

var invokeEntryPoint = (ptr, arg) => {
  // An old thread on this worker may have been canceled without returning the
  // `runtimeKeepaliveCounter` to zero. Reset it now so the new thread won't
  // be affected.
  runtimeKeepaliveCounter = 0;
  // Same for noExitRuntime.  The default for pthreads should always be false
  // otherwise pthreads would never complete and attempts to pthread_join to
  // them would block forever.
  // pthreads can still choose to set `noExitRuntime` explicitly, or
  // call emscripten_unwind_to_js_event_loop to extend their lifetime beyond
  // their main function.  See comment in src/runtime_pthread.js for more.
  noExitRuntime = 0;
  // pthread entry points are always of signature 'void *ThreadMain(void *arg)'
  // Native codebases sometimes spawn threads with other thread entry point
  // signatures, such as void ThreadMain(void *arg), void *ThreadMain(), or
  // void ThreadMain().  That is not acceptable per C/C++ specification, but
  // x86 compiler ABI extensions enable that to work. If you find the
  // following line to crash, either change the signature to "proper" void
  // *ThreadMain(void *arg) form, or try linking with the Emscripten linker
  // flag -sEMULATE_FUNCTION_POINTER_CASTS to add in emulation for this x86
  // ABI extension.
  var result = (a1 => dynCall_ii(ptr, a1))(arg);
  checkStackCookie();
  function finish(result) {
    // In MINIMAL_RUNTIME the noExitRuntime concept does not apply to
    // pthreads. To exit a pthread with live runtime, use the function
    // emscripten_unwind_to_js_event_loop() in the pthread body.
    if (keepRuntimeAlive()) {
      EXITSTATUS = result;
      return;
    }
    __emscripten_thread_exit(result);
  }
  finish(result);
};

invokeEntryPoint.isAsync = true;

var noExitRuntime = false;

var registerTLSInit = tlsInitFunc => PThread.tlsInitFunctions.push(tlsInitFunc);

var setStackLimits = () => {
  var stackLow = _emscripten_stack_get_base();
  var stackHigh = _emscripten_stack_get_end();
  ___set_stack_limits(stackLow, stackHigh);
};

/**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */ function setValue(ptr, value, type = "i8") {
  if (type.endsWith("*")) type = "*";
  switch (type) {
   case "i1":
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), ptr, "storing")] = value;
    checkInt8(value);
    break;

   case "i8":
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), ptr, "storing")] = value;
    checkInt8(value);
    break;

   case "i16":
    (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), ((ptr) >> 1), "storing")] = value;
    checkInt16(value);
    break;

   case "i32":
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((ptr) >> 2), "storing")] = value;
    checkInt32(value);
    break;

   case "i64":
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), ((ptr) >> 3), "storing")] = BigInt(value);
    checkInt64(value);
    break;

   case "float":
    (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((ptr) >> 2), "storing")] = value;
    break;

   case "double":
    (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((ptr) >> 3), "storing")] = value;
    break;

   case "*":
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((ptr) >> 2), "storing")] = value;
    break;

   default:
    abort(`invalid type for setValue: ${type}`);
  }
}

var warnOnce = text => {
  warnOnce.shown ||= {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
    err(text);
  }
};

var wasmMemory;

var UTF8Decoder = globalThis.TextDecoder && new TextDecoder;

var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
  var maxIdx = idx + maxBytesToRead;
  if (ignoreNul) return maxIdx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.
  // As a tiny code save trick, compare idx against maxIdx using a negation,
  // so that maxBytesToRead=undefined/NaN means Infinity.
  while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
  return idx;
};

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.buffer instanceof ArrayBuffer ? heapOrArray.subarray(idx, endPtr) : heapOrArray.slice(idx, endPtr));
  }
  var str = "";
  while (idx < endPtr) {
    // For UTF8 byte structure, see:
    // http://en.wikipedia.org/wiki/UTF-8#Description
    // https://www.ietf.org/rfc/rfc2279.txt
    // https://tools.ietf.org/html/rfc3629
    var u0 = heapOrArray[idx++];
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue;
    }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    }
  }
  return str;
};

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index.
     * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
  assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
  return ptr ? UTF8ArrayToString((growMemViews(), HEAPU8), ptr, maxBytesToRead, ignoreNul) : "";
};

var ___assert_fail = (condition, filename, line, func) => abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);

var ___call_sighandler = (fp, sig) => (a1 => dynCall_vi(fp, a1))(sig);

var exceptionLast = 0;

class ExceptionInfo {
  // excPtr - Thrown object pointer to wrap. Metadata pointer is calculated from it.
  constructor(excPtr) {
    this.excPtr = excPtr;
    this.ptr = excPtr - 24;
  }
  set_type(type) {
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((this.ptr) + (4)) >> 2), "storing")] = type;
  }
  get_type() {
    return (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((this.ptr) + (4)) >> 2), "loading")];
  }
  set_destructor(destructor) {
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((this.ptr) + (8)) >> 2), "storing")] = destructor;
  }
  get_destructor() {
    return (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((this.ptr) + (8)) >> 2), "loading")];
  }
  set_caught(caught) {
    caught = caught ? 1 : 0;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (this.ptr) + (12), "storing")] = caught;
    checkInt8(caught);
  }
  get_caught() {
    return (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (this.ptr) + (12), "loading")] != 0;
  }
  set_rethrown(rethrown) {
    rethrown = rethrown ? 1 : 0;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (this.ptr) + (13), "storing")] = rethrown;
    checkInt8(rethrown);
  }
  get_rethrown() {
    return (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (this.ptr) + (13), "loading")] != 0;
  }
  // Initialize native structure fields. Should be called once after allocated.
  init(type, destructor) {
    this.set_adjusted_ptr(0);
    this.set_type(type);
    this.set_destructor(destructor);
  }
  set_adjusted_ptr(adjustedPtr) {
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((this.ptr) + (16)) >> 2), "storing")] = adjustedPtr;
  }
  get_adjusted_ptr() {
    return (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((this.ptr) + (16)) >> 2), "loading")];
  }
}

var setTempRet0 = val => __emscripten_tempret_set(val);

var findMatchingCatch = args => {
  var thrown = exceptionLast;
  if (!thrown) {
    // just pass through the null ptr
    setTempRet0(0);
    return 0;
  }
  var info = new ExceptionInfo(thrown);
  info.set_adjusted_ptr(thrown);
  var thrownType = info.get_type();
  if (!thrownType) {
    // just pass through the thrown ptr
    setTempRet0(0);
    return thrown;
  }
  // can_catch receives a **, add indirection
  // The different catch blocks are denoted by different types.
  // Due to inheritance, those types may not precisely match the
  // type of the thrown object. Find one which matches, and
  // return the type of the catch block which should be called.
  for (var caughtType of args) {
    if (caughtType === 0 || caughtType === thrownType) {
      // Catch all clause matched or exactly the same type is caught
      break;
    }
    var adjusted_ptr_addr = info.ptr + 16;
    if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
      setTempRet0(caughtType);
      return thrown;
    }
  }
  setTempRet0(thrownType);
  return thrown;
};

var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);

var uncaughtExceptionCount = 0;

var ___cxa_throw = (ptr, type, destructor) => {
  var info = new ExceptionInfo(ptr);
  // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
  info.init(type, destructor);
  exceptionLast = ptr;
  uncaughtExceptionCount++;
  assert(false, "Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.");
};

var ___handle_stack_overflow = requested => {
  var base = _emscripten_stack_get_base();
  var end = _emscripten_stack_get_end();
  abort(`stack overflow (Attempt to set SP to ${ptrToString(requested)}` + `, with stack limits [${ptrToString(end)} - ${ptrToString(base)}` + "]). If you require more stack space build with -sSTACK_SIZE=<bytes>");
};

function pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(2, 0, 1, pthread_ptr, attr, startRoutine, arg);
  return ___pthread_create_js(pthread_ptr, attr, startRoutine, arg);
}

var _emscripten_has_threading_support = () => !!globalThis.SharedArrayBuffer;

var ___pthread_create_js = (pthread_ptr, attr, startRoutine, arg) => {
  if (!_emscripten_has_threading_support()) {
    dbg("pthread_create: environment does not support SharedArrayBuffer, pthreads are not available");
    return 6;
  }
  // List of JS objects that will transfer ownership to the Worker hosting the thread
  var transferList = [];
  var error = 0;
  // Synchronously proxy the thread creation to main thread if possible. If we
  // need to transfer ownership of objects, then proxy asynchronously via
  // postMessage.
  if (ENVIRONMENT_IS_PTHREAD && (transferList.length === 0 || error)) {
    return pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg);
  }
  // If on the main thread, and accessing Canvas/OffscreenCanvas failed, abort
  // with the detected error.
  if (error) return error;
  var threadParams = {
    startRoutine,
    pthread_ptr,
    arg,
    transferList
  };
  if (ENVIRONMENT_IS_PTHREAD) {
    // The prepopulated pool of web workers that can host pthreads is stored
    // in the main JS thread. Therefore if a pthread is attempting to spawn a
    // new thread, the thread creation must be deferred to the main JS thread.
    threadParams.cmd = "spawnThread";
    postMessage(threadParams, transferList);
    // When we defer thread creation this way, we have no way to detect thread
    // creation synchronously today, so we have to assume success and return 0.
    return 0;
  }
  // We are the main thread, so we have the pthread warmup pool in this
  // thread and can fire off JS thread creation directly ourselves.
  return spawnThread(threadParams);
};

var ___resumeException = ptr => {
  if (!exceptionLast) {
    exceptionLast = ptr;
  }
  assert(false, "Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.");
};

var PATH = {
  isAbs: path => path.charAt(0) === "/",
  splitPath: filename => {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  },
  normalizeArray: (parts, allowAboveRoot) => {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {
        parts.splice(i, 1);
      } else if (last === "..") {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (;up; up--) {
        parts.unshift("..");
      }
    }
    return parts;
  },
  normalize: path => {
    var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
    // Normalize the path
    path = PATH.normalizeArray(path.split("/").filter(p => !!p), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return (isAbsolute ? "/" : "") + path;
  },
  dirname: path => {
    var result = PATH.splitPath(path), root = result[0], dir = result[1];
    if (!root && !dir) {
      // No dirname whatsoever
      return ".";
    }
    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.slice(0, -1);
    }
    return root + dir;
  },
  basename: path => path && path.match(/([^\/]+|\/)\/*$/)[1],
  join: (...paths) => PATH.normalize(paths.join("/")),
  join2: (l, r) => PATH.normalize(l + "/" + r)
};

var initRandomFill = () => {
  // This block is not needed on v19+ since crypto.getRandomValues is builtin
  if (ENVIRONMENT_IS_NODE) {
    var nodeCrypto = require("crypto");
    return view => nodeCrypto.randomFillSync(view);
  }
  // like with most Web APIs, we can't use Web Crypto API directly on shared memory,
  // so we need to create an intermediate buffer and copy it to the destination
  return view => view.set(crypto.getRandomValues(new Uint8Array(view.byteLength)));
};

var randomFill = view => {
  // Lazily init on the first invocation.
  (randomFill = initRandomFill())(view);
};

var PATH_FS = {
  resolve: (...args) => {
    var resolvedPath = "", resolvedAbsolute = false;
    for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? args[i] : FS.cwd();
      // Skip empty and invalid entries
      if (typeof path != "string") {
        throw new TypeError("Arguments to path.resolve must be strings");
      } else if (!path) {
        return "";
      }
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = PATH.isAbs(path);
    }
    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(p => !!p), !resolvedAbsolute).join("/");
    return ((resolvedAbsolute ? "/" : "") + resolvedPath) || ".";
  },
  relative: (from, to) => {
    from = PATH_FS.resolve(from).slice(1);
    to = PATH_FS.resolve(to).slice(1);
    function trim(arr) {
      var start = 0;
      for (;start < arr.length; start++) {
        if (arr[start] !== "") break;
      }
      var end = arr.length - 1;
      for (;end >= 0; end--) {
        if (arr[end] !== "") break;
      }
      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }
    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..");
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/");
  }
};

var FS_stdin_getChar_buffer = [];

var lengthBytesUTF8 = str => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i);
    // possibly a lead surrogate
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    var u = str.codePointAt(i);
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u > 1114111) warnOnce("Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
      // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
      // We need to manually skip over the second code unit for correct iteration.
      i++;
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
};

/** @type {function(string, boolean=, number=)} */ var intArrayFromString = (stringy, dontAddNull, length) => {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
};

var FS_stdin_getChar = () => {
  if (!FS_stdin_getChar_buffer.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
      // we will read data by chunks of BUFSIZE
      var BUFSIZE = 256;
      var buf = Buffer.alloc(BUFSIZE);
      var bytesRead = 0;
      // For some reason we must suppress a closure warning here, even though
      // fd definitely exists on process.stdin, and is even the proper way to
      // get the fd of stdin,
      // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
      // This started to happen after moving this logic out of library_tty.js,
      // so it is related to the surrounding code in some unclear manner.
      /** @suppress {missingProperties} */ var fd = process.stdin.fd;
      try {
        bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
      } catch (e) {
        // Cross-platform differences: on Windows, reading EOF throws an
        // exception, but on other OSes, reading EOF returns 0. Uniformize
        // behavior by treating the EOF exception to return 0.
        if (e.toString().includes("EOF")) bytesRead = 0; else throw e;
      }
      if (bytesRead > 0) {
        result = buf.slice(0, bytesRead).toString("utf-8");
      }
    } else if (globalThis.window?.prompt) {
      // Browser.
      result = window.prompt("Input: ");
      // returns null on cancel
      if (result !== null) {
        result += "\n";
      }
    } else {}
    if (!result) {
      return null;
    }
    FS_stdin_getChar_buffer = intArrayFromString(result, true);
  }
  return FS_stdin_getChar_buffer.shift();
};

var TTY = {
  ttys: [],
  init() {},
  shutdown() {},
  register(dev, ops) {
    TTY.ttys[dev] = {
      input: [],
      output: [],
      ops
    };
    FS.registerDevice(dev, TTY.stream_ops);
  },
  stream_ops: {
    open(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    },
    close(stream) {
      // flush any pending line data
      stream.tty.ops.fsync(stream.tty);
    },
    fsync(stream) {
      stream.tty.ops.fsync(stream.tty);
    },
    read(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === undefined && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === undefined) break;
        bytesRead++;
        buffer[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.atime = Date.now();
      }
      return bytesRead;
    },
    write(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.mtime = stream.node.ctime = Date.now();
      }
      return i;
    }
  },
  default_tty_ops: {
    get_char(tty) {
      return FS_stdin_getChar();
    },
    put_char(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    },
    fsync(tty) {
      if (tty.output?.length > 0) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    },
    ioctl_tcgets(tty) {
      // typical setting
      return {
        c_iflag: 25856,
        c_oflag: 5,
        c_cflag: 191,
        c_lflag: 35387,
        c_cc: [ 3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
      };
    },
    ioctl_tcsets(tty, optional_actions, data) {
      // currently just ignore
      return 0;
    },
    ioctl_tiocgwinsz(tty) {
      return [ 24, 80 ];
    }
  },
  default_tty1_ops: {
    put_char(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    },
    fsync(tty) {
      if (tty.output?.length > 0) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    }
  }
};

var zeroMemory = (ptr, size) => (growMemViews(), HEAPU8).fill(0, ptr, ptr + size);

var alignMemory = (size, alignment) => {
  assert(alignment, "alignment argument is required");
  return Math.ceil(size / alignment) * alignment;
};

var mmapAlloc = size => {
  size = alignMemory(size, 65536);
  var ptr = _emscripten_builtin_memalign(65536, size);
  if (ptr) zeroMemory(ptr, size);
  return ptr;
};

var MEMFS = {
  ops_table: null,
  mount(mount) {
    return MEMFS.createNode(null, "/", 16895, 0);
  },
  createNode(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      // no supported
      throw new FS.ErrnoError(63);
    }
    MEMFS.ops_table ||= {
      dir: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr,
          lookup: MEMFS.node_ops.lookup,
          mknod: MEMFS.node_ops.mknod,
          rename: MEMFS.node_ops.rename,
          unlink: MEMFS.node_ops.unlink,
          rmdir: MEMFS.node_ops.rmdir,
          readdir: MEMFS.node_ops.readdir,
          symlink: MEMFS.node_ops.symlink
        },
        stream: {
          llseek: MEMFS.stream_ops.llseek
        }
      },
      file: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr
        },
        stream: {
          llseek: MEMFS.stream_ops.llseek,
          read: MEMFS.stream_ops.read,
          write: MEMFS.stream_ops.write,
          mmap: MEMFS.stream_ops.mmap,
          msync: MEMFS.stream_ops.msync
        }
      },
      link: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr,
          readlink: MEMFS.node_ops.readlink
        },
        stream: {}
      },
      chrdev: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr
        },
        stream: FS.chrdev_stream_ops
      }
    };
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
      // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
      // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
      // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
      node.contents = null;
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream;
    }
    node.atime = node.mtime = node.ctime = Date.now();
    // add the new node to the parent
    if (parent) {
      parent.contents[name] = node;
      parent.atime = parent.mtime = parent.ctime = node.atime;
    }
    return node;
  },
  getFileDataAsTypedArray(node) {
    if (!node.contents) return new Uint8Array(0);
    if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
    // Make sure to not return excess unused bytes.
    return new Uint8Array(node.contents);
  },
  expandFileStorage(node, newCapacity) {
    var prevCapacity = node.contents ? node.contents.length : 0;
    if (prevCapacity >= newCapacity) return;
    // No need to expand, the storage was already large enough.
    // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
    // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
    // avoid overshooting the allocation cap by a very large margin.
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) >>> 0);
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
    // At minimum allocate 256b for each file when expanding.
    var oldContents = node.contents;
    node.contents = new Uint8Array(newCapacity);
    // Allocate new storage.
    if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
  },
  resizeFileStorage(node, newSize) {
    if (node.usedBytes == newSize) return;
    if (newSize == 0) {
      node.contents = null;
      // Fully decommit when requesting a resize to zero.
      node.usedBytes = 0;
    } else {
      var oldContents = node.contents;
      node.contents = new Uint8Array(newSize);
      // Allocate new storage.
      if (oldContents) {
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
      }
      node.usedBytes = newSize;
    }
  },
  node_ops: {
    getattr(node) {
      var attr = {};
      // device numbers reuse inode numbers.
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.atime);
      attr.mtime = new Date(node.mtime);
      attr.ctime = new Date(node.ctime);
      // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
      //       but this is not required by the standard.
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    },
    setattr(node, attr) {
      for (const key of [ "mode", "atime", "mtime", "ctime" ]) {
        if (attr[key] != null) {
          node[key] = attr[key];
        }
      }
      if (attr.size !== undefined) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    },
    lookup(parent, name) {
      throw new FS.ErrnoError(44);
    },
    mknod(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev);
    },
    rename(old_node, new_dir, new_name) {
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {}
      if (new_node) {
        if (FS.isDir(old_node.mode)) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
        FS.hashRemoveNode(new_node);
      }
      // do the internal rewiring
      delete old_node.parent.contents[old_node.name];
      new_dir.contents[new_name] = old_node;
      old_node.name = new_name;
      new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
    },
    unlink(parent, name) {
      delete parent.contents[name];
      parent.ctime = parent.mtime = Date.now();
    },
    rmdir(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name];
      parent.ctime = parent.mtime = Date.now();
    },
    readdir(node) {
      return [ ".", "..", ...Object.keys(node.contents) ];
    },
    symlink(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node;
    },
    readlink(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    }
  },
  stream_ops: {
    read(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      assert(size >= 0);
      if (size > 8 && contents.subarray) {
        // non-trivial, and typed array
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
      }
      return size;
    },
    write(stream, buffer, offset, length, position, canOwn) {
      // The data buffer should be a typed array view
      assert(!(buffer instanceof ArrayBuffer));
      // If the buffer is located in main memory (HEAP), and if
      // memory can grow, we can't hold on to references of the
      // memory buffer, as they may get invalidated. That means we
      // need to do copy its contents.
      if (buffer.buffer === (growMemViews(), HEAP8).buffer) {
        canOwn = false;
      }
      if (!length) return 0;
      var node = stream.node;
      node.mtime = node.ctime = Date.now();
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        // This write is from a typed array to a typed array?
        if (canOwn) {
          assert(position === 0, "canOwn must imply no weird position inside the file");
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
          node.contents = buffer.slice(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          // Writing to an already allocated and used subrange of the file?
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length;
        }
      }
      // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer.subarray) {
        // Use typed array write which is available.
        node.contents.set(buffer.subarray(offset, offset + length), position);
      } else {
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer[offset + i];
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    },
    llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    },
    mmap(stream, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      // Only make a new copy when MAP_PRIVATE is specified.
      if (!(flags & 2) && contents && contents.buffer === (growMemViews(), HEAP8).buffer) {
        // We can't emulate MAP_SHARED when the file is not backed by the
        // buffer we're mapping to (e.g. the HEAP buffer).
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        allocated = true;
        ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        if (contents) {
          // Try to avoid unnecessary slices.
          if (position > 0 || position + length < contents.length) {
            if (contents.subarray) {
              contents = contents.subarray(position, position + length);
            } else {
              contents = Array.prototype.slice.call(contents, position, position + length);
            }
          }
          (growMemViews(), HEAP8).set(contents, ptr);
        }
      }
      return {
        ptr,
        allocated
      };
    },
    msync(stream, buffer, offset, length, mmapFlags) {
      MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      // should we check if bytesWritten and length are the same?
      return 0;
    }
  }
};

var FS_modeStringToFlags = str => {
  var flagModes = {
    "r": 0,
    "r+": 2,
    "w": 512 | 64 | 1,
    "w+": 512 | 64 | 2,
    "a": 1024 | 64 | 1,
    "a+": 1024 | 64 | 2
  };
  var flags = flagModes[str];
  if (typeof flags == "undefined") {
    throw new Error(`Unknown file open mode: ${str}`);
  }
  return flags;
};

var FS_getMode = (canRead, canWrite) => {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
};

var strError = errno => UTF8ToString(_strerror(errno));

var ERRNO_CODES = {
  "EPERM": 63,
  "ENOENT": 44,
  "ESRCH": 71,
  "EINTR": 27,
  "EIO": 29,
  "ENXIO": 60,
  "E2BIG": 1,
  "ENOEXEC": 45,
  "EBADF": 8,
  "ECHILD": 12,
  "EAGAIN": 6,
  "EWOULDBLOCK": 6,
  "ENOMEM": 48,
  "EACCES": 2,
  "EFAULT": 21,
  "ENOTBLK": 105,
  "EBUSY": 10,
  "EEXIST": 20,
  "EXDEV": 75,
  "ENODEV": 43,
  "ENOTDIR": 54,
  "EISDIR": 31,
  "EINVAL": 28,
  "ENFILE": 41,
  "EMFILE": 33,
  "ENOTTY": 59,
  "ETXTBSY": 74,
  "EFBIG": 22,
  "ENOSPC": 51,
  "ESPIPE": 70,
  "EROFS": 69,
  "EMLINK": 34,
  "EPIPE": 64,
  "EDOM": 18,
  "ERANGE": 68,
  "ENOMSG": 49,
  "EIDRM": 24,
  "ECHRNG": 106,
  "EL2NSYNC": 156,
  "EL3HLT": 107,
  "EL3RST": 108,
  "ELNRNG": 109,
  "EUNATCH": 110,
  "ENOCSI": 111,
  "EL2HLT": 112,
  "EDEADLK": 16,
  "ENOLCK": 46,
  "EBADE": 113,
  "EBADR": 114,
  "EXFULL": 115,
  "ENOANO": 104,
  "EBADRQC": 103,
  "EBADSLT": 102,
  "EDEADLOCK": 16,
  "EBFONT": 101,
  "ENOSTR": 100,
  "ENODATA": 116,
  "ETIME": 117,
  "ENOSR": 118,
  "ENONET": 119,
  "ENOPKG": 120,
  "EREMOTE": 121,
  "ENOLINK": 47,
  "EADV": 122,
  "ESRMNT": 123,
  "ECOMM": 124,
  "EPROTO": 65,
  "EMULTIHOP": 36,
  "EDOTDOT": 125,
  "EBADMSG": 9,
  "ENOTUNIQ": 126,
  "EBADFD": 127,
  "EREMCHG": 128,
  "ELIBACC": 129,
  "ELIBBAD": 130,
  "ELIBSCN": 131,
  "ELIBMAX": 132,
  "ELIBEXEC": 133,
  "ENOSYS": 52,
  "ENOTEMPTY": 55,
  "ENAMETOOLONG": 37,
  "ELOOP": 32,
  "EOPNOTSUPP": 138,
  "EPFNOSUPPORT": 139,
  "ECONNRESET": 15,
  "ENOBUFS": 42,
  "EAFNOSUPPORT": 5,
  "EPROTOTYPE": 67,
  "ENOTSOCK": 57,
  "ENOPROTOOPT": 50,
  "ESHUTDOWN": 140,
  "ECONNREFUSED": 14,
  "EADDRINUSE": 3,
  "ECONNABORTED": 13,
  "ENETUNREACH": 40,
  "ENETDOWN": 38,
  "ETIMEDOUT": 73,
  "EHOSTDOWN": 142,
  "EHOSTUNREACH": 23,
  "EINPROGRESS": 26,
  "EALREADY": 7,
  "EDESTADDRREQ": 17,
  "EMSGSIZE": 35,
  "EPROTONOSUPPORT": 66,
  "ESOCKTNOSUPPORT": 137,
  "EADDRNOTAVAIL": 4,
  "ENETRESET": 39,
  "EISCONN": 30,
  "ENOTCONN": 53,
  "ETOOMANYREFS": 141,
  "EUSERS": 136,
  "EDQUOT": 19,
  "ESTALE": 72,
  "ENOTSUP": 138,
  "ENOMEDIUM": 148,
  "EILSEQ": 25,
  "EOVERFLOW": 61,
  "ECANCELED": 11,
  "ENOTRECOVERABLE": 56,
  "EOWNERDEAD": 62,
  "ESTRPIPE": 135
};

var asyncLoad = async url => {
  var arrayBuffer = await readAsync(url);
  assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
  return new Uint8Array(arrayBuffer);
};

var FS_createDataFile = (...args) => FS.createDataFile(...args);

var getUniqueRunDependency = id => {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
};

var preloadPlugins = [];

var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
  // Ensure plugins are ready.
  if (typeof Browser != "undefined") Browser.init();
  for (var plugin of preloadPlugins) {
    if (plugin["canHandle"](fullname)) {
      assert(plugin["handle"].constructor.name === "AsyncFunction", "Filesystem plugin handlers must be async functions (See #24914)");
      return plugin["handle"](byteArray, fullname);
    }
  }
  // In no plugin handled this file then return the original/unmodified
  // byteArray.
  return byteArray;
};

var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
  // TODO we should allow people to just pass in a complete filename instead
  // of parent and name being that we just join them anyways
  var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
  var dep = getUniqueRunDependency(`cp ${fullname}`);
  // might have several active requests for the same fullname
  addRunDependency(dep);
  try {
    var byteArray = url;
    if (typeof url == "string") {
      byteArray = await asyncLoad(url);
    }
    byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
    preFinish?.();
    if (!dontCreateFile) {
      FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
  } finally {
    removeRunDependency(dep);
  }
};

var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
  FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
};

var FS = {
  root: null,
  mounts: [],
  devices: {},
  streams: [],
  nextInode: 1,
  nameTable: null,
  currentPath: "/",
  initialized: false,
  ignorePermissions: true,
  filesystems: null,
  syncFSRequests: 0,
  readFiles: {},
  ErrnoError: class extends Error {
    name="ErrnoError";
    // We set the `name` property to be able to identify `FS.ErrnoError`
    // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
    // - when using PROXYFS, an error can come from an underlying FS
    // as different FS objects have their own FS.ErrnoError each,
    // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
    // we'll use the reliable test `err.name == "ErrnoError"` instead
    constructor(errno) {
      super(runtimeInitialized ? strError(errno) : "");
      this.errno = errno;
      for (var key in ERRNO_CODES) {
        if (ERRNO_CODES[key] === errno) {
          this.code = key;
          break;
        }
      }
    }
  },
  FSStream: class {
    shared={};
    get object() {
      return this.node;
    }
    set object(val) {
      this.node = val;
    }
    get isRead() {
      return (this.flags & 2097155) !== 1;
    }
    get isWrite() {
      return (this.flags & 2097155) !== 0;
    }
    get isAppend() {
      return (this.flags & 1024);
    }
    get flags() {
      return this.shared.flags;
    }
    set flags(val) {
      this.shared.flags = val;
    }
    get position() {
      return this.shared.position;
    }
    set position(val) {
      this.shared.position = val;
    }
  },
  FSNode: class {
    node_ops={};
    stream_ops={};
    readMode=292 | 73;
    writeMode=146;
    mounted=null;
    constructor(parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.rdev = rdev;
      this.atime = this.mtime = this.ctime = Date.now();
    }
    get read() {
      return (this.mode & this.readMode) === this.readMode;
    }
    set read(val) {
      val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
    }
    get write() {
      return (this.mode & this.writeMode) === this.writeMode;
    }
    set write(val) {
      val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
    }
    get isFolder() {
      return FS.isDir(this.mode);
    }
    get isDevice() {
      return FS.isChrdev(this.mode);
    }
  },
  lookupPath(path, opts = {}) {
    if (!path) {
      throw new FS.ErrnoError(44);
    }
    opts.follow_mount ??= true;
    if (!PATH.isAbs(path)) {
      path = FS.cwd() + "/" + path;
    }
    // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
    linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
      // split the absolute path
      var parts = path.split("/").filter(p => !!p);
      // start at the root
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = (i === parts.length - 1);
        if (islast && opts.parent) {
          // stop resolving
          break;
        }
        if (parts[i] === ".") {
          continue;
        }
        if (parts[i] === "..") {
          current_path = PATH.dirname(current_path);
          if (FS.isRoot(current)) {
            path = current_path + "/" + parts.slice(i + 1).join("/");
            // We're making progress here, don't let many consecutive ..'s
            // lead to ELOOP
            nlinks--;
            continue linkloop;
          } else {
            current = current.parent;
          }
          continue;
        }
        current_path = PATH.join2(current_path, parts[i]);
        try {
          current = FS.lookupNode(current, parts[i]);
        } catch (e) {
          // if noent_okay is true, suppress a ENOENT in the last component
          // and return an object with an undefined node. This is needed for
          // resolving symlinks in the path when creating a file.
          if ((e?.errno === 44) && islast && opts.noent_okay) {
            return {
              path: current_path
            };
          }
          throw e;
        }
        // jump to the mount's root node if this is a mountpoint
        if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
          current = current.mounted.root;
        }
        // by default, lookupPath will not follow a symlink if it is the final path component.
        // setting opts.follow = true will override this behavior.
        if (FS.isLink(current.mode) && (!islast || opts.follow)) {
          if (!current.node_ops.readlink) {
            throw new FS.ErrnoError(52);
          }
          var link = current.node_ops.readlink(current);
          if (!PATH.isAbs(link)) {
            link = PATH.dirname(current_path) + "/" + link;
          }
          path = link + "/" + parts.slice(i + 1).join("/");
          continue linkloop;
        }
      }
      return {
        path: current_path,
        node: current
      };
    }
    throw new FS.ErrnoError(32);
  },
  getPath(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
      }
      path = path ? `${node.name}/${path}` : node.name;
      node = node.parent;
    }
  },
  hashName(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return ((parentid + hash) >>> 0) % FS.nameTable.length;
  },
  hashAddNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node;
  },
  hashRemoveNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next;
    } else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break;
        }
        current = current.name_next;
      }
    }
  },
  lookupNode(parent, name) {
    var errCode = FS.mayLookup(parent);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node;
      }
    }
    // if we failed to find it in the cache, call into the VFS
    return FS.lookup(parent, name);
  },
  createNode(parent, name, mode, rdev) {
    assert(typeof parent == "object");
    var node = new FS.FSNode(parent, name, mode, rdev);
    FS.hashAddNode(node);
    return node;
  },
  destroyNode(node) {
    FS.hashRemoveNode(node);
  },
  isRoot(node) {
    return node === node.parent;
  },
  isMountpoint(node) {
    return !!node.mounted;
  },
  isFile(mode) {
    return (mode & 61440) === 32768;
  },
  isDir(mode) {
    return (mode & 61440) === 16384;
  },
  isLink(mode) {
    return (mode & 61440) === 40960;
  },
  isChrdev(mode) {
    return (mode & 61440) === 8192;
  },
  isBlkdev(mode) {
    return (mode & 61440) === 24576;
  },
  isFIFO(mode) {
    return (mode & 61440) === 4096;
  },
  isSocket(mode) {
    return (mode & 49152) === 49152;
  },
  flagsToPermissionString(flag) {
    var perms = [ "r", "w", "rw" ][flag & 3];
    if ((flag & 512)) {
      perms += "w";
    }
    return perms;
  },
  nodePermissions(node, perms) {
    if (FS.ignorePermissions) {
      return 0;
    }
    // return 0 if any user, group or owner bits are set.
    if (perms.includes("r") && !(node.mode & 292)) {
      return 2;
    } else if (perms.includes("w") && !(node.mode & 146)) {
      return 2;
    } else if (perms.includes("x") && !(node.mode & 73)) {
      return 2;
    }
    return 0;
  },
  mayLookup(dir) {
    if (!FS.isDir(dir.mode)) return 54;
    var errCode = FS.nodePermissions(dir, "x");
    if (errCode) return errCode;
    if (!dir.node_ops.lookup) return 2;
    return 0;
  },
  mayCreate(dir, name) {
    if (!FS.isDir(dir.mode)) {
      return 54;
    }
    try {
      var node = FS.lookupNode(dir, name);
      return 20;
    } catch (e) {}
    return FS.nodePermissions(dir, "wx");
  },
  mayDelete(dir, name, isdir) {
    var node;
    try {
      node = FS.lookupNode(dir, name);
    } catch (e) {
      return e.errno;
    }
    var errCode = FS.nodePermissions(dir, "wx");
    if (errCode) {
      return errCode;
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54;
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10;
      }
    } else {
      if (FS.isDir(node.mode)) {
        return 31;
      }
    }
    return 0;
  },
  mayOpen(node, flags) {
    if (!node) {
      return 44;
    }
    if (FS.isLink(node.mode)) {
      return 32;
    } else if (FS.isDir(node.mode)) {
      if (FS.flagsToPermissionString(flags) !== "r" || (flags & (512 | 64))) {
        // TODO: check for O_SEARCH? (== search for dir only)
        return 31;
      }
    }
    return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
  },
  checkOpExists(op, err) {
    if (!op) {
      throw new FS.ErrnoError(err);
    }
    return op;
  },
  MAX_OPEN_FDS: 4096,
  nextfd() {
    for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
      if (!FS.streams[fd]) {
        return fd;
      }
    }
    throw new FS.ErrnoError(33);
  },
  getStreamChecked(fd) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8);
    }
    return stream;
  },
  getStream: fd => FS.streams[fd],
  createStream(stream, fd = -1) {
    assert(fd >= -1);
    // clone it, so we can return an instance of FSStream
    stream = Object.assign(new FS.FSStream, stream);
    if (fd == -1) {
      fd = FS.nextfd();
    }
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream;
  },
  closeStream(fd) {
    FS.streams[fd] = null;
  },
  dupStream(origStream, fd = -1) {
    var stream = FS.createStream(origStream, fd);
    stream.stream_ops?.dup?.(stream);
    return stream;
  },
  doSetAttr(stream, node, attr) {
    var setattr = stream?.stream_ops.setattr;
    var arg = setattr ? stream : node;
    setattr ??= node.node_ops.setattr;
    FS.checkOpExists(setattr, 63);
    setattr(arg, attr);
  },
  chrdev_stream_ops: {
    open(stream) {
      var device = FS.getDevice(stream.node.rdev);
      // override node's stream ops with the device's
      stream.stream_ops = device.stream_ops;
      // forward the open call
      stream.stream_ops.open?.(stream);
    },
    llseek() {
      throw new FS.ErrnoError(70);
    }
  },
  major: dev => ((dev) >> 8),
  minor: dev => ((dev) & 255),
  makedev: (ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
    FS.devices[dev] = {
      stream_ops: ops
    };
  },
  getDevice: dev => FS.devices[dev],
  getMounts(mount) {
    var mounts = [];
    var check = [ mount ];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push(...m.mounts);
    }
    return mounts;
  },
  syncfs(populate, callback) {
    if (typeof populate == "function") {
      callback = populate;
      populate = false;
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {
      err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
    }
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;
    function doCallback(errCode) {
      assert(FS.syncFSRequests > 0);
      FS.syncFSRequests--;
      return callback(errCode);
    }
    function done(errCode) {
      if (errCode) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(errCode);
        }
        return;
      }
      if (++completed >= mounts.length) {
        doCallback(null);
      }
    }
    // sync all mounts
    for (var mount of mounts) {
      if (mount.type.syncfs) {
        mount.type.syncfs(mount, populate, done);
      } else {
        done(null);
      }
    }
  },
  mount(type, opts, mountpoint) {
    if (typeof type == "string") {
      // The filesystem was not included, and instead we have an error
      // message stored in the variable.
      throw type;
    }
    var root = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root && FS.root) {
      throw new FS.ErrnoError(10);
    } else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, {
        follow_mount: false
      });
      mountpoint = lookup.path;
      // use the absolute path
      node = lookup.node;
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      if (!FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
    }
    var mount = {
      type,
      opts,
      mountpoint,
      mounts: []
    };
    // create a root node for the fs
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {
      FS.root = mountRoot;
    } else if (node) {
      // set as a mountpoint
      node.mounted = mount;
      // add the new mount to the current mount's children
      if (node.mount) {
        node.mount.mounts.push(mount);
      }
    }
    return mountRoot;
  },
  unmount(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, {
      follow_mount: false
    });
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28);
    }
    // destroy the nodes for this mount, and all its child mounts
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    for (var [hash, current] of Object.entries(FS.nameTable)) {
      while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) {
          FS.destroyNode(current);
        }
        current = next;
      }
    }
    // no longer a mountpoint
    node.mounted = null;
    // remove this mount from the child mounts
    var idx = node.mount.mounts.indexOf(mount);
    assert(idx !== -1);
    node.mount.mounts.splice(idx, 1);
  },
  lookup(parent, name) {
    return parent.node_ops.lookup(parent, name);
  },
  mknod(path, mode, dev) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name) {
      throw new FS.ErrnoError(28);
    }
    if (name === "." || name === "..") {
      throw new FS.ErrnoError(20);
    }
    var errCode = FS.mayCreate(parent, name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.mknod(parent, name, mode, dev);
  },
  statfs(path) {
    return FS.statfsNode(FS.lookupPath(path, {
      follow: true
    }).node);
  },
  statfsStream(stream) {
    // We keep a separate statfsStream function because noderawfs overrides
    // it. In noderawfs, stream.node is sometimes null. Instead, we need to
    // look at stream.path.
    return FS.statfsNode(stream.node);
  },
  statfsNode(node) {
    // NOTE: None of the defaults here are true. We're just returning safe and
    //       sane values. Currently nodefs and rawfs replace these defaults,
    //       other file systems leave them alone.
    var rtn = {
      bsize: 4096,
      frsize: 4096,
      blocks: 1e6,
      bfree: 5e5,
      bavail: 5e5,
      files: FS.nextInode,
      ffree: FS.nextInode - 1,
      fsid: 42,
      flags: 2,
      namelen: 255
    };
    if (node.node_ops.statfs) {
      Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
    }
    return rtn;
  },
  create(path, mode = 438) {
    mode &= 4095;
    mode |= 32768;
    return FS.mknod(path, mode, 0);
  },
  mkdir(path, mode = 511) {
    mode &= 511 | 512;
    mode |= 16384;
    return FS.mknod(path, mode, 0);
  },
  mkdirTree(path, mode) {
    var dirs = path.split("/");
    var d = "";
    for (var dir of dirs) {
      if (!dir) continue;
      if (d || PATH.isAbs(path)) d += "/";
      d += dir;
      try {
        FS.mkdir(d, mode);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
    }
  },
  mkdev(path, mode, dev) {
    if (typeof dev == "undefined") {
      dev = mode;
      mode = 438;
    }
    mode |= 8192;
    return FS.mknod(path, mode, dev);
  },
  symlink(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44);
    }
    var lookup = FS.lookupPath(newpath, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.symlink(parent, newname, oldpath);
  },
  rename(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    // parents must exist
    var lookup, old_dir, new_dir;
    // let the errors from non existent directories percolate up
    lookup = FS.lookupPath(old_path, {
      parent: true
    });
    old_dir = lookup.node;
    lookup = FS.lookupPath(new_path, {
      parent: true
    });
    new_dir = lookup.node;
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
    // need to be part of the same mount
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75);
    }
    // source must exist
    var old_node = FS.lookupNode(old_dir, old_name);
    // old path should not be an ancestor of the new path
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(28);
    }
    // new path should not be an ancestor of the old path
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(55);
    }
    // see if the new path already exists
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    // early out if nothing needs to change
    if (old_node === new_node) {
      return;
    }
    // we'll need to delete the old entry
    var isdir = FS.isDir(old_node.mode);
    var errCode = FS.mayDelete(old_dir, old_name, isdir);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    // need delete permissions if we'll be overwriting.
    // need create permissions if new doesn't already exist.
    errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
      throw new FS.ErrnoError(10);
    }
    // if we are going to change the parent, check write permissions
    if (new_dir !== old_dir) {
      errCode = FS.nodePermissions(old_dir, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    // remove the node from the lookup hash
    FS.hashRemoveNode(old_node);
    // do the underlying fs rename
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name);
      // update old node (we do this here to avoid each backend
      // needing to)
      old_node.parent = new_dir;
    } catch (e) {
      throw e;
    } finally {
      // add the node back to the hash (in case node_ops.rename
      // changed its name)
      FS.hashAddNode(old_node);
    }
  },
  rmdir(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, true);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
  },
  readdir(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
    return readdir(node);
  },
  unlink(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, false);
    if (errCode) {
      // According to POSIX, we should map EISDIR to EPERM, but
      // we instead do what Linux does (and we must, as we use
      // the musl linux libc).
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
  },
  readlink(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new FS.ErrnoError(44);
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28);
    }
    return link.node_ops.readlink(link);
  },
  stat(path, dontFollow) {
    var lookup = FS.lookupPath(path, {
      follow: !dontFollow
    });
    var node = lookup.node;
    var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
    return getattr(node);
  },
  fstat(fd) {
    var stream = FS.getStreamChecked(fd);
    var node = stream.node;
    var getattr = stream.stream_ops.getattr;
    var arg = getattr ? stream : node;
    getattr ??= node.node_ops.getattr;
    FS.checkOpExists(getattr, 63);
    return getattr(arg);
  },
  lstat(path) {
    return FS.stat(path, true);
  },
  doChmod(stream, node, mode, dontFollow) {
    FS.doSetAttr(stream, node, {
      mode: (mode & 4095) | (node.mode & ~4095),
      ctime: Date.now(),
      dontFollow
    });
  },
  chmod(path, mode, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChmod(null, node, mode, dontFollow);
  },
  lchmod(path, mode) {
    FS.chmod(path, mode, true);
  },
  fchmod(fd, mode) {
    var stream = FS.getStreamChecked(fd);
    FS.doChmod(stream, stream.node, mode, false);
  },
  doChown(stream, node, dontFollow) {
    FS.doSetAttr(stream, node, {
      timestamp: Date.now(),
      dontFollow
    });
  },
  chown(path, uid, gid, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChown(null, node, dontFollow);
  },
  lchown(path, uid, gid) {
    FS.chown(path, uid, gid, true);
  },
  fchown(fd, uid, gid) {
    var stream = FS.getStreamChecked(fd);
    FS.doChown(stream, stream.node, false);
  },
  doTruncate(stream, node, len) {
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    var errCode = FS.nodePermissions(node, "w");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.doSetAttr(stream, node, {
      size: len,
      timestamp: Date.now()
    });
  },
  truncate(path, len) {
    if (len < 0) {
      throw new FS.ErrnoError(28);
    }
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doTruncate(null, node, len);
  },
  ftruncate(fd, len) {
    var stream = FS.getStreamChecked(fd);
    if (len < 0 || (stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28);
    }
    FS.doTruncate(stream, stream.node, len);
  },
  utime(path, atime, mtime) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
    setattr(node, {
      atime,
      mtime
    });
  },
  open(path, flags, mode = 438) {
    if (path === "") {
      throw new FS.ErrnoError(44);
    }
    flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
    if ((flags & 64)) {
      mode = (mode & 4095) | 32768;
    } else {
      mode = 0;
    }
    var node;
    var isDirPath;
    if (typeof path == "object") {
      node = path;
    } else {
      isDirPath = path.endsWith("/");
      // noent_okay makes it so that if the final component of the path
      // doesn't exist, lookupPath returns `node: undefined`. `path` will be
      // updated to point to the target of all symlinks.
      var lookup = FS.lookupPath(path, {
        follow: !(flags & 131072),
        noent_okay: true
      });
      node = lookup.node;
      path = lookup.path;
    }
    // perhaps we need to create the node
    var created = false;
    if ((flags & 64)) {
      if (node) {
        // if O_CREAT and O_EXCL are set, error out if the node already exists
        if ((flags & 128)) {
          throw new FS.ErrnoError(20);
        }
      } else if (isDirPath) {
        throw new FS.ErrnoError(31);
      } else {
        // node doesn't exist, try to create it
        // Ignore the permission bits here to ensure we can `open` this new
        // file below. We use chmod below the apply the permissions once the
        // file is open.
        node = FS.mknod(path, mode | 511, 0);
        created = true;
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44);
    }
    // can't truncate a device
    if (FS.isChrdev(node.mode)) {
      flags &= ~512;
    }
    // if asked only for a directory, then this must be one
    if ((flags & 65536) && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54);
    }
    // check permissions, if this is not a file we just created now (it is ok to
    // create and write to a file with read-only permissions; it is read-only
    // for later use)
    if (!created) {
      var errCode = FS.mayOpen(node, flags);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    // do truncation if necessary
    if ((flags & 512) && !created) {
      FS.truncate(node, 0);
    }
    // we've already handled these, don't pass down to the underlying vfs
    flags &= ~(128 | 512 | 131072);
    // register the stream with the filesystem
    var stream = FS.createStream({
      node,
      path: FS.getPath(node),
      // we want the absolute path to the node
      flags,
      seekable: true,
      position: 0,
      stream_ops: node.stream_ops,
      // used by the file family libc calls (fopen, fwrite, ferror, etc.)
      ungotten: [],
      error: false
    });
    // call the new stream's open function
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream);
    }
    if (created) {
      FS.chmod(node, mode & 511);
    }
    if (Module["logReadFiles"] && !(flags & 1)) {
      if (!(path in FS.readFiles)) {
        FS.readFiles[path] = 1;
      }
    }
    return stream;
  },
  close(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (stream.getdents) stream.getdents = null;
    // free readdir state
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream);
      }
    } catch (e) {
      throw e;
    } finally {
      FS.closeStream(stream.fd);
    }
    stream.fd = null;
  },
  isClosed(stream) {
    return stream.fd === null;
  },
  llseek(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70);
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28);
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position;
  },
  read(stream, buffer, offset, length, position) {
    assert(offset >= 0);
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead;
  },
  write(stream, buffer, offset, length, position, canOwn) {
    assert(offset >= 0);
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28);
    }
    if (stream.seekable && stream.flags & 1024) {
      // seek to the end before writing in append mode
      FS.llseek(stream, 0, 2);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    return bytesWritten;
  },
  mmap(stream, length, position, prot, flags) {
    // User requests writing to file (prot & PROT_WRITE != 0).
    // Checking if we have permissions to write to the file unless
    // MAP_PRIVATE flag is set. According to POSIX spec it is possible
    // to write to file opened in read-only mode with MAP_PRIVATE flag,
    // as all modifications will be visible only in the memory of
    // the current process.
    if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
      throw new FS.ErrnoError(2);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2);
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43);
    }
    if (!length) {
      throw new FS.ErrnoError(28);
    }
    return stream.stream_ops.mmap(stream, length, position, prot, flags);
  },
  msync(stream, buffer, offset, length, mmapFlags) {
    assert(offset >= 0);
    if (!stream.stream_ops.msync) {
      return 0;
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
  },
  ioctl(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59);
    }
    return stream.stream_ops.ioctl(stream, cmd, arg);
  },
  readFile(path, opts = {}) {
    opts.flags = opts.flags || 0;
    opts.encoding = opts.encoding || "binary";
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
      abort(`Invalid encoding type "${opts.encoding}"`);
    }
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {
      buf = UTF8ArrayToString(buf);
    }
    FS.close(stream);
    return buf;
  },
  writeFile(path, data, opts = {}) {
    opts.flags = opts.flags || 577;
    var stream = FS.open(path, opts.flags, opts.mode);
    if (typeof data == "string") {
      data = new Uint8Array(intArrayFromString(data, true));
    }
    if (ArrayBuffer.isView(data)) {
      FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
    } else {
      abort("Unsupported data type");
    }
    FS.close(stream);
  },
  cwd: () => FS.currentPath,
  chdir(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    if (lookup.node === null) {
      throw new FS.ErrnoError(44);
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54);
    }
    var errCode = FS.nodePermissions(lookup.node, "x");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.currentPath = lookup.path;
  },
  createDefaultDirectories() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user");
  },
  createDefaultDevices() {
    // create /dev
    FS.mkdir("/dev");
    // setup /dev/null
    FS.registerDevice(FS.makedev(1, 3), {
      read: () => 0,
      write: (stream, buffer, offset, length, pos) => length,
      llseek: () => 0
    });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    // setup /dev/tty and /dev/tty1
    // stderr needs to print output using err() rather than out()
    // so we register a second tty just for it.
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    // setup /dev/[u]random
    // use a buffer to avoid overhead of individual crypto calls per byte
    var randomBuffer = new Uint8Array(1024), randomLeft = 0;
    var randomByte = () => {
      if (randomLeft === 0) {
        randomFill(randomBuffer);
        randomLeft = randomBuffer.byteLength;
      }
      return randomBuffer[--randomLeft];
    };
    FS.createDevice("/dev", "random", randomByte);
    FS.createDevice("/dev", "urandom", randomByte);
    // we're not going to emulate the actual shm device,
    // just create the tmp dirs that reside in it commonly
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp");
  },
  createSpecialDirectories() {
    // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
    // name of the stream for fd 6 (see test_unistd_ttyname)
    FS.mkdir("/proc");
    var proc_self = FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({
      mount() {
        var node = FS.createNode(proc_self, "fd", 16895, 73);
        node.stream_ops = {
          llseek: MEMFS.stream_ops.llseek
        };
        node.node_ops = {
          lookup(parent, name) {
            var fd = +name;
            var stream = FS.getStreamChecked(fd);
            var ret = {
              parent: null,
              mount: {
                mountpoint: "fake"
              },
              node_ops: {
                readlink: () => stream.path
              },
              id: fd + 1
            };
            ret.parent = ret;
            // make it look like a simple root node
            return ret;
          },
          readdir() {
            return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
          }
        };
        return node;
      }
    }, {}, "/proc/self/fd");
  },
  createStandardStreams(input, output, error) {
    // TODO deprecate the old functionality of a single
    // input / output callback and that utilizes FS.createDevice
    // and instead require a unique set of stream ops
    // by default, we symlink the standard streams to the
    // default tty devices. however, if the standard streams
    // have been overwritten we create a unique device for
    // them instead.
    if (input) {
      FS.createDevice("/dev", "stdin", input);
    } else {
      FS.symlink("/dev/tty", "/dev/stdin");
    }
    if (output) {
      FS.createDevice("/dev", "stdout", null, output);
    } else {
      FS.symlink("/dev/tty", "/dev/stdout");
    }
    if (error) {
      FS.createDevice("/dev", "stderr", null, error);
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr");
    }
    // open default streams for the stdin, stdout and stderr devices
    var stdin = FS.open("/dev/stdin", 0);
    var stdout = FS.open("/dev/stdout", 1);
    var stderr = FS.open("/dev/stderr", 1);
    assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
    assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
    assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
  },
  staticInit() {
    FS.nameTable = new Array(4096);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = {
      "MEMFS": MEMFS
    };
  },
  init(input, output, error) {
    assert(!FS.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
    FS.initialized = true;
    // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
    input ??= Module["stdin"];
    output ??= Module["stdout"];
    error ??= Module["stderr"];
    FS.createStandardStreams(input, output, error);
  },
  quit() {
    FS.initialized = false;
    // force-flush all streams, so we get musl std streams printed out
    _fflush(0);
    // close all of our streams
    for (var stream of FS.streams) {
      if (stream) {
        FS.close(stream);
      }
    }
  },
  findObject(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink);
    if (!ret.exists) {
      return null;
    }
    return ret.object;
  },
  analyzePath(path, dontResolveLastLink) {
    // operate from within the context of the symlink's target
    try {
      var lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      path = lookup.path;
    } catch (e) {}
    var ret = {
      isRoot: false,
      exists: false,
      error: 0,
      name: null,
      path: null,
      object: null,
      parentExists: false,
      parentPath: null,
      parentObject: null
    };
    try {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/";
    } catch (e) {
      ret.error = e.errno;
    }
    return ret;
  },
  createPath(parent, path, canRead, canWrite) {
    parent = typeof parent == "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {
        FS.mkdir(current);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
      parent = current;
    }
    return current;
  },
  createFile(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(canRead, canWrite);
    return FS.create(path, mode);
  },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
    var path = name;
    if (parent) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      path = name ? PATH.join2(parent, name) : parent;
    }
    var mode = FS_getMode(canRead, canWrite);
    var node = FS.create(path, mode);
    if (data) {
      if (typeof data == "string") {
        var arr = new Array(data.length);
        for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
        data = arr;
      }
      // make sure we can write to the file
      FS.chmod(node, mode | 146);
      var stream = FS.open(node, 577);
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode);
    }
  },
  createDevice(parent, name, input, output) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(!!input, !!output);
    FS.createDevice.major ??= 64;
    var dev = FS.makedev(FS.createDevice.major++, 0);
    // Create a fake device that a set of stream ops to emulate
    // the old behavior.
    FS.registerDevice(dev, {
      open(stream) {
        stream.seekable = false;
      },
      close(stream) {
        // flush any pending line data
        if (output?.buffer?.length) {
          output(10);
        }
      },
      read(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = input();
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError(6);
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset + i] = result;
        }
        if (bytesRead) {
          stream.node.atime = Date.now();
        }
        return bytesRead;
      },
      write(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.mtime = stream.node.ctime = Date.now();
        }
        return i;
      }
    });
    return FS.mkdev(path, mode, dev);
  },
  forceLoadFile(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    if (globalThis.XMLHttpRequest) {
      abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    } else {
      // Command-line.
      try {
        obj.contents = readBinary(obj.url);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    }
  },
  createLazyFile(parent, name, url, canRead, canWrite) {
    // Lazy chunked Uint8Array (implements get and length from Uint8Array).
    // Actual getting is abstracted away for eventual reuse.
    class LazyUint8Array {
      lengthKnown=false;
      chunks=[];
      // Loaded chunks. Index is the chunk number
      get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return undefined;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = (idx / this.chunkSize) | 0;
        return this.getter(chunkNum)[chunkOffset];
      }
      setDataGetter(getter) {
        this.getter = getter;
      }
      cacheLength() {
        // Find length
        var xhr = new XMLHttpRequest;
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        // Chunk size in bytes
        if (!hasByteServing) chunkSize = datalength;
        // Function to get a range from the remote URL.
        var doXHR = (from, to) => {
          if (from > to) abort("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) abort("only " + datalength + " bytes available! programmer error!");
          // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
          var xhr = new XMLHttpRequest;
          xhr.open("GET", url, false);
          if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
          // Some hints to the browser that we want binary data.
          xhr.responseType = "arraybuffer";
          if (xhr.overrideMimeType) {
            xhr.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
          if (xhr.response !== undefined) {
            return new Uint8Array(/** @type{Array<number>} */ (xhr.response || []));
          }
          return intArrayFromString(xhr.responseText || "", true);
        };
        var lazyArray = this;
        lazyArray.setDataGetter(chunkNum => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          // including this byte
          end = Math.min(end, datalength - 1);
          // if datalength-1 is selected, this is the last block
          if (typeof lazyArray.chunks[chunkNum] == "undefined") {
            lazyArray.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray.chunks[chunkNum] == "undefined") abort("doXHR failed!");
          return lazyArray.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
          chunkSize = datalength = 1;
          // this will force getter(0)/doXHR do download the whole file
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      }
      get length() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._length;
      }
      get chunkSize() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._chunkSize;
      }
    }
    if (globalThis.XMLHttpRequest) {
      if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
      var lazyArray = new LazyUint8Array;
      var properties = {
        isDevice: false,
        contents: lazyArray
      };
    } else {
      var properties = {
        isDevice: false,
        url
      };
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    // This is a total hack, but I want to get this lazy file code out of the
    // core of MEMFS. If we want to keep this lazy file concept I feel it should
    // be its own thin LAZYFS proxying calls to MEMFS.
    if (properties.contents) {
      node.contents = properties.contents;
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url;
    }
    // Add a function that defers querying the file size until it is asked the first time.
    Object.defineProperties(node, {
      usedBytes: {
        get: function() {
          return this.contents.length;
        }
      }
    });
    // override each stream op with one that tries to force load the lazy file first
    var stream_ops = {};
    for (const [key, fn] of Object.entries(node.stream_ops)) {
      stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
    }
    function writeChunks(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      assert(size >= 0);
      if (contents.slice) {
        // normal array
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i];
        }
      } else {
        for (var i = 0; i < size; i++) {
          // LazyUint8Array from sync binary XHR
          buffer[offset + i] = contents.get(position + i);
        }
      }
      return size;
    }
    // use a custom read function
    stream_ops.read = (stream, buffer, offset, length, position) => {
      FS.forceLoadFile(node);
      return writeChunks(stream, buffer, offset, length, position);
    };
    // use a custom mmap function
    stream_ops.mmap = (stream, length, position, prot, flags) => {
      FS.forceLoadFile(node);
      var ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      writeChunks(stream, (growMemViews(), HEAP8), ptr, length, position);
      return {
        ptr,
        allocated: true
      };
    };
    node.stream_ops = stream_ops;
    return node;
  },
  absolutePath() {
    abort("FS.absolutePath has been removed; use PATH_FS.resolve instead");
  },
  createFolder() {
    abort("FS.createFolder has been removed; use FS.mkdir instead");
  },
  createLink() {
    abort("FS.createLink has been removed; use FS.symlink instead");
  },
  joinPath() {
    abort("FS.joinPath has been removed; use PATH.join instead");
  },
  mmapAlloc() {
    abort("FS.mmapAlloc has been replaced by the top level function mmapAlloc");
  },
  standardizePath() {
    abort("FS.standardizePath has been removed; use PATH.normalize instead");
  }
};

var SYSCALLS = {
  DEFAULT_POLLMASK: 5,
  calculateAt(dirfd, path, allowEmpty) {
    if (PATH.isAbs(path)) {
      return path;
    }
    // relative path
    var dir;
    if (dirfd === -100) {
      dir = FS.cwd();
    } else {
      var dirstream = SYSCALLS.getStreamFromFD(dirfd);
      dir = dirstream.path;
    }
    if (path.length == 0) {
      if (!allowEmpty) {
        throw new FS.ErrnoError(44);
      }
      return dir;
    }
    return dir + "/" + path;
  },
  writeStat(buf, stat) {
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((buf) >> 2), "storing")] = stat.dev;
    checkInt32(stat.dev);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (4)) >> 2), "storing")] = stat.mode;
    checkInt32(stat.mode);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (8)) >> 2), "storing")] = stat.nlink;
    checkInt32(stat.nlink);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (12)) >> 2), "storing")] = stat.uid;
    checkInt32(stat.uid);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (16)) >> 2), "storing")] = stat.gid;
    checkInt32(stat.gid);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (20)) >> 2), "storing")] = stat.rdev;
    checkInt32(stat.rdev);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (24)) >> 3), "storing")] = BigInt(stat.size);
    checkInt64(stat.size);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((buf) + (32)) >> 2), "storing")] = 4096;
    checkInt32(4096);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((buf) + (36)) >> 2), "storing")] = stat.blocks;
    checkInt32(stat.blocks);
    var atime = stat.atime.getTime();
    var mtime = stat.mtime.getTime();
    var ctime = stat.ctime.getTime();
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (40)) >> 3), "storing")] = BigInt(Math.floor(atime / 1e3));
    checkInt64(Math.floor(atime / 1e3));
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (48)) >> 2), "storing")] = (atime % 1e3) * 1e3 * 1e3;
    checkInt32((atime % 1e3) * 1e3 * 1e3);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (56)) >> 3), "storing")] = BigInt(Math.floor(mtime / 1e3));
    checkInt64(Math.floor(mtime / 1e3));
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (64)) >> 2), "storing")] = (mtime % 1e3) * 1e3 * 1e3;
    checkInt32((mtime % 1e3) * 1e3 * 1e3);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (72)) >> 3), "storing")] = BigInt(Math.floor(ctime / 1e3));
    checkInt64(Math.floor(ctime / 1e3));
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (80)) >> 2), "storing")] = (ctime % 1e3) * 1e3 * 1e3;
    checkInt32((ctime % 1e3) * 1e3 * 1e3);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (88)) >> 3), "storing")] = BigInt(stat.ino);
    checkInt64(stat.ino);
    return 0;
  },
  writeStatFs(buf, stats) {
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (4)) >> 2), "storing")] = stats.bsize;
    checkInt32(stats.bsize);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (60)) >> 2), "storing")] = stats.bsize;
    checkInt32(stats.bsize);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (8)) >> 3), "storing")] = BigInt(stats.blocks);
    checkInt64(stats.blocks);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (16)) >> 3), "storing")] = BigInt(stats.bfree);
    checkInt64(stats.bfree);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (24)) >> 3), "storing")] = BigInt(stats.bavail);
    checkInt64(stats.bavail);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (32)) >> 3), "storing")] = BigInt(stats.files);
    checkInt64(stats.files);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((buf) + (40)) >> 3), "storing")] = BigInt(stats.ffree);
    checkInt64(stats.ffree);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (48)) >> 2), "storing")] = stats.fsid;
    checkInt32(stats.fsid);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (64)) >> 2), "storing")] = stats.flags;
    checkInt32(stats.flags);
    // ST_NOSUID
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((buf) + (56)) >> 2), "storing")] = stats.namelen;
    checkInt32(stats.namelen);
  },
  doMsync(addr, stream, len, flags, offset) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    if (flags & 2) {
      // MAP_PRIVATE calls need not to be synced back to underlying fs
      return 0;
    }
    var buffer = (growMemViews(), HEAPU8).slice(addr, addr + len);
    FS.msync(stream, buffer, offset, len, flags);
  },
  getStreamFromFD(fd) {
    var stream = FS.getStreamChecked(fd);
    return stream;
  },
  varargs: undefined,
  getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  }
};

var INT53_MAX = 9007199254740992;

var INT53_MIN = -9007199254740992;

var bigintToI53Checked = num => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);

var ___syscall__newselect = function(nfds, readfds, writefds, exceptfds, timeoutInMillis) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(3, 0, 1, nfds, readfds, writefds, exceptfds, timeoutInMillis);
  timeoutInMillis = bigintToI53Checked(timeoutInMillis);
  try {
    // readfds are supported,
    // writefds checks socket open status
    // exceptfds are supported, although on web, such exceptional conditions never arise in web sockets
    //                          and so the exceptfds list will always return empty.
    // timeout is supported, although on SOCKFS and PIPEFS these are ignored and always treated as 0 - fully async
    assert(nfds <= 64, "nfds must be less than or equal to 64");
    // fd sets have 64 bits // TODO: this could be 1024 based on current musl headers
    var total = 0;
    var srcReadLow = (readfds ? (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
    HEAP32), ((readfds) >> 2), "loading")] : 0), srcReadHigh = (readfds ? (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((readfds) + (4)) >> 2), "loading")] : 0);
    var srcWriteLow = (writefds ? (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
    HEAP32), ((writefds) >> 2), "loading")] : 0), srcWriteHigh = (writefds ? (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((writefds) + (4)) >> 2), "loading")] : 0);
    var srcExceptLow = (exceptfds ? (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
    HEAP32), ((exceptfds) >> 2), "loading")] : 0), srcExceptHigh = (exceptfds ? (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((exceptfds) + (4)) >> 2), "loading")] : 0);
    var dstReadLow = 0, dstReadHigh = 0;
    var dstWriteLow = 0, dstWriteHigh = 0;
    var dstExceptLow = 0, dstExceptHigh = 0;
    var allLow = srcReadLow | srcWriteLow | srcExceptLow;
    var allHigh = srcReadHigh | srcWriteHigh | srcExceptHigh;
    var check = (fd, low, high, val) => fd < 32 ? (low & val) : (high & val);
    for (var fd = 0; fd < nfds; fd++) {
      var mask = 1 << (fd % 32);
      if (!(check(fd, allLow, allHigh, mask))) {
        continue;
      }
      var stream = SYSCALLS.getStreamFromFD(fd);
      var flags = SYSCALLS.DEFAULT_POLLMASK;
      if (stream.stream_ops.poll) {
        flags = stream.stream_ops.poll(stream, timeoutInMillis);
      } else {
        if (timeoutInMillis != 0) warnOnce("non-zero select() timeout not supported: " + timeoutInMillis);
      }
      if ((flags & 1) && check(fd, srcReadLow, srcReadHigh, mask)) {
        fd < 32 ? (dstReadLow = dstReadLow | mask) : (dstReadHigh = dstReadHigh | mask);
        total++;
      }
      if ((flags & 4) && check(fd, srcWriteLow, srcWriteHigh, mask)) {
        fd < 32 ? (dstWriteLow = dstWriteLow | mask) : (dstWriteHigh = dstWriteHigh | mask);
        total++;
      }
      if ((flags & 2) && check(fd, srcExceptLow, srcExceptHigh, mask)) {
        fd < 32 ? (dstExceptLow = dstExceptLow | mask) : (dstExceptHigh = dstExceptHigh | mask);
        total++;
      }
    }
    if (readfds) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((readfds) >> 2), "storing")] = dstReadLow;
      checkInt32(dstReadLow);
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((readfds) + (4)) >> 2), "storing")] = dstReadHigh;
      checkInt32(dstReadHigh);
    }
    if (writefds) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((writefds) >> 2), "storing")] = dstWriteLow;
      checkInt32(dstWriteLow);
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((writefds) + (4)) >> 2), "storing")] = dstWriteHigh;
      checkInt32(dstWriteHigh);
    }
    if (exceptfds) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((exceptfds) >> 2), "storing")] = dstExceptLow;
      checkInt32(dstExceptLow);
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((exceptfds) + (4)) >> 2), "storing")] = dstExceptHigh;
      checkInt32(dstExceptHigh);
    }
    return total;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
};

var SOCKFS = {
  websocketArgs: {},
  callbacks: {},
  on(event, callback) {
    SOCKFS.callbacks[event] = callback;
  },
  emit(event, param) {
    SOCKFS.callbacks[event]?.(param);
  },
  mount(mount) {
    // The incomming Module['websocket'] can be used for configuring 
    // configuring subprotocol/url, etc
    SOCKFS.websocketArgs = Module["websocket"] || {};
    // Add the Event registration mechanism to the exported websocket configuration
    // object so we can register network callbacks from native JavaScript too.
    // For more documentation see system/include/emscripten/emscripten.h
    (Module["websocket"] ??= {})["on"] = SOCKFS.on;
    return FS.createNode(null, "/", 16895, 0);
  },
  createSocket(family, type, protocol) {
    // Emscripten only supports AF_INET
    if (family != 2) {
      throw new FS.ErrnoError(5);
    }
    type &= ~526336;
    // Some applications may pass it; it makes no sense for a single process.
    // Emscripten only supports SOCK_STREAM and SOCK_DGRAM
    if (type != 1 && type != 2) {
      throw new FS.ErrnoError(28);
    }
    var streaming = type == 1;
    if (streaming && protocol && protocol != 6) {
      throw new FS.ErrnoError(66);
    }
    // create our internal socket structure
    var sock = {
      family,
      type,
      protocol,
      server: null,
      error: null,
      // Used in getsockopt for SOL_SOCKET/SO_ERROR test
      peers: {},
      pending: [],
      recv_queue: [],
      sock_ops: SOCKFS.websocket_sock_ops
    };
    // create the filesystem node to store the socket structure
    var name = SOCKFS.nextname();
    var node = FS.createNode(SOCKFS.root, name, 49152, 0);
    node.sock = sock;
    // and the wrapping stream that enables library functions such
    // as read and write to indirectly interact with the socket
    var stream = FS.createStream({
      path: name,
      node,
      flags: 2,
      seekable: false,
      stream_ops: SOCKFS.stream_ops
    });
    // map the new stream to the socket structure (sockets have a 1:1
    // relationship with a stream)
    sock.stream = stream;
    return sock;
  },
  getSocket(fd) {
    var stream = FS.getStream(fd);
    if (!stream || !FS.isSocket(stream.node.mode)) {
      return null;
    }
    return stream.node.sock;
  },
  stream_ops: {
    poll(stream) {
      var sock = stream.node.sock;
      return sock.sock_ops.poll(sock);
    },
    ioctl(stream, request, varargs) {
      var sock = stream.node.sock;
      return sock.sock_ops.ioctl(sock, request, varargs);
    },
    read(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      var msg = sock.sock_ops.recvmsg(sock, length);
      if (!msg) {
        // socket is closed
        return 0;
      }
      buffer.set(msg.buffer, offset);
      return msg.buffer.length;
    },
    write(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      return sock.sock_ops.sendmsg(sock, buffer, offset, length);
    },
    close(stream) {
      var sock = stream.node.sock;
      sock.sock_ops.close(sock);
    }
  },
  nextname() {
    if (!SOCKFS.nextname.current) {
      SOCKFS.nextname.current = 0;
    }
    return `socket[${SOCKFS.nextname.current++}]`;
  },
  websocket_sock_ops: {
    createPeer(sock, addr, port) {
      var ws;
      if (typeof addr == "object") {
        ws = addr;
        addr = null;
        port = null;
      }
      if (ws) {
        // for sockets that've already connected (e.g. we're the server)
        // we can inspect the _socket property for the address
        if (ws._socket) {
          addr = ws._socket.remoteAddress;
          port = ws._socket.remotePort;
        } else {
          var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
          if (!result) {
            throw new Error("WebSocket URL must be in the format ws(s)://address:port");
          }
          addr = result[1];
          port = parseInt(result[2], 10);
        }
      } else {
        // create the actual websocket object and connect
        try {
          // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
          // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
          var url = "ws://".replace("#", "//");
          // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
          var subProtocols = "binary";
          // The default value is 'binary'
          // The default WebSocket options
          var opts = undefined;
          // Fetch runtime WebSocket URL config.
          if (SOCKFS.websocketArgs["url"]) {
            url = SOCKFS.websocketArgs["url"];
          }
          // Fetch runtime WebSocket subprotocol config.
          if (SOCKFS.websocketArgs["subprotocol"]) {
            subProtocols = SOCKFS.websocketArgs["subprotocol"];
          } else if (SOCKFS.websocketArgs["subprotocol"] === null) {
            subProtocols = "null";
          }
          if (url === "ws://" || url === "wss://") {
            // Is the supplied URL config just a prefix, if so complete it.
            var parts = addr.split("/");
            url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/");
          }
          if (subProtocols !== "null") {
            // The regex trims the string (removes spaces at the beginning and end, then splits the string by
            // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
            subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
            opts = subProtocols;
          }
          // If node we use the ws library.
          var WebSocketConstructor;
          if (ENVIRONMENT_IS_NODE) {
            WebSocketConstructor = /** @type{(typeof WebSocket)} */ (require("ws"));
          } else {
            WebSocketConstructor = WebSocket;
          }
          ws = new WebSocketConstructor(url, opts);
          ws.binaryType = "arraybuffer";
        } catch (e) {
          throw new FS.ErrnoError(23);
        }
      }
      var peer = {
        addr,
        port,
        socket: ws,
        msg_send_queue: []
      };
      SOCKFS.websocket_sock_ops.addPeer(sock, peer);
      SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
      // if this is a bound dgram socket, send the port number first to allow
      // us to override the ephemeral port reported to us by remotePort on the
      // remote end.
      if (sock.type === 2 && typeof sock.sport != "undefined") {
        peer.msg_send_queue.push(new Uint8Array([ 255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), ((sock.sport & 65280) >> 8), (sock.sport & 255) ]));
      }
      return peer;
    },
    getPeer(sock, addr, port) {
      return sock.peers[addr + ":" + port];
    },
    addPeer(sock, peer) {
      sock.peers[peer.addr + ":" + peer.port] = peer;
    },
    removePeer(sock, peer) {
      delete sock.peers[peer.addr + ":" + peer.port];
    },
    handlePeerEvents(sock, peer) {
      var first = true;
      var handleOpen = function() {
        sock.connecting = false;
        SOCKFS.emit("open", sock.stream.fd);
        try {
          var queued = peer.msg_send_queue.shift();
          while (queued) {
            peer.socket.send(queued);
            queued = peer.msg_send_queue.shift();
          }
        } catch (e) {
          // not much we can do here in the way of proper error handling as we've already
          // lied and said this data was sent. shut it down.
          peer.socket.close();
        }
      };
      function handleMessage(data) {
        if (typeof data == "string") {
          var encoder = new TextEncoder;
          // should be utf-8
          data = encoder.encode(data);
        } else {
          assert(data.byteLength !== undefined);
          // must receive an ArrayBuffer
          if (data.byteLength == 0) {
            // An empty ArrayBuffer will emit a pseudo disconnect event
            // as recv/recvmsg will return zero which indicates that a socket
            // has performed a shutdown although the connection has not been disconnected yet.
            return;
          }
          data = new Uint8Array(data);
        }
        // if this is the port message, override the peer's port with it
        var wasfirst = first;
        first = false;
        if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
          // update the peer's port and it's key in the peer map
          var newport = ((data[8] << 8) | data[9]);
          SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          peer.port = newport;
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          return;
        }
        sock.recv_queue.push({
          addr: peer.addr,
          port: peer.port,
          data
        });
        SOCKFS.emit("message", sock.stream.fd);
      }
      if (ENVIRONMENT_IS_NODE) {
        peer.socket.on("open", handleOpen);
        peer.socket.on("message", function(data, isBinary) {
          if (!isBinary) {
            return;
          }
          handleMessage((new Uint8Array(data)).buffer);
        });
        peer.socket.on("close", function() {
          SOCKFS.emit("close", sock.stream.fd);
        });
        peer.socket.on("error", function(error) {
          // Although the ws library may pass errors that may be more descriptive than
          // ECONNREFUSED they are not necessarily the expected error code e.g.
          // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
          // is still probably the most useful thing to do.
          sock.error = 14;
          // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
          SOCKFS.emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
        });
      } else {
        peer.socket.onopen = handleOpen;
        peer.socket.onclose = function() {
          SOCKFS.emit("close", sock.stream.fd);
        };
        peer.socket.onmessage = function peer_socket_onmessage(event) {
          handleMessage(event.data);
        };
        peer.socket.onerror = function(error) {
          // The WebSocket spec only allows a 'simple event' to be thrown on error,
          // so we only really know as much as ECONNREFUSED.
          sock.error = 14;
          // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
          SOCKFS.emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
        };
      }
    },
    poll(sock) {
      if (sock.type === 1 && sock.server) {
        // listen sockets should only say they're available for reading
        // if there are pending clients.
        return sock.pending.length ? (64 | 1) : 0;
      }
      var mask = 0;
      var dest = sock.type === 1 ? // we only care about the socket state for connection-based sockets
      SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
      if (sock.recv_queue.length || !dest || // connection-less sockets are always ready to read
      (dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
        // let recv return 0 once closed
        mask |= (64 | 1);
      }
      if (!dest || // connection-less sockets are always ready to write
      (dest && dest.socket.readyState === dest.socket.OPEN)) {
        mask |= 4;
      }
      if ((dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
        // When an non-blocking connect fails mark the socket as writable.
        // Its up to the calling code to then use getsockopt with SO_ERROR to
        // retrieve the error.
        // See https://man7.org/linux/man-pages/man2/connect.2.html
        if (sock.connecting) {
          mask |= 4;
        } else {
          mask |= 16;
        }
      }
      return mask;
    },
    ioctl(sock, request, arg) {
      switch (request) {
       case 21531:
        var bytes = 0;
        if (sock.recv_queue.length) {
          bytes = sock.recv_queue[0].data.length;
        }
        (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((arg) >> 2), "storing")] = bytes;
        checkInt32(bytes);
        return 0;

       case 21537:
        var on = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((arg) >> 2), "loading")];
        if (on) {
          sock.stream.flags |= 2048;
        } else {
          sock.stream.flags &= ~2048;
        }
        return 0;

       default:
        return 28;
      }
    },
    close(sock) {
      // if we've spawned a listen server, close it
      if (sock.server) {
        try {
          sock.server.close();
        } catch (e) {}
        sock.server = null;
      }
      // close any peer connections
      for (var peer of Object.values(sock.peers)) {
        try {
          peer.socket.close();
        } catch (e) {}
        SOCKFS.websocket_sock_ops.removePeer(sock, peer);
      }
      return 0;
    },
    bind(sock, addr, port) {
      if (typeof sock.saddr != "undefined" || typeof sock.sport != "undefined") {
        throw new FS.ErrnoError(28);
      }
      sock.saddr = addr;
      sock.sport = port;
      // in order to emulate dgram sockets, we need to launch a listen server when
      // binding on a connection-less socket
      // note: this is only required on the server side
      if (sock.type === 2) {
        // close the existing server if it exists
        if (sock.server) {
          sock.server.close();
          sock.server = null;
        }
        // swallow error operation not supported error that occurs when binding in the
        // browser where this isn't supported
        try {
          sock.sock_ops.listen(sock, 0);
        } catch (e) {
          if (!(e.name === "ErrnoError")) throw e;
          if (e.errno !== 138) throw e;
        }
      }
    },
    connect(sock, addr, port) {
      if (sock.server) {
        throw new FS.ErrnoError(138);
      }
      // TODO autobind
      // if (!sock.addr && sock.type == 2) {
      // }
      // early out if we're already connected / in the middle of connecting
      if (typeof sock.daddr != "undefined" && typeof sock.dport != "undefined") {
        var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
        if (dest) {
          if (dest.socket.readyState === dest.socket.CONNECTING) {
            throw new FS.ErrnoError(7);
          } else {
            throw new FS.ErrnoError(30);
          }
        }
      }
      // add the socket to our peer list and set our
      // destination address / port to match
      var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
      sock.daddr = peer.addr;
      sock.dport = peer.port;
      // because we cannot synchronously block to wait for the WebSocket
      // connection to complete, we return here pretending that the connection
      // was a success.
      sock.connecting = true;
    },
    listen(sock, backlog) {
      if (!ENVIRONMENT_IS_NODE) {
        throw new FS.ErrnoError(138);
      }
      if (sock.server) {
        throw new FS.ErrnoError(28);
      }
      var WebSocketServer = require("ws").Server;
      var host = sock.saddr;
      sock.server = new WebSocketServer({
        host,
        port: sock.sport
      });
      SOCKFS.emit("listen", sock.stream.fd);
      // Send Event with listen fd.
      sock.server.on("connection", function(ws) {
        if (sock.type === 1) {
          var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
          // create a peer on the new socket
          var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
          newsock.daddr = peer.addr;
          newsock.dport = peer.port;
          // push to queue for accept to pick up
          sock.pending.push(newsock);
          SOCKFS.emit("connection", newsock.stream.fd);
        } else {
          // create a peer on the listen socket so calling sendto
          // with the listen socket and an address will resolve
          // to the correct client
          SOCKFS.websocket_sock_ops.createPeer(sock, ws);
          SOCKFS.emit("connection", sock.stream.fd);
        }
      });
      sock.server.on("close", function() {
        SOCKFS.emit("close", sock.stream.fd);
        sock.server = null;
      });
      sock.server.on("error", function(error) {
        // Although the ws library may pass errors that may be more descriptive than
        // ECONNREFUSED they are not necessarily the expected error code e.g.
        // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
        // is still probably the most useful thing to do. This error shouldn't
        // occur in a well written app as errors should get trapped in the compiled
        // app's own getaddrinfo call.
        sock.error = 23;
        // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
        SOCKFS.emit("error", [ sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable" ]);
      });
    },
    accept(listensock) {
      if (!listensock.server || !listensock.pending.length) {
        throw new FS.ErrnoError(28);
      }
      var newsock = listensock.pending.shift();
      newsock.stream.flags = listensock.stream.flags;
      return newsock;
    },
    getname(sock, peer) {
      var addr, port;
      if (peer) {
        if (sock.daddr === undefined || sock.dport === undefined) {
          throw new FS.ErrnoError(53);
        }
        addr = sock.daddr;
        port = sock.dport;
      } else {
        // TODO saddr and sport will be set for bind()'d UDP sockets, but what
        // should we be returning for TCP sockets that've been connect()'d?
        addr = sock.saddr || 0;
        port = sock.sport || 0;
      }
      return {
        addr,
        port
      };
    },
    sendmsg(sock, buffer, offset, length, addr, port) {
      if (sock.type === 2) {
        // connection-less sockets will honor the message address,
        // and otherwise fall back to the bound destination address
        if (addr === undefined || port === undefined) {
          addr = sock.daddr;
          port = sock.dport;
        }
        // if there was no address to fall back to, error out
        if (addr === undefined || port === undefined) {
          throw new FS.ErrnoError(17);
        }
      } else {
        // connection-based sockets will only use the bound
        addr = sock.daddr;
        port = sock.dport;
      }
      // find the peer for the destination address
      var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
      // early out if not connected with a connection-based socket
      if (sock.type === 1) {
        if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
          throw new FS.ErrnoError(53);
        }
      }
      // create a copy of the incoming data to send, as the WebSocket API
      // doesn't work entirely with an ArrayBufferView, it'll just send
      // the entire underlying buffer
      if (ArrayBuffer.isView(buffer)) {
        offset += buffer.byteOffset;
        buffer = buffer.buffer;
      }
      var data = buffer.slice(offset, offset + length);
      // WebSockets .send() does not allow passing a SharedArrayBuffer, so
      // clone the the SharedArrayBuffer as regular ArrayBuffer before
      // sending.
      if (data instanceof SharedArrayBuffer) {
        data = new Uint8Array(new Uint8Array(data)).buffer;
      }
      // if we don't have a cached connectionless UDP datagram connection, or
      // the TCP socket is still connecting, queue the message to be sent upon
      // connect, and lie, saying the data was sent now.
      if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
        // if we're not connected, open a new connection
        if (sock.type === 2) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          }
        }
        dest.msg_send_queue.push(data);
        return length;
      }
      try {
        // send the actual data
        dest.socket.send(data);
        return length;
      } catch (e) {
        throw new FS.ErrnoError(28);
      }
    },
    recvmsg(sock, length) {
      // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
      if (sock.type === 1 && sock.server) {
        // tcp servers should not be recv()'ing on the listen socket
        throw new FS.ErrnoError(53);
      }
      var queued = sock.recv_queue.shift();
      if (!queued) {
        if (sock.type === 1) {
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (!dest) {
            // if we have a destination address but are not connected, error out
            throw new FS.ErrnoError(53);
          }
          if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            // return null if the socket has closed
            return null;
          }
          // else, our socket is in a valid state but truly has nothing available
          throw new FS.ErrnoError(6);
        }
        throw new FS.ErrnoError(6);
      }
      // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
      // requeued TCP data it'll be an ArrayBufferView
      var queuedLength = queued.data.byteLength || queued.data.length;
      var queuedOffset = queued.data.byteOffset || 0;
      var queuedBuffer = queued.data.buffer || queued.data;
      var bytesRead = Math.min(length, queuedLength);
      var res = {
        buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
        addr: queued.addr,
        port: queued.port
      };
      // push back any unread data for TCP connections
      if (sock.type === 1 && bytesRead < queuedLength) {
        var bytesRemaining = queuedLength - bytesRead;
        queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
        sock.recv_queue.unshift(queued);
      }
      return res;
    }
  }
};

var getSocketFromFD = fd => {
  var socket = SOCKFS.getSocket(fd);
  if (!socket) throw new FS.ErrnoError(8);
  return socket;
};

var inetNtop4 = addr => (addr & 255) + "." + ((addr >> 8) & 255) + "." + ((addr >> 16) & 255) + "." + ((addr >> 24) & 255);

var inetNtop6 = ints => {
  //  ref:  http://www.ietf.org/rfc/rfc2373.txt - section 2.5.4
  //  Format for IPv4 compatible and mapped  128-bit IPv6 Addresses
  //  128-bits are split into eight 16-bit words
  //  stored in network byte order (big-endian)
  //  |                80 bits               | 16 |      32 bits        |
  //  +-----------------------------------------------------------------+
  //  |               10 bytes               |  2 |      4 bytes        |
  //  +--------------------------------------+--------------------------+
  //  +               5 words                |  1 |      2 words        |
  //  +--------------------------------------+--------------------------+
  //  |0000..............................0000|0000|    IPv4 ADDRESS     | (compatible)
  //  +--------------------------------------+----+---------------------+
  //  |0000..............................0000|FFFF|    IPv4 ADDRESS     | (mapped)
  //  +--------------------------------------+----+---------------------+
  var str = "";
  var word = 0;
  var longest = 0;
  var lastzero = 0;
  var zstart = 0;
  var len = 0;
  var i = 0;
  var parts = [ ints[0] & 65535, (ints[0] >> 16), ints[1] & 65535, (ints[1] >> 16), ints[2] & 65535, (ints[2] >> 16), ints[3] & 65535, (ints[3] >> 16) ];
  // Handle IPv4-compatible, IPv4-mapped, loopback and any/unspecified addresses
  var hasipv4 = true;
  var v4part = "";
  // check if the 10 high-order bytes are all zeros (first 5 words)
  for (i = 0; i < 5; i++) {
    if (parts[i] !== 0) {
      hasipv4 = false;
      break;
    }
  }
  if (hasipv4) {
    // low-order 32-bits store an IPv4 address (bytes 13 to 16) (last 2 words)
    v4part = inetNtop4(parts[6] | (parts[7] << 16));
    // IPv4-mapped IPv6 address if 16-bit value (bytes 11 and 12) == 0xFFFF (6th word)
    if (parts[5] === -1) {
      str = "::ffff:";
      str += v4part;
      return str;
    }
    // IPv4-compatible IPv6 address if 16-bit value (bytes 11 and 12) == 0x0000 (6th word)
    if (parts[5] === 0) {
      str = "::";
      //special case IPv6 addresses
      if (v4part === "0.0.0.0") v4part = "";
      // any/unspecified address
      if (v4part === "0.0.0.1") v4part = "1";
      // loopback address
      str += v4part;
      return str;
    }
  }
  // Handle all other IPv6 addresses
  // first run to find the longest contiguous zero words
  for (word = 0; word < 8; word++) {
    if (parts[word] === 0) {
      if (word - lastzero > 1) {
        len = 0;
      }
      lastzero = word;
      len++;
    }
    if (len > longest) {
      longest = len;
      zstart = word - longest + 1;
    }
  }
  for (word = 0; word < 8; word++) {
    if (longest > 1) {
      // compress contiguous zeros - to produce "::"
      if (parts[word] === 0 && word >= zstart && word < (zstart + longest)) {
        if (word === zstart) {
          str += ":";
          if (zstart === 0) str += ":";
        }
        continue;
      }
    }
    // converts 16-bit words from big-endian to little-endian before converting to hex string
    str += Number(_ntohs(parts[word] & 65535)).toString(16);
    str += word < 7 ? ":" : "";
  }
  return str;
};

var readSockaddr = (sa, salen) => {
  // family / port offsets are common to both sockaddr_in and sockaddr_in6
  var family = (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), ((sa) >> 1), "loading")];
  var port = _ntohs((growMemViews(), HEAPU16)[SAFE_HEAP_INDEX((growMemViews(), HEAPU16), (((sa) + (2)) >> 1), "loading")]);
  var addr;
  switch (family) {
   case 2:
    if (salen !== 16) {
      return {
        errno: 28
      };
    }
    addr = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (4)) >> 2), "loading")];
    addr = inetNtop4(addr);
    break;

   case 10:
    if (salen !== 28) {
      return {
        errno: 28
      };
    }
    addr = [ (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (8)) >> 2), "loading")], (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (12)) >> 2), "loading")], (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (16)) >> 2), "loading")], (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (20)) >> 2), "loading")] ];
    addr = inetNtop6(addr);
    break;

   default:
    return {
      errno: 5
    };
  }
  return {
    family,
    addr,
    port
  };
};

var inetPton4 = str => {
  var b = str.split(".");
  for (var i = 0; i < 4; i++) {
    var tmp = Number(b[i]);
    if (isNaN(tmp)) return null;
    b[i] = tmp;
  }
  return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
};

var inetPton6 = str => {
  var words;
  var w, offset, z, i;
  /* http://home.deds.nl/~aeron/regex/ */ var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
  var parts = [];
  if (!valid6regx.test(str)) {
    return null;
  }
  if (str === "::") {
    return [ 0, 0, 0, 0, 0, 0, 0, 0 ];
  }
  // Z placeholder to keep track of zeros when splitting the string on ":"
  if (str.startsWith("::")) {
    str = str.replace("::", "Z:");
  } else {
    str = str.replace("::", ":Z:");
  }
  if (str.indexOf(".") > 0) {
    // parse IPv4 embedded stress
    str = str.replace(new RegExp("[.]", "g"), ":");
    words = str.split(":");
    words[words.length - 4] = Number(words[words.length - 4]) + Number(words[words.length - 3]) * 256;
    words[words.length - 3] = Number(words[words.length - 2]) + Number(words[words.length - 1]) * 256;
    words = words.slice(0, words.length - 2);
  } else {
    words = str.split(":");
  }
  offset = 0;
  z = 0;
  for (w = 0; w < words.length; w++) {
    if (typeof words[w] == "string") {
      if (words[w] === "Z") {
        // compressed zeros - write appropriate number of zero words
        for (z = 0; z < (8 - words.length + 1); z++) {
          parts[w + z] = 0;
        }
        offset = z - 1;
      } else {
        // parse hex to field to 16-bit value and write it in network byte-order
        parts[w + offset] = _htons(parseInt(words[w], 16));
      }
    } else {
      // parsed IPv4 words
      parts[w + offset] = words[w];
    }
  }
  return [ (parts[1] << 16) | parts[0], (parts[3] << 16) | parts[2], (parts[5] << 16) | parts[4], (parts[7] << 16) | parts[6] ];
};

var DNS = {
  address_map: {
    id: 1,
    addrs: {},
    names: {}
  },
  lookup_name(name) {
    // If the name is already a valid ipv4 / ipv6 address, don't generate a fake one.
    var res = inetPton4(name);
    if (res !== null) {
      return name;
    }
    res = inetPton6(name);
    if (res !== null) {
      return name;
    }
    // See if this name is already mapped.
    var addr;
    if (DNS.address_map.addrs[name]) {
      addr = DNS.address_map.addrs[name];
    } else {
      var id = DNS.address_map.id++;
      assert(id < 65535, "exceeded max address mappings of 65535");
      addr = "172.29." + (id & 255) + "." + (id & 65280);
      DNS.address_map.names[addr] = name;
      DNS.address_map.addrs[name] = addr;
    }
    return addr;
  },
  lookup_addr(addr) {
    if (DNS.address_map.names[addr]) {
      return DNS.address_map.names[addr];
    }
    return null;
  }
};

var getSocketAddress = (addrp, addrlen) => {
  var info = readSockaddr(addrp, addrlen);
  if (info.errno) throw new FS.ErrnoError(info.errno);
  info.addr = DNS.lookup_addr(info.addr) || info.addr;
  return info;
};

function ___syscall_bind(fd, addr, addrlen, d1, d2, d3) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(4, 0, 1, fd, addr, addrlen, d1, d2, d3);
  try {
    var sock = getSocketFromFD(fd);
    var info = getSocketAddress(addr, addrlen);
    sock.sock_ops.bind(sock, info.addr, info.port);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_chmod(path, mode) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(5, 0, 1, path, mode);
  try {
    path = SYSCALLS.getStr(path);
    FS.chmod(path, mode);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_connect(fd, addr, addrlen, d1, d2, d3) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(6, 0, 1, fd, addr, addrlen, d1, d2, d3);
  try {
    var sock = getSocketFromFD(fd);
    var info = getSocketAddress(addr, addrlen);
    sock.sock_ops.connect(sock, info.addr, info.port);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_faccessat(dirfd, path, amode, flags) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(7, 0, 1, dirfd, path, amode, flags);
  try {
    path = SYSCALLS.getStr(path);
    assert(!flags || flags == 512);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (amode & ~7) {
      // need a valid mode
      return -28;
    }
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    if (!node) {
      return -44;
    }
    var perms = "";
    if (amode & 4) perms += "r";
    if (amode & 2) perms += "w";
    if (amode & 1) perms += "x";
    if (perms && FS.nodePermissions(node, perms)) {
      return -2;
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_fchmod(fd, mode) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(8, 0, 1, fd, mode);
  try {
    FS.fchmod(fd, mode);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_fchown32(fd, owner, group) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(9, 0, 1, fd, owner, group);
  try {
    FS.fchown(fd, owner, group);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

var syscallGetVarargI = () => {
  assert(SYSCALLS.varargs != undefined);
  // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
  var ret = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((+SYSCALLS.varargs) >> 2), "loading")];
  SYSCALLS.varargs += 4;
  return ret;
};

var syscallGetVarargP = syscallGetVarargI;

function ___syscall_fcntl64(fd, cmd, varargs) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(10, 0, 1, fd, cmd, varargs);
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    switch (cmd) {
     case 0:
      {
        var arg = syscallGetVarargI();
        if (arg < 0) {
          return -28;
        }
        while (FS.streams[arg]) {
          arg++;
        }
        var newStream;
        newStream = FS.dupStream(stream, arg);
        return newStream.fd;
      }

     case 1:
     case 2:
      return 0;

     // FD_CLOEXEC makes no sense for a single process.
      case 3:
      return stream.flags;

     case 4:
      {
        var arg = syscallGetVarargI();
        stream.flags |= arg;
        return 0;
      }

     case 12:
      {
        var arg = syscallGetVarargP();
        var offset = 0;
        // We're always unlocked.
        (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), (((arg) + (offset)) >> 1), "storing")] = 2;
        checkInt16(2);
        return 0;
      }

     case 13:
     case 14:
      // Pretend that the locking is successful. These are process-level locks,
      // and Emscripten programs are a single process. If we supported linking a
      // filesystem between programs, we'd need to do more here.
      // See https://github.com/emscripten-core/emscripten/issues/23697
      return 0;
    }
    return -28;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_fstat64(fd, buf) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(11, 0, 1, fd, buf);
  try {
    return SYSCALLS.writeStat(buf, FS.fstat(fd));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_ftruncate64(fd, length) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(12, 0, 1, fd, length);
  length = bigintToI53Checked(length);
  try {
    if (isNaN(length)) return -61;
    FS.ftruncate(fd, length);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
  assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
  return stringToUTF8Array(str, (growMemViews(), HEAPU8), outPtr, maxBytesToWrite);
};

function ___syscall_getcwd(buf, size) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(13, 0, 1, buf, size);
  try {
    if (size === 0) return -28;
    var cwd = FS.cwd();
    var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
    if (size < cwdLengthInBytes) return -68;
    stringToUTF8(cwd, buf, size);
    return cwdLengthInBytes;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_getdents64(fd, dirp, count) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(14, 0, 1, fd, dirp, count);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    stream.getdents ||= FS.readdir(stream.path);
    var struct_size = 280;
    var pos = 0;
    var off = FS.llseek(stream, 0, 1);
    var startIdx = Math.floor(off / struct_size);
    var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / struct_size));
    for (var idx = startIdx; idx < endIdx; idx++) {
      var id;
      var type;
      var name = stream.getdents[idx];
      if (name === ".") {
        id = stream.node.id;
        type = 4;
      } else if (name === "..") {
        var lookup = FS.lookupPath(stream.path, {
          parent: true
        });
        id = lookup.node.id;
        type = 4;
      } else {
        var child;
        try {
          child = FS.lookupNode(stream.node, name);
        } catch (e) {
          // If the entry is not a directory, file, or symlink, nodefs
          // lookupNode will raise EINVAL. Skip these and continue.
          if (e?.errno === 28) {
            continue;
          }
          throw e;
        }
        id = child.id;
        type = FS.isChrdev(child.mode) ? 2 : // DT_CHR, character device.
        FS.isDir(child.mode) ? 4 : // DT_DIR, directory.
        FS.isLink(child.mode) ? 10 : // DT_LNK, symbolic link.
        8;
      }
      assert(id);
      (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), ((dirp + pos) >> 3), "storing")] = BigInt(id);
      checkInt64(id);
      (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((dirp + pos) + (8)) >> 3), "storing")] = BigInt((idx + 1) * struct_size);
      checkInt64((idx + 1) * struct_size);
      (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), (((dirp + pos) + (16)) >> 1), "storing")] = 280;
      checkInt16(280);
      (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (dirp + pos) + (18), "storing")] = type;
      checkInt8(type);
      stringToUTF8(name, dirp + pos + 19, 256);
      pos += struct_size;
    }
    FS.llseek(stream, idx * struct_size, 0);
    return pos;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

/** @param {number=} addrlen */ var writeSockaddr = (sa, family, addr, port, addrlen) => {
  switch (family) {
   case 2:
    addr = inetPton4(addr);
    zeroMemory(sa, 16);
    if (addrlen) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((addrlen) >> 2), "storing")] = 16;
      checkInt32(16);
    }
    (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), ((sa) >> 1), "storing")] = family;
    checkInt16(family);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (4)) >> 2), "storing")] = addr;
    checkInt32(addr);
    (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), (((sa) + (2)) >> 1), "storing")] = _htons(port);
    checkInt16(_htons(port));
    break;

   case 10:
    addr = inetPton6(addr);
    zeroMemory(sa, 28);
    if (addrlen) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((addrlen) >> 2), "storing")] = 28;
      checkInt32(28);
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((sa) >> 2), "storing")] = family;
    checkInt32(family);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (8)) >> 2), "storing")] = addr[0];
    checkInt32(addr[0]);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (12)) >> 2), "storing")] = addr[1];
    checkInt32(addr[1]);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (16)) >> 2), "storing")] = addr[2];
    checkInt32(addr[2]);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((sa) + (20)) >> 2), "storing")] = addr[3];
    checkInt32(addr[3]);
    (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), (((sa) + (2)) >> 1), "storing")] = _htons(port);
    checkInt16(_htons(port));
    break;

   default:
    return 5;
  }
  return 0;
};

function ___syscall_getsockname(fd, addr, addrlen, d1, d2, d3) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(15, 0, 1, fd, addr, addrlen, d1, d2, d3);
  try {
    var sock = getSocketFromFD(fd);
    // TODO: sock.saddr should never be undefined, see TODO in websocket_sock_ops.getname
    var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport, addrlen);
    assert(!errno);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_getsockopt(fd, level, optname, optval, optlen, d1) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(16, 0, 1, fd, level, optname, optval, optlen, d1);
  try {
    var sock = getSocketFromFD(fd);
    // Minimal getsockopt aimed at resolving https://github.com/emscripten-core/emscripten/issues/2211
    // so only supports SOL_SOCKET with SO_ERROR.
    if (level === 1) {
      if (optname === 4) {
        (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((optval) >> 2), "storing")] = sock.error;
        checkInt32(sock.error);
        (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((optlen) >> 2), "storing")] = 4;
        checkInt32(4);
        sock.error = null;
        // Clear the error (The SO_ERROR option obtains and then clears this field).
        return 0;
      }
    }
    return -50;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_ioctl(fd, op, varargs) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(17, 0, 1, fd, op, varargs);
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    switch (op) {
     case 21509:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     case 21505:
      {
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tcgets) {
          var termios = stream.tty.ops.ioctl_tcgets(stream);
          var argp = syscallGetVarargP();
          (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((argp) >> 2), "storing")] = termios.c_iflag || 0;
          checkInt32(termios.c_iflag || 0);
          (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((argp) + (4)) >> 2), "storing")] = termios.c_oflag || 0;
          checkInt32(termios.c_oflag || 0);
          (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((argp) + (8)) >> 2), "storing")] = termios.c_cflag || 0;
          checkInt32(termios.c_cflag || 0);
          (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((argp) + (12)) >> 2), "storing")] = termios.c_lflag || 0;
          checkInt32(termios.c_lflag || 0);
          for (var i = 0; i < 32; i++) {
            (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (argp + i) + (17), "storing")] = termios.c_cc[i] || 0;
            checkInt8(termios.c_cc[i] || 0);
          }
          return 0;
        }
        return 0;
      }

     case 21510:
     case 21511:
     case 21512:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     case 21506:
     case 21507:
     case 21508:
      {
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tcsets) {
          var argp = syscallGetVarargP();
          var c_iflag = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((argp) >> 2), "loading")];
          var c_oflag = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((argp) + (4)) >> 2), "loading")];
          var c_cflag = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((argp) + (8)) >> 2), "loading")];
          var c_lflag = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((argp) + (12)) >> 2), "loading")];
          var c_cc = [];
          for (var i = 0; i < 32; i++) {
            c_cc.push((growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (argp + i) + (17), "loading")]);
          }
          return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
            c_iflag,
            c_oflag,
            c_cflag,
            c_lflag,
            c_cc
          });
        }
        return 0;
      }

     case 21519:
      {
        if (!stream.tty) return -59;
        var argp = syscallGetVarargP();
        (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((argp) >> 2), "storing")] = 0;
        checkInt32(0);
        return 0;
      }

     case 21520:
      {
        if (!stream.tty) return -59;
        return -28;
      }

     case 21537:
     case 21531:
      {
        var argp = syscallGetVarargP();
        return FS.ioctl(stream, op, argp);
      }

     case 21523:
      {
        // TODO: in theory we should write to the winsize struct that gets
        // passed in, but for now musl doesn't read anything on it
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tiocgwinsz) {
          var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
          var argp = syscallGetVarargP();
          (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), ((argp) >> 1), "storing")] = winsize[0];
          checkInt16(winsize[0]);
          (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), (((argp) + (2)) >> 1), "storing")] = winsize[1];
          checkInt16(winsize[1]);
        }
        return 0;
      }

     case 21524:
      {
        // TODO: technically, this ioctl call should change the window size.
        // but, since emscripten doesn't have any concept of a terminal window
        // yet, we'll just silently throw it away as we do TIOCGWINSZ
        if (!stream.tty) return -59;
        return 0;
      }

     case 21515:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     default:
      return -28;
    }
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_lstat64(path, buf) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(18, 0, 1, path, buf);
  try {
    path = SYSCALLS.getStr(path);
    return SYSCALLS.writeStat(buf, FS.lstat(path));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_mkdirat(dirfd, path, mode) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(19, 0, 1, dirfd, path, mode);
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    FS.mkdir(path, mode, 0);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_mknodat(dirfd, path, mode, dev) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(20, 0, 1, dirfd, path, mode, dev);
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    // we don't want this in the JS API as it uses mknod to create all nodes.
    switch (mode & 61440) {
     case 32768:
     case 8192:
     case 24576:
     case 4096:
     case 49152:
      break;

     default:
      return -28;
    }
    FS.mknod(path, mode, dev);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_newfstatat(dirfd, path, buf, flags) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(21, 0, 1, dirfd, path, buf, flags);
  try {
    path = SYSCALLS.getStr(path);
    var nofollow = flags & 256;
    var allowEmpty = flags & 4096;
    flags = flags & (~6400);
    assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
    path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
    return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_openat(dirfd, path, flags, varargs) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(22, 0, 1, dirfd, path, flags, varargs);
  SYSCALLS.varargs = varargs;
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    var mode = varargs ? syscallGetVarargI() : 0;
    return FS.open(path, flags, mode).fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

var PIPEFS = {
  BUCKET_BUFFER_SIZE: 8192,
  mount(mount) {
    // Do not pollute the real root directory or its child nodes with pipes
    // Looks like it is OK to create another pseudo-root node not linked to the FS.root hierarchy this way
    return FS.createNode(null, "/", 16384 | 511, 0);
  },
  createPipe() {
    var pipe = {
      buckets: [],
      // refcnt 2 because pipe has a read end and a write end. We need to be
      // able to read from the read end after write end is closed.
      refcnt: 2,
      timestamp: new Date
    };
    pipe.buckets.push({
      buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
      offset: 0,
      roffset: 0
    });
    var rName = PIPEFS.nextname();
    var wName = PIPEFS.nextname();
    var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
    var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
    rNode.pipe = pipe;
    wNode.pipe = pipe;
    var readableStream = FS.createStream({
      path: rName,
      node: rNode,
      flags: 0,
      seekable: false,
      stream_ops: PIPEFS.stream_ops
    });
    rNode.stream = readableStream;
    var writableStream = FS.createStream({
      path: wName,
      node: wNode,
      flags: 1,
      seekable: false,
      stream_ops: PIPEFS.stream_ops
    });
    wNode.stream = writableStream;
    return {
      readable_fd: readableStream.fd,
      writable_fd: writableStream.fd
    };
  },
  stream_ops: {
    getattr(stream) {
      var node = stream.node;
      var timestamp = node.pipe.timestamp;
      return {
        dev: 14,
        ino: node.id,
        mode: 4480,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: 0,
        size: 0,
        atime: timestamp,
        mtime: timestamp,
        ctime: timestamp,
        blksize: 4096,
        blocks: 0
      };
    },
    poll(stream) {
      var pipe = stream.node.pipe;
      if ((stream.flags & 2097155) === 1) {
        return (256 | 4);
      }
      for (var bucket of pipe.buckets) {
        if (bucket.offset - bucket.roffset > 0) {
          return (64 | 1);
        }
      }
      return 0;
    },
    dup(stream) {
      stream.node.pipe.refcnt++;
    },
    ioctl(stream, request, varargs) {
      return 28;
    },
    fsync(stream) {
      return 28;
    },
    read(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      var currentLength = 0;
      for (var bucket of pipe.buckets) {
        currentLength += bucket.offset - bucket.roffset;
      }
      assert(buffer instanceof ArrayBuffer || buffer instanceof SharedArrayBuffer || ArrayBuffer.isView(buffer));
      var data = buffer.subarray(offset, offset + length);
      if (length <= 0) {
        return 0;
      }
      if (currentLength == 0) {
        // Behave as if the read end is always non-blocking
        throw new FS.ErrnoError(6);
      }
      var toRead = Math.min(currentLength, length);
      var totalRead = toRead;
      var toRemove = 0;
      for (var bucket of pipe.buckets) {
        var bucketSize = bucket.offset - bucket.roffset;
        if (toRead <= bucketSize) {
          var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
          if (toRead < bucketSize) {
            tmpSlice = tmpSlice.subarray(0, toRead);
            bucket.roffset += toRead;
          } else {
            toRemove++;
          }
          data.set(tmpSlice);
          break;
        } else {
          var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
          data.set(tmpSlice);
          data = data.subarray(tmpSlice.byteLength);
          toRead -= tmpSlice.byteLength;
          toRemove++;
        }
      }
      if (toRemove && toRemove == pipe.buckets.length) {
        // Do not generate excessive garbage in use cases such as
        // write several bytes, read everything, write several bytes, read everything...
        toRemove--;
        pipe.buckets[toRemove].offset = 0;
        pipe.buckets[toRemove].roffset = 0;
      }
      pipe.buckets.splice(0, toRemove);
      return totalRead;
    },
    write(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      assert(buffer instanceof ArrayBuffer || buffer instanceof SharedArrayBuffer || ArrayBuffer.isView(buffer));
      var data = buffer.subarray(offset, offset + length);
      var dataLen = data.byteLength;
      if (dataLen <= 0) {
        return 0;
      }
      var currBucket = null;
      if (pipe.buckets.length == 0) {
        currBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: 0,
          roffset: 0
        };
        pipe.buckets.push(currBucket);
      } else {
        currBucket = pipe.buckets[pipe.buckets.length - 1];
      }
      assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
      var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
      if (freeBytesInCurrBuffer >= dataLen) {
        currBucket.buffer.set(data, currBucket.offset);
        currBucket.offset += dataLen;
        return dataLen;
      } else if (freeBytesInCurrBuffer > 0) {
        currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
        currBucket.offset += freeBytesInCurrBuffer;
        data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
      }
      var numBuckets = (data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE) | 0;
      var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
      for (var i = 0; i < numBuckets; i++) {
        var newBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: PIPEFS.BUCKET_BUFFER_SIZE,
          roffset: 0
        };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
        data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength);
      }
      if (remElements > 0) {
        var newBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: data.byteLength,
          roffset: 0
        };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data);
      }
      return dataLen;
    },
    close(stream) {
      var pipe = stream.node.pipe;
      pipe.refcnt--;
      if (pipe.refcnt === 0) {
        pipe.buckets = null;
      }
    }
  },
  nextname() {
    if (!PIPEFS.nextname.current) {
      PIPEFS.nextname.current = 0;
    }
    return "pipe[" + (PIPEFS.nextname.current++) + "]";
  }
};

function ___syscall_pipe(fdPtr) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(23, 0, 1, fdPtr);
  try {
    if (fdPtr == 0) {
      throw new FS.ErrnoError(21);
    }
    var res = PIPEFS.createPipe();
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((fdPtr) >> 2), "storing")] = res.readable_fd;
    checkInt32(res.readable_fd);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((fdPtr) + (4)) >> 2), "storing")] = res.writable_fd;
    checkInt32(res.writable_fd);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(24, 0, 1, dirfd, path, buf, bufsize);
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (bufsize <= 0) return -28;
    var ret = FS.readlink(path);
    var len = Math.min(bufsize, lengthBytesUTF8(ret));
    var endChar = (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), buf + len, "loading")];
    stringToUTF8(ret, buf, bufsize + 1);
    // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
    // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), buf + len, "storing")] = endChar;
    return len;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_recvfrom(fd, buf, len, flags, addr, addrlen) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(25, 0, 1, fd, buf, len, flags, addr, addrlen);
  try {
    var sock = getSocketFromFD(fd);
    var msg = sock.sock_ops.recvmsg(sock, len);
    if (!msg) return 0;
    // socket is closed
    if (addr) {
      var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port, addrlen);
      assert(!errno);
    }
    (growMemViews(), HEAPU8).set(msg.buffer, buf);
    return msg.buffer.byteLength;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(26, 0, 1, olddirfd, oldpath, newdirfd, newpath);
  try {
    oldpath = SYSCALLS.getStr(oldpath);
    newpath = SYSCALLS.getStr(newpath);
    oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
    newpath = SYSCALLS.calculateAt(newdirfd, newpath);
    FS.rename(oldpath, newpath);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_rmdir(path) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(27, 0, 1, path);
  try {
    path = SYSCALLS.getStr(path);
    FS.rmdir(path);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_sendto(fd, message, length, flags, addr, addr_len) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(28, 0, 1, fd, message, length, flags, addr, addr_len);
  try {
    var sock = getSocketFromFD(fd);
    if (!addr) {
      // send, no address provided
      return FS.write(sock.stream, (growMemViews(), HEAP8), message, length);
    }
    var dest = getSocketAddress(addr, addr_len);
    // sendto an address
    return sock.sock_ops.sendmsg(sock, (growMemViews(), HEAP8), message, length, dest.addr, dest.port);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_socket(domain, type, protocol) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(29, 0, 1, domain, type, protocol);
  try {
    var sock = SOCKFS.createSocket(domain, type, protocol);
    assert(sock.stream.fd < 64);
    // XXX ? select() assumes socket fd values are in 0..63
    return sock.stream.fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_stat64(path, buf) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(30, 0, 1, path, buf);
  try {
    path = SYSCALLS.getStr(path);
    return SYSCALLS.writeStat(buf, FS.stat(path));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_unlinkat(dirfd, path, flags) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(31, 0, 1, dirfd, path, flags);
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (!flags) {
      FS.unlink(path);
    } else if (flags === 512) {
      FS.rmdir(path);
    } else {
      return -28;
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

var readI53FromI64 = ptr => (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
HEAPU32), ((ptr) >> 2), "loading")] + (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
HEAP32), (((ptr) + (4)) >> 2), "loading")] * 4294967296;

function ___syscall_utimensat(dirfd, path, times, flags) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(32, 0, 1, dirfd, path, times, flags);
  try {
    path = SYSCALLS.getStr(path);
    assert(!flags);
    path = SYSCALLS.calculateAt(dirfd, path, true);
    var now = Date.now(), atime, mtime;
    if (!times) {
      atime = now;
      mtime = now;
    } else {
      var seconds = readI53FromI64(times);
      var nanoseconds = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((times) + (8)) >> 2), "loading")];
      if (nanoseconds == 1073741823) {
        atime = now;
      } else if (nanoseconds == 1073741822) {
        atime = null;
      } else {
        atime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
      }
      times += 16;
      seconds = readI53FromI64(times);
      nanoseconds = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((times) + (8)) >> 2), "loading")];
      if (nanoseconds == 1073741823) {
        mtime = now;
      } else if (nanoseconds == 1073741822) {
        mtime = null;
      } else {
        mtime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
      }
    }
    // null here means UTIME_OMIT was passed. If both were set to UTIME_OMIT then
    // we can skip the call completely.
    if ((mtime ?? atime) !== null) {
      FS.utime(path, atime, mtime);
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

var __abort_js = () => abort("native code called abort()");

var __emscripten_init_main_thread_js = tb => {
  // Pass the thread address to the native code where they stored in wasm
  // globals which act as a form of TLS. Global constructors trying
  // to access this value will read the wrong value, but that is UB anyway.
  __emscripten_thread_init(tb, /*is_main=*/ !ENVIRONMENT_IS_WORKER, /*is_runtime=*/ 1, /*can_block=*/ !ENVIRONMENT_IS_WEB, /*default_stacksize=*/ 1048576, /*start_profiling=*/ false);
  PThread.threadInitTLS();
};

var handleException = e => {
  // Certain exception types we do not treat as errors since they are used for
  // internal control flow.
  // 1. ExitStatus, which is thrown by exit()
  // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
  //    that wish to return to JS event loop.
  if (e instanceof ExitStatus || e == "unwind") {
    return EXITSTATUS;
  }
  checkStackCookie();
  if (e instanceof WebAssembly.RuntimeError) {
    if (_emscripten_stack_get_current() <= 0) {
      err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 1048576)");
    }
  }
  quit_(1, e);
};

var maybeExit = () => {
  if (runtimeExited) {
    return;
  }
  if (!keepRuntimeAlive()) {
    try {
      if (ENVIRONMENT_IS_PTHREAD) {
        // exit the current thread, but only if there is one active.
        // TODO(https://github.com/emscripten-core/emscripten/issues/25076):
        // Unify this check with the runtimeExited check above
        if (_pthread_self()) __emscripten_thread_exit(EXITSTATUS);
        return;
      }
      _exit(EXITSTATUS);
    } catch (e) {
      handleException(e);
    }
  }
};

var callUserCallback = func => {
  if (runtimeExited || ABORT) {
    err("user callback triggered after runtime exited or application aborted.  Ignoring.");
    return;
  }
  try {
    func();
    maybeExit();
  } catch (e) {
    handleException(e);
  }
};

var waitAsyncPolyfilled = (!Atomics.waitAsync || (globalThis.navigator?.userAgent && Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) || [])[2]) < 91));

var __emscripten_thread_mailbox_await = pthread_ptr => {
  if (!waitAsyncPolyfilled) {
    // Wait on the pthread's initial self-pointer field because it is easy and
    // safe to access from sending threads that need to notify the waiting
    // thread.
    // TODO: How to make this work with wasm64?
    var wait = Atomics.waitAsync((growMemViews(), HEAP32), ((pthread_ptr) >> 2), pthread_ptr);
    assert(wait.async);
    wait.value.then(checkMailbox);
    var waitingAsync = pthread_ptr + 128;
    Atomics.store((growMemViews(), HEAP32), ((waitingAsync) >> 2), 1);
  }
};

var checkMailbox = () => callUserCallback(() => {
  // Only check the mailbox if we have a live pthread runtime. We implement
  // pthread_self to return 0 if there is no live runtime.
  // TODO(https://github.com/emscripten-core/emscripten/issues/25076):
  // Is this check still needed?  `callUserCallback` is supposed to
  // ensure the runtime is alive, and if `_pthread_self` is NULL then the
  // runtime certainly is *not* alive, so this should be a redundant check.
  var pthread_ptr = _pthread_self();
  if (pthread_ptr) {
    // If we are using Atomics.waitAsync as our notification mechanism, wait
    // for a notification before processing the mailbox to avoid missing any
    // work that could otherwise arrive after we've finished processing the
    // mailbox and before we're ready for the next notification.
    __emscripten_thread_mailbox_await(pthread_ptr);
    __emscripten_check_mailbox();
  }
});

var __emscripten_notify_mailbox_postmessage = (targetThread, currThreadId) => {
  if (targetThread == currThreadId) {
    setTimeout(checkMailbox);
  } else if (ENVIRONMENT_IS_PTHREAD) {
    postMessage({
      targetThread,
      cmd: "checkMailbox"
    });
  } else {
    var worker = PThread.pthreads[targetThread];
    if (!worker) {
      err(`Cannot send message to thread with ID ${targetThread}, unknown thread ID!`);
      return;
    }
    worker.postMessage({
      cmd: "checkMailbox"
    });
  }
};

var proxiedJSCallArgs = [];

var __emscripten_receive_on_main_thread_js = (funcIndex, emAsmAddr, callingThread, numCallArgs, args) => {
  // Sometimes we need to backproxy events to the calling thread (e.g.
  // HTML5 DOM events handlers such as
  // emscripten_set_mousemove_callback()), so keep track in a globally
  // accessible variable about the thread that initiated the proxying.
  numCallArgs /= 2;
  proxiedJSCallArgs.length = numCallArgs;
  var b = ((args) >> 3);
  for (var i = 0; i < numCallArgs; i++) {
    if ((growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), b + 2 * i, "loading")]) {
      // It's a BigInt.
      proxiedJSCallArgs[i] = (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), 
      HEAP64), b + 2 * i + 1, "loading")];
    } else {
      // It's a Number.
      proxiedJSCallArgs[i] = (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), 
      HEAPF64), b + 2 * i + 1, "loading")];
    }
  }
  // Proxied JS library funcs use funcIndex and EM_ASM functions use emAsmAddr
  var func = emAsmAddr ? ASM_CONSTS[emAsmAddr] : proxiedFunctionTable[funcIndex];
  assert(!(funcIndex && emAsmAddr));
  assert(func.length == numCallArgs, "Call args mismatch in _emscripten_receive_on_main_thread_js");
  PThread.currentProxiedOperationCallerThread = callingThread;
  var rtn = func(...proxiedJSCallArgs);
  PThread.currentProxiedOperationCallerThread = 0;
  // Proxied functions can return any type except bigint.  All other types
  // cooerce to f64/double (the return type of this function in C) but not
  // bigint.
  assert(typeof rtn != "bigint");
  return rtn;
};

var __emscripten_runtime_keepalive_clear = () => {
  noExitRuntime = false;
  runtimeKeepaliveCounter = 0;
};

var __emscripten_system = command => {
  if (ENVIRONMENT_IS_NODE) {
    if (!command) return 1;
    // shell is available
    var cmdstr = UTF8ToString(command);
    if (!cmdstr.length) return 0;
    // this is what glibc seems to do (shell works test?)
    var cp = require("child_process");
    var ret = cp.spawnSync(cmdstr, [], {
      shell: true,
      stdio: "inherit"
    });
    var _W_EXITCODE = (ret, sig) => ((ret) << 8 | (sig));
    // this really only can happen if process is killed by signal
    if (ret.status === null) {
      // sadly node doesn't expose such function
      var signalToNumber = sig => {
        // implement only the most common ones, and fallback to SIGINT
        switch (sig) {
         case "SIGHUP":
          return 1;

         case "SIGQUIT":
          return 3;

         case "SIGFPE":
          return 8;

         case "SIGKILL":
          return 9;

         case "SIGALRM":
          return 14;

         case "SIGTERM":
          return 15;

         default:
          return 2;
        }
      };
      return _W_EXITCODE(0, signalToNumber(ret.signal));
    }
    return _W_EXITCODE(ret.status, 0);
  }
  // int system(const char *command);
  // http://pubs.opengroup.org/onlinepubs/000095399/functions/system.html
  // Can't call external programs.
  if (!command) return 0;
  // no shell available
  return -52;
};

var __emscripten_thread_cleanup = thread => {
  // Called when a thread needs to be cleaned up so it can be reused.
  // A thread is considered reusable when it either returns from its
  // entry point, calls pthread_exit, or acts upon a cancellation.
  // Detached threads are responsible for calling this themselves,
  // otherwise pthread_join is responsible for calling this.
  if (!ENVIRONMENT_IS_PTHREAD) cleanupThread(thread); else postMessage({
    cmd: "cleanupThread",
    thread
  });
};

var __emscripten_thread_set_strongref = thread => {
  // Called when a thread needs to be strongly referenced.
  // Currently only used for:
  // - keeping the "main" thread alive in PROXY_TO_PTHREAD mode;
  // - crashed threads that needs to propagate the uncaught exception
  //   back to the main thread.
  if (ENVIRONMENT_IS_NODE) {
    PThread.pthreads[thread].ref();
  }
};

var __emscripten_throw_longjmp = () => {
  throw Infinity;
};

function __gmtime_js(time, tmPtr) {
  time = bigintToI53Checked(time);
  var date = new Date(time * 1e3);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((tmPtr) >> 2), "storing")] = date.getUTCSeconds();
  checkInt32(date.getUTCSeconds());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (4)) >> 2), "storing")] = date.getUTCMinutes();
  checkInt32(date.getUTCMinutes());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (8)) >> 2), "storing")] = date.getUTCHours();
  checkInt32(date.getUTCHours());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (12)) >> 2), "storing")] = date.getUTCDate();
  checkInt32(date.getUTCDate());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (16)) >> 2), "storing")] = date.getUTCMonth();
  checkInt32(date.getUTCMonth());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (20)) >> 2), "storing")] = date.getUTCFullYear() - 1900;
  checkInt32(date.getUTCFullYear() - 1900);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (24)) >> 2), "storing")] = date.getUTCDay();
  checkInt32(date.getUTCDay());
  var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (28)) >> 2), "storing")] = yday;
  checkInt32(yday);
}

var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

var MONTH_DAYS_LEAP_CUMULATIVE = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

var MONTH_DAYS_REGULAR_CUMULATIVE = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];

var ydayFromDate = date => {
  var leap = isLeapYear(date.getFullYear());
  var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
  var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
  // -1 since it's days since Jan 1
  return yday;
};

function __localtime_js(time, tmPtr) {
  time = bigintToI53Checked(time);
  var date = new Date(time * 1e3);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((tmPtr) >> 2), "storing")] = date.getSeconds();
  checkInt32(date.getSeconds());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (4)) >> 2), "storing")] = date.getMinutes();
  checkInt32(date.getMinutes());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (8)) >> 2), "storing")] = date.getHours();
  checkInt32(date.getHours());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (12)) >> 2), "storing")] = date.getDate();
  checkInt32(date.getDate());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (16)) >> 2), "storing")] = date.getMonth();
  checkInt32(date.getMonth());
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (20)) >> 2), "storing")] = date.getFullYear() - 1900;
  checkInt32(date.getFullYear() - 1900);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (24)) >> 2), "storing")] = date.getDay();
  checkInt32(date.getDay());
  var yday = ydayFromDate(date) | 0;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (28)) >> 2), "storing")] = yday;
  checkInt32(yday);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (36)) >> 2), "storing")] = -(date.getTimezoneOffset() * 60);
  checkInt32(-(date.getTimezoneOffset() * 60));
  // Attention: DST is in December in South, and some regions don't have DST at all.
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (32)) >> 2), "storing")] = dst;
  checkInt32(dst);
}

var __mktime_js = function(tmPtr) {
  var ret = (() => {
    var date = new Date((growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (20)) >> 2), "loading")] + 1900, (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (16)) >> 2), "loading")], (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (12)) >> 2), "loading")], (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (8)) >> 2), "loading")], (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (4)) >> 2), "loading")], (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((tmPtr) >> 2), "loading")], 0);
    // There's an ambiguous hour when the time goes back; the tm_isdst field is
    // used to disambiguate it.  Date() basically guesses, so we fix it up if it
    // guessed wrong, or fill in tm_isdst with the guess if it's -1.
    var dst = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (32)) >> 2), "loading")];
    var guessedOffset = date.getTimezoneOffset();
    var start = new Date(date.getFullYear(), 0, 1);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dstOffset = Math.min(winterOffset, summerOffset);
    // DST is in December in South
    if (dst < 0) {
      // Attention: some regions don't have DST at all.
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (32)) >> 2), "storing")] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
      checkInt32(Number(summerOffset != winterOffset && dstOffset == guessedOffset));
    } else if ((dst > 0) != (dstOffset == guessedOffset)) {
      var nonDstOffset = Math.max(winterOffset, summerOffset);
      var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
      // Don't try setMinutes(date.getMinutes() + ...) -- it's messed up.
      date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (24)) >> 2), "storing")] = date.getDay();
    checkInt32(date.getDay());
    var yday = ydayFromDate(date) | 0;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (28)) >> 2), "storing")] = yday;
    checkInt32(yday);
    // To match expected behavior, update fields from date
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((tmPtr) >> 2), "storing")] = date.getSeconds();
    checkInt32(date.getSeconds());
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (4)) >> 2), "storing")] = date.getMinutes();
    checkInt32(date.getMinutes());
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (8)) >> 2), "storing")] = date.getHours();
    checkInt32(date.getHours());
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (12)) >> 2), "storing")] = date.getDate();
    checkInt32(date.getDate());
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (16)) >> 2), "storing")] = date.getMonth();
    checkInt32(date.getMonth());
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((tmPtr) + (20)) >> 2), "storing")] = date.getYear();
    checkInt32(date.getYear());
    var timeMs = date.getTime();
    if (isNaN(timeMs)) {
      return -1;
    }
    // Return time in microseconds
    return timeMs / 1e3;
  })();
  return BigInt(ret);
};

function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(33, 0, 1, len, prot, flags, fd, offset, allocated, addr);
  offset = bigintToI53Checked(offset);
  try {
    // musl's mmap doesn't allow values over a certain limit
    // see OFF_MASK in mmap.c.
    assert(!isNaN(offset));
    var stream = SYSCALLS.getStreamFromFD(fd);
    var res = FS.mmap(stream, len, offset, prot, flags);
    var ptr = res.ptr;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((allocated) >> 2), "storing")] = res.allocated;
    checkInt32(res.allocated);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((addr) >> 2), "storing")] = ptr;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function __munmap_js(addr, len, prot, flags, fd, offset) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(34, 0, 1, addr, len, prot, flags, fd, offset);
  offset = bigintToI53Checked(offset);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    if (prot & 2) {
      SYSCALLS.doMsync(addr, stream, len, flags, offset);
    }
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

var __tzset_js = (timezone, daylight, std_name, dst_name) => {
  // TODO: Use (malleable) environment variables instead of system settings.
  var currentYear = (new Date).getFullYear();
  var winter = new Date(currentYear, 0, 1);
  var summer = new Date(currentYear, 6, 1);
  var winterOffset = winter.getTimezoneOffset();
  var summerOffset = summer.getTimezoneOffset();
  // Local standard timezone offset. Local standard time is not adjusted for
  // daylight savings.  This code uses the fact that getTimezoneOffset returns
  // a greater value during Standard Time versus Daylight Saving Time (DST).
  // Thus it determines the expected output during Standard Time, and it
  // compares whether the output of the given date the same (Standard) or less
  // (DST).
  var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  // timezone is specified as seconds west of UTC ("The external variable
  // `timezone` shall be set to the difference, in seconds, between
  // Coordinated Universal Time (UTC) and local standard time."), the same
  // as returned by stdTimezoneOffset.
  // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((timezone) >> 2), "storing")] = stdTimezoneOffset * 60;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((daylight) >> 2), "storing")] = Number(winterOffset != summerOffset);
  checkInt32(Number(winterOffset != summerOffset));
  var extractZone = timezoneOffset => {
    // Why inverse sign?
    // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
    var sign = timezoneOffset >= 0 ? "-" : "+";
    var absOffset = Math.abs(timezoneOffset);
    var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
    var minutes = String(absOffset % 60).padStart(2, "0");
    return `UTC${sign}${hours}${minutes}`;
  };
  var winterName = extractZone(winterOffset);
  var summerName = extractZone(summerOffset);
  assert(winterName);
  assert(summerName);
  assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
  assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
  if (summerOffset < winterOffset) {
    // Northern hemisphere
    stringToUTF8(winterName, std_name, 17);
    stringToUTF8(summerName, dst_name, 17);
  } else {
    stringToUTF8(winterName, dst_name, 17);
    stringToUTF8(summerName, std_name, 17);
  }
};

var _emscripten_get_now = () => performance.timeOrigin + performance.now();

var _emscripten_date_now = () => Date.now();

var nowIsMonotonic = 1;

var checkWasiClock = clock_id => clock_id >= 0 && clock_id <= 3;

function _clock_time_get(clk_id, ignored_precision, ptime) {
  ignored_precision = bigintToI53Checked(ignored_precision);
  if (!checkWasiClock(clk_id)) {
    return 28;
  }
  var now;
  // all wasi clocks but realtime are monotonic
  if (clk_id === 0) {
    now = _emscripten_date_now();
  } else if (nowIsMonotonic) {
    now = _emscripten_get_now();
  } else {
    return 52;
  }
  // "now" is in ms, and wasi times are in ns.
  var nsec = Math.round(now * 1e3 * 1e3);
  (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), ((ptime) >> 3), "storing")] = BigInt(nsec);
  checkInt64(nsec);
  return 0;
}

function getFullscreenElement() {
  return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.webkitCurrentFullScreenElement || document.msFullscreenElement;
}

var runtimeKeepalivePush = () => {
  runtimeKeepaliveCounter += 1;
};

var runtimeKeepalivePop = () => {
  assert(runtimeKeepaliveCounter > 0);
  runtimeKeepaliveCounter -= 1;
};

/** @param {number=} timeout */ var safeSetTimeout = (func, timeout) => {
  runtimeKeepalivePush();
  return setTimeout(() => {
    runtimeKeepalivePop();
    callUserCallback(func);
  }, timeout);
};

var Browser = {
  useWebGL: false,
  isFullscreen: false,
  pointerLock: false,
  moduleContextCreatedCallbacks: [],
  workers: [],
  preloadedImages: {},
  preloadedAudios: {},
  getCanvas: () => Module["canvas"],
  init() {
    if (Browser.initted) return;
    Browser.initted = true;
    // Support for plugins that can process preloaded files. You can add more of these to
    // your app by creating and appending to preloadPlugins.
    // Each plugin is asked if it can handle a file based on the file's name. If it can,
    // it is given the file's raw data. When it is done, it calls a callback with the file's
    // (possibly modified) data. For example, a plugin might decompress a file, or it
    // might create some side data structure for use later (like an Image element, etc.).
    var imagePlugin = {};
    imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
      return !Module["noImageDecoding"] && /\.(jpg|jpeg|png|bmp|webp)$/i.test(name);
    };
    imagePlugin["handle"] = async function imagePlugin_handle(byteArray, name) {
      var b = new Blob([ byteArray ], {
        type: Browser.getMimetype(name)
      });
      if (b.size !== byteArray.length) {
        // Safari bug #118630
        // Safari's Blob can only take an ArrayBuffer
        b = new Blob([ (new Uint8Array(byteArray)).buffer ], {
          type: Browser.getMimetype(name)
        });
      }
      var url = URL.createObjectURL(b);
      return new Promise((resolve, reject) => {
        var img = new Image;
        img.onload = () => {
          assert(img.complete, `Image ${name} could not be decoded`);
          var canvas = /** @type {!HTMLCanvasElement} */ (document.createElement("canvas"));
          canvas.width = img.width;
          canvas.height = img.height;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          Browser.preloadedImages[name] = canvas;
          URL.revokeObjectURL(url);
          resolve(byteArray);
        };
        img.onerror = event => {
          err(`Image ${url} could not be decoded`);
          reject();
        };
        img.src = url;
      });
    };
    preloadPlugins.push(imagePlugin);
    var audioPlugin = {};
    audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
      return !Module["noAudioDecoding"] && name.slice(-4) in {
        ".ogg": 1,
        ".wav": 1,
        ".mp3": 1
      };
    };
    audioPlugin["handle"] = async function audioPlugin_handle(byteArray, name) {
      return new Promise((resolve, reject) => {
        var done = false;
        function finish(audio) {
          if (done) return;
          done = true;
          Browser.preloadedAudios[name] = audio;
          resolve(byteArray);
        }
        var b = new Blob([ byteArray ], {
          type: Browser.getMimetype(name)
        });
        var url = URL.createObjectURL(b);
        // XXX we never revoke this!
        var audio = new Audio;
        audio.addEventListener("canplaythrough", () => finish(audio), false);
        // use addEventListener due to chromium bug 124926
        audio.onerror = function audio_onerror(event) {
          if (done) return;
          err(`warning: browser could not fully decode audio ${name}, trying slower base64 approach`);
          function encode64(data) {
            var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var PAD = "=";
            var ret = "";
            var leftchar = 0;
            var leftbits = 0;
            for (var i = 0; i < data.length; i++) {
              leftchar = (leftchar << 8) | data[i];
              leftbits += 8;
              while (leftbits >= 6) {
                var curr = (leftchar >> (leftbits - 6)) & 63;
                leftbits -= 6;
                ret += BASE[curr];
              }
            }
            if (leftbits == 2) {
              ret += BASE[(leftchar & 3) << 4];
              ret += PAD + PAD;
            } else if (leftbits == 4) {
              ret += BASE[(leftchar & 15) << 2];
              ret += PAD;
            }
            return ret;
          }
          audio.src = "data:audio/x-" + name.slice(-3) + ";base64," + encode64(byteArray);
          finish(audio);
        };
        audio.src = url;
        // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
        safeSetTimeout(() => {
          finish(audio);
        }, 1e4);
      });
    };
    preloadPlugins.push(audioPlugin);
    // Canvas event setup
    function pointerLockChange() {
      var canvas = Browser.getCanvas();
      Browser.pointerLock = document.pointerLockElement === canvas;
    }
    var canvas = Browser.getCanvas();
    if (canvas) {
      // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
      // Module['forcedAspectRatio'] = 4 / 3;
      document.addEventListener("pointerlockchange", pointerLockChange, false);
      if (Module["elementPointerLock"]) {
        canvas.addEventListener("click", ev => {
          if (!Browser.pointerLock && Browser.getCanvas().requestPointerLock) {
            Browser.getCanvas().requestPointerLock();
            ev.preventDefault();
          }
        }, false);
      }
    }
  },
  createContext(/** @type {HTMLCanvasElement} */ canvas, useWebGL, setInModule, webGLContextAttributes) {
    if (useWebGL && Module["ctx"] && canvas == Browser.getCanvas()) return Module["ctx"];
    // no need to recreate GL context if it's already been created for this canvas.
    var ctx;
    var contextHandle;
    if (useWebGL) {
      // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
      var contextAttributes = {
        antialias: false,
        alpha: false,
        majorVersion: (typeof WebGL2RenderingContext != "undefined") ? 2 : 1
      };
      if (webGLContextAttributes) {
        for (var attribute in webGLContextAttributes) {
          contextAttributes[attribute] = webGLContextAttributes[attribute];
        }
      }
      // This check of existence of GL is here to satisfy Closure compiler, which yells if variable GL is referenced below but GL object is not
      // actually compiled in because application is not doing any GL operations. TODO: Ideally if GL is not being used, this function
      // Browser.createContext() should not even be emitted.
      if (typeof GL != "undefined") {
        contextHandle = GL.createContext(canvas, contextAttributes);
        if (contextHandle) {
          ctx = GL.getContext(contextHandle).GLctx;
        }
      }
    } else {
      ctx = canvas.getContext("2d");
    }
    if (!ctx) return null;
    if (setInModule) {
      if (!useWebGL) assert(typeof GLctx == "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
      Module["ctx"] = ctx;
      if (useWebGL) GL.makeContextCurrent(contextHandle);
      Browser.useWebGL = useWebGL;
      Browser.moduleContextCreatedCallbacks.forEach(callback => callback());
      Browser.init();
    }
    return ctx;
  },
  fullscreenHandlersInstalled: false,
  lockPointer: undefined,
  resizeCanvas: undefined,
  requestFullscreen(lockPointer, resizeCanvas) {
    Browser.lockPointer = lockPointer;
    Browser.resizeCanvas = resizeCanvas;
    if (typeof Browser.lockPointer == "undefined") Browser.lockPointer = true;
    if (typeof Browser.resizeCanvas == "undefined") Browser.resizeCanvas = false;
    var canvas = Browser.getCanvas();
    function fullscreenChange() {
      Browser.isFullscreen = false;
      var canvasContainer = canvas.parentNode;
      if (getFullscreenElement() === canvasContainer) {
        canvas.exitFullscreen = Browser.exitFullscreen;
        if (Browser.lockPointer) canvas.requestPointerLock();
        Browser.isFullscreen = true;
        if (Browser.resizeCanvas) {
          Browser.setFullscreenCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      } else {
        // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
        canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
        canvasContainer.parentNode.removeChild(canvasContainer);
        if (Browser.resizeCanvas) {
          Browser.setWindowedCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      }
      Module["onFullScreen"]?.(Browser.isFullscreen);
      Module["onFullscreen"]?.(Browser.isFullscreen);
    }
    if (!Browser.fullscreenHandlersInstalled) {
      Browser.fullscreenHandlersInstalled = true;
      document.addEventListener("fullscreenchange", fullscreenChange, false);
      document.addEventListener("mozfullscreenchange", fullscreenChange, false);
      document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
      document.addEventListener("MSFullscreenChange", fullscreenChange, false);
    }
    // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
    var canvasContainer = document.createElement("div");
    canvas.parentNode.insertBefore(canvasContainer, canvas);
    canvasContainer.appendChild(canvas);
    // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
    canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? () => canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null) || (canvasContainer["webkitRequestFullScreen"] ? () => canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null);
    canvasContainer.requestFullscreen();
  },
  requestFullScreen() {
    abort("Module.requestFullScreen has been replaced by Module.requestFullscreen (without a capital S)");
  },
  exitFullscreen() {
    // This is workaround for chrome. Trying to exit from fullscreen
    // not in fullscreen state will cause "TypeError: Document not active"
    // in chrome. See https://github.com/emscripten-core/emscripten/pull/8236
    if (!Browser.isFullscreen) {
      return false;
    }
    var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || (() => {});
    CFS.apply(document, []);
    return true;
  },
  safeSetTimeout(func, timeout) {
    // Legacy function, this is used by the SDL2 port so we need to keep it
    // around at least until that is updated.
    // See https://github.com/libsdl-org/SDL/pull/6304
    return safeSetTimeout(func, timeout);
  },
  getMimetype(name) {
    return {
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "bmp": "image/bmp",
      "ogg": "audio/ogg",
      "wav": "audio/wav",
      "mp3": "audio/mpeg"
    }[name.slice(name.lastIndexOf(".") + 1)];
  },
  getUserMedia(func) {
    window.getUserMedia ||= navigator["getUserMedia"] || navigator["mozGetUserMedia"];
    window.getUserMedia(func);
  },
  getMovementX(event) {
    return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
  },
  getMovementY(event) {
    return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
  },
  getMouseWheelDelta(event) {
    var delta = 0;
    switch (event.type) {
     case "DOMMouseScroll":
      // 3 lines make up a step
      delta = event.detail / 3;
      break;

     case "mousewheel":
      // 120 units make up a step
      delta = event.wheelDelta / 120;
      break;

     case "wheel":
      delta = event.deltaY;
      switch (event.deltaMode) {
       case 0:
        // DOM_DELTA_PIXEL: 100 pixels make up a step
        delta /= 100;
        break;

       case 1:
        // DOM_DELTA_LINE: 3 lines make up a step
        delta /= 3;
        break;

       case 2:
        // DOM_DELTA_PAGE: A page makes up 80 steps
        delta *= 80;
        break;

       default:
        abort("unrecognized mouse wheel delta mode: " + event.deltaMode);
      }
      break;

     default:
      abort("unrecognized mouse wheel event: " + event.type);
    }
    return delta;
  },
  mouseX: 0,
  mouseY: 0,
  mouseMovementX: 0,
  mouseMovementY: 0,
  touches: {},
  lastTouches: {},
  calculateMouseCoords(pageX, pageY) {
    // Calculate the movement based on the changes
    // in the coordinates.
    var canvas = Browser.getCanvas();
    var rect = canvas.getBoundingClientRect();
    // Neither .scrollX or .pageXOffset are defined in a spec, but
    // we prefer .scrollX because it is currently in a spec draft.
    // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
    var scrollX = ((typeof window.scrollX != "undefined") ? window.scrollX : window.pageXOffset);
    var scrollY = ((typeof window.scrollY != "undefined") ? window.scrollY : window.pageYOffset);
    // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
    // and we have no viable fallback.
    assert((typeof scrollX != "undefined") && (typeof scrollY != "undefined"), "Unable to retrieve scroll position, mouse positions likely broken.");
    var adjustedX = pageX - (scrollX + rect.left);
    var adjustedY = pageY - (scrollY + rect.top);
    // the canvas might be CSS-scaled compared to its backbuffer;
    // SDL-using content will want mouse coordinates in terms
    // of backbuffer units.
    adjustedX = adjustedX * (canvas.width / rect.width);
    adjustedY = adjustedY * (canvas.height / rect.height);
    return {
      x: adjustedX,
      y: adjustedY
    };
  },
  setMouseCoords(pageX, pageY) {
    const {x, y} = Browser.calculateMouseCoords(pageX, pageY);
    Browser.mouseMovementX = x - Browser.mouseX;
    Browser.mouseMovementY = y - Browser.mouseY;
    Browser.mouseX = x;
    Browser.mouseY = y;
  },
  calculateMouseEvent(event) {
    // event should be mousemove, mousedown or mouseup
    if (Browser.pointerLock) {
      // When the pointer is locked, calculate the coordinates
      // based on the movement of the mouse.
      // Workaround for Firefox bug 764498
      if (event.type != "mousemove" && ("mozMovementX" in event)) {
        Browser.mouseMovementX = Browser.mouseMovementY = 0;
      } else {
        Browser.mouseMovementX = Browser.getMovementX(event);
        Browser.mouseMovementY = Browser.getMovementY(event);
      }
      // add the mouse delta to the current absolute mouse position
      Browser.mouseX += Browser.mouseMovementX;
      Browser.mouseY += Browser.mouseMovementY;
    } else {
      if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
        var touch = event.touch;
        if (touch === undefined) {
          return;
        }
        var coords = Browser.calculateMouseCoords(touch.pageX, touch.pageY);
        if (event.type === "touchstart") {
          Browser.lastTouches[touch.identifier] = coords;
          Browser.touches[touch.identifier] = coords;
        } else if (event.type === "touchend" || event.type === "touchmove") {
          var last = Browser.touches[touch.identifier];
          last ||= coords;
          Browser.lastTouches[touch.identifier] = last;
          Browser.touches[touch.identifier] = coords;
        }
        return;
      }
      Browser.setMouseCoords(event.pageX, event.pageY);
    }
  },
  resizeListeners: [],
  updateResizeListeners() {
    var canvas = Browser.getCanvas();
    Browser.resizeListeners.forEach(listener => listener(canvas.width, canvas.height));
  },
  setCanvasSize(width, height, noUpdates) {
    var canvas = Browser.getCanvas();
    Browser.updateCanvasDimensions(canvas, width, height);
    if (!noUpdates) Browser.updateResizeListeners();
  },
  windowedWidth: 0,
  windowedHeight: 0,
  setFullscreenCanvasSize() {
    // check if SDL is available
    if (typeof SDL != "undefined") {
      var flags = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((SDL.screen) >> 2), "loading")];
      flags = flags | 8388608;
      // set SDL_FULLSCREEN flag
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((SDL.screen) >> 2), "storing")] = flags;
      checkInt32(flags);
    }
    Browser.updateCanvasDimensions(Browser.getCanvas());
    Browser.updateResizeListeners();
  },
  setWindowedCanvasSize() {
    // check if SDL is available
    if (typeof SDL != "undefined") {
      var flags = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((SDL.screen) >> 2), "loading")];
      flags = flags & ~8388608;
      // clear SDL_FULLSCREEN flag
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((SDL.screen) >> 2), "storing")] = flags;
      checkInt32(flags);
    }
    Browser.updateCanvasDimensions(Browser.getCanvas());
    Browser.updateResizeListeners();
  },
  updateCanvasDimensions(canvas, wNative, hNative) {
    if (wNative && hNative) {
      canvas.widthNative = wNative;
      canvas.heightNative = hNative;
    } else {
      wNative = canvas.widthNative;
      hNative = canvas.heightNative;
    }
    var w = wNative;
    var h = hNative;
    if (Module["forcedAspectRatio"] > 0) {
      if (w / h < Module["forcedAspectRatio"]) {
        w = Math.round(h * Module["forcedAspectRatio"]);
      } else {
        h = Math.round(w / Module["forcedAspectRatio"]);
      }
    }
    if ((getFullscreenElement() === canvas.parentNode) && (typeof screen != "undefined")) {
      var factor = Math.min(screen.width / w, screen.height / h);
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }
    if (Browser.resizeCanvas) {
      if (canvas.width != w) canvas.width = w;
      if (canvas.height != h) canvas.height = h;
      if (typeof canvas.style != "undefined") {
        canvas.style.removeProperty("width");
        canvas.style.removeProperty("height");
      }
    } else {
      if (canvas.width != wNative) canvas.width = wNative;
      if (canvas.height != hNative) canvas.height = hNative;
      if (typeof canvas.style != "undefined") {
        if (w != wNative || h != hNative) {
          canvas.style.setProperty("width", w + "px", "important");
          canvas.style.setProperty("height", h + "px", "important");
        } else {
          canvas.style.removeProperty("width");
          canvas.style.removeProperty("height");
        }
      }
    }
  }
};

var EGL = {
  errorCode: 12288,
  defaultDisplayInitialized: false,
  currentContext: 0,
  currentReadSurface: 0,
  currentDrawSurface: 0,
  contextAttributes: {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false
  },
  stringCache: {},
  setErrorCode(code) {
    EGL.errorCode = code;
  },
  chooseConfig(display, attribList, config, config_size, numConfigs) {
    if (display != 62e3) {
      EGL.setErrorCode(12296);
      return 0;
    }
    if (attribList) {
      // read attribList if it is non-null
      for (;;) {
        var param = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((attribList) >> 2), "loading")];
        if (param == 12321) {
          var alphaSize = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((attribList) + (4)) >> 2), "loading")];
          EGL.contextAttributes.alpha = (alphaSize > 0);
        } else if (param == 12325) {
          var depthSize = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((attribList) + (4)) >> 2), "loading")];
          EGL.contextAttributes.depth = (depthSize > 0);
        } else if (param == 12326) {
          var stencilSize = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((attribList) + (4)) >> 2), "loading")];
          EGL.contextAttributes.stencil = (stencilSize > 0);
        } else if (param == 12337) {
          var samples = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((attribList) + (4)) >> 2), "loading")];
          EGL.contextAttributes.antialias = (samples > 0);
        } else if (param == 12338) {
          var samples = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((attribList) + (4)) >> 2), "loading")];
          EGL.contextAttributes.antialias = (samples == 1);
        } else if (param == 12544) {
          var requestedPriority = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
          HEAP32), (((attribList) + (4)) >> 2), "loading")];
          EGL.contextAttributes.lowLatency = (requestedPriority != 12547);
        } else if (param == 12344) {
          break;
        }
        attribList += 8;
      }
    }
    if ((!config || !config_size) && !numConfigs) {
      EGL.setErrorCode(12300);
      return 0;
    }
    if (numConfigs) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((numConfigs) >> 2), "storing")] = 1;
      checkInt32(1);
    }
    if (config && config_size > 0) {
      (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((config) >> 2), "storing")] = 62002;
    }
    EGL.setErrorCode(12288);
    return 1;
  }
};

function _eglBindAPI(api) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(35, 0, 1, api);
  if (api == 12448) {
    EGL.setErrorCode(12288);
    return 1;
  }
  // if (api == 0x30A1 /* EGL_OPENVG_API */ || api == 0x30A2 /* EGL_OPENGL_API */) {
  EGL.setErrorCode(12300);
  return 0;
}

function _eglChooseConfig(display, attrib_list, configs, config_size, numConfigs) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(36, 0, 1, display, attrib_list, configs, config_size, numConfigs);
  return EGL.chooseConfig(display, attrib_list, configs, config_size, numConfigs);
}

var GLctx;

var webgl_enable_ANGLE_instanced_arrays = ctx => {
  // Extension available in WebGL 1 from Firefox 26 and Google Chrome 30 onwards. Core feature in WebGL 2.
  var ext = ctx.getExtension("ANGLE_instanced_arrays");
  // Because this extension is a core function in WebGL 2, assign the extension entry points in place of
  // where the core functions will reside in WebGL 2. This way the calling code can call these without
  // having to dynamically branch depending if running against WebGL 1 or WebGL 2.
  if (ext) {
    ctx["vertexAttribDivisor"] = (index, divisor) => ext["vertexAttribDivisorANGLE"](index, divisor);
    ctx["drawArraysInstanced"] = (mode, first, count, primcount) => ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
    ctx["drawElementsInstanced"] = (mode, count, type, indices, primcount) => ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
    return 1;
  }
};

var webgl_enable_OES_vertex_array_object = ctx => {
  // Extension available in WebGL 1 from Firefox 25 and WebKit 536.28/desktop Safari 6.0.3 onwards. Core feature in WebGL 2.
  var ext = ctx.getExtension("OES_vertex_array_object");
  if (ext) {
    ctx["createVertexArray"] = () => ext["createVertexArrayOES"]();
    ctx["deleteVertexArray"] = vao => ext["deleteVertexArrayOES"](vao);
    ctx["bindVertexArray"] = vao => ext["bindVertexArrayOES"](vao);
    ctx["isVertexArray"] = vao => ext["isVertexArrayOES"](vao);
    return 1;
  }
};

var webgl_enable_WEBGL_draw_buffers = ctx => {
  // Extension available in WebGL 1 from Firefox 28 onwards. Core feature in WebGL 2.
  var ext = ctx.getExtension("WEBGL_draw_buffers");
  if (ext) {
    ctx["drawBuffers"] = (n, bufs) => ext["drawBuffersWEBGL"](n, bufs);
    return 1;
  }
};

var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = ctx => // Closure is expected to be allowed to minify the '.dibvbi' property, so not accessing it quoted.
!!(ctx.dibvbi = ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"));

var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = ctx => !!(ctx.mdibvbi = ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"));

var webgl_enable_EXT_polygon_offset_clamp = ctx => !!(ctx.extPolygonOffsetClamp = ctx.getExtension("EXT_polygon_offset_clamp"));

var webgl_enable_EXT_clip_control = ctx => !!(ctx.extClipControl = ctx.getExtension("EXT_clip_control"));

var webgl_enable_WEBGL_polygon_mode = ctx => !!(ctx.webglPolygonMode = ctx.getExtension("WEBGL_polygon_mode"));

var webgl_enable_WEBGL_multi_draw = ctx => // Closure is expected to be allowed to minify the '.multiDrawWebgl' property, so not accessing it quoted.
!!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));

var getEmscriptenSupportedExtensions = ctx => {
  // Restrict the list of advertised extensions to those that we actually
  // support.
  var supportedExtensions = [ // WebGL 1 extensions
  "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_disjoint_timer_query", "EXT_frag_depth", "EXT_shader_texture_lod", "EXT_sRGB", "OES_element_index_uint", "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float", "OES_texture_half_float", "OES_texture_half_float_linear", "OES_vertex_array_object", "WEBGL_color_buffer_float", "WEBGL_depth_texture", "WEBGL_draw_buffers", // WebGL 2 extensions
  "EXT_color_buffer_float", "EXT_conservative_depth", "EXT_disjoint_timer_query_webgl2", "EXT_texture_norm16", "NV_shader_noperspective_interpolation", "WEBGL_clip_cull_distance", // WebGL 1 and WebGL 2 extensions
  "EXT_clip_control", "EXT_color_buffer_half_float", "EXT_depth_clamp", "EXT_float_blend", "EXT_polygon_offset_clamp", "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc", "EXT_texture_filter_anisotropic", "KHR_parallel_shader_compile", "OES_texture_float_linear", "WEBGL_blend_func_extended", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_etc1", "WEBGL_compressed_texture_s3tc", "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders", "WEBGL_lose_context", "WEBGL_multi_draw", "WEBGL_polygon_mode" ];
  // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
  return (ctx.getSupportedExtensions() || []).filter(ext => supportedExtensions.includes(ext));
};

var registerPreMainLoop = f => {
  // Does nothing unless $MainLoop is included/used.
  typeof MainLoop != "undefined" && MainLoop.preMainLoop.push(f);
};

var GL = {
  counter: 1,
  buffers: [],
  mappedBuffers: {},
  programs: [],
  framebuffers: [],
  renderbuffers: [],
  textures: [],
  shaders: [],
  vaos: [],
  contexts: {},
  offscreenCanvases: {},
  queries: [],
  samplers: [],
  transformFeedbacks: [],
  syncs: [],
  byteSizeByTypeRoot: 5120,
  byteSizeByType: [ 1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8 ],
  stringCache: {},
  stringiCache: {},
  unpackAlignment: 4,
  unpackRowLength: 0,
  recordError: errorCode => {
    if (!GL.lastError) {
      GL.lastError = errorCode;
    }
  },
  getNewId: table => {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {
      table[i] = null;
    }
    // Skip over any non-null elements that might have been created by
    // glBindBuffer.
    while (table[ret]) {
      ret = GL.counter++;
    }
    return ret;
  },
  genObject: (n, buffers, createFunction, objectTable, functionName) => {
    for (var i = 0; i < n; i++) {
      var buffer = GLctx[createFunction]();
      var id = buffer && GL.getNewId(objectTable);
      if (buffer) {
        buffer.name = id;
        objectTable[id] = buffer;
      } else {
        GL.recordError(1282);
        err(`GL_INVALID_OPERATION in ${functionName}: GLctx.${createFunction} returned null - most likely GL context is lost!`);
      }
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((buffers) + (i * 4)) >> 2), "storing")] = id;
      checkInt32(id);
    }
  },
  MAX_TEMP_BUFFER_SIZE: 2097152,
  numTempVertexBuffersPerSize: 64,
  log2ceilLookup: i => 32 - Math.clz32(i === 0 ? 0 : i - 1),
  generateTempBuffers: (quads, context) => {
    var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
    context.tempVertexBufferCounters1 = [];
    context.tempVertexBufferCounters2 = [];
    context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex + 1;
    context.tempVertexBuffers1 = [];
    context.tempVertexBuffers2 = [];
    context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex + 1;
    context.tempIndexBuffers = [];
    context.tempIndexBuffers.length = largestIndex + 1;
    for (var i = 0; i <= largestIndex; ++i) {
      context.tempIndexBuffers[i] = null;
      // Created on-demand
      context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
      var ringbufferLength = GL.numTempVertexBuffersPerSize;
      context.tempVertexBuffers1[i] = [];
      context.tempVertexBuffers2[i] = [];
      var ringbuffer1 = context.tempVertexBuffers1[i];
      var ringbuffer2 = context.tempVertexBuffers2[i];
      ringbuffer1.length = ringbuffer2.length = ringbufferLength;
      for (var j = 0; j < ringbufferLength; ++j) {
        ringbuffer1[j] = ringbuffer2[j] = null;
      }
    }
    if (quads) {
      // GL_QUAD indexes can be precalculated
      context.tempQuadIndexBuffer = GLctx.createBuffer();
      context.GLctx.bindBuffer(34963, context.tempQuadIndexBuffer);
      var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
      var quadIndexes = new Uint16Array(numIndexes);
      var i = 0, v = 0;
      while (1) {
        quadIndexes[i++] = v;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 1;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 2;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 2;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 3;
        if (i >= numIndexes) break;
        v += 4;
      }
      context.GLctx.bufferData(34963, quadIndexes, 35044);
      context.GLctx.bindBuffer(34963, null);
    }
  },
  getTempVertexBuffer: sizeBytes => {
    var idx = GL.log2ceilLookup(sizeBytes);
    var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
    var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
    GL.currentContext.tempVertexBufferCounters1[idx] = (GL.currentContext.tempVertexBufferCounters1[idx] + 1) & (GL.numTempVertexBuffersPerSize - 1);
    var vbo = ringbuffer[nextFreeBufferIndex];
    if (vbo) {
      return vbo;
    }
    var prevVBO = GLctx.getParameter(34964);
    ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
    GLctx.bindBuffer(34962, ringbuffer[nextFreeBufferIndex]);
    GLctx.bufferData(34962, 1 << idx, 35048);
    GLctx.bindBuffer(34962, prevVBO);
    return ringbuffer[nextFreeBufferIndex];
  },
  getTempIndexBuffer: sizeBytes => {
    var idx = GL.log2ceilLookup(sizeBytes);
    var ibo = GL.currentContext.tempIndexBuffers[idx];
    if (ibo) {
      return ibo;
    }
    var prevIBO = GLctx.getParameter(34965);
    GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
    GLctx.bindBuffer(34963, GL.currentContext.tempIndexBuffers[idx]);
    GLctx.bufferData(34963, 1 << idx, 35048);
    GLctx.bindBuffer(34963, prevIBO);
    return GL.currentContext.tempIndexBuffers[idx];
  },
  newRenderingFrameStarted: () => {
    if (!GL.currentContext) {
      return;
    }
    var vb = GL.currentContext.tempVertexBuffers1;
    GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
    GL.currentContext.tempVertexBuffers2 = vb;
    vb = GL.currentContext.tempVertexBufferCounters1;
    GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
    GL.currentContext.tempVertexBufferCounters2 = vb;
    var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
    for (var i = 0; i <= largestIndex; ++i) {
      GL.currentContext.tempVertexBufferCounters1[i] = 0;
    }
  },
  getSource: (shader, count, string, length) => {
    var source = "";
    for (var i = 0; i < count; ++i) {
      var len = length ? (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((length) + (i * 4)) >> 2), "loading")] : undefined;
      source += UTF8ToString((growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
      HEAPU32), (((string) + (i * 4)) >> 2), "loading")], len);
    }
    return source;
  },
  calcBufLength: (size, type, stride, count) => {
    if (stride > 0) {
      return count * stride;
    }
    var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
    return size * typeSize * count;
  },
  usedTempBuffers: [],
  preDrawHandleClientVertexAttribBindings: count => {
    GL.resetBufferBinding = false;
    // TODO: initial pass to detect ranges we need to upload, might not need
    // an upload per attrib
    for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
      var cb = GL.currentContext.clientBuffers[i];
      if (!cb.clientside || !cb.enabled) continue;
      GL.resetBufferBinding = true;
      var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
      var buf = GL.getTempVertexBuffer(size);
      GLctx.bindBuffer(34962, buf);
      GLctx.bufferSubData(34962, 0, (growMemViews(), HEAPU8).subarray(cb.ptr, cb.ptr + size));
      GL.validateVertexAttribPointer(cb.size, cb.type, cb.stride, 0);
      cb.vertexAttribPointerAdaptor.call(GLctx, i, cb.size, cb.type, cb.normalized, cb.stride, 0);
    }
  },
  postDrawHandleClientVertexAttribBindings: () => {
    if (GL.resetBufferBinding) {
      GLctx.bindBuffer(34962, GL.buffers[GLctx.currentArrayBufferBinding]);
    }
  },
  validateGLObjectID: (objectHandleArray, objectID, callerFunctionName, objectReadableType) => {
    if (objectID != 0) {
      if (objectHandleArray[objectID] === null) {
        err(`${callerFunctionName} called with an already deleted ${objectReadableType} ID ${objectID}!`);
      } else if (!(objectID in objectHandleArray)) {
        err(`${callerFunctionName} called with a nonexisting ${objectReadableType} ID ${objectID}!`);
      }
    }
  },
  validateVertexAttribPointer: (dimension, dataType, stride, offset) => {
    var sizeBytes = 1;
    switch (dataType) {
     case 5120:
     case 5121:
      sizeBytes = 1;
      break;

     case 5122:
     case 5123:
      sizeBytes = 2;
      break;

     case 5124:
     case 5125:
     case 5126:
      sizeBytes = 4;
      break;

     case 5130:
      sizeBytes = 8;
      break;

     default:
      if (GL.currentContext.version >= 2) {
        if (dataType == 33640 || dataType == 36255) {
          sizeBytes = 4;
          break;
        } else if (dataType == 5131) {
          sizeBytes = 2;
          break;
        } else {}
      }
      err(`Invalid vertex attribute data type GLenum ${dataType} passed to GL function!`);
    }
    if (dimension == 32993) {
      err("WebGL does not support size=GL_BGRA in a call to glVertexAttribPointer! Please use size=4 and type=GL_UNSIGNED_BYTE instead!");
    } else if (dimension < 1 || dimension > 4) {
      err(`Invalid dimension=${dimension} in call to glVertexAttribPointer, must be 1,2,3 or 4.`);
    }
    if (stride < 0 || stride > 255) {
      err(`Invalid stride=${stride} in call to glVertexAttribPointer. Note that maximum supported stride in WebGL is 255!`);
    }
    if (offset % sizeBytes != 0) {
      err(`GL spec section 6.4 error: vertex attribute data offset of ${offset} bytes should have been a multiple of the data type size that was used: GLenum ${dataType} has size of ${sizeBytes} bytes!`);
    }
    if (stride % sizeBytes != 0) {
      err(`GL spec section 6.4 error: vertex attribute data stride of ${stride} bytes should have been a multiple of the data type size that was used: GLenum ${dataType} has size of ${sizeBytes} bytes!`);
    }
  },
  createContext: (/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
    // BUG: Workaround Safari WebGL issue: After successfully acquiring WebGL
    // context on a canvas, calling .getContext() will always return that
    // context independent of which 'webgl' or 'webgl2'
    // context version was passed. See:
    //   https://webkit.org/b/222758
    // and:
    //   https://github.com/emscripten-core/emscripten/issues/13295.
    // TODO: Once the bug is fixed and shipped in Safari, adjust the Safari
    // version field in above check.
    if (!canvas.getContextSafariWebGL2Fixed) {
      canvas.getContextSafariWebGL2Fixed = canvas.getContext;
      /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (Object|null)} */ function fixedGetContext(ver, attrs) {
        var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
        return ((ver == "webgl") == (gl instanceof WebGLRenderingContext)) ? gl : null;
      }
      canvas.getContext = fixedGetContext;
    }
    var ctx = (webGLContextAttributes.majorVersion > 1) ? canvas.getContext("webgl2", webGLContextAttributes) : canvas.getContext("webgl", webGLContextAttributes);
    if (!ctx) return 0;
    var handle = GL.registerContext(ctx, webGLContextAttributes);
    return handle;
  },
  registerContext: (ctx, webGLContextAttributes) => {
    // with pthreads a context is a location in memory with some synchronized
    // data between threads
    var handle = _malloc(8);
    assert(handle, "malloc() failed in GL.registerContext!");
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((handle) + (4)) >> 2), "storing")] = _pthread_self();
    // the thread pointer of the thread that owns the control of the context
    var context = {
      handle,
      attributes: webGLContextAttributes,
      version: webGLContextAttributes.majorVersion,
      GLctx: ctx
    };
    // Store the created context object so that we can access the context
    // given a canvas without having to pass the parameters again.
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (typeof webGLContextAttributes.enableExtensionsByDefault == "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
      GL.initExtensions(context);
    }
    context.maxVertexAttribs = context.GLctx.getParameter(34921);
    context.clientBuffers = [];
    for (var i = 0; i < context.maxVertexAttribs; i++) {
      context.clientBuffers[i] = {
        enabled: false,
        clientside: false,
        size: 0,
        type: 0,
        normalized: 0,
        stride: 0,
        ptr: 0,
        vertexAttribPointerAdaptor: null
      };
    }
    GL.generateTempBuffers(false, context);
    return handle;
  },
  makeContextCurrent: contextHandle => {
    // Active Emscripten GL layer context object.
    GL.currentContext = GL.contexts[contextHandle];
    // Active WebGL context object.
    Module["ctx"] = GLctx = GL.currentContext?.GLctx;
    return !(contextHandle && !GLctx);
  },
  getContext: contextHandle => GL.contexts[contextHandle],
  deleteContext: contextHandle => {
    if (GL.currentContext === GL.contexts[contextHandle]) {
      GL.currentContext = null;
    }
    if (typeof JSEvents == "object") {
      // Release all JS event handlers on the DOM element that the GL context is
      // associated with since the context is now deleted.
      JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
    }
    // Make sure the canvas object no longer refers to the context object so
    // there are no GC surprises.
    if (GL.contexts[contextHandle]?.GLctx.canvas) {
      GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
    }
    _free(GL.contexts[contextHandle].handle);
    GL.contexts[contextHandle] = null;
  },
  initExtensions: context => {
    // If this function is called without a specific context object, init the
    // extensions of the currently active context.
    context ||= GL.currentContext;
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx = context.GLctx;
    // Detect the presence of a few extensions manually, ction GL interop
    // layer itself will need to know if they exist.
    // Extensions that are available in both WebGL 1 and WebGL 2
    webgl_enable_WEBGL_multi_draw(GLctx);
    webgl_enable_EXT_polygon_offset_clamp(GLctx);
    webgl_enable_EXT_clip_control(GLctx);
    webgl_enable_WEBGL_polygon_mode(GLctx);
    // Extensions that are only available in WebGL 1 (the calls will be no-ops
    // if called on a WebGL 2 context active)
    webgl_enable_ANGLE_instanced_arrays(GLctx);
    webgl_enable_OES_vertex_array_object(GLctx);
    webgl_enable_WEBGL_draw_buffers(GLctx);
    // Extensions that are available from WebGL >= 2 (no-op if called on a WebGL 1 context active)
    webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
    webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
    // On WebGL 2, EXT_disjoint_timer_query is replaced with an alternative
    // that's based on core APIs, and exposes only the queryCounterEXT()
    // entrypoint.
    if (context.version >= 2) {
      GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query_webgl2");
    }
    // However, Firefox exposes the WebGL 1 version on WebGL 2 as well and
    // thus we look for the WebGL 1 version again if the WebGL 2 version
    // isn't present. https://bugzil.la/1328882
    if (context.version < 2 || !GLctx.disjointTimerQueryExt) {
      GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
    }
    for (var ext of getEmscriptenSupportedExtensions(GLctx)) {
      // WEBGL_lose_context, WEBGL_debug_renderer_info and WEBGL_debug_shaders
      // are not enabled by default.
      if (!ext.includes("lose_context") && !ext.includes("debug")) {
        // Call .getExtension() to enable that extension permanently.
        GLctx.getExtension(ext);
      }
    }
  }
};

function _eglCreateContext(display, config, hmm, contextAttribs) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(37, 0, 1, display, config, hmm, contextAttribs);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  // EGL 1.4 spec says default EGL_CONTEXT_CLIENT_VERSION is GLES1, but this is not supported by Emscripten.
  // So user must pass EGL_CONTEXT_CLIENT_VERSION == 2 to initialize EGL.
  var glesContextVersion = 1;
  for (;;) {
    var param = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((contextAttribs) >> 2), "loading")];
    if (param == 12440) {
      glesContextVersion = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((contextAttribs) + (4)) >> 2), "loading")];
    } else if (param == 12344) {
      break;
    } else {
      /* EGL1.4 specifies only EGL_CONTEXT_CLIENT_VERSION as supported attribute */ EGL.setErrorCode(12292);
      return 0;
    }
    contextAttribs += 8;
  }
  if (glesContextVersion < 2 || glesContextVersion > 3) {
    if (glesContextVersion == 3) {
      err("When initializing GLES3/WebGL2 via EGL, one must build with -sMAX_WEBGL_VERSION=2!");
    } else {
      err(`When initializing GLES2/WebGL1 via EGL, one must pass EGL_CONTEXT_CLIENT_VERSION = 2 to GL context attributes! GLES version ${glesContextVersion} is not supported!`);
    }
    EGL.setErrorCode(12293);
    return 0;
  }
  EGL.contextAttributes.majorVersion = glesContextVersion - 1;
  // WebGL 1 is GLES 2, WebGL2 is GLES3
  EGL.contextAttributes.minorVersion = 0;
  EGL.context = GL.createContext(Browser.getCanvas(), EGL.contextAttributes);
  if (EGL.context != 0) {
    EGL.setErrorCode(12288);
    // Run callbacks so that GL emulation works
    GL.makeContextCurrent(EGL.context);
    Browser.useWebGL = true;
    Browser.moduleContextCreatedCallbacks.forEach(callback => callback());
    // Note: This function only creates a context, but it shall not make it active.
    GL.makeContextCurrent(null);
    return 62004;
  } else {
    EGL.setErrorCode(12297);
    // By the EGL 1.4 spec, an implementation that does not support GLES2 (WebGL in this case), this error code is set.
    return 0;
  }
}

function _eglCreateWindowSurface(display, config, win, attrib_list) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(38, 0, 1, display, config, win, attrib_list);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  if (config != 62002) {
    EGL.setErrorCode(12293);
    return 0;
  }
  // TODO: Examine attrib_list! Parameters that can be present there are:
  // - EGL_RENDER_BUFFER (must be EGL_BACK_BUFFER)
  // - EGL_VG_COLORSPACE (can't be set)
  // - EGL_VG_ALPHA_FORMAT (can't be set)
  EGL.setErrorCode(12288);
  return 62006;
}

function _eglDestroyContext(display, context) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(39, 0, 1, display, context);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  if (context != 62004) {
    EGL.setErrorCode(12294);
    return 0;
  }
  GL.deleteContext(EGL.context);
  EGL.setErrorCode(12288);
  if (EGL.currentContext == context) {
    EGL.currentContext = 0;
  }
  return 1;
}

function _eglDestroySurface(display, surface) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(40, 0, 1, display, surface);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  if (surface != 62006) {
    EGL.setErrorCode(12301);
    return 1;
  }
  if (EGL.currentReadSurface == surface) {
    EGL.currentReadSurface = 0;
  }
  if (EGL.currentDrawSurface == surface) {
    EGL.currentDrawSurface = 0;
  }
  EGL.setErrorCode(12288);
  return 1;
}

function _eglGetConfigAttrib(display, config, attribute, value) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(41, 0, 1, display, config, attribute, value);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  if (config != 62002) {
    EGL.setErrorCode(12293);
    return 0;
  }
  if (!value) {
    EGL.setErrorCode(12300);
    return 0;
  }
  EGL.setErrorCode(12288);
  switch (attribute) {
   case 12320:
    // EGL_BUFFER_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = EGL.contextAttributes.alpha ? 32 : 24;
    checkInt32(EGL.contextAttributes.alpha ? 32 : 24);
    return 1;

   case 12321:
    // EGL_ALPHA_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = EGL.contextAttributes.alpha ? 8 : 0;
    checkInt32(EGL.contextAttributes.alpha ? 8 : 0);
    return 1;

   case 12322:
    // EGL_BLUE_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 8;
    checkInt32(8);
    return 1;

   case 12323:
    // EGL_GREEN_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 8;
    checkInt32(8);
    return 1;

   case 12324:
    // EGL_RED_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 8;
    checkInt32(8);
    return 1;

   case 12325:
    // EGL_DEPTH_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = EGL.contextAttributes.depth ? 24 : 0;
    checkInt32(EGL.contextAttributes.depth ? 24 : 0);
    return 1;

   case 12326:
    // EGL_STENCIL_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = EGL.contextAttributes.stencil ? 8 : 0;
    checkInt32(EGL.contextAttributes.stencil ? 8 : 0);
    return 1;

   case 12327:
    // EGL_CONFIG_CAVEAT
    // We can return here one of EGL_NONE (0x3038), EGL_SLOW_CONFIG (0x3050) or EGL_NON_CONFORMANT_CONFIG (0x3051).
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 12344;
    checkInt32(12344);
    return 1;

   case 12328:
    // EGL_CONFIG_ID
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 62002;
    checkInt32(62002);
    return 1;

   case 12329:
    // EGL_LEVEL
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 0;
    checkInt32(0);
    return 1;

   case 12330:
    // EGL_MAX_PBUFFER_HEIGHT
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 4096;
    checkInt32(4096);
    return 1;

   case 12331:
    // EGL_MAX_PBUFFER_PIXELS
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 16777216;
    checkInt32(16777216);
    return 1;

   case 12332:
    // EGL_MAX_PBUFFER_WIDTH
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 4096;
    checkInt32(4096);
    return 1;

   case 12333:
    // EGL_NATIVE_RENDERABLE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 0;
    checkInt32(0);
    return 1;

   case 12334:
    // EGL_NATIVE_VISUAL_ID
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 0;
    checkInt32(0);
    return 1;

   case 12335:
    // EGL_NATIVE_VISUAL_TYPE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 12344;
    checkInt32(12344);
    return 1;

   case 12337:
    // EGL_SAMPLES
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = EGL.contextAttributes.antialias ? 4 : 0;
    checkInt32(EGL.contextAttributes.antialias ? 4 : 0);
    return 1;

   case 12338:
    // EGL_SAMPLE_BUFFERS
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = EGL.contextAttributes.antialias ? 1 : 0;
    checkInt32(EGL.contextAttributes.antialias ? 1 : 0);
    return 1;

   case 12339:
    // EGL_SURFACE_TYPE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 4;
    checkInt32(4);
    return 1;

   case 12340:
    // EGL_TRANSPARENT_TYPE
    // If this returns EGL_TRANSPARENT_RGB (0x3052), transparency is used through color-keying. No such thing applies to Emscripten canvas.
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 12344;
    checkInt32(12344);
    return 1;

   case 12341:
   // EGL_TRANSPARENT_BLUE_VALUE
    case 12342:
   // EGL_TRANSPARENT_GREEN_VALUE
    case 12343:
    // EGL_TRANSPARENT_RED_VALUE
    // "If EGL_TRANSPARENT_TYPE is EGL_NONE, then the values for EGL_TRANSPARENT_RED_VALUE, EGL_TRANSPARENT_GREEN_VALUE, and EGL_TRANSPARENT_BLUE_VALUE are undefined."
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = -1;
    checkInt32(-1);
    return 1;

   case 12345:
   // EGL_BIND_TO_TEXTURE_RGB
    case 12346:
    // EGL_BIND_TO_TEXTURE_RGBA
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 0;
    checkInt32(0);
    return 1;

   case 12347:
    // EGL_MIN_SWAP_INTERVAL
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 0;
    checkInt32(0);
    return 1;

   case 12348:
    // EGL_MAX_SWAP_INTERVAL
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 1;
    checkInt32(1);
    return 1;

   case 12349:
   // EGL_LUMINANCE_SIZE
    case 12350:
    // EGL_ALPHA_MASK_SIZE
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 0;
    checkInt32(0);
    return 1;

   case 12351:
    // EGL_COLOR_BUFFER_TYPE
    // EGL has two types of buffers: EGL_RGB_BUFFER and EGL_LUMINANCE_BUFFER.
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 12430;
    checkInt32(12430);
    return 1;

   case 12352:
    // EGL_RENDERABLE_TYPE
    // A bit combination of EGL_OPENGL_ES_BIT,EGL_OPENVG_BIT,EGL_OPENGL_ES2_BIT and EGL_OPENGL_BIT.
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 4;
    checkInt32(4);
    return 1;

   case 12354:
    // EGL_CONFORMANT
    // "EGL_CONFORMANT is a mask indicating if a client API context created with respect to the corresponding EGLConfig will pass the required conformance tests for that API."
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((value) >> 2), "storing")] = 0;
    checkInt32(0);
    return 1;

   default:
    EGL.setErrorCode(12292);
    return 0;
  }
}

function _eglGetDisplay(nativeDisplayType) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(42, 0, 1, nativeDisplayType);
  EGL.setErrorCode(12288);
  // Emscripten EGL implementation "emulates" X11, and eglGetDisplay is
  // expected to accept/receive a pointer to an X11 Display object (or
  // EGL_DEFAULT_DISPLAY).
  if (nativeDisplayType != 0 && nativeDisplayType != 1) {
    return 0;
  }
  return 62e3;
}

function _eglGetError() {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(43, 0, 1);
  return EGL.errorCode;
}

function _eglInitialize(display, majorVersion, minorVersion) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(44, 0, 1, display, majorVersion, minorVersion);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  if (majorVersion) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((majorVersion) >> 2), "storing")] = 1;
    checkInt32(1);
  }
  if (minorVersion) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((minorVersion) >> 2), "storing")] = 4;
    checkInt32(4);
  }
  EGL.defaultDisplayInitialized = true;
  EGL.setErrorCode(12288);
  return 1;
}

function _eglMakeCurrent(display, draw, read, context) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(45, 0, 1, display, draw, read, context);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  //\todo An EGL_NOT_INITIALIZED error is generated if EGL is not initialized for dpy.
  if (context != 0 && context != 62004) {
    EGL.setErrorCode(12294);
    return 0;
  }
  if ((read != 0 && read != 62006) || (draw != 0 && draw != 62006)) {
    EGL.setErrorCode(12301);
    return 0;
  }
  GL.makeContextCurrent(context ? EGL.context : null);
  EGL.currentContext = context;
  EGL.currentDrawSurface = draw;
  EGL.currentReadSurface = read;
  EGL.setErrorCode(12288);
  return 1;
}

var stringToNewUTF8 = str => {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8(str, ret, size);
  return ret;
};

function _eglQueryString(display, name) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(46, 0, 1, display, name);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  //\todo An EGL_NOT_INITIALIZED error is generated if EGL is not initialized for dpy.
  EGL.setErrorCode(12288);
  if (EGL.stringCache[name]) return EGL.stringCache[name];
  var ret;
  switch (name) {
   case 12371:
    ret = stringToNewUTF8("Emscripten");
    break;

   case 12372:
    ret = stringToNewUTF8("1.4 Emscripten EGL");
    break;

   case 12373:
    ret = stringToNewUTF8("");
    break;

   // Currently not supporting any EGL extensions.
    case 12429:
    ret = stringToNewUTF8("OpenGL_ES");
    break;

   default:
    EGL.setErrorCode(12300);
    return 0;
  }
  EGL.stringCache[name] = ret;
  return ret;
}

function _eglSwapBuffers(dpy, surface) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(47, 0, 1, dpy, surface);
  if (!EGL.defaultDisplayInitialized) {
    EGL.setErrorCode(12289);
  } else if (!GLctx) {
    EGL.setErrorCode(12290);
  } else if (GLctx.isContextLost()) {
    EGL.setErrorCode(12302);
  } else {
    // According to documentation this does an implicit flush.
    // Due to discussion at https://github.com/emscripten-core/emscripten/pull/1871
    // the flush was removed since this _may_ result in slowing code down.
    //_glFlush();
    EGL.setErrorCode(12288);
    return 1;
  }
  return 0;
}

/**
     * @param {number=} arg
     * @param {boolean=} noSetTiming
     */ var setMainLoop = (iterFunc, fps, simulateInfiniteLoop, arg, noSetTiming) => {
  assert(!MainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
  MainLoop.func = iterFunc;
  MainLoop.arg = arg;
  var thisMainLoopId = MainLoop.currentlyRunningMainloop;
  function checkIsRunning() {
    if (thisMainLoopId < MainLoop.currentlyRunningMainloop) {
      runtimeKeepalivePop();
      maybeExit();
      return false;
    }
    return true;
  }
  // We create the loop runner here but it is not actually running until
  // _emscripten_set_main_loop_timing is called (which might happen a
  // later time).  This member signifies that the current runner has not
  // yet been started so that we can call runtimeKeepalivePush when it
  // gets it timing set for the first time.
  MainLoop.running = false;
  MainLoop.runner = function MainLoop_runner() {
    if (ABORT) return;
    if (MainLoop.queue.length > 0) {
      var start = Date.now();
      var blocker = MainLoop.queue.shift();
      blocker.func(blocker.arg);
      if (MainLoop.remainingBlockers) {
        var remaining = MainLoop.remainingBlockers;
        var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
        if (blocker.counted) {
          MainLoop.remainingBlockers = next;
        } else {
          // not counted, but move the progress along a tiny bit
          next = next + .5;
          // do not steal all the next one's progress
          MainLoop.remainingBlockers = (8 * remaining + next) / 9;
        }
      }
      MainLoop.updateStatus();
      // catches pause/resume main loop from blocker execution
      if (!checkIsRunning()) return;
      setTimeout(MainLoop.runner, 0);
      return;
    }
    // catch pauses from non-main loop sources
    if (!checkIsRunning()) return;
    // Implement very basic swap interval control
    MainLoop.currentFrameNumber = MainLoop.currentFrameNumber + 1 | 0;
    if (MainLoop.timingMode == 1 && MainLoop.timingValue > 1 && MainLoop.currentFrameNumber % MainLoop.timingValue != 0) {
      // Not the scheduled time to render this frame - skip.
      MainLoop.scheduler();
      return;
    } else if (MainLoop.timingMode == 0) {
      MainLoop.tickStartTime = _emscripten_get_now();
    }
    if (MainLoop.method === "timeout" && Module["ctx"]) {
      warnOnce("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
      MainLoop.method = "";
    }
    MainLoop.runIter(iterFunc);
    // catch pauses from the main loop itself
    if (!checkIsRunning()) return;
    MainLoop.scheduler();
  };
  if (!noSetTiming) {
    if (fps > 0) {
      _emscripten_set_main_loop_timing(0, 1e3 / fps);
    } else {
      // Do rAF by rendering each frame (no decimating)
      _emscripten_set_main_loop_timing(1, 1);
    }
    MainLoop.scheduler();
  }
  if (simulateInfiniteLoop) {
    throw "unwind";
  }
};

var MainLoop = {
  running: false,
  scheduler: null,
  method: "",
  currentlyRunningMainloop: 0,
  func: null,
  arg: 0,
  timingMode: 0,
  timingValue: 0,
  currentFrameNumber: 0,
  queue: [],
  preMainLoop: [],
  postMainLoop: [],
  pause() {
    MainLoop.scheduler = null;
    // Incrementing this signals the previous main loop that it's now become old, and it must return.
    MainLoop.currentlyRunningMainloop++;
  },
  resume() {
    MainLoop.currentlyRunningMainloop++;
    var timingMode = MainLoop.timingMode;
    var timingValue = MainLoop.timingValue;
    var func = MainLoop.func;
    MainLoop.func = null;
    // do not set timing and call scheduler, we will do it on the next lines
    setMainLoop(func, 0, false, MainLoop.arg, true);
    _emscripten_set_main_loop_timing(timingMode, timingValue);
    MainLoop.scheduler();
  },
  updateStatus() {
    if (Module["setStatus"]) {
      var message = Module["statusMessage"] || "Please wait...";
      var remaining = MainLoop.remainingBlockers ?? 0;
      var expected = MainLoop.expectedBlockers ?? 0;
      if (remaining) {
        if (remaining < expected) {
          Module["setStatus"](`{message} ({expected - remaining}/{expected})`);
        } else {
          Module["setStatus"](message);
        }
      } else {
        Module["setStatus"]("");
      }
    }
  },
  init() {
    Module["preMainLoop"] && MainLoop.preMainLoop.push(Module["preMainLoop"]);
    Module["postMainLoop"] && MainLoop.postMainLoop.push(Module["postMainLoop"]);
  },
  runIter(func) {
    if (ABORT) return;
    for (var pre of MainLoop.preMainLoop) {
      if (pre() === false) {
        return;
      }
    }
    callUserCallback(func);
    for (var post of MainLoop.postMainLoop) {
      post();
    }
    checkStackCookie();
  },
  nextRAF: 0,
  fakeRequestAnimationFrame(func) {
    // try to keep 60fps between calls to here
    var now = Date.now();
    if (MainLoop.nextRAF === 0) {
      MainLoop.nextRAF = now + 1e3 / 60;
    } else {
      while (now + 2 >= MainLoop.nextRAF) {
        // fudge a little, to avoid timer jitter causing us to do lots of delay:0
        MainLoop.nextRAF += 1e3 / 60;
      }
    }
    var delay = Math.max(MainLoop.nextRAF - now, 0);
    setTimeout(func, delay);
  },
  requestAnimationFrame(func) {
    if (globalThis.requestAnimationFrame) {
      requestAnimationFrame(func);
    } else {
      MainLoop.fakeRequestAnimationFrame(func);
    }
  }
};

var _emscripten_set_main_loop_timing = (mode, value) => {
  MainLoop.timingMode = mode;
  MainLoop.timingValue = value;
  if (!MainLoop.func) {
    err("emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.");
    return 1;
  }
  if (!MainLoop.running) {
    runtimeKeepalivePush();
    MainLoop.running = true;
  }
  if (mode == 0) {
    MainLoop.scheduler = function MainLoop_scheduler_setTimeout() {
      var timeUntilNextTick = Math.max(0, MainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
      setTimeout(MainLoop.runner, timeUntilNextTick);
    };
    MainLoop.method = "timeout";
  } else if (mode == 1) {
    MainLoop.scheduler = function MainLoop_scheduler_rAF() {
      MainLoop.requestAnimationFrame(MainLoop.runner);
    };
    MainLoop.method = "rAF";
  } else if (mode == 2) {
    if (!MainLoop.setImmediate) {
      if (globalThis.setImmediate) {
        MainLoop.setImmediate = setImmediate;
      } else {
        // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
        var setImmediates = [];
        var emscriptenMainLoopMessageId = "setimmediate";
        /** @param {Event} event */ var MainLoop_setImmediate_messageHandler = event => {
          // When called in current thread or Worker, the main loop ID is structured slightly different to accommodate for --proxy-to-worker runtime listening to Worker events,
          // so check for both cases.
          if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
            event.stopPropagation();
            setImmediates.shift()();
          }
        };
        addEventListener("message", MainLoop_setImmediate_messageHandler, true);
        MainLoop.setImmediate = /** @type{function(function(): ?, ...?): number} */ (func => {
          setImmediates.push(func);
          if (ENVIRONMENT_IS_WORKER) {
            Module["setImmediates"] ??= [];
            Module["setImmediates"].push(func);
            postMessage({
              target: emscriptenMainLoopMessageId
            });
          } else postMessage(emscriptenMainLoopMessageId, "*");
        });
      }
    }
    MainLoop.scheduler = function MainLoop_scheduler_setImmediate() {
      MainLoop.setImmediate(MainLoop.runner);
    };
    MainLoop.method = "immediate";
  }
  return 0;
};

function _eglSwapInterval(display, interval) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(48, 0, 1, display, interval);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  if (interval == 0) _emscripten_set_main_loop_timing(0, 0); else _emscripten_set_main_loop_timing(1, interval);
  EGL.setErrorCode(12288);
  return 1;
}

function _eglTerminate(display) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(49, 0, 1, display);
  if (display != 62e3) {
    EGL.setErrorCode(12296);
    return 0;
  }
  EGL.currentContext = 0;
  EGL.currentReadSurface = 0;
  EGL.currentDrawSurface = 0;
  EGL.defaultDisplayInitialized = false;
  EGL.setErrorCode(12288);
  return 1;
}

function _eglWaitClient() {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(50, 0, 1);
  EGL.setErrorCode(12288);
  return 1;
}

var _eglWaitGL = _eglWaitClient;

function _eglWaitNative(nativeEngineId) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(51, 0, 1, nativeEngineId);
  EGL.setErrorCode(12288);
  return 1;
}

var readEmAsmArgsArray = [];

var readEmAsmArgs = (sigPtr, buf) => {
  // Nobody should have mutated _readEmAsmArgsArray underneath us to be something else than an array.
  assert(Array.isArray(readEmAsmArgsArray));
  // The input buffer is allocated on the stack, so it must be stack-aligned.
  assert(buf % 16 == 0);
  readEmAsmArgsArray.length = 0;
  var ch;
  // Most arguments are i32s, so shift the buffer pointer so it is a plain
  // index into HEAP32.
  while (ch = (growMemViews(), HEAPU8)[SAFE_HEAP_INDEX((growMemViews(), HEAPU8), sigPtr++, "loading")]) {
    var chr = String.fromCharCode(ch);
    var validChars = [ "d", "f", "i", "p" ];
    // In WASM_BIGINT mode we support passing i64 values as bigint.
    validChars.push("j");
    assert(validChars.includes(chr), `Invalid character ${ch}("${chr}") in readEmAsmArgs! Use only [${validChars}], and do not specify "v" for void return argument.`);
    // Floats are always passed as doubles, so all types except for 'i'
    // are 8 bytes and require alignment.
    var wide = (ch != 105);
    wide &= (ch != 112);
    buf += wide && (buf % 8) ? 4 : 0;
    readEmAsmArgsArray.push(// Special case for pointers under wasm64 or CAN_ADDRESS_2GB mode.
    ch == 112 ? (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((buf) >> 2), "loading")] : ch == 106 ? (growMemViews(), 
    HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), ((buf) >> 3), "loading")] : ch == 105 ? (growMemViews(), 
    HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((buf) >> 2), "loading")] : (growMemViews(), 
    HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((buf) >> 3), "loading")]);
    buf += wide ? 8 : 4;
  }
  return readEmAsmArgsArray;
};

var runEmAsmFunction = (code, sigPtr, argbuf) => {
  var args = readEmAsmArgs(sigPtr, argbuf);
  assert(ASM_CONSTS.hasOwnProperty(code), `No EM_ASM constant found at address ${code}.  The loaded WebAssembly file is likely out of sync with the generated JavaScript.`);
  return ASM_CONSTS[code](...args);
};

var _emscripten_asm_const_int = (code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf);

var runMainThreadEmAsm = (emAsmAddr, sigPtr, argbuf, sync) => {
  var args = readEmAsmArgs(sigPtr, argbuf);
  if (ENVIRONMENT_IS_PTHREAD) {
    // EM_ASM functions are variadic, receiving the actual arguments as a buffer
    // in memory. the last parameter (argBuf) points to that data. We need to
    // always un-variadify that, *before proxying*, as in the async case this
    // is a stack allocation that LLVM made, which may go away before the main
    // thread gets the message. For that reason we handle proxying *after* the
    // call to readEmAsmArgs, and therefore we do that manually here instead
    // of using __proxy. (And dor simplicity, do the same in the sync
    // case as well, even though it's not strictly necessary, to keep the two
    // code paths as similar as possible on both sides.)
    return proxyToMainThread(0, emAsmAddr, sync, ...args);
  }
  assert(ASM_CONSTS.hasOwnProperty(emAsmAddr), `No EM_ASM constant found at address ${emAsmAddr}.  The loaded WebAssembly file is likely out of sync with the generated JavaScript.`);
  return ASM_CONSTS[emAsmAddr](...args);
};

var _emscripten_asm_const_int_sync_on_main_thread = (emAsmAddr, sigPtr, argbuf) => runMainThreadEmAsm(emAsmAddr, sigPtr, argbuf, 1);

var _emscripten_asm_const_ptr_sync_on_main_thread = (emAsmAddr, sigPtr, argbuf) => runMainThreadEmAsm(emAsmAddr, sigPtr, argbuf, 1);

var _emscripten_check_blocking_allowed = () => {
  if (ENVIRONMENT_IS_NODE) return;
  if (ENVIRONMENT_IS_WORKER) return;
  // Blocking in a worker/pthread is fine.
  warnOnce("Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread");
};

var _emscripten_err = str => err(UTF8ToString(str));

var JSEvents = {
  removeAllEventListeners() {
    while (JSEvents.eventHandlers.length) {
      JSEvents._removeHandler(JSEvents.eventHandlers.length - 1);
    }
    JSEvents.deferredCalls = [];
  },
  registerRemoveEventListeners() {
    if (!JSEvents.removeEventListenersRegistered) {
      addOnExit(JSEvents.removeAllEventListeners);
      JSEvents.removeEventListenersRegistered = true;
    }
  },
  inEventHandler: 0,
  deferredCalls: [],
  deferCall(targetFunction, precedence, argsList) {
    function arraysHaveEqualContent(arrA, arrB) {
      if (arrA.length != arrB.length) return false;
      for (var i in arrA) {
        if (arrA[i] != arrB[i]) return false;
      }
      return true;
    }
    // Test if the given call was already queued, and if so, don't add it again.
    for (var call of JSEvents.deferredCalls) {
      if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
        return;
      }
    }
    JSEvents.deferredCalls.push({
      targetFunction,
      precedence,
      argsList
    });
    JSEvents.deferredCalls.sort((x, y) => x.precedence < y.precedence);
  },
  removeDeferredCalls(targetFunction) {
    JSEvents.deferredCalls = JSEvents.deferredCalls.filter(call => call.targetFunction != targetFunction);
  },
  canPerformEventHandlerRequests() {
    if (navigator.userActivation) {
      // Verify against transient activation status from UserActivation API
      // whether it is possible to perform a request here without needing to defer. See
      // https://developer.mozilla.org/en-US/docs/Web/Security/User_activation#transient_activation
      // and https://caniuse.com/mdn-api_useractivation
      // At the time of writing, Firefox does not support this API: https://bugzil.la/1791079
      return navigator.userActivation.isActive;
    }
    return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
  },
  runDeferredCalls() {
    if (!JSEvents.canPerformEventHandlerRequests()) {
      return;
    }
    var deferredCalls = JSEvents.deferredCalls;
    JSEvents.deferredCalls = [];
    for (var call of deferredCalls) {
      call.targetFunction(...call.argsList);
    }
  },
  eventHandlers: [],
  removeAllHandlersOnTarget: (target, eventTypeString) => {
    for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
      if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
        JSEvents._removeHandler(i--);
      }
    }
  },
  _removeHandler(i) {
    var h = JSEvents.eventHandlers[i];
    h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
    JSEvents.eventHandlers.splice(i, 1);
  },
  registerOrRemoveHandler(eventHandler) {
    if (!eventHandler.target) {
      err("registerOrRemoveHandler: the target element for event handler registration does not exist, when processing the following event handler registration:");
      console.dir(eventHandler);
      return -4;
    }
    if (eventHandler.callbackfunc) {
      eventHandler.eventListenerFunc = function(event) {
        // Increment nesting count for the event handler.
        ++JSEvents.inEventHandler;
        JSEvents.currentEventHandler = eventHandler;
        // Process any old deferred calls the user has placed.
        JSEvents.runDeferredCalls();
        // Process the actual event, calls back to user C code handler.
        eventHandler.handlerFunc(event);
        // Process any new deferred calls that were placed right now from this event handler.
        JSEvents.runDeferredCalls();
        // Out of event handler - restore nesting count.
        --JSEvents.inEventHandler;
      };
      eventHandler.target.addEventListener(eventHandler.eventTypeString, eventHandler.eventListenerFunc, eventHandler.useCapture);
      JSEvents.eventHandlers.push(eventHandler);
      JSEvents.registerRemoveEventListeners();
    } else {
      for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
        if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
          JSEvents._removeHandler(i--);
        }
      }
    }
    return 0;
  },
  removeSingleHandler(eventHandler) {
    let success = false;
    for (let i = 0; i < JSEvents.eventHandlers.length; ++i) {
      const handler = JSEvents.eventHandlers[i];
      if (handler.target === eventHandler.target && handler.eventTypeId === eventHandler.eventTypeId && handler.callbackfunc === eventHandler.callbackfunc && handler.userData === eventHandler.userData) {
        // in some very rare cases (ex: Safari / fullscreen events), there is more than 1 handler (eventTypeString is different)
        JSEvents._removeHandler(i--);
        success = true;
      }
    }
    return success ? 0 : -5;
  },
  getTargetThreadForEventCallback(targetThread) {
    switch (targetThread) {
     case 1:
      // The event callback for the current event should be called on the
      // main browser thread. (0 == don't proxy)
      return 0;

     case 2:
      // The event callback for the current event should be backproxied to
      // the thread that is registering the event.
      // This can be 0 in the case that the caller uses
      // EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD but on the main thread
      // itself.
      return PThread.currentProxiedOperationCallerThread;

     default:
      // The event callback for the current event should be proxied to the
      // given specific thread.
      return targetThread;
    }
  },
  getNodeNameForTarget(target) {
    if (!target) return "";
    if (target == window) return "#window";
    if (target == screen) return "#screen";
    return target?.nodeName || "";
  },
  fullscreenEnabled() {
    return document.fullscreenEnabled || document.webkitFullscreenEnabled;
  }
};

/** @type {Object} */ var specialHTMLTargets = [ 0, globalThis.document ?? 0, globalThis.window ?? 0 ];

var maybeCStringToJsString = cString => cString > 2 ? UTF8ToString(cString) : cString;

var findEventTarget = target => {
  target = maybeCStringToJsString(target);
  var domElement = specialHTMLTargets[target] || globalThis.document?.querySelector(target);
  return domElement;
};

var findCanvasEventTarget = findEventTarget;

var getCanvasSizeCallingThread = (target, width, height) => {
  var canvas = findCanvasEventTarget(target);
  if (!canvas) return -4;
  if (!canvas.controlTransferredOffscreen) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((width) >> 2), "storing")] = canvas.width;
    checkInt32(canvas.width);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((height) >> 2), "storing")] = canvas.height;
    checkInt32(canvas.height);
  } else {
    return -4;
  }
  return 0;
};

function getCanvasSizeMainThread(target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(53, 0, 1, target, width, height);
  return getCanvasSizeCallingThread(target, width, height);
}

var _emscripten_get_canvas_element_size = (target, width, height) => {
  var canvas = findCanvasEventTarget(target);
  if (canvas) {
    return getCanvasSizeCallingThread(target, width, height);
  }
  return getCanvasSizeMainThread(target, width, height);
};

var stringToUTF8OnStack = str => {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8(str, ret, size);
  return ret;
};

var getCanvasElementSize = target => {
  var sp = stackSave();
  var w = stackAlloc(8);
  var h = w + 4;
  var targetInt = stringToUTF8OnStack(target.id);
  var ret = _emscripten_get_canvas_element_size(targetInt, w, h);
  var size = [ (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((w) >> 2), "loading")], (growMemViews(), 
  HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((h) >> 2), "loading")] ];
  stackRestore(sp);
  return size;
};

var setCanvasElementSizeCallingThread = (target, width, height) => {
  var canvas = findCanvasEventTarget(target);
  if (!canvas) return -4;
  if (!canvas.controlTransferredOffscreen) {
    var autoResizeViewport = false;
    if (canvas.GLctxObject?.GLctx) {
      var prevViewport = canvas.GLctxObject.GLctx.getParameter(2978);
      // TODO: Perhaps autoResizeViewport should only be true if FBO 0 is currently active?
      autoResizeViewport = (prevViewport[0] === 0 && prevViewport[1] === 0 && prevViewport[2] === canvas.width && prevViewport[3] === canvas.height);
    }
    canvas.width = width;
    canvas.height = height;
    if (autoResizeViewport) {
      // TODO: Add -sCANVAS_RESIZE_SETS_GL_VIEWPORT=0/1 option (default=1). This is commonly done and several graphics engines depend on this,
      // but this can be quite disruptive.
      canvas.GLctxObject.GLctx.viewport(0, 0, width, height);
    }
  } else {
    return -4;
  }
  return 0;
};

function setCanvasElementSizeMainThread(target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(54, 0, 1, target, width, height);
  return setCanvasElementSizeCallingThread(target, width, height);
}

var _emscripten_set_canvas_element_size = (target, width, height) => {
  var canvas = findCanvasEventTarget(target);
  if (canvas) {
    return setCanvasElementSizeCallingThread(target, width, height);
  }
  return setCanvasElementSizeMainThread(target, width, height);
};

var setCanvasElementSize = (target, width, height) => {
  if (!target.controlTransferredOffscreen) {
    target.width = width;
    target.height = height;
  } else {
    // This function is being called from high-level JavaScript code instead of asm.js/Wasm,
    // and it needs to synchronously proxy over to another thread, so marshal the string onto the heap to do the call.
    var sp = stackSave();
    var targetInt = stringToUTF8OnStack(target.id);
    _emscripten_set_canvas_element_size(targetInt, width, height);
    stackRestore(sp);
  }
};

var currentFullscreenStrategy = {};

var registerRestoreOldStyle = canvas => {
  var canvasSize = getCanvasElementSize(canvas);
  var oldWidth = canvasSize[0];
  var oldHeight = canvasSize[1];
  var oldCssWidth = canvas.style.width;
  var oldCssHeight = canvas.style.height;
  var oldBackgroundColor = canvas.style.backgroundColor;
  // Chrome reads color from here.
  var oldDocumentBackgroundColor = document.body.style.backgroundColor;
  // IE11 reads color from here.
  // Firefox always has black background color.
  var oldPaddingLeft = canvas.style.paddingLeft;
  // Chrome, FF, Safari
  var oldPaddingRight = canvas.style.paddingRight;
  var oldPaddingTop = canvas.style.paddingTop;
  var oldPaddingBottom = canvas.style.paddingBottom;
  var oldMarginLeft = canvas.style.marginLeft;
  // IE11
  var oldMarginRight = canvas.style.marginRight;
  var oldMarginTop = canvas.style.marginTop;
  var oldMarginBottom = canvas.style.marginBottom;
  var oldDocumentBodyMargin = document.body.style.margin;
  var oldDocumentOverflow = document.documentElement.style.overflow;
  // Chrome, Firefox
  var oldDocumentScroll = document.body.scroll;
  // IE
  var oldImageRendering = canvas.style.imageRendering;
  function restoreOldStyle() {
    if (!getFullscreenElement()) {
      document.removeEventListener("fullscreenchange", restoreOldStyle);
      // As of Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitfullscreenchange. TODO: revisit this check once Safari ships unprefixed version.
      document.removeEventListener("webkitfullscreenchange", restoreOldStyle);
      setCanvasElementSize(canvas, oldWidth, oldHeight);
      canvas.style.width = oldCssWidth;
      canvas.style.height = oldCssHeight;
      canvas.style.backgroundColor = oldBackgroundColor;
      // Chrome
      // IE11 hack: assigning 'undefined' or an empty string to document.body.style.backgroundColor has no effect, so first assign back the default color
      // before setting the undefined value. Setting undefined value is also important, or otherwise we would later treat that as something that the user
      // had explicitly set so subsequent fullscreen transitions would not set background color properly.
      if (!oldDocumentBackgroundColor) document.body.style.backgroundColor = "white";
      document.body.style.backgroundColor = oldDocumentBackgroundColor;
      // IE11
      canvas.style.paddingLeft = oldPaddingLeft;
      // Chrome, FF, Safari
      canvas.style.paddingRight = oldPaddingRight;
      canvas.style.paddingTop = oldPaddingTop;
      canvas.style.paddingBottom = oldPaddingBottom;
      canvas.style.marginLeft = oldMarginLeft;
      // IE11
      canvas.style.marginRight = oldMarginRight;
      canvas.style.marginTop = oldMarginTop;
      canvas.style.marginBottom = oldMarginBottom;
      document.body.style.margin = oldDocumentBodyMargin;
      document.documentElement.style.overflow = oldDocumentOverflow;
      // Chrome, Firefox
      document.body.scroll = oldDocumentScroll;
      // IE
      canvas.style.imageRendering = oldImageRendering;
      if (canvas.GLctxObject) canvas.GLctxObject.GLctx.viewport(0, 0, oldWidth, oldHeight);
      if (currentFullscreenStrategy.canvasResizedCallback) {
        if (currentFullscreenStrategy.canvasResizedCallbackTargetThread) __emscripten_run_callback_on_thread(currentFullscreenStrategy.canvasResizedCallbackTargetThread, currentFullscreenStrategy.canvasResizedCallback, 37, 0, currentFullscreenStrategy.canvasResizedCallbackUserData); else ((a1, a2, a3) => dynCall_iiii(currentFullscreenStrategy.canvasResizedCallback, a1, a2, a3))(37, 0, currentFullscreenStrategy.canvasResizedCallbackUserData);
      }
    }
  }
  document.addEventListener("fullscreenchange", restoreOldStyle);
  // As of Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitfullscreenchange. TODO: revisit this check once Safari ships unprefixed version.
  document.addEventListener("webkitfullscreenchange", restoreOldStyle);
  return restoreOldStyle;
};

var setLetterbox = (element, topBottom, leftRight) => {
  // Cannot use margin to specify letterboxes in FF or Chrome, since those ignore margins in fullscreen mode.
  element.style.paddingLeft = element.style.paddingRight = leftRight + "px";
  element.style.paddingTop = element.style.paddingBottom = topBottom + "px";
};

var getBoundingClientRect = e => specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {
  "left": 0,
  "top": 0
};

var JSEvents_resizeCanvasForFullscreen = (target, strategy) => {
  var restoreOldStyle = registerRestoreOldStyle(target);
  var cssWidth = strategy.softFullscreen ? innerWidth : screen.width;
  var cssHeight = strategy.softFullscreen ? innerHeight : screen.height;
  var rect = getBoundingClientRect(target);
  var windowedCssWidth = rect.width;
  var windowedCssHeight = rect.height;
  var canvasSize = getCanvasElementSize(target);
  var windowedRttWidth = canvasSize[0];
  var windowedRttHeight = canvasSize[1];
  if (strategy.scaleMode == 3) {
    setLetterbox(target, (cssHeight - windowedCssHeight) / 2, (cssWidth - windowedCssWidth) / 2);
    cssWidth = windowedCssWidth;
    cssHeight = windowedCssHeight;
  } else if (strategy.scaleMode == 2) {
    if (cssWidth * windowedRttHeight < windowedRttWidth * cssHeight) {
      var desiredCssHeight = windowedRttHeight * cssWidth / windowedRttWidth;
      setLetterbox(target, (cssHeight - desiredCssHeight) / 2, 0);
      cssHeight = desiredCssHeight;
    } else {
      var desiredCssWidth = windowedRttWidth * cssHeight / windowedRttHeight;
      setLetterbox(target, 0, (cssWidth - desiredCssWidth) / 2);
      cssWidth = desiredCssWidth;
    }
  }
  // If we are adding padding, must choose a background color or otherwise Chrome will give the
  // padding a default white color. Do it only if user has not customized their own background color.
  target.style.backgroundColor ||= "black";
  // IE11 does the same, but requires the color to be set in the document body.
  document.body.style.backgroundColor ||= "black";
  // IE11
  // Firefox always shows black letterboxes independent of style color.
  target.style.width = cssWidth + "px";
  target.style.height = cssHeight + "px";
  if (strategy.filteringMode == 1) {
    target.style.imageRendering = "optimizeSpeed";
    target.style.imageRendering = "-moz-crisp-edges";
    target.style.imageRendering = "-o-crisp-edges";
    target.style.imageRendering = "-webkit-optimize-contrast";
    target.style.imageRendering = "optimize-contrast";
    target.style.imageRendering = "crisp-edges";
    target.style.imageRendering = "pixelated";
  }
  var dpiScale = (strategy.canvasResolutionScaleMode == 2) ? devicePixelRatio : 1;
  if (strategy.canvasResolutionScaleMode != 0) {
    var newWidth = (cssWidth * dpiScale) | 0;
    var newHeight = (cssHeight * dpiScale) | 0;
    setCanvasElementSize(target, newWidth, newHeight);
    if (target.GLctxObject) target.GLctxObject.GLctx.viewport(0, 0, newWidth, newHeight);
  }
  return restoreOldStyle;
};

var JSEvents_requestFullscreen = (target, strategy) => {
  // EMSCRIPTEN_FULLSCREEN_SCALE_DEFAULT + EMSCRIPTEN_FULLSCREEN_CANVAS_SCALE_NONE is a mode where no extra logic is performed to the DOM elements.
  if (strategy.scaleMode != 0 || strategy.canvasResolutionScaleMode != 0) {
    JSEvents_resizeCanvasForFullscreen(target, strategy);
  }
  if (target.requestFullscreen) {
    target.requestFullscreen();
  } else if (target.webkitRequestFullscreen) {
    target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  } else {
    return JSEvents.fullscreenEnabled() ? -3 : -1;
  }
  currentFullscreenStrategy = strategy;
  if (strategy.canvasResizedCallback) {
    if (strategy.canvasResizedCallbackTargetThread) __emscripten_run_callback_on_thread(strategy.canvasResizedCallbackTargetThread, strategy.canvasResizedCallback, 37, 0, strategy.canvasResizedCallbackUserData); else ((a1, a2, a3) => dynCall_iiii(strategy.canvasResizedCallback, a1, a2, a3))(37, 0, strategy.canvasResizedCallbackUserData);
  }
  return 0;
};

function _emscripten_exit_fullscreen() {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(52, 0, 1);
  if (!JSEvents.fullscreenEnabled()) return -1;
  // Make sure no queued up calls will fire after this.
  JSEvents.removeDeferredCalls(JSEvents_requestFullscreen);
  var d = specialHTMLTargets[1];
  if (d.exitFullscreen) {
    d.fullscreenElement && d.exitFullscreen();
  } else if (d.webkitExitFullscreen) {
    d.webkitFullscreenElement && d.webkitExitFullscreen();
  } else {
    return -1;
  }
  return 0;
}

var requestPointerLock = target => {
  if (target.requestPointerLock) {
    target.requestPointerLock();
  } else {
    // document.body is known to accept pointer lock, so use that to differentiate if the user passed a bad element,
    // or if the whole browser just doesn't support the feature.
    if (document.body.requestPointerLock) {
      return -3;
    }
    return -1;
  }
  return 0;
};

function _emscripten_exit_pointerlock() {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(55, 0, 1);
  // Make sure no queued up calls will fire after this.
  JSEvents.removeDeferredCalls(requestPointerLock);
  if (!document.exitPointerLock) return -1;
  document.exitPointerLock();
  return 0;
}

var _emscripten_exit_with_live_runtime = () => {
  runtimeKeepalivePush();
  throw "unwind";
};

function _emscripten_get_device_pixel_ratio() {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(56, 0, 1);
  return globalThis.devicePixelRatio ?? 1;
}

function _emscripten_get_element_css_size(target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(57, 0, 1, target, width, height);
  target = findEventTarget(target);
  if (!target) return -4;
  var rect = getBoundingClientRect(target);
  (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((width) >> 3), "storing")] = rect.width;
  (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((height) >> 3), "storing")] = rect.height;
  return 0;
}

var fillGamepadEventData = (eventStruct, e) => {
  (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((eventStruct) >> 3), "storing")] = e.timestamp;
  for (var i = 0; i < e.axes.length; ++i) {
    (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), (((eventStruct + i * 8) + (16)) >> 3), "storing")] = e.axes[i];
  }
  for (var i = 0; i < e.buttons.length; ++i) {
    if (typeof e.buttons[i] == "object") {
      (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), (((eventStruct + i * 8) + (528)) >> 3), "storing")] = e.buttons[i].value;
    } else {
      (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), (((eventStruct + i * 8) + (528)) >> 3), "storing")] = e.buttons[i];
    }
  }
  for (var i = 0; i < e.buttons.length; ++i) {
    if (typeof e.buttons[i] == "object") {
      (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (eventStruct + i) + (1040), "storing")] = e.buttons[i].pressed;
      checkInt8(e.buttons[i].pressed);
    } else {
      // Assigning a boolean to HEAP32, that's ok, but Closure would like to warn about it:
      /** @suppress {checkTypes} */ (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), 
      HEAP8), (eventStruct + i) + (1040), "storing")] = e.buttons[i] == 1;
      checkInt8(e.buttons[i] == 1);
    }
  }
  (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (eventStruct) + (1104), "storing")] = e.connected;
  checkInt8(e.connected);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (1108)) >> 2), "storing")] = e.index;
  checkInt32(e.index);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (8)) >> 2), "storing")] = e.axes.length;
  checkInt32(e.axes.length);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (12)) >> 2), "storing")] = e.buttons.length;
  checkInt32(e.buttons.length);
  stringToUTF8(e.id, eventStruct + 1112, 64);
  stringToUTF8(e.mapping, eventStruct + 1176, 64);
};

function _emscripten_get_gamepad_status(index, gamepadState) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(58, 0, 1, index, gamepadState);
  assert(JSEvents.lastGamepadState, "emscripten_get_gamepad_status() can only be called after having first called emscripten_sample_gamepad_data() and that function has returned EMSCRIPTEN_RESULT_SUCCESS!");
  // INVALID_PARAM is returned on a Gamepad index that never was there.
  if (index < 0 || index >= JSEvents.lastGamepadState.length) return -5;
  // NO_DATA is returned on a Gamepad index that was removed.
  // For previously disconnected gamepads there should be an empty slot (null/undefined/false) at the index.
  // This is because gamepads must keep their original position in the array.
  // For example, removing the first of two gamepads produces [null/undefined/false, gamepad].
  if (!JSEvents.lastGamepadState[index]) return -7;
  fillGamepadEventData(gamepadState, JSEvents.lastGamepadState[index]);
  return 0;
}

var getHeapMax = () => // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
// full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
// for any code that deals with heap sizes, which would require special
// casing all heap size related code to treat 0 specially.
2097152e3;

var _emscripten_get_heap_max = () => getHeapMax();

function _emscripten_get_num_gamepads() {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(59, 0, 1);
  assert(JSEvents.lastGamepadState, "emscripten_get_num_gamepads() can only be called after having first called emscripten_sample_gamepad_data() and that function has returned EMSCRIPTEN_RESULT_SUCCESS!");
  // N.B. Do not call emscripten_get_num_gamepads() unless having first called emscripten_sample_gamepad_data(), and that has returned EMSCRIPTEN_RESULT_SUCCESS.
  // Otherwise the following line will throw an exception.
  return JSEvents.lastGamepadState.length;
}

function _emscripten_get_screen_size(width, height) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(60, 0, 1, width, height);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((width) >> 2), "storing")] = screen.width;
  checkInt32(screen.width);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((height) >> 2), "storing")] = screen.height;
  checkInt32(screen.height);
}

var _emscripten_glActiveTexture = x0 => GLctx.activeTexture(x0);

var _emscripten_glAttachShader = (program, shader) => {
  GL.validateGLObjectID(GL.programs, program, "glAttachShader", "program");
  GL.validateGLObjectID(GL.shaders, shader, "glAttachShader", "shader");
  GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
};

var _emscripten_glBeginQuery = (target, id) => {
  GL.validateGLObjectID(GL.queries, id, "glBeginQuery", "id");
  GLctx.beginQuery(target, GL.queries[id]);
};

var _emscripten_glBeginQueryEXT = (target, id) => {
  GL.validateGLObjectID(GL.queries, id, "glBeginQueryEXT", "id");
  GLctx.disjointTimerQueryExt["beginQueryEXT"](target, GL.queries[id]);
};

var _emscripten_glBeginTransformFeedback = x0 => GLctx.beginTransformFeedback(x0);

var _emscripten_glBindAttribLocation = (program, index, name) => {
  GL.validateGLObjectID(GL.programs, program, "glBindAttribLocation", "program");
  GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
};

var _emscripten_glBindBuffer = (target, buffer) => {
  // Calling glBindBuffer with an unknown buffer will implicitly create a
  // new one.  Here we bypass `GL.counter` and directly using the ID passed
  // in.
  if (buffer && !GL.buffers[buffer]) {
    var b = GLctx.createBuffer();
    b.name = buffer;
    GL.buffers[buffer] = b;
  }
  GL.validateGLObjectID(GL.buffers, buffer, "glBindBuffer", "buffer");
  if (target == 34962) {
    GLctx.currentArrayBufferBinding = buffer;
  } else if (target == 34963) {
    GLctx.currentElementArrayBufferBinding = buffer;
  }
  if (target == 35051) {
    // In WebGL 2 glReadPixels entry point, we need to use a different WebGL 2
    // API function call when a buffer is bound to
    // GL_PIXEL_PACK_BUFFER_BINDING point, so must keep track whether that
    // binding point is non-null to know what is the proper API function to
    // call.
    GLctx.currentPixelPackBufferBinding = buffer;
  } else if (target == 35052) {
    // In WebGL 2 gl(Compressed)Tex(Sub)Image[23]D entry points, we need to
    // use a different WebGL 2 API function call when a buffer is bound to
    // GL_PIXEL_UNPACK_BUFFER_BINDING point, so must keep track whether that
    // binding point is non-null to know what is the proper API function to
    // call.
    GLctx.currentPixelUnpackBufferBinding = buffer;
  }
  GLctx.bindBuffer(target, GL.buffers[buffer]);
};

var _emscripten_glBindBufferBase = (target, index, buffer) => {
  GL.validateGLObjectID(GL.buffers, buffer, "glBindBufferBase", "buffer");
  GLctx.bindBufferBase(target, index, GL.buffers[buffer]);
};

var _emscripten_glBindBufferRange = (target, index, buffer, offset, ptrsize) => {
  GL.validateGLObjectID(GL.buffers, buffer, "glBindBufferRange", "buffer");
  GLctx.bindBufferRange(target, index, GL.buffers[buffer], offset, ptrsize);
};

var _emscripten_glBindFramebuffer = (target, framebuffer) => {
  GL.validateGLObjectID(GL.framebuffers, framebuffer, "glBindFramebuffer", "framebuffer");
  GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
};

var _emscripten_glBindRenderbuffer = (target, renderbuffer) => {
  GL.validateGLObjectID(GL.renderbuffers, renderbuffer, "glBindRenderbuffer", "renderbuffer");
  GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
};

var _emscripten_glBindSampler = (unit, sampler) => {
  GL.validateGLObjectID(GL.samplers, sampler, "glBindSampler", "sampler");
  GLctx.bindSampler(unit, GL.samplers[sampler]);
};

var _emscripten_glBindTexture = (target, texture) => {
  GL.validateGLObjectID(GL.textures, texture, "glBindTexture", "texture");
  GLctx.bindTexture(target, GL.textures[texture]);
};

var _emscripten_glBindTransformFeedback = (target, id) => {
  GL.validateGLObjectID(GL.transformFeedbacks, id, "glBindTransformFeedback", "id");
  GLctx.bindTransformFeedback(target, GL.transformFeedbacks[id]);
};

var _emscripten_glBindVertexArray = vao => {
  assert(GLctx.bindVertexArray, "Must have WebGL2 or OES_vertex_array_object to use vao");
  GLctx.bindVertexArray(GL.vaos[vao]);
  var ibo = GLctx.getParameter(34965);
  GLctx.currentElementArrayBufferBinding = ibo ? (ibo.name | 0) : 0;
};

var _glBindVertexArray = _emscripten_glBindVertexArray;

var _emscripten_glBindVertexArrayOES = _glBindVertexArray;

var _emscripten_glBlendColor = (x0, x1, x2, x3) => GLctx.blendColor(x0, x1, x2, x3);

var _emscripten_glBlendEquation = x0 => GLctx.blendEquation(x0);

var _emscripten_glBlendEquationSeparate = (x0, x1) => GLctx.blendEquationSeparate(x0, x1);

var _emscripten_glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);

var _emscripten_glBlendFuncSeparate = (x0, x1, x2, x3) => GLctx.blendFuncSeparate(x0, x1, x2, x3);

var _emscripten_glBlitFramebuffer = (x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) => GLctx.blitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9);

var _emscripten_glBufferData = (target, size, data, usage) => {
  if (GL.currentContext.version >= 2) {
    // If size is zero, WebGL would interpret uploading the whole input
    // arraybuffer (starting from given offset), which would not make sense in
    // WebAssembly, so avoid uploading if size is zero. However we must still
    // call bufferData to establish a backing storage of zero bytes.
    if (data && size) {
      GLctx.bufferData(target, (growMemViews(), HEAPU8), usage, data, size);
    } else {
      GLctx.bufferData(target, size, usage);
    }
    return;
  }
  // N.b. here first form specifies a heap subarray, second form an integer
  // size, so the ?: code here is polymorphic. It is advised to avoid
  // randomly mixing both uses in calling code, to avoid any potential JS
  // engine JIT issues.
  GLctx.bufferData(target, data ? (growMemViews(), HEAPU8).subarray(data, data + size) : size, usage);
};

var _emscripten_glBufferSubData = (target, offset, size, data) => {
  if (GL.currentContext.version >= 2) {
    size && GLctx.bufferSubData(target, offset, (growMemViews(), HEAPU8), data, size);
    return;
  }
  GLctx.bufferSubData(target, offset, (growMemViews(), HEAPU8).subarray(data, data + size));
};

var _emscripten_glCheckFramebufferStatus = x0 => GLctx.checkFramebufferStatus(x0);

var _emscripten_glClear = x0 => GLctx.clear(x0);

var _emscripten_glClearBufferfi = (x0, x1, x2, x3) => GLctx.clearBufferfi(x0, x1, x2, x3);

var _emscripten_glClearBufferfv = (buffer, drawbuffer, value) => {
  assert((value & 3) == 0, "Pointer to float data passed to glClearBufferfv must be aligned to four bytes!");
  GLctx.clearBufferfv(buffer, drawbuffer, (growMemViews(), HEAPF32), ((value) >> 2));
};

var _emscripten_glClearBufferiv = (buffer, drawbuffer, value) => {
  assert((value & 3) == 0, "Pointer to integer data passed to glClearBufferiv must be aligned to four bytes!");
  GLctx.clearBufferiv(buffer, drawbuffer, (growMemViews(), HEAP32), ((value) >> 2));
};

var _emscripten_glClearBufferuiv = (buffer, drawbuffer, value) => {
  assert((value & 3) == 0, "Pointer to integer data passed to glClearBufferuiv must be aligned to four bytes!");
  GLctx.clearBufferuiv(buffer, drawbuffer, (growMemViews(), HEAPU32), ((value) >> 2));
};

var _emscripten_glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);

var _emscripten_glClearDepthf = x0 => GLctx.clearDepth(x0);

var _emscripten_glClearStencil = x0 => GLctx.clearStencil(x0);

var _emscripten_glClientWaitSync = (sync, flags, timeout) => {
  // WebGL2 vs GLES3 differences: in GLES3, the timeout parameter is a uint64, where 0xFFFFFFFFFFFFFFFFULL means GL_TIMEOUT_IGNORED.
  // In JS, there's no 64-bit value types, so instead timeout is taken to be signed, and GL_TIMEOUT_IGNORED is given value -1.
  // Inherently the value accepted in the timeout is lossy, and can't take in arbitrary u64 bit pattern (but most likely doesn't matter)
  // See https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.15
  timeout = Number(timeout);
  return GLctx.clientWaitSync(GL.syncs[sync], flags, timeout);
};

var _emscripten_glClipControlEXT = (origin, depth) => {
  assert(GLctx.extClipControl, "EXT_clip_control not supported, or not enabled. Before calling glClipControlEXT(), call emscripten_webgl_enable_EXT_clip_control() to enable this extension, and verify that it returns true to indicate support. (alternatively, build with -sGL_SUPPORT_AUTOMATIC_ENABLE_EXTENSIONS=1 to enable all GL extensions by default)");
  GLctx.extClipControl["clipControlEXT"](origin, depth);
};

var _emscripten_glColorMask = (red, green, blue, alpha) => {
  GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
};

var _emscripten_glCompileShader = shader => {
  GL.validateGLObjectID(GL.shaders, shader, "glCompileShader", "shader");
  GLctx.compileShader(GL.shaders[shader]);
};

var _emscripten_glCompressedTexImage2D = (target, level, internalFormat, width, height, border, imageSize, data) => {
  // `data` may be null here, which means "allocate uniniitalized space but
  // don't upload" in GLES parlance, but `compressedTexImage2D` requires the
  // final data parameter, so we simply pass a heap view starting at zero
  // effectively uploading whatever happens to be near address zero.  See
  // https://github.com/emscripten-core/emscripten/issues/19300.
  if (GL.currentContext.version >= 2) {
    if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
      GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data);
      return;
    }
    GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, (growMemViews(), 
    HEAPU8), data, imageSize);
    return;
  }
  GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, (growMemViews(), 
  HEAPU8).subarray((data), data + imageSize));
};

var _emscripten_glCompressedTexImage3D = (target, level, internalFormat, width, height, depth, border, imageSize, data) => {
  if (GLctx.currentPixelUnpackBufferBinding) {
    GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, imageSize, data);
  } else {
    GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, (growMemViews(), 
    HEAPU8), data, imageSize);
  }
};

var _emscripten_glCompressedTexSubImage2D = (target, level, xoffset, yoffset, width, height, format, imageSize, data) => {
  if (GL.currentContext.version >= 2) {
    if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
      GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data);
      return;
    }
    GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, (growMemViews(), 
    HEAPU8), data, imageSize);
    return;
  }
  GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, (growMemViews(), 
  HEAPU8).subarray((data), data + imageSize));
};

var _emscripten_glCompressedTexSubImage3D = (target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data) => {
  if (GLctx.currentPixelUnpackBufferBinding) {
    GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data);
  } else {
    GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, (growMemViews(), 
    HEAPU8), data, imageSize);
  }
};

var _emscripten_glCopyBufferSubData = (x0, x1, x2, x3, x4) => GLctx.copyBufferSubData(x0, x1, x2, x3, x4);

var _emscripten_glCopyTexImage2D = (x0, x1, x2, x3, x4, x5, x6, x7) => GLctx.copyTexImage2D(x0, x1, x2, x3, x4, x5, x6, x7);

var _emscripten_glCopyTexSubImage2D = (x0, x1, x2, x3, x4, x5, x6, x7) => GLctx.copyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7);

var _emscripten_glCopyTexSubImage3D = (x0, x1, x2, x3, x4, x5, x6, x7, x8) => GLctx.copyTexSubImage3D(x0, x1, x2, x3, x4, x5, x6, x7, x8);

var _emscripten_glCreateProgram = () => {
  var id = GL.getNewId(GL.programs);
  var program = GLctx.createProgram();
  // Store additional information needed for each shader program:
  program.name = id;
  // Lazy cache results of
  // glGetProgramiv(GL_ACTIVE_UNIFORM_MAX_LENGTH/GL_ACTIVE_ATTRIBUTE_MAX_LENGTH/GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH)
  program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
  program.uniformIdCounter = 1;
  GL.programs[id] = program;
  return id;
};

var _emscripten_glCreateShader = shaderType => {
  var id = GL.getNewId(GL.shaders);
  GL.shaders[id] = GLctx.createShader(shaderType);
  return id;
};

var _emscripten_glCullFace = x0 => GLctx.cullFace(x0);

var _emscripten_glDeleteBuffers = (n, buffers) => {
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((buffers) + (i * 4)) >> 2), "loading")];
    var buffer = GL.buffers[id];
    // From spec: "glDeleteBuffers silently ignores 0's and names that do not
    // correspond to existing buffer objects."
    if (!buffer) continue;
    GLctx.deleteBuffer(buffer);
    buffer.name = 0;
    GL.buffers[id] = null;
    if (id == GLctx.currentArrayBufferBinding) GLctx.currentArrayBufferBinding = 0;
    if (id == GLctx.currentElementArrayBufferBinding) GLctx.currentElementArrayBufferBinding = 0;
    if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
    if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
  }
};

var _emscripten_glDeleteFramebuffers = (n, framebuffers) => {
  for (var i = 0; i < n; ++i) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((framebuffers) + (i * 4)) >> 2), "loading")];
    var framebuffer = GL.framebuffers[id];
    if (!framebuffer) continue;
    // GL spec: "glDeleteFramebuffers silently ignores 0s and names that do not correspond to existing framebuffer objects".
    GLctx.deleteFramebuffer(framebuffer);
    framebuffer.name = 0;
    GL.framebuffers[id] = null;
  }
};

var _emscripten_glDeleteProgram = id => {
  if (!id) return;
  var program = GL.programs[id];
  if (!program) {
    // glDeleteProgram actually signals an error when deleting a nonexisting
    // object, unlike some other GL delete functions.
    GL.recordError(1281);
    return;
  }
  GLctx.deleteProgram(program);
  program.name = 0;
  GL.programs[id] = null;
};

var _emscripten_glDeleteQueries = (n, ids) => {
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ids) + (i * 4)) >> 2), "loading")];
    var query = GL.queries[id];
    if (!query) continue;
    // GL spec: "unused names in ids are ignored, as is the name zero."
    GLctx.deleteQuery(query);
    GL.queries[id] = null;
  }
};

var _emscripten_glDeleteQueriesEXT = (n, ids) => {
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ids) + (i * 4)) >> 2), "loading")];
    var query = GL.queries[id];
    if (!query) continue;
    // GL spec: "unused names in ids are ignored, as is the name zero."
    GLctx.disjointTimerQueryExt["deleteQueryEXT"](query);
    GL.queries[id] = null;
  }
};

var _emscripten_glDeleteRenderbuffers = (n, renderbuffers) => {
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((renderbuffers) + (i * 4)) >> 2), "loading")];
    var renderbuffer = GL.renderbuffers[id];
    if (!renderbuffer) continue;
    // GL spec: "glDeleteRenderbuffers silently ignores 0s and names that do not correspond to existing renderbuffer objects".
    GLctx.deleteRenderbuffer(renderbuffer);
    renderbuffer.name = 0;
    GL.renderbuffers[id] = null;
  }
};

var _emscripten_glDeleteSamplers = (n, samplers) => {
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((samplers) + (i * 4)) >> 2), "loading")];
    var sampler = GL.samplers[id];
    if (!sampler) continue;
    GLctx.deleteSampler(sampler);
    sampler.name = 0;
    GL.samplers[id] = null;
  }
};

var _emscripten_glDeleteShader = id => {
  if (!id) return;
  var shader = GL.shaders[id];
  if (!shader) {
    // glDeleteShader actually signals an error when deleting a nonexisting
    // object, unlike some other GL delete functions.
    GL.recordError(1281);
    return;
  }
  GLctx.deleteShader(shader);
  GL.shaders[id] = null;
};

var _emscripten_glDeleteSync = id => {
  if (!id) return;
  var sync = GL.syncs[id];
  if (!sync) {
    // glDeleteSync signals an error when deleting a nonexisting object, unlike some other GL delete functions.
    GL.recordError(1281);
    return;
  }
  GLctx.deleteSync(sync);
  sync.name = 0;
  GL.syncs[id] = null;
};

var _emscripten_glDeleteTextures = (n, textures) => {
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((textures) + (i * 4)) >> 2), "loading")];
    var texture = GL.textures[id];
    // GL spec: "glDeleteTextures silently ignores 0s and names that do not
    // correspond to existing textures".
    if (!texture) continue;
    GLctx.deleteTexture(texture);
    texture.name = 0;
    GL.textures[id] = null;
  }
};

var _emscripten_glDeleteTransformFeedbacks = (n, ids) => {
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ids) + (i * 4)) >> 2), "loading")];
    var transformFeedback = GL.transformFeedbacks[id];
    if (!transformFeedback) continue;
    // GL spec: "unused names in ids are ignored, as is the name zero."
    GLctx.deleteTransformFeedback(transformFeedback);
    transformFeedback.name = 0;
    GL.transformFeedbacks[id] = null;
  }
};

var _emscripten_glDeleteVertexArrays = (n, vaos) => {
  assert(GLctx.deleteVertexArray, "Must have WebGL2 or OES_vertex_array_object to use vao");
  for (var i = 0; i < n; i++) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((vaos) + (i * 4)) >> 2), "loading")];
    GLctx.deleteVertexArray(GL.vaos[id]);
    GL.vaos[id] = null;
  }
};

var _glDeleteVertexArrays = _emscripten_glDeleteVertexArrays;

var _emscripten_glDeleteVertexArraysOES = _glDeleteVertexArrays;

var _emscripten_glDepthFunc = x0 => GLctx.depthFunc(x0);

var _emscripten_glDepthMask = flag => {
  GLctx.depthMask(!!flag);
};

var _emscripten_glDepthRangef = (x0, x1) => GLctx.depthRange(x0, x1);

var _emscripten_glDetachShader = (program, shader) => {
  GL.validateGLObjectID(GL.programs, program, "glDetachShader", "program");
  GL.validateGLObjectID(GL.shaders, shader, "glDetachShader", "shader");
  GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
};

var _emscripten_glDisable = x0 => GLctx.disable(x0);

var _emscripten_glDisableVertexAttribArray = index => {
  var cb = GL.currentContext.clientBuffers[index];
  assert(cb, index);
  cb.enabled = false;
  GLctx.disableVertexAttribArray(index);
};

var _emscripten_glDrawArrays = (mode, first, count) => {
  // bind any client-side buffers
  GL.preDrawHandleClientVertexAttribBindings(first + count);
  GLctx.drawArrays(mode, first, count);
  GL.postDrawHandleClientVertexAttribBindings();
};

var _emscripten_glDrawArraysInstanced = (mode, first, count, primcount) => {
  assert(GLctx.drawArraysInstanced, "Must have ANGLE_instanced_arrays extension or WebGL 2 to use WebGL instancing");
  GLctx.drawArraysInstanced(mode, first, count, primcount);
};

var _glDrawArraysInstanced = _emscripten_glDrawArraysInstanced;

var _emscripten_glDrawArraysInstancedANGLE = _glDrawArraysInstanced;

var _emscripten_glDrawArraysInstancedARB = _glDrawArraysInstanced;

var _emscripten_glDrawArraysInstancedEXT = _glDrawArraysInstanced;

var _emscripten_glDrawArraysInstancedNV = _glDrawArraysInstanced;

var tempFixedLengthArray = [];

var _emscripten_glDrawBuffers = (n, bufs) => {
  assert(GLctx.drawBuffers, "Must have WebGL2 or WEBGL_draw_buffers extension to use drawBuffers");
  assert(n < tempFixedLengthArray.length, `Invalid count of numBuffers=${n} passed to glDrawBuffers (that many draw buffer points do not exist in GL)`);
  var bufArray = tempFixedLengthArray[n];
  for (var i = 0; i < n; i++) {
    bufArray[i] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((bufs) + (i * 4)) >> 2), "loading")];
  }
  GLctx.drawBuffers(bufArray);
};

var _glDrawBuffers = _emscripten_glDrawBuffers;

var _emscripten_glDrawBuffersEXT = _glDrawBuffers;

var _emscripten_glDrawBuffersWEBGL = _glDrawBuffers;

var _emscripten_glDrawElements = (mode, count, type, indices) => {
  var buf;
  var vertexes = 0;
  if (!GLctx.currentElementArrayBufferBinding) {
    var size = GL.calcBufLength(1, type, 0, count);
    buf = GL.getTempIndexBuffer(size);
    GLctx.bindBuffer(34963, buf);
    GLctx.bufferSubData(34963, 0, (growMemViews(), HEAPU8).subarray(indices, indices + size));
    // Calculating vertex count if shader's attribute data is on client side
    if (count > 0) {
      for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
        var cb = GL.currentContext.clientBuffers[i];
        if (cb.clientside && cb.enabled) {
          let arrayClass;
          switch (type) {
           case 5121:
            arrayClass = Uint8Array;
            break;

           case 5123:
            arrayClass = Uint16Array;
            break;

           case 5125:
            arrayClass = Uint32Array;
            break;

           default:
            GL.recordError(1282);
            err("type is not supported in glDrawElements");
            return;
          }
          vertexes = new arrayClass((growMemViews(), HEAPU8).buffer, indices, count).reduce((max, current) => Math.max(max, current)) + 1;
          break;
        }
      }
    }
    // the index is now 0
    indices = 0;
  }
  // bind any client-side buffers
  GL.preDrawHandleClientVertexAttribBindings(vertexes);
  GLctx.drawElements(mode, count, type, indices);
  GL.postDrawHandleClientVertexAttribBindings(count);
  if (!GLctx.currentElementArrayBufferBinding) {
    GLctx.bindBuffer(34963, null);
  }
};

var _emscripten_glDrawElementsInstanced = (mode, count, type, indices, primcount) => {
  assert(GLctx.drawElementsInstanced, "Must have ANGLE_instanced_arrays extension or WebGL 2 to use WebGL instancing");
  GLctx.drawElementsInstanced(mode, count, type, indices, primcount);
};

var _glDrawElementsInstanced = _emscripten_glDrawElementsInstanced;

var _emscripten_glDrawElementsInstancedANGLE = _glDrawElementsInstanced;

var _emscripten_glDrawElementsInstancedARB = _glDrawElementsInstanced;

var _emscripten_glDrawElementsInstancedEXT = _glDrawElementsInstanced;

var _emscripten_glDrawElementsInstancedNV = _glDrawElementsInstanced;

var _glDrawElements = _emscripten_glDrawElements;

var _emscripten_glDrawRangeElements = (mode, start, end, count, type, indices) => {
  // TODO: This should be a trivial pass-though function registered at the bottom of this page as
  // glFuncs[6][1] += ' drawRangeElements';
  // but due to https://bugzil.la/1202427,
  // we work around by ignoring the range.
  _glDrawElements(mode, count, type, indices);
};

var _emscripten_glEnable = x0 => GLctx.enable(x0);

var _emscripten_glEnableVertexAttribArray = index => {
  var cb = GL.currentContext.clientBuffers[index];
  assert(cb, index);
  cb.enabled = true;
  GLctx.enableVertexAttribArray(index);
};

var _emscripten_glEndQuery = x0 => GLctx.endQuery(x0);

var _emscripten_glEndQueryEXT = target => {
  GLctx.disjointTimerQueryExt["endQueryEXT"](target);
};

var _emscripten_glEndTransformFeedback = () => GLctx.endTransformFeedback();

var _emscripten_glFenceSync = (condition, flags) => {
  var sync = GLctx.fenceSync(condition, flags);
  if (sync) {
    var id = GL.getNewId(GL.syncs);
    sync.name = id;
    GL.syncs[id] = sync;
    return id;
  }
  return 0;
};

var _emscripten_glFinish = () => GLctx.finish();

var _emscripten_glFlush = () => GLctx.flush();

var emscriptenWebGLGetBufferBinding = target => {
  switch (target) {
   case 34962:
    target = 34964;
    break;

   case 34963:
    target = 34965;
    break;

   case 35051:
    target = 35053;
    break;

   case 35052:
    target = 35055;
    break;

   case 35982:
    target = 35983;
    break;

   case 36662:
    target = 36662;
    break;

   case 36663:
    target = 36663;
    break;

   case 35345:
    target = 35368;
    break;
  }
  var buffer = GLctx.getParameter(target);
  if (buffer) return buffer.name | 0; else return 0;
};

var emscriptenWebGLValidateMapBufferTarget = target => {
  switch (target) {
   case 34962:
   // GL_ARRAY_BUFFER
    case 34963:
   // GL_ELEMENT_ARRAY_BUFFER
    case 36662:
   // GL_COPY_READ_BUFFER
    case 36663:
   // GL_COPY_WRITE_BUFFER
    case 35051:
   // GL_PIXEL_PACK_BUFFER
    case 35052:
   // GL_PIXEL_UNPACK_BUFFER
    case 35882:
   // GL_TEXTURE_BUFFER
    case 35982:
   // GL_TRANSFORM_FEEDBACK_BUFFER
    case 35345:
    // GL_UNIFORM_BUFFER
    return true;

   default:
    return false;
  }
};

var _emscripten_glFlushMappedBufferRange = (target, offset, length) => {
  if (!emscriptenWebGLValidateMapBufferTarget(target)) {
    GL.recordError(1280);
    err("GL_INVALID_ENUM in glFlushMappedBufferRange");
    return;
  }
  var mapping = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
  if (!mapping) {
    GL.recordError(1282);
    err("buffer was never mapped in glFlushMappedBufferRange");
    return;
  }
  if (!(mapping.access & 16)) {
    GL.recordError(1282);
    err("buffer was not mapped with GL_MAP_FLUSH_EXPLICIT_BIT in glFlushMappedBufferRange");
    return;
  }
  if (offset < 0 || length < 0 || offset + length > mapping.length) {
    GL.recordError(1281);
    err("invalid range in glFlushMappedBufferRange");
    return;
  }
  GLctx.bufferSubData(target, mapping.offset, (growMemViews(), HEAPU8).subarray(mapping.mem + offset, mapping.mem + offset + length));
};

var _emscripten_glFramebufferRenderbuffer = (target, attachment, renderbuffertarget, renderbuffer) => {
  GL.validateGLObjectID(GL.renderbuffers, renderbuffer, "glFramebufferRenderbuffer", "renderbuffer");
  GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer]);
};

var _emscripten_glFramebufferTexture2D = (target, attachment, textarget, texture, level) => {
  GL.validateGLObjectID(GL.textures, texture, "glFramebufferTexture2D", "texture");
  GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level);
};

var _emscripten_glFramebufferTextureLayer = (target, attachment, texture, level, layer) => {
  GL.validateGLObjectID(GL.textures, texture, "glFramebufferTextureLayer", "texture");
  GLctx.framebufferTextureLayer(target, attachment, GL.textures[texture], level, layer);
};

var _emscripten_glFrontFace = x0 => GLctx.frontFace(x0);

var _emscripten_glGenBuffers = (n, buffers) => {
  GL.genObject(n, buffers, "createBuffer", GL.buffers, "glGenBuffers");
};

var _emscripten_glGenFramebuffers = (n, ids) => {
  GL.genObject(n, ids, "createFramebuffer", GL.framebuffers, "glGenFramebuffers");
};

var _emscripten_glGenQueries = (n, ids) => {
  GL.genObject(n, ids, "createQuery", GL.queries, "glGenQueries");
};

var _emscripten_glGenQueriesEXT = (n, ids) => {
  for (var i = 0; i < n; i++) {
    var query = GLctx.disjointTimerQueryExt["createQueryEXT"]();
    if (!query) {
      GL.recordError(1282);
      err("GL_INVALID_OPERATION in glGenQueriesEXT: GLctx.disjointTimerQueryExt.createQueryEXT returned null - most likely GL context is lost!");
      while (i < n) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ids) + (i++ * 4)) >> 2), "storing")] = 0;
      checkInt32(0);
      return;
    }
    var id = GL.getNewId(GL.queries);
    query.name = id;
    GL.queries[id] = query;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ids) + (i * 4)) >> 2), "storing")] = id;
    checkInt32(id);
  }
};

var _emscripten_glGenRenderbuffers = (n, renderbuffers) => {
  GL.genObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers, "glGenRenderbuffers");
};

var _emscripten_glGenSamplers = (n, samplers) => {
  GL.genObject(n, samplers, "createSampler", GL.samplers, "glGenSamplers");
};

var _emscripten_glGenTextures = (n, textures) => {
  GL.genObject(n, textures, "createTexture", GL.textures, "glGenTextures");
};

var _emscripten_glGenTransformFeedbacks = (n, ids) => {
  GL.genObject(n, ids, "createTransformFeedback", GL.transformFeedbacks, "glGenTransformFeedbacks");
};

var _emscripten_glGenVertexArrays = (n, arrays) => {
  assert(GLctx.createVertexArray, "Must have WebGL2 or OES_vertex_array_object to use vao");
  GL.genObject(n, arrays, "createVertexArray", GL.vaos, "glGenVertexArrays");
};

var _glGenVertexArrays = _emscripten_glGenVertexArrays;

var _emscripten_glGenVertexArraysOES = _glGenVertexArrays;

var _emscripten_glGenerateMipmap = x0 => GLctx.generateMipmap(x0);

var __glGetActiveAttribOrUniform = (funcName, program, index, bufSize, length, size, type, name) => {
  GL.validateGLObjectID(GL.programs, program, funcName, "program");
  program = GL.programs[program];
  var info = GLctx[funcName](program, index);
  if (info) {
    // If an error occurs, nothing will be written to length, size and type and name.
    var numBytesWrittenExclNull = name && stringToUTF8(info.name, name, bufSize);
    if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = numBytesWrittenExclNull;
    checkInt32(numBytesWrittenExclNull);
    if (size) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((size) >> 2), "storing")] = info.size;
    checkInt32(info.size);
    if (type) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((type) >> 2), "storing")] = info.type;
    checkInt32(info.type);
  }
};

var _emscripten_glGetActiveAttrib = (program, index, bufSize, length, size, type, name) => __glGetActiveAttribOrUniform("getActiveAttrib", program, index, bufSize, length, size, type, name);

var _emscripten_glGetActiveUniform = (program, index, bufSize, length, size, type, name) => __glGetActiveAttribOrUniform("getActiveUniform", program, index, bufSize, length, size, type, name);

var _emscripten_glGetActiveUniformBlockName = (program, uniformBlockIndex, bufSize, length, uniformBlockName) => {
  GL.validateGLObjectID(GL.programs, program, "glGetActiveUniformBlockName", "program");
  program = GL.programs[program];
  var result = GLctx.getActiveUniformBlockName(program, uniformBlockIndex);
  if (!result) return;
  // If an error occurs, nothing will be written to uniformBlockName or length.
  if (uniformBlockName && bufSize > 0) {
    var numBytesWrittenExclNull = stringToUTF8(result, uniformBlockName, bufSize);
    if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = numBytesWrittenExclNull;
    checkInt32(numBytesWrittenExclNull);
  } else {
    if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = 0;
    checkInt32(0);
  }
};

var _emscripten_glGetActiveUniformBlockiv = (program, uniformBlockIndex, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if params == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetActiveUniformBlockiv(program=" + program + ", uniformBlockIndex=" + uniformBlockIndex + ", pname=" + pname + ", params=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  GL.validateGLObjectID(GL.programs, program, "glGetActiveUniformBlockiv", "program");
  program = GL.programs[program];
  if (pname == 35393) {
    var name = GLctx.getActiveUniformBlockName(program, uniformBlockIndex);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = name.length + 1;
    checkInt32(name.length + 1);
    return;
  }
  var result = GLctx.getActiveUniformBlockParameter(program, uniformBlockIndex, pname);
  if (result === null) return;
  // If an error occurs, nothing should be written to params.
  if (pname == 35395) {
    for (var i = 0; i < result.length; i++) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((params) + (i * 4)) >> 2), "storing")] = result[i];
      checkInt32(result[i]);
    }
  } else {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = result;
    checkInt32(result);
  }
};

var _emscripten_glGetActiveUniformsiv = (program, uniformCount, uniformIndices, pname, params) => {
  GL.validateGLObjectID(GL.programs, program, "glGetActiveUniformsiv", "program");
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if params == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetActiveUniformsiv(program=" + program + ", uniformCount=" + uniformCount + ", uniformIndices=" + uniformIndices + ", pname=" + pname + ", params=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  if (uniformCount > 0 && uniformIndices == 0) {
    GL.recordError(1281);
    return;
  }
  program = GL.programs[program];
  var ids = [];
  for (var i = 0; i < uniformCount; i++) {
    ids.push((growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uniformIndices) + (i * 4)) >> 2), "loading")]);
  }
  var result = GLctx.getActiveUniforms(program, ids, pname);
  if (!result) return;
  // GL spec: If an error is generated, nothing is written out to params.
  var len = result.length;
  for (var i = 0; i < len; i++) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((params) + (i * 4)) >> 2), "storing")] = result[i];
    checkInt32(result[i]);
  }
};

var _emscripten_glGetAttachedShaders = (program, maxCount, count, shaders) => {
  GL.validateGLObjectID(GL.programs, program, "glGetAttachedShaders", "program");
  var result = GLctx.getAttachedShaders(GL.programs[program]);
  var len = result.length;
  if (len > maxCount) {
    len = maxCount;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((count) >> 2), "storing")] = len;
  checkInt32(len);
  for (var i = 0; i < len; ++i) {
    var id = GL.shaders.indexOf(result[i]);
    assert(id !== -1, "shader not bound to local id");
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((shaders) + (i * 4)) >> 2), "storing")] = id;
    checkInt32(id);
  }
};

var _emscripten_glGetAttribLocation = (program, name) => GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));

var readI53FromU64 = ptr => (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
HEAPU32), ((ptr) >> 2), "loading")] + (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
HEAPU32), (((ptr) + (4)) >> 2), "loading")] * 4294967296;

var writeI53ToI64 = (ptr, num) => {
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((ptr) >> 2), "storing")] = num;
  checkInt32(num);
  var lower = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((ptr) >> 2), "loading")];
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((ptr) + (4)) >> 2), "storing")] = (num - lower) / 4294967296;
  checkInt32((num - lower) / 4294967296);
  var deserialized = (num >= 0) ? readI53FromU64(ptr) : readI53FromI64(ptr);
  var offset = ((ptr) >> 2);
  if (deserialized != num) warnOnce(`writeI53ToI64() out of range: serialized JS Number ${num} to Wasm heap as bytes lo=${ptrToString((growMemViews(), 
  HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), offset, "loading")])}, hi=${ptrToString((growMemViews(), 
  HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), offset + 1, "loading")])}, which deserializes back to ${deserialized} instead!`);
};

var webglGetExtensions = () => {
  var exts = getEmscriptenSupportedExtensions(GLctx);
  exts = exts.concat(exts.map(e => "GL_" + e));
  return exts;
};

var emscriptenWebGLGet = (name_, p, type) => {
  // Guard against user passing a null pointer.
  // Note that GLES2 spec does not say anything about how passing a null
  // pointer should be treated.  Testing on desktop core GL 3, the application
  // crashes on glGetIntegerv to a null pointer, but better to report an error
  // instead of doing anything random.
  if (!p) {
    err(`GL_INVALID_VALUE in glGet${type}v(name=${name_}: Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  var ret = undefined;
  switch (name_) {
   // Handle a few trivial GLES values
    case 36346:
    // GL_SHADER_COMPILER
    ret = 1;
    break;

   case 36344:
    // GL_SHADER_BINARY_FORMATS
    if (type != 0 && type != 1) {
      GL.recordError(1280);
      // GL_INVALID_ENUM
      err(`GL_INVALID_ENUM in glGet${type}v(GL_SHADER_BINARY_FORMATS): Invalid parameter type!`);
    }
    // Do not write anything to the out pointer, since no binary formats are
    // supported.
    return;

   case 34814:
   // GL_NUM_PROGRAM_BINARY_FORMATS
    case 36345:
    // GL_NUM_SHADER_BINARY_FORMATS
    ret = 0;
    break;

   case 34466:
    // GL_NUM_COMPRESSED_TEXTURE_FORMATS
    // WebGL doesn't have GL_NUM_COMPRESSED_TEXTURE_FORMATS (it's obsolete
    // since GL_COMPRESSED_TEXTURE_FORMATS returns a JS array that can be
    // queried for length), so implement it ourselves to allow C++ GLES2
    // code get the length.
    var formats = GLctx.getParameter(34467);
    ret = formats ? formats.length : 0;
    break;

   case 33309:
    // GL_NUM_EXTENSIONS
    if (GL.currentContext.version < 2) {
      // Calling GLES3/WebGL2 function with a GLES2/WebGL1 context
      GL.recordError(1282);
      return;
    }
    ret = webglGetExtensions().length;
    break;

   case 33307:
   // GL_MAJOR_VERSION
    case 33308:
    // GL_MINOR_VERSION
    if (GL.currentContext.version < 2) {
      GL.recordError(1280);
      // GL_INVALID_ENUM
      return;
    }
    ret = name_ == 33307 ? 3 : 0;
    // return version 3.0
    break;
  }
  if (ret === undefined) {
    var result = GLctx.getParameter(name_);
    switch (typeof result) {
     case "number":
      ret = result;
      break;

     case "boolean":
      ret = result ? 1 : 0;
      break;

     case "string":
      GL.recordError(1280);
      // GL_INVALID_ENUM
      err(`GL_INVALID_ENUM in glGet${type}v(${name}) on a name which returns a string!`);
      return;

     case "object":
      if (result === null) {
        // null is a valid result for some (e.g., which buffer is bound -
        // perhaps nothing is bound), but otherwise can mean an invalid
        // name_, which we need to report as an error
        switch (name_) {
         case 34964:
         // ARRAY_BUFFER_BINDING
          case 35725:
         // CURRENT_PROGRAM
          case 34965:
         // ELEMENT_ARRAY_BUFFER_BINDING
          case 36006:
         // FRAMEBUFFER_BINDING or DRAW_FRAMEBUFFER_BINDING
          case 36007:
         // RENDERBUFFER_BINDING
          case 32873:
         // TEXTURE_BINDING_2D
          case 34229:
         // WebGL 2 GL_VERTEX_ARRAY_BINDING, or WebGL 1 extension OES_vertex_array_object GL_VERTEX_ARRAY_BINDING_OES
          case 36662:
         // COPY_READ_BUFFER_BINDING or COPY_READ_BUFFER
          case 36663:
         // COPY_WRITE_BUFFER_BINDING or COPY_WRITE_BUFFER
          case 35053:
         // PIXEL_PACK_BUFFER_BINDING
          case 35055:
         // PIXEL_UNPACK_BUFFER_BINDING
          case 36010:
         // READ_FRAMEBUFFER_BINDING
          case 35097:
         // SAMPLER_BINDING
          case 35869:
         // TEXTURE_BINDING_2D_ARRAY
          case 32874:
         // TEXTURE_BINDING_3D
          case 36389:
         // TRANSFORM_FEEDBACK_BINDING
          case 35983:
         // TRANSFORM_FEEDBACK_BUFFER_BINDING
          case 35368:
         // UNIFORM_BUFFER_BINDING
          case 34068:
          {
            // TEXTURE_BINDING_CUBE_MAP
            ret = 0;
            break;
          }

         default:
          {
            GL.recordError(1280);
            // GL_INVALID_ENUM
            err(`GL_INVALID_ENUM in glGet${type}v(${name}) and it returns null!`);
            return;
          }
        }
      } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
        for (var i = 0; i < result.length; ++i) {
          switch (type) {
           case 0:
            (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((p) + (i * 4)) >> 2), "storing")] = result[i];
            checkInt32(result[i]);
            break;

           case 2:
            (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((p) + (i * 4)) >> 2), "storing")] = result[i];
            break;

           case 4:
            (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (p) + (i), "storing")] = result[i] ? 1 : 0;
            checkInt8(result[i] ? 1 : 0);
            break;

           default:
            abort(`internal glGet error, bad type: ${type}`);
          }
        }
        return;
      } else {
        try {
          ret = result.name | 0;
        } catch (e) {
          GL.recordError(1280);
          // GL_INVALID_ENUM
          err(`GL_INVALID_ENUM in glGet${type}v: Unknown object returned from WebGL getParameter(${name_})! (error: ${e})`);
          return;
        }
      }
      break;

     default:
      GL.recordError(1280);
      // GL_INVALID_ENUM
      err(`GL_INVALID_ENUM in glGet${type}v: Native code calling glGet${type}v(${name_}) and it returns ${result} of type ${typeof (result)}!`);
      return;
    }
  }
  switch (type) {
   case 1:
    writeI53ToI64(p, ret);
    break;

   case 0:
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = ret;
    checkInt32(ret);
    break;

   case 2:
    (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((p) >> 2), "storing")] = ret;
    break;

   case 4:
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), p, "storing")] = ret ? 1 : 0;
    checkInt8(ret ? 1 : 0);
    break;

   default:
    abort(`internal glGet error, bad type: ${type}`);
  }
};

var _emscripten_glGetBooleanv = (name_, p) => emscriptenWebGLGet(name_, p, 4);

var _emscripten_glGetBufferParameteri64v = (target, value, data) => {
  if (!data) {
    // GLES2 specification does not specify how to behave if data is a null pointer. Since calling this function does not make sense
    // if data == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetBufferParameteri64v(target=" + target + ", value=" + value + ", data=0): Function called with null out data pointer!");
    GL.recordError(1281);
    return;
  }
  writeI53ToI64(data, GLctx.getBufferParameter(target, value));
};

var _emscripten_glGetBufferParameteriv = (target, value, data) => {
  if (!data) {
    // GLES2 specification does not specify how to behave if data is a null
    // pointer. Since calling this function does not make sense if data ==
    // null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetBufferParameteriv(target=${target}, value=${value}, data=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((data) >> 2), "storing")] = GLctx.getBufferParameter(target, value);
  checkInt32(GLctx.getBufferParameter(target, value));
};

var _emscripten_glGetBufferPointerv = (target, pname, params) => {
  if (pname == 35005) {
    var ptr = 0;
    var mappedBuffer = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
    if (mappedBuffer) {
      ptr = mappedBuffer.mem;
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = ptr;
    checkInt32(ptr);
  } else {
    GL.recordError(1280);
    err("GL_INVALID_ENUM in glGetBufferPointerv");
  }
};

var _emscripten_glGetError = () => {
  var error = GLctx.getError() || GL.lastError;
  GL.lastError = 0;
  return error;
};

var _emscripten_glGetFloatv = (name_, p) => emscriptenWebGLGet(name_, p, 2);

var _emscripten_glGetFragDataLocation = (program, name) => {
  GL.validateGLObjectID(GL.programs, program, "glGetFragDataLocation", "program");
  return GLctx.getFragDataLocation(GL.programs[program], UTF8ToString(name));
};

var _emscripten_glGetFramebufferAttachmentParameteriv = (target, attachment, pname, params) => {
  var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
  if (result instanceof WebGLRenderbuffer || result instanceof WebGLTexture) {
    result = result.name | 0;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = result;
  checkInt32(result);
};

var emscriptenWebGLGetIndexed = (target, index, data, type) => {
  if (!data) {
    // GLES2 specification does not specify how to behave if data is a null pointer. Since calling this function does not make sense
    // if data == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetInteger(64)i_v(target=" + target + ", index=" + index + ", data=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  var result = GLctx.getIndexedParameter(target, index);
  var ret;
  switch (typeof result) {
   case "boolean":
    ret = result ? 1 : 0;
    break;

   case "number":
    ret = result;
    break;

   case "object":
    if (result === null) {
      switch (target) {
       case 35983:
       // TRANSFORM_FEEDBACK_BUFFER_BINDING
        case 35368:
        // UNIFORM_BUFFER_BINDING
        ret = 0;
        break;

       default:
        {
          GL.recordError(1280);
          // GL_INVALID_ENUM
          err("GL_INVALID_ENUM in glGetInteger(64)i_v(" + target + ") and it returns null!");
          return;
        }
      }
    } else if (result instanceof WebGLBuffer) {
      ret = result.name | 0;
    } else {
      GL.recordError(1280);
      // GL_INVALID_ENUM
      err("GL_INVALID_ENUM in glGetInteger(64)i_v: Unknown object returned from WebGL getIndexedParameter(" + target + ")!");
      return;
    }
    break;

   default:
    GL.recordError(1280);
    // GL_INVALID_ENUM
    err("GL_INVALID_ENUM in glGetInteger(64)i_v: Native code calling glGetInteger(64)i_v(" + target + ") and it returns " + result + " of type " + typeof (result) + "!");
    return;
  }
  switch (type) {
   case 1:
    writeI53ToI64(data, ret);
    break;

   case 0:
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((data) >> 2), "storing")] = ret;
    checkInt32(ret);
    break;

   case 2:
    (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((data) >> 2), "storing")] = ret;
    break;

   case 4:
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), data, "storing")] = ret ? 1 : 0;
    checkInt8(ret ? 1 : 0);
    break;

   default:
    abort("internal emscriptenWebGLGetIndexed() error, bad type: " + type);
  }
};

var _emscripten_glGetInteger64i_v = (target, index, data) => emscriptenWebGLGetIndexed(target, index, data, 1);

var _emscripten_glGetInteger64v = (name_, p) => {
  emscriptenWebGLGet(name_, p, 1);
};

var _emscripten_glGetIntegeri_v = (target, index, data) => emscriptenWebGLGetIndexed(target, index, data, 0);

var _emscripten_glGetIntegerv = (name_, p) => emscriptenWebGLGet(name_, p, 0);

var _emscripten_glGetInternalformativ = (target, internalformat, pname, bufSize, params) => {
  if (bufSize < 0) {
    err("GL_INVALID_VALUE in glGetInternalformativ(target=" + target + ", internalformat=" + internalformat + ", pname=" + pname + ", bufSize=" + bufSize + ", params=" + params + "): Function called with bufSize < 0!");
    GL.recordError(1281);
    return;
  }
  if (!params) {
    // GLES3 specification does not specify how to behave if values is a null pointer. Since calling this function does not make sense
    // if values == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetInternalformativ(target=" + target + ", internalformat=" + internalformat + ", pname=" + pname + ", bufSize=" + bufSize + ", params=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  var ret = GLctx.getInternalformatParameter(target, internalformat, pname);
  if (ret === null) return;
  for (var i = 0; i < ret.length && i < bufSize; ++i) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((params) + (i * 4)) >> 2), "storing")] = ret[i];
    checkInt32(ret[i]);
  }
};

var _emscripten_glGetProgramBinary = (program, bufSize, length, binaryFormat, binary) => {
  GL.recordError(1282);
  err("GL_INVALID_OPERATION in glGetProgramBinary: WebGL does not support binary shader formats! Calls to glGetProgramBinary always fail. See https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.4");
};

var _emscripten_glGetProgramInfoLog = (program, maxLength, length, infoLog) => {
  GL.validateGLObjectID(GL.programs, program, "glGetProgramInfoLog", "program");
  var log = GLctx.getProgramInfoLog(GL.programs[program]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = numBytesWrittenExclNull;
  checkInt32(numBytesWrittenExclNull);
};

var _emscripten_glGetProgramiv = (program, pname, p) => {
  if (!p) {
    // GLES2 specification does not specify how to behave if p is a null
    // pointer. Since calling this function does not make sense if p == null,
    // issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetProgramiv(program=${program}, pname=${pname}, p=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  GL.validateGLObjectID(GL.programs, program, "glGetProgramiv", "program");
  if (program >= GL.counter) {
    err(`GL_INVALID_VALUE in glGetProgramiv(program=${program}, pname=${pname}, p=${ptrToString(p)}): The specified program object name was not generated by GL!`);
    GL.recordError(1281);
    return;
  }
  program = GL.programs[program];
  if (pname == 35716) {
    // GL_INFO_LOG_LENGTH
    var log = GLctx.getProgramInfoLog(program);
    if (log === null) log = "(unknown error)";
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = log.length + 1;
    checkInt32(log.length + 1);
  } else if (pname == 35719) {
    if (!program.maxUniformLength) {
      var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
      for (var i = 0; i < numActiveUniforms; ++i) {
        program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1);
      }
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = program.maxUniformLength;
    checkInt32(program.maxUniformLength);
  } else if (pname == 35722) {
    if (!program.maxAttributeLength) {
      var numActiveAttributes = GLctx.getProgramParameter(program, 35721);
      for (var i = 0; i < numActiveAttributes; ++i) {
        program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1);
      }
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = program.maxAttributeLength;
    checkInt32(program.maxAttributeLength);
  } else if (pname == 35381) {
    if (!program.maxUniformBlockNameLength) {
      var numActiveUniformBlocks = GLctx.getProgramParameter(program, 35382);
      for (var i = 0; i < numActiveUniformBlocks; ++i) {
        program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1);
      }
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = program.maxUniformBlockNameLength;
    checkInt32(program.maxUniformBlockNameLength);
  } else {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = GLctx.getProgramParameter(program, pname);
    checkInt32(GLctx.getProgramParameter(program, pname));
  }
};

var _emscripten_glGetQueryObjecti64vEXT = (id, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if p == null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetQueryObject(u)i64vEXT(id=${id}, pname=${pname}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  GL.validateGLObjectID(GL.queries, id, "glGetQueryObjecti64vEXT", "id");
  var query = GL.queries[id];
  var param;
  if (GL.currentContext.version < 2) {
    param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
  } else {
    param = GLctx.getQueryParameter(query, pname);
  }
  var ret;
  if (typeof param == "boolean") {
    ret = param ? 1 : 0;
  } else {
    ret = param;
  }
  writeI53ToI64(params, ret);
};

var _emscripten_glGetQueryObjectivEXT = (id, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if p == null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetQueryObject(u)ivEXT(id=${id}, pname=${pname}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  GL.validateGLObjectID(GL.queries, id, "glGetQueryObjectivEXT", "id");
  var query = GL.queries[id];
  var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
  var ret;
  if (typeof param == "boolean") {
    ret = param ? 1 : 0;
  } else {
    ret = param;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = ret;
  checkInt32(ret);
};

var _glGetQueryObjecti64vEXT = _emscripten_glGetQueryObjecti64vEXT;

var _emscripten_glGetQueryObjectui64vEXT = _glGetQueryObjecti64vEXT;

var _emscripten_glGetQueryObjectuiv = (id, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if p == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetQueryObjectuiv(id=" + id + ", pname=" + pname + ", params=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  GL.validateGLObjectID(GL.queries, id, "glGetQueryObjectuiv", "id");
  var query = GL.queries[id];
  var param = GLctx.getQueryParameter(query, pname);
  var ret;
  if (typeof param == "boolean") {
    ret = param ? 1 : 0;
  } else {
    ret = param;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = ret;
  checkInt32(ret);
};

var _glGetQueryObjectivEXT = _emscripten_glGetQueryObjectivEXT;

var _emscripten_glGetQueryObjectuivEXT = _glGetQueryObjectivEXT;

var _emscripten_glGetQueryiv = (target, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if p == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetQueryiv(target=" + target + ", pname=" + pname + ", params=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = GLctx.getQuery(target, pname);
  checkInt32(GLctx.getQuery(target, pname));
};

var _emscripten_glGetQueryivEXT = (target, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if p == null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetQueryivEXT(target=${target}, pname=${pname}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = GLctx.disjointTimerQueryExt["getQueryEXT"](target, pname);
  checkInt32(GLctx.disjointTimerQueryExt["getQueryEXT"](target, pname));
};

var _emscripten_glGetRenderbufferParameteriv = (target, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if params == null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetRenderbufferParameteriv(target=${target}, pname=${pname}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = GLctx.getRenderbufferParameter(target, pname);
  checkInt32(GLctx.getRenderbufferParameter(target, pname));
};

var _emscripten_glGetSamplerParameterfv = (sampler, pname, params) => {
  if (!params) {
    // GLES3 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if p == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetSamplerParameterfv(sampler=" + sampler + ", pname=" + pname + ", params=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((params) >> 2), "storing")] = GLctx.getSamplerParameter(GL.samplers[sampler], pname);
};

var _emscripten_glGetSamplerParameteriv = (sampler, pname, params) => {
  if (!params) {
    // GLES3 specification does not specify how to behave if params is a null pointer. Since calling this function does not make sense
    // if p == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetSamplerParameteriv(sampler=" + sampler + ", pname=" + pname + ", params=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = GLctx.getSamplerParameter(GL.samplers[sampler], pname);
  checkInt32(GLctx.getSamplerParameter(GL.samplers[sampler], pname));
};

var _emscripten_glGetShaderInfoLog = (shader, maxLength, length, infoLog) => {
  GL.validateGLObjectID(GL.shaders, shader, "glGetShaderInfoLog", "shader");
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = numBytesWrittenExclNull;
  checkInt32(numBytesWrittenExclNull);
};

var _emscripten_glGetShaderPrecisionFormat = (shaderType, precisionType, range, precision) => {
  var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((range) >> 2), "storing")] = result.rangeMin;
  checkInt32(result.rangeMin);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((range) + (4)) >> 2), "storing")] = result.rangeMax;
  checkInt32(result.rangeMax);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((precision) >> 2), "storing")] = result.precision;
  checkInt32(result.precision);
};

var _emscripten_glGetShaderSource = (shader, bufSize, length, source) => {
  GL.validateGLObjectID(GL.shaders, shader, "glGetShaderSource", "shader");
  var result = GLctx.getShaderSource(GL.shaders[shader]);
  if (!result) return;
  // If an error occurs, nothing will be written to length or source.
  var numBytesWrittenExclNull = (bufSize > 0 && source) ? stringToUTF8(result, source, bufSize) : 0;
  if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = numBytesWrittenExclNull;
  checkInt32(numBytesWrittenExclNull);
};

var _emscripten_glGetShaderiv = (shader, pname, p) => {
  if (!p) {
    // GLES2 specification does not specify how to behave if p is a null
    // pointer. Since calling this function does not make sense if p == null,
    // issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetShaderiv(shader=${shader}, pname=${pname}, p=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  GL.validateGLObjectID(GL.shaders, shader, "glGetShaderiv", "shader");
  if (pname == 35716) {
    // GL_INFO_LOG_LENGTH
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    // The GLES2 specification says that if the shader has an empty info log,
    // a value of 0 is returned. Otherwise the log has a null char appended.
    // (An empty string is falsey, so we can just check that instead of
    // looking at log.length.)
    var logLength = log ? log.length + 1 : 0;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = logLength;
    checkInt32(logLength);
  } else if (pname == 35720) {
    // GL_SHADER_SOURCE_LENGTH
    var source = GLctx.getShaderSource(GL.shaders[shader]);
    // source may be a null, or the empty string, both of which are falsey
    // values that we report a 0 length for.
    var sourceLength = source ? source.length + 1 : 0;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = sourceLength;
    checkInt32(sourceLength);
  } else {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((p) >> 2), "storing")] = GLctx.getShaderParameter(GL.shaders[shader], pname);
    checkInt32(GLctx.getShaderParameter(GL.shaders[shader], pname));
  }
};

var _emscripten_glGetString = name_ => {
  var ret = GL.stringCache[name_];
  if (!ret) {
    switch (name_) {
     case 7939:
      ret = stringToNewUTF8(webglGetExtensions().join(" "));
      break;

     case 7936:
     case 7937:
     case 37445:
     case 37446:
      var s = GLctx.getParameter(name_);
      if (!s) {
        GL.recordError(1280);
        // This occurs e.g. if one attempts GL_UNMASKED_VENDOR_WEBGL when it is not supported.
        err(`GL_INVALID_ENUM in glGetString: Received empty parameter for query name ${name_}!`);
      }
      ret = s ? stringToNewUTF8(s) : 0;
      break;

     case 7938:
      var webGLVersion = GLctx.getParameter(7938);
      // return GLES version string corresponding to the version of the WebGL context
      var glVersion = `OpenGL ES 2.0 (${webGLVersion})`;
      if (GL.currentContext.version >= 2) glVersion = `OpenGL ES 3.0 (${webGLVersion})`;
      ret = stringToNewUTF8(glVersion);
      break;

     case 35724:
      var glslVersion = GLctx.getParameter(35724);
      // extract the version number 'N.M' from the string 'WebGL GLSL ES N.M ...'
      var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
      var ver_num = glslVersion.match(ver_re);
      if (ver_num !== null) {
        if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
        // ensure minor version has 2 digits
        glslVersion = `OpenGL ES GLSL ES ${ver_num[1]} (${glslVersion})`;
      }
      ret = stringToNewUTF8(glslVersion);
      break;

     default:
      GL.recordError(1280);
      err(`GL_INVALID_ENUM in glGetString: Unknown parameter ${name_}!`);
    }
    GL.stringCache[name_] = ret;
  }
  return ret;
};

var _emscripten_glGetStringi = (name, index) => {
  if (GL.currentContext.version < 2) {
    GL.recordError(1282);
    // Calling GLES3/WebGL2 function with a GLES2/WebGL1 context
    return 0;
  }
  var stringiCache = GL.stringiCache[name];
  if (stringiCache) {
    if (index < 0 || index >= stringiCache.length) {
      GL.recordError(1281);
      err("GL_INVALID_VALUE in glGetStringi: index out of range (" + index + ")!");
      return 0;
    }
    return stringiCache[index];
  }
  switch (name) {
   case 7939:
    var exts = webglGetExtensions().map(stringToNewUTF8);
    stringiCache = GL.stringiCache[name] = exts;
    if (index < 0 || index >= stringiCache.length) {
      GL.recordError(1281);
      err("GL_INVALID_VALUE in glGetStringi: index out of range (" + index + ") in a call to GL_EXTENSIONS!");
      return 0;
    }
    return stringiCache[index];

   default:
    GL.recordError(1280);
    err("GL_INVALID_ENUM in glGetStringi: Unknown parameter " + name + "!");
    return 0;
  }
};

var _emscripten_glGetSynciv = (sync, pname, bufSize, length, values) => {
  if (bufSize < 0) {
    // GLES3 specification does not specify how to behave if bufSize < 0, however in the spec wording for glGetInternalformativ, it does say that GL_INVALID_VALUE should be raised,
    // so raise GL_INVALID_VALUE here as well.
    err("GL_INVALID_VALUE in glGetSynciv(sync=" + sync + ", pname=" + pname + ", bufSize=" + bufSize + ", length=" + length + ", values=" + values + "): Function called with bufSize < 0!");
    GL.recordError(1281);
    return;
  }
  if (!values) {
    // GLES3 specification does not specify how to behave if values is a null pointer. Since calling this function does not make sense
    // if values == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetSynciv(sync=" + sync + ", pname=" + pname + ", bufSize=" + bufSize + ", length=" + length + ", values=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  var ret = GLctx.getSyncParameter(GL.syncs[sync], pname);
  if (ret !== null) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((values) >> 2), "storing")] = ret;
    checkInt32(ret);
    if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = 1;
    checkInt32(1);
  }
};

var _emscripten_glGetTexParameterfv = (target, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null
    // pointer. Since calling this function does not make sense if p == null,
    // issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetTexParameterfv(target=${target}, pname=${pname}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((params) >> 2), "storing")] = GLctx.getTexParameter(target, pname);
};

var _emscripten_glGetTexParameteriv = (target, pname, params) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null
    // pointer. Since calling this function does not make sense if p == null,
    // issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetTexParameteriv(target=${target}, pname=${pname}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = GLctx.getTexParameter(target, pname);
  checkInt32(GLctx.getTexParameter(target, pname));
};

var _emscripten_glGetTransformFeedbackVarying = (program, index, bufSize, length, size, type, name) => {
  GL.validateGLObjectID(GL.programs, program, "glGetTransformFeedbackVarying", "program");
  program = GL.programs[program];
  var info = GLctx.getTransformFeedbackVarying(program, index);
  if (!info) return;
  // If an error occurred, the return parameters length, size, type and name will be unmodified.
  if (name && bufSize > 0) {
    var numBytesWrittenExclNull = stringToUTF8(info.name, name, bufSize);
    if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = numBytesWrittenExclNull;
    checkInt32(numBytesWrittenExclNull);
  } else {
    if (length) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((length) >> 2), "storing")] = 0;
    checkInt32(0);
  }
  if (size) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((size) >> 2), "storing")] = info.size;
  checkInt32(info.size);
  if (type) (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((type) >> 2), "storing")] = info.type;
  checkInt32(info.type);
};

var _emscripten_glGetUniformBlockIndex = (program, uniformBlockName) => {
  GL.validateGLObjectID(GL.programs, program, "glGetUniformBlockIndex", "program");
  return GLctx.getUniformBlockIndex(GL.programs[program], UTF8ToString(uniformBlockName));
};

var _emscripten_glGetUniformIndices = (program, uniformCount, uniformNames, uniformIndices) => {
  GL.validateGLObjectID(GL.programs, program, "glGetUniformIndices", "program");
  if (!uniformIndices) {
    // GLES2 specification does not specify how to behave if uniformIndices is a null pointer. Since calling this function does not make sense
    // if uniformIndices == null, issue a GL error to notify user about it.
    err("GL_INVALID_VALUE in glGetUniformIndices(program=" + program + ", uniformCount=" + uniformCount + ", uniformNames=" + uniformNames + ", uniformIndices=0): Function called with null out pointer!");
    GL.recordError(1281);
    return;
  }
  if (uniformCount > 0 && (uniformNames == 0 || uniformIndices == 0)) {
    GL.recordError(1281);
    return;
  }
  program = GL.programs[program];
  var names = [];
  for (var i = 0; i < uniformCount; i++) names.push(UTF8ToString((growMemViews(), 
  HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((uniformNames) + (i * 4)) >> 2), "loading")]));
  var result = GLctx.getUniformIndices(program, names);
  if (!result) return;
  // GL spec: If an error is generated, nothing is written out to uniformIndices.
  var len = result.length;
  for (var i = 0; i < len; i++) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uniformIndices) + (i * 4)) >> 2), "storing")] = result[i];
    checkInt32(result[i]);
  }
};

/** @suppress {checkTypes} */ var jstoi_q = str => parseInt(str);

/** @noinline */ var webglGetLeftBracePos = name => name.slice(-1) == "]" && name.lastIndexOf("[");

var webglPrepareUniformLocationsBeforeFirstUse = program => {
  var uniformLocsById = program.uniformLocsById, // Maps GLuint -> WebGLUniformLocation
  uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, // Maps name -> [uniform array length, GLuint]
  i, j;
  // On the first time invocation of glGetUniformLocation on this shader program:
  // initialize cache data structures and discover which uniforms are arrays.
  if (!uniformLocsById) {
    // maps GLint integer locations to WebGLUniformLocations
    program.uniformLocsById = uniformLocsById = {};
    // maps integer locations back to uniform name strings, so that we can lazily fetch uniform array locations
    program.uniformArrayNamesById = {};
    var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
    for (i = 0; i < numActiveUniforms; ++i) {
      var u = GLctx.getActiveUniform(program, i);
      var nm = u.name;
      var sz = u.size;
      var lb = webglGetLeftBracePos(nm);
      var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
      // Assign a new location.
      var id = program.uniformIdCounter;
      program.uniformIdCounter += sz;
      // Eagerly get the location of the uniformArray[0] base element.
      // The remaining indices >0 will be left for lazy evaluation to
      // improve performance. Those may never be needed to fetch, if the
      // application fills arrays always in full starting from the first
      // element of the array.
      uniformSizeAndIdsByName[arrayName] = [ sz, id ];
      // Store placeholder integers in place that highlight that these
      // >0 index locations are array indices pending population.
      for (j = 0; j < sz; ++j) {
        uniformLocsById[id] = j;
        program.uniformArrayNamesById[id++] = arrayName;
      }
    }
  }
};

var _emscripten_glGetUniformLocation = (program, name) => {
  GL.validateGLObjectID(GL.programs, program, "glGetUniformLocation", "program");
  name = UTF8ToString(name);
  assert(!name.includes(" "), `Uniform names passed to glGetUniformLocation() should not contain spaces! (received "${name}")`);
  if (program = GL.programs[program]) {
    webglPrepareUniformLocationsBeforeFirstUse(program);
    var uniformLocsById = program.uniformLocsById;
    // Maps GLuint -> WebGLUniformLocation
    var arrayIndex = 0;
    var uniformBaseName = name;
    // Invariant: when populating integer IDs for uniform locations, we must
    // maintain the precondition that arrays reside in contiguous addresses,
    // i.e. for a 'vec4 colors[10];', colors[4] must be at location
    // colors[0]+4.  However, user might call glGetUniformLocation(program,
    // "colors") for an array, so we cannot discover based on the user input
    // arguments whether the uniform we are dealing with is an array. The only
    // way to discover which uniforms are arrays is to enumerate over all the
    // active uniforms in the program.
    var leftBrace = webglGetLeftBracePos(name);
    // If user passed an array accessor "[index]", parse the array index off the accessor.
    if (leftBrace > 0) {
      assert(name.slice(leftBrace + 1).length == 1 || !isNaN(jstoi_q(name.slice(leftBrace + 1))), `Malformed input parameter name "${name}" passed to glGetUniformLocation!`);
      arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
      // "index]", coerce parseInt(']') with >>>0 to treat "foo[]" as "foo[0]" and foo[-1] as unsigned out-of-bounds.
      uniformBaseName = name.slice(0, leftBrace);
    }
    // Have we cached the location of this uniform before?
    // A pair [array length, GLint of the uniform location]
    var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
    // If an uniform with this name exists, and if its index is within the
    // array limits (if it's even an array), query the WebGLlocation, or
    // return an existing cached location.
    if (sizeAndId && arrayIndex < sizeAndId[0]) {
      arrayIndex += sizeAndId[1];
      // Add the base location of the uniform to the array index offset.
      if ((uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name))) {
        return arrayIndex;
      }
    }
  } else {
    // N.b. we are currently unable to distinguish between GL program IDs that
    // never existed vs GL program IDs that have been deleted, so report
    // GL_INVALID_VALUE in both cases.
    GL.recordError(1281);
  }
  return -1;
};

var webglGetUniformLocation = location => {
  var p = GLctx.currentProgram;
  if (p) {
    var webglLoc = p.uniformLocsById[location];
    // p.uniformLocsById[location] stores either an integer, or a
    // WebGLUniformLocation.
    // If an integer, we have not yet bound the location, so do it now. The
    // integer value specifies the array index we should bind to.
    if (typeof webglLoc == "number") {
      p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? `[${webglLoc}]` : ""));
    }
    // Else an already cached WebGLUniformLocation, return it.
    return webglLoc;
  } else {
    GL.recordError(1282);
  }
};

/** @suppress{checkTypes} */ var emscriptenWebGLGetUniform = (program, location, params, type) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null
    // pointer. Since calling this function does not make sense if params ==
    // null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetUniform*v(program=${program}, location=${location}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  GL.validateGLObjectID(GL.programs, program, "glGetUniform*v", "program");
  GL.validateGLObjectID(program.uniformLocsById, location, "glGetUniform*v", "location");
  program = GL.programs[program];
  webglPrepareUniformLocationsBeforeFirstUse(program);
  var data = GLctx.getUniform(program, webglGetUniformLocation(location));
  if (typeof data == "number" || typeof data == "boolean") {
    switch (type) {
     case 0:
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = data;
      checkInt32(data);
      break;

     case 2:
      (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((params) >> 2), "storing")] = data;
      break;

     default:
      abort("internal emscriptenWebGLGetUniform() error, bad type: " + type);
    }
  } else {
    for (var i = 0; i < data.length; i++) {
      switch (type) {
       case 0:
        (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((params) + (i * 4)) >> 2), "storing")] = data[i];
        checkInt32(data[i]);
        break;

       case 2:
        (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((params) + (i * 4)) >> 2), "storing")] = data[i];
        break;

       default:
        abort("internal emscriptenWebGLGetUniform() error, bad type: " + type);
      }
    }
  }
};

var _emscripten_glGetUniformfv = (program, location, params) => {
  emscriptenWebGLGetUniform(program, location, params, 2);
};

var _emscripten_glGetUniformiv = (program, location, params) => {
  emscriptenWebGLGetUniform(program, location, params, 0);
};

var _emscripten_glGetUniformuiv = (program, location, params) => emscriptenWebGLGetUniform(program, location, params, 0);

/** @suppress{checkTypes} */ var emscriptenWebGLGetVertexAttrib = (index, pname, params, type) => {
  if (!params) {
    // GLES2 specification does not specify how to behave if params is a null
    // pointer. Since calling this function does not make sense if params ==
    // null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetVertexAttrib*v(index=${index}, pname=${pname}, params=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  if (GL.currentContext.clientBuffers[index].enabled) {
    err("glGetVertexAttrib*v on client-side array: not supported, bad data returned");
  }
  var data = GLctx.getVertexAttrib(index, pname);
  if (pname == 34975) {
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = data && data["name"];
    checkInt32(data && data["name"]);
  } else if (typeof data == "number" || typeof data == "boolean") {
    switch (type) {
     case 0:
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = data;
      checkInt32(data);
      break;

     case 2:
      (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((params) >> 2), "storing")] = data;
      break;

     case 5:
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "storing")] = Math.fround(data);
      checkInt32(Math.fround(data));
      break;

     default:
      abort("internal emscriptenWebGLGetVertexAttrib() error, bad type: " + type);
    }
  } else {
    for (var i = 0; i < data.length; i++) {
      switch (type) {
       case 0:
        (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((params) + (i * 4)) >> 2), "storing")] = data[i];
        checkInt32(data[i]);
        break;

       case 2:
        (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((params) + (i * 4)) >> 2), "storing")] = data[i];
        break;

       case 5:
        (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((params) + (i * 4)) >> 2), "storing")] = Math.fround(data[i]);
        checkInt32(Math.fround(data[i]));
        break;

       default:
        abort("internal emscriptenWebGLGetVertexAttrib() error, bad type: " + type);
      }
    }
  }
};

var _emscripten_glGetVertexAttribIiv = (index, pname, params) => {
  // N.B. This function may only be called if the vertex attribute was specified using the function glVertexAttribI4iv(),
  // otherwise the results are undefined. (GLES3 spec 6.1.12)
  emscriptenWebGLGetVertexAttrib(index, pname, params, 0);
};

var _glGetVertexAttribIiv = _emscripten_glGetVertexAttribIiv;

var _emscripten_glGetVertexAttribIuiv = _glGetVertexAttribIiv;

var _emscripten_glGetVertexAttribPointerv = (index, pname, pointer) => {
  if (!pointer) {
    // GLES2 specification does not specify how to behave if pointer is a null
    // pointer. Since calling this function does not make sense if pointer ==
    // null, issue a GL error to notify user about it.
    err(`GL_INVALID_VALUE in glGetVertexAttribPointerv(index=${index}, pname=${pname}, pointer=0): Function called with null out pointer!`);
    GL.recordError(1281);
    return;
  }
  if (GL.currentContext.clientBuffers[index].enabled) {
    err("glGetVertexAttribPointer on client-side array: not supported, bad data returned");
  }
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((pointer) >> 2), "storing")] = GLctx.getVertexAttribOffset(index, pname);
  checkInt32(GLctx.getVertexAttribOffset(index, pname));
};

var _emscripten_glGetVertexAttribfv = (index, pname, params) => {
  // N.B. This function may only be called if the vertex attribute was
  // specified using the function glVertexAttrib*f(), otherwise the results
  // are undefined. (GLES3 spec 6.1.12)
  emscriptenWebGLGetVertexAttrib(index, pname, params, 2);
};

var _emscripten_glGetVertexAttribiv = (index, pname, params) => {
  // N.B. This function may only be called if the vertex attribute was
  // specified using the function glVertexAttrib*f(), otherwise the results
  // are undefined. (GLES3 spec 6.1.12)
  emscriptenWebGLGetVertexAttrib(index, pname, params, 5);
};

var _emscripten_glHint = (x0, x1) => GLctx.hint(x0, x1);

var _emscripten_glInvalidateFramebuffer = (target, numAttachments, attachments) => {
  assert(numAttachments < tempFixedLengthArray.length, "Invalid count of numAttachments=" + numAttachments + " passed to glInvalidateFramebuffer (that many attachment points do not exist in GL)");
  var list = tempFixedLengthArray[numAttachments];
  for (var i = 0; i < numAttachments; i++) {
    list[i] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((attachments) + (i * 4)) >> 2), "loading")];
  }
  GLctx.invalidateFramebuffer(target, list);
};

var _emscripten_glInvalidateSubFramebuffer = (target, numAttachments, attachments, x, y, width, height) => {
  assert(numAttachments < tempFixedLengthArray.length, "Invalid count of numAttachments=" + numAttachments + " passed to glInvalidateSubFramebuffer (that many attachment points do not exist in GL)");
  var list = tempFixedLengthArray[numAttachments];
  for (var i = 0; i < numAttachments; i++) {
    list[i] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((attachments) + (i * 4)) >> 2), "loading")];
  }
  GLctx.invalidateSubFramebuffer(target, list, x, y, width, height);
};

var _emscripten_glIsBuffer = buffer => {
  var b = GL.buffers[buffer];
  if (!b) return 0;
  return GLctx.isBuffer(b);
};

var _emscripten_glIsEnabled = x0 => GLctx.isEnabled(x0);

var _emscripten_glIsFramebuffer = framebuffer => {
  var fb = GL.framebuffers[framebuffer];
  if (!fb) return 0;
  return GLctx.isFramebuffer(fb);
};

var _emscripten_glIsProgram = program => {
  program = GL.programs[program];
  if (!program) return 0;
  return GLctx.isProgram(program);
};

var _emscripten_glIsQuery = id => {
  var query = GL.queries[id];
  if (!query) return 0;
  return GLctx.isQuery(query);
};

var _emscripten_glIsQueryEXT = id => {
  var query = GL.queries[id];
  if (!query) return 0;
  return GLctx.disjointTimerQueryExt["isQueryEXT"](query);
};

var _emscripten_glIsRenderbuffer = renderbuffer => {
  var rb = GL.renderbuffers[renderbuffer];
  if (!rb) return 0;
  return GLctx.isRenderbuffer(rb);
};

var _emscripten_glIsSampler = id => {
  var sampler = GL.samplers[id];
  if (!sampler) return 0;
  return GLctx.isSampler(sampler);
};

var _emscripten_glIsShader = shader => {
  var s = GL.shaders[shader];
  if (!s) return 0;
  return GLctx.isShader(s);
};

var _emscripten_glIsSync = sync => GLctx.isSync(GL.syncs[sync]);

var _emscripten_glIsTexture = id => {
  var texture = GL.textures[id];
  if (!texture) return 0;
  return GLctx.isTexture(texture);
};

var _emscripten_glIsTransformFeedback = id => GLctx.isTransformFeedback(GL.transformFeedbacks[id]);

var _emscripten_glIsVertexArray = array => {
  assert(GLctx.isVertexArray, "Must have WebGL2 or OES_vertex_array_object to use vao");
  var vao = GL.vaos[array];
  if (!vao) return 0;
  return GLctx.isVertexArray(vao);
};

var _glIsVertexArray = _emscripten_glIsVertexArray;

var _emscripten_glIsVertexArrayOES = _glIsVertexArray;

var _emscripten_glLineWidth = x0 => GLctx.lineWidth(x0);

var _emscripten_glLinkProgram = program => {
  GL.validateGLObjectID(GL.programs, program, "glLinkProgram", "program");
  program = GL.programs[program];
  GLctx.linkProgram(program);
  // Invalidate earlier computed uniform->ID mappings, those have now become stale
  program.uniformLocsById = 0;
  // Mark as null-like so that glGetUniformLocation() knows to populate this again.
  program.uniformSizeAndIdsByName = {};
};

var _emscripten_glMapBufferRange = (target, offset, length, access) => {
  if ((access & (1 | 32)) != 0) {
    err("glMapBufferRange access does not support MAP_READ or MAP_UNSYNCHRONIZED");
    return 0;
  }
  if ((access & 2) == 0) {
    err("glMapBufferRange access must include MAP_WRITE");
    return 0;
  }
  if ((access & (4 | 8)) == 0) {
    err("glMapBufferRange access must include INVALIDATE_BUFFER or INVALIDATE_RANGE");
    return 0;
  }
  if (!emscriptenWebGLValidateMapBufferTarget(target)) {
    GL.recordError(1280);
    err("GL_INVALID_ENUM in glMapBufferRange");
    return 0;
  }
  var mem = _malloc(length), binding = emscriptenWebGLGetBufferBinding(target);
  if (!mem) return 0;
  binding = GL.mappedBuffers[binding] ??= {};
  binding.offset = offset;
  binding.length = length;
  binding.mem = mem;
  binding.access = access;
  return mem;
};

var _emscripten_glPauseTransformFeedback = () => GLctx.pauseTransformFeedback();

var _emscripten_glPixelStorei = (pname, param) => {
  if (pname == 3317) {
    GL.unpackAlignment = param;
  } else if (pname == 3314) {
    GL.unpackRowLength = param;
  }
  GLctx.pixelStorei(pname, param);
};

var _emscripten_glPolygonModeWEBGL = (face, mode) => {
  assert(GLctx.webglPolygonMode, "WEBGL_polygon_mode not supported, or not enabled. Before calling glPolygonModeWEBGL(), call emscripten_webgl_enable_WEBGL_polygon_mode() to enable this extension, and verify that it returns true to indicate support. (alternatively, build with -sGL_SUPPORT_AUTOMATIC_ENABLE_EXTENSIONS=1 to enable all GL extensions by default)");
  GLctx.webglPolygonMode["polygonModeWEBGL"](face, mode);
};

var _emscripten_glPolygonOffset = (x0, x1) => GLctx.polygonOffset(x0, x1);

var _emscripten_glPolygonOffsetClampEXT = (factor, units, clamp) => {
  assert(GLctx.extPolygonOffsetClamp, "EXT_polygon_offset_clamp not supported, or not enabled. Before calling glPolygonOffsetClampEXT(), call emscripten_webgl_enable_EXT_polygon_offset_clamp() to enable this extension, and verify that it returns true to indicate support. (alternatively, build with -sGL_SUPPORT_AUTOMATIC_ENABLE_EXTENSIONS=1 to enable all GL extensions by default)");
  GLctx.extPolygonOffsetClamp["polygonOffsetClampEXT"](factor, units, clamp);
};

var _emscripten_glProgramBinary = (program, binaryFormat, binary, length) => {
  GL.recordError(1280);
  err("GL_INVALID_ENUM in glProgramBinary: WebGL does not support binary shader formats! Calls to glProgramBinary always fail. See https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.4");
};

var _emscripten_glProgramParameteri = (program, pname, value) => {
  GL.recordError(1280);
  err("GL_INVALID_ENUM in glProgramParameteri: WebGL does not support binary shader formats! Calls to glProgramParameteri always fail. See https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.4");
};

var _emscripten_glQueryCounterEXT = (id, target) => {
  GL.validateGLObjectID(GL.queries, id, "glQueryCounterEXT", "id");
  GLctx.disjointTimerQueryExt["queryCounterEXT"](GL.queries[id], target);
};

var _emscripten_glReadBuffer = x0 => GLctx.readBuffer(x0);

var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
  function roundedToNextMultipleOf(x, y) {
    assert((y & (y - 1)) === 0, "Unpack alignment must be a power of 2! (Allowed values per WebGL spec are 1, 2, 4 or 8)");
    return (x + y - 1) & -y;
  }
  var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
  var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
  return height * alignedRowSize;
};

var colorChannelsInGlTextureFormat = format => {
  // Micro-optimizations for size: map format to size by subtracting smallest
  // enum value (0x1902) from all values first.  Also omit the most common
  // size value (1) from the list, which is assumed by formats not on the
  // list.
  var colorChannels = {
    // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
    // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
    5: 3,
    6: 4,
    // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
    8: 2,
    29502: 3,
    29504: 4,
    // 0x1903 /* GL_RED */ - 0x1902: 1,
    26917: 2,
    26918: 2,
    // 0x8D94 /* GL_RED_INTEGER */ - 0x1902: 1,
    29846: 3,
    29847: 4
  };
  if (!colorChannels[format - 6402] && format != 6402 && format != 6406 && format != 6409 && format != 6403 && format != 36244) {
    err(`Invalid format=${ptrToString(format)} passed to function colorChannelsInGlTextureFormat()!`);
  }
  return colorChannels[format - 6402] || 1;
};

var heapObjectForWebGLType = type => {
  // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
  // smaller values for the heap, for shorter generated code size.
  // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
  // (since most types are HEAPU16)
  type -= 5120;
  if (type == 0) return (growMemViews(), HEAP8);
  if (type == 1) return (growMemViews(), HEAPU8);
  if (type == 2) return (growMemViews(), HEAP16);
  if (type == 4) return (growMemViews(), HEAP32);
  if (type == 6) return (growMemViews(), HEAPF32);
  if (type == 5 || type == 28922 || type == 28520 || type == 30779 || type == 30782) return (growMemViews(), 
  HEAPU32);
  if (type != 3 && type != 11 && type != 27699 && type != 27700 && type != 28515 && type != 31073) {
    err(`Invalid WebGL type 0x${(type + 5120).toString()} passed to $heapObjectForWebGLType!`);
  }
  return (growMemViews(), HEAPU16);
};

var toTypedArrayIndex = (pointer, heap) => pointer >>> (31 - Math.clz32(heap.BYTES_PER_ELEMENT));

var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels, internalFormat) => {
  var heap = heapObjectForWebGLType(type);
  var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
  var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel);
  assert(pixels % heap.BYTES_PER_ELEMENT == 0, "Pointer to texture data passed to texture get function must be aligned to the byte size of the pixel type!");
  return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes, heap));
};

var _emscripten_glReadPixels = (x, y, width, height, format, type, pixels) => {
  if (GL.currentContext.version >= 2) {
    if (GLctx.currentPixelPackBufferBinding) {
      GLctx.readPixels(x, y, width, height, format, type, pixels);
      return;
    }
    var heap = heapObjectForWebGLType(type);
    var target = toTypedArrayIndex(pixels, heap);
    GLctx.readPixels(x, y, width, height, format, type, heap, target);
    return;
  }
  var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
  if (!pixelData) {
    GL.recordError(1280);
    err(`GL_INVALID_ENUM in glReadPixels: Unrecognized combination of type=${type} and format=${format}!`);
    return;
  }
  GLctx.readPixels(x, y, width, height, format, type, pixelData);
};

var _emscripten_glReleaseShaderCompiler = () => {};

var _emscripten_glRenderbufferStorage = (x0, x1, x2, x3) => GLctx.renderbufferStorage(x0, x1, x2, x3);

var _emscripten_glRenderbufferStorageMultisample = (x0, x1, x2, x3, x4) => GLctx.renderbufferStorageMultisample(x0, x1, x2, x3, x4);

var _emscripten_glResumeTransformFeedback = () => GLctx.resumeTransformFeedback();

var _emscripten_glSampleCoverage = (value, invert) => {
  GLctx.sampleCoverage(value, !!invert);
};

var _emscripten_glSamplerParameterf = (sampler, pname, param) => {
  GL.validateGLObjectID(GL.samplers, sampler, "glBindSampler", "sampler");
  GLctx.samplerParameterf(GL.samplers[sampler], pname, param);
};

var _emscripten_glSamplerParameterfv = (sampler, pname, params) => {
  GL.validateGLObjectID(GL.samplers, sampler, "glBindSampler", "sampler");
  var param = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((params) >> 2), "loading")];
  GLctx.samplerParameterf(GL.samplers[sampler], pname, param);
};

var _emscripten_glSamplerParameteri = (sampler, pname, param) => {
  GL.validateGLObjectID(GL.samplers, sampler, "glBindSampler", "sampler");
  GLctx.samplerParameteri(GL.samplers[sampler], pname, param);
};

var _emscripten_glSamplerParameteriv = (sampler, pname, params) => {
  GL.validateGLObjectID(GL.samplers, sampler, "glBindSampler", "sampler");
  var param = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "loading")];
  GLctx.samplerParameteri(GL.samplers[sampler], pname, param);
};

var _emscripten_glScissor = (x0, x1, x2, x3) => GLctx.scissor(x0, x1, x2, x3);

var _emscripten_glShaderBinary = (count, shaders, binaryformat, binary, length) => {
  GL.recordError(1280);
  err("GL_INVALID_ENUM in glShaderBinary: WebGL does not support binary shader formats! Calls to glShaderBinary always fail.");
};

var _emscripten_glShaderSource = (shader, count, string, length) => {
  GL.validateGLObjectID(GL.shaders, shader, "glShaderSource", "shader");
  var source = GL.getSource(shader, count, string, length);
  GLctx.shaderSource(GL.shaders[shader], source);
};

var _emscripten_glStencilFunc = (x0, x1, x2) => GLctx.stencilFunc(x0, x1, x2);

var _emscripten_glStencilFuncSeparate = (x0, x1, x2, x3) => GLctx.stencilFuncSeparate(x0, x1, x2, x3);

var _emscripten_glStencilMask = x0 => GLctx.stencilMask(x0);

var _emscripten_glStencilMaskSeparate = (x0, x1) => GLctx.stencilMaskSeparate(x0, x1);

var _emscripten_glStencilOp = (x0, x1, x2) => GLctx.stencilOp(x0, x1, x2);

var _emscripten_glStencilOpSeparate = (x0, x1, x2, x3) => GLctx.stencilOpSeparate(x0, x1, x2, x3);

var _emscripten_glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
  if (GL.currentContext.version >= 2) {
    if (GLctx.currentPixelUnpackBufferBinding) {
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
      return;
    }
    if (pixels) {
      var heap = heapObjectForWebGLType(type);
      var index = toTypedArrayIndex(pixels, heap);
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, index);
      return;
    }
  }
  var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null;
  GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
};

var _emscripten_glTexImage3D = (target, level, internalFormat, width, height, depth, border, format, type, pixels) => {
  if (GLctx.currentPixelUnpackBufferBinding) {
    GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixels);
  } else if (pixels) {
    var heap = heapObjectForWebGLType(type);
    GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, heap, toTypedArrayIndex(pixels, heap));
  } else {
    GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, null);
  }
};

var _emscripten_glTexParameterf = (x0, x1, x2) => GLctx.texParameterf(x0, x1, x2);

var _emscripten_glTexParameterfv = (target, pname, params) => {
  var param = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), ((params) >> 2), "loading")];
  GLctx.texParameterf(target, pname, param);
};

var _emscripten_glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);

var _emscripten_glTexParameteriv = (target, pname, params) => {
  var param = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((params) >> 2), "loading")];
  GLctx.texParameteri(target, pname, param);
};

var _emscripten_glTexStorage2D = (x0, x1, x2, x3, x4) => GLctx.texStorage2D(x0, x1, x2, x3, x4);

var _emscripten_glTexStorage3D = (x0, x1, x2, x3, x4, x5) => GLctx.texStorage3D(x0, x1, x2, x3, x4, x5);

var _emscripten_glTexSubImage2D = (target, level, xoffset, yoffset, width, height, format, type, pixels) => {
  if (GL.currentContext.version >= 2) {
    if (GLctx.currentPixelUnpackBufferBinding) {
      GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);
      return;
    }
    if (pixels) {
      var heap = heapObjectForWebGLType(type);
      GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, heap, toTypedArrayIndex(pixels, heap));
      return;
    }
  }
  var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0) : null;
  GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
};

var _emscripten_glTexSubImage3D = (target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels) => {
  if (GLctx.currentPixelUnpackBufferBinding) {
    GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels);
  } else if (pixels) {
    var heap = heapObjectForWebGLType(type);
    GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, heap, toTypedArrayIndex(pixels, heap));
  } else {
    GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, null);
  }
};

var _emscripten_glTransformFeedbackVaryings = (program, count, varyings, bufferMode) => {
  GL.validateGLObjectID(GL.programs, program, "glTransformFeedbackVaryings", "program");
  program = GL.programs[program];
  var vars = [];
  for (var i = 0; i < count; i++) vars.push(UTF8ToString((growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPU32), (((varyings) + (i * 4)) >> 2), "loading")]));
  GLctx.transformFeedbackVaryings(program, vars, bufferMode);
};

var _emscripten_glUniform1f = (location, v0) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform1f", "location");
  GLctx.uniform1f(webglGetUniformLocation(location), v0);
};

var miniTempWebGLFloatBuffers = [];

var _emscripten_glUniform1fv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform1fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniform1fv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform1fv(webglGetUniformLocation(location), (growMemViews(), HEAPF32), ((value) >> 2), count);
    return;
  }
  if (count <= 288) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; ++i) {
      view[i] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAPF32).subarray((((value) >> 2)), ((value + count * 4) >> 2));
  }
  GLctx.uniform1fv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform1i = (location, v0) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform1i", "location");
  GLctx.uniform1i(webglGetUniformLocation(location), v0);
};

var miniTempWebGLIntBuffers = [];

var _emscripten_glUniform1iv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform1iv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform1iv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform1iv(webglGetUniformLocation(location), (growMemViews(), HEAP32), ((value) >> 2), count);
    return;
  }
  if (count <= 288) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLIntBuffers[count];
    for (var i = 0; i < count; ++i) {
      view[i] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAP32).subarray((((value) >> 2)), ((value + count * 4) >> 2));
  }
  GLctx.uniform1iv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform1ui = (location, v0) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform1ui", "location");
  GLctx.uniform1ui(webglGetUniformLocation(location), v0);
};

var _emscripten_glUniform1uiv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform1uiv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform1uiv must be aligned to four bytes!");
  count && GLctx.uniform1uiv(webglGetUniformLocation(location), (growMemViews(), HEAPU32), ((value) >> 2), count);
};

var _emscripten_glUniform2f = (location, v0, v1) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform2f", "location");
  GLctx.uniform2f(webglGetUniformLocation(location), v0, v1);
};

var _emscripten_glUniform2fv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform2fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniform2fv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform2fv(webglGetUniformLocation(location), (growMemViews(), HEAPF32), ((value) >> 2), count * 2);
    return;
  }
  if (count <= 144) {
    // avoid allocation when uploading few enough uniforms
    count *= 2;
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; i += 2) {
      view[i] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i)) >> 2), "loading")];
      view[i + 1] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 4)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAPF32).subarray((((value) >> 2)), ((value + count * 8) >> 2));
  }
  GLctx.uniform2fv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform2i = (location, v0, v1) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform2i", "location");
  GLctx.uniform2i(webglGetUniformLocation(location), v0, v1);
};

var _emscripten_glUniform2iv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform2iv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform2iv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform2iv(webglGetUniformLocation(location), (growMemViews(), HEAP32), ((value) >> 2), count * 2);
    return;
  }
  if (count <= 144) {
    // avoid allocation when uploading few enough uniforms
    count *= 2;
    var view = miniTempWebGLIntBuffers[count];
    for (var i = 0; i < count; i += 2) {
      view[i] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i)) >> 2), "loading")];
      view[i + 1] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i + 4)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAP32).subarray((((value) >> 2)), ((value + count * 8) >> 2));
  }
  GLctx.uniform2iv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform2ui = (location, v0, v1) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform2ui", "location");
  GLctx.uniform2ui(webglGetUniformLocation(location), v0, v1);
};

var _emscripten_glUniform2uiv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform2uiv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform2uiv must be aligned to four bytes!");
  count && GLctx.uniform2uiv(webglGetUniformLocation(location), (growMemViews(), HEAPU32), ((value) >> 2), count * 2);
};

var _emscripten_glUniform3f = (location, v0, v1, v2) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform3f", "location");
  GLctx.uniform3f(webglGetUniformLocation(location), v0, v1, v2);
};

var _emscripten_glUniform3fv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform3fv", "location");
  assert((value % 4) == 0, "Pointer to float data passed to glUniform3fv must be aligned to four bytes!" + value);
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform3fv(webglGetUniformLocation(location), (growMemViews(), HEAPF32), ((value) >> 2), count * 3);
    return;
  }
  if (count <= 96) {
    // avoid allocation when uploading few enough uniforms
    count *= 3;
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; i += 3) {
      view[i] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i)) >> 2), "loading")];
      view[i + 1] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 4)) >> 2), "loading")];
      view[i + 2] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 8)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAPF32).subarray((((value) >> 2)), ((value + count * 12) >> 2));
  }
  GLctx.uniform3fv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform3i = (location, v0, v1, v2) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform3i", "location");
  GLctx.uniform3i(webglGetUniformLocation(location), v0, v1, v2);
};

var _emscripten_glUniform3iv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform3iv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform3iv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform3iv(webglGetUniformLocation(location), (growMemViews(), HEAP32), ((value) >> 2), count * 3);
    return;
  }
  if (count <= 96) {
    // avoid allocation when uploading few enough uniforms
    count *= 3;
    var view = miniTempWebGLIntBuffers[count];
    for (var i = 0; i < count; i += 3) {
      view[i] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i)) >> 2), "loading")];
      view[i + 1] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i + 4)) >> 2), "loading")];
      view[i + 2] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i + 8)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAP32).subarray((((value) >> 2)), ((value + count * 12) >> 2));
  }
  GLctx.uniform3iv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform3ui = (location, v0, v1, v2) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform3ui", "location");
  GLctx.uniform3ui(webglGetUniformLocation(location), v0, v1, v2);
};

var _emscripten_glUniform3uiv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform3uiv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform3uiv must be aligned to four bytes!");
  count && GLctx.uniform3uiv(webglGetUniformLocation(location), (growMemViews(), HEAPU32), ((value) >> 2), count * 3);
};

var _emscripten_glUniform4f = (location, v0, v1, v2, v3) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform4f", "location");
  GLctx.uniform4f(webglGetUniformLocation(location), v0, v1, v2, v3);
};

var _emscripten_glUniform4fv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform4fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniform4fv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform4fv(webglGetUniformLocation(location), (growMemViews(), HEAPF32), ((value) >> 2), count * 4);
    return;
  }
  if (count <= 72) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLFloatBuffers[4 * count];
    // hoist the heap out of the loop for size and for pthreads+growth.
    var heap = (growMemViews(), HEAPF32);
    value = ((value) >> 2);
    count *= 4;
    for (var i = 0; i < count; i += 4) {
      var dst = value + i;
      view[i] = heap[dst];
      view[i + 1] = heap[dst + 1];
      view[i + 2] = heap[dst + 2];
      view[i + 3] = heap[dst + 3];
    }
  } else {
    var view = (growMemViews(), HEAPF32).subarray((((value) >> 2)), ((value + count * 16) >> 2));
  }
  GLctx.uniform4fv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform4i = (location, v0, v1, v2, v3) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform4i", "location");
  GLctx.uniform4i(webglGetUniformLocation(location), v0, v1, v2, v3);
};

var _emscripten_glUniform4iv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform4iv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform4iv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform4iv(webglGetUniformLocation(location), (growMemViews(), HEAP32), ((value) >> 2), count * 4);
    return;
  }
  if (count <= 72) {
    // avoid allocation when uploading few enough uniforms
    count *= 4;
    var view = miniTempWebGLIntBuffers[count];
    for (var i = 0; i < count; i += 4) {
      view[i] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i)) >> 2), "loading")];
      view[i + 1] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i + 4)) >> 2), "loading")];
      view[i + 2] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i + 8)) >> 2), "loading")];
      view[i + 3] = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((value) + (4 * i + 12)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAP32).subarray((((value) >> 2)), ((value + count * 16) >> 2));
  }
  GLctx.uniform4iv(webglGetUniformLocation(location), view);
};

var _emscripten_glUniform4ui = (location, v0, v1, v2, v3) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform4ui", "location");
  GLctx.uniform4ui(webglGetUniformLocation(location), v0, v1, v2, v3);
};

var _emscripten_glUniform4uiv = (location, count, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniform4uiv", "location");
  assert((value & 3) == 0, "Pointer to integer data passed to glUniform4uiv must be aligned to four bytes!");
  count && GLctx.uniform4uiv(webglGetUniformLocation(location), (growMemViews(), HEAPU32), ((value) >> 2), count * 4);
};

var _emscripten_glUniformBlockBinding = (program, uniformBlockIndex, uniformBlockBinding) => {
  GL.validateGLObjectID(GL.programs, program, "glUniformBlockBinding", "program");
  program = GL.programs[program];
  GLctx.uniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding);
};

var _emscripten_glUniformMatrix2fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix2fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix2fv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniformMatrix2fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
    HEAPF32), ((value) >> 2), count * 4);
    return;
  }
  if (count <= 72) {
    // avoid allocation when uploading few enough uniforms
    count *= 4;
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; i += 4) {
      view[i] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i)) >> 2), "loading")];
      view[i + 1] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 4)) >> 2), "loading")];
      view[i + 2] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 8)) >> 2), "loading")];
      view[i + 3] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 12)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAPF32).subarray((((value) >> 2)), ((value + count * 16) >> 2));
  }
  GLctx.uniformMatrix2fv(webglGetUniformLocation(location), !!transpose, view);
};

var _emscripten_glUniformMatrix2x3fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix2x3fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix2x3fv must be aligned to four bytes!");
  count && GLctx.uniformMatrix2x3fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
  HEAPF32), ((value) >> 2), count * 6);
};

var _emscripten_glUniformMatrix2x4fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix2x4fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix2x4fv must be aligned to four bytes!");
  count && GLctx.uniformMatrix2x4fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
  HEAPF32), ((value) >> 2), count * 8);
};

var _emscripten_glUniformMatrix3fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix3fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix3fv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniformMatrix3fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
    HEAPF32), ((value) >> 2), count * 9);
    return;
  }
  if (count <= 32) {
    // avoid allocation when uploading few enough uniforms
    count *= 9;
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; i += 9) {
      view[i] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i)) >> 2), "loading")];
      view[i + 1] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 4)) >> 2), "loading")];
      view[i + 2] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 8)) >> 2), "loading")];
      view[i + 3] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 12)) >> 2), "loading")];
      view[i + 4] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 16)) >> 2), "loading")];
      view[i + 5] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 20)) >> 2), "loading")];
      view[i + 6] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 24)) >> 2), "loading")];
      view[i + 7] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 28)) >> 2), "loading")];
      view[i + 8] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), (((value) + (4 * i + 32)) >> 2), "loading")];
    }
  } else {
    var view = (growMemViews(), HEAPF32).subarray((((value) >> 2)), ((value + count * 36) >> 2));
  }
  GLctx.uniformMatrix3fv(webglGetUniformLocation(location), !!transpose, view);
};

var _emscripten_glUniformMatrix3x2fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix3x2fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix3x2fv must be aligned to four bytes!");
  count && GLctx.uniformMatrix3x2fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
  HEAPF32), ((value) >> 2), count * 6);
};

var _emscripten_glUniformMatrix3x4fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix3x4fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix3x4fv must be aligned to four bytes!");
  count && GLctx.uniformMatrix3x4fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
  HEAPF32), ((value) >> 2), count * 12);
};

var _emscripten_glUniformMatrix4fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix4fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix4fv must be aligned to four bytes!");
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
    HEAPF32), ((value) >> 2), count * 16);
    return;
  }
  if (count <= 18) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLFloatBuffers[16 * count];
    // hoist the heap out of the loop for size and for pthreads+growth.
    var heap = (growMemViews(), HEAPF32);
    value = ((value) >> 2);
    count *= 16;
    for (var i = 0; i < count; i += 16) {
      var dst = value + i;
      view[i] = heap[dst];
      view[i + 1] = heap[dst + 1];
      view[i + 2] = heap[dst + 2];
      view[i + 3] = heap[dst + 3];
      view[i + 4] = heap[dst + 4];
      view[i + 5] = heap[dst + 5];
      view[i + 6] = heap[dst + 6];
      view[i + 7] = heap[dst + 7];
      view[i + 8] = heap[dst + 8];
      view[i + 9] = heap[dst + 9];
      view[i + 10] = heap[dst + 10];
      view[i + 11] = heap[dst + 11];
      view[i + 12] = heap[dst + 12];
      view[i + 13] = heap[dst + 13];
      view[i + 14] = heap[dst + 14];
      view[i + 15] = heap[dst + 15];
    }
  } else {
    var view = (growMemViews(), HEAPF32).subarray((((value) >> 2)), ((value + count * 64) >> 2));
  }
  GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view);
};

var _emscripten_glUniformMatrix4x2fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix4x2fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix4x2fv must be aligned to four bytes!");
  count && GLctx.uniformMatrix4x2fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
  HEAPF32), ((value) >> 2), count * 8);
};

var _emscripten_glUniformMatrix4x3fv = (location, count, transpose, value) => {
  GL.validateGLObjectID(GLctx.currentProgram.uniformLocsById, location, "glUniformMatrix4x3fv", "location");
  assert((value & 3) == 0, "Pointer to float data passed to glUniformMatrix4x3fv must be aligned to four bytes!");
  count && GLctx.uniformMatrix4x3fv(webglGetUniformLocation(location), !!transpose, (growMemViews(), 
  HEAPF32), ((value) >> 2), count * 12);
};

var _emscripten_glUnmapBuffer = target => {
  if (!emscriptenWebGLValidateMapBufferTarget(target)) {
    GL.recordError(1280);
    err("GL_INVALID_ENUM in glUnmapBuffer");
    return 0;
  }
  var buffer = emscriptenWebGLGetBufferBinding(target);
  var mapping = GL.mappedBuffers[buffer];
  if (!mapping || !mapping.mem) {
    GL.recordError(1282);
    err("buffer was never mapped in glUnmapBuffer");
    return 0;
  }
  if (!(mapping.access & 16)) {
    /* GL_MAP_FLUSH_EXPLICIT_BIT */ if (GL.currentContext.version >= 2) {
      GLctx.bufferSubData(target, mapping.offset, (growMemViews(), HEAPU8), mapping.mem, mapping.length);
    } else GLctx.bufferSubData(target, mapping.offset, (growMemViews(), HEAPU8).subarray(mapping.mem, mapping.mem + mapping.length));
  }
  _free(mapping.mem);
  mapping.mem = 0;
  return 1;
};

var _emscripten_glUseProgram = program => {
  GL.validateGLObjectID(GL.programs, program, "glUseProgram", "program");
  program = GL.programs[program];
  GLctx.useProgram(program);
  // Record the currently active program so that we can access the uniform
  // mapping table of that program.
  GLctx.currentProgram = program;
};

var _emscripten_glValidateProgram = program => {
  GL.validateGLObjectID(GL.programs, program, "glValidateProgram", "program");
  GLctx.validateProgram(GL.programs[program]);
};

var _emscripten_glVertexAttrib1f = (x0, x1) => GLctx.vertexAttrib1f(x0, x1);

var _emscripten_glVertexAttrib1fv = (index, v) => {
  assert((v & 3) == 0, "Pointer to float data passed to glVertexAttrib1fv must be aligned to four bytes!");
  assert(v != 0, "Null pointer passed to glVertexAttrib1fv!");
  GLctx.vertexAttrib1f(index, (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v >> 2, "loading")]);
};

var _emscripten_glVertexAttrib2f = (x0, x1, x2) => GLctx.vertexAttrib2f(x0, x1, x2);

var _emscripten_glVertexAttrib2fv = (index, v) => {
  assert((v & 3) == 0, "Pointer to float data passed to glVertexAttrib2fv must be aligned to four bytes!");
  assert(v != 0, "Null pointer passed to glVertexAttrib2fv!");
  GLctx.vertexAttrib2f(index, (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v >> 2, "loading")], (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v + 4 >> 2, "loading")]);
};

var _emscripten_glVertexAttrib3f = (x0, x1, x2, x3) => GLctx.vertexAttrib3f(x0, x1, x2, x3);

var _emscripten_glVertexAttrib3fv = (index, v) => {
  assert((v & 3) == 0, "Pointer to float data passed to glVertexAttrib3fv must be aligned to four bytes!");
  assert(v != 0, "Null pointer passed to glVertexAttrib3fv!");
  GLctx.vertexAttrib3f(index, (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v >> 2, "loading")], (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v + 4 >> 2, "loading")], (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v + 8 >> 2, "loading")]);
};

var _emscripten_glVertexAttrib4f = (x0, x1, x2, x3, x4) => GLctx.vertexAttrib4f(x0, x1, x2, x3, x4);

var _emscripten_glVertexAttrib4fv = (index, v) => {
  assert((v & 3) == 0, "Pointer to float data passed to glVertexAttrib4fv must be aligned to four bytes!");
  assert(v != 0, "Null pointer passed to glVertexAttrib4fv!");
  GLctx.vertexAttrib4f(index, (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v >> 2, "loading")], (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v + 4 >> 2, "loading")], (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v + 8 >> 2, "loading")], (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPF32), v + 12 >> 2, "loading")]);
};

var _emscripten_glVertexAttribDivisor = (index, divisor) => {
  assert(GLctx.vertexAttribDivisor, "Must have ANGLE_instanced_arrays extension or WebGL 2 to use WebGL instancing");
  GLctx.vertexAttribDivisor(index, divisor);
};

var _glVertexAttribDivisor = _emscripten_glVertexAttribDivisor;

var _emscripten_glVertexAttribDivisorANGLE = _glVertexAttribDivisor;

var _emscripten_glVertexAttribDivisorARB = _glVertexAttribDivisor;

var _emscripten_glVertexAttribDivisorEXT = _glVertexAttribDivisor;

var _emscripten_glVertexAttribDivisorNV = _glVertexAttribDivisor;

var _emscripten_glVertexAttribI4i = (x0, x1, x2, x3, x4) => GLctx.vertexAttribI4i(x0, x1, x2, x3, x4);

var _emscripten_glVertexAttribI4iv = (index, v) => {
  assert((v & 3) == 0, "Pointer to integer data passed to glVertexAttribI4iv must be aligned to four bytes!");
  assert(v != 0, "Null pointer passed to glVertexAttribI4iv!");
  GLctx.vertexAttribI4i(index, (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAP32), v >> 2, "loading")], (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAP32), v + 4 >> 2, "loading")], (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAP32), v + 8 >> 2, "loading")], (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAP32), v + 12 >> 2, "loading")]);
};

var _emscripten_glVertexAttribI4ui = (x0, x1, x2, x3, x4) => GLctx.vertexAttribI4ui(x0, x1, x2, x3, x4);

var _emscripten_glVertexAttribI4uiv = (index, v) => {
  assert((v & 3) == 0, "Pointer to integer data passed to glVertexAttribI4uiv must be aligned to four bytes!");
  assert(v != 0, "Null pointer passed to glVertexAttribI4uiv!");
  GLctx.vertexAttribI4ui(index, (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPU32), v >> 2, "loading")], (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPU32), v + 4 >> 2, "loading")], (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPU32), v + 8 >> 2, "loading")], (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAPU32), v + 12 >> 2, "loading")]);
};

var _emscripten_glVertexAttribIPointer = (index, size, type, stride, ptr) => {
  var cb = GL.currentContext.clientBuffers[index];
  assert(cb, index);
  if (!GLctx.currentArrayBufferBinding) {
    cb.size = size;
    cb.type = type;
    cb.normalized = false;
    cb.stride = stride;
    cb.ptr = ptr;
    cb.clientside = true;
    cb.vertexAttribPointerAdaptor = function(index, size, type, normalized, stride, ptr) {
      this.vertexAttribIPointer(index, size, type, stride, ptr);
    };
    return;
  }
  cb.clientside = false;
  GL.validateVertexAttribPointer(size, type, stride, ptr);
  GLctx.vertexAttribIPointer(index, size, type, stride, ptr);
};

var _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
  var cb = GL.currentContext.clientBuffers[index];
  assert(cb, index);
  if (!GLctx.currentArrayBufferBinding) {
    cb.size = size;
    cb.type = type;
    cb.normalized = normalized;
    cb.stride = stride;
    cb.ptr = ptr;
    cb.clientside = true;
    cb.vertexAttribPointerAdaptor = function(index, size, type, normalized, stride, ptr) {
      this.vertexAttribPointer(index, size, type, normalized, stride, ptr);
    };
    return;
  }
  cb.clientside = false;
  GL.validateVertexAttribPointer(size, type, stride, ptr);
  GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
};

var _emscripten_glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);

var _emscripten_glWaitSync = (sync, flags, timeout) => {
  // See WebGL2 vs GLES3 difference on GL_TIMEOUT_IGNORED above (https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.15)
  timeout = Number(timeout);
  GLctx.waitSync(GL.syncs[sync], flags, timeout);
};

var _emscripten_has_asyncify = () => 1;

var _emscripten_num_logical_cores = () => ENVIRONMENT_IS_NODE ? require("os").cpus().length : navigator["hardwareConcurrency"];

var doRequestFullscreen = (target, strategy) => {
  if (!JSEvents.fullscreenEnabled()) return -1;
  target = findEventTarget(target);
  if (!target) return -4;
  if (!target.requestFullscreen && !target.webkitRequestFullscreen) {
    return -3;
  }
  // Queue this function call if we're not currently in an event handler and
  // the user saw it appropriate to do so.
  if (!JSEvents.canPerformEventHandlerRequests()) {
    if (strategy.deferUntilInEventHandler) {
      JSEvents.deferCall(JSEvents_requestFullscreen, 1, [ target, strategy ]);
      return 1;
    }
    return -2;
  }
  return JSEvents_requestFullscreen(target, strategy);
};

function _emscripten_request_fullscreen_strategy(target, deferUntilInEventHandler, fullscreenStrategy) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(61, 0, 1, target, deferUntilInEventHandler, fullscreenStrategy);
  var strategy = {
    scaleMode: (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((fullscreenStrategy) >> 2), "loading")],
    canvasResolutionScaleMode: (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
    HEAP32), (((fullscreenStrategy) + (4)) >> 2), "loading")],
    filteringMode: (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((fullscreenStrategy) + (8)) >> 2), "loading")],
    deferUntilInEventHandler,
    canvasResizedCallbackTargetThread: (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
    HEAP32), (((fullscreenStrategy) + (20)) >> 2), "loading")],
    canvasResizedCallback: (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
    HEAP32), (((fullscreenStrategy) + (12)) >> 2), "loading")],
    canvasResizedCallbackUserData: (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), 
    HEAP32), (((fullscreenStrategy) + (16)) >> 2), "loading")]
  };
  return doRequestFullscreen(target, strategy);
}

function _emscripten_request_pointerlock(target, deferUntilInEventHandler) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(62, 0, 1, target, deferUntilInEventHandler);
  target = findEventTarget(target);
  if (!target) return -4;
  if (!target.requestPointerLock) {
    return -1;
  }
  // Queue this function call if we're not currently in an event handler and
  // the user saw it appropriate to do so.
  if (!JSEvents.canPerformEventHandlerRequests()) {
    if (deferUntilInEventHandler) {
      JSEvents.deferCall(requestPointerLock, 2, [ target ]);
      return 1;
    }
    return -2;
  }
  return requestPointerLock(target);
}

var growMemory = size => {
  var oldHeapSize = wasmMemory.buffer.byteLength;
  var pages = ((size - oldHeapSize + 65535) / 65536) | 0;
  try {
    // round size grow request up to wasm page size (fixed 64KB per spec)
    wasmMemory.grow(pages);
    // .grow() takes a delta compared to the previous size
    updateMemoryViews();
    return 1;
  } catch (e) {
    err(`growMemory: Attempted to grow heap from ${oldHeapSize} bytes to ${size} bytes, but got error: ${e}`);
  }
};

var _emscripten_resize_heap = requestedSize => {
  var oldSize = (growMemViews(), HEAPU8).length;
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  requestedSize >>>= 0;
  // With multithreaded builds, races can happen (another thread might increase the size
  // in between), so return a failure, and let the caller retry.
  if (requestedSize <= oldSize) {
    return false;
  }
  // Memory resize rules:
  // 1.  Always increase heap size to at least the requested size, rounded up
  //     to next page multiple.
  // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
  //     geometrically: increase the heap size according to
  //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
  //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
  // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
  //     linearly: increase the heap size by at least
  //     MEMORY_GROWTH_LINEAR_STEP bytes.
  // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
  //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
  // 4.  If we were unable to allocate as much memory, it may be due to
  //     over-eager decision to excessively reserve due to (3) above.
  //     Hence if an allocation fails, cut down on the amount of excess
  //     growth, in an attempt to succeed to perform a smaller allocation.
  // A limit is set for how much we can grow. We should not exceed that
  // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
  var maxHeapSize = getHeapMax();
  if (requestedSize > maxHeapSize) {
    err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
    return false;
  }
  // Loop through potential heap size increases. If we attempt a too eager
  // reservation that fails, cut down on the attempted size and reserve a
  // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
    // ensure geometric growth
    // but limit overreserving (default to capping at +96MB overgrowth at most)
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
    var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
    var t0 = _emscripten_get_now();
    var replacement = growMemory(newSize);
    var t1 = _emscripten_get_now();
    dbg(`Heap resize call from ${oldSize} to ${newSize} took ${(t1 - t0)} msecs. Success: ${!!replacement}`);
    if (replacement) {
      return true;
    }
  }
  err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
  return false;
};

/** @suppress {checkTypes} */ function _emscripten_sample_gamepad_data() {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(63, 0, 1);
  try {
    if (navigator.getGamepads) return (JSEvents.lastGamepadState = navigator.getGamepads()) ? 0 : -1;
  } catch (e) {
    err(`navigator.getGamepads() exists, but failed to execute with exception ${e}. Disabling Gamepad access.`);
    navigator.getGamepads = null;
  }
  return -1;
}

var registerBeforeUnloadEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString) => {
  var beforeUnloadEventHandlerFunc = e => {
    // Note: This is always called on the main browser thread, since it needs synchronously return a value!
    var confirmationMessage = ((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, 0, userData);
    if (confirmationMessage) {
      confirmationMessage = UTF8ToString(confirmationMessage);
    }
    if (confirmationMessage) {
      e.preventDefault();
      e.returnValue = confirmationMessage;
      return confirmationMessage;
    }
  };
  var eventHandler = {
    target: findEventTarget(target),
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: beforeUnloadEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_beforeunload_callback_on_thread(userData, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(64, 0, 1, userData, callbackfunc, targetThread);
  if (typeof onbeforeunload == "undefined") return -1;
  // beforeunload callback can only be registered on the main browser thread, because the page will go away immediately after returning from the handler,
  // and there is no time to start proxying it anywhere.
  if (targetThread !== 1) return -5;
  return registerBeforeUnloadEventCallback(2, userData, true, callbackfunc, 28, "beforeunload");
}

var registerFocusEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 256;
  JSEvents.focusEvent ||= _malloc(eventSize);
  var focusEventHandlerFunc = e => {
    var nodeName = JSEvents.getNodeNameForTarget(e.target);
    var id = e.target.id ? e.target.id : "";
    var focusEvent = JSEvents.focusEvent;
    stringToUTF8(nodeName, focusEvent + 0, 128);
    stringToUTF8(id, focusEvent + 128, 128);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, focusEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, focusEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target: findEventTarget(target),
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: focusEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_blur_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(65, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerFocusEventCallback(target, userData, useCapture, callbackfunc, 12, "blur", targetThread);
}

function _emscripten_set_element_css_size(target, width, height) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(66, 0, 1, target, width, height);
  target = findEventTarget(target);
  if (!target) return -4;
  target.style.width = width + "px";
  target.style.height = height + "px";
  return 0;
}

function _emscripten_set_focus_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(67, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerFocusEventCallback(target, userData, useCapture, callbackfunc, 13, "focus", targetThread);
}

var fillFullscreenChangeEventData = eventStruct => {
  var fullscreenElement = getFullscreenElement();
  var isFullscreen = !!fullscreenElement;
  // Assigning a boolean to HEAP32 with expected type coercion.
  /** @suppress{checkTypes} */ (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAP8), eventStruct, "storing")] = isFullscreen;
  checkInt8(isFullscreen);
  (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), (eventStruct) + (1), "storing")] = JSEvents.fullscreenEnabled();
  checkInt8(JSEvents.fullscreenEnabled());
  // If transitioning to fullscreen, report info about the element that is now fullscreen.
  // If transitioning to windowed mode, report info about the element that just was fullscreen.
  var reportedElement = isFullscreen ? fullscreenElement : JSEvents.previousFullscreenElement;
  var nodeName = JSEvents.getNodeNameForTarget(reportedElement);
  var id = reportedElement?.id || "";
  stringToUTF8(nodeName, eventStruct + 2, 128);
  stringToUTF8(id, eventStruct + 130, 128);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (260)) >> 2), "storing")] = reportedElement ? reportedElement.clientWidth : 0;
  checkInt32(reportedElement ? reportedElement.clientWidth : 0);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (264)) >> 2), "storing")] = reportedElement ? reportedElement.clientHeight : 0;
  checkInt32(reportedElement ? reportedElement.clientHeight : 0);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (268)) >> 2), "storing")] = screen.width;
  checkInt32(screen.width);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (272)) >> 2), "storing")] = screen.height;
  checkInt32(screen.height);
  if (isFullscreen) {
    JSEvents.previousFullscreenElement = fullscreenElement;
  }
};

var registerFullscreenChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 276;
  JSEvents.fullscreenChangeEvent ||= _malloc(eventSize);
  var fullscreenChangeEventhandlerFunc = e => {
    var fullscreenChangeEvent = JSEvents.fullscreenChangeEvent;
    fillFullscreenChangeEventData(fullscreenChangeEvent);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, fullscreenChangeEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, fullscreenChangeEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: fullscreenChangeEventhandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_fullscreenchange_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(68, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  if (!JSEvents.fullscreenEnabled()) return -1;
  target = findEventTarget(target);
  if (!target) return -4;
  // As of Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitfullscreenchange. TODO: revisit this check once Safari ships unprefixed version.
  // TODO: When this block is removed, also change test/test_html5_remove_event_listener.c test expectation on emscripten_set_fullscreenchange_callback().
  registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "webkitfullscreenchange", targetThread);
  return registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "fullscreenchange", targetThread);
}

var registerGamepadEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 1240;
  JSEvents.gamepadEvent ||= _malloc(eventSize);
  var gamepadEventHandlerFunc = e => {
    var gamepadEvent = JSEvents.gamepadEvent;
    fillGamepadEventData(gamepadEvent, e["gamepad"]);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, gamepadEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, gamepadEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target: findEventTarget(target),
    allowsDeferredCalls: true,
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: gamepadEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_gamepadconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(69, 0, 1, userData, useCapture, callbackfunc, targetThread);
  if (_emscripten_sample_gamepad_data()) return -1;
  return registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 26, "gamepadconnected", targetThread);
}

function _emscripten_set_gamepaddisconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(70, 0, 1, userData, useCapture, callbackfunc, targetThread);
  if (_emscripten_sample_gamepad_data()) return -1;
  return registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 27, "gamepaddisconnected", targetThread);
}

var registerKeyEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 160;
  JSEvents.keyEvent ||= _malloc(eventSize);
  var keyEventHandlerFunc = e => {
    assert(e);
    var keyEventData = JSEvents.keyEvent;
    (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((keyEventData) >> 3), "storing")] = e.timeStamp;
    var idx = ((keyEventData) >> 2);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 2, "storing")] = e.location;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), keyEventData + 12, "storing")] = e.ctrlKey;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), keyEventData + 13, "storing")] = e.shiftKey;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), keyEventData + 14, "storing")] = e.altKey;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), keyEventData + 15, "storing")] = e.metaKey;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), keyEventData + 16, "storing")] = e.repeat;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 5, "storing")] = e.charCode;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 6, "storing")] = e.keyCode;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 7, "storing")] = e.which;
    stringToUTF8(e.key || "", keyEventData + 32, 32);
    stringToUTF8(e.code || "", keyEventData + 64, 32);
    stringToUTF8(e.char || "", keyEventData + 96, 32);
    stringToUTF8(e.locale || "", keyEventData + 128, 32);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, keyEventData, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, keyEventData, userData)) e.preventDefault();
  };
  var eventHandler = {
    target: findEventTarget(target),
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: keyEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_keydown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(71, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, "keydown", targetThread);
}

function _emscripten_set_keypress_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(72, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerKeyEventCallback(target, userData, useCapture, callbackfunc, 1, "keypress", targetThread);
}

function _emscripten_set_keyup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(73, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, "keyup", targetThread);
}

var fillMouseEventData = (eventStruct, e, target) => {
  assert(eventStruct % 4 == 0);
  (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((eventStruct) >> 3), "storing")] = e.timeStamp;
  var idx = ((eventStruct) >> 2);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 2, "storing")] = e.screenX;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 3, "storing")] = e.screenY;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 4, "storing")] = e.clientX;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 5, "storing")] = e.clientY;
  (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), eventStruct + 24, "storing")] = e.ctrlKey;
  (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), eventStruct + 25, "storing")] = e.shiftKey;
  (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), eventStruct + 26, "storing")] = e.altKey;
  (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), eventStruct + 27, "storing")] = e.metaKey;
  (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), idx * 2 + 14, "storing")] = e.button;
  (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), idx * 2 + 15, "storing")] = e.buttons;
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 8, "storing")] = e["movementX"];
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 9, "storing")] = e["movementY"];
  // Note: rect contains doubles (truncated to placate SAFE_HEAP, which is the same behaviour when writing to HEAP32 anyway)
  var rect = getBoundingClientRect(target);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 10, "storing")] = e.clientX - (rect.left | 0);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx + 11, "storing")] = e.clientY - (rect.top | 0);
};

var registerMouseEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 64;
  JSEvents.mouseEvent ||= _malloc(eventSize);
  target = findEventTarget(target);
  var mouseEventHandlerFunc = e => {
    // TODO: Make this access thread safe, or this could update live while app is reading it.
    fillMouseEventData(JSEvents.mouseEvent, e, target);
    if (targetThread) {
      __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, JSEvents.mouseEvent, eventSize, userData);
    } else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    allowsDeferredCalls: eventTypeString != "mousemove" && eventTypeString != "mouseenter" && eventTypeString != "mouseleave",
    // Mouse move events do not allow fullscreen/pointer lock requests to be handled in them!
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: mouseEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_mousedown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(74, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, "mousedown", targetThread);
}

function _emscripten_set_mouseenter_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(75, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 33, "mouseenter", targetThread);
}

function _emscripten_set_mouseleave_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(76, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 34, "mouseleave", targetThread);
}

function _emscripten_set_mousemove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(77, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, "mousemove", targetThread);
}

function _emscripten_set_mouseup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(78, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, "mouseup", targetThread);
}

var fillPointerlockChangeEventData = eventStruct => {
  var pointerLockElement = document.pointerLockElement;
  var isPointerlocked = !!pointerLockElement;
  // Assigning a boolean to HEAP32 with expected type coercion.
  /** @suppress{checkTypes} */ (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAP8), eventStruct, "storing")] = isPointerlocked;
  checkInt8(isPointerlocked);
  var nodeName = JSEvents.getNodeNameForTarget(pointerLockElement);
  var id = pointerLockElement?.id || "";
  stringToUTF8(nodeName, eventStruct + 1, 128);
  stringToUTF8(id, eventStruct + 129, 128);
};

var registerPointerlockChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 257;
  JSEvents.pointerlockChangeEvent ||= _malloc(eventSize);
  var pointerlockChangeEventHandlerFunc = e => {
    var pointerlockChangeEvent = JSEvents.pointerlockChangeEvent;
    fillPointerlockChangeEventData(pointerlockChangeEvent);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, pointerlockChangeEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, pointerlockChangeEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: pointerlockChangeEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_pointerlockchange_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(79, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  if (!document.body?.requestPointerLock) {
    return -1;
  }
  target = findEventTarget(target);
  if (!target) return -4;
  return registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "pointerlockchange", targetThread);
}

var registerUiEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 36;
  JSEvents.uiEvent ||= _malloc(eventSize);
  target = findEventTarget(target);
  var uiEventHandlerFunc = e => {
    if (e.target != target) {
      // Never take ui events such as scroll via a 'bubbled' route, but always from the direct element that
      // was targeted. Otherwise e.g. if app logs a message in response to a page scroll, the Emscripten log
      // message box could cause to scroll, generating a new (bubbled) scroll message, causing a new log print,
      // causing a new scroll, etc..
      return;
    }
    var b = document.body;
    // Take document.body to a variable, Closure compiler does not outline access to it on its own.
    if (!b) {
      // During a page unload 'body' can be null, with "Cannot read property 'clientWidth' of null" being thrown
      return;
    }
    var uiEvent = JSEvents.uiEvent;
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((uiEvent) >> 2), "storing")] = 0;
    checkInt32(0);
    // always zero for resize and scroll
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (4)) >> 2), "storing")] = b.clientWidth;
    checkInt32(b.clientWidth);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (8)) >> 2), "storing")] = b.clientHeight;
    checkInt32(b.clientHeight);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (12)) >> 2), "storing")] = innerWidth;
    checkInt32(innerWidth);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (16)) >> 2), "storing")] = innerHeight;
    checkInt32(innerHeight);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (20)) >> 2), "storing")] = outerWidth;
    checkInt32(outerWidth);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (24)) >> 2), "storing")] = outerHeight;
    checkInt32(outerHeight);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (28)) >> 2), "storing")] = pageXOffset | 0;
    checkInt32(pageXOffset | 0);
    // scroll offsets are float
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((uiEvent) + (32)) >> 2), "storing")] = pageYOffset | 0;
    checkInt32(pageYOffset | 0);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, uiEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, uiEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: uiEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_resize_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(80, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerUiEventCallback(target, userData, useCapture, callbackfunc, 10, "resize", targetThread);
}

var registerTouchEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 1552;
  JSEvents.touchEvent ||= _malloc(eventSize);
  target = findEventTarget(target);
  var touchEventHandlerFunc = e => {
    assert(e);
    var t, touches = {}, et = e.touches;
    // To ease marshalling different kinds of touches that browser reports (all touches are listed in e.touches,
    // only changed touches in e.changedTouches, and touches on target at a.targetTouches), mark a boolean in
    // each Touch object so that we can later loop only once over all touches we see to marshall over to Wasm.
    for (let t of et) {
      // Browser might recycle the generated Touch objects between each frame (Firefox on Android), so reset any
      // changed/target states we may have set from previous frame.
      t.isChanged = t.onTarget = 0;
      touches[t.identifier] = t;
    }
    // Mark which touches are part of the changedTouches list.
    for (let t of e.changedTouches) {
      t.isChanged = 1;
      touches[t.identifier] = t;
    }
    // Mark which touches are part of the targetTouches list.
    for (let t of e.targetTouches) {
      touches[t.identifier].onTarget = 1;
    }
    var touchEvent = JSEvents.touchEvent;
    (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), ((touchEvent) >> 3), "storing")] = e.timeStamp;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), touchEvent + 12, "storing")] = e.ctrlKey;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), touchEvent + 13, "storing")] = e.shiftKey;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), touchEvent + 14, "storing")] = e.altKey;
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), touchEvent + 15, "storing")] = e.metaKey;
    var idx = touchEvent + 16;
    var targetRect = getBoundingClientRect(target);
    var numTouches = 0;
    for (let t of Object.values(touches)) {
      var idx32 = ((idx) >> 2);
      // Pre-shift the ptr to index to HEAP32 to save code size
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 0, "storing")] = t.identifier;
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 1, "storing")] = t.screenX;
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 2, "storing")] = t.screenY;
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 3, "storing")] = t.clientX;
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 4, "storing")] = t.clientY;
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 5, "storing")] = t.pageX;
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 6, "storing")] = t.pageY;
      (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), idx + 28, "storing")] = t.isChanged;
      (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), idx + 29, "storing")] = t.onTarget;
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 8, "storing")] = t.clientX - (targetRect.left | 0);
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), idx32 + 9, "storing")] = t.clientY - (targetRect.top | 0);
      idx += 48;
      if (++numTouches > 31) {
        break;
      }
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((touchEvent) + (8)) >> 2), "storing")] = numTouches;
    checkInt32(numTouches);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, touchEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, touchEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    allowsDeferredCalls: eventTypeString == "touchstart" || eventTypeString == "touchend",
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: touchEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_touchcancel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(81, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 25, "touchcancel", targetThread);
}

function _emscripten_set_touchend_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(82, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 23, "touchend", targetThread);
}

function _emscripten_set_touchmove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(83, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 24, "touchmove", targetThread);
}

function _emscripten_set_touchstart_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(84, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  return registerTouchEventCallback(target, userData, useCapture, callbackfunc, 22, "touchstart", targetThread);
}

var fillVisibilityChangeEventData = eventStruct => {
  var visibilityStates = [ "hidden", "visible", "prerender", "unloaded" ];
  var visibilityState = visibilityStates.indexOf(document.visibilityState);
  // Assigning a boolean to HEAP32 with expected type coercion.
  /** @suppress{checkTypes} */ (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), 
  HEAP8), eventStruct, "storing")] = document.hidden;
  checkInt8(document.hidden);
  (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((eventStruct) + (4)) >> 2), "storing")] = visibilityState;
  checkInt32(visibilityState);
};

var registerVisibilityChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 8;
  JSEvents.visibilityChangeEvent ||= _malloc(eventSize);
  var visibilityChangeEventHandlerFunc = e => {
    var visibilityChangeEvent = JSEvents.visibilityChangeEvent;
    fillVisibilityChangeEventData(visibilityChangeEvent);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, visibilityChangeEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, visibilityChangeEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: visibilityChangeEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_visibilitychange_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(85, 0, 1, userData, useCapture, callbackfunc, targetThread);
  if (!specialHTMLTargets[1]) {
    return -4;
  }
  return registerVisibilityChangeEventCallback(specialHTMLTargets[1], userData, useCapture, callbackfunc, 21, "visibilitychange", targetThread);
}

var registerWheelEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
  var eventSize = 96;
  JSEvents.wheelEvent ||= _malloc(eventSize);
  // The DOM Level 3 events spec event 'wheel'
  var wheelHandlerFunc = e => {
    var wheelEvent = JSEvents.wheelEvent;
    fillMouseEventData(wheelEvent, e, target);
    (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), (((wheelEvent) + (64)) >> 3), "storing")] = e["deltaX"];
    (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), (((wheelEvent) + (72)) >> 3), "storing")] = e["deltaY"];
    (growMemViews(), HEAPF64)[SAFE_HEAP_INDEX((growMemViews(), HEAPF64), (((wheelEvent) + (80)) >> 3), "storing")] = e["deltaZ"];
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((wheelEvent) + (88)) >> 2), "storing")] = e["deltaMode"];
    checkInt32(e["deltaMode"]);
    if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, wheelEvent, eventSize, userData); else if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, wheelEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    allowsDeferredCalls: true,
    eventTypeString,
    eventTypeId,
    userData,
    callbackfunc,
    handlerFunc: wheelHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_wheel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(86, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
  target = findEventTarget(target);
  if (!target) return -4;
  if (typeof target.onwheel != "undefined") {
    return registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, "wheel", targetThread);
  } else {
    return -1;
  }
}

function _emscripten_set_window_title(title) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(87, 0, 1, title);
  return document.title = UTF8ToString(title);
}

var _emscripten_sleep = ms => Asyncify.handleSleep(wakeUp => safeSetTimeout(wakeUp, ms));

_emscripten_sleep.isAsync = true;

var ENV = {};

var getExecutableName = () => thisProgram || "./this.program";

var getEnvStrings = () => {
  if (!getEnvStrings.strings) {
    // Default values.
    // Browser language detection #8751
    var lang = (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8";
    var env = {
      "USER": "web_user",
      "LOGNAME": "web_user",
      "PATH": "/",
      "PWD": "/",
      "HOME": "/home/web_user",
      "LANG": lang,
      "_": getExecutableName()
    };
    // Apply the user-provided values, if any.
    for (var x in ENV) {
      // x is a key in ENV; if ENV[x] is undefined, that means it was
      // explicitly set to be so. We allow user code to do that to
      // force variables with default values to remain unset.
      if (ENV[x] === undefined) delete env[x]; else env[x] = ENV[x];
    }
    var strings = [];
    for (var x in env) {
      strings.push(`${x}=${env[x]}`);
    }
    getEnvStrings.strings = strings;
  }
  return getEnvStrings.strings;
};

function _environ_get(__environ, environ_buf) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(88, 0, 1, __environ, environ_buf);
  var bufSize = 0;
  var envp = 0;
  for (var string of getEnvStrings()) {
    var ptr = environ_buf + bufSize;
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((__environ) + (envp)) >> 2), "storing")] = ptr;
    bufSize += stringToUTF8(string, ptr, Infinity) + 1;
    envp += 4;
  }
  return 0;
}

function _environ_sizes_get(penviron_count, penviron_buf_size) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(89, 0, 1, penviron_count, penviron_buf_size);
  var strings = getEnvStrings();
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((penviron_count) >> 2), "storing")] = strings.length;
  checkInt32(strings.length);
  var bufSize = 0;
  for (var string of strings) {
    bufSize += lengthBytesUTF8(string) + 1;
  }
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((penviron_buf_size) >> 2), "storing")] = bufSize;
  checkInt32(bufSize);
  return 0;
}

function _fd_close(fd) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(90, 0, 1, fd);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    FS.close(stream);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

function _fd_fdstat_get(fd, pbuf) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(91, 0, 1, fd, pbuf);
  try {
    var rightsBase = 0;
    var rightsInheriting = 0;
    var flags = 0;
    {
      var stream = SYSCALLS.getStreamFromFD(fd);
      // All character devices are terminals (other things a Linux system would
      // assume is a character device, like the mouse, we have special APIs for).
      var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
    }
    (growMemViews(), HEAP8)[SAFE_HEAP_INDEX((growMemViews(), HEAP8), pbuf, "storing")] = type;
    checkInt8(type);
    (growMemViews(), HEAP16)[SAFE_HEAP_INDEX((growMemViews(), HEAP16), (((pbuf) + (2)) >> 1), "storing")] = flags;
    checkInt16(flags);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((pbuf) + (8)) >> 3), "storing")] = BigInt(rightsBase);
    checkInt64(rightsBase);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), (((pbuf) + (16)) >> 3), "storing")] = BigInt(rightsInheriting);
    checkInt64(rightsInheriting);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

/** @param {number=} offset */ var doReadv = (stream, iov, iovcnt, offset) => {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((iov) >> 2), "loading")];
    var len = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((iov) + (4)) >> 2), "loading")];
    iov += 8;
    var curr = FS.read(stream, (growMemViews(), HEAP8), ptr, len, offset);
    if (curr < 0) return -1;
    ret += curr;
    if (curr < len) break;
    // nothing more to read
    if (typeof offset != "undefined") {
      offset += curr;
    }
  }
  return ret;
};

function _fd_read(fd, iov, iovcnt, pnum) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(92, 0, 1, fd, iov, iovcnt, pnum);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = doReadv(stream, iov, iovcnt);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((pnum) >> 2), "storing")] = num;
    checkInt32(num);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

function _fd_seek(fd, offset, whence, newOffset) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(93, 0, 1, fd, offset, whence, newOffset);
  offset = bigintToI53Checked(offset);
  try {
    if (isNaN(offset)) return 61;
    var stream = SYSCALLS.getStreamFromFD(fd);
    FS.llseek(stream, offset, whence);
    (growMemViews(), HEAP64)[SAFE_HEAP_INDEX((growMemViews(), HEAP64), ((newOffset) >> 3), "storing")] = BigInt(stream.position);
    checkInt64(stream.position);
    if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
    // reset readdir state
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

var _fd_sync = function(fd) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(94, 0, 1, fd);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    return Asyncify.handleSleep(wakeUp => {
      var mount = stream.node.mount;
      if (!mount.type.syncfs) {
        // We write directly to the file system, so there's nothing to do here.
        wakeUp(0);
        return;
      }
      mount.type.syncfs(mount, false, err => {
        wakeUp(err ? 29 : 0);
      });
    });
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
};

_fd_sync.isAsync = true;

/** @param {number=} offset */ var doWritev = (stream, iov, iovcnt, offset) => {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((iov) >> 2), "loading")];
    var len = (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((iov) + (4)) >> 2), "loading")];
    iov += 8;
    var curr = FS.write(stream, (growMemViews(), HEAP8), ptr, len, offset);
    if (curr < 0) return -1;
    ret += curr;
    if (curr < len) {
      // No more space to write.
      break;
    }
    if (typeof offset != "undefined") {
      offset += curr;
    }
  }
  return ret;
};

function _fd_write(fd, iov, iovcnt, pnum) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(95, 0, 1, fd, iov, iovcnt, pnum);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = doWritev(stream, iov, iovcnt);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((pnum) >> 2), "storing")] = num;
    checkInt32(num);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

function _getaddrinfo(node, service, hint, out) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(96, 0, 1, node, service, hint, out);
  // Note getaddrinfo currently only returns a single addrinfo with ai_next defaulting to NULL. When NULL
  // hints are specified or ai_family set to AF_UNSPEC or ai_socktype or ai_protocol set to 0 then we
  // really should provide a linked list of suitable addrinfo values.
  var addrs = [];
  var canon = null;
  var addr = 0;
  var port = 0;
  var flags = 0;
  var family = 0;
  var type = 0;
  var proto = 0;
  var ai, last;
  function allocaddrinfo(family, type, proto, canon, addr, port) {
    var sa, salen, ai;
    var errno;
    salen = family === 10 ? 28 : 16;
    addr = family === 10 ? inetNtop6(addr) : inetNtop4(addr);
    sa = _malloc(salen);
    errno = writeSockaddr(sa, family, addr, port);
    assert(!errno);
    ai = _malloc(32);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ai) + (4)) >> 2), "storing")] = family;
    checkInt32(family);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ai) + (8)) >> 2), "storing")] = type;
    checkInt32(type);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ai) + (12)) >> 2), "storing")] = proto;
    checkInt32(proto);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((ai) + (24)) >> 2), "storing")] = canon;
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((ai) + (20)) >> 2), "storing")] = sa;
    if (family === 10) {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ai) + (16)) >> 2), "storing")] = 28;
      checkInt32(28);
    } else {
      (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ai) + (16)) >> 2), "storing")] = 16;
      checkInt32(16);
    }
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ai) + (28)) >> 2), "storing")] = 0;
    checkInt32(0);
    return ai;
  }
  if (hint) {
    flags = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((hint) >> 2), "loading")];
    family = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((hint) + (4)) >> 2), "loading")];
    type = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((hint) + (8)) >> 2), "loading")];
    proto = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((hint) + (12)) >> 2), "loading")];
  }
  if (type && !proto) {
    proto = type === 2 ? 17 : 6;
  }
  if (!type && proto) {
    type = proto === 17 ? 2 : 1;
  }
  // If type or proto are set to zero in hints we should really be returning multiple addrinfo values, but for
  // now default to a TCP STREAM socket so we can at least return a sensible addrinfo given NULL hints.
  if (proto === 0) {
    proto = 6;
  }
  if (type === 0) {
    type = 1;
  }
  if (!node && !service) {
    return -2;
  }
  if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
    return -1;
  }
  if (hint !== 0 && ((growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), ((hint) >> 2), "loading")] & 2) && !node) {
    return -1;
  }
  if (flags & 32) {
    // TODO
    return -2;
  }
  if (type !== 0 && type !== 1 && type !== 2) {
    return -7;
  }
  if (family !== 0 && family !== 2 && family !== 10) {
    return -6;
  }
  if (service) {
    service = UTF8ToString(service);
    port = parseInt(service, 10);
    if (isNaN(port)) {
      if (flags & 1024) {
        return -2;
      }
      // TODO support resolving well-known service names from:
      // http://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.txt
      return -8;
    }
  }
  if (!node) {
    if (family === 0) {
      family = 2;
    }
    if ((flags & 1) === 0) {
      if (family === 2) {
        addr = _htonl(2130706433);
      } else {
        addr = [ 0, 0, 0, _htonl(1) ];
      }
    }
    ai = allocaddrinfo(family, type, proto, null, addr, port);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((out) >> 2), "storing")] = ai;
    return 0;
  }
  // try as a numeric address
  node = UTF8ToString(node);
  addr = inetPton4(node);
  if (addr !== null) {
    // incoming node is a valid ipv4 address
    if (family === 0 || family === 2) {
      family = 2;
    } else if (family === 10 && (flags & 8)) {
      addr = [ 0, 0, _htonl(65535), addr ];
      family = 10;
    } else {
      return -2;
    }
  } else {
    addr = inetPton6(node);
    if (addr !== null) {
      // incoming node is a valid ipv6 address
      if (family === 0 || family === 10) {
        family = 10;
      } else {
        return -2;
      }
    }
  }
  if (addr != null) {
    ai = allocaddrinfo(family, type, proto, node, addr, port);
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((out) >> 2), "storing")] = ai;
    return 0;
  }
  if (flags & 4) {
    return -2;
  }
  // try as a hostname
  // resolve the hostname to a temporary fake address
  node = DNS.lookup_name(node);
  addr = inetPton4(node);
  if (family === 0) {
    family = 2;
  } else if (family === 10) {
    addr = [ 0, 0, _htonl(65535), addr ];
  }
  ai = allocaddrinfo(family, type, proto, null, addr, port);
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((out) >> 2), "storing")] = ai;
  return 0;
}

var _glActiveTexture = _emscripten_glActiveTexture;

var _glAttachShader = _emscripten_glAttachShader;

var _glBindBuffer = _emscripten_glBindBuffer;

var _glBindSampler = _emscripten_glBindSampler;

var _glBindTexture = _emscripten_glBindTexture;

var _glBlendFunc = _emscripten_glBlendFunc;

var _glBufferData = _emscripten_glBufferData;

var _glBufferSubData = _emscripten_glBufferSubData;

var _glClear = _emscripten_glClear;

var _glClearColor = _emscripten_glClearColor;

var _glCompileShader = _emscripten_glCompileShader;

var _glCopyBufferSubData = _emscripten_glCopyBufferSubData;

var _glCreateProgram = _emscripten_glCreateProgram;

var _glCreateShader = _emscripten_glCreateShader;

var _glDeleteBuffers = _emscripten_glDeleteBuffers;

var _glDeleteProgram = _emscripten_glDeleteProgram;

var _glDeleteSamplers = _emscripten_glDeleteSamplers;

var _glDeleteShader = _emscripten_glDeleteShader;

var _glDeleteTextures = _emscripten_glDeleteTextures;

var _glDepthMask = _emscripten_glDepthMask;

var _glDetachShader = _emscripten_glDetachShader;

var _glDisable = _emscripten_glDisable;

var _glDisableVertexAttribArray = _emscripten_glDisableVertexAttribArray;

var _glDrawArrays = _emscripten_glDrawArrays;

var _glEnable = _emscripten_glEnable;

var _glEnableVertexAttribArray = _emscripten_glEnableVertexAttribArray;

var _glGenBuffers = _emscripten_glGenBuffers;

var _glGenSamplers = _emscripten_glGenSamplers;

var _glGenTextures = _emscripten_glGenTextures;

var _glGenerateMipmap = _emscripten_glGenerateMipmap;

var _glGetAttachedShaders = _emscripten_glGetAttachedShaders;

var _glGetIntegerv = _emscripten_glGetIntegerv;

var _glGetProgramInfoLog = _emscripten_glGetProgramInfoLog;

var _glGetProgramiv = _emscripten_glGetProgramiv;

var _glGetShaderInfoLog = _emscripten_glGetShaderInfoLog;

var _glGetShaderiv = _emscripten_glGetShaderiv;

var _glGetString = _emscripten_glGetString;

var _glGetUniformLocation = _emscripten_glGetUniformLocation;

var _glLinkProgram = _emscripten_glLinkProgram;

var _glPixelStorei = _emscripten_glPixelStorei;

var _glReadBuffer = _emscripten_glReadBuffer;

var _glReadPixels = _emscripten_glReadPixels;

var _glSamplerParameteri = _emscripten_glSamplerParameteri;

var _glScissor = _emscripten_glScissor;

var _glShaderSource = _emscripten_glShaderSource;

var _glTexImage2D = _emscripten_glTexImage2D;

var _glTexImage3D = _emscripten_glTexImage3D;

var _glTexParameterf = _emscripten_glTexParameterf;

var _glTexParameteri = _emscripten_glTexParameteri;

var _glTexSubImage2D = _emscripten_glTexSubImage2D;

var _glUniform1f = _emscripten_glUniform1f;

var _glUniform1fv = _emscripten_glUniform1fv;

var _glUniform1i = _emscripten_glUniform1i;

var _glUniform2fv = _emscripten_glUniform2fv;

var _glUniform4fv = _emscripten_glUniform4fv;

var _glUniformMatrix4x2fv = _emscripten_glUniformMatrix4x2fv;

var _glUseProgram = _emscripten_glUseProgram;

var _glVertexAttribIPointer = _emscripten_glVertexAttribIPointer;

var _glVertexAttribPointer = _emscripten_glVertexAttribPointer;

var _glViewport = _emscripten_glViewport;

var wasmTableMirror = [];

var getWasmTableEntry = funcPtr => {
  var func = wasmTableMirror[funcPtr];
  if (!func) {
    /** @suppress {checkTypes} */ wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
  }
  /** @suppress {checkTypes} */ assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
  return func;
};

var runAndAbortIfError = func => {
  try {
    return func();
  } catch (e) {
    abort(e);
  }
};

var createNamedFunction = (name, func) => Object.defineProperty(func, "name", {
  value: name
});

var Asyncify = {
  instrumentWasmImports(imports) {
    var importPattern = /^(invoke_.*|__asyncjs__.*)$/;
    for (let [x, original] of Object.entries(imports)) {
      if (typeof original == "function") {
        let isAsyncifyImport = original.isAsync || importPattern.test(x);
        imports[x] = (...args) => {
          var originalAsyncifyState = Asyncify.state;
          try {
            return original(...args);
          } finally {
            // Only asyncify-declared imports are allowed to change the
            // state.
            // Changing the state from normal to disabled is allowed (in any
            // function) as that is what shutdown does (and we don't have an
            // explicit list of shutdown imports).
            var changedToDisabled = originalAsyncifyState === Asyncify.State.Normal && Asyncify.state === Asyncify.State.Disabled;
            // invoke_* functions are allowed to change the state if we do
            // not ignore indirect calls.
            var ignoredInvoke = x.startsWith("invoke_") && true;
            if (Asyncify.state !== originalAsyncifyState && !isAsyncifyImport && !changedToDisabled && !ignoredInvoke) {
              abort(`import ${x} was not in ASYNCIFY_IMPORTS, but changed the state`);
            }
          }
        };
      }
    }
  },
  instrumentFunction(original) {
    var wrapper = (...args) => {
      Asyncify.exportCallStack.push(original);
      try {
        return original(...args);
      } finally {
        if (!ABORT) {
          var top = Asyncify.exportCallStack.pop();
          assert(top === original);
          Asyncify.maybeStopUnwind();
        }
      }
    };
    Asyncify.funcWrappers.set(original, wrapper);
    wrapper = createNamedFunction(`__asyncify_wrapper_${original.name}`, wrapper);
    return wrapper;
  },
  instrumentWasmExports(exports) {
    var ret = {};
    for (let [x, original] of Object.entries(exports)) {
      if (typeof original == "function") {
        var wrapper = Asyncify.instrumentFunction(original);
        ret[x] = wrapper;
      } else {
        ret[x] = original;
      }
    }
    return ret;
  },
  State: {
    Normal: 0,
    Unwinding: 1,
    Rewinding: 2,
    Disabled: 3
  },
  state: 0,
  StackSize: 1048576,
  currData: null,
  handleSleepReturnValue: 0,
  exportCallStack: [],
  callstackFuncToId: new Map,
  callStackIdToFunc: new Map,
  funcWrappers: new Map,
  callStackId: 0,
  asyncPromiseHandlers: null,
  sleepCallbacks: [],
  getCallStackId(func) {
    assert(func);
    if (!Asyncify.callstackFuncToId.has(func)) {
      var id = Asyncify.callStackId++;
      Asyncify.callstackFuncToId.set(func, id);
      Asyncify.callStackIdToFunc.set(id, func);
    }
    return Asyncify.callstackFuncToId.get(func);
  },
  maybeStopUnwind() {
    if (Asyncify.currData && Asyncify.state === Asyncify.State.Unwinding && Asyncify.exportCallStack.length === 0) {
      // We just finished unwinding.
      // Be sure to set the state before calling any other functions to avoid
      // possible infinite recursion here (For example in debug pthread builds
      // the dbg() function itself can call back into WebAssembly to get the
      // current pthread_self() pointer).
      Asyncify.state = Asyncify.State.Normal;
      runtimeKeepalivePush();
      // Keep the runtime alive so that a re-wind can be done later.
      runAndAbortIfError(_asyncify_stop_unwind);
      if (typeof Fibers != "undefined") {
        Fibers.trampoline();
      }
    }
  },
  whenDone() {
    assert(Asyncify.currData, "Tried to wait for an async operation when none is in progress.");
    assert(!Asyncify.asyncPromiseHandlers, "Cannot have multiple async operations in flight at once");
    return new Promise((resolve, reject) => {
      Asyncify.asyncPromiseHandlers = {
        resolve,
        reject
      };
    });
  },
  allocateData() {
    // An asyncify data structure has three fields:
    //  0  current stack pos
    //  4  max stack pos
    //  8  id of function at bottom of the call stack (callStackIdToFunc[id] == wasm func)
    // The Asyncify ABI only interprets the first two fields, the rest is for the runtime.
    // We also embed a stack in the same memory region here, right next to the structure.
    // This struct is also defined as asyncify_data_t in emscripten/fiber.h
    var ptr = _malloc(12 + Asyncify.StackSize);
    Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
    Asyncify.setDataRewindFunc(ptr);
    return ptr;
  },
  setDataHeader(ptr, stack, stackSize) {
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((ptr) >> 2), "storing")] = stack;
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), (((ptr) + (4)) >> 2), "storing")] = stack + stackSize;
  },
  setDataRewindFunc(ptr) {
    var bottomOfCallStack = Asyncify.exportCallStack[0];
    assert(bottomOfCallStack, "exportCallStack is empty");
    var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
    (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ptr) + (8)) >> 2), "storing")] = rewindId;
    checkInt32(rewindId);
  },
  getDataRewindFunc(ptr) {
    var id = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), (((ptr) + (8)) >> 2), "loading")];
    var func = Asyncify.callStackIdToFunc.get(id);
    assert(func, `id ${id} not found in callStackIdToFunc`);
    return func;
  },
  doRewind(ptr) {
    var original = Asyncify.getDataRewindFunc(ptr);
    var func = Asyncify.funcWrappers.get(original);
    assert(original);
    assert(func);
    // Once we have rewound and the stack we no longer need to artificially
    // keep the runtime alive.
    runtimeKeepalivePop();
    return func();
  },
  handleSleep(startAsync) {
    assert(Asyncify.state !== Asyncify.State.Disabled, "Asyncify cannot be done during or after the runtime exits");
    if (ABORT) return;
    if (Asyncify.state === Asyncify.State.Normal) {
      // Prepare to sleep. Call startAsync, and see what happens:
      // if the code decided to call our callback synchronously,
      // then no async operation was in fact begun, and we don't
      // need to do anything.
      var reachedCallback = false;
      var reachedAfterCallback = false;
      startAsync((handleSleepReturnValue = 0) => {
        assert(!handleSleepReturnValue || typeof handleSleepReturnValue == "number" || typeof handleSleepReturnValue == "boolean");
        // old emterpretify API supported other stuff
        if (ABORT) return;
        Asyncify.handleSleepReturnValue = handleSleepReturnValue;
        reachedCallback = true;
        if (!reachedAfterCallback) {
          // We are happening synchronously, so no need for async.
          return;
        }
        // This async operation did not happen synchronously, so we did
        // unwind. In that case there can be no compiled code on the stack,
        // as it might break later operations (we can rewind ok now, but if
        // we unwind again, we would unwind through the extra compiled code
        // too).
        assert(!Asyncify.exportCallStack.length, "Waking up (starting to rewind) must be done from JS, without compiled code on the stack.");
        Asyncify.state = Asyncify.State.Rewinding;
        runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
        if (typeof MainLoop != "undefined" && MainLoop.func) {
          MainLoop.resume();
        }
        var asyncWasmReturnValue, isError = false;
        try {
          asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData);
        } catch (err) {
          asyncWasmReturnValue = err;
          isError = true;
        }
        // Track whether the return value was handled by any promise handlers.
        var handled = false;
        if (!Asyncify.currData) {
          // All asynchronous execution has finished.
          // `asyncWasmReturnValue` now contains the final
          // return value of the exported async WASM function.
          // Note: `asyncWasmReturnValue` is distinct from
          // `Asyncify.handleSleepReturnValue`.
          // `Asyncify.handleSleepReturnValue` contains the return
          // value of the last C function to have executed
          // `Asyncify.handleSleep()`, where as `asyncWasmReturnValue`
          // contains the return value of the exported WASM function
          // that may have called C functions that
          // call `Asyncify.handleSleep()`.
          var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
          if (asyncPromiseHandlers) {
            Asyncify.asyncPromiseHandlers = null;
            (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
            handled = true;
          }
        }
        if (isError && !handled) {
          // If there was an error and it was not handled by now, we have no choice but to
          // rethrow that error into the global scope where it can be caught only by
          // `onerror` or `onunhandledpromiserejection`.
          throw asyncWasmReturnValue;
        }
      });
      reachedAfterCallback = true;
      if (!reachedCallback) {
        // A true async operation was begun; start a sleep.
        Asyncify.state = Asyncify.State.Unwinding;
        // TODO: reuse, don't alloc/free every sleep
        Asyncify.currData = Asyncify.allocateData();
        if (typeof MainLoop != "undefined" && MainLoop.func) {
          MainLoop.pause();
        }
        runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData));
      }
    } else if (Asyncify.state === Asyncify.State.Rewinding) {
      // Stop a resume.
      Asyncify.state = Asyncify.State.Normal;
      runAndAbortIfError(_asyncify_stop_rewind);
      _free(Asyncify.currData);
      Asyncify.currData = null;
      // Call all sleep callbacks now that the sleep-resume is all done.
      Asyncify.sleepCallbacks.forEach(callUserCallback);
    } else {
      abort(`invalid state: ${Asyncify.state}`);
    }
    return Asyncify.handleSleepReturnValue;
  },
  handleAsync: startAsync => Asyncify.handleSleep(wakeUp => {
    // TODO: add error handling as a second param when handleSleep implements it.
    startAsync().then(wakeUp);
  })
};

var getCFunc = ident => {
  var func = Module["_" + ident];
  // closure exported function
  assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
  return func;
};

var writeArrayToMemory = (array, buffer) => {
  assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
  (growMemViews(), HEAP8).set(array, buffer);
};

/**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Array=} args
     * @param {Object=} opts
     */ var ccall = (ident, returnType, argTypes, args, opts) => {
  // For fast lookup of conversion functions
  var toC = {
    "string": str => {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        // null string
        ret = stringToUTF8OnStack(str);
      }
      return ret;
    },
    "array": arr => {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };
  function convertReturnValue(ret) {
    if (returnType === "string") {
      return UTF8ToString(ret);
    }
    if (returnType === "boolean") return Boolean(ret);
    return ret;
  }
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  assert(returnType !== "array", 'Return type should not be "array".');
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  // Data for a previous async operation that was in flight before us.
  var previousAsync = Asyncify.currData;
  var ret = func(...cArgs);
  function onDone(ret) {
    runtimeKeepalivePop();
    if (stack !== 0) stackRestore(stack);
    return convertReturnValue(ret);
  }
  var asyncMode = opts?.async;
  // Keep the runtime alive through all calls. Note that this call might not be
  // async, but for simplicity we push and pop in all calls.
  runtimeKeepalivePush();
  if (Asyncify.currData != previousAsync) {
    // A change in async operation happened. If there was already an async
    // operation in flight before us, that is an error: we should not start
    // another async operation while one is active, and we should not stop one
    // either. The only valid combination is to have no change in the async
    // data (so we either had one in flight and left it alone, or we didn't have
    // one), or to have nothing in flight and to start one.
    assert(!(previousAsync && Asyncify.currData), "We cannot start an async operation when one is already flight");
    assert(!(previousAsync && !Asyncify.currData), "We cannot stop an async operation in flight");
    // This is a new async operation. The wasm is paused and has unwound its stack.
    // We need to return a Promise that resolves the return value
    // once the stack is rewound and execution finishes.
    assert(asyncMode, "The call to " + ident + " is running asynchronously. If this was intended, add the async option to the ccall/cwrap call.");
    return Asyncify.whenDone().then(onDone);
  }
  ret = onDone(ret);
  // If this is an async ccall, ensure we return a promise
  if (asyncMode) return Promise.resolve(ret);
  return ret;
};

var requestFullscreen = Browser.requestFullscreen;

var FS_createPath = (...args) => FS.createPath(...args);

var FS_unlink = (...args) => FS.unlink(...args);

var FS_createLazyFile = (...args) => FS.createLazyFile(...args);

var FS_createDevice = (...args) => FS.createDevice(...args);

PThread.init();

FS.createPreloadedFile = FS_createPreloadedFile;

FS.preloadFile = FS_preloadFile;

FS.staticInit();

// Signal GL rendering layer that processing of a new frame is about to
// start. This helps it optimize VBO double-buffering and reduce GPU stalls.
registerPreMainLoop(() => GL.newRenderingFrameStarted());

Module["requestAnimationFrame"] = MainLoop.requestAnimationFrame;

Module["pauseMainLoop"] = MainLoop.pause;

Module["resumeMainLoop"] = MainLoop.resume;

MainLoop.init();

for (let i = 0; i < 32; ++i) tempFixedLengthArray.push(new Array(i));

var miniTempWebGLFloatBuffersStorage = new Float32Array(288);

// Create GL_POOL_TEMP_BUFFERS_SIZE+1 temporary buffers, for uploads of size 0 through GL_POOL_TEMP_BUFFERS_SIZE inclusive
for (/**@suppress{duplicate}*/ var i = 0; i <= 288; ++i) {
  miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i);
}

var miniTempWebGLIntBuffersStorage = new Int32Array(288);

// Create GL_POOL_TEMP_BUFFERS_SIZE+1 temporary buffers, for uploads of size 0 through GL_POOL_TEMP_BUFFERS_SIZE inclusive
for (/**@suppress{duplicate}*/ var i = 0; i <= 288; ++i) {
  miniTempWebGLIntBuffers[i] = miniTempWebGLIntBuffersStorage.subarray(0, i);
}

// End JS library code
// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.
{
  // With WASM_ESM_INTEGRATION this has to happen at the top level and not
  // delayed until processModuleArgs.
  initMemory();
  // Begin ATMODULES hooks
  if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
  if (Module["preloadPlugins"]) preloadPlugins = Module["preloadPlugins"];
  if (Module["print"]) out = Module["print"];
  if (Module["printErr"]) err = Module["printErr"];
  if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
  // End ATMODULES hooks
  checkIncomingModuleAPI();
  if (Module["arguments"]) arguments_ = Module["arguments"];
  if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
  // Assertions on removed incoming Module JS APIs.
  assert(typeof Module["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
  assert(typeof Module["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
  assert(typeof Module["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
  assert(typeof Module["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
  assert(typeof Module["read"] == "undefined", "Module.read option was removed");
  assert(typeof Module["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
  assert(typeof Module["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
  assert(typeof Module["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");
  assert(typeof Module["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
  assert(typeof Module["ENVIRONMENT"] == "undefined", "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
  assert(typeof Module["STACK_SIZE"] == "undefined", "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
    while (Module["preInit"].length > 0) {
      Module["preInit"].shift()();
    }
  }
  consumedModuleProp("preInit");
}

// Begin runtime exports
Module["addRunDependency"] = addRunDependency;

Module["removeRunDependency"] = removeRunDependency;

Module["ccall"] = ccall;

Module["requestFullscreen"] = requestFullscreen;

Module["FS_preloadFile"] = FS_preloadFile;

Module["FS_unlink"] = FS_unlink;

Module["FS_createPath"] = FS_createPath;

Module["FS_createDevice"] = FS_createDevice;

Module["FS_createDataFile"] = FS_createDataFile;

Module["FS_createLazyFile"] = FS_createLazyFile;

var missingLibrarySymbols = [ "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getTempRet0", "withStackSave", "getDynCaller", "asmjsMangle", "HandleAllocator", "addOnInit", "addOnPostCtor", "addOnPreMain", "STACK_SIZE", "STACK_ALIGN", "POINTER_SIZE", "ASSERTIONS", "cwrap", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "getFunctionAddress", "addFunction", "removeFunction", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "hideEverythingExceptGivenElement", "restoreHiddenElements", "softFullscreenResizeWebGLRenderTarget", "registerPointerlockErrorEventCallback", "fillBatteryEventData", "registerBatteryEventCallback", "jsStackTrace", "getCallstack", "convertPCtoSourceLocation", "wasiRightsToMuslOFlags", "wasiOFlagsToMuslOFlags", "setImmediateWrapped", "safeRequestAnimationFrame", "clearImmediateWrapped", "registerPostMainLoop", "getPromise", "makePromise", "idsToPromises", "makePromiseCallback", "Browser_asyncPrepareDataCounter", "arraySum", "addDays", "FS_mkdirTree", "_setNetworkCallback", "writeGLArray", "emscripten_webgl_destroy_context_before_on_calling_thread", "registerWebGlEventCallback", "ALLOC_NORMAL", "ALLOC_STACK", "allocate", "writeStringToMemory", "writeAsciiToMemory", "allocateUTF8", "allocateUTF8OnStack", "demangle", "stackTrace", "getNativeTypeSize" ];

missingLibrarySymbols.forEach(missingLibrarySymbol);

var unexportedSymbols = [ "run", "out", "err", "callMain", "abort", "wasmExports", "HEAPF32", "HEAPF64", "HEAP8", "HEAPU8", "HEAP16", "HEAPU16", "HEAP32", "HEAPU32", "HEAP64", "HEAPU64", "writeStackCookie", "checkStackCookie", "writeI53ToI64", "readI53FromI64", "readI53FromU64", "INT53_MAX", "INT53_MIN", "bigintToI53Checked", "stackSave", "stackRestore", "stackAlloc", "setTempRet0", "createNamedFunction", "ptrToString", "zeroMemory", "exitJS", "getHeapMax", "growMemory", "ENV", "setStackLimits", "ERRNO_CODES", "strError", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "DNS", "Protocols", "Sockets", "timers", "warnOnce", "readEmAsmArgsArray", "readEmAsmArgs", "runEmAsmFunction", "runMainThreadEmAsm", "jstoi_q", "getExecutableName", "autoResumeAudioContext", "dynCallLegacy", "dynCall", "handleException", "keepRuntimeAlive", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "asyncLoad", "alignMemory", "mmapAlloc", "wasmTable", "wasmMemory", "getUniqueRunDependency", "noExitRuntime", "addOnPreRun", "addOnExit", "addOnPostRun", "freeTableIndexes", "functionsInTableMap", "setValue", "getValue", "PATH", "PATH_FS", "UTF8Decoder", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "intArrayFromString", "UTF16Decoder", "stringToNewUTF8", "stringToUTF8OnStack", "writeArrayToMemory", "JSEvents", "registerKeyEventCallback", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "setLetterbox", "currentFullscreenStrategy", "restoreOldWindowedStyle", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "setCanvasElementSizeCallingThread", "setCanvasElementSizeMainThread", "setCanvasElementSize", "getCanvasSizeCallingThread", "getCanvasSizeMainThread", "getCanvasElementSize", "UNWIND_CACHE", "ExitStatus", "getEnvStrings", "checkWasiClock", "doReadv", "doWritev", "initRandomFill", "randomFill", "safeSetTimeout", "emSetImmediate", "emClearImmediate_deps", "emClearImmediate", "registerPreMainLoop", "promiseMap", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "findMatchingCatch", "Browser", "requestFullScreen", "setCanvasSize", "getUserMedia", "createContext", "getPreloadedImageData__data", "wget", "MONTH_DAYS_REGULAR", "MONTH_DAYS_LEAP", "MONTH_DAYS_REGULAR_CUMULATIVE", "MONTH_DAYS_LEAP_CUMULATIVE", "isLeapYear", "ydayFromDate", "SYSCALLS", "getSocketFromFD", "getSocketAddress", "preloadPlugins", "FS_createPreloadedFile", "FS_modeStringToFlags", "FS_getMode", "FS_stdin_getChar_buffer", "FS_stdin_getChar", "FS_readFile", "FS", "FS_root", "FS_mounts", "FS_devices", "FS_streams", "FS_nextInode", "FS_nameTable", "FS_currentPath", "FS_initialized", "FS_ignorePermissions", "FS_filesystems", "FS_syncFSRequests", "FS_readFiles", "FS_lookupPath", "FS_getPath", "FS_hashName", "FS_hashAddNode", "FS_hashRemoveNode", "FS_lookupNode", "FS_createNode", "FS_destroyNode", "FS_isRoot", "FS_isMountpoint", "FS_isFile", "FS_isDir", "FS_isLink", "FS_isChrdev", "FS_isBlkdev", "FS_isFIFO", "FS_isSocket", "FS_flagsToPermissionString", "FS_nodePermissions", "FS_mayLookup", "FS_mayCreate", "FS_mayDelete", "FS_mayOpen", "FS_checkOpExists", "FS_nextfd", "FS_getStreamChecked", "FS_getStream", "FS_createStream", "FS_closeStream", "FS_dupStream", "FS_doSetAttr", "FS_chrdev_stream_ops", "FS_major", "FS_minor", "FS_makedev", "FS_registerDevice", "FS_getDevice", "FS_getMounts", "FS_syncfs", "FS_mount", "FS_unmount", "FS_lookup", "FS_mknod", "FS_statfs", "FS_statfsStream", "FS_statfsNode", "FS_create", "FS_mkdir", "FS_mkdev", "FS_symlink", "FS_rename", "FS_rmdir", "FS_readdir", "FS_readlink", "FS_stat", "FS_fstat", "FS_lstat", "FS_doChmod", "FS_chmod", "FS_lchmod", "FS_fchmod", "FS_doChown", "FS_chown", "FS_lchown", "FS_fchown", "FS_doTruncate", "FS_truncate", "FS_ftruncate", "FS_utime", "FS_open", "FS_close", "FS_isClosed", "FS_llseek", "FS_read", "FS_write", "FS_mmap", "FS_msync", "FS_ioctl", "FS_writeFile", "FS_cwd", "FS_chdir", "FS_createDefaultDirectories", "FS_createDefaultDevices", "FS_createSpecialDirectories", "FS_createStandardStreams", "FS_staticInit", "FS_init", "FS_quit", "FS_findObject", "FS_analyzePath", "FS_createFile", "FS_forceLoadFile", "FS_absolutePath", "FS_createFolder", "FS_createLink", "FS_joinPath", "FS_mmapAlloc", "FS_standardizePath", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "miniTempWebGLIntBuffers", "heapObjectForWebGLType", "toTypedArrayIndex", "webgl_enable_ANGLE_instanced_arrays", "webgl_enable_OES_vertex_array_object", "webgl_enable_WEBGL_draw_buffers", "webgl_enable_WEBGL_multi_draw", "webgl_enable_EXT_polygon_offset_clamp", "webgl_enable_EXT_clip_control", "webgl_enable_WEBGL_polygon_mode", "GL", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "colorChannelsInGlTextureFormat", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "__glGetActiveAttribOrUniform", "emscriptenWebGLGetBufferBinding", "emscriptenWebGLValidateMapBufferTarget", "AL", "GLUT", "EGL", "GLEW", "IDBStore", "runAndAbortIfError", "Asyncify", "Fibers", "SDL", "SDL_gfx", "waitAsyncPolyfilled", "emscriptenWebGLGetIndexed", "webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance", "webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance", "print", "printErr", "jstoi_s", "PThread", "terminateWorker", "cleanupThread", "registerTLSInit", "spawnThread", "exitOnMainThread", "proxyToMainThread", "proxiedJSCallArgs", "invokeEntryPoint", "checkMailbox" ];

unexportedSymbols.forEach(unexportedRuntimeSymbol);

// End runtime exports
// Begin JS library exports
// End JS library exports
// end include: postlibrary.js
// proxiedFunctionTable specifies the list of functions that can be called
// either synchronously or asynchronously from other threads in postMessage()d
// or internally queued events. This way a pthread in a Worker can synchronously
// access e.g. the DOM on the main thread.
var proxiedFunctionTable = [ _proc_exit, exitOnMainThread, pthreadCreateProxied, ___syscall__newselect, ___syscall_bind, ___syscall_chmod, ___syscall_connect, ___syscall_faccessat, ___syscall_fchmod, ___syscall_fchown32, ___syscall_fcntl64, ___syscall_fstat64, ___syscall_ftruncate64, ___syscall_getcwd, ___syscall_getdents64, ___syscall_getsockname, ___syscall_getsockopt, ___syscall_ioctl, ___syscall_lstat64, ___syscall_mkdirat, ___syscall_mknodat, ___syscall_newfstatat, ___syscall_openat, ___syscall_pipe, ___syscall_readlinkat, ___syscall_recvfrom, ___syscall_renameat, ___syscall_rmdir, ___syscall_sendto, ___syscall_socket, ___syscall_stat64, ___syscall_unlinkat, ___syscall_utimensat, __mmap_js, __munmap_js, _eglBindAPI, _eglChooseConfig, _eglCreateContext, _eglCreateWindowSurface, _eglDestroyContext, _eglDestroySurface, _eglGetConfigAttrib, _eglGetDisplay, _eglGetError, _eglInitialize, _eglMakeCurrent, _eglQueryString, _eglSwapBuffers, _eglSwapInterval, _eglTerminate, _eglWaitClient, _eglWaitNative, _emscripten_exit_fullscreen, getCanvasSizeMainThread, setCanvasElementSizeMainThread, _emscripten_exit_pointerlock, _emscripten_get_device_pixel_ratio, _emscripten_get_element_css_size, _emscripten_get_gamepad_status, _emscripten_get_num_gamepads, _emscripten_get_screen_size, _emscripten_request_fullscreen_strategy, _emscripten_request_pointerlock, _emscripten_sample_gamepad_data, _emscripten_set_beforeunload_callback_on_thread, _emscripten_set_blur_callback_on_thread, _emscripten_set_element_css_size, _emscripten_set_focus_callback_on_thread, _emscripten_set_fullscreenchange_callback_on_thread, _emscripten_set_gamepadconnected_callback_on_thread, _emscripten_set_gamepaddisconnected_callback_on_thread, _emscripten_set_keydown_callback_on_thread, _emscripten_set_keypress_callback_on_thread, _emscripten_set_keyup_callback_on_thread, _emscripten_set_mousedown_callback_on_thread, _emscripten_set_mouseenter_callback_on_thread, _emscripten_set_mouseleave_callback_on_thread, _emscripten_set_mousemove_callback_on_thread, _emscripten_set_mouseup_callback_on_thread, _emscripten_set_pointerlockchange_callback_on_thread, _emscripten_set_resize_callback_on_thread, _emscripten_set_touchcancel_callback_on_thread, _emscripten_set_touchend_callback_on_thread, _emscripten_set_touchmove_callback_on_thread, _emscripten_set_touchstart_callback_on_thread, _emscripten_set_visibilitychange_callback_on_thread, _emscripten_set_wheel_callback_on_thread, _emscripten_set_window_title, _environ_get, _environ_sizes_get, _fd_close, _fd_fdstat_get, _fd_read, _fd_seek, _fd_sync, _fd_write, _getaddrinfo ];

function checkIncomingModuleAPI() {
  ignoredModuleProp("fetchSettings");
}

var ASM_CONSTS = {
  729968: $0 => {
    var str = UTF8ToString($0) + "\n\n" + "Abort/Retry/Ignore/AlwaysIgnore? [ariA] :";
    var reply = window.prompt(str, "i");
    if (reply === null) {
      reply = "i";
    }
    return reply.length === 1 ? reply.charCodeAt(0) : -1;
  },
  730183: () => {
    if (typeof (AudioContext) !== "undefined") {
      return true;
    } else if (typeof (webkitAudioContext) !== "undefined") {
      return true;
    }
    return false;
  },
  730330: () => {
    if ((typeof (navigator.mediaDevices) !== "undefined") && (typeof (navigator.mediaDevices.getUserMedia) !== "undefined")) {
      return true;
    } else if (typeof (navigator.webkitGetUserMedia) !== "undefined") {
      return true;
    }
    return false;
  },
  730564: $0 => {
    if (typeof (Module["SDL2"]) === "undefined") {
      Module["SDL2"] = {};
    }
    var SDL2 = Module["SDL2"];
    if (!$0) {
      SDL2.audio = {};
    } else {
      SDL2.capture = {};
    }
    if (!SDL2.audioContext) {
      if (typeof (AudioContext) !== "undefined") {
        SDL2.audioContext = new AudioContext;
      } else if (typeof (webkitAudioContext) !== "undefined") {
        SDL2.audioContext = new webkitAudioContext;
      }
      if (SDL2.audioContext) {
        if ((typeof navigator.userActivation) === "undefined") {
          autoResumeAudioContext(SDL2.audioContext);
        }
      }
    }
    return SDL2.audioContext === undefined ? -1 : 0;
  },
  731116: () => {
    var SDL2 = Module["SDL2"];
    return SDL2.audioContext.sampleRate;
  },
  731184: ($0, $1, $2, $3) => {
    var SDL2 = Module["SDL2"];
    var have_microphone = function(stream) {
      if (SDL2.capture.silenceTimer !== undefined) {
        clearInterval(SDL2.capture.silenceTimer);
        SDL2.capture.silenceTimer = undefined;
        SDL2.capture.silenceBuffer = undefined;
      }
      SDL2.capture.mediaStreamNode = SDL2.audioContext.createMediaStreamSource(stream);
      SDL2.capture.scriptProcessorNode = SDL2.audioContext.createScriptProcessor($1, $0, 1);
      SDL2.capture.scriptProcessorNode.onaudioprocess = function(audioProcessingEvent) {
        if ((SDL2 === undefined) || (SDL2.capture === undefined)) {
          return;
        }
        audioProcessingEvent.outputBuffer.getChannelData(0).fill(0);
        SDL2.capture.currentCaptureBuffer = audioProcessingEvent.inputBuffer;
        dynCall("vp", $2, [ $3 ]);
      };
      SDL2.capture.mediaStreamNode.connect(SDL2.capture.scriptProcessorNode);
      SDL2.capture.scriptProcessorNode.connect(SDL2.audioContext.destination);
      SDL2.capture.stream = stream;
    };
    var no_microphone = function(error) {};
    SDL2.capture.silenceBuffer = SDL2.audioContext.createBuffer($0, $1, SDL2.audioContext.sampleRate);
    SDL2.capture.silenceBuffer.getChannelData(0).fill(0);
    var silence_callback = function() {
      SDL2.capture.currentCaptureBuffer = SDL2.capture.silenceBuffer;
      dynCall("vp", $2, [ $3 ]);
    };
    SDL2.capture.silenceTimer = setInterval(silence_callback, ($1 / SDL2.audioContext.sampleRate) * 1e3);
    if ((navigator.mediaDevices !== undefined) && (navigator.mediaDevices.getUserMedia !== undefined)) {
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      }).then(have_microphone).catch(no_microphone);
    } else if (navigator.webkitGetUserMedia !== undefined) {
      navigator.webkitGetUserMedia({
        audio: true,
        video: false
      }, have_microphone, no_microphone);
    }
  },
  732877: ($0, $1, $2, $3) => {
    var SDL2 = Module["SDL2"];
    SDL2.audio.scriptProcessorNode = SDL2.audioContext["createScriptProcessor"]($1, 0, $0);
    SDL2.audio.scriptProcessorNode["onaudioprocess"] = function(e) {
      if ((SDL2 === undefined) || (SDL2.audio === undefined)) {
        return;
      }
      if (SDL2.audio.silenceTimer !== undefined) {
        clearInterval(SDL2.audio.silenceTimer);
        SDL2.audio.silenceTimer = undefined;
        SDL2.audio.silenceBuffer = undefined;
      }
      SDL2.audio.currentOutputBuffer = e["outputBuffer"];
      dynCall("vp", $2, [ $3 ]);
    };
    SDL2.audio.scriptProcessorNode["connect"](SDL2.audioContext["destination"]);
    if (SDL2.audioContext.state === "suspended") {
      SDL2.audio.silenceBuffer = SDL2.audioContext.createBuffer($0, $1, SDL2.audioContext.sampleRate);
      SDL2.audio.silenceBuffer.getChannelData(0).fill(0);
      var silence_callback = function() {
        if ((typeof navigator.userActivation) !== "undefined") {
          if (navigator.userActivation.hasBeenActive) {
            SDL2.audioContext.resume();
          }
        }
        SDL2.audio.currentOutputBuffer = SDL2.audio.silenceBuffer;
        dynCall("vp", $2, [ $3 ]);
        SDL2.audio.currentOutputBuffer = undefined;
      };
      SDL2.audio.silenceTimer = setInterval(silence_callback, ($1 / SDL2.audioContext.sampleRate) * 1e3);
    }
  },
  734052: ($0, $1) => {
    var SDL2 = Module["SDL2"];
    var numChannels = SDL2.capture.currentCaptureBuffer.numberOfChannels;
    for (var c = 0; c < numChannels; ++c) {
      var channelData = SDL2.capture.currentCaptureBuffer.getChannelData(c);
      if (channelData.length != $1) {
        throw "Web Audio capture buffer length mismatch! Destination size: " + channelData.length + " samples vs expected " + $1 + " samples!";
      }
      if (numChannels == 1) {
        for (var j = 0; j < $1; ++j) {
          setValue($0 + (j * 4), channelData[j], "float");
        }
      } else {
        for (var j = 0; j < $1; ++j) {
          setValue($0 + (((j * numChannels) + c) * 4), channelData[j], "float");
        }
      }
    }
  },
  734657: ($0, $1) => {
    var SDL2 = Module["SDL2"];
    var buf = $0 >>> 2;
    var numChannels = SDL2.audio.currentOutputBuffer["numberOfChannels"];
    for (var c = 0; c < numChannels; ++c) {
      var channelData = SDL2.audio.currentOutputBuffer["getChannelData"](c);
      if (channelData.length != $1) {
        throw "Web Audio output buffer length mismatch! Destination size: " + channelData.length + " samples vs expected " + $1 + " samples!";
      }
      for (var j = 0; j < $1; ++j) {
        channelData[j] = (growMemViews(), HEAPF32)[SAFE_HEAP_INDEX((growMemViews(), HEAPF32), buf + (j * numChannels + c), "loading")];
      }
    }
  },
  735146: $0 => {
    var SDL2 = Module["SDL2"];
    if ($0) {
      if (SDL2.capture.silenceTimer !== undefined) {
        clearInterval(SDL2.capture.silenceTimer);
      }
      if (SDL2.capture.stream !== undefined) {
        var tracks = SDL2.capture.stream.getAudioTracks();
        for (var i = 0; i < tracks.length; i++) {
          SDL2.capture.stream.removeTrack(tracks[i]);
        }
      }
      if (SDL2.capture.scriptProcessorNode !== undefined) {
        SDL2.capture.scriptProcessorNode.onaudioprocess = function(audioProcessingEvent) {};
        SDL2.capture.scriptProcessorNode.disconnect();
      }
      if (SDL2.capture.mediaStreamNode !== undefined) {
        SDL2.capture.mediaStreamNode.disconnect();
      }
      SDL2.capture = undefined;
    } else {
      if (SDL2.audio.scriptProcessorNode != undefined) {
        SDL2.audio.scriptProcessorNode.disconnect();
      }
      if (SDL2.audio.silenceTimer !== undefined) {
        clearInterval(SDL2.audio.silenceTimer);
      }
      SDL2.audio = undefined;
    }
    if ((SDL2.audioContext !== undefined) && (SDL2.audio === undefined) && (SDL2.capture === undefined)) {
      SDL2.audioContext.close();
      SDL2.audioContext = undefined;
    }
  },
  736152: ($0, $1, $2) => {
    var w = $0;
    var h = $1;
    var pixels = $2;
    if (!Module["SDL2"]) Module["SDL2"] = {};
    var SDL2 = Module["SDL2"];
    if (SDL2.ctxCanvas !== Module["canvas"]) {
      SDL2.ctx = Browser.createContext(Module["canvas"], false, true);
      SDL2.ctxCanvas = Module["canvas"];
    }
    if (SDL2.w !== w || SDL2.h !== h || SDL2.imageCtx !== SDL2.ctx) {
      SDL2.image = SDL2.ctx.createImageData(w, h);
      SDL2.w = w;
      SDL2.h = h;
      SDL2.imageCtx = SDL2.ctx;
    }
    var data = SDL2.image.data;
    var src = pixels / 4;
    var dst = 0;
    var num;
    if (typeof CanvasPixelArray !== "undefined" && data instanceof CanvasPixelArray) {
      num = data.length;
      while (dst < num) {
        var val = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), src, "loading")];
        data[dst] = val & 255;
        data[dst + 1] = (val >> 8) & 255;
        data[dst + 2] = (val >> 16) & 255;
        data[dst + 3] = 255;
        src++;
        dst += 4;
      }
    } else {
      if (SDL2.data32Data !== data) {
        SDL2.data32 = new Int32Array(data.buffer);
        SDL2.data8 = new Uint8Array(data.buffer);
        SDL2.data32Data = data;
      }
      var data32 = SDL2.data32;
      num = data32.length;
      data32.set((growMemViews(), HEAP32).subarray(src, src + num));
      var data8 = SDL2.data8;
      var i = 3;
      var j = i + 4 * num;
      if (num % 8 == 0) {
        while (i < j) {
          data8[i] = 255;
          i = i + 4 | 0;
          data8[i] = 255;
          i = i + 4 | 0;
          data8[i] = 255;
          i = i + 4 | 0;
          data8[i] = 255;
          i = i + 4 | 0;
          data8[i] = 255;
          i = i + 4 | 0;
          data8[i] = 255;
          i = i + 4 | 0;
          data8[i] = 255;
          i = i + 4 | 0;
          data8[i] = 255;
          i = i + 4 | 0;
        }
      } else {
        while (i < j) {
          data8[i] = 255;
          i = i + 4 | 0;
        }
      }
    }
    SDL2.ctx.putImageData(SDL2.image, 0, 0);
  },
  737618: ($0, $1, $2, $3, $4) => {
    var w = $0;
    var h = $1;
    var hot_x = $2;
    var hot_y = $3;
    var pixels = $4;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var image = ctx.createImageData(w, h);
    var data = image.data;
    var src = pixels / 4;
    var dst = 0;
    var num;
    if (typeof CanvasPixelArray !== "undefined" && data instanceof CanvasPixelArray) {
      num = data.length;
      while (dst < num) {
        var val = (growMemViews(), HEAP32)[SAFE_HEAP_INDEX((growMemViews(), HEAP32), src, "loading")];
        data[dst] = val & 255;
        data[dst + 1] = (val >> 8) & 255;
        data[dst + 2] = (val >> 16) & 255;
        data[dst + 3] = (val >> 24) & 255;
        src++;
        dst += 4;
      }
    } else {
      var data32 = new Int32Array(data.buffer);
      num = data32.length;
      data32.set((growMemViews(), HEAP32).subarray(src, src + num));
    }
    ctx.putImageData(image, 0, 0);
    var url = hot_x === 0 && hot_y === 0 ? "url(" + canvas.toDataURL() + "), auto" : "url(" + canvas.toDataURL() + ") " + hot_x + " " + hot_y + ", auto";
    var urlBuf = _malloc(url.length + 1);
    stringToUTF8(url, urlBuf, url.length + 1);
    return urlBuf;
  },
  738606: $0 => {
    if (Module["canvas"]) {
      Module["canvas"].style["cursor"] = UTF8ToString($0);
    }
  },
  738689: () => {
    if (Module["canvas"]) {
      Module["canvas"].style["cursor"] = "none";
    }
  },
  738758: () => window.innerWidth,
  738788: () => window.innerHeight
};

// Imports from the Wasm binary.
var _free = makeInvalidEarlyAccess("_free");

var _malloc = makeInvalidEarlyAccess("_malloc");

var _main = Module["_main"] = makeInvalidEarlyAccess("_main");

var _pthread_self = makeInvalidEarlyAccess("_pthread_self");

var _EmscriptenCallbackQuit = Module["_EmscriptenCallbackQuit"] = makeInvalidEarlyAccess("_EmscriptenCallbackQuit");

var _EmscriptenCallbackDropFile = Module["_EmscriptenCallbackDropFile"] = makeInvalidEarlyAccess("_EmscriptenCallbackDropFile");

var _strerror = makeInvalidEarlyAccess("_strerror");

var _fflush = makeInvalidEarlyAccess("_fflush");

var _htons = makeInvalidEarlyAccess("_htons");

var _ntohs = makeInvalidEarlyAccess("_ntohs");

var _htonl = makeInvalidEarlyAccess("_htonl");

var __emscripten_tls_init = makeInvalidEarlyAccess("__emscripten_tls_init");

var _emscripten_builtin_memalign = makeInvalidEarlyAccess("_emscripten_builtin_memalign");

var __emscripten_run_callback_on_thread = makeInvalidEarlyAccess("__emscripten_run_callback_on_thread");

var ___funcs_on_exit = makeInvalidEarlyAccess("___funcs_on_exit");

var __emscripten_thread_init = makeInvalidEarlyAccess("__emscripten_thread_init");

var __emscripten_thread_crashed = makeInvalidEarlyAccess("__emscripten_thread_crashed");

var _emscripten_stack_get_end = makeInvalidEarlyAccess("_emscripten_stack_get_end");

var _emscripten_stack_get_base = makeInvalidEarlyAccess("_emscripten_stack_get_base");

var __emscripten_run_js_on_main_thread = makeInvalidEarlyAccess("__emscripten_run_js_on_main_thread");

var __emscripten_thread_free_data = makeInvalidEarlyAccess("__emscripten_thread_free_data");

var __emscripten_thread_exit = makeInvalidEarlyAccess("__emscripten_thread_exit");

var __emscripten_check_mailbox = makeInvalidEarlyAccess("__emscripten_check_mailbox");

var _emscripten_get_sbrk_ptr = makeInvalidEarlyAccess("_emscripten_get_sbrk_ptr");

var _sbrk = makeInvalidEarlyAccess("_sbrk");

var _setThrew = makeInvalidEarlyAccess("_setThrew");

var __emscripten_tempret_set = makeInvalidEarlyAccess("__emscripten_tempret_set");

var _emscripten_stack_init = makeInvalidEarlyAccess("_emscripten_stack_init");

var _emscripten_stack_set_limits = makeInvalidEarlyAccess("_emscripten_stack_set_limits");

var _emscripten_stack_get_free = makeInvalidEarlyAccess("_emscripten_stack_get_free");

var __emscripten_stack_restore = makeInvalidEarlyAccess("__emscripten_stack_restore");

var __emscripten_stack_alloc = makeInvalidEarlyAccess("__emscripten_stack_alloc");

var _emscripten_stack_get_current = makeInvalidEarlyAccess("_emscripten_stack_get_current");

var ___cxa_can_catch = makeInvalidEarlyAccess("___cxa_can_catch");

var ___set_stack_limits = Module["___set_stack_limits"] = makeInvalidEarlyAccess("___set_stack_limits");

var dynCall_ii = makeInvalidEarlyAccess("dynCall_ii");

var dynCall_v = makeInvalidEarlyAccess("dynCall_v");

var dynCall_vi = makeInvalidEarlyAccess("dynCall_vi");

var dynCall_viii = makeInvalidEarlyAccess("dynCall_viii");

var dynCall_iiiiii = makeInvalidEarlyAccess("dynCall_iiiiii");

var dynCall_iii = makeInvalidEarlyAccess("dynCall_iii");

var dynCall_vii = makeInvalidEarlyAccess("dynCall_vii");

var dynCall_iiiiiiiiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiiiiiiiii");

var dynCall_ji = makeInvalidEarlyAccess("dynCall_ji");

var dynCall_viiiifiii = makeInvalidEarlyAccess("dynCall_viiiifiii");

var dynCall_viifiii = makeInvalidEarlyAccess("dynCall_viifiii");

var dynCall_iiii = makeInvalidEarlyAccess("dynCall_iiii");

var dynCall_iiiii = makeInvalidEarlyAccess("dynCall_iiiii");

var dynCall_iiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiii");

var dynCall_viiii = makeInvalidEarlyAccess("dynCall_viiii");

var dynCall_fi = makeInvalidEarlyAccess("dynCall_fi");

var dynCall_viiif = makeInvalidEarlyAccess("dynCall_viiif");

var dynCall_iiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiii");

var dynCall_viiiiii = makeInvalidEarlyAccess("dynCall_viiiiii");

var dynCall_vifffi = makeInvalidEarlyAccess("dynCall_vifffi");

var dynCall_viiiii = makeInvalidEarlyAccess("dynCall_viiiii");

var dynCall_viffff = makeInvalidEarlyAccess("dynCall_viffff");

var dynCall_iiiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiiii");

var dynCall_viiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiii");

var dynCall_viiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiii");

var dynCall_vif = makeInvalidEarlyAccess("dynCall_vif");

var dynCall_viffffffffi = makeInvalidEarlyAccess("dynCall_viffffffffi");

var dynCall_viiiiffff = makeInvalidEarlyAccess("dynCall_viiiiffff");

var dynCall_viiiffff = makeInvalidEarlyAccess("dynCall_viiiffff");

var dynCall_vifff = makeInvalidEarlyAccess("dynCall_vifff");

var dynCall_iiifff = makeInvalidEarlyAccess("dynCall_iiifff");

var dynCall_iiif = makeInvalidEarlyAccess("dynCall_iiif");

var dynCall_iiiff = makeInvalidEarlyAccess("dynCall_iiiff");

var dynCall_iiiffff = makeInvalidEarlyAccess("dynCall_iiiffff");

var dynCall_vifffffi = makeInvalidEarlyAccess("dynCall_vifffffi");

var dynCall_viffffiiiifi = makeInvalidEarlyAccess("dynCall_viffffiiiifi");

var dynCall_iifffffi = makeInvalidEarlyAccess("dynCall_iifffffi");

var dynCall_viffffiif = makeInvalidEarlyAccess("dynCall_viffffiif");

var dynCall_viffffiiiiif = makeInvalidEarlyAccess("dynCall_viffffiiiiif");

var dynCall_fii = makeInvalidEarlyAccess("dynCall_fii");

var dynCall_viif = makeInvalidEarlyAccess("dynCall_viif");

var dynCall_viiff = makeInvalidEarlyAccess("dynCall_viiff");

var dynCall_viiiiifi = makeInvalidEarlyAccess("dynCall_viiiiifi");

var dynCall_viiiiif = makeInvalidEarlyAccess("dynCall_viiiiif");

var dynCall_viiiiff = makeInvalidEarlyAccess("dynCall_viiiiff");

var dynCall_viiiiiiffi = makeInvalidEarlyAccess("dynCall_viiiiiiffi");

var dynCall_fiii = makeInvalidEarlyAccess("dynCall_fiii");

var dynCall_vifffif = makeInvalidEarlyAccess("dynCall_vifffif");

var dynCall_fifiifii = makeInvalidEarlyAccess("dynCall_fifiifii");

var dynCall_viifiiffi = makeInvalidEarlyAccess("dynCall_viifiiffi");

var dynCall_iiffi = makeInvalidEarlyAccess("dynCall_iiffi");

var dynCall_fiiii = makeInvalidEarlyAccess("dynCall_fiiii");

var dynCall_iifii = makeInvalidEarlyAccess("dynCall_iifii");

var dynCall_iif = makeInvalidEarlyAccess("dynCall_iif");

var dynCall_iiiiiiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiiiiiii");

var dynCall_iidddd = makeInvalidEarlyAccess("dynCall_iidddd");

var dynCall_iiiiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiiiii");

var dynCall_jiji = makeInvalidEarlyAccess("dynCall_jiji");

var dynCall_i = makeInvalidEarlyAccess("dynCall_i");

var dynCall_iiji = makeInvalidEarlyAccess("dynCall_iiji");

var dynCall_dd = makeInvalidEarlyAccess("dynCall_dd");

var dynCall_dddd = makeInvalidEarlyAccess("dynCall_dddd");

var dynCall_vffff = makeInvalidEarlyAccess("dynCall_vffff");

var dynCall_vf = makeInvalidEarlyAccess("dynCall_vf");

var dynCall_viiiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiiii");

var dynCall_vff = makeInvalidEarlyAccess("dynCall_vff");

var dynCall_vfi = makeInvalidEarlyAccess("dynCall_vfi");

var dynCall_viff = makeInvalidEarlyAccess("dynCall_viff");

var dynCall_vfff = makeInvalidEarlyAccess("dynCall_vfff");

var dynCall_viiiiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiiiii");

var dynCall_viiiiiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiiiiii");

var dynCall_viifi = makeInvalidEarlyAccess("dynCall_viifi");

var dynCall_jii = makeInvalidEarlyAccess("dynCall_jii");

var dynCall_iiij = makeInvalidEarlyAccess("dynCall_iiij");

var dynCall_vijjjj = makeInvalidEarlyAccess("dynCall_vijjjj");

var dynCall_iiiij = makeInvalidEarlyAccess("dynCall_iiiij");

var dynCall_iij = makeInvalidEarlyAccess("dynCall_iij");

var dynCall_iijii = makeInvalidEarlyAccess("dynCall_iijii");

var dynCall_iiiiiij = makeInvalidEarlyAccess("dynCall_iiiiiij");

var dynCall_iidiiii = makeInvalidEarlyAccess("dynCall_iidiiii");

var dynCall_viijii = makeInvalidEarlyAccess("dynCall_viijii");

var dynCall_iiiiij = makeInvalidEarlyAccess("dynCall_iiiiij");

var dynCall_iiiiid = makeInvalidEarlyAccess("dynCall_iiiiid");

var dynCall_iiiiijj = makeInvalidEarlyAccess("dynCall_iiiiijj");

var dynCall_iiiiiijj = makeInvalidEarlyAccess("dynCall_iiiiiijj");

var _asyncify_start_unwind = makeInvalidEarlyAccess("_asyncify_start_unwind");

var _asyncify_stop_unwind = makeInvalidEarlyAccess("_asyncify_stop_unwind");

var _asyncify_start_rewind = makeInvalidEarlyAccess("_asyncify_start_rewind");

var _asyncify_stop_rewind = makeInvalidEarlyAccess("_asyncify_stop_rewind");

var __indirect_function_table = makeInvalidEarlyAccess("__indirect_function_table");

var wasmTable = makeInvalidEarlyAccess("wasmTable");

function assignWasmExports(wasmExports) {
  assert(typeof wasmExports["free"] != "undefined", "missing Wasm export: free");
  assert(typeof wasmExports["malloc"] != "undefined", "missing Wasm export: malloc");
  assert(typeof wasmExports["__main_argc_argv"] != "undefined", "missing Wasm export: __main_argc_argv");
  assert(typeof wasmExports["pthread_self"] != "undefined", "missing Wasm export: pthread_self");
  assert(typeof wasmExports["EmscriptenCallbackQuit"] != "undefined", "missing Wasm export: EmscriptenCallbackQuit");
  assert(typeof wasmExports["EmscriptenCallbackDropFile"] != "undefined", "missing Wasm export: EmscriptenCallbackDropFile");
  assert(typeof wasmExports["strerror"] != "undefined", "missing Wasm export: strerror");
  assert(typeof wasmExports["fflush"] != "undefined", "missing Wasm export: fflush");
  assert(typeof wasmExports["htons"] != "undefined", "missing Wasm export: htons");
  assert(typeof wasmExports["ntohs"] != "undefined", "missing Wasm export: ntohs");
  assert(typeof wasmExports["htonl"] != "undefined", "missing Wasm export: htonl");
  assert(typeof wasmExports["_emscripten_tls_init"] != "undefined", "missing Wasm export: _emscripten_tls_init");
  assert(typeof wasmExports["emscripten_builtin_memalign"] != "undefined", "missing Wasm export: emscripten_builtin_memalign");
  assert(typeof wasmExports["_emscripten_run_callback_on_thread"] != "undefined", "missing Wasm export: _emscripten_run_callback_on_thread");
  assert(typeof wasmExports["__funcs_on_exit"] != "undefined", "missing Wasm export: __funcs_on_exit");
  assert(typeof wasmExports["_emscripten_thread_init"] != "undefined", "missing Wasm export: _emscripten_thread_init");
  assert(typeof wasmExports["_emscripten_thread_crashed"] != "undefined", "missing Wasm export: _emscripten_thread_crashed");
  assert(typeof wasmExports["emscripten_stack_get_end"] != "undefined", "missing Wasm export: emscripten_stack_get_end");
  assert(typeof wasmExports["emscripten_stack_get_base"] != "undefined", "missing Wasm export: emscripten_stack_get_base");
  assert(typeof wasmExports["_emscripten_run_js_on_main_thread"] != "undefined", "missing Wasm export: _emscripten_run_js_on_main_thread");
  assert(typeof wasmExports["_emscripten_thread_free_data"] != "undefined", "missing Wasm export: _emscripten_thread_free_data");
  assert(typeof wasmExports["_emscripten_thread_exit"] != "undefined", "missing Wasm export: _emscripten_thread_exit");
  assert(typeof wasmExports["_emscripten_check_mailbox"] != "undefined", "missing Wasm export: _emscripten_check_mailbox");
  assert(typeof wasmExports["emscripten_get_sbrk_ptr"] != "undefined", "missing Wasm export: emscripten_get_sbrk_ptr");
  assert(typeof wasmExports["sbrk"] != "undefined", "missing Wasm export: sbrk");
  assert(typeof wasmExports["setThrew"] != "undefined", "missing Wasm export: setThrew");
  assert(typeof wasmExports["_emscripten_tempret_set"] != "undefined", "missing Wasm export: _emscripten_tempret_set");
  assert(typeof wasmExports["emscripten_stack_init"] != "undefined", "missing Wasm export: emscripten_stack_init");
  assert(typeof wasmExports["emscripten_stack_set_limits"] != "undefined", "missing Wasm export: emscripten_stack_set_limits");
  assert(typeof wasmExports["emscripten_stack_get_free"] != "undefined", "missing Wasm export: emscripten_stack_get_free");
  assert(typeof wasmExports["_emscripten_stack_restore"] != "undefined", "missing Wasm export: _emscripten_stack_restore");
  assert(typeof wasmExports["_emscripten_stack_alloc"] != "undefined", "missing Wasm export: _emscripten_stack_alloc");
  assert(typeof wasmExports["emscripten_stack_get_current"] != "undefined", "missing Wasm export: emscripten_stack_get_current");
  assert(typeof wasmExports["__cxa_can_catch"] != "undefined", "missing Wasm export: __cxa_can_catch");
  assert(typeof wasmExports["__set_stack_limits"] != "undefined", "missing Wasm export: __set_stack_limits");
  assert(typeof wasmExports["dynCall_ii"] != "undefined", "missing Wasm export: dynCall_ii");
  assert(typeof wasmExports["dynCall_v"] != "undefined", "missing Wasm export: dynCall_v");
  assert(typeof wasmExports["dynCall_vi"] != "undefined", "missing Wasm export: dynCall_vi");
  assert(typeof wasmExports["dynCall_viii"] != "undefined", "missing Wasm export: dynCall_viii");
  assert(typeof wasmExports["dynCall_iiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiii");
  assert(typeof wasmExports["dynCall_iii"] != "undefined", "missing Wasm export: dynCall_iii");
  assert(typeof wasmExports["dynCall_vii"] != "undefined", "missing Wasm export: dynCall_vii");
  assert(typeof wasmExports["dynCall_iiiiiiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiiiiiiiii");
  assert(typeof wasmExports["dynCall_ji"] != "undefined", "missing Wasm export: dynCall_ji");
  assert(typeof wasmExports["dynCall_viiiifiii"] != "undefined", "missing Wasm export: dynCall_viiiifiii");
  assert(typeof wasmExports["dynCall_viifiii"] != "undefined", "missing Wasm export: dynCall_viifiii");
  assert(typeof wasmExports["dynCall_iiii"] != "undefined", "missing Wasm export: dynCall_iiii");
  assert(typeof wasmExports["dynCall_iiiii"] != "undefined", "missing Wasm export: dynCall_iiiii");
  assert(typeof wasmExports["dynCall_iiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiii");
  assert(typeof wasmExports["dynCall_viiii"] != "undefined", "missing Wasm export: dynCall_viiii");
  assert(typeof wasmExports["dynCall_fi"] != "undefined", "missing Wasm export: dynCall_fi");
  assert(typeof wasmExports["dynCall_viiif"] != "undefined", "missing Wasm export: dynCall_viiif");
  assert(typeof wasmExports["dynCall_iiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiii");
  assert(typeof wasmExports["dynCall_viiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiii");
  assert(typeof wasmExports["dynCall_vifffi"] != "undefined", "missing Wasm export: dynCall_vifffi");
  assert(typeof wasmExports["dynCall_viiiii"] != "undefined", "missing Wasm export: dynCall_viiiii");
  assert(typeof wasmExports["dynCall_viffff"] != "undefined", "missing Wasm export: dynCall_viffff");
  assert(typeof wasmExports["dynCall_iiiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiiii");
  assert(typeof wasmExports["dynCall_viiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiii");
  assert(typeof wasmExports["dynCall_viiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiii");
  assert(typeof wasmExports["dynCall_vif"] != "undefined", "missing Wasm export: dynCall_vif");
  assert(typeof wasmExports["dynCall_viffffffffi"] != "undefined", "missing Wasm export: dynCall_viffffffffi");
  assert(typeof wasmExports["dynCall_viiiiffff"] != "undefined", "missing Wasm export: dynCall_viiiiffff");
  assert(typeof wasmExports["dynCall_viiiffff"] != "undefined", "missing Wasm export: dynCall_viiiffff");
  assert(typeof wasmExports["dynCall_vifff"] != "undefined", "missing Wasm export: dynCall_vifff");
  assert(typeof wasmExports["dynCall_iiifff"] != "undefined", "missing Wasm export: dynCall_iiifff");
  assert(typeof wasmExports["dynCall_iiif"] != "undefined", "missing Wasm export: dynCall_iiif");
  assert(typeof wasmExports["dynCall_iiiff"] != "undefined", "missing Wasm export: dynCall_iiiff");
  assert(typeof wasmExports["dynCall_iiiffff"] != "undefined", "missing Wasm export: dynCall_iiiffff");
  assert(typeof wasmExports["dynCall_vifffffi"] != "undefined", "missing Wasm export: dynCall_vifffffi");
  assert(typeof wasmExports["dynCall_viffffiiiifi"] != "undefined", "missing Wasm export: dynCall_viffffiiiifi");
  assert(typeof wasmExports["dynCall_iifffffi"] != "undefined", "missing Wasm export: dynCall_iifffffi");
  assert(typeof wasmExports["dynCall_viffffiif"] != "undefined", "missing Wasm export: dynCall_viffffiif");
  assert(typeof wasmExports["dynCall_viffffiiiiif"] != "undefined", "missing Wasm export: dynCall_viffffiiiiif");
  assert(typeof wasmExports["dynCall_fii"] != "undefined", "missing Wasm export: dynCall_fii");
  assert(typeof wasmExports["dynCall_viif"] != "undefined", "missing Wasm export: dynCall_viif");
  assert(typeof wasmExports["dynCall_viiff"] != "undefined", "missing Wasm export: dynCall_viiff");
  assert(typeof wasmExports["dynCall_viiiiifi"] != "undefined", "missing Wasm export: dynCall_viiiiifi");
  assert(typeof wasmExports["dynCall_viiiiif"] != "undefined", "missing Wasm export: dynCall_viiiiif");
  assert(typeof wasmExports["dynCall_viiiiff"] != "undefined", "missing Wasm export: dynCall_viiiiff");
  assert(typeof wasmExports["dynCall_viiiiiiffi"] != "undefined", "missing Wasm export: dynCall_viiiiiiffi");
  assert(typeof wasmExports["dynCall_fiii"] != "undefined", "missing Wasm export: dynCall_fiii");
  assert(typeof wasmExports["dynCall_vifffif"] != "undefined", "missing Wasm export: dynCall_vifffif");
  assert(typeof wasmExports["dynCall_fifiifii"] != "undefined", "missing Wasm export: dynCall_fifiifii");
  assert(typeof wasmExports["dynCall_viifiiffi"] != "undefined", "missing Wasm export: dynCall_viifiiffi");
  assert(typeof wasmExports["dynCall_iiffi"] != "undefined", "missing Wasm export: dynCall_iiffi");
  assert(typeof wasmExports["dynCall_fiiii"] != "undefined", "missing Wasm export: dynCall_fiiii");
  assert(typeof wasmExports["dynCall_iifii"] != "undefined", "missing Wasm export: dynCall_iifii");
  assert(typeof wasmExports["dynCall_iif"] != "undefined", "missing Wasm export: dynCall_iif");
  assert(typeof wasmExports["dynCall_iiiiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiiiiiii");
  assert(typeof wasmExports["dynCall_iidddd"] != "undefined", "missing Wasm export: dynCall_iidddd");
  assert(typeof wasmExports["dynCall_iiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiiiii");
  assert(typeof wasmExports["dynCall_jiji"] != "undefined", "missing Wasm export: dynCall_jiji");
  assert(typeof wasmExports["dynCall_i"] != "undefined", "missing Wasm export: dynCall_i");
  assert(typeof wasmExports["dynCall_iiji"] != "undefined", "missing Wasm export: dynCall_iiji");
  assert(typeof wasmExports["dynCall_dd"] != "undefined", "missing Wasm export: dynCall_dd");
  assert(typeof wasmExports["dynCall_dddd"] != "undefined", "missing Wasm export: dynCall_dddd");
  assert(typeof wasmExports["dynCall_vffff"] != "undefined", "missing Wasm export: dynCall_vffff");
  assert(typeof wasmExports["dynCall_vf"] != "undefined", "missing Wasm export: dynCall_vf");
  assert(typeof wasmExports["dynCall_viiiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiiii");
  assert(typeof wasmExports["dynCall_vff"] != "undefined", "missing Wasm export: dynCall_vff");
  assert(typeof wasmExports["dynCall_vfi"] != "undefined", "missing Wasm export: dynCall_vfi");
  assert(typeof wasmExports["dynCall_viff"] != "undefined", "missing Wasm export: dynCall_viff");
  assert(typeof wasmExports["dynCall_vfff"] != "undefined", "missing Wasm export: dynCall_vfff");
  assert(typeof wasmExports["dynCall_viiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiiiii");
  assert(typeof wasmExports["dynCall_viiiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiiiiii");
  assert(typeof wasmExports["dynCall_viifi"] != "undefined", "missing Wasm export: dynCall_viifi");
  assert(typeof wasmExports["dynCall_jii"] != "undefined", "missing Wasm export: dynCall_jii");
  assert(typeof wasmExports["dynCall_iiij"] != "undefined", "missing Wasm export: dynCall_iiij");
  assert(typeof wasmExports["dynCall_vijjjj"] != "undefined", "missing Wasm export: dynCall_vijjjj");
  assert(typeof wasmExports["dynCall_iiiij"] != "undefined", "missing Wasm export: dynCall_iiiij");
  assert(typeof wasmExports["dynCall_iij"] != "undefined", "missing Wasm export: dynCall_iij");
  assert(typeof wasmExports["dynCall_iijii"] != "undefined", "missing Wasm export: dynCall_iijii");
  assert(typeof wasmExports["dynCall_iiiiiij"] != "undefined", "missing Wasm export: dynCall_iiiiiij");
  assert(typeof wasmExports["dynCall_iidiiii"] != "undefined", "missing Wasm export: dynCall_iidiiii");
  assert(typeof wasmExports["dynCall_viijii"] != "undefined", "missing Wasm export: dynCall_viijii");
  assert(typeof wasmExports["dynCall_iiiiij"] != "undefined", "missing Wasm export: dynCall_iiiiij");
  assert(typeof wasmExports["dynCall_iiiiid"] != "undefined", "missing Wasm export: dynCall_iiiiid");
  assert(typeof wasmExports["dynCall_iiiiijj"] != "undefined", "missing Wasm export: dynCall_iiiiijj");
  assert(typeof wasmExports["dynCall_iiiiiijj"] != "undefined", "missing Wasm export: dynCall_iiiiiijj");
  assert(typeof wasmExports["asyncify_start_unwind"] != "undefined", "missing Wasm export: asyncify_start_unwind");
  assert(typeof wasmExports["asyncify_stop_unwind"] != "undefined", "missing Wasm export: asyncify_stop_unwind");
  assert(typeof wasmExports["asyncify_start_rewind"] != "undefined", "missing Wasm export: asyncify_start_rewind");
  assert(typeof wasmExports["asyncify_stop_rewind"] != "undefined", "missing Wasm export: asyncify_stop_rewind");
  assert(typeof wasmExports["__indirect_function_table"] != "undefined", "missing Wasm export: __indirect_function_table");
  _free = createExportWrapper("free", 1);
  _malloc = createExportWrapper("malloc", 1);
  _main = Module["_main"] = createExportWrapper("__main_argc_argv", 2);
  _pthread_self = createExportWrapper("pthread_self", 0);
  _EmscriptenCallbackQuit = Module["_EmscriptenCallbackQuit"] = createExportWrapper("EmscriptenCallbackQuit", 0);
  _EmscriptenCallbackDropFile = Module["_EmscriptenCallbackDropFile"] = createExportWrapper("EmscriptenCallbackDropFile", 1);
  _strerror = createExportWrapper("strerror", 1);
  _fflush = createExportWrapper("fflush", 1);
  _htons = createExportWrapper("htons", 1);
  _ntohs = createExportWrapper("ntohs", 1);
  _htonl = createExportWrapper("htonl", 1);
  __emscripten_tls_init = createExportWrapper("_emscripten_tls_init", 0);
  _emscripten_builtin_memalign = createExportWrapper("emscripten_builtin_memalign", 2);
  __emscripten_run_callback_on_thread = createExportWrapper("_emscripten_run_callback_on_thread", 6);
  ___funcs_on_exit = createExportWrapper("__funcs_on_exit", 0);
  __emscripten_thread_init = createExportWrapper("_emscripten_thread_init", 6);
  __emscripten_thread_crashed = createExportWrapper("_emscripten_thread_crashed", 0);
  _emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"];
  _emscripten_stack_get_base = wasmExports["emscripten_stack_get_base"];
  __emscripten_run_js_on_main_thread = createExportWrapper("_emscripten_run_js_on_main_thread", 5);
  __emscripten_thread_free_data = createExportWrapper("_emscripten_thread_free_data", 1);
  __emscripten_thread_exit = createExportWrapper("_emscripten_thread_exit", 1);
  __emscripten_check_mailbox = createExportWrapper("_emscripten_check_mailbox", 0);
  _emscripten_get_sbrk_ptr = wasmExports["emscripten_get_sbrk_ptr"];
  _sbrk = createExportWrapper("sbrk", 1);
  _setThrew = createExportWrapper("setThrew", 2);
  __emscripten_tempret_set = createExportWrapper("_emscripten_tempret_set", 1);
  _emscripten_stack_init = wasmExports["emscripten_stack_init"];
  _emscripten_stack_set_limits = wasmExports["emscripten_stack_set_limits"];
  _emscripten_stack_get_free = wasmExports["emscripten_stack_get_free"];
  __emscripten_stack_restore = wasmExports["_emscripten_stack_restore"];
  __emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"];
  _emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"];
  ___cxa_can_catch = createExportWrapper("__cxa_can_catch", 3);
  ___set_stack_limits = Module["___set_stack_limits"] = createExportWrapper("__set_stack_limits", 2);
  dynCall_ii = dynCalls["ii"] = createExportWrapper("dynCall_ii", 2);
  dynCall_v = dynCalls["v"] = createExportWrapper("dynCall_v", 1);
  dynCall_vi = dynCalls["vi"] = createExportWrapper("dynCall_vi", 2);
  dynCall_viii = dynCalls["viii"] = createExportWrapper("dynCall_viii", 4);
  dynCall_iiiiii = dynCalls["iiiiii"] = createExportWrapper("dynCall_iiiiii", 6);
  dynCall_iii = dynCalls["iii"] = createExportWrapper("dynCall_iii", 3);
  dynCall_vii = dynCalls["vii"] = createExportWrapper("dynCall_vii", 3);
  dynCall_iiiiiiiiiiiiii = dynCalls["iiiiiiiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiiiiiiii", 14);
  dynCall_ji = dynCalls["ji"] = createExportWrapper("dynCall_ji", 2);
  dynCall_viiiifiii = dynCalls["viiiifiii"] = createExportWrapper("dynCall_viiiifiii", 9);
  dynCall_viifiii = dynCalls["viifiii"] = createExportWrapper("dynCall_viifiii", 7);
  dynCall_iiii = dynCalls["iiii"] = createExportWrapper("dynCall_iiii", 4);
  dynCall_iiiii = dynCalls["iiiii"] = createExportWrapper("dynCall_iiiii", 5);
  dynCall_iiiiiiii = dynCalls["iiiiiiii"] = createExportWrapper("dynCall_iiiiiiii", 8);
  dynCall_viiii = dynCalls["viiii"] = createExportWrapper("dynCall_viiii", 5);
  dynCall_fi = dynCalls["fi"] = createExportWrapper("dynCall_fi", 2);
  dynCall_viiif = dynCalls["viiif"] = createExportWrapper("dynCall_viiif", 5);
  dynCall_iiiiiii = dynCalls["iiiiiii"] = createExportWrapper("dynCall_iiiiiii", 7);
  dynCall_viiiiii = dynCalls["viiiiii"] = createExportWrapper("dynCall_viiiiii", 7);
  dynCall_vifffi = dynCalls["vifffi"] = createExportWrapper("dynCall_vifffi", 6);
  dynCall_viiiii = dynCalls["viiiii"] = createExportWrapper("dynCall_viiiii", 6);
  dynCall_viffff = dynCalls["viffff"] = createExportWrapper("dynCall_viffff", 6);
  dynCall_iiiiiiiii = dynCalls["iiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiii", 9);
  dynCall_viiiiiii = dynCalls["viiiiiii"] = createExportWrapper("dynCall_viiiiiii", 8);
  dynCall_viiiiiiii = dynCalls["viiiiiiii"] = createExportWrapper("dynCall_viiiiiiii", 9);
  dynCall_vif = dynCalls["vif"] = createExportWrapper("dynCall_vif", 3);
  dynCall_viffffffffi = dynCalls["viffffffffi"] = createExportWrapper("dynCall_viffffffffi", 11);
  dynCall_viiiiffff = dynCalls["viiiiffff"] = createExportWrapper("dynCall_viiiiffff", 9);
  dynCall_viiiffff = dynCalls["viiiffff"] = createExportWrapper("dynCall_viiiffff", 8);
  dynCall_vifff = dynCalls["vifff"] = createExportWrapper("dynCall_vifff", 5);
  dynCall_iiifff = dynCalls["iiifff"] = createExportWrapper("dynCall_iiifff", 6);
  dynCall_iiif = dynCalls["iiif"] = createExportWrapper("dynCall_iiif", 4);
  dynCall_iiiff = dynCalls["iiiff"] = createExportWrapper("dynCall_iiiff", 5);
  dynCall_iiiffff = dynCalls["iiiffff"] = createExportWrapper("dynCall_iiiffff", 7);
  dynCall_vifffffi = dynCalls["vifffffi"] = createExportWrapper("dynCall_vifffffi", 8);
  dynCall_viffffiiiifi = dynCalls["viffffiiiifi"] = createExportWrapper("dynCall_viffffiiiifi", 12);
  dynCall_iifffffi = dynCalls["iifffffi"] = createExportWrapper("dynCall_iifffffi", 8);
  dynCall_viffffiif = dynCalls["viffffiif"] = createExportWrapper("dynCall_viffffiif", 9);
  dynCall_viffffiiiiif = dynCalls["viffffiiiiif"] = createExportWrapper("dynCall_viffffiiiiif", 12);
  dynCall_fii = dynCalls["fii"] = createExportWrapper("dynCall_fii", 3);
  dynCall_viif = dynCalls["viif"] = createExportWrapper("dynCall_viif", 4);
  dynCall_viiff = dynCalls["viiff"] = createExportWrapper("dynCall_viiff", 5);
  dynCall_viiiiifi = dynCalls["viiiiifi"] = createExportWrapper("dynCall_viiiiifi", 8);
  dynCall_viiiiif = dynCalls["viiiiif"] = createExportWrapper("dynCall_viiiiif", 7);
  dynCall_viiiiff = dynCalls["viiiiff"] = createExportWrapper("dynCall_viiiiff", 7);
  dynCall_viiiiiiffi = dynCalls["viiiiiiffi"] = createExportWrapper("dynCall_viiiiiiffi", 10);
  dynCall_fiii = dynCalls["fiii"] = createExportWrapper("dynCall_fiii", 4);
  dynCall_vifffif = dynCalls["vifffif"] = createExportWrapper("dynCall_vifffif", 7);
  dynCall_fifiifii = dynCalls["fifiifii"] = createExportWrapper("dynCall_fifiifii", 8);
  dynCall_viifiiffi = dynCalls["viifiiffi"] = createExportWrapper("dynCall_viifiiffi", 9);
  dynCall_iiffi = dynCalls["iiffi"] = createExportWrapper("dynCall_iiffi", 5);
  dynCall_fiiii = dynCalls["fiiii"] = createExportWrapper("dynCall_fiiii", 5);
  dynCall_iifii = dynCalls["iifii"] = createExportWrapper("dynCall_iifii", 5);
  dynCall_iif = dynCalls["iif"] = createExportWrapper("dynCall_iif", 3);
  dynCall_iiiiiiiiiiii = dynCalls["iiiiiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiiiiii", 12);
  dynCall_iidddd = dynCalls["iidddd"] = createExportWrapper("dynCall_iidddd", 6);
  dynCall_iiiiiiiiii = dynCalls["iiiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiiii", 10);
  dynCall_jiji = dynCalls["jiji"] = createExportWrapper("dynCall_jiji", 4);
  dynCall_i = dynCalls["i"] = createExportWrapper("dynCall_i", 1);
  dynCall_iiji = dynCalls["iiji"] = createExportWrapper("dynCall_iiji", 4);
  dynCall_dd = dynCalls["dd"] = createExportWrapper("dynCall_dd", 2);
  dynCall_dddd = dynCalls["dddd"] = createExportWrapper("dynCall_dddd", 4);
  dynCall_vffff = dynCalls["vffff"] = createExportWrapper("dynCall_vffff", 5);
  dynCall_vf = dynCalls["vf"] = createExportWrapper("dynCall_vf", 2);
  dynCall_viiiiiiiii = dynCalls["viiiiiiiii"] = createExportWrapper("dynCall_viiiiiiiii", 10);
  dynCall_vff = dynCalls["vff"] = createExportWrapper("dynCall_vff", 3);
  dynCall_vfi = dynCalls["vfi"] = createExportWrapper("dynCall_vfi", 3);
  dynCall_viff = dynCalls["viff"] = createExportWrapper("dynCall_viff", 4);
  dynCall_vfff = dynCalls["vfff"] = createExportWrapper("dynCall_vfff", 4);
  dynCall_viiiiiiiiii = dynCalls["viiiiiiiiii"] = createExportWrapper("dynCall_viiiiiiiiii", 11);
  dynCall_viiiiiiiiiii = dynCalls["viiiiiiiiiii"] = createExportWrapper("dynCall_viiiiiiiiiii", 12);
  dynCall_viifi = dynCalls["viifi"] = createExportWrapper("dynCall_viifi", 5);
  dynCall_jii = dynCalls["jii"] = createExportWrapper("dynCall_jii", 3);
  dynCall_iiij = dynCalls["iiij"] = createExportWrapper("dynCall_iiij", 4);
  dynCall_vijjjj = dynCalls["vijjjj"] = createExportWrapper("dynCall_vijjjj", 6);
  dynCall_iiiij = dynCalls["iiiij"] = createExportWrapper("dynCall_iiiij", 5);
  dynCall_iij = dynCalls["iij"] = createExportWrapper("dynCall_iij", 3);
  dynCall_iijii = dynCalls["iijii"] = createExportWrapper("dynCall_iijii", 5);
  dynCall_iiiiiij = dynCalls["iiiiiij"] = createExportWrapper("dynCall_iiiiiij", 7);
  dynCall_iidiiii = dynCalls["iidiiii"] = createExportWrapper("dynCall_iidiiii", 7);
  dynCall_viijii = dynCalls["viijii"] = createExportWrapper("dynCall_viijii", 6);
  dynCall_iiiiij = dynCalls["iiiiij"] = createExportWrapper("dynCall_iiiiij", 6);
  dynCall_iiiiid = dynCalls["iiiiid"] = createExportWrapper("dynCall_iiiiid", 6);
  dynCall_iiiiijj = dynCalls["iiiiijj"] = createExportWrapper("dynCall_iiiiijj", 7);
  dynCall_iiiiiijj = dynCalls["iiiiiijj"] = createExportWrapper("dynCall_iiiiiijj", 8);
  _asyncify_start_unwind = createExportWrapper("asyncify_start_unwind", 1);
  _asyncify_stop_unwind = createExportWrapper("asyncify_stop_unwind", 0);
  _asyncify_start_rewind = createExportWrapper("asyncify_start_rewind", 1);
  _asyncify_stop_rewind = createExportWrapper("asyncify_stop_rewind", 0);
  __indirect_function_table = wasmTable = wasmExports["__indirect_function_table"];
}

var wasmImports;

function assignWasmImports() {
  wasmImports = {
    /** @export */ __assert_fail: ___assert_fail,
    /** @export */ __call_sighandler: ___call_sighandler,
    /** @export */ __cxa_find_matching_catch_2: ___cxa_find_matching_catch_2,
    /** @export */ __cxa_throw: ___cxa_throw,
    /** @export */ __handle_stack_overflow: ___handle_stack_overflow,
    /** @export */ __pthread_create_js: ___pthread_create_js,
    /** @export */ __resumeException: ___resumeException,
    /** @export */ __syscall__newselect: ___syscall__newselect,
    /** @export */ __syscall_bind: ___syscall_bind,
    /** @export */ __syscall_chmod: ___syscall_chmod,
    /** @export */ __syscall_connect: ___syscall_connect,
    /** @export */ __syscall_faccessat: ___syscall_faccessat,
    /** @export */ __syscall_fchmod: ___syscall_fchmod,
    /** @export */ __syscall_fchown32: ___syscall_fchown32,
    /** @export */ __syscall_fcntl64: ___syscall_fcntl64,
    /** @export */ __syscall_fstat64: ___syscall_fstat64,
    /** @export */ __syscall_ftruncate64: ___syscall_ftruncate64,
    /** @export */ __syscall_getcwd: ___syscall_getcwd,
    /** @export */ __syscall_getdents64: ___syscall_getdents64,
    /** @export */ __syscall_getsockname: ___syscall_getsockname,
    /** @export */ __syscall_getsockopt: ___syscall_getsockopt,
    /** @export */ __syscall_ioctl: ___syscall_ioctl,
    /** @export */ __syscall_lstat64: ___syscall_lstat64,
    /** @export */ __syscall_mkdirat: ___syscall_mkdirat,
    /** @export */ __syscall_mknodat: ___syscall_mknodat,
    /** @export */ __syscall_newfstatat: ___syscall_newfstatat,
    /** @export */ __syscall_openat: ___syscall_openat,
    /** @export */ __syscall_pipe: ___syscall_pipe,
    /** @export */ __syscall_readlinkat: ___syscall_readlinkat,
    /** @export */ __syscall_recvfrom: ___syscall_recvfrom,
    /** @export */ __syscall_renameat: ___syscall_renameat,
    /** @export */ __syscall_rmdir: ___syscall_rmdir,
    /** @export */ __syscall_sendto: ___syscall_sendto,
    /** @export */ __syscall_socket: ___syscall_socket,
    /** @export */ __syscall_stat64: ___syscall_stat64,
    /** @export */ __syscall_unlinkat: ___syscall_unlinkat,
    /** @export */ __syscall_utimensat: ___syscall_utimensat,
    /** @export */ _abort_js: __abort_js,
    /** @export */ _emscripten_init_main_thread_js: __emscripten_init_main_thread_js,
    /** @export */ _emscripten_notify_mailbox_postmessage: __emscripten_notify_mailbox_postmessage,
    /** @export */ _emscripten_receive_on_main_thread_js: __emscripten_receive_on_main_thread_js,
    /** @export */ _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
    /** @export */ _emscripten_system: __emscripten_system,
    /** @export */ _emscripten_thread_cleanup: __emscripten_thread_cleanup,
    /** @export */ _emscripten_thread_mailbox_await: __emscripten_thread_mailbox_await,
    /** @export */ _emscripten_thread_set_strongref: __emscripten_thread_set_strongref,
    /** @export */ _emscripten_throw_longjmp: __emscripten_throw_longjmp,
    /** @export */ _gmtime_js: __gmtime_js,
    /** @export */ _localtime_js: __localtime_js,
    /** @export */ _mktime_js: __mktime_js,
    /** @export */ _mmap_js: __mmap_js,
    /** @export */ _munmap_js: __munmap_js,
    /** @export */ _tzset_js: __tzset_js,
    /** @export */ alignfault,
    /** @export */ clock_time_get: _clock_time_get,
    /** @export */ eglBindAPI: _eglBindAPI,
    /** @export */ eglChooseConfig: _eglChooseConfig,
    /** @export */ eglCreateContext: _eglCreateContext,
    /** @export */ eglCreateWindowSurface: _eglCreateWindowSurface,
    /** @export */ eglDestroyContext: _eglDestroyContext,
    /** @export */ eglDestroySurface: _eglDestroySurface,
    /** @export */ eglGetConfigAttrib: _eglGetConfigAttrib,
    /** @export */ eglGetDisplay: _eglGetDisplay,
    /** @export */ eglGetError: _eglGetError,
    /** @export */ eglInitialize: _eglInitialize,
    /** @export */ eglMakeCurrent: _eglMakeCurrent,
    /** @export */ eglQueryString: _eglQueryString,
    /** @export */ eglSwapBuffers: _eglSwapBuffers,
    /** @export */ eglSwapInterval: _eglSwapInterval,
    /** @export */ eglTerminate: _eglTerminate,
    /** @export */ eglWaitGL: _eglWaitGL,
    /** @export */ eglWaitNative: _eglWaitNative,
    /** @export */ emscripten_asm_const_int: _emscripten_asm_const_int,
    /** @export */ emscripten_asm_const_int_sync_on_main_thread: _emscripten_asm_const_int_sync_on_main_thread,
    /** @export */ emscripten_asm_const_ptr_sync_on_main_thread: _emscripten_asm_const_ptr_sync_on_main_thread,
    /** @export */ emscripten_check_blocking_allowed: _emscripten_check_blocking_allowed,
    /** @export */ emscripten_date_now: _emscripten_date_now,
    /** @export */ emscripten_err: _emscripten_err,
    /** @export */ emscripten_exit_fullscreen: _emscripten_exit_fullscreen,
    /** @export */ emscripten_exit_pointerlock: _emscripten_exit_pointerlock,
    /** @export */ emscripten_exit_with_live_runtime: _emscripten_exit_with_live_runtime,
    /** @export */ emscripten_get_device_pixel_ratio: _emscripten_get_device_pixel_ratio,
    /** @export */ emscripten_get_element_css_size: _emscripten_get_element_css_size,
    /** @export */ emscripten_get_gamepad_status: _emscripten_get_gamepad_status,
    /** @export */ emscripten_get_heap_max: _emscripten_get_heap_max,
    /** @export */ emscripten_get_now: _emscripten_get_now,
    /** @export */ emscripten_get_num_gamepads: _emscripten_get_num_gamepads,
    /** @export */ emscripten_get_screen_size: _emscripten_get_screen_size,
    /** @export */ emscripten_glActiveTexture: _emscripten_glActiveTexture,
    /** @export */ emscripten_glAttachShader: _emscripten_glAttachShader,
    /** @export */ emscripten_glBeginQuery: _emscripten_glBeginQuery,
    /** @export */ emscripten_glBeginQueryEXT: _emscripten_glBeginQueryEXT,
    /** @export */ emscripten_glBeginTransformFeedback: _emscripten_glBeginTransformFeedback,
    /** @export */ emscripten_glBindAttribLocation: _emscripten_glBindAttribLocation,
    /** @export */ emscripten_glBindBuffer: _emscripten_glBindBuffer,
    /** @export */ emscripten_glBindBufferBase: _emscripten_glBindBufferBase,
    /** @export */ emscripten_glBindBufferRange: _emscripten_glBindBufferRange,
    /** @export */ emscripten_glBindFramebuffer: _emscripten_glBindFramebuffer,
    /** @export */ emscripten_glBindRenderbuffer: _emscripten_glBindRenderbuffer,
    /** @export */ emscripten_glBindSampler: _emscripten_glBindSampler,
    /** @export */ emscripten_glBindTexture: _emscripten_glBindTexture,
    /** @export */ emscripten_glBindTransformFeedback: _emscripten_glBindTransformFeedback,
    /** @export */ emscripten_glBindVertexArray: _emscripten_glBindVertexArray,
    /** @export */ emscripten_glBindVertexArrayOES: _emscripten_glBindVertexArrayOES,
    /** @export */ emscripten_glBlendColor: _emscripten_glBlendColor,
    /** @export */ emscripten_glBlendEquation: _emscripten_glBlendEquation,
    /** @export */ emscripten_glBlendEquationSeparate: _emscripten_glBlendEquationSeparate,
    /** @export */ emscripten_glBlendFunc: _emscripten_glBlendFunc,
    /** @export */ emscripten_glBlendFuncSeparate: _emscripten_glBlendFuncSeparate,
    /** @export */ emscripten_glBlitFramebuffer: _emscripten_glBlitFramebuffer,
    /** @export */ emscripten_glBufferData: _emscripten_glBufferData,
    /** @export */ emscripten_glBufferSubData: _emscripten_glBufferSubData,
    /** @export */ emscripten_glCheckFramebufferStatus: _emscripten_glCheckFramebufferStatus,
    /** @export */ emscripten_glClear: _emscripten_glClear,
    /** @export */ emscripten_glClearBufferfi: _emscripten_glClearBufferfi,
    /** @export */ emscripten_glClearBufferfv: _emscripten_glClearBufferfv,
    /** @export */ emscripten_glClearBufferiv: _emscripten_glClearBufferiv,
    /** @export */ emscripten_glClearBufferuiv: _emscripten_glClearBufferuiv,
    /** @export */ emscripten_glClearColor: _emscripten_glClearColor,
    /** @export */ emscripten_glClearDepthf: _emscripten_glClearDepthf,
    /** @export */ emscripten_glClearStencil: _emscripten_glClearStencil,
    /** @export */ emscripten_glClientWaitSync: _emscripten_glClientWaitSync,
    /** @export */ emscripten_glClipControlEXT: _emscripten_glClipControlEXT,
    /** @export */ emscripten_glColorMask: _emscripten_glColorMask,
    /** @export */ emscripten_glCompileShader: _emscripten_glCompileShader,
    /** @export */ emscripten_glCompressedTexImage2D: _emscripten_glCompressedTexImage2D,
    /** @export */ emscripten_glCompressedTexImage3D: _emscripten_glCompressedTexImage3D,
    /** @export */ emscripten_glCompressedTexSubImage2D: _emscripten_glCompressedTexSubImage2D,
    /** @export */ emscripten_glCompressedTexSubImage3D: _emscripten_glCompressedTexSubImage3D,
    /** @export */ emscripten_glCopyBufferSubData: _emscripten_glCopyBufferSubData,
    /** @export */ emscripten_glCopyTexImage2D: _emscripten_glCopyTexImage2D,
    /** @export */ emscripten_glCopyTexSubImage2D: _emscripten_glCopyTexSubImage2D,
    /** @export */ emscripten_glCopyTexSubImage3D: _emscripten_glCopyTexSubImage3D,
    /** @export */ emscripten_glCreateProgram: _emscripten_glCreateProgram,
    /** @export */ emscripten_glCreateShader: _emscripten_glCreateShader,
    /** @export */ emscripten_glCullFace: _emscripten_glCullFace,
    /** @export */ emscripten_glDeleteBuffers: _emscripten_glDeleteBuffers,
    /** @export */ emscripten_glDeleteFramebuffers: _emscripten_glDeleteFramebuffers,
    /** @export */ emscripten_glDeleteProgram: _emscripten_glDeleteProgram,
    /** @export */ emscripten_glDeleteQueries: _emscripten_glDeleteQueries,
    /** @export */ emscripten_glDeleteQueriesEXT: _emscripten_glDeleteQueriesEXT,
    /** @export */ emscripten_glDeleteRenderbuffers: _emscripten_glDeleteRenderbuffers,
    /** @export */ emscripten_glDeleteSamplers: _emscripten_glDeleteSamplers,
    /** @export */ emscripten_glDeleteShader: _emscripten_glDeleteShader,
    /** @export */ emscripten_glDeleteSync: _emscripten_glDeleteSync,
    /** @export */ emscripten_glDeleteTextures: _emscripten_glDeleteTextures,
    /** @export */ emscripten_glDeleteTransformFeedbacks: _emscripten_glDeleteTransformFeedbacks,
    /** @export */ emscripten_glDeleteVertexArrays: _emscripten_glDeleteVertexArrays,
    /** @export */ emscripten_glDeleteVertexArraysOES: _emscripten_glDeleteVertexArraysOES,
    /** @export */ emscripten_glDepthFunc: _emscripten_glDepthFunc,
    /** @export */ emscripten_glDepthMask: _emscripten_glDepthMask,
    /** @export */ emscripten_glDepthRangef: _emscripten_glDepthRangef,
    /** @export */ emscripten_glDetachShader: _emscripten_glDetachShader,
    /** @export */ emscripten_glDisable: _emscripten_glDisable,
    /** @export */ emscripten_glDisableVertexAttribArray: _emscripten_glDisableVertexAttribArray,
    /** @export */ emscripten_glDrawArrays: _emscripten_glDrawArrays,
    /** @export */ emscripten_glDrawArraysInstanced: _emscripten_glDrawArraysInstanced,
    /** @export */ emscripten_glDrawArraysInstancedANGLE: _emscripten_glDrawArraysInstancedANGLE,
    /** @export */ emscripten_glDrawArraysInstancedARB: _emscripten_glDrawArraysInstancedARB,
    /** @export */ emscripten_glDrawArraysInstancedEXT: _emscripten_glDrawArraysInstancedEXT,
    /** @export */ emscripten_glDrawArraysInstancedNV: _emscripten_glDrawArraysInstancedNV,
    /** @export */ emscripten_glDrawBuffers: _emscripten_glDrawBuffers,
    /** @export */ emscripten_glDrawBuffersEXT: _emscripten_glDrawBuffersEXT,
    /** @export */ emscripten_glDrawBuffersWEBGL: _emscripten_glDrawBuffersWEBGL,
    /** @export */ emscripten_glDrawElements: _emscripten_glDrawElements,
    /** @export */ emscripten_glDrawElementsInstanced: _emscripten_glDrawElementsInstanced,
    /** @export */ emscripten_glDrawElementsInstancedANGLE: _emscripten_glDrawElementsInstancedANGLE,
    /** @export */ emscripten_glDrawElementsInstancedARB: _emscripten_glDrawElementsInstancedARB,
    /** @export */ emscripten_glDrawElementsInstancedEXT: _emscripten_glDrawElementsInstancedEXT,
    /** @export */ emscripten_glDrawElementsInstancedNV: _emscripten_glDrawElementsInstancedNV,
    /** @export */ emscripten_glDrawRangeElements: _emscripten_glDrawRangeElements,
    /** @export */ emscripten_glEnable: _emscripten_glEnable,
    /** @export */ emscripten_glEnableVertexAttribArray: _emscripten_glEnableVertexAttribArray,
    /** @export */ emscripten_glEndQuery: _emscripten_glEndQuery,
    /** @export */ emscripten_glEndQueryEXT: _emscripten_glEndQueryEXT,
    /** @export */ emscripten_glEndTransformFeedback: _emscripten_glEndTransformFeedback,
    /** @export */ emscripten_glFenceSync: _emscripten_glFenceSync,
    /** @export */ emscripten_glFinish: _emscripten_glFinish,
    /** @export */ emscripten_glFlush: _emscripten_glFlush,
    /** @export */ emscripten_glFlushMappedBufferRange: _emscripten_glFlushMappedBufferRange,
    /** @export */ emscripten_glFramebufferRenderbuffer: _emscripten_glFramebufferRenderbuffer,
    /** @export */ emscripten_glFramebufferTexture2D: _emscripten_glFramebufferTexture2D,
    /** @export */ emscripten_glFramebufferTextureLayer: _emscripten_glFramebufferTextureLayer,
    /** @export */ emscripten_glFrontFace: _emscripten_glFrontFace,
    /** @export */ emscripten_glGenBuffers: _emscripten_glGenBuffers,
    /** @export */ emscripten_glGenFramebuffers: _emscripten_glGenFramebuffers,
    /** @export */ emscripten_glGenQueries: _emscripten_glGenQueries,
    /** @export */ emscripten_glGenQueriesEXT: _emscripten_glGenQueriesEXT,
    /** @export */ emscripten_glGenRenderbuffers: _emscripten_glGenRenderbuffers,
    /** @export */ emscripten_glGenSamplers: _emscripten_glGenSamplers,
    /** @export */ emscripten_glGenTextures: _emscripten_glGenTextures,
    /** @export */ emscripten_glGenTransformFeedbacks: _emscripten_glGenTransformFeedbacks,
    /** @export */ emscripten_glGenVertexArrays: _emscripten_glGenVertexArrays,
    /** @export */ emscripten_glGenVertexArraysOES: _emscripten_glGenVertexArraysOES,
    /** @export */ emscripten_glGenerateMipmap: _emscripten_glGenerateMipmap,
    /** @export */ emscripten_glGetActiveAttrib: _emscripten_glGetActiveAttrib,
    /** @export */ emscripten_glGetActiveUniform: _emscripten_glGetActiveUniform,
    /** @export */ emscripten_glGetActiveUniformBlockName: _emscripten_glGetActiveUniformBlockName,
    /** @export */ emscripten_glGetActiveUniformBlockiv: _emscripten_glGetActiveUniformBlockiv,
    /** @export */ emscripten_glGetActiveUniformsiv: _emscripten_glGetActiveUniformsiv,
    /** @export */ emscripten_glGetAttachedShaders: _emscripten_glGetAttachedShaders,
    /** @export */ emscripten_glGetAttribLocation: _emscripten_glGetAttribLocation,
    /** @export */ emscripten_glGetBooleanv: _emscripten_glGetBooleanv,
    /** @export */ emscripten_glGetBufferParameteri64v: _emscripten_glGetBufferParameteri64v,
    /** @export */ emscripten_glGetBufferParameteriv: _emscripten_glGetBufferParameteriv,
    /** @export */ emscripten_glGetBufferPointerv: _emscripten_glGetBufferPointerv,
    /** @export */ emscripten_glGetError: _emscripten_glGetError,
    /** @export */ emscripten_glGetFloatv: _emscripten_glGetFloatv,
    /** @export */ emscripten_glGetFragDataLocation: _emscripten_glGetFragDataLocation,
    /** @export */ emscripten_glGetFramebufferAttachmentParameteriv: _emscripten_glGetFramebufferAttachmentParameteriv,
    /** @export */ emscripten_glGetInteger64i_v: _emscripten_glGetInteger64i_v,
    /** @export */ emscripten_glGetInteger64v: _emscripten_glGetInteger64v,
    /** @export */ emscripten_glGetIntegeri_v: _emscripten_glGetIntegeri_v,
    /** @export */ emscripten_glGetIntegerv: _emscripten_glGetIntegerv,
    /** @export */ emscripten_glGetInternalformativ: _emscripten_glGetInternalformativ,
    /** @export */ emscripten_glGetProgramBinary: _emscripten_glGetProgramBinary,
    /** @export */ emscripten_glGetProgramInfoLog: _emscripten_glGetProgramInfoLog,
    /** @export */ emscripten_glGetProgramiv: _emscripten_glGetProgramiv,
    /** @export */ emscripten_glGetQueryObjecti64vEXT: _emscripten_glGetQueryObjecti64vEXT,
    /** @export */ emscripten_glGetQueryObjectivEXT: _emscripten_glGetQueryObjectivEXT,
    /** @export */ emscripten_glGetQueryObjectui64vEXT: _emscripten_glGetQueryObjectui64vEXT,
    /** @export */ emscripten_glGetQueryObjectuiv: _emscripten_glGetQueryObjectuiv,
    /** @export */ emscripten_glGetQueryObjectuivEXT: _emscripten_glGetQueryObjectuivEXT,
    /** @export */ emscripten_glGetQueryiv: _emscripten_glGetQueryiv,
    /** @export */ emscripten_glGetQueryivEXT: _emscripten_glGetQueryivEXT,
    /** @export */ emscripten_glGetRenderbufferParameteriv: _emscripten_glGetRenderbufferParameteriv,
    /** @export */ emscripten_glGetSamplerParameterfv: _emscripten_glGetSamplerParameterfv,
    /** @export */ emscripten_glGetSamplerParameteriv: _emscripten_glGetSamplerParameteriv,
    /** @export */ emscripten_glGetShaderInfoLog: _emscripten_glGetShaderInfoLog,
    /** @export */ emscripten_glGetShaderPrecisionFormat: _emscripten_glGetShaderPrecisionFormat,
    /** @export */ emscripten_glGetShaderSource: _emscripten_glGetShaderSource,
    /** @export */ emscripten_glGetShaderiv: _emscripten_glGetShaderiv,
    /** @export */ emscripten_glGetString: _emscripten_glGetString,
    /** @export */ emscripten_glGetStringi: _emscripten_glGetStringi,
    /** @export */ emscripten_glGetSynciv: _emscripten_glGetSynciv,
    /** @export */ emscripten_glGetTexParameterfv: _emscripten_glGetTexParameterfv,
    /** @export */ emscripten_glGetTexParameteriv: _emscripten_glGetTexParameteriv,
    /** @export */ emscripten_glGetTransformFeedbackVarying: _emscripten_glGetTransformFeedbackVarying,
    /** @export */ emscripten_glGetUniformBlockIndex: _emscripten_glGetUniformBlockIndex,
    /** @export */ emscripten_glGetUniformIndices: _emscripten_glGetUniformIndices,
    /** @export */ emscripten_glGetUniformLocation: _emscripten_glGetUniformLocation,
    /** @export */ emscripten_glGetUniformfv: _emscripten_glGetUniformfv,
    /** @export */ emscripten_glGetUniformiv: _emscripten_glGetUniformiv,
    /** @export */ emscripten_glGetUniformuiv: _emscripten_glGetUniformuiv,
    /** @export */ emscripten_glGetVertexAttribIiv: _emscripten_glGetVertexAttribIiv,
    /** @export */ emscripten_glGetVertexAttribIuiv: _emscripten_glGetVertexAttribIuiv,
    /** @export */ emscripten_glGetVertexAttribPointerv: _emscripten_glGetVertexAttribPointerv,
    /** @export */ emscripten_glGetVertexAttribfv: _emscripten_glGetVertexAttribfv,
    /** @export */ emscripten_glGetVertexAttribiv: _emscripten_glGetVertexAttribiv,
    /** @export */ emscripten_glHint: _emscripten_glHint,
    /** @export */ emscripten_glInvalidateFramebuffer: _emscripten_glInvalidateFramebuffer,
    /** @export */ emscripten_glInvalidateSubFramebuffer: _emscripten_glInvalidateSubFramebuffer,
    /** @export */ emscripten_glIsBuffer: _emscripten_glIsBuffer,
    /** @export */ emscripten_glIsEnabled: _emscripten_glIsEnabled,
    /** @export */ emscripten_glIsFramebuffer: _emscripten_glIsFramebuffer,
    /** @export */ emscripten_glIsProgram: _emscripten_glIsProgram,
    /** @export */ emscripten_glIsQuery: _emscripten_glIsQuery,
    /** @export */ emscripten_glIsQueryEXT: _emscripten_glIsQueryEXT,
    /** @export */ emscripten_glIsRenderbuffer: _emscripten_glIsRenderbuffer,
    /** @export */ emscripten_glIsSampler: _emscripten_glIsSampler,
    /** @export */ emscripten_glIsShader: _emscripten_glIsShader,
    /** @export */ emscripten_glIsSync: _emscripten_glIsSync,
    /** @export */ emscripten_glIsTexture: _emscripten_glIsTexture,
    /** @export */ emscripten_glIsTransformFeedback: _emscripten_glIsTransformFeedback,
    /** @export */ emscripten_glIsVertexArray: _emscripten_glIsVertexArray,
    /** @export */ emscripten_glIsVertexArrayOES: _emscripten_glIsVertexArrayOES,
    /** @export */ emscripten_glLineWidth: _emscripten_glLineWidth,
    /** @export */ emscripten_glLinkProgram: _emscripten_glLinkProgram,
    /** @export */ emscripten_glMapBufferRange: _emscripten_glMapBufferRange,
    /** @export */ emscripten_glPauseTransformFeedback: _emscripten_glPauseTransformFeedback,
    /** @export */ emscripten_glPixelStorei: _emscripten_glPixelStorei,
    /** @export */ emscripten_glPolygonModeWEBGL: _emscripten_glPolygonModeWEBGL,
    /** @export */ emscripten_glPolygonOffset: _emscripten_glPolygonOffset,
    /** @export */ emscripten_glPolygonOffsetClampEXT: _emscripten_glPolygonOffsetClampEXT,
    /** @export */ emscripten_glProgramBinary: _emscripten_glProgramBinary,
    /** @export */ emscripten_glProgramParameteri: _emscripten_glProgramParameteri,
    /** @export */ emscripten_glQueryCounterEXT: _emscripten_glQueryCounterEXT,
    /** @export */ emscripten_glReadBuffer: _emscripten_glReadBuffer,
    /** @export */ emscripten_glReadPixels: _emscripten_glReadPixels,
    /** @export */ emscripten_glReleaseShaderCompiler: _emscripten_glReleaseShaderCompiler,
    /** @export */ emscripten_glRenderbufferStorage: _emscripten_glRenderbufferStorage,
    /** @export */ emscripten_glRenderbufferStorageMultisample: _emscripten_glRenderbufferStorageMultisample,
    /** @export */ emscripten_glResumeTransformFeedback: _emscripten_glResumeTransformFeedback,
    /** @export */ emscripten_glSampleCoverage: _emscripten_glSampleCoverage,
    /** @export */ emscripten_glSamplerParameterf: _emscripten_glSamplerParameterf,
    /** @export */ emscripten_glSamplerParameterfv: _emscripten_glSamplerParameterfv,
    /** @export */ emscripten_glSamplerParameteri: _emscripten_glSamplerParameteri,
    /** @export */ emscripten_glSamplerParameteriv: _emscripten_glSamplerParameteriv,
    /** @export */ emscripten_glScissor: _emscripten_glScissor,
    /** @export */ emscripten_glShaderBinary: _emscripten_glShaderBinary,
    /** @export */ emscripten_glShaderSource: _emscripten_glShaderSource,
    /** @export */ emscripten_glStencilFunc: _emscripten_glStencilFunc,
    /** @export */ emscripten_glStencilFuncSeparate: _emscripten_glStencilFuncSeparate,
    /** @export */ emscripten_glStencilMask: _emscripten_glStencilMask,
    /** @export */ emscripten_glStencilMaskSeparate: _emscripten_glStencilMaskSeparate,
    /** @export */ emscripten_glStencilOp: _emscripten_glStencilOp,
    /** @export */ emscripten_glStencilOpSeparate: _emscripten_glStencilOpSeparate,
    /** @export */ emscripten_glTexImage2D: _emscripten_glTexImage2D,
    /** @export */ emscripten_glTexImage3D: _emscripten_glTexImage3D,
    /** @export */ emscripten_glTexParameterf: _emscripten_glTexParameterf,
    /** @export */ emscripten_glTexParameterfv: _emscripten_glTexParameterfv,
    /** @export */ emscripten_glTexParameteri: _emscripten_glTexParameteri,
    /** @export */ emscripten_glTexParameteriv: _emscripten_glTexParameteriv,
    /** @export */ emscripten_glTexStorage2D: _emscripten_glTexStorage2D,
    /** @export */ emscripten_glTexStorage3D: _emscripten_glTexStorage3D,
    /** @export */ emscripten_glTexSubImage2D: _emscripten_glTexSubImage2D,
    /** @export */ emscripten_glTexSubImage3D: _emscripten_glTexSubImage3D,
    /** @export */ emscripten_glTransformFeedbackVaryings: _emscripten_glTransformFeedbackVaryings,
    /** @export */ emscripten_glUniform1f: _emscripten_glUniform1f,
    /** @export */ emscripten_glUniform1fv: _emscripten_glUniform1fv,
    /** @export */ emscripten_glUniform1i: _emscripten_glUniform1i,
    /** @export */ emscripten_glUniform1iv: _emscripten_glUniform1iv,
    /** @export */ emscripten_glUniform1ui: _emscripten_glUniform1ui,
    /** @export */ emscripten_glUniform1uiv: _emscripten_glUniform1uiv,
    /** @export */ emscripten_glUniform2f: _emscripten_glUniform2f,
    /** @export */ emscripten_glUniform2fv: _emscripten_glUniform2fv,
    /** @export */ emscripten_glUniform2i: _emscripten_glUniform2i,
    /** @export */ emscripten_glUniform2iv: _emscripten_glUniform2iv,
    /** @export */ emscripten_glUniform2ui: _emscripten_glUniform2ui,
    /** @export */ emscripten_glUniform2uiv: _emscripten_glUniform2uiv,
    /** @export */ emscripten_glUniform3f: _emscripten_glUniform3f,
    /** @export */ emscripten_glUniform3fv: _emscripten_glUniform3fv,
    /** @export */ emscripten_glUniform3i: _emscripten_glUniform3i,
    /** @export */ emscripten_glUniform3iv: _emscripten_glUniform3iv,
    /** @export */ emscripten_glUniform3ui: _emscripten_glUniform3ui,
    /** @export */ emscripten_glUniform3uiv: _emscripten_glUniform3uiv,
    /** @export */ emscripten_glUniform4f: _emscripten_glUniform4f,
    /** @export */ emscripten_glUniform4fv: _emscripten_glUniform4fv,
    /** @export */ emscripten_glUniform4i: _emscripten_glUniform4i,
    /** @export */ emscripten_glUniform4iv: _emscripten_glUniform4iv,
    /** @export */ emscripten_glUniform4ui: _emscripten_glUniform4ui,
    /** @export */ emscripten_glUniform4uiv: _emscripten_glUniform4uiv,
    /** @export */ emscripten_glUniformBlockBinding: _emscripten_glUniformBlockBinding,
    /** @export */ emscripten_glUniformMatrix2fv: _emscripten_glUniformMatrix2fv,
    /** @export */ emscripten_glUniformMatrix2x3fv: _emscripten_glUniformMatrix2x3fv,
    /** @export */ emscripten_glUniformMatrix2x4fv: _emscripten_glUniformMatrix2x4fv,
    /** @export */ emscripten_glUniformMatrix3fv: _emscripten_glUniformMatrix3fv,
    /** @export */ emscripten_glUniformMatrix3x2fv: _emscripten_glUniformMatrix3x2fv,
    /** @export */ emscripten_glUniformMatrix3x4fv: _emscripten_glUniformMatrix3x4fv,
    /** @export */ emscripten_glUniformMatrix4fv: _emscripten_glUniformMatrix4fv,
    /** @export */ emscripten_glUniformMatrix4x2fv: _emscripten_glUniformMatrix4x2fv,
    /** @export */ emscripten_glUniformMatrix4x3fv: _emscripten_glUniformMatrix4x3fv,
    /** @export */ emscripten_glUnmapBuffer: _emscripten_glUnmapBuffer,
    /** @export */ emscripten_glUseProgram: _emscripten_glUseProgram,
    /** @export */ emscripten_glValidateProgram: _emscripten_glValidateProgram,
    /** @export */ emscripten_glVertexAttrib1f: _emscripten_glVertexAttrib1f,
    /** @export */ emscripten_glVertexAttrib1fv: _emscripten_glVertexAttrib1fv,
    /** @export */ emscripten_glVertexAttrib2f: _emscripten_glVertexAttrib2f,
    /** @export */ emscripten_glVertexAttrib2fv: _emscripten_glVertexAttrib2fv,
    /** @export */ emscripten_glVertexAttrib3f: _emscripten_glVertexAttrib3f,
    /** @export */ emscripten_glVertexAttrib3fv: _emscripten_glVertexAttrib3fv,
    /** @export */ emscripten_glVertexAttrib4f: _emscripten_glVertexAttrib4f,
    /** @export */ emscripten_glVertexAttrib4fv: _emscripten_glVertexAttrib4fv,
    /** @export */ emscripten_glVertexAttribDivisor: _emscripten_glVertexAttribDivisor,
    /** @export */ emscripten_glVertexAttribDivisorANGLE: _emscripten_glVertexAttribDivisorANGLE,
    /** @export */ emscripten_glVertexAttribDivisorARB: _emscripten_glVertexAttribDivisorARB,
    /** @export */ emscripten_glVertexAttribDivisorEXT: _emscripten_glVertexAttribDivisorEXT,
    /** @export */ emscripten_glVertexAttribDivisorNV: _emscripten_glVertexAttribDivisorNV,
    /** @export */ emscripten_glVertexAttribI4i: _emscripten_glVertexAttribI4i,
    /** @export */ emscripten_glVertexAttribI4iv: _emscripten_glVertexAttribI4iv,
    /** @export */ emscripten_glVertexAttribI4ui: _emscripten_glVertexAttribI4ui,
    /** @export */ emscripten_glVertexAttribI4uiv: _emscripten_glVertexAttribI4uiv,
    /** @export */ emscripten_glVertexAttribIPointer: _emscripten_glVertexAttribIPointer,
    /** @export */ emscripten_glVertexAttribPointer: _emscripten_glVertexAttribPointer,
    /** @export */ emscripten_glViewport: _emscripten_glViewport,
    /** @export */ emscripten_glWaitSync: _emscripten_glWaitSync,
    /** @export */ emscripten_has_asyncify: _emscripten_has_asyncify,
    /** @export */ emscripten_num_logical_cores: _emscripten_num_logical_cores,
    /** @export */ emscripten_request_fullscreen_strategy: _emscripten_request_fullscreen_strategy,
    /** @export */ emscripten_request_pointerlock: _emscripten_request_pointerlock,
    /** @export */ emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */ emscripten_sample_gamepad_data: _emscripten_sample_gamepad_data,
    /** @export */ emscripten_set_beforeunload_callback_on_thread: _emscripten_set_beforeunload_callback_on_thread,
    /** @export */ emscripten_set_blur_callback_on_thread: _emscripten_set_blur_callback_on_thread,
    /** @export */ emscripten_set_canvas_element_size: _emscripten_set_canvas_element_size,
    /** @export */ emscripten_set_element_css_size: _emscripten_set_element_css_size,
    /** @export */ emscripten_set_focus_callback_on_thread: _emscripten_set_focus_callback_on_thread,
    /** @export */ emscripten_set_fullscreenchange_callback_on_thread: _emscripten_set_fullscreenchange_callback_on_thread,
    /** @export */ emscripten_set_gamepadconnected_callback_on_thread: _emscripten_set_gamepadconnected_callback_on_thread,
    /** @export */ emscripten_set_gamepaddisconnected_callback_on_thread: _emscripten_set_gamepaddisconnected_callback_on_thread,
    /** @export */ emscripten_set_keydown_callback_on_thread: _emscripten_set_keydown_callback_on_thread,
    /** @export */ emscripten_set_keypress_callback_on_thread: _emscripten_set_keypress_callback_on_thread,
    /** @export */ emscripten_set_keyup_callback_on_thread: _emscripten_set_keyup_callback_on_thread,
    /** @export */ emscripten_set_mousedown_callback_on_thread: _emscripten_set_mousedown_callback_on_thread,
    /** @export */ emscripten_set_mouseenter_callback_on_thread: _emscripten_set_mouseenter_callback_on_thread,
    /** @export */ emscripten_set_mouseleave_callback_on_thread: _emscripten_set_mouseleave_callback_on_thread,
    /** @export */ emscripten_set_mousemove_callback_on_thread: _emscripten_set_mousemove_callback_on_thread,
    /** @export */ emscripten_set_mouseup_callback_on_thread: _emscripten_set_mouseup_callback_on_thread,
    /** @export */ emscripten_set_pointerlockchange_callback_on_thread: _emscripten_set_pointerlockchange_callback_on_thread,
    /** @export */ emscripten_set_resize_callback_on_thread: _emscripten_set_resize_callback_on_thread,
    /** @export */ emscripten_set_touchcancel_callback_on_thread: _emscripten_set_touchcancel_callback_on_thread,
    /** @export */ emscripten_set_touchend_callback_on_thread: _emscripten_set_touchend_callback_on_thread,
    /** @export */ emscripten_set_touchmove_callback_on_thread: _emscripten_set_touchmove_callback_on_thread,
    /** @export */ emscripten_set_touchstart_callback_on_thread: _emscripten_set_touchstart_callback_on_thread,
    /** @export */ emscripten_set_visibilitychange_callback_on_thread: _emscripten_set_visibilitychange_callback_on_thread,
    /** @export */ emscripten_set_wheel_callback_on_thread: _emscripten_set_wheel_callback_on_thread,
    /** @export */ emscripten_set_window_title: _emscripten_set_window_title,
    /** @export */ emscripten_sleep: _emscripten_sleep,
    /** @export */ environ_get: _environ_get,
    /** @export */ environ_sizes_get: _environ_sizes_get,
    /** @export */ exit: _exit,
    /** @export */ fd_close: _fd_close,
    /** @export */ fd_fdstat_get: _fd_fdstat_get,
    /** @export */ fd_read: _fd_read,
    /** @export */ fd_seek: _fd_seek,
    /** @export */ fd_sync: _fd_sync,
    /** @export */ fd_write: _fd_write,
    /** @export */ getaddrinfo: _getaddrinfo,
    /** @export */ glActiveTexture: _glActiveTexture,
    /** @export */ glAttachShader: _glAttachShader,
    /** @export */ glBindBuffer: _glBindBuffer,
    /** @export */ glBindSampler: _glBindSampler,
    /** @export */ glBindTexture: _glBindTexture,
    /** @export */ glBindVertexArray: _glBindVertexArray,
    /** @export */ glBlendFunc: _glBlendFunc,
    /** @export */ glBufferData: _glBufferData,
    /** @export */ glBufferSubData: _glBufferSubData,
    /** @export */ glClear: _glClear,
    /** @export */ glClearColor: _glClearColor,
    /** @export */ glCompileShader: _glCompileShader,
    /** @export */ glCopyBufferSubData: _glCopyBufferSubData,
    /** @export */ glCreateProgram: _glCreateProgram,
    /** @export */ glCreateShader: _glCreateShader,
    /** @export */ glDeleteBuffers: _glDeleteBuffers,
    /** @export */ glDeleteProgram: _glDeleteProgram,
    /** @export */ glDeleteSamplers: _glDeleteSamplers,
    /** @export */ glDeleteShader: _glDeleteShader,
    /** @export */ glDeleteTextures: _glDeleteTextures,
    /** @export */ glDeleteVertexArrays: _glDeleteVertexArrays,
    /** @export */ glDepthMask: _glDepthMask,
    /** @export */ glDetachShader: _glDetachShader,
    /** @export */ glDisable: _glDisable,
    /** @export */ glDisableVertexAttribArray: _glDisableVertexAttribArray,
    /** @export */ glDrawArrays: _glDrawArrays,
    /** @export */ glDrawElements: _glDrawElements,
    /** @export */ glDrawElementsInstanced: _glDrawElementsInstanced,
    /** @export */ glEnable: _glEnable,
    /** @export */ glEnableVertexAttribArray: _glEnableVertexAttribArray,
    /** @export */ glGenBuffers: _glGenBuffers,
    /** @export */ glGenSamplers: _glGenSamplers,
    /** @export */ glGenTextures: _glGenTextures,
    /** @export */ glGenVertexArrays: _glGenVertexArrays,
    /** @export */ glGenerateMipmap: _glGenerateMipmap,
    /** @export */ glGetAttachedShaders: _glGetAttachedShaders,
    /** @export */ glGetIntegerv: _glGetIntegerv,
    /** @export */ glGetProgramInfoLog: _glGetProgramInfoLog,
    /** @export */ glGetProgramiv: _glGetProgramiv,
    /** @export */ glGetShaderInfoLog: _glGetShaderInfoLog,
    /** @export */ glGetShaderiv: _glGetShaderiv,
    /** @export */ glGetString: _glGetString,
    /** @export */ glGetUniformLocation: _glGetUniformLocation,
    /** @export */ glLinkProgram: _glLinkProgram,
    /** @export */ glPixelStorei: _glPixelStorei,
    /** @export */ glReadBuffer: _glReadBuffer,
    /** @export */ glReadPixels: _glReadPixels,
    /** @export */ glSamplerParameteri: _glSamplerParameteri,
    /** @export */ glScissor: _glScissor,
    /** @export */ glShaderSource: _glShaderSource,
    /** @export */ glTexImage2D: _glTexImage2D,
    /** @export */ glTexImage3D: _glTexImage3D,
    /** @export */ glTexParameterf: _glTexParameterf,
    /** @export */ glTexParameteri: _glTexParameteri,
    /** @export */ glTexSubImage2D: _glTexSubImage2D,
    /** @export */ glUniform1f: _glUniform1f,
    /** @export */ glUniform1fv: _glUniform1fv,
    /** @export */ glUniform1i: _glUniform1i,
    /** @export */ glUniform2fv: _glUniform2fv,
    /** @export */ glUniform4fv: _glUniform4fv,
    /** @export */ glUniformMatrix4x2fv: _glUniformMatrix4x2fv,
    /** @export */ glUseProgram: _glUseProgram,
    /** @export */ glVertexAttribIPointer: _glVertexAttribIPointer,
    /** @export */ glVertexAttribPointer: _glVertexAttribPointer,
    /** @export */ glViewport: _glViewport,
    /** @export */ invoke_dd,
    /** @export */ invoke_dddd,
    /** @export */ invoke_ii,
    /** @export */ invoke_iii,
    /** @export */ invoke_iiii,
    /** @export */ invoke_iiiii,
    /** @export */ invoke_iiiiii,
    /** @export */ invoke_iiiiiii,
    /** @export */ invoke_iiiiiiiiii,
    /** @export */ invoke_v,
    /** @export */ invoke_vi,
    /** @export */ invoke_vii,
    /** @export */ invoke_viii,
    /** @export */ invoke_viiii,
    /** @export */ invoke_viiiii,
    /** @export */ invoke_vijjjj,
    /** @export */ memory: wasmMemory,
    /** @export */ proc_exit: _proc_exit,
    /** @export */ segfault
  };
}

function invoke_iiiii(index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {
    return dynCall_iiiii(index, a1, a2, a3, a4);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiii(index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {
    dynCall_viiii(index, a1, a2, a3, a4);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vi(index, a1) {
  var sp = stackSave();
  try {
    dynCall_vi(index, a1);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_ii(index, a1) {
  var sp = stackSave();
  try {
    return dynCall_ii(index, a1);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    dynCall_viii(index, a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    return dynCall_iiii(index, a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vii(index, a1, a2) {
  var sp = stackSave();
  try {
    dynCall_vii(index, a1, a2);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iii(index, a1, a2) {
  var sp = stackSave();
  try {
    return dynCall_iii(index, a1, a2);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiii(index, a1, a2, a3, a4, a5, a6);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_v(index) {
  var sp = stackSave();
  try {
    dynCall_v(index);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiii(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    dynCall_viiiii(index, a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    return dynCall_iiiiii(index, a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_dd(index, a1) {
  var sp = stackSave();
  try {
    return dynCall_dd(index, a1);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vijjjj(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    dynCall_vijjjj(index, a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_dddd(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    return dynCall_dddd(index, a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

// include: postamble.js
// === Auto-generated postamble setup entry stuff ===
var calledRun;

function callMain(args = []) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(typeof onPreRuns === "undefined" || onPreRuns.length == 0, "cannot call main when preRun functions remain to be called");
  var entryFunction = _main;
  args.unshift(thisProgram);
  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  for (var arg of args) {
    (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((argv_ptr) >> 2), "storing")] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  }
  (growMemViews(), HEAPU32)[SAFE_HEAP_INDEX((growMemViews(), HEAPU32), ((argv_ptr) >> 2), "storing")] = 0;
  try {
    var ret = entryFunction(argc, argv);
    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  // See $establishStackSpace for the equivalent code that runs on a thread
  assert(!ENVIRONMENT_IS_PTHREAD);
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

function run(args = arguments_) {
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }
  if ((ENVIRONMENT_IS_PTHREAD)) {
    initRuntime();
    return;
  }
  stackCheckInit();
  preRun();
  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }
  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    assert(!calledRun);
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    Module["onRuntimeInitialized"]?.();
    consumedModuleProp("onRuntimeInitialized");
    var noInitialRun = Module["noInitialRun"] || false;
    if (!noInitialRun) callMain(args);
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(() => {
      setTimeout(() => Module["setStatus"](""), 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
  checkStackCookie();
}

var wasmExports;

if ((!(ENVIRONMENT_IS_PTHREAD))) {
  // Call createWasm on startup if we are the main thread.
  // Worker threads call this once they receive the module via postMessage
  // With async instantation wasmExports is assigned asynchronously when the
  // instance is received.
  createWasm();
  run();
}

// end include: postamble.js
// include: /home/teero/emsdk/upstream/emscripten/src/emrun_postjs.js
/**
 * @license
 * Copyright 2013 The Emscripten Authors
 * SPDX-License-Identifier: MIT
 *
 * This file gets implicatly injected as a `--post-js` file when
 * emcc is run with `--emrun`
 */ if (globalThis.window && (typeof ENVIRONMENT_IS_PTHREAD == "undefined" || !ENVIRONMENT_IS_PTHREAD)) {
  var emrun_register_handlers = () => {
    // When C code exit()s, we may still have remaining stdout and stderr
    // messages in flight. In that case, we can't close the browser until all
    // those XHRs have finished, so the following state variables track that all
    // communication is done, after which we can close.
    var emrun_num_post_messages_in_flight = 0;
    var emrun_should_close_itself = false;
    var postExit = msg => {
      var http = new XMLHttpRequest;
      // Don't do this immediately, this may race with the notification about
      // the return code reaching the server. Send a *sync* xhr so that we know
      // for sure that the server has gotten the return code before we continue.
      http.open("POST", "stdio.html", false);
      http.send(msg);
      try {
        // Try closing the current browser window, since it exit()ed itself.
        // This can shut down the browser process and then emrun does not need
        // to kill the whole browser process.
        window.close();
      } catch (e) {}
    };
    var post = msg => {
      var http = new XMLHttpRequest;
      ++emrun_num_post_messages_in_flight;
      http.onreadystatechange = () => {
        if (http.readyState == 4) {
          if (--emrun_num_post_messages_in_flight == 0 && emrun_should_close_itself) {
            postExit("^exit^" + EXITSTATUS);
          }
        }
      };
      http.open("POST", "stdio.html", true);
      http.send(msg);
    };
    // If the address contains localhost, or we are running the page from port
    // 6931, we can assume we're running the test runner and should post stdout
    // logs.
    if (document.URL.search("localhost") != -1 || document.URL.search(":6931/") != -1) {
      var emrun_http_sequence_number = 1;
      var prevPrint = out;
      var prevErr = err;
      addOnExit(() => {
        if (emrun_num_post_messages_in_flight == 0) {
          postExit("^exit^" + EXITSTATUS);
        } else {
          emrun_should_close_itself = true;
        }
      });
      out = text => {
        post("^out^" + (emrun_http_sequence_number++) + "^" + encodeURIComponent(text));
        prevPrint(text);
      };
      err = text => {
        post("^err^" + (emrun_http_sequence_number++) + "^" + encodeURIComponent(text));
        prevErr(text);
      };
      // Notify emrun web server that this browser has successfully launched the
      // page. Note that we may need to wait for the server to be ready.
      var tryToSendPageload = () => {
        try {
          post("^pageload^");
        } catch (e) {
          setTimeout(tryToSendPageload, 50);
        }
      };
      tryToSendPageload();
    }
  };
  // POSTs the given binary data represented as a (typed) array data back to the
  // emrun-based web server.
  // To use from C code, call e.g:
  //   EM_ASM({emrun_file_dump("file.dat", HEAPU8.subarray($0, $0 + $1));}, my_data_pointer, my_data_pointer_byte_length);
  var emrun_file_dump = (filename, data) => {
    var http = new XMLHttpRequest;
    out(`Dumping out file "${filename}" with ${data.length} bytes of data.`);
    http.open("POST", "stdio.html?file=" + filename, true);
    http.send(data);
  };
  if (globalThis.document) {
    emrun_register_handlers();
  }
}
