const fs = require('fs');
const path = require('path');

function fixImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixImports(filePath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix various malformed import patterns
      content = content.replace(/from '\.\/\.\/types'/g, "from '../types'");
      content = content.replace(/from '\.\/types'/g, "from '../types'");
      content = content.replace(/from '\.\.\/\.\.\/types'/g, "from '../../types'");
      
      fs.writeFileSync(filePath, content);
    }
  }
}

fixImports('./obtaskai/client/src');
console.log('Fixed imports successfully!');