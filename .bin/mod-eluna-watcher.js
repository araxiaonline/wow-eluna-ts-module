#!/usr/bin/env node
const fs = require("fs");
const { spawn } = require("child_process");
const _ = require("lodash");

const WATCH_DIR = "../../lua_scripts";
const runShellScript = () => {
  const scriptProcess = spawn("./send-reload-eluna.sh");

  scriptProcess.stdout.on("close", (data) => {
    console.log("Reloading Eluna complete..");
  });

  scriptProcess.stderr.on("data", (data) => {
    console.error(`Script Error: ${data}`);
  });
};

const rerunEluna = _.debounce(runShellScript, 300);
fs.watch(WATCH_DIR, (eventType, filename) => {
  if (eventType === "change" || eventType === "rename") {
    console.log(`Change detected in ${filename}. \nReloading eluna...`);
    rerunEluna();
  }
});

console.log("Starting Eluna watcher...");
runShellScript();
