import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { User, Client, ContactPerson, AuditEntry, MailHistory, UserRole, EntityStatus, TaskStatus, TaskPriority, UserPermissions, Permission, TaskType, SLASettings, TaskLog, Sector, Task, ClientCategory } from './types';
import { INITIAL_USER, THEMES } from './constants';
import { auditService } from './services/auditService';

import { 
  Edit, Trash2, Plus, Tag, Building2, Clock, Palette, Shield, Check, 
  Users, LayoutDashboard, Mail, FileText, Settings, ShieldAlert, Info,
  Search, Filter, Download, Upload, LogOut, User as UserIcon, Phone, Mail as MailIcon,
  Globe, MapPin, CreditCard, PieChart, Activity, AlertTriangle, ChevronRight,
  ChevronLeft, MoreVertical, X, Calendar, MessageSquare, ExternalLink, HelpCircle
} from 'lucide-react';

// Icons from Lucide
const iconMap: Record<string, any> = {
  'edit': Edit,
  'trash': Trash2,
  'plus': Plus,
  'tag': Tag,
  'building': Building2,
  'clock': Clock,
  'palette': Palette,
  'shield-alt': Shield,
  'check': Check,
  'users': Users,
  'dashboard': LayoutDashboard,
  'mala-direta': Mail,
  'tarefas': FileText,
  'configuracoes': Settings,
  'auditoria': ShieldAlert,
  'sobre': Info,
  'search': Search,
  'filter': Filter,
  'download': Download,
  'upload': Upload,
  'logout': LogOut,
  'user': UserIcon,
  'phone': Phone,
  'email': MailIcon,
  'globe': Globe,
  'map-pin': MapPin,
  'credit-card': CreditCard,
  'pie-chart': PieChart,
  'activity': Activity,
  'alert-triangle': AlertTriangle,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'more-vertical': MoreVertical,
  'x': X,
  'calendar': Calendar,
  'message-square': MessageSquare,
  'external-link': ExternalLink
};

const Icon: React.FC<{ name: string; className?: string; title?: string }> = ({ name, className = "", title }) => {
  const LucideIcon = iconMap[name] || HelpCircle;
  return <LucideIcon className={`${className} pointer-events-none`} size={18} />;
};

// --- Helpers for Detailed Audit ---
const getDetailedDiff = (oldObj: any, newObj: any, labels: Record<string, string>): string => {
  const changes: string[] = [];
  Object.keys(labels).forEach(key => {
    const oldVal = oldObj[key] === undefined || oldObj[key] === null || oldObj[key] === '' ? 'Vazio' : String(oldObj[key]);
    const newVal = newObj[key] === undefined || newObj[key] === null || newObj[key] === '' ? 'Vazio' : String(newObj[key]);
    
    if (oldVal !== newVal) {
      changes.push(`${labels[key]}: "${oldVal}" → "${newVal}"`);
    }
  });
  return changes.length > 0 ? `Alterações: [${changes.join(' | ')}]` : 'Nenhuma alteração nos campos principais.';
};

const CLIENT_LABELS = {
  nomeRazaoSocial: 'Razão Social',
  nomeFantasia: 'Nome Fantasia',
  documento: 'Documento',
  status: 'Status Base',
  cep: 'CEP',
  logradouro: 'Logradouro',
  cidade: 'Cidade',
  uf: 'UF',
  emailPrincipal: 'E-mail',
  categoria: 'Categoria Comercial',
  situacao: 'Situação de Crédito',
  avaliacaoInterna: 'Rating'
};

const USER_LABELS = {
  nome: 'Nome',
  email: 'E-mail',
  perfil: 'Perfil',
  status: 'Status da Conta',
  celular: 'Celular',
  possuiWhatsapp: 'WhatsApp Ativo'
};

const TASK_LABELS = {
  titulo: 'Título',
  descricao: 'Descrição',
  tipo: 'Tipo',
  prioridade: 'Prioridade',
  status: 'Status',
  responsavelId: 'ID Responsável',
  setorId: 'ID Setor',
  dataVencimento: 'Vencimento',
  dataInicio: 'Início',
  tempoGasto: 'Tempo Gasto'
};

// --- Context ---
interface AppState {
  currentUser: User | null;
  users: User[];
  clients: Client[];
  tasks: Task[];
  sectors: Sector[];
  clientCategories: ClientCategory[];
  auditLogs: AuditEntry[];
  history: MailHistory[];
  slaSettings: SLASettings;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  updateUser: (user: User) => void;
  addUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  addSector: (sector: Sector) => void;
  updateSector: (sector: Sector) => void;
  deleteSector: (id: string) => void;
  addClientCategory: (category: ClientCategory) => void;
  updateClientCategory: (category: ClientCategory) => void;
  deleteClientCategory: (id: string) => void;
  addMailHistory: (entry: MailHistory) => void;
  updateSLASettings: (settings: SLASettings) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp deve ser usado dentro de um AppProvider");
  return context;
};

// --- Provider ---
const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('senseirm_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem('senseirm_users');
    return stored ? JSON.parse(stored) : [INITIAL_USER];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const stored = localStorage.getItem('senseirm_clients');
    return stored ? JSON.parse(stored) : [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem('senseirm_tasks');
    return stored ? JSON.parse(stored) : [];
  });

  const [sectors, setSectors] = useState<Sector[]>(() => {
    const stored = localStorage.getItem('senseirm_sectors');
    return stored ? JSON.parse(stored) : [];
  });

  const [clientCategories, setClientCategories] = useState<ClientCategory[]>(() => {
    const stored = localStorage.getItem('senseirm_client_categories');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing categories:', e);
      }
    }
    return [
      { id: '1', nome: 'VIP', dataCriacao: new Date().toISOString() },
      { id: '2', nome: 'Atacadista', dataCriacao: new Date().toISOString() },
      { id: '3', nome: 'Revenda', dataCriacao: new Date().toISOString() },
      { id: '4', nome: 'Estratégico', dataCriacao: new Date().toISOString() },
      { id: '5', nome: 'Consumidor Geral', dataCriacao: new Date().toISOString() }
    ];
  });

  const [history, setHistory] = useState<MailHistory[]>(() => {
    const stored = localStorage.getItem('senseirm_history');
    return stored ? JSON.parse(stored) : [];
  });

  const [slaSettings, setSlaSettings] = useState<SLASettings>(() => {
    const stored = localStorage.getItem('senseirm_sla_settings');
    return stored ? JSON.parse(stored) : { Baixa: 15, Média: 7, Alta: 3, Crítica: 1 };
  });

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() => auditService.getLogs());

  const refreshAudit = () => setAuditLogs(auditService.getLogs());

  useEffect(() => {
    localStorage.setItem('senseirm_users', JSON.stringify(users));
    localStorage.setItem('senseirm_clients', JSON.stringify(clients));
    localStorage.setItem('senseirm_tasks', JSON.stringify(tasks));
    localStorage.setItem('senseirm_sectors', JSON.stringify(sectors));
    localStorage.setItem('senseirm_history', JSON.stringify(history));
    localStorage.setItem('senseirm_sla_settings', JSON.stringify(slaSettings));
    localStorage.setItem('senseirm_client_categories', JSON.stringify(clientCategories));
  }, [users, clients, tasks, sectors, history, slaSettings, clientCategories]);

  useEffect(() => {
    const themeId = currentUser?.tema || 'verde';
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--primary-color', theme.color);
    THEMES.forEach(t => document.body.classList.remove(`theme-${t.id}`));
    document.body.classList.add(`theme-${themeId}`);
  }, [currentUser?.tema]);

  const login = (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.senha === pass && u.status === EntityStatus.ACTIVE);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('senseirm_current_user', JSON.stringify(user));
      auditService.log(user.id, user.nome, 'LOGIN', 'AUTH', `Usuário ${user.nome} autenticou.`);
      refreshAudit();
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser) auditService.log(currentUser.id, currentUser.nome, 'LOGOUT', 'AUTH', 'Sessão encerrada.');
    setCurrentUser(null);
    localStorage.removeItem('senseirm_current_user');
    refreshAudit();
  };

  const addUser = (u: User) => {
    setUsers(prev => [...prev, u]);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'USUARIOS', `Usuário ${u.nome} criado.`);
    refreshAudit();
  };

  const updateUser = (u: User) => {
    const oldUser = users.find(item => item.id === u.id);
    const diff = oldUser ? getDetailedDiff(oldUser, u, USER_LABELS) : '';
    setUsers(prev => prev.map(item => item.id === u.id ? u : item));
    if (currentUser?.id === u.id) {
      setCurrentUser(u);
      localStorage.setItem('senseirm_current_user', JSON.stringify(u));
    }
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'USUARIOS', `Usuário ${u.nome} alterado. ${diff}`);
    refreshAudit();
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'USUARIOS', `Usuário removido: ${target?.nome} (${target?.email})`);
    refreshAudit();
  };

  const addClient = (c: Client) => {
    setClients(prev => [...prev, c]);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CLIENTES', `Cliente ${c.nomeRazaoSocial} (${c.clientCode}) criado.`);
    refreshAudit();
  };

  const updateClient = (c: Client) => {
    const oldClient = clients.find(item => item.id === c.id);
    const diff = oldClient ? getDetailedDiff(oldClient, c, CLIENT_LABELS) : '';
    setClients(prev => prev.map(item => item.id === c.id ? c : item));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CLIENTES', `Cliente ${c.nomeRazaoSocial} atualizado. ${diff}`);
    refreshAudit();
  };

  const deleteClient = (id: string) => {
    const target = clients.find(c => c.id === id);
    setClients(prev => prev.filter(c => c.id !== id));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CLIENTES', `Cliente removido: ${target?.nomeRazaoSocial} (${target?.clientCode})`);
    refreshAudit();
  };

  const addTask = (t: Task) => {
    setTasks(prev => [...prev, t]);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'TAREFAS', `Tarefa ${t.taskNumber}: "${t.titulo}" criada.`);
    refreshAudit();
  };

  const updateTask = (t: Task) => {
    const oldTask = tasks.find(item => item.id === t.id);
    const diff = oldTask ? getDetailedDiff(oldTask, t, TASK_LABELS) : '';
    setTasks(prev => prev.map(item => item.id === t.id ? t : item));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'TAREFAS', `Tarefa ${t.taskNumber} alterada. ${diff}`);
    refreshAudit();
  };

  const deleteTask = (id: string) => {
    const target = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'TAREFAS', `Tarefa excluída: ${target?.taskNumber} - ${target?.titulo}`);
    refreshAudit();
  };

  const addSector = (s: Sector) => {
    setSectors(prev => [...prev, s]);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'SETORES', `Setor "${s.nome}" criado.`);
    refreshAudit();
  };

  const updateSector = (s: Sector) => {
    const oldSec = sectors.find(item => item.id === s.id);
    const diff = oldSec ? getDetailedDiff(oldSec, s, { nome: 'Nome', descricao: 'Descrição', responsavelId: 'Gestor' }) : '';
    setSectors(prev => prev.map(item => item.id === s.id ? s : item));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'SETORES', `Setor "${s.nome}" atualizado. ${diff}`);
    refreshAudit();
  };

  const deleteSector = (id: string) => {
    setSectors(prev => prev.filter(s => s.id !== id));
    setTasks(prev => prev.map(task => task.setorId === id ? { ...task, setorId: '' } : task));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'SETORES', `Setor removido.`);
    refreshAudit();
  };

  const addClientCategory = (c: ClientCategory) => {
    setClientCategories(prev => [...prev, c]);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CONFIG', `Categoria "${c.nome}" criada.`);
    refreshAudit();
  };

  const updateClientCategory = (c: ClientCategory) => {
    setClientCategories(prevCategories => {
      const old = prevCategories.find(item => item.id === c.id);
      if (old && old.nome !== c.nome) {
        setClients(prevClients => prevClients.map(client => 
          client.categoria === old.nome ? { ...client, categoria: c.nome } : client
        ));
      }
      
      auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Categoria "${c.nome}" atualizada.`);
      refreshAudit();
      
      return prevCategories.map(item => item.id === c.id ? c : item);
    });
  };

  const deleteClientCategory = (id: string) => {
    setClientCategories(prev => prev.filter(c => c.id !== id));
    setClients(prev => prev.map(client => client.categoria === id ? { ...client, categoria: '' } : client));
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CONFIG', `Categoria removida.`);
    refreshAudit();
  };

  const addMailHistory = (h: MailHistory) => {
    setHistory(prev => [h, ...prev]);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'SEND', 'COMUNICACAO', `Envio em massa (${h.tipo}) para ${h.destinatarios.length} destinos. Assunto: ${h.assunto}`);
    refreshAudit();
  };

  const updateSLASettings = (settings: SLASettings) => {
    const diff = getDetailedDiff(slaSettings, settings, { Baixa: 'SLA Baixa', Média: 'SLA Média', Alta: 'SLA Alta', Crítica: 'SLA Crítica' });
    setSlaSettings(settings);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Prazos de SLA redefinidos. ${diff}`);
    refreshAudit();
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, clients, tasks, sectors, auditLogs, history, slaSettings, clientCategories,
      login, logout, updateUser, addUser, deleteUser,
      addClient, updateClient, deleteClient,
      addTask, updateTask, deleteTask, 
      addSector, updateSector, deleteSector,
      addClientCategory, updateClientCategory, deleteClientCategory,
      addMailHistory, updateSLASettings
    }}>
      <style>{`
        :root { --primary-color: #10b981; }
        .bg-primary { background-color: var(--primary-color); }
        .text-primary { color: var(--primary-color); }
        .border-primary { border-color: var(--primary-color); }
        .hover\\:bg-primary:hover { background-color: var(--primary-color); }
        .focus\\:border-primary:focus { border-color: var(--primary-color); }
      `}</style>
      {children}
    </AppContext.Provider>
  );
};

