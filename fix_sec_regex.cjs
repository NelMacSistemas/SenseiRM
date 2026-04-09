const fs = require('fs');

const path = 'd:\\SenseiRM\\App.tsx';
let data = fs.readFileSync(path, 'utf8');

// Use regex to normalize whitespaces
const reSector = /if\s*\(\s*editingSector\s*\)\s*\{\s*updateSector\s*\(\{\s*\.\.\.editingSector,\s*nome,\s*responsavelId,\s*descricao\s*\}\);\s*\}\s*else\s*\{\s*setIsSectorModalOpen\(false\);\s*setEditingSector\(null\);\s*\}/gm;

const replacement1 = `if (editingSector) {
      updateSector({ ...editingSector, nome, responsavelId, descricao });
      setEditingSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
      const novo = { id: newId, nome, responsavelId, descricao, dataCriacao: new Date().toISOString() };
      addSector(novo);
      setEditingSector(novo);
    }`;

if (reSector.test(data)) {
  data = data.replace(reSector, replacement1);
  fs.writeFileSync(path, data);
  console.log("Success replacing Sector!");
} else {
  console.log("Failed to find Sector using regex");
}
