const fs = require('fs');
let data = fs.readFileSync('App.tsx', 'utf8');

const mapping = {
  'â†’': '→',
  'â€¢': '•',
  'â€"': '—',
  'AtenÃ§Ã£o': 'Atenção',
  'UsuÃ¡rio': 'Usuário',
  // Anything else like â€“ ? Let's just do generic replace for the specific ones we saw
};

let fixes = 0;
for (const [bad, good] of Object.entries(mapping)) {
   const count = data.split(bad).length - 1;
   if(count > 0) {
      console.log(`Replacing ${count} occurrences of ${bad} to ${good}`);
      data = data.split(bad).join(good);
      fixes++;
   }
}

if (fixes > 0) {
   fs.writeFileSync('App.tsx', data, 'utf8');
   console.log("App.tsx fixed successfully.");
} else {
   console.log("No fixes applied.");
}
