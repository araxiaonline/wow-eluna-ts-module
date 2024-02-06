import * as ts from "typescript";
import * as tstl from "typescript-to-lua";
import * as path from "node:path"; 
import { readFileSync, existsSync, ensureDirSync, mkdtempSync } from "fs-extra";
import * as os from "node:os";

require('dotenv').config({ 
  path: 'ets.env' 
});

type RequiredDefintion = {
  module: string,
  variable: string
}

const requires: Map<string, RequiredDefintion[]> = new Map();
const resolvedModules: string[] = [];

/**
 * Identifies the require symbol in code and parses into module and path. 
 */
function requireSymbol(code: string): string[] | null {
  let matcher = code.match(/____(.+) = require\(\"(.+)\"\)/);
  if(matcher) {
    return  new Array(matcher[1], matcher[2]);
  } else {
    return null;
  }
}

/**
 * This creates a consistent key for use in the source map that can identify values
 * in both beforeEmit and afterPrint hooks
 */
function keyifyFile(file: string, program: ts.Program): string {
  const newpath =  file.replace(tstl.getProjectRoot(program), '').replace(path.normalize('/dist'), ''); 
  return newpath.replace(/\.ts|\.lua/g, '');
}

/**
 * Builds a source map of modules to their code. 
 */
function buildSourceMap(files: tstl.EmitFile[], program: ts.Program) {
  const sourceMap: Map<string, string> = new Map();
  for(const file of files) {
    let sourceKey = file.outputPath.replace(program.getCompilerOptions().outDir + '/' ?? '', ''); 
    sourceKey = sourceKey.replace('.lua', ''); 
    sourceMap.set(sourceKey, file.code);
  }
  return sourceMap;
}

/**
 * This recursively (I hope) resolves module names to their respective code in the sourceMap
 * that is built from files during the before Emit process. 
 * It only resolves modules once to avoid collistions in AddOn Namespace. 
 */
function resolveRequire(modulepath: string, sourceMap: Map<string, string>, code?: string): string {

  
  // de-lua-ify the module name to a path. 
  let filepath =  modulepath.replace(/\./g, "/"); 
  let output: string = code || ''; 

  // skip resolved modules only want to include them once to avoid namespace issues. 
  if(resolvedModules.includes(modulepath)) {
    console.log('skipping already resolved module: ', modulepath);
    return ''; 
  }

  // have to check if the file we are resolving also has requires that need to be resolved. 
  let filecode = sourceMap.get(filepath) ?? ''; 

  if(requireSymbol(filecode)) { 

    for(const line of filecode.split("\n")) {
      if(line.includes("lualib")) {
        filecode = filecode.replace(line+"\n", '');
        continue; 
      }
      const [variable, module] = requireSymbol(line) ?? ["", ""];
    
      if(module) {        
        output += resolveRequire(module, sourceMap, output);                        
      }
    } 
    
  } 
  output += filecode;  
  resolvedModules.push(modulepath);

  return output;  
}
/**
 * Removes tstl code that is added expecting the code to be exported only used for resolving module code. 
 */
function resolveExports(code: string, name: string) {
  return code
        .replace(/local ____exports = \{\}/g,'')
        .replace(/return ____exports/g,'')
        .replace(/____exports/g, `____${name}`);   
}

/**
 * The default mechanism for transpiling files is "require" the common Polyfill bundle code. This is actually great 
 * for server side code, however breaks client side code. So this hook transpiles the client code with "inline"
 * setting so any used Polyfills from TS are added inline into the source code removing the require to lualib modules
 * tstl puts in.  
 * 
 * This also handles building a map of the requires that will later be resolved in the beforeEmit handler. 
 */
function afterPrint(
  program: ts.Program,
  options: tstl.CompilerOptions,
  emitHost: tstl.EmitHost,
  result: tstl.ProcessedFile[]
) {
  for (const file of result) {
    const mapKey = keyifyFile(file.fileName, program);

    if (file.fileName.includes(".client.ts")) {

      const sourceCode = readFileSync(file.fileName, "utf-8");           
      const tmpPath = path.join(os.tmpdir(), 'ets-compile');           

      const result = tstl.transpileFiles([file.fileName],{        
        outDir: tmpPath,         
        luaLibImport: tstl.LuaLibImportKind.Inline, 
        luaTarget: tstl.LuaTarget.Lua52,
        strict: false,
        target: ts.ScriptTarget.ESNext,           
        skipLibCheck: true,             
        noHeader: true,   
        lib: [ 'lib.esnext.d.ts', 'lib.dom.d.ts' ],        
        types: [          
          'lua-types/5.2',
          '@typescript-to-lua/language-extensions',
          'wow-eluna-ts-module',
          '@araxiaonline/wow-wotlk-declarations',
          'node'
        ],                            
      });
      
      result.diagnostics.forEach((d) => {
        console.error(`\x1b[31mTRANSPILE ERROR: ${d.messageText}\x1b[0m`);        
      });
      
      const luaPath = file.fileName.replace(tstl.getSourceDir(program), '').replace('.ts', '.lua'); 
      const fallback = path.join(tmpPath, path.basename(file.fileName.replace('.ts', '.lua')));

      let transpiled:string | null = null; 
      if(existsSync(path.join(tmpPath,luaPath))) {
        transpiled = readFileSync(path.join(tmpPath,luaPath), 'utf-8');
      } else if(existsSync(fallback)) {
        transpiled = readFileSync(fallback, 'utf-8');
      } else {
        console.error(`\x1b[31mTRANSPILE ERROR: ${fallback} not found in ${tmpPath}\x1b[0m`);
      }
        
      file.code = transpiled ?? file.code;       

      for (const line of file.code.split("\n")) {
        const [variable, module] = requireSymbol(line) ?? ["", ""];

        if (module && module !== "AIO") {
          file.code = file.code.replace(line, `local ____${variable} = {}\n-- INLINE(${module})`);      
          
          const currentRequires = requires.get(mapKey) ?? [];
          requires.set(mapKey, [...currentRequires, { module, variable }]);                                
        }        
      }         
    }
  }
}

/**
 * This plugin will add AIO to the transpile process from TS assuming
 * there is a Global installation of AIO installed in the directory, which is 
 * that follows Rochet2's instructions.  
 * 
 *  Jan 31, 2024 Update        
 *  The WoW Api Client does not support requires in Lua, instead it uses .toc files / xml which are not 
 *  currently supported in AIO. 
 *  
 *  When TypescriptToLua handles imports it replaces them with lua require statements.  This creates a problem
 *  in runtime as that method is not present. This plugin now handles that by resolving the AIO client files
 *  by resolving the code and placing at the top of the transpiled file.  This allows imports 
 *  to effectively function as they would in TS land for client code. 
 * 
 *  Caveats: 
 *  - Your code must use the pattern if(!AIO.AddAddOn()) I realize there is otherways to use this but this is how the code identifies client files currently 
 *  - filenames have to be *client.ts making it reserved now
 *  - the functions methods are all in the same namespace which could cause conflicts, I believe I handeled them in the background
 *    but have not done thorough user testing to verify
 *  - Don't go crazy my methodology here is pretty simple and it is going to work best for sharing common functions / constants / enums etcs that
 *    are often repeated when building UI components. 
 * 
 * @author @ben-of-codecraft
 * @since 2024-01-31
 */
const plugin: tstl.Plugin = {
  afterPrint,
  beforeEmit(
    program: ts.Program,
    options: tstl.CompilerOptions,
    emitHost: tstl.EmitHost,
    result: tstl.EmitFile[],
  ) {
    
    // build a source map first for resolving requires 
    const sourceMap = buildSourceMap(result, program);

    for (const file of result) {
      const mapKey = keyifyFile(file.outputPath, program);       
      if(file.code.includes("aio = {}")) {

        // Handle necessary AIO replaces post transpile
        file.code = file.code.replace("-- @ts-expect-error", "");                 
        file.code = file.code.replace("aio = {}", "local AIO = AIO or require(\"AIO\")");        
        file.code = file.code.replace(/aio[\.\:]/g, "AIO."); 

        // Is targetted for AIO Client. 
        if(file.code.includes("if not AIO.AddAddon() then")) {
                    
          requires.forEach( (requiredModules: RequiredDefintion[], caller) => {

            if(mapKey !== caller) {
              return; 
            }
            
            requiredModules.forEach((requiredModule) => {
              
              const moduleCode = resolveExports(resolveRequire(requiredModule.module, sourceMap), requiredModule.variable);               
              file.code = file.code.replace(`-- INLINE(${requiredModule.module})\n`, `-- INLINE(${requiredModule.module})\n` + moduleCode); 
            });           
                        
          }); 
        }
        
        /* Weirdness with import transpilation "local local"*/
        file.code = file.code.replace("local local AIO = AIO or require(\"AIO\")", "local AIO = AIO or require(\"AIO\")");        
      }      
    }
  }
};

export default plugin;
