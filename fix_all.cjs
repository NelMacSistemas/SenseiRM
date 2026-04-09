const fs = require('fs');

const path = 'd:\\SenseiRM\\App.tsx';
let data = fs.readFileSync(path, 'utf8');

// 1. useEffect for loadData
const reUE = /useEffect\(\(\)\s*=>\s*\{\s*const\s*token\s*=\s*localStorage\.getItem\('senseirm_token'\);\s*if\s*\(token\s*&&\s*!currentUser\)\s*\{\s*loadData\(\);\s*\}\s*\},\s*\[currentUser\]\);/g;

const repUE = `useEffect(() => {
    const token = localStorage.getItem('senseirm_token');
    if (token) {
      loadData();
    }
  }, []);`;

if (reUE.test(data)) { data = data.replace(reUE, repUE); console.log("Fixed useEffect"); }

// 2. Sector fix
const reSector = /if\s*\(\s*editingSector\s*\)\s*\{\s*updateSector\s*\(\{\s*\.\.\.editingSector,\s*nome,\s*responsavelId,\s*descricao\s*\}\);\s*\}\s*else\s*\{\s*addSector\(\{ id: newId, nome, responsavelId, descricao, dataCriacao: new Date\(\)\.toISOString\(\) \}\);\s*\}\s*setIsSectorModalOpen\(false\);\s*setEditingSector\(null\);/g;

const repSector = `if (editingSector) {
      updateSector({ ...editingSector, nome, responsavelId, descricao });
      setEditingSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
      const novo = { id: newId, nome, responsavelId, descricao, dataCriacao: new Date().toISOString() };
      addSector(novo);
      setEditingSector(novo);
    }`;

if (reSector.test(data)) { data = data.replace(reSector, repSector); console.log("Fixed Sector"); }

// 3. Category
const reCat = /if\s*\(\s*editingCategory\s*\)\s*\{\s*updateClientCategory\s*\(\{\s*\.\.\.editingCategory,\s*nome,\s*descricao,\s*cor\s*\}\);\s*\}\s*else\s*\{\s*addClientCategory\(\{ id: newId, nome, descricao, cor, dataCriacao: new Date\(\)\.toISOString\(\) \}\);\s*\}\s*setIsCategoryModalOpen\(false\);\s*setEditingCategory\(null\);/g;

const repCat = `if (editingCategory) {
      updateClientCategory({ ...editingCategory, nome, descricao, cor });
      setEditingCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      const nova = { id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() };
      addClientCategory(nova);
      setEditingCategory(nova);
    }`;

if (reCat.test(data)) { data = data.replace(reCat, repCat); console.log("Fixed Category"); }

// 4. Custom Field
const reField = /if\s*\(\s*editingCustomField\s*\)\s*\{\s*updateCustomField\s*\(\{\s*\.\.\.editingCustomField,\s*name,\s*type,\s*required,\s*options,\s*regex,\s*maxLength,\s*placeholder\s*\}\);\s*\}\s*else\s*\{\s*addCustomField\(\{ id: newId, name, type, required, options, entity: 'client', regex, maxLength, placeholder \}\);\s*\}\s*setIsCustomFieldModalOpen\(false\);\s*setEditingCustomField\(null\);/g;

const repField = `if (editingCustomField) {
      updateCustomField({ ...editingCustomField, name, type, required, options, regex, maxLength, placeholder });
      setEditingCustomField({ ...editingCustomField, name, type, required, options, regex, maxLength, placeholder });
    } else {
      const novo = { id: newId, name, type, required, options, entity: 'client', regex, maxLength, placeholder };
      addCustomField(novo);
      setEditingCustomField(novo);
    }`;

if (reField.test(data)) { data = data.replace(reField, repField); console.log("Fixed Field"); }


fs.writeFileSync(path, data);
console.log('App.tsx fully patched');
