const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');

const iconRegex = /(?:icon="([^"]+)"|icon:\s*'([^']+)')/g;
const iconRegex2 = /<Icon[^>]*name=["']([^"']+)["']/g;

let match;
const foundIcons = new Set();
while ((match = iconRegex.exec(content)) !== null) {
  foundIcons.add(match[1] || match[2]);
}
while ((match = iconRegex2.exec(content)) !== null) {
  foundIcons.add(match[1]);
}

const mapRegex = /const iconMap: Record<string, any> = {([\s\S]*?)};/s;
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
if(missing.length === 0) console.log("ALL ICONS ARE MAPPED.");
