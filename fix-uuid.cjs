const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Insert generateUUID function if it doesn't exist
if (!content.includes('const generateUUID = () => {')) {
    const uuidFunc = `
// Fallback para IPs remotos (HTTP) que não possuem suporte à crypto.randomUUID()
export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

`;
    // Insert after imports. Find first empty line after imports or just after `import './index.css';`
    const insertPos = content.indexOf('export const THEMES');
    if (insertPos !== -1) {
        content = content.slice(0, insertPos) + uuidFunc + content.slice(insertPos);
    }
}

// Replace all occurrences of crypto.randomUUID() with generateUUID()
content = content.replace(/crypto\.randomUUID\(\)/g, 'generateUUID()');

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.tsx fix applied successfully!');
