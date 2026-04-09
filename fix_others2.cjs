const fs = require('fs');
let data = fs.readFileSync('App.tsx', 'utf8');

const targetCat = `    if (editingCategory) {
      updateClientCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      addClientCategory({ id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() });
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);`;

const repCat = `    if (editingCategory) {
      updateClientCategory({ ...editingCategory, nome, descricao, cor });
      setEditingCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      const nova = { id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() };
      addClientCategory(nova);
      setEditingCategory(nova);
    }
    if (success) success('Categoria salva!');`;

if (data.includes(targetCat)) {
  data = data.replace(targetCat, repCat);
  console.log('Fixed Category via explicit string');
} else {
  // Regex fallback
  const reCat = /if\s*\(\s*editingCategory\s*\)\s*\{\s*updateClientCategory\s*\(\{\s*\.\.\.editingCategory,\s*nome,\s*descricao,\s*cor\s*\}\);\s*\}\s*else\s*\{\s*addClientCategory[^\}]+\}\s*setIsCategoryModalOpen\(false\);\s*setEditingCategory\(null\);/g;
  if(reCat.test(data)) {
    data = data.replace(reCat, repCat);
    console.log('Fixed category via Regex');
  } else {
    console.log('Category not found');
  }
}

const targetField = `    if (editingCustomField) {
      updateCustomField({ ...editingCustomField, name, type, required, context });
    } else {
      addCustomField({ id: newId, name, type, required, context, order: customFields.length });
    }
    setIsCustomFieldModalOpen(false);
    setEditingCustomField(null);`;

const repField = `    if (editingCustomField) {
      updateCustomField({ ...editingCustomField, name, type, required, context });
      setEditingCustomField({ ...editingCustomField, name, type, required, context });
    } else {
      const novo = { id: newId, name, type, required, context, order: customFields.length };
      addCustomField(novo);
      setEditingCustomField(novo);
    }
    if (success) success('Campo modificado com sucesso!');`;

if (data.includes(targetField)) {
  data = data.replace(targetField, repField);
  console.log('Fixed Field via explicit string');
} else {
  const reField = /if\s*\(\s*editingCustomField\s*\)\s*\{\s*updateCustomField\s*\(\{\s*\.\.\.editingCustomField,\s*name,\s*type,\s*required,\s*context\s*\}\);\s*\}\s*else\s*\{\s*addCustomField[^\}]+\}\s*setIsCustomFieldModalOpen\(false\);\s*setEditingCustomField\(null\);/g;
  if(reField.test(data)) {
     data = data.replace(reField, repField);
     console.log('Fixed field via Regex');
  } else {
    console.log('Field not found');
  }
}

fs.writeFileSync('App.tsx', data);
