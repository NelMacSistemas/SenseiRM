const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf-8');

// 1. Clients
content = content.replace(
  /if \(editingClient\) updateClient\(client\); else addClient\(client\);\s*setIsModalOpen\(false\);\s*setEditingClient\(null\);\s*setActiveTab\('id'\);/g,
  `if (editingClient) updateClient(client); else addClient(client);
    setEditingClient(client);
    // keep activeTab as it is to let them continue
    if (toast) toast({ message: 'Cliente salvo com sucesso!', type: 'success' });`
);

// 2. Tasks
content = content.replace(
  /if \(editingTask\) updateTask\(task\); else addTask\(task\);\s*setIsModalOpen\(false\);\s*setEditingTask\(null\);/g,
  `if (editingTask) updateTask(task); else addTask(task);
    setEditingTask(task);
    if (success) success('Tarefa salva!'); else if (toast) toast({ message: 'Tarefa salva!', type: 'success' });`
);

// 3. Users
content = content.replace(
  /if \(editingUser\) updateUser\(u\); else addUser\(u\);\s*setIsModalOpen\(false\);\s*setEditingUser\(null\);/g,
  `if (editingUser) updateUser(u); else addUser(u);
    setEditingUser(u);
    if (toast) toast({ message: 'Usuário salvo com sucesso!', type: 'success' });`
);

// 4. Roles
content = content.replace(
  /if \(editingRole\) updateRole\(role\);[\s\S]*?else addRole\(role\);\s*setIsModalOpen\(false\);\s*setEditingRole\(null\);/g,
  `if (editingRole) updateRole(role);
    else addRole(role);
    setEditingRole(role);
    if (toast) toast({ message: 'Função salva com sucesso!', type: 'success' });`
);


// 5. Templates
content = content.replace(
  /if \(editingTemplate\) updateTemplate\(template\);[\s\S]*?else addTemplate\(template\);\s*setIsModalOpen\(false\);\s*setEditingTemplate\(null\);/g,
  `if (editingTemplate) updateTemplate(template);
    else addTemplate(template);
    setEditingTemplate(template);
    if (toast) toast({ message: 'Template salvo com sucesso!', type: 'success' });`
);

// 6. Sector
const sectorOld = `if (isEditing) {
      updateSector({ ...editingSector, nome, descricao });
    } else {
      addSector({ id: newId, nome, descricao, dataCriacao: new Date().toISOString() });
    }
    setIsSectorModalOpen(false);
    setEditingSector(null);`;

const sectorNew = `if (isEditing) {
      updateSector({ ...editingSector, nome, descricao });
      setEditingSector({ ...editingSector, nome, descricao });
    } else {
      const novo = { id: newId, nome, descricao, dataCriacao: new Date().toISOString() };
      addSector(novo);
      setEditingSector(novo);
    }
    if (success) success('Setor salvo com sucesso!');`;
content = content.replace(sectorOld, sectorNew);


// 7. Category
const catOld = `if (editingCategory) {
      updateClientCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      addClientCategory({ id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() });
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);`;

const catNew = `if (editingCategory) {
      updateClientCategory({ ...editingCategory, nome, descricao, cor });
      setEditingCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      const nova = { id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() };
      addClientCategory(nova);
      setEditingCategory(nova);
    }
    if (success) success('Categoria salva!');`;
content = content.replace(catOld, catNew);


// 8. Custom Field
const fieldOld = `if (editingCustomField) {
      updateCustomField({ ...editingCustomField, name, type, required, context });
    } else {
      addCustomField({ id: newId, name, type, required, context, order: customFields.length });
    }
    setIsCustomFieldModalOpen(false);
    setEditingCustomField(null);`;

const fieldNew = `if (editingCustomField) {
      updateCustomField({ ...editingCustomField, name, type, required, context });
      setEditingCustomField({ ...editingCustomField, name, type, required, context });
    } else {
      const novo = { id: newId, name, type, required, context, order: customFields.length };
      addCustomField(novo);
      setEditingCustomField(novo);
    }
    if (success) success('Campo modificado com sucesso!');`;
content = content.replace(fieldOld, fieldNew);


fs.writeFileSync('App.tsx', content);
console.log('App.tsx updated.');
