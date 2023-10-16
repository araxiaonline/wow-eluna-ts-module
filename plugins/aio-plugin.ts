import * as ts from "typescript";
import * as tstl from "typescript-to-lua";

/**
 * This plugin will add AIO to the transpile process from TS assuming
 * there is a Global installation of AIO installed in the directory, which is 
 * that follows Rochet2's instructions.  
 */
const plugin: tstl.Plugin = {
  beforeEmit(
    program: ts.Program,
    options: tstl.CompilerOptions,
    emitHost: tstl.EmitHost,
    result: tstl.EmitFile[],
  ) {
    
    for (const file of result) {
      
      if(file.code.includes("aio = {}")) {
        console.log(`installing AIO for this file ${file.outputPath}`); 
        file.code = file.code.replace("-- @ts-expect-error", "");                 
        file.code = file.code.replace("aio = {}", "local AIO = AIO or require(\"AIO\")");        
        file.code = file.code.replace(/aio\./g, "AIO."); 
      }      
    }
  }
};

export default plugin;