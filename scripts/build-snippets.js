#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');

/**
 * This will combine all the snippets into the dist .vscode directory at publish time.  
 * @param {string} type 
 */
async function buildSnippets(type) {    
  try {
    const snippets = {};    
    const snippetsDir = path.join(process.cwd(), 'snippets', type);
    const files = await fs.readdir(snippetsDir);
    
    for (const file of files) {      
      if (file.endsWith('.code-snippets')) {        
        const content = await fs.readJson(path.join(snippetsDir, file));
        
        Object.assign(snippets, content);
      }
    }

    const output = path.join(process.cwd(), 'dist', '.vscode');
    await fs.ensureDir(output);
    await fs.writeJson(path.join(output, `${type}.code-snippets`),snippets, {spaces: 2});    
  } catch (error) {
    console.error('Error combining snippets:', error);
  }
}


( async() => {
// Build Packaged Eluna snippets
  await buildSnippets('eluna');
  // Build Package WoW API Snippets
})();




