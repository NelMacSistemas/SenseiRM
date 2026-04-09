const fs = require('fs');

const path = 'd:\\SenseiRM\\App.tsx';
let data = fs.readFileSync(path, 'utf8');

const target1 = `    if (editingSector) {
      updateSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
    setIsSectorModalOpen(false);
    setEditingSector(null);
  };`;

const replacement1 = `    if (editingSector) {
      updateSector({ ...editingSector, nome, responsavelId, descricao });
      setEditingSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
      const novo = { id: newId, nome, responsavelId, descricao, dataCriacao: new Date().toISOString() };
      addSector(novo);
      setEditingSector(novo);
    }
    if (success) success('Setor salvo com sucesso!');
  };`;

if (data.includes(target1)) {
  data = data.replace(target1, replacement1);
  fs.writeFileSync(path, data);
  console.log("Success replacing Sector!");
} else {
  console.log("Failed to find target1");
}
