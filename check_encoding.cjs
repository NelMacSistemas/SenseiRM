const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');

console.log("Has U+FFFD:", content.includes('\uFFFD'));
console.log("Has Ã£:", content.includes('Ã£'));
console.log("Has Ã§:", content.includes('Ã§'));
console.log("Has â†’:", content.includes('â†’'));

const iconRegex = /(?:icon="([^"]+)"|icon:\s*'([^']+)')/g;
let match;
const foundIcons = new Set();
while ((match = iconRegex.exec(content)) !== null) {
  foundIcons.add(match[1] || match[2]);
}

const mapRegex = /const iconMap: Record<string, any> = {([^}]+)}/s;
const mapMatch = mapRegex.exec(content);
const mapped = new Set();
if (mapMatch) {
  const lines = mapMatch[1].split('\n');
  for (const line of lines) {
    const m = line.match(/'([^']+)':/);
    if (m) mapped.add(m[1]);
  }
}

const missing = [...foundIcons].filter(i => !mapped.has(i) && i);
console.log("Missing Icons:", missing.join(', '));
