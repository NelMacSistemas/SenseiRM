import { UserRole, EntityStatus, User } from './types';

export const THEMES = [
  { id: 'verde', name: 'Esmeralda', color: '#10b981', class: 'emerald' },
  { id: 'azul', name: 'Oceano', color: '#3b82f6', class: 'blue' },
  { id: 'laranja', name: 'Âmbar', color: '#f59e0b', class: 'orange' },
  { id: 'dourado', name: 'Dourado', color: '#eab308', class: 'yellow' },
  { id: 'lilas', name: 'Violeta', color: '#8b5cf6', class: 'violet' },
  { id: 'rosa', name: 'Carmim', color: '#ec4899', class: 'pink' },
  { id: 'vermelho', name: 'Escarlate', color: '#ef4444', class: 'red' },
  { id: 'metal', name: 'Metálico', color: '#475569', class: 'slate' },
];

const fullPermission = { acesso: true, leitura: false, incluir: true, editar: true, excluir: true };
const readOnlyPermission = { acesso: true, leitura: true, incluir: false, editar: false, excluir: false };
const noPermission = { acesso: false, leitura: false, incluir: false, editar: false, excluir: false };

export const INITIAL_USER: User = {
  id: '1',
  nome: 'Administrador',
  email: 'admin@senseirm.com',
  senha: 'admin',
  perfil: UserRole.ADMIN,
  status: EntityStatus.ACTIVE,
  tema: 'verde',
  dataCriacao: new Date().toISOString(),
  foto: 'https://picsum.photos/200',
  telefone: '5133334444',
  celular: '51992733121',
  possuiWhatsapp: true,
  permissoes: {
    dashboard: fullPermission,
    clientes: fullPermission,
    malaDireta: fullPermission,
    tarefas: fullPermission,
    usuarios: fullPermission,
    configuracoes: fullPermission,
    auditoria: fullPermission
  }
};