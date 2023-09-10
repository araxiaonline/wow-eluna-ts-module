#!/usr/bin/env node
const { Command } = require("commander");
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");
const _ = require("lodash");
require('dotenv').config({ 
  path: 'ets.env' 
});

const program = new Command();
const log = {
    success: args => console.log("\x1b[32m%s\x1b[0m", args),
    error: args => console.log("\x1b[31m%s\x1b[0m", args),
    info: args => console.log("\x1b[36m%s\x1b[0m", args)
}
  
program
  .command("build")
  .option("-d, --luadir <luadir>", "The directory where the transpiled lua scripts will be placed. Defaults to './dist'")
  .option("-m, --module <moduledir>", "The name of the directory of where the module transpiled code will go")
  .option("-w, --watch", "Watch for changes of modules and rebuilds lua files. (default: false)")
  .option("-l, --live-reload", "Docker Configs Only! This option will add live reloading of eluna on server  (default: false)")
  .description("Transpiles TypeScript modules into lua at specified directory")
  .action(({ luaDir, moduleDir, watch, liveReload }) => {
    buildModules(luaDir, moduleDir, watch, liveReload);
  });

program
  .command("libs")
  .option("-d, --luadir <luadir>", "The directory where the transpiled common lua libs will be placed. Defaults to './dist'")
  .description("Buildd required base libraries")
  .action(({luaDir}) => {    
    buildLibs(luaDir);
  });

program
  .command("init")
  .option("-x, --example <example>", "Create example module files. (default: false)")
  .description("Initialize the project building base libs and adding environment variables")
  .action(({example}) => {
    initProject(example);    
  });

program.parse(process.argv);

/**
 * Builds the module for the current project. 
 * @param {string} luaDir 
 * @param {string} moduleDir 
 * @param {boolean} watch 
 * @param {boolean} liveReload 
 * @returns 
 */
function buildModules(luaDir, moduleDir, watch, liveReload) {
    try {
      luaDir = luaDir || process.env.ETS_BUILD_ROOT;
      moduleDir = moduleDir || process.env.ELUNATS_BUILD_FILE;
      const common = process.env.ETS_COMMON_DIR || "common";
  
      if (!luaDir) {
        log.error("ETS build root could not be determined. Review ets.env - ETS_BUILD_ROOT or pass as argument --luadir");        
        process.exit(1);
      }
  
      if (!moduleDir) {
        log.error("ETS module build directory could not be determined. Review ets.env - ETS_MODULE_DIR or pass as argument --module");
        process.exit(1);
      }
  
      const luaBundle = path.resolve(luaDir, moduleDir);
      const commonDir = path.resolve(luaDir, common);
      const watchFlag = watch ? "--watch" : "";      

      log.info(`Building modules in ${luaBundle}`);
      execSync(`npx tstl ${watchFlag}`, {
        cwd: __dirname,
        stdio: "inherit",
      });

      // if there is not a directory
      log.success(`Module files created in ${luaBundle}`);

      // updating common libs with full file. 
      fs.moveSync(
        path.resolve(luaBundle, "lualib_bundle.lua"),
        path.resolve(commonDir, "lualib_bundle.lua"), 
        { overwrite: true }
      );

      if (liveReload) {        
        log.info(`Starting Eluna watcher... (THIS ONLY WORKS WITH DOCKER CONFIGS!)`);
        const runShellScript = () => {
          const scriptProcess = spawn("./send-reload-eluna.sh");
  
          scriptProcess.stdout.on("close", (data) => {
            log.success("Reloading Eluna complete..");
          });
  
          scriptProcess.stderr.on("data", (data) => {
            log.error(`Script Error: ${data}`);
          });
        };
  
        const rerunEluna = _.debounce(runShellScript, 300);
        fs.watch(luaDir, (eventType, filename) => {
          if (eventType === "change" || eventType === "rename") {
            log.info(`Change detected in ${filename}. \nReloading eluna...`);
            rerunEluna();
          }
        });
  
        log.success("Starting Eluna watcher...");
        runShellScript();
      }

    } catch (error) {
      log.error(`Error occurred: ${error.message}`);
      process.exit(1);
    }

    return; 
  }
  /**
   * Setups the base configuration and builds base libraries. This
   * enables a user to 
   * This will add files to the module directory 
   * - ets.env - environment variables for the project
   * - tsconfig.json - default tsconfig for the project
   * - tstl.schema.json - default tstl schema for the project
   * 
   * IF example is set flag is set it will also create a hello-world modules
   * - modules/hello-world.ts
   * - modules/index.ts
   * 
   * @returns void
   */
  function initProject(example = false) {
    const callerDir = process.cwd();
    
    // Environment variables
    const sourceFile = path.join(__dirname, "../ets.env");
    const destFile = path.join(callerDir, "ets.env");

    // TSCONFIG defaults for module
    const buildSrc = path.join(__dirname, "../tsconfig.module.json");
    const buildDest = path.join(callerDir, "tsconfig.json");

    // TSTL schema for module
    const schemaSrc = path.join(__dirname, "../tsconfig.module.json");
    const schemaDest = path.join(callerDir, "tsconfig.json");

    // Example module
    const example = path.join(__dirname, "../modules");
    const exampleDest = path.join(callerDir, "modules");

    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, destFile);
      log.success("ets.env file copied successfully.");
    } else {      
      log.error("ets.env file does not exist in the package directory.");     
    }
    
    if(fs.existsSync(buildSrc)) {
      fs.copyFileSync(buildSrc, buildDest);
      log.success("default tsconfig.json file copied successfully.");
    } else {
      log.error("tsconfig.json file does not exist in the package directory.");
    }

    // update the output directory default
    const jsonData = JSON.parse(fs.readFileSync(buildDest, 'utf8'));
    const jsonString = JSON.stringify(jsonData, null, 2).replace(/\[\[module_output\]\]/g, './dist');
    fs.writeFileSync(buildDest, jsonString, 'utf8');

    if(fs.existsSync(schemaSrc)) {
      fs.copyFileSync(schemaSrc, schemaDest);
      log.success("default tstl.schema.json file copied successfully.");
    }

    // if an example is flagged then copy the example module
    if(example) {
      if(fs.existsSync(example) && !fs.existsSync(exampleDest)) {
        fs.copySync(example, exampleDest);
        log.success("example module files copied successfully.");
      } else {
        log.error("Could not copy modules directory already exists.");
      }
    }
  }

  /**
   * Creates some helper library function for modules, ported from original eluna-ts, though 
   * and be expanded for other functionity that is useful for modules in the future. 
   * @param {string} luaDir
   * @returns 
   */
  function buildLibs(luaDir) {
    const luaDir = luaDir || process.env.ETS_BUILD_ROOT || "./dist";
    const commonDir = process.env.ETS_COMMON_DIR || "common";
    if (!luaDir) {      
      log.error("ETS build root could not be determined. Review ets.env - ETS_BUILD_ROOT or pass as argument --luadir");              
      process.exit(1);
    }

    const luaBundle = path.resolve(luaDir, commonDir, "functions.lua");
    execSync(`npx tstl -p ../tsconfig.build.json --luaBundle ${luaBundle}`, {
      cwd: __dirname,
      stdio: "inherit",
    });
    log.success(`Bundle file created in ${luaBundle}`);
    return;
  }

  