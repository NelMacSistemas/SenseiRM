const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

const uuidFunc = `
export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
`;

// Only replace if not already patched
if (!content.includes('export const generateUUID')) {
    // 1. Replace all existing usage cleanly FIRST
    content = content.replace(/crypto\.randomUUID\(\)/g, 'generateUUID()');

    // 2. Insert the fallback function AFTER replacement so it's not affected
    const insertTarget = '\n// --- Helpers for Detailed Audit ---';
    const insertPos = content.indexOf(insertTarget);
    
    if (insertPos !== -1) {
        content = content.slice(0, insertPos) + uuidFunc + content.slice(insertPos);
    } else {
        console.error("Could not find insertion point!");
        process.exit(1);
    }

    fs.writeFileSync(appPath, content, 'utf8');
    console.log('App.tsx perfectly patched!');
} else {
    console.log('Already patched!');
}
