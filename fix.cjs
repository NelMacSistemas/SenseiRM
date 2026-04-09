const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

const uuidFunc = `\nexport const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};\n\n`;

// Insert after imports.
if (!content.includes('generateUUID = () => {')) {
    const importEnd = content.lastIndexOf('import ');
    const nextLineEnd = content.indexOf('\n', importEnd);
    content = content.slice(0, nextLineEnd + 1) + uuidFunc + content.slice(nextLineEnd + 1);
}

// Simple string replacement loop
while (content.includes('crypto.randomUUID()')) {
    content = content.replace('crypto.randomUUID()', 'generateUUID()');
}

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.tsx strictly patched!');
