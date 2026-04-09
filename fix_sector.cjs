const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf-8');

const targetSector = `    if (editingSector) {
      updateSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
    setIsSectorModalOpen(false);
    setEditingSector(null);
  };`;

const newSector = `    if (editingSector) {
      updateSector({ ...editingSector, nome, responsavelId, descricao });
      setEditingSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
      const novo = { id: newId, nome, responsavelId, descricao, dataCriacao: new Date().toISOString() };
      addSector(novo);
      setEditingSector(novo);
    }
    if (success) success('Setor salvo com sucesso!');
  };`;

if (content.includes(targetSector)) {
  content = content.replace(targetSector, newSector);
  fs.writeFileSync('App.tsx', content);
  console.log('App.tsx sector fixed');
} else {
  console.log('Target not found in App.tsx');
}
