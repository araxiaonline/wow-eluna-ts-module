#!/usr/bin/env node
const { Command } = require("commander");
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");
const _ = require("lodash");
const { TscWatchClient } = require('tsc-watch/client');
const { spawn } = require("child_process");
const { Client } = require('node-scp'); 

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
  .option("-x, --example", "Create example module files. (default: false)")
  .description("Initialize the project building base libs and adding environment variables")
  .action(({example}) => {
    initProject(example);    
  });

program
  .command("deploy")
  .option("-e, --env <env>", "Environment to deploy the modules to dev, prod. (default: dev)")
  .description("Deploy  built lua modules to the server this requires configuration to be set in ets.env")
  .action(async ({env}) => {
    deploy(env); 
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
      moduleDir = moduleDir || process.env.ETS_MODULE_DIR;
      const etsCommon = process.env.ETS_COMMON_DIR || "common";
      const etsModules = process.env.ETS_MODULE_DIR || "modules";
  
      if (!luaDir) {
        log.error("ETS build root could not be determined. Review ets.env - ETS_BUILD_ROOT or pass as argument --luadir");        
        process.exit(1);
      }
  
      if (!moduleDir) {
        log.error("ETS module build directory could not be determined. Review ets.env - ETS_MODULE_DIR or pass as argument --module");
        process.exit(1);
      }
  
      const outputDir = path.resolve(luaDir, moduleDir);
      const commonDir = path.resolve(luaDir, etsCommon);
      const tsModulesDir = path.resolve(process.cwd(), etsModules);      

      // If the watch command is not sent we can simply build the modules. 
      if(!watch) {
        log.info(`Building modules in ${outputDir}`);
        execSync(`npx tstl --outDir "${outputDir}"`, {
          cwd: __dirname,
          stdio: "inherit",
        });

        // if there is not a directory
        log.success(`Module files created in ${outputDir}`);

        // If the required full lib is created then move it also 
        if(fs.existsSync(path.resolve(outputDir, "lualib_bundle.lua"))) {
          // updating common libs with full file. 
          fs.moveSync(
            path.resolve(outputDir, "lualib_bundle.lua"),
            path.resolve(commonDir, "lualib_bundle.lua"), 
            { overwrite: true }
          );
        }        
      }

      // It watch is specified we need to use tscwatch so stdout can be updated correctly. 
      if(watch) {
        const tscwatch = new TscWatchClient();

        tscwatch.on("success", () => {
          log.success(`Modules built successfully to ${outputDir}`);          

          let reloadError = false; 
          // if live reload is also enabled we send a signal to reload eluna to the server
          if(liveReload) {
            log.info(`Reloading Eluna...`);
            const reloadprocess = spawn("./node_modules/.bin/eluna-reload");

            reloadprocess.stdout.on("data", (data)=> {
              log.info(data);
            });

            reloadprocess.stderr.on("data", (data)=> {
              log.error(`Error reloading eluna: ${data}`);
              reloadError = true; 

            });

            reloadprocess.stdout.on("close", (data) => {
              if(!reloadError) {
                log.success("Reloading Eluna complete..");
              } else {
                log.error("There was an error reloading Eluna. Please review errors and fix.");
              }
            });
          }
        }); 

        tscwatch.on("compile_errors", (errors) => {
          log.error("There were errors compiling modules. Please review errors and fix.", errors);          
        }); 
        
        tscwatch.start("--outDir", outputDir);
      }

    } catch (error) {

      // Clean up any processes that are running.
      if(typeof tscwatch !== "undefined") {
        tscwatch.stop();
      }

      if(typeof reloadprocess !== "undefined") {
        reloadprocess.kill();
      }

      log.error(`Error occurred: ${error.message}`);
      process.exit(1);
    }

    // Clean up any processes that are running. 
    process.on("exit", () => {
      if(typeof tscwatch !== "undefined") {
        tscwatch.stop();
      }

      if(typeof reloadprocess !== "undefined") {
        reloadprocess.kill();
      }
    })

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
    const schemaSrc = path.join(__dirname, "../tstl.schema.json");
    const schemaDest = path.join(callerDir, "tstl.schema.json");

    // Example module
    const exampleSrc = path.join(__dirname, "../modules");
    const exampleDest = path.join(callerDir, "modules");

    // TSTL Plugins
    const pluginSrc = path.join(__dirname, "../plugins");
    const pluginDest = path.join(callerDir, "plugins"); 

    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, destFile);
      log.success("ets.env file copied successfully.");
    } else {      
      log.error("ets.env file does not exist in the package directory.");     
    }
    
    if(fs.existsSync(buildSrc)) {
      fs.copyFileSync(buildSrc, buildDest);
      log.success("default tsconfig.json file copied successfully.");

      // update the output directory default
      const jsonData = JSON.parse(fs.readFileSync(buildDest, 'utf8'));
      const jsonString = JSON.stringify(jsonData, null, 2).replace('[[module_output]]', './dist');
      fs.writeFileSync(buildDest, jsonString, 'utf8');
    } else {
      log.error("tsconfig.json file does not exist in the package directory.");
    }

    if(fs.existsSync(schemaSrc)) {
      fs.copyFileSync(schemaSrc, schemaDest);
      log.success("default tstl.schema.json file copied successfully.");
    }

    // Copy the plugins needed for helping with specific transpiles. 
    if(fs.existsSync(pluginSrc) && !fs.existsSync(pluginDest)) {
      fs.copySync(pluginSrc, pluginDest); 
      log.success("installed plugins for tstl"); 
    } else {
      log.error("failed to install plugins for tstl will need manual install or some documented features will not work"); 
    }

    // if an example is flagged then copy the example module
    if(example) {      
      if(fs.existsSync(exampleSrc) && !fs.existsSync(exampleDest)) {
        fs.copySync(exampleSrc, exampleDest);
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
    luaDir = luaDir || process.env.ETS_BUILD_ROOT || "./dist";
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

  /**
   * Uses scp protocol to copy files to a remote server more
   * protocols may be added in the future
   * @param {string} env - environment from the command 
   */
  async function deploy(env = "dev") {

    const config = {
      host: getEnv(`${env.toUpperCase()}_HOST`) ||  'localhost',
      port: getEnv(`${env.toUpperCase()}_PORT`) || 22,
      path: getEnv(`${env.toUpperCase()}_PATH`) || '/azerothcore/lua_scripts/',
      username: getEnv( `${env.toUpperCase()}_USER`) || '',
      password: getEnv( `${env.toUpperCase()}_PASS`) || '',
      privateKey: getEnv( `${env.toUpperCase()}_PRIVATE_KEY`) || undefined,
      passphrase: getEnv( `${env.toUpperCase()}_PRIVATE_KEY_PASS`) || undefined

    };

    if(!config.host) {
      log.error(`Missing ${env.toUpperCase()}_HOST in ets.env`);
      process.exit(1);
    }
    
    // If the remote host is the local file system we will just do a local copy instead of scp
    if(config.host === 'localhost' || config.host === '127.0.0.1') {
      const outputDir = path.resolve(process.cwd(), process.env.ETS_BUILD_ROOT, process.env.ETS_MODULE_DIR);
      const remoteDir = path.resolve(config.path);

      fs.copySync(outputDir, remoteDir, { overwrite: true });
      log.success(`Modules copied to ${remoteDir}`);

      if(fs.existsSync(path.join(process.cwd(), process.env.ETS_BUILD_ROOT, process.env.ETS_COMMON_DIR))) {
        const commonDir = path.resolve(process.cwd(), process.env.ETS_BUILD_ROOT, process.env.ETS_COMMON_DIR);

        fs.copySync(commonDir, remoteDir, { overwrite: false });
        log.success(`Common lua libraries copied to ${remoteDir}`);
      }
     
      return;
    }

    try {

      if(config.privateKey) {
        config.privateKey = fs.readFileSync(config.privateKey, 'utf8');
      }      
      const client = await Client(config);     

      await client.uploadDir(
        path.join(process.cwd(), process.env.ETS_BUILD_ROOT, process.env.ETS_MODULE_DIR),
        config.path
      ); 

      // if there is also a common directory built we will deploy that as well
      if(fs.existsSync(path.join(process.cwd(), process.env.ETS_BUILD_ROOT, process.env.ETS_COMMON_DIR))) {
        await client.uploadDir(
          path.join(process.cwd(), process.env.ETS_BUILD_ROOT, process.env.ETS_COMMON_DIR),
          config.path
        ); 
      }

      client.close(); 
      log.success(`Modules uploaded to ${config.host}:${config.path}`);
    } catch(e) {
      console.log(e);
      log.error(e.message);      
    } 

  }

  /**
   * Get Environment Variable if found or return false. 
   * @param {string} name 
   * @returns string | number | boolean
   */
  function getEnv(name) { 
    if(typeof process.env[name] === undefined || process.env[name] === null) {
      return false; 
    } 

    return process.env[name]; 
  }