// --- Helper Components ---

const ProgressBar = ({ progress, color = "bg-primary" }: { progress: number, color?: string }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1 text-[10px] font-bold uppercase tracking-wider">
      <span className="text-slate-400">Progresso</span>
      <span className={progress >= 100 ? 'text-primary' : 'text-blue-500'}>{progress}%</span>
    </div>
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
      <div 
        className={`h-full transition-all duration-700 rounded-full shadow-inner ${color}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

const StatMiniCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
  <div className={`p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-all cursor-pointer`}>
     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
     <span className={`text-xl font-black mt-1 ${color}`}>{value}</span>
  </div>
);

// --- Layout ---

const Sidebar = () => {
  const { currentUser, logout } = useApp();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'chart-line', perm: 'dashboard' },
    { path: '/clientes', label: 'Clientes', icon: 'address-book', perm: 'clientes' },
    { path: '/mala-direta', label: 'Mala Direta', icon: 'paper-plane', perm: 'malaDireta' },
    { path: '/tarefas', label: 'Tarefas', icon: 'tasks', perm: 'tarefas' },
    { path: '/usuarios', label: 'Usuários', icon: 'users', perm: 'usuarios' },
    { path: '/configuracoes', label: 'Configurações', icon: 'cog', perm: 'configuracoes' },
    { path: '/auditoria', label: 'Auditoria', icon: 'shield-alt', perm: 'auditoria' },
    { path: '/sobre', label: 'Sobre', icon: 'info-circle', perm: null },
  ];

  const hasAccess = (permKey: string | null) => {
    if (!permKey) return true;
    if (currentUser?.perfil === UserRole.ADMIN) return true;
    return !!currentUser?.permissoes[permKey as keyof UserPermissions]?.acesso;
  };

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col fixed left-0 top-0 text-slate-300 shadow-xl z-50">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-primary p-2 rounded-lg text-white">
          <Icon name="users-cog" className="text-xl" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none">SenseiRM</h1>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">CRM Ecosystem</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            if (!hasAccess(item.perm)) return null;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-800 hover:text-white'}`}>
                  <Icon name={item.icon} className={isActive ? 'text-primary' : 'text-slate-50 group-hover:text-slate-300'} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 bg-slate-800/50 m-4 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <img src={currentUser?.foto || 'https://picsum.photos/seed/default/40'} className="w-10 h-10 rounded-full border-2 border-primary/30 object-cover" />
          <div className="overflow-hidden">
            <p className="text-white text-sm font-semibold truncate">{currentUser?.nome}</p>
            <p className="text-xs text-slate-500 uppercase tracking-tighter">{currentUser?.perfil}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 transition-all rounded-lg text-sm font-bold">
          <Icon name="sign-out-alt" /> Sair
        </button>
      </div>
    </div>
  );
};

const Header = ({ title }: { title: string }) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
  </header>
);

