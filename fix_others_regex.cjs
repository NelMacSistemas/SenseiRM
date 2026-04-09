const fs = require('fs');

const path = 'd:\\SenseiRM\\App.tsx';
let data = fs.readFileSync(path, 'utf8');

// 1. Categories
const reCat = /if\s*\(\s*editingCategory\s*\)\s*\{\s*updateClientCategory\s*\(\{\s*\.\.\.editingCategory,\s*nome,\s*descricao,\s*cor\s*\}\);\s*\}\s*else\s*\{\s*setIsCategoryModalOpen\(false\);\s*setEditingCategory\(null\);\s*\}/gm;

const repCat = `if (editingCategory) {
      updateClientCategory({ ...editingCategory, nome, descricao, cor });
      setEditingCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      const nova = { id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() };
      addClientCategory(nova);
      setEditingCategory(nova);
    }`;

if (reCat.test(data)) {
  data = data.replace(reCat, repCat);
  console.log("Success replacing Categories!");
}

// 2. Custom Fields
const reField = /if\s*\(\s*editingCustomField\s*\)\s*\{\s*updateCustomField\s*\(\{\s*\.\.\.editingCustomField,\s*name,\s*type,\s*required,\s*context\s*\}\);\s*\}\s*else\s*\{\s*setIsCustomFieldModalOpen\(false\);\s*setEditingCustomField\(null\);\s*\}/gm;

const repField = `if (editingCustomField) {
      updateCustomField({ ...editingCustomField, name, type, required, context });
      setEditingCustomField({ ...editingCustomField, name, type, required, context });
    } else {
      const novo = { id: newId, name, type, required, context, order: customFields.length };
      addCustomField(novo);
      setEditingCustomField(novo);
    }`;

if (reField.test(data)) {
  data = data.replace(reField, repField);
  console.log("Success replacing Custom Fields!");
}

fs.writeFileSync(path, data);
