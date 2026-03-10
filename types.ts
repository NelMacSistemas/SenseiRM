
export enum UserRole {
  ADMIN = 'admin',
  USER = 'usuario'
}

export enum EntityStatus {
  ACTIVE = 'ativo',
  INACTIVE = 'inativo',
  PROSPECT = 'prospecto',
  BLOCKED = 'bloqueado'
}

export enum TaskStatus {
  OPEN = 'Aberta',
  ANALYSIS = 'Em análise',
  EXECUTION = 'Em execução',
  WAITING_THIRD = 'Aguardando terceiro',
  WAITING_USER = 'Aguardando usuário',
  COMPLETED = 'Concluída',
  CANCELED = 'Cancelada'
}

export enum TaskPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum TaskType {
  REQUEST = 'Solicitação',
  PROBLEM = 'Problema',
  IMPROVEMENT = 'Melhoria',
  PROJECT = 'Projeto'
}

export interface Sector {
  id: string;
  nome: string;
  responsavelId?: string;
  descricao?: string;
  dataCriacao: string;
}

export interface ClientCategory {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  dataCriacao: string;
}

export interface TaskLog {
  id: string;
  timestamp: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  action: string;
  userId: string;
  userName: string;
  changes?: string[];
  justification?: string;
}

export interface Permission {
  acesso: boolean;
  leitura: boolean;
  incluir: boolean;
  editar: boolean;
  excluir: boolean;
}

export interface UserPermissions {
  dashboard: Permission;
  clientes: Permission;
  malaDireta: Permission;
  tarefas: Permission;
  usuarios: Permission;
  configuracoes: Permission;
  auditoria: Permission;
}

export interface SLASettings {
  Baixa: number;
  Média: number;
  Alta: number;
  Crítica: number;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  perfil: UserRole;
  status: EntityStatus;
  tema: string;
  dataCriacao: string;
  permissoes: UserPermissions;
  foto?: string;
  telefone?: string;
  celular?: string;
  possuiWhatsapp: boolean;
}

export interface ContactPerson {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Client {
  id: string;
  clientCode: string; // Automático (CLI-001)
  tipoPessoa: 'Física' | 'Jurídica';
  nomeRazaoSocial: string;
  nomeFantasia?: string;
  documento: string; // CPF ou CNPJ
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  dataCadastro: string;
  status: EntityStatus;

  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  pais: string;

  // Contatos
  telefonePrincipal: string;
  telefoneSecundario?: string;
  emailPrincipal: string;
  emailFinanceiro?: string;
  site?: string;

  // Pessoas de Contato (Multi)
  pessoasContato: ContactPerson[];

  // Financeiro
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: 'Corrente' | 'Poupança';
  chavePix?: string;
  tipoChavePix?: 'CPF/CNPJ' | 'E-mail' | 'Telefone' | 'Aleatória';

  // CRM
  categoria?: string; // VIP, Atacadista, etc
  origem?: string; // Site, Indicação, etc
  observacoes?: string;

  // Governança
  situacao: 'Ativo' | 'Inadimplente' | 'Bloqueado para venda';
  motivoBloqueio?: string;
  dataUltimaVenda?: string;
  avaliacaoInterna?: number;
  attachments?: Attachment[];
}

export interface Task {
  id: string;
  taskNumber: string; 
  titulo: string;
  descricao: string;
  tipo: TaskType;
  solicitanteId: string; 
  responsavelId: string;
  setorId: string; 
  interessados: string;
  prioridade: TaskPriority;
  status: TaskStatus;
  dataCriacao: string; 
  dataVencimento?: string; 
  dataInicio?: string; 
  dataConclusaoReal?: string;
  tempoGasto: string; 
  logs: TaskLog[];
  attachments?: Attachment[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
}

export interface MailHistory {
  id: string;
  data: string;
  tipo: 'email' | 'whatsapp';
  destinatarios: string[];
  assunto: string;
  mensagem: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
