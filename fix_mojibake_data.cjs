const fs = require('fs');
let data = fs.readFileSync('data.json', 'utf8');

// The file was likely saved from an ANSI context or double encoded.
// Let's decode it backwards if it has typical latin1 mojibake bytes encoded as utf8
const textBytes = Buffer.from(data, 'latin1');
const decoded = textBytes.toString('utf8');

// Wait, if it was Latin1 bytes disguised as utf8 string, `latin1` and then `utf8` will decode it.
if (decoded.includes('Usuário') || decoded.includes('ç')) {
   console.log("Successfully decoded using latin1->utf8.");
}

// But wait! If the file contains valid UTF8 ALSO, it might break it.
// Let's be smart. We only want to fix the mojibake.
const mappings = {
    'Ã§': 'ç',
    'Ã£': 'ã',
    'Ãµ': 'õ',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã¢': 'â',
    'Ãª': 'ê',
    'Ã®': 'î',
    'Ã´': 'ô',
    'Ã»': 'û',
    'Ã€': 'À',
    'Ã\x81': 'Á',
    'Ã‡': 'Ç',
    'Ãƒ': 'Ã',
    'Ã•': 'Õ',
    'Ã‰': 'É',
    'Ã\x8D': 'Í',
    'Ã“': 'Ó',
    'Ãš': 'Ú',
    'Âº': 'º',
    'Âª': 'ª',
    'â†’': '→'
};

let fixes = 0;
for (const [bad, good] of Object.entries(mappings)) {
    if (data.includes(bad)) {
        fixes++;
        data = data.split(bad).join(good);
    }
}

console.log("Applied", fixes, "types of character fixes.");
if(fixes > 0) {
  fs.writeFileSync('data.json', data, 'utf8');
}