const StatCard = ({ label, value, icon, color, subText }: any) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer">
    <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shrink-0`}>
      <Icon name={icon} className="text-2xl" />
    </div>
    <div className="overflow-hidden">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest truncate">{label}</p>
      <p className="text-2xl font-black text-slate-800 leading-none mt-1">{value}</p>
      {subText && <p className="text-[9px] text-slate-500 font-bold mt-2 truncate italic">{subText}</p>}
    </div>
  </div>
);

// --- Pages ---

const Dashboard = () => {
  const { clients, tasks, users, currentUser } = useApp();

  // Membros calculados para KPIs
  const kpis = useMemo(() => {
    // Escopo de tarefas
    const scopeTasks = currentUser?.perfil === UserRole.ADMIN ? tasks : tasks.filter(t => t.responsavelId === currentUser?.id);
    const now = new Date();
    
    // Indicadores de CLIENTES
    const clientsActive = clients.filter(c => c.status === EntityStatus.ACTIVE).length;
    const clientsInactive = clients.filter(c => c.status === EntityStatus.INACTIVE).length;
    const clientsBlocked = clients.filter(c => c.status === EntityStatus.BLOCKED || c.situacao === 'Bloqueado para venda').length;

    // Indicadores de USUÁRIOS
    const usersActive = users.filter(u => u.status === EntityStatus.ACTIVE).length;
    const usersInactive = users.filter(u => u.status === EntityStatus.INACTIVE).length;
    const usersAdmin = users.filter(u => u.perfil === UserRole.ADMIN).length;
    const usersStandard = users.filter(u => u.perfil === UserRole.USER).length;

    // Indicadores de TAREFAS
    const tasksCompleted = scopeTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const tasksInProgress = scopeTasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED).length;
    const tasksOverdue = scopeTasks.filter(t => {
      if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELED || !t.dataVencimento) return false;
      return new Date(t.dataVencimento) < now;
    }).length;

    // Outros
    const totalClients = clients.length;
    const adimplenceRate = totalClients > 0 ? Math.round((clients.filter(c => c.situacao === 'Ativo').length / totalClients) * 100) : 100;
    const avgRating = totalClients > 0 ? (clients.reduce((acc, c) => acc + (c.avaliacaoInterna || 0), 0) / totalClients).toFixed(1) : "0.0";

    // Ranking
    const rankedClients = [...clients]
      .sort((a, b) => (b.avaliacaoInterna || 0) - (a.avaliacaoInterna || 0))
      .slice(0, 5);

    return {
      clientsActive, clientsInactive, clientsBlocked,
      usersActive, usersInactive, usersAdmin, usersStandard,
      tasksCompleted, tasksInProgress, tasksOverdue,
      totalClients, adimplenceRate, avgRating,
      rankedClients
    };
  }, [clients, tasks, users, currentUser]);

  return (
    <div className="p-8 space-y-12 animate-in fade-in duration-700">
      
      {/* SEÇÃO 1: CLIENTES */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="h-8 w-1.5 bg-primary rounded-full" />
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">CLIENTES</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
           <Link to="/clientes"><StatCard label="Total Geral" value={kpis.totalClients} icon="address-book" color="bg-primary" subText="Cadastros totais na base" /></Link>
           <Link to="/clientes"><StatMiniCard label="Clientes Ativos" value={kpis.clientsActive} color="text-emerald-500" /></Link>
           <Link to="/clientes"><StatMiniCard label="Clientes Inativos" value={kpis.clientsInactive} color="text-slate-400" /></Link>
           <Link to="/clientes"><StatMiniCard label="Clientes Bloqueados" value={kpis.clientsBlocked} color="text-red-500" /></Link>
        </div>
      </section>

      {/* SEÇÃO 2: USUÁRIOS */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="h-8 w-1.5 bg-purple-500 rounded-full" />
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">USUÁRIOS</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <Link to="/usuarios" className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-around hover:shadow-md transition-all">
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativo (s)</p>
                 <p className="text-3xl font-black text-emerald-500">{kpis.usersActive}</p>
              </div>
              <div className="h-10 w-[1px] bg-slate-100" />
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inativo (s)</p>
                 <p className="text-3xl font-black text-slate-300">{kpis.usersInactive}</p>
              </div>
           </Link>
           <Link to="/usuarios"><StatCard label="Administradores" value={kpis.usersAdmin} icon="user-shield" color="bg-purple-600" /></Link>
           <Link to="/usuarios"><StatCard label="Usuários Padrão" value={kpis.usersStandard} icon="user-tie" color="bg-indigo-500" /></Link>
        </div>
      </section>

      {/* SEÇÃO 3: RANKING DE CLIENTES POR AVALIAÇÃO INTERNA */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="h-8 w-1.5 bg-amber-500 rounded-full" />
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">RANKING DE CLIENTES POR AVALIAÇÃO INTERNA</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.rankedClients.map((c, idx) => (
            <Link to="/clientes" key={c.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden transform hover:scale-105 transition-transform hover:shadow-md">
              <div className="absolute top-0 left-0 bg-amber-100 text-amber-700 font-black text-[10px] px-3 py-1 rounded-br-2xl shadow-sm">
                #{idx + 1}
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 mt-2">
                <Icon name="user-tag" className="text-lg text-primary" />
              </div>
              <p className="text-xs font-black text-slate-800 line-clamp-1 h-8 flex items-center justify-center" title={c.nomeRazaoSocial}>
                {c.nomeRazaoSocial}
              </p>
              <div className="flex gap-0.5 text-amber-400 mt-2 text-[10px]">
                {[1,2,3,4,5].map(i => <Icon key={i} name="star" className={i <= (c.avaliacaoInterna || 0) ? 'fas' : 'far'} />)}
              </div>
              <span className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{c.categoria || 'Geral'}</span>
            </Link>
          ))}
          {kpis.rankedClients.length === 0 && (
            <div className="col-span-full py-12 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 italic font-medium">
              Nenhuma avaliação registrada para compor o ranking.
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 4: OPERACIONAL E SLA */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="h-8 w-1.5 bg-blue-500 rounded-full" />
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Gestão Operacional e Eficiência</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <Link to="/tarefas" className="bg-white p-8 rounded-[3rem] border-b-8 border-emerald-500 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tarefas Concluídas</p>
                    <h4 className="text-4xl font-black text-slate-800 mt-2">{kpis.tasksCompleted}</h4>
                 </div>
                 <Icon name="check-double" className="text-4xl text-emerald-100 group-hover:text-emerald-200 transition-colors" />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-4">Entregas realizadas com sucesso no período.</p>
           </Link>

           <Link to="/tarefas" className="bg-white p-8 rounded-[3rem] border-b-8 border-blue-500 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Em Andamento</p>
                    <h4 className="text-4xl font-black text-slate-800 mt-2">{kpis.tasksInProgress}</h4>
                 </div>
                 <Icon name="spinner" className="text-4xl text-blue-100 group-hover:animate-spin transition-colors" />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-4">Demandas em fila ou execução ativa.</p>
           </Link>

           <Link to="/tarefas" className="bg-white p-8 rounded-[3rem] border-b-8 border-red-600 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tarefas Atrasadas</p>
                    <h4 className="text-4xl font-black text-red-600 mt-2">{kpis.tasksOverdue}</h4>
                 </div>
                 <Icon name="history" className="text-4xl text-red-100 group-hover:text-red-200 transition-colors" />
              </div>
              <p className="text-xs text-red-400 font-bold mt-4 uppercase tracking-tighter">Vencimentos excedidos • Atenção Urgente</p>
           </Link>
        </div>
      </section>

      {/* SEÇÃO EXTRA: SAÚDE DA CARTEIRA */}
      <section className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-6">
                <h3 className="text-xl font-black text-white tracking-tight">Qualidade da Carteira</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-slate-400 uppercase">Taxa de Adimplência</span>
                      <span className="text-2xl font-black text-primary">{kpis.adimplenceRate}%</span>
                   </div>
                   <ProgressBar progress={kpis.adimplenceRate} color="bg-primary" />
                </div>
                <p className="text-xs text-slate-500 italic">Clientes com situação de crédito liberada em relação ao total da base.</p>
             </div>
             <div className="space-y-6">
                <h3 className="text-xl font-black text-white tracking-tight">Rating de Satisfação</h3>
                <div className="flex items-center gap-6">
                   <div className="text-6xl font-black text-amber-400 leading-none">{kpis.avgRating}</div>
                   <div className="space-y-2">
                      <div className="flex gap-1 text-amber-400 text-lg">
                        {[1,2,3,4,5].map(i => <Icon key={i} name="star" className={i <= Math.round(Number(kpis.avgRating)) ? 'fas' : 'far'} />)}
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score Médio por Perfil</p>
                   </div>
                </div>
             </div>
          </div>
      </section>

    </div>
  );
};

const ClientsPage = () => {
  const { clients, addClient, updateClient, deleteClient, currentUser, clientCategories } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'id' | 'end' | 'cont' | 'fin' | 'crm'>('id');
  const [contactPeople, setContactPeople] = useState<ContactPerson[]>([]);
  const [tipoPessoa, setTipoPessoa] = useState<'Física' | 'Jurídica'>('Jurídica');

  // Controlled Identity states (Fixes the bug of not showing data on edit)
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [documento, setDocumento] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [status, setStatus] = useState<EntityStatus>(EntityStatus.ACTIVE);

  // Address lookup states
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  // Today for date validations
  const today = new Date().toISOString().split('T')[0];

  const isAdmin = currentUser?.perfil === UserRole.ADMIN;
  const perms = currentUser?.permissoes.clientes;

  const canEdit = isAdmin || perms?.editar;
  const canDelete = isAdmin || perms?.excluir;
  const canInclude = isAdmin || perms?.incluir;

  useEffect(() => {
    if (editingClient) {
      setContactPeople(editingClient.pessoasContato || []);
      setTipoPessoa(editingClient.tipoPessoa || 'Jurídica');
      setNomeRazaoSocial(editingClient.nomeRazaoSocial || '');
      setNomeFantasia(editingClient.nomeFantasia || '');
      setDocumento(editingClient.documento || '');
      setInscricaoEstadual(editingClient.inscricaoEstadual || '');
      setStatus(editingClient.status || EntityStatus.ACTIVE);
      
      setCep(editingClient.cep || '');
      setLogradouro(editingClient.logradouro || '');
      setBairro(editingClient.bairro || '');
      setCidade(editingClient.cidade || '');
      setUf(editingClient.uf || '');
    } else {
      setContactPeople([]);
      setTipoPessoa('Jurídica');
      setNomeRazaoSocial('');
      setNomeFantasia('');
      setDocumento('');
      setInscricaoEstadual('');
      setStatus(EntityStatus.ACTIVE);
      
      setCep('');
      setLogradouro('');
      setBairro('');
      setCidade('');
      setUf('');
    }
  }, [editingClient, isModalOpen]);

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setUf(data.uf || '');
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    const client: Client = {
      ...editingClient,
      id: editingClient?.id || crypto.randomUUID(),
      clientCode: editingClient?.clientCode || `CLI-${String(clients.length + 1).padStart(3, '0')}`,
      tipoPessoa: tipoPessoa,
      nomeRazaoSocial: nomeRazaoSocial,
      nomeFantasia: nomeFantasia,
      documento: documento,
      inscricaoEstadual: tipoPessoa === 'Jurídica' ? inscricaoEstadual : '',
      inscricaoMunicipal: data.inscricaoMunicipal,
      dataCadastro: editingClient?.dataCadastro || new Date().toISOString(),
      status: status,
      
      cep: cep,
      logradouro: logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: bairro,
      cidade: cidade,
      uf: uf,
      pais: data.pais || 'Brasil',

      telefonePrincipal: data.telefonePrincipal,
      telefoneSecundario: data.telefoneSecundario,
      emailPrincipal: data.emailPrincipal,
      emailFinanceiro: data.emailFinanceiro,
      site: data.site,

      pessoasContato: contactPeople,

      banco: data.banco,
      agencia: data.agencia,
      conta: data.conta,
      tipoConta: data.tipoConta,
      chavePix: data.chavePix,
      tipoChavePix: data.tipoChavePix,

      categoria: data.categoria,
      origem: data.origem,
      observacoes: data.observacoes,

      situacao: data.situacao || 'Ativo',
      motivoBloqueio: data.motivoBloqueio,
      dataUltimaVenda: data.dataUltimaVenda,
      avaliacaoInterna: Number(data.avaliacaoInterna) || 0
    } as Client;

    if (editingClient) updateClient(client); else addClient(client);
    setIsModalOpen(false);
    setEditingClient(null);
    setActiveTab('id');
  };

  const addContactPerson = () => {
    const newPerson: ContactPerson = {
      id: crypto.randomUUID(),
      nome: '',
      cargo: '',
      telefone: '',
      email: ''
    };
    setContactPeople([...contactPeople, newPerson]);
  };

  const updateContactPerson = (id: string, field: keyof ContactPerson, value: string) => {
    setContactPeople(contactPeople.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeContactPerson = (id: string) => {
    setContactPeople(contactPeople.filter(p => p.id !== id));
  };

  const TabButton = ({ id, label, icon }: { id: any, label: string, icon: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 border-b-4 transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
    >
      <Icon name={icon} /> {label}
    </button>
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
           <p className="text-slate-500 font-medium">Gestão avançada da carteira de clientes e parceiros.</p>
        </div>
        {canInclude && (
          <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center gap-2 transition-all">
            <Icon name="plus" /> Novo Registro
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cód.</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome / Razão Social</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade/UF</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-400">{c.clientCode}</td>
                <td className="px-6 py-5">
                   <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{c.nomeRazaoSocial}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-black">{c.categoria || 'Geral'}</span>
                   </div>
                </td>
                <td className="px-6 py-5 text-slate-600 font-medium">{c.documento}</td>
                <td className="px-6 py-5 text-slate-500 text-sm font-medium">{c.cidade ? `${c.cidade}/${c.uf}` : 'Não inf.'}</td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${c.status === EntityStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit && <button onClick={() => { setEditingClient(c); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Icon name="edit" /></button>}
                    {canDelete && <button onClick={() => { if(confirm('Excluir registro definitivamente?')) deleteClient(c.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icon name="trash" /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-300 italic font-bold">Nenhum cliente cadastrado na base.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
               <div>
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{editingClient ? editingClient.clientCode : 'Novo Cadastro Corporativo'}</span>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">Ficha do Cliente</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>

            <div className="flex bg-white border-b border-slate-100 px-4 overflow-x-auto scrollbar-hide">
               <TabButton id="id" label="Identificação" icon="id-card" />
               <TabButton id="end" label="Endereço" icon="map-marker-alt" />
               <TabButton id="cont" label="Contatos" icon="phone" />
               <TabButton id="fin" label="Financeiro" icon="wallet" />
               <TabButton id="crm" label="CRM & Governança" icon="shield-alt" />
            </div>

            <form 
              id="clientForm" 
              key={editingClient?.id || 'new'} 
              onSubmit={handleSubmit} 
              className="flex-1 overflow-y-auto p-10 bg-white"
            >
               {activeTab === 'id' && (
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Pessoa</label>
                         <select value={tipoPessoa} onChange={(e: any) => setTipoPessoa(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                            <option value="Jurídica">Pessoa Jurídica (PJ)</option>
                            <option value="Física">Pessoa Física (PF)</option>
                         </select>
                       </div>
                       <div className="md:col-span-2 space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome / Razão Social</label>
                         <input 
                            name="nomeRazaoSocial" 
                            required 
                            value={nomeRazaoSocial} 
                            onChange={(e) => setNomeRazaoSocial(e.target.value)}
                            placeholder="Ex: Razão Social da Empresa" 
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary shadow-inner" 
                         />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia</label>
                         <input 
                            name="nomeFantasia" 
                            value={nomeFantasia} 
                            onChange={(e) => setNomeFantasia(e.target.value)}
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{tipoPessoa === 'Jurídica' ? 'CNPJ' : 'CPF'}</label>
                         <input 
                            name="documento" 
                            required 
                            value={documento} 
                            onChange={(e) => setDocumento(e.target.value)}
                            placeholder={tipoPessoa === 'Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'} 
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                         />
                       </div>
                       {tipoPessoa === 'Jurídica' && (
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inscrição Estadual</label>
                            <input 
                              name="inscricaoEstadual" 
                              value={inscricaoEstadual} 
                              onChange={(e) => setInscricaoEstadual(e.target.value)}
                              className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                            />
                         </div>
                       )}
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Base</label>
                         <select 
                            name="status" 
                            value={status} 
                            onChange={(e: any) => setStatus(e.target.value)}
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary"
                         >
                            <option value={EntityStatus.ACTIVE}>Ativo</option>
                            <option value={EntityStatus.INACTIVE}>Inativo</option>
                            <option value={EntityStatus.BLOCKED}>Bloqueado</option>
                         </select>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'end' && (
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                           CEP {loadingCep && <Icon name="spinner" className="animate-spin text-primary" />}
                         </label>
                         <input 
                           name="cep" 
                           value={cep} 
                           onChange={(e) => setCep(e.target.value)}
                           onBlur={handleCepBlur}
                           placeholder="00000-000" 
                           className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary shadow-inner" 
                         />
                       </div>
                       <div className="md:col-span-2 space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logradouro</label>
                         <input 
                           name="logradouro" 
                           value={logradouro} 
                           onChange={(e) => setLogradouro(e.target.value)}
                           placeholder="Rua, Av, Travessa..." 
                           className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary shadow-inner" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                         <input name="numero" defaultValue={editingClient?.numero} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary shadow-inner" />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Complemento</label>
                         <input name="complemento" defaultValue={editingClient?.complemento} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                         <input 
                           name="bairro" 
                           value={bairro} 
                           onChange={(e) => setBairro(e.target.value)}
                           className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                         <input 
                           name="cidade" 
                           value={cidade} 
                           onChange={(e) => setCidade(e.target.value)}
                           className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UF</label>
                         <input 
                           name="uf" 
                           value={uf} 
                           onChange={(e) => setUf(e.target.value.toUpperCase())}
                           maxLength={2} 
                           className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary uppercase" 
                         />
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'cont' && (
                 <div className="space-y-10 animate-in slide-in-from-left-4 duration-300">
                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Canais de Contato Institucional</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal</label>
                             <input name="telefonePrincipal" required defaultValue={editingClient?.telefonePrincipal} placeholder="(00) 0000-0000" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Secundário</label>
                             <input name="telefoneSecundario" defaultValue={editingClient?.telefoneSecundario} placeholder="(00) 00000-0000" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site / URL</label>
                             <input name="site" defaultValue={editingClient?.site} placeholder="https://..." className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Principal</label>
                             <input name="emailPrincipal" required type="email" defaultValue={editingClient?.emailPrincipal} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Financeiro</label>
                             <input name="emailFinanceiro" type="email" defaultValue={editingClient?.emailFinanceiro} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Pessoas de Contato (B2B)</h4>
                          <button type="button" onClick={addContactPerson} className="text-[10px] font-black bg-slate-100 text-slate-600 px-4 py-2 rounded-xl uppercase hover:bg-primary hover:text-white transition-all">Adicionar Pessoa</button>
                       </div>
                       
                       <div className="space-y-4">
                          {contactPeople.map((person, idx) => (
                             <div key={person.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 relative group animate-in slide-in-from-top-2">
                                <div className="md:col-span-4 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                                   <input value={person.nome} onChange={(e) => updateContactPerson(person.id, 'nome', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none text-sm font-bold" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cargo</label>
                                   <input value={person.cargo} onChange={(e) => updateContactPerson(person.id, 'cargo', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none text-sm font-bold" />
                                </div>
                                <div className="md:col-span-3 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">E-mail</label>
                                   <input type="email" value={person.email} onChange={(e) => updateContactPerson(person.id, 'email', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none text-sm font-bold" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Telefone</label>
                                   <input value={person.telefone} onChange={(e) => updateContactPerson(person.id, 'telefone', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none text-sm font-bold" />
                                </div>
                                <div className="md:col-span-1 flex items-end justify-center pb-1">
                                   <button type="button" onClick={() => removeContactPerson(person.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Icon name="trash" /></button>
                                </div>
                             </div>
                          ))}
                          {contactPeople.length === 0 && <p className="text-center py-8 text-slate-300 italic text-sm">Nenhuma pessoa de contato registrada.</p>}
                       </div>
                    </section>
                 </div>
               )}

               {activeTab === 'fin' && (
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b pb-2">Domicílio Bancário</h5>
                          <div className="space-y-4">
                             <input name="banco" defaultValue={editingClient?.banco} placeholder="Instituição (Banco)" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                             <div className="grid grid-cols-2 gap-4">
                                <input name="agencia" defaultValue={editingClient?.agencia} placeholder="Agência" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                                <input name="conta" defaultValue={editingClient?.conta} placeholder="Conta" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                             </div>
                             <select name="tipoConta" defaultValue={editingClient?.tipoConta || 'Corrente'} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                                <option value="Corrente">Conta Corrente</option>
                                <option value="Poupança">Conta Poupança</option>
                             </select>
                          </div>
                       </div>
                       <div className="md:col-span-2 space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b pb-2">Sistema de Recebimento PIX</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tipo da Chave</label>
                                <select name="tipoChavePix" defaultValue={editingClient?.tipoChavePix} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                                   <option value="">Selecione...</option>
                                   <option value="CPF/CNPJ">CPF/CNPJ</option>
                                   <option value="E-mail">E-mail</option>
                                   <option value="Telefone">Telefone</option>
                                   <option value="Aleatória">Chave Aleatória</option>
                                </select>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Chave PIX</label>
                                <input name="chavePix" defaultValue={editingClient?.chavePix} placeholder="Insira a chave registrada" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary shadow-inner" />
                             </div>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex gap-4 items-center">
                             <div className="bg-emerald-500 text-white p-3 rounded-xl"><Icon name="info-circle" /></div>
                             <p className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase tracking-tight">Utilize estas informações preferencialmente para emissão de notas fiscais e conciliação bancária automatizada.</p>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'crm' && (
                 <div className="space-y-10 animate-in slide-in-from-left-4 duration-300">
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria Comercial</label>
                          <select name="categoria" defaultValue={editingClient?.categoria || (clientCategories[0]?.nome || 'Geral')} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                             {clientCategories.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origem do Lead</label>
                          <select name="origem" defaultValue={editingClient?.origem} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                             <option value="Site">Site Institucional</option>
                             <option value="Indicação">Indicação Direta</option>
                             <option value="Prospecção">Prospecção Ativa</option>
                             <option value="Eventos">Eventos / Feiras</option>
                             <option value="Outros">Outros Canais</option>
                          </select>
                       </div>
                       <div className="space-y-1 group relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avaliação Interna (Rating)</label>
                          <input 
                            name="avaliacaoInterna" 
                            type="number" 
                            min="0" 
                            max="5" 
                            defaultValue={editingClient?.avaliacaoInterna} 
                            title="Legenda de Rating: 
1 - Baixo Potencial / Risco Alto
2 - Potencial Médio / Regular
3 - Bom Cliente / Estável
4 - Cliente Prioritário / Potencial Alto
5 - Cliente VIP / Master"
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                          />
                       </div>
                    </section>

                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Status & Governança de Vendas</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Situação de Crédito</label>
                             <select name="situacao" defaultValue={editingClient?.situacao || 'Ativo'} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                                <option value="Ativo">Liberado / Ativo</option>
                                <option value="Inadimplente">Inadimplente</option>
                                <option value="Bloqueado para venda">Bloqueado para venda</option>
                             </select>
                          </div>
                          <div className="lg:col-span-2 space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo do Bloqueio (Se houver)</label>
                             <input name="motivoBloqueio" defaultValue={editingClient?.motivoBloqueio} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Última Venda</label>
                             <input 
                               name="dataUltimaVenda" 
                               type="date" 
                               max={today}
                               defaultValue={editingClient?.dataUltimaVenda} 
                               className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                             />
                          </div>
                       </div>
                    </section>

                    <section className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações Gerais</label>
                       <textarea name="observacoes" rows={4} defaultValue={editingClient?.observacoes} placeholder="Notas internas sobre o relacionamento, histórico e peculiaridades..." className="w-full px-7 py-6 rounded-[2.5rem] border border-slate-100 bg-slate-50 outline-none resize-none font-medium focus:border-primary shadow-inner" />
                    </section>
                 </div>
               )}
            </form>

            <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-white transition-all uppercase text-[10px] tracking-widest">Descartar</button>
                <button type="submit" form="clientForm" className="px-14 py-4 rounded-2xl bg-primary text-white font-black shadow-xl hover:brightness-110 transition-all uppercase text-[10px] tracking-widest">Efetivar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TasksPage = () => {
  const { tasks, addTask, updateTask, deleteTask, users, currentUser, slaSettings, sectors } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [showLogInput, setShowLogInput] = useState(false);
  
  // Local Form States
  const [startDate, setStartDate] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(TaskStatus.OPEN);
  const [conclusaoReal, setConclusaoReal] = useState<string>('');
  
  const actionRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = currentUser?.perfil === UserRole.ADMIN;
  const perms = currentUser?.permissoes.tarefas;

  const canEdit = isAdmin || perms?.editar;
  const canDelete = isAdmin || perms?.excluir;
  const canInclude = isAdmin || perms?.incluir;

  const activeUsers = useMemo(() => users.filter(u => u.status === EntityStatus.ACTIVE), [users]);

  const filteredTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter(t => t.responsavelId === currentUser?.id);
  }, [tasks, currentUser, isAdmin]);

  const calculatedDeadline = useMemo(() => {
    if (!startDate) return '';
    const days = slaSettings[priority] || 0;
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }, [startDate, priority, slaSettings]);

  const calculateProgress = (t: Task) => {
    if (t.status === TaskStatus.COMPLETED) return 100;
    if (t.status === TaskStatus.CANCELED) return 0;
    if (!t.dataInicio) return 0;

    const start = new Date(t.dataInicio).getTime();
    const end = t.dataConclusaoReal ? new Date(t.dataConclusaoReal).getTime() : (t.dataVencimento ? new Date(t.dataVencimento).getTime() : Date.now());
    const now = Date.now();

    if (now >= end) return 100;
    if (now <= start) return 0;

    const total = end - start;
    const current = now - start;
    return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
  };

  const getChangeDetails = (oldT: Task, newT: Partial<Task>) => {
    const changes: string[] = [];
    const labels: Record<string, string> = {
      titulo: 'Título',
      descricao: 'Descrição',
      tipo: 'Tipo',
      solicitanteId: 'Solicitante',
      responsavelId: 'Responsável',
      setorId: 'Setor',
      interessados: 'Interessados',
      prioridade: 'Prioridade',
      status: 'Status',
      dataInicio: 'Data de Início',
      dataConclusaoReal: 'Conclusão Efetiva',
      tempoGasto: 'Tempo Gasto'
    };

    Object.keys(labels).forEach(key => {
      const valOldRaw = (oldT as any)[key] || '';
      const valNewRaw = (newT as any)[key] || '';
      
      if (valOldRaw !== valNewRaw) {
        let valOld = valOldRaw || 'Vazio';
        let valNew = valNewRaw || 'Vazio';

        // Melhorar legibilidade de IDs
        if (key === 'solicitanteId' || key === 'responsavelId') {
          valOld = users.find(u => u.id === valOldRaw)?.nome || valOldRaw;
          valNew = users.find(u => u.id === valNewRaw)?.nome || valNewRaw;
        } else if (key === 'setorId') {
          valOld = sectors.find(s => s.id === valOldRaw)?.nome || valOldRaw;
          valNew = sectors.find(s => s.id === valNewRaw)?.nome || valNewRaw;
        }

        changes.push(`${labels[key]}: "${valOld}" → "${valNew}"`);
      }
    });
    return changes;
  };

  const needsLogEntry = useMemo(() => {
    if (!editingTask) return false;
    
    const statusChanged = currentStatus !== editingTask.status;
    const dateChanged = startDate !== (editingTask.dataInicio || '');
    const priorityChanged = priority !== editingTask.prioridade;
    const conclusaoRealChanged = conclusaoReal !== (editingTask.dataConclusaoReal || '');

    return statusChanged || dateChanged || priorityChanged || conclusaoRealChanged;
  }, [currentStatus, startDate, priority, conclusaoReal, editingTask]);

  useEffect(() => {
    setShowLogInput(needsLogEntry);
  }, [needsLogEntry]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    const newTaskPartial: Partial<Task> = {
      titulo: data.titulo,
      descricao: data.descricao,
      tipo: data.tipo as TaskType,
      solicitanteId: data.solicitanteId,
      responsavelId: data.responsavelId || currentUser?.id,
      setorId: data.setorId,
      interessados: data.interessados,
      prioridade: priority,
      status: currentStatus,
      dataInicio: startDate,
      dataConclusaoReal: conclusaoReal,
      tempoGasto: data.tempoGasto,
    };

    const logs: TaskLog[] = [...(editingTask?.logs || [])];
    
    if (editingTask) {
      const details = getChangeDetails(editingTask, newTaskPartial);
      if (details.length > 0) {
        const changesStr = details.join(' | ');
        const justificativa = (needsLogEntry && actionRef.current?.value) ? actionRef.current.value : 'Ajuste de parâmetros técnicos.';
        
        logs.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          fromStatus: editingTask.status,
          toStatus: currentStatus,
          action: `[Alterações: ${changesStr}] - Justificativa: ${justificativa}`,
          userId: currentUser?.id || 'sys',
          userName: currentUser?.nome || 'Sistema'
        });
      }
    }

    const task: Task = {
      ...editingTask,
      ...newTaskPartial,
      id: editingTask?.id || crypto.randomUUID(),
      taskNumber: editingTask?.taskNumber || `TSK-${String(tasks.length + 1).padStart(3, '0')}`,
      dataCriacao: editingTask?.dataCriacao || new Date().toISOString(),
      dataVencimento: calculatedDeadline,
      logs: logs
    } as Task;

    if (editingTask) updateTask(task); else addTask(task);
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const openTaskModal = (t: Task | null) => {
    setEditingTask(t);
    setStartDate(t?.dataInicio || new Date().toISOString().split('T')[0]);
    setPriority(t?.prioridade || TaskPriority.MEDIUM);
    setCurrentStatus(t?.status || TaskStatus.OPEN);
    setConclusaoReal(t?.dataConclusaoReal || '');
    setIsModalOpen(true);
  };

  const openHistoryModal = (t: Task) => {
    setHistoryTask(t);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 font-medium">Ciclo de vida operacional das tarefas.</p>
        {canInclude && (
          <button onClick={() => openTaskModal(null)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center gap-2 transition-all">
            <Icon name="plus" /> Adicionar Atividade
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredTasks.map(t => {
          const owner = users.find(u => u.id === t.responsavelId);
          const progress = calculateProgress(t);
          return (
            <div key={t.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 hover:shadow-xl transition-all relative overflow-hidden group">
              <div className={`absolute left-0 top-0 bottom-0 w-2 ${t.prioridade === TaskPriority.CRITICAL ? 'bg-red-600' : t.prioridade === TaskPriority.HIGH ? 'bg-orange-500' : 'bg-blue-400'}`} />
              <div className="flex justify-between items-start pl-3 mb-4">
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.taskNumber} • {t.tipo}</span>
                   <h4 className="text-lg font-extrabold text-slate-800 leading-tight mt-1">{t.titulo}</h4>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => openHistoryModal(t)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl" title="Ver Histórico"><Icon name="history" /></button>
                   {canEdit && <button onClick={() => openTaskModal(t)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl" title="Editar"><Icon name="edit" /></button>}
                   {canDelete && <button onClick={() => { if(confirm('Remover?')) deleteTask(t.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl" title="Excluir"><Icon name="trash" /></button>}
                </div>
              </div>
              <div className="pl-3 space-y-4">
                 <ProgressBar progress={progress} />
                 <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                       <img src={owner?.foto || 'https://picsum.photos/seed/default/40'} className="w-6 h-6 rounded-full border border-slate-100 shadow-sm" />
                       <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{owner?.nome}</span>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${t.status === TaskStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{t.status}</span>
                 </div>
              </div>
            </div>
          );
        })}
        {filteredTasks.length === 0 && <div className="col-span-2 py-20 text-center text-slate-400 font-medium">Nenhuma tarefa encontrada no seu escopo.</div>}
      </div>

      {isHistoryModalOpen && historyTask && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{historyTask.taskNumber}</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Timeline de Ações</h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              {historyTask.logs && historyTask.logs.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-4 space-y-12">
                  {historyTask.logs.map((log, idx) => (
                    <div key={log.id} className="relative pl-10 animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-white border-4 border-primary shadow-sm" />
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase">{log.fromStatus}</span>
                          <Icon name="arrow-right" className="text-[8px] text-slate-300" />
                          <span className="text-[9px] font-black text-primary uppercase">{log.toStatus}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-slate-700 font-medium text-sm leading-relaxed mb-4 whitespace-pre-wrap">{log.action}</p>
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                           <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary font-black uppercase">
                              {log.userName.charAt(0)}
                           </div>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Realizado por {log.userName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 italic">
                   <Icon name="info-circle" className="text-4xl mb-4 opacity-20" />
                   <p>Nenhuma ação ou justificativa registrada para esta tarefa ainda.</p>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-slate-100 flex justify-end bg-slate-50/30">
               <button onClick={() => setIsHistoryModalOpen(false)} className="px-10 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase shadow-lg hover:bg-slate-800 transition-all">Fechar Timeline</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{editingTask ? editingTask.taskNumber : 'Identificador Automático'}</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Gerenciamento de Atividade</h3>
              </div>
              <div className="flex items-center gap-3">
                {editingTask && (
                  <button type="button" onClick={() => openHistoryModal(editingTask)} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-black text-[10px] uppercase border border-amber-100 flex items-center gap-2 hover:bg-amber-100 transition-all">
                    <Icon name="history" /> Ver Histórico
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
              </div>
            </div>
            <form id="taskForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12 space-y-12 bg-white">
              <section className="space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">1. Identificação da Tarefa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
                    <input name="titulo" required defaultValue={editingTask?.titulo} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-primary outline-none font-bold shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Demanda</label>
                    <select name="tipo" defaultValue={editingTask?.tipo || TaskType.REQUEST} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold">
                      {Object.values(TaskType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Detalhada</label>
                    <textarea name="descricao" rows={3} defaultValue={editingTask?.descricao} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-medium resize-none shadow-inner" />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">2. Pessoas Envolvidas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Solicitante</label>
                    <select name="solicitanteId" required defaultValue={editingTask?.solicitanteId} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold">
                      <option value="">Selecione...</option>
                      {activeUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável (Owner)</label>
                    <select name="responsavelId" defaultValue={editingTask?.responsavelId || currentUser?.id} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold text-primary">
                      {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipe / Setor (Config.)</label>
                    <select name="setorId" defaultValue={editingTask?.setorId} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold">
                      <option value="">Nenhum Setor Selecionado</option>
                      {sectors.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stakeholders / Interessados</label>
                    <input name="interessados" defaultValue={editingTask?.interessados} placeholder="E-mails ou nomes..." className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold shadow-inner" />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">3. Esforço e Prazos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Início</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-primary outline-none font-bold shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo (SLA / Auto)</label>
                    <input type="date" value={calculatedDeadline} readOnly className="w-full px-6 py-4 rounded-2xl border border-slate-50 bg-slate-50 text-slate-400 font-bold outline-none cursor-not-allowed" />
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conclusão Efetiva</label>
                    <input type="date" value={conclusaoReal} onChange={(e) => setConclusaoReal(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold shadow-inner focus:border-primary" />
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Esforço Gasto (H:M)</label>
                    <input name="tempoGasto" placeholder="Ex: 08:30" defaultValue={editingTask?.tempoGasto} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold shadow-inner" />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">4. Governança e Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade (Config. SLA)</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-black text-slate-800">
                      {Object.values(TaskPriority).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Atual</label>
                    <select value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value as TaskStatus)} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-black text-primary">
                      {Object.values(TaskStatus).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {showLogInput && (
                <div className="bg-amber-50 p-8 rounded-[3rem] border-2 border-amber-200 space-y-4 animate-in slide-in-from-top-4">
                    <h5 className="text-[11px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2"><Icon name="edit-alt" /> Justificativa / Ação Realizada (Obrigatório para Log)</h5>
                    <textarea ref={actionRef} required placeholder="Descreva o motivo das alterações nos campos gatilho..." className="w-full px-7 py-5 rounded-[2rem] border border-amber-300 focus:border-amber-500 outline-none h-32 font-medium bg-white shadow-inner" />
                </div>
              )}
            </form>
            <div className="p-10 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-white transition-all">Cancelar</button>
                <button type="submit" form="taskForm" className="px-14 py-4 rounded-2xl bg-primary text-white font-extrabold shadow-xl hover:brightness-110 transition-all">Salvar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PermissionMatrix = ({ permissions, onChange, targetProfile }: { permissions: UserPermissions, onChange: (newPerms: UserPermissions) => void, targetProfile: UserRole }) => {
  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'malaDireta', label: 'Mala Direta' },
    { key: 'tarefas', label: 'Tarefas' },
    { key: 'usuarios', label: 'Usuários' },
    { key: 'configuracoes', label: 'Configurações' },
    { key: 'auditoria', label: 'Auditoria' }
  ].filter(m => {
    if (targetProfile === UserRole.USER) {
      return !['auditoria', 'usuarios', 'configuracoes'].includes(m.key);
    }
    return true;
  });

  const types = [
    { key: 'acesso', label: 'Acesso' },
    { key: 'leitura', label: 'Leitura' },
    { key: 'incluir', label: 'Incluir' },
    { key: 'editar', label: 'Editar' },
    { key: 'excluir', label: 'Excluir' }
  ];

  const toggle = (modKey: string, permKey: string) => {
    const newPerms = { ...permissions };
    const mod = { ...newPerms[modKey as keyof UserPermissions] };
    
    if (permKey === 'acesso') {
      mod.acesso = !mod.acesso;
      if (!mod.acesso) {
        mod.leitura = false;
        mod.incluir = false;
        mod.editar = false;
        mod.excluir = false;
      }
    } else {
      if (!mod.acesso) return;
      if (permKey === 'leitura') {
        mod.leitura = !mod.leitura;
        if (mod.leitura) {
          mod.incluir = false;
          mod.editar = false;
          mod.excluir = false;
        }
      } else {
        if (mod.leitura) return;
        (mod as any)[permKey] = !(mod as any)[permKey];
      }
    }
    
    (newPerms as any)[modKey] = mod;
    onChange(newPerms);
  };

  return (
    <div className="w-full overflow-hidden border border-slate-200 rounded-[2rem] bg-slate-50/30">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-100/50">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Módulo</th>
            {types.map(t => (
              <th key={t.key} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-200">{t.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {modules.map(m => {
            const mod = permissions[m.key as keyof UserPermissions];
            return (
              <tr key={m.key} className="hover:bg-white transition-colors">
                <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-tighter">{m.label}</td>
                {types.map(t => {
                  const isAcesso = t.key === 'acesso';
                  const isAction = ['incluir', 'editar', 'excluir'].includes(t.key);
                  const isDisabled = (!isAcesso && !mod.acesso) || (isAction && mod.leitura);
                  return (
                    <td key={t.key} className="px-6 py-4 text-center">
                      <button 
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggle(m.key, t.key)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          (mod as any)[t.key] 
                            ? 'bg-primary border-primary text-white shadow-lg' 
                            : isDisabled ? 'bg-slate-100 border-slate-100 cursor-not-allowed opacity-20' : 'border-slate-200 text-transparent hover:border-primary'
                        }`}
                      >
                        <Icon name="check" className="text-[10px]" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const UsersPage = () => {
  const { users, addUser, updateUser, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalPhoto, setModalPhoto] = useState<string>('');
  const [modalPerms, setModalPerms] = useState<UserPermissions>(INITIAL_USER.permissoes);
  const [modalProfile, setModalProfile] = useState<UserRole>(UserRole.USER);
  const [hasWhatsapp, setHasWhatsapp] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.perfil === UserRole.ADMIN;

  const filteredUsers = useMemo(() => isAdmin ? users : users.filter(u => u.id === currentUser?.id), [users, currentUser, isAdmin]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setModalPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const u: any = { 
      ...editingUser, 
      id: editingUser?.id || crypto.randomUUID(), 
      dataCriacao: editingUser?.dataCriacao || new Date().toISOString(), 
      tema: editingUser?.tema || 'verde',
      foto: modalPhoto,
      nome: formData.get('nome'),
      email: formData.get('email'),
      status: formData.get('status') || EntityStatus.ACTIVE,
      telefone: formData.get('telefone'),
      celular: formData.get('celular'),
      possuiWhatsapp: hasWhatsapp,
      senha: formData.get('senha')
    };
    if (isAdmin) {
      u.perfil = modalProfile;
      u.permissoes = modalProfile === UserRole.USER ? {
        ...modalPerms,
        configuracoes: { acesso: true, leitura: true, incluir: false, editar: false, excluir: false }
      } : modalPerms;
    }
    if (editingUser) updateUser(u); else addUser(u);
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const openModal = (u: User | null) => {
    setEditingUser(u);
    setModalPhoto(u?.foto || '');
    setModalPerms(u?.permissoes || INITIAL_USER.permissoes);
    setModalProfile(u?.perfil || UserRole.USER);
    setHasWhatsapp(u?.possuiWhatsapp || false);
    setIsModalOpen(true);
  };

  const handleProfileChange = (newRole: UserRole) => {
    setModalProfile(newRole);
    if (newRole === UserRole.USER) {
      setModalPerms(prev => ({
        ...prev,
        auditoria: { acesso: true, leitura: true, incluir: false, editar: false, excluir: false },
        configuracoes: { acesso: true, leitura: true, incluir: false, editar: false, excluir: false }
      }));
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 font-medium">Gestão de Usuários e Acessos ao Sistema.</p>
        {isAdmin && <button onClick={() => openModal(null)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95">Novo Usuário</button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all text-center space-y-4">
             <img src={u.foto || `https://picsum.photos/seed/${u.id}/200`} className="w-24 h-24 rounded-[2.5rem] object-cover border-4 border-slate-50 shadow-lg mx-auto" />
             <div>
                <h4 className="text-lg font-black text-slate-800">{u.nome}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{u.perfil}</p>
             </div>
             <button onClick={() => openModal(u)} className="w-full px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-primary transition-all">{isAdmin ? 'Gerenciar' : 'Ver Perfil'}</button>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[95vh] shadow-2xl p-14 space-y-10 animate-in zoom-in duration-300 overflow-hidden flex flex-col">
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter text-center">Acesso ao Sistema</h3>
            <div className="flex justify-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img src={modalPhoto || `https://picsum.photos/seed/${editingUser?.id || 'new'}/200`} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-slate-50 shadow-xl" />
                    <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="camera" className="text-white text-2xl" />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
            </div>
            <form id="userForm" onSubmit={handleSubmit} className="space-y-10 overflow-y-auto pr-4 flex-1">
              <section className="space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Identificação</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Exibição</label>
                    <input name="nome" readOnly={!isAdmin} defaultValue={editingUser?.nome} required className="w-full px-6 py-4 rounded-3xl border border-slate-100 bg-slate-50 outline-none font-bold shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input name="email" readOnly={!isAdmin} defaultValue={editingUser?.email} required type="email" className="w-full px-6 py-4 rounded-3xl border border-slate-100 bg-slate-50 outline-none font-bold shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave de Acesso (Senha)</label>
                    <input name="senha" type="password" placeholder="Defina a senha" defaultValue={editingUser?.senha} required className="w-full px-6 py-4 rounded-3xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold shadow-inner" />
                  </div>
                  {isAdmin && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status da Conta</label>
                      <select name="status" defaultValue={editingUser?.status || EntityStatus.ACTIVE} className="w-full px-6 py-4 rounded-3xl border border-slate-100 bg-slate-50 outline-none font-bold">
                        <option value={EntityStatus.ACTIVE}>Ativo</option>
                        <option value={EntityStatus.INACTIVE}>Inativo</option>
                      </select>
                    </div>
                  )}
                </div>
              </section>
              <section className="space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Contato Direto</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Celular</label>
                    <input name="celular" defaultValue={editingUser?.celular} placeholder="(00) 00000-0000" className={`w-full px-6 py-4 rounded-3xl border border-slate-100 outline-none font-bold transition-colors shadow-inner ${hasWhatsapp ? 'bg-emerald-100 border-emerald-300' : 'bg-slate-50'}`} />
                   </div>
                   <div className="flex items-center gap-3 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div onClick={() => setHasWhatsapp(!hasWhatsapp)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${hasWhatsapp ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                          {hasWhatsapp && <Icon name="check" className="text-white text-[10px]" />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp Ativo</span>
                      </label>
                   </div>
                </div>
              </section>
              {isAdmin && (
                <section className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil Corporativo</label>
                      <select name="perfil" value={modalProfile} onChange={(e) => handleProfileChange(e.target.value as UserRole)} className="w-full px-6 py-4 rounded-3xl border border-slate-100 bg-slate-50 outline-none font-bold">
                        <option value={UserRole.ADMIN}>Administrador</option>
                        <option value={UserRole.USER}>Usuário</option>
                      </select>
                    </div>
                  </div>
                  <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest pt-4">Matriz de Permissões</h4>
                  <PermissionMatrix permissions={modalPerms} onChange={setModalPerms} targetProfile={modalProfile} />
                </section>
              )}
            </form>
            <div className="flex justify-end gap-4 pt-8 border-t border-slate-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 rounded-2xl border-2 border-slate-200 text-slate-500 font-black text-xs uppercase hover:bg-slate-50 transition-all">Fechar</button>
                <button type="submit" form="userForm" className="px-14 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase shadow-xl hover:brightness-110 transition-all">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfiguracoesPage = () => {
  const { currentUser, updateUser, slaSettings, updateSLASettings, sectors, addSector, updateSector, deleteSector, users, clientCategories, addClientCategory, updateClientCategory, deleteClientCategory } = useApp();
  const [activeTab, setActiveTab] = useState('perfil');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClientCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const isAdmin = currentUser?.perfil === UserRole.ADMIN;

  const tabs = [
    { id: 'perfil', label: 'Segurança', icon: 'shield-alt' },
    ...(isAdmin ? [{ id: 'setores', label: 'Setores', icon: 'building' }] : []),
    ...(isAdmin ? [{ id: 'categorias', label: 'Categorias', icon: 'tag' }] : []),
    ...(isAdmin ? [{ id: 'sla', label: 'Regras de SLA', icon: 'clock' }] : []),
    { id: 'aparencia', label: 'Aparência', icon: 'palette' }
  ];

  const handleSaveSector = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const nome = data.get('nome') as string;
    const responsavelId = data.get('responsavelId') as string;
    const descricao = data.get('descricao') as string;
    const newId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    if (editingSector) {
      updateSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
      addSector({ id: newId, nome, responsavelId, descricao, dataCriacao: new Date().toISOString() });
    }
    setIsSectorModalOpen(false);
    setEditingSector(null);
  };

  const handleSaveSLA = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSla: any = {};
    Object.keys(slaSettings).forEach(key => {
      newSla[key] = Number(formData.get(key));
    });
    updateSLASettings(newSla);
    alert('Parametrização de SLA atualizada com sucesso!');
  };

  const handleSaveCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const nome = data.get('nome') as string;
    const descricao = data.get('descricao') as string;
    const cor = data.get('cor') as string;

    const newId = Math.random().toString(36).substring(2, 11);
    if (editingCategory) {
      updateClientCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      addClientCategory({ id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() });
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-3xl border border-slate-200 w-fit shadow-sm">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Icon name={tab.icon} />{tab.label}
          </button>
        ))}
      </div>
      
      <div className="max-w-5xl">
        {activeTab === 'perfil' && (
           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 animate-in slide-in-from-bottom-2">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Privacidade da Conta</h3>
              <form className="space-y-6 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário Logado</label>
                  <input readOnly defaultValue={currentUser?.email} className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 outline-none cursor-not-allowed font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha Corporativa</label>
                  <input type="password" placeholder="••••••••" required className="w-full px-5 py-3 rounded-2xl border border-slate-100 focus:border-primary outline-none font-bold" />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:brightness-125 transition-all">Redefinir Chave</button>
              </form>
           </div>
        )}

        {activeTab === 'setores' && isAdmin && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Setores da Organização</h3>
               <button onClick={() => { setEditingSector(null); setIsSectorModalOpen(true); }} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow-md hover:brightness-110">Cadastrar Novo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sectors.map(s => {
                const manager = users.find(u => u.id === s.responsavelId);
                return (
                  <div key={s.id} className="p-6 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 flex justify-between items-start group hover:bg-white hover:border-primary/30 transition-all shadow-sm">
                    <div className="flex-1 overflow-hidden pr-4">
                      <h4 className="font-extrabold text-slate-800 uppercase tracking-tighter text-lg truncate">{s.nome}</h4>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Responsável: {manager?.nome || 'Não definido'}</p>
                      <p className="text-sm text-slate-400 mt-2 font-medium italic line-clamp-2">{s.descricao || 'Sem descrição definida.'}</p>
                      <p className="text-[9px] text-slate-300 mt-4 font-black uppercase tracking-widest">Desde {new Date(s.dataCriacao).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 relative z-20">
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setEditingSector(s); setIsSectorModalOpen(true); }} 
                        className="p-3 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-blue-50" 
                        title="Editar"
                      >
                        <Edit size={20} className="pointer-events-none" />
                      </button>
                      <button 
                        type="button" 
                        onClickCapture={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm(`Remover setor "${s.nome}" definitivamente?`)) {
                            deleteSector(s.id);
                          }
                        }} 
                        className="p-3 text-red-600 hover:bg-red-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-red-50" 
                        title="Excluir"
                      >
                        <Trash2 size={20} className="pointer-events-none" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {sectors.length === 0 && <div className="col-span-2 text-center py-10 text-slate-400 font-medium italic">Nenhum setor registrado no sistema.</div>}
            </div>
          </div>
        )}

        {activeTab === 'categorias' && isAdmin && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
               <div>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">Categorias de Clientes</h3>
                 <p className="text-sm text-slate-400 font-medium">Gerencie as segmentações para organizar sua base de clientes.</p>
               </div>
               <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:brightness-110 transition-all flex items-center gap-2">
                 <Icon name="plus" /> Cadastrar Nova
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clientCategories.map(cat => (
                <div key={cat.id} className="p-6 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 flex justify-between items-start group hover:bg-white hover:border-primary/30 transition-all shadow-sm">
                  <div className="flex-1 overflow-hidden pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat.cor || 'var(--primary-color)' }}>
                        <Icon name="tag" className="text-sm" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 uppercase tracking-tighter text-lg truncate">{cat.nome}</h4>
                    </div>
                    <p className="text-sm text-slate-400 mt-2 font-medium italic line-clamp-2">{cat.descricao || 'Sem descrição definida.'}</p>
                  </div>
                  <div className="flex gap-2 relative z-20">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setIsCategoryModalOpen(true); }} 
                      className="p-3 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-blue-50" 
                      title="Editar"
                    >
                      <Edit size={20} className="pointer-events-none" />
                    </button>
                    <button 
                      type="button"
                      onClickCapture={(e) => { 
                        e.stopPropagation(); 
                        if (window.confirm(`Remover categoria "${cat.nome}"?`)) {
                          deleteClientCategory(cat.id);
                        }
                      }} 
                      className="p-3 text-red-600 hover:bg-red-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-red-50" 
                      title="Excluir"
                    >
                      <Trash2 size={20} className="pointer-events-none" />
                    </button>
                  </div>
                </div>
              ))}
              {clientCategories.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 italic font-medium">
                  Nenhuma categoria cadastrada.
                </div>
              )}
            </div>
            
            <div className="pt-8 border-t border-slate-100 flex justify-center">
               <button 
                 onClick={() => { 
                   if(confirm('Deseja resetar todas as categorias para o padrão?')) {
                     localStorage.removeItem('senseirm_client_categories');
                     window.location.reload();
                   }
                 }}
                 className="text-[10px] font-black text-slate-300 hover:text-red-400 transition-colors uppercase tracking-widest"
               >
                 Restaurar Padrões do Sistema
               </button>
            </div>
          </div>
        )}

        {activeTab === 'sla' && isAdmin && (
           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10 animate-in slide-in-from-bottom-2">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Parametrização de SLA</h3>
                <p className="text-sm text-slate-400 font-medium">Defina o prazo de entrega (em dias) para cada nível de criticidade.</p>
              </div>
              <form onSubmit={handleSaveSLA} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {Object.keys(slaSettings).map(p => (
                   <div key={p} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{p} Prioridade</label>
                      <div className="relative">
                        <input name={p} type="number" min="0" defaultValue={slaSettings[p as keyof SLASettings]} className="w-full px-6 py-5 rounded-3xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-black text-2xl text-slate-800 focus:border-primary transition-all shadow-inner" />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase">Dias</span>
                      </div>
                   </div>
                 ))}
                 <button type="submit" className="md:col-span-2 py-5 bg-primary text-white rounded-[2rem] font-black text-lg shadow-xl hover:brightness-110 transition-all hover:-translate-y-1">Efetivar Configurações de SLA</button>
              </form>
           </div>
        )}

        {activeTab === 'aparencia' && (
           <div className="bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl space-y-10 animate-in slide-in-from-bottom-2">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Ecossistema Visual</h3>
                <p className="text-sm text-slate-400 font-medium">Personalize a identidade do framework para seu perfil.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                 {THEMES.map(t => (
                   <button key={t.id} onClick={() => updateUser({ ...currentUser!, tema: t.id })} className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 relative group ${currentUser?.tema === t.id ? 'border-primary bg-white/5' : 'border-white/5 hover:border-white/20'}`}>
                     <div className="w-14 h-14 rounded-full shadow-2xl transition-transform group-hover:scale-110" style={{ backgroundColor: t.color, boxShadow: `0 0 20px ${t.color}44` }} />
                     <span className="text-[10px] font-black uppercase text-white tracking-widest mt-2">{t.name}</span>
                     {currentUser?.tema === t.id && <div className="absolute top-3 right-3 text-primary"><Icon name="check-circle" className="text-lg" /></div>}
                   </button>
                 ))}
              </div>
           </div>
        )}
      </div>

      {isSectorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-slate-800">{editingSector ? 'Configurar Setor' : 'Novo Setor'}</h3>
               <button onClick={() => setIsSectorModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            <form onSubmit={handleSaveSector} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Setor</label>
                <input name="nome" required defaultValue={editingSector?.nome} placeholder="Ex: Engenharia, Comercial..." className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável pelo Setor</label>
                <select name="responsavelId" defaultValue={editingSector?.responsavelId} required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary">
                  <option value="">Selecione um gestor...</option>
                  {users.filter(u => u.status === EntityStatus.ACTIVE).map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea name="descricao" rows={3} defaultValue={editingSector?.descricao} placeholder="Breve resumo da responsabilidade da equipe..." className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-medium resize-none focus:border-primary shadow-inner" />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                 <button type="button" onClick={() => setIsSectorModalOpen(false)} className="px-8 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all">Desistir</button>
                 <button type="submit" className="px-10 py-3 rounded-xl bg-primary text-white font-black hover:brightness-110 shadow-lg transition-all">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-slate-800">{editingCategory ? 'Configurar Categoria' : 'Nova Categoria'}</h3>
               <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Categoria</label>
                <input name="nome" required defaultValue={editingCategory?.nome} placeholder="Ex: VIP, Atacadista..." className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor de Identificação</label>
                <input name="cor" type="color" defaultValue={editingCategory?.cor || '#10b981'} className="w-full h-12 p-1 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea name="descricao" rows={3} defaultValue={editingCategory?.descricao} placeholder="Defina o perfil desta categoria..." className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-medium resize-none focus:border-primary shadow-inner" />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                 <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-8 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all">Desistir</button>
                 <button type="submit" className="px-10 py-3 rounded-xl bg-primary text-white font-black hover:brightness-110 shadow-lg transition-all">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditoriaPage = () => {
  const { auditLogs, currentUser } = useApp();
  const filteredLogs = useMemo(() => 
    currentUser?.perfil === UserRole.ADMIN ? auditLogs : auditLogs.filter(log => log.userId === currentUser?.id), 
  [auditLogs, currentUser]);
  
  const isAdmin = currentUser?.perfil === UserRole.ADMIN;

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'UPDATE': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'DELETE': return 'bg-red-50 text-red-600 border-red-100';
      case 'LOGIN': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'SEND': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getModuleLabel = (module: string) => {
    const map: Record<string, string> = {
      'AUTH': 'Autenticação',
      'USUARIOS': 'Usuários',
      'CLIENTES': 'Clientes',
      'TAREFAS': 'Operacional / Tarefas',
      'SETORES': 'Estrutura / Setores',
      'COMUNICACAO': 'Mala Direta',
      'CONFIG': 'Configurações'
    };
    return map[module] || module;
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
           <p className="text-slate-500 font-medium">Log completo de segurança e rastreabilidade de dados.</p>
        </div>
        {isAdmin && <button onClick={() => { if(confirm('Limpar logs permanentemente?')) { auditService.clearLogs(); window.location.reload(); } }} className="text-red-600 bg-red-50 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">Limpar Histórico</button>}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Autor</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface / Módulo</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Operação</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição detalhada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5">
                   <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-700 whitespace-nowrap">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase">
                         {log.userName.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-600">{log.userName}</span>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-primary transition-colors">{getModuleLabel(log.module)}</span>
                </td>
                <td className="px-6 py-5 text-center">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getActionColor(log.action)}`}>
                      {log.action}
                   </span>
                </td>
                <td className="px-6 py-5">
                   <p className="text-xs font-medium text-slate-500 italic max-w-xl leading-relaxed whitespace-pre-wrap">{log.details}</p>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
               <tr>
                 <td colSpan={5} className="p-20 text-center text-slate-300">
                   <Icon name="history" className="text-4xl mb-4 opacity-20" />
                   <p className="font-bold italic">Nenhum registro de auditoria disponível para visualização.</p>
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SobrePage = () => (
  <div className="p-8 flex items-center justify-center min-h-[80vh] animate-in fade-in zoom-in duration-700">
    <div className="max-w-3xl w-full bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-100 text-center space-y-12">
      <div className="inline-block p-10 bg-primary text-white rounded-[3rem] animate-bounce">
        <Icon name="users-cog" className="text-7xl" />
      </div>
      <div>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic">SenseiRM <span className="text-primary font-bold">PRO</span></h1>
        <p className="text-slate-400 text-xl font-medium mt-4">Enterprise CRM Ecosystem v4.3</p>
      </div>
    </div>
  </div>
);

const LoginPage = () => {
  const { login, currentUser } = useApp();
  const [error, setError] = useState('');
  if (currentUser) return <Navigate to="/dashboard" />;
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!login(data.get('email') as string, data.get('pass') as string)) setError('Acesso negado: Credenciais ou conta inativa.');
  };
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="w-full max-w-md bg-white rounded-[4rem] shadow-2xl p-14 z-10 animate-in slide-in-from-bottom-8 duration-700 text-center">
        <div className="inline-block p-7 bg-primary rounded-[2.5rem] mb-10 shadow-primary/20">
          <Icon name="users-cog" className="text-5xl text-white" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-12 italic">SenseiRM <span className="text-primary">PRO</span></h2>
        <form onSubmit={handleLogin} className="space-y-8 text-left">
          <input name="email" type="email" required className="w-full px-7 py-5 rounded-3xl border border-slate-100 bg-slate-50 outline-none focus:border-primary focus:bg-white font-bold transition-all shadow-inner" placeholder="ex: admin@senseirm.com" />
          <input name="pass" type="password" required className="w-full px-7 py-5 rounded-3xl border border-slate-100 bg-slate-50 outline-none focus:border-primary focus:bg-white font-bold transition-all shadow-inner" placeholder="••••••••" />
          {error && <p className="text-red-500 text-xs font-black text-center">{error}</p>}
          <button type="submit" className="w-full py-5 bg-primary text-white rounded-3xl font-black text-xl shadow-2xl hover:brightness-110 transition-all">Autenticar</button>
        </form>
      </div>
    </div>
  );
};

const MailListPage = () => {
  const { clients, addMailHistory, currentUser } = useApp();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [type, setType] = useState<'email' | 'whatsapp'>('email');
  const isAdmin = currentUser?.perfil === UserRole.ADMIN;
  const perms = currentUser?.permissoes.malaDireta;
  const canSend = isAdmin || perms?.incluir;
  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSend) return alert('Restrição de acesso.');
    if (selectedClients.length === 0) return alert('Selecione destinos.');
    const formData = new FormData(e.currentTarget);
    const entry: MailHistory = { 
      id: crypto.randomUUID(), 
      data: new Date().toISOString(), 
      tipo: type, 
      destinatarios: selectedClients, 
      assunto: formData.get('assunto') as string, 
      mensagem: formData.get('mensagem') as string 
    };
    addMailHistory(entry);
    alert('Disparo executado.');
    setSelectedClients([]);
  };
  return (
    <div className="p-8 flex gap-8 animate-in fade-in duration-500">
      <div className="flex-1 bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-200 space-y-10">
         <div className="flex bg-slate-50 p-2 rounded-3xl border border-slate-100 shadow-inner">
            <button onClick={() => setType('email')} className={`flex-1 py-5 rounded-2xl font-black tracking-widest text-sm transition-all ${type === 'email' ? 'bg-white text-primary shadow-xl' : 'text-slate-400'}`}>MAIL SERVICE</button>
            <button onClick={() => setType('whatsapp')} className={`flex-1 py-5 rounded-2xl font-black tracking-widest text-sm transition-all ${type === 'whatsapp' ? 'bg-white text-primary shadow-xl' : 'text-slate-400'}`}>WHATSAPP API</button>
         </div>
         <form onSubmit={handleSend} className="space-y-8">
            <input name="assunto" required className="w-full px-7 py-5 rounded-3xl border border-slate-200 outline-none font-bold focus:border-primary shadow-inner" placeholder="Assunto da Comunicação" />
            <textarea name="mensagem" required rows={8} className="w-full px-7 py-6 rounded-[2.5rem] border border-slate-200 outline-none resize-none font-medium focus:border-primary shadow-inner" placeholder="Mensagem estruturada..." />
            <button type="submit" disabled={!canSend} className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all ${canSend ? 'bg-primary text-white hover:brightness-110' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
               Broadcast ({selectedClients.length})
            </button>
         </form>
      </div>
      <div className="w-96 bg-white p-8 rounded-[3.5rem] border border-slate-200 overflow-y-auto max-h-[800px] shadow-sm">
        <h4 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-xs border-b border-slate-50 pb-4">Destinos</h4>
        <div className="space-y-3">
          {clients.map(c => (
            <label key={c.id} className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${selectedClients.includes(c.id) ? 'bg-primary/5 border-primary/20 shadow-sm' : 'border-slate-50 hover:bg-slate-50'}`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedClients.includes(c.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                {selectedClients.includes(c.id) && <Icon name="check" className="text-white text-[10px]" />}
              </div>
              <input type="checkbox" className="hidden" checked={selectedClients.includes(c.id)} onChange={() => setSelectedClients(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} />
              <div className="overflow-hidden">
                <span className="text-xs font-extrabold text-slate-700 block truncate">{c.nomeRazaoSocial}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const { currentUser } = useApp();
  const location = useLocation();
  const titles: Record<string, string> = {
    '/dashboard': 'Indicadores de Performance',
    '/clientes': 'Gerenciamento de Clientes',
    '/mala-direta': 'Comunicação Estratégica',
    '/tarefas': 'Gerenciamento Operacional',
    '/usuarios': 'Usuários do Sistema',
    '/configuracoes': 'Definições do Sistema',
    '/auditoria': 'Segurança de Dados',
    '/sobre': 'Release Ecosystem'
  };
  if (!currentUser) return <Navigate to="/login" />;
  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Header title={titles[Object.keys(titles).find(k => location.pathname.startsWith(k)) || ''] || 'SenseiRM Framework'} />
        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/mala-direta" element={<MailListPage />} />
            <Route path="/tarefas" element={<TasksPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/sobre" element={<SobrePage />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
};

export default App;