// post-build.js
// Esegui dopo npm run build per fixare i path

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

console.log('🔧 Post-Build Fix Script Starting...\n');

// 1. Fix index.html
const indexPath = 'dist/index.html';
let indexContent = readFileSync(indexPath, 'utf-8');

console.log('📝 Fixing index.html...');

// Assicura che tutti i path siano relativi
indexContent = indexContent
  .replace(/href="\//g, 'href="./')
  .replace(/src="\//g, 'src="./')
  .replace(/href='\/'/g, "href='./'")
  .replace(/src='\/'/g, "src='./'");

// Rimuovi eventuali base tag
indexContent = indexContent.replace(/<base[^>]*>/gi, '');

writeFileSync(indexPath, indexContent);
console.log('✅ index.html fixed\n');

// 2. Fix JS files - rimuovi import assoluti se presenti
console.log('📝 Checking JS files in assets/...');
const assetsDir = 'dist/assets';
const files = readdirSync(assetsDir);

let jsFixed = 0;
files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = join(assetsDir, file);
    let content = readFileSync(filePath, 'utf-8');
    const originalLength = content.length;
    
    // Fix import paths se necessario
    content = content
      .replace(/from\s+["']\/assets\//g, 'from "./');
    
    if (content.length !== originalLength) {
      writeFileSync(filePath, content);
      jsFixed++;
      console.log(`  ✅ Fixed: ${file}`);
    }
  }
});

if (jsFixed === 0) {
  console.log('  ℹ️  No JS files needed fixing');
}

console.log('\n🎉 Post-Build Fix Complete!\n');
console.log('📋 Next steps:');
console.log('   1. Test with: npm run preview');
console.log('   2. Or open: dist/index.html in browser');
console.log('   3. For Electron: npm run dist\n');