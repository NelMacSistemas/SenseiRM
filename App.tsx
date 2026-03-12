import React, { useState, useEffect, useMemo, createContext, useContext, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { User, Client, ContactPerson, AuditEntry, MailHistory, UserRole, EntityStatus, TaskStatus, TaskPriority, UserPermissions, Permission, TaskType, SLASettings, TaskLog, Sector, Task, ClientCategory, Attachment, Notification } from './types';
import { INITIAL_USER, THEMES } from './constants';
import { auditService } from './services/auditService';

import { 
  Edit, Trash2, Plus, Tag, Building2, Clock, Palette, Shield, Check, 
  Users, LayoutDashboard, Mail, FileText, Settings, ShieldAlert, Info,
  Search, Filter, Download, Upload, LogOut, User as UserIcon, Phone, Mail as MailIcon,
  Globe, MapPin, CreditCard, PieChart, Activity, AlertTriangle, ChevronRight,
  ChevronLeft, MoreVertical, X, Calendar, MessageSquare, ExternalLink, HelpCircle,
  Bell, BellOff, Zap, TrendingUp, Target, Briefcase, Star, Award, CheckCircle,
  AlertCircle, PlayCircle, CheckSquare, ListTodo, UserPlus, FilePlus, Building
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
  'external-link': ExternalLink,
  'bell': Bell,
  'bell-slash': BellOff,
  'zap': Zap,
  'trending-up': TrendingUp,
  'target': Target,
  'briefcase': Briefcase,
  'star': Star,
  'award': Award,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  'play-circle': PlayCircle,
  'check-square': CheckSquare,
  'list-todo': ListTodo,
  'user-plus': UserPlus,
  'file-plus': FilePlus,
  'building-plus': Building
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

const phoneMask = (value: string) => {
  if (!value) return "";
  let v = value.replace(/\D/g, "");
  if (v.startsWith("55")) v = v.substring(2);
  v = v.substring(0, 11);
  if (v.length === 0) return "";
  if (v.length > 10) {
    return `+55 (${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
  } else if (v.length > 6) {
    return `+55 (${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
  } else if (v.length > 2) {
    return `+55 (${v.substring(0, 2)}) ${v.substring(2)}`;
  } else {
    return `+55 (${v}`;
  }
};

const PhoneInput: React.FC<{
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  onChange?: (val: string) => void;
}> = ({ name, defaultValue, required, placeholder, className, onChange }) => {
  const [value, setValue] = useState(phoneMask(defaultValue || ""));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = phoneMask(e.target.value);
    setValue(masked);
    if (onChange) onChange(masked);
  };

  return (
    <input
      name={name}
      required={required}
      value={value}
      onChange={handleChange}
      placeholder={placeholder || "+55 (00) 00000-0000"}
      className={className}
    />
  );
};

const validateCPF = (cpf: string) => {
  const v = cpf.replace(/\D/g, "");
  if (v.length !== 11 || !!v.match(/(\d)\1{10}/)) return false;
  let s = 0;
  for (let i = 1; i <= 9; i++) s += parseInt(v.substring(i - 1, i)) * (11 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(v.substring(9, 10))) return false;
  s = 0;
  for (let i = 1; i <= 10; i++) s += parseInt(v.substring(i - 1, i)) * (12 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(v.substring(10, 11))) return false;
  return true;
};

const validateCNPJ = (cnpj: string) => {
  const v = cnpj.replace(/\D/g, "");
  if (v.length !== 14 || !!v.match(/(\d)\1{13}/)) return false;
  let size = v.length - 2;
  let numbers = v.substring(0, size);
  const digits = v.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  size = size + 1;
  numbers = v.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  return true;
};

const maskCPF = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
  if (v.length <= 9) return v.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4").substring(0, 14);
};

const maskCNPJ = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.replace(/(\d{2})(\d{0,3})/, "$1.$2");
  if (v.length <= 8) return v.replace(/(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
  if (v.length <= 12) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5").substring(0, 18);
};

const maskIE = (v: string) => {
  return v.replace(/\D/g, "");
};

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, l => l.toUpperCase());
};

const maskCEP = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 5) return v;
  return v.replace(/(\d{5})(\d{0,3})/, "$1-$2").substring(0, 9);
};

const formatDocumento = (doc: string) => {
  if (!doc) return "";
  const v = doc.replace(/\D/g, "");
  if (v.length === 11) return maskCPF(v);
  if (v.length === 14) return maskCNPJ(v);
  return doc;
};

const maskTime = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 2) return v;
  return v.replace(/(\d{2})(\d{0,2})/, "$1:$2").substring(0, 5);
};

const RATING_LABELS: Record<number, string> = {
  1: 'Baixo Potencial / Risco Alto',
  2: 'Potencial Médio / Regular',
  3: 'Bom Cliente / Estável',
  4: 'Cliente Prioritário / Potencial Alto',
  5: 'Cliente VIP / Master'
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- Toast & Confirm Contexts ---
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextData | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de um ToastProvider");
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning')
  }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-8 fade-in duration-300
              ${t.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 
                t.type === 'error' ? 'bg-red-50 border-red-100 text-red-900' : 
                t.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900' : 
                'bg-blue-50 border-blue-100 text-blue-900'}`}
          >
            <Icon 
              name={t.type === 'success' ? 'check-circle' : t.type === 'error' ? 'exclamation-circle' : t.type === 'warning' ? 'exclamation-triangle' : 'info-circle'} 
              className={`text-xl ${t.type === 'success' ? 'text-emerald-500' : t.type === 'error' ? 'text-red-500' : t.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}
            />
            <p className="font-bold text-sm">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
              <Icon name="times" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
}

interface ConfirmContextData {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextData | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm deve ser usado dentro de um ConfirmProvider");
  return context;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
  }, []);

  const handleConfirm = () => {
    if (options) {
      options.onConfirm();
      setOptions(null);
    }
  };

  const handleCancel = () => {
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 border-b ${options.isDestructive ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${options.isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Icon name={options.isDestructive ? 'exclamation-triangle' : 'question-circle'} className="text-xl" />
                </div>
                <h3 className={`font-black text-lg ${options.isDestructive ? 'text-red-900' : 'text-slate-900'}`}>
                  {options.title || 'Confirmação'}
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 font-medium leading-relaxed">{options.message}</p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={handleCancel}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {options.cancelLabel || 'Cancelar'}
              </button>
              <button 
                onClick={handleConfirm}
                className={`px-6 py-3 rounded-xl font-black text-white shadow-lg hover:brightness-110 transition-all ${options.isDestructive ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'}`}
              >
                {options.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export interface EmailSettings {
  provider: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

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
  notifications: Notification[];
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
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
  emailSettings: EmailSettings;
  updateEmailSettings: (settings: EmailSettings) => void;
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

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [clientCategories, setClientCategories] = useState<ClientCategory[]>([]);
  const [history, setHistory] = useState<MailHistory[]>([]);
  const [slaSettings, setSlaSettings] = useState<SLASettings>({ Baixa: 15, Média: 7, Alta: 3, Crítica: 1 });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({ provider: 'SMTP', host: '', port: 587, user: '', pass: '', secure: false });
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const socket = io();

    socket.on('connect', () => {
      socket.emit('join', currentUser.id);
    });

    socket.on('data_updated', () => {
      loadData();
    });

    socket.on('notification', (data: { title: string, message: string }) => {
      const newNotification: Notification = {
        id: crypto.randomUUID(),
        title: data.title,
        message: data.message,
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const refreshAudit = async () => {
    const logs = await auditService.getLogs();
    setAuditLogs(logs);
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('senseirm_token');
      if (!token) return;
      
      // Fetch current user to ensure we have the latest permissions and profile
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData);
        localStorage.setItem('senseirm_current_user', JSON.stringify(meData));
      } else if (meRes.status === 401 || meRes.status === 403 || meRes.status === 404) {
        logout();
        return;
      }

      const res = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setClients(data.clients || []);
        setTasks(data.tasks || []);
        setSectors(data.sectors || []);
        setClientCategories(data.clientCategories || []);
        setHistory(data.history || []);
        setSlaSettings(data.slaSettings || { Baixa: 15, Média: 7, Alta: 3, Crítica: 1 });
        setEmailSettings(data.emailSettings || { provider: 'SMTP', host: '', port: 587, user: '', pass: '', secure: false });
        setAuditLogs(data.auditLogs || []);
      } else if (res.status === 401 || res.status === 403) {
        logout();
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('senseirm_token');
    if (token) {
      loadData();
    }
  }, []);

  const apiSync = async (type: string, action: 'ADD' | 'UPDATE' | 'DELETE' | 'SET', payload: any) => {
    try {
      const token = localStorage.getItem('senseirm_token');
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, action, payload })
      });
      if (res.status === 401 || res.status === 403) {
        logout();
      }
    } catch (e) {
      console.error('Failed to sync data', e);
    }
  };

  useEffect(() => {
    const themeId = currentUser?.tema || 'verde';
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--primary-color', theme.color);
    THEMES.forEach(t => document.body.classList.remove(`theme-${t.id}`));
    document.body.classList.add(`theme-${themeId}`);
  }, [currentUser?.tema]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('senseirm_token', data.token);
        localStorage.setItem('senseirm_current_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        await loadData();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error', e);
      return false;
    }
  };

  const logout = () => {
    if (currentUser) auditService.log(currentUser.id, currentUser.nome, 'LOGOUT', 'AUTH', 'Sessão encerrada.');
    setCurrentUser(null);
    localStorage.removeItem('senseirm_current_user');
    localStorage.removeItem('senseirm_token');
  };

  const addUser = (u: User) => {
    setUsers(prev => [...prev, u]);
    apiSync('users', 'ADD', u);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'USUARIOS', `Usuário ${u.nome} criado.`);
    refreshAudit();
  };

  const updateUser = (u: User) => {
    const oldUser = users.find(item => item.id === u.id);
    const diff = oldUser ? getDetailedDiff(oldUser, u, USER_LABELS) : '';
    setUsers(prev => prev.map(item => item.id === u.id ? u : item));
    apiSync('users', 'UPDATE', u);
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
    apiSync('users', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'USUARIOS', `Usuário removido: ${target?.nome} (${target?.email})`);
    refreshAudit();
  };

  const addClient = (c: Client) => {
    setClients(prev => [...prev, c]);
    apiSync('clients', 'ADD', c);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CLIENTES', `Cliente ${c.nomeRazaoSocial} (${c.clientCode}) criado.`);
    refreshAudit();
  };

  const updateClient = (c: Client) => {
    const oldClient = clients.find(item => item.id === c.id);
    const diff = oldClient ? getDetailedDiff(oldClient, c, CLIENT_LABELS) : '';
    setClients(prev => prev.map(item => item.id === c.id ? c : item));
    apiSync('clients', 'UPDATE', c);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CLIENTES', `Cliente ${c.nomeRazaoSocial} atualizado. ${diff}`);
    refreshAudit();
  };

  const deleteClient = (id: string) => {
    const target = clients.find(c => c.id === id);
    setClients(prev => prev.filter(c => c.id !== id));
    apiSync('clients', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CLIENTES', `Cliente removido: ${target?.nomeRazaoSocial} (${target?.clientCode})`);
    refreshAudit();
  };

  const addTask = (t: Task) => {
    setTasks(prev => [...prev, t]);
    apiSync('tasks', 'ADD', t);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'TAREFAS', `Tarefa ${t.taskNumber}: "${t.titulo}" criada.`);
    refreshAudit();
  };

  const updateTask = (t: Task) => {
    const oldTask = tasks.find(item => item.id === t.id);
    const diff = oldTask ? getDetailedDiff(oldTask, t, TASK_LABELS) : '';
    setTasks(prev => prev.map(item => item.id === t.id ? t : item));
    apiSync('tasks', 'UPDATE', t);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'TAREFAS', `Tarefa ${t.taskNumber} alterada. ${diff}`);
    refreshAudit();
  };

  const deleteTask = (id: string) => {
    const target = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    apiSync('tasks', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'TAREFAS', `Tarefa excluída: ${target?.taskNumber} - ${target?.titulo}`);
    refreshAudit();
  };

  const addSector = (s: Sector) => {
    setSectors(prev => [...prev, s]);
    apiSync('sectors', 'ADD', s);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'SETORES', `Setor "${s.nome}" criado.`);
    refreshAudit();
  };

  const updateSector = (s: Sector) => {
    const oldSec = sectors.find(item => item.id === s.id);
    const diff = oldSec ? getDetailedDiff(oldSec, s, { nome: 'Nome', descricao: 'Descrição', responsavelId: 'Gestor' }) : '';
    setSectors(prev => prev.map(item => item.id === s.id ? s : item));
    apiSync('sectors', 'UPDATE', s);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'SETORES', `Setor "${s.nome}" atualizado. ${diff}`);
    refreshAudit();
  };

  const deleteSector = (id: string) => {
    console.log('Deleting sector:', id);
    const target = sectors.find(s => s.id === id);
    if (!target) return;

    setSectors(prev => prev.filter(s => s.id !== id));
    apiSync('sectors', 'DELETE', { id });
    setTasks(prev => prev.map(task => task.setorId === id ? { ...task, setorId: '' } : task));
    
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'SETORES', `Setor "${target.nome}" removido.`);
    refreshAudit();
  };

  const addClientCategory = (c: ClientCategory) => {
    setClientCategories(prev => [...prev, c]);
    apiSync('clientCategories', 'ADD', c);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CONFIG', `Categoria "${c.nome}" criada.`);
    refreshAudit();
  };

  const updateClientCategory = (c: ClientCategory) => {
    setClientCategories(prevCategories => {
      const old = prevCategories.find(item => item.id === c.id);
      if (old && old.nome !== c.nome) {
        setClients(prevClients => {
          const newClients = prevClients.map(client => 
            client.categoria === old.nome ? { ...client, categoria: c.nome } : client
          );
          apiSync('clients', 'SET', newClients);
          return newClients;
        });
      }
      
      apiSync('clientCategories', 'UPDATE', c);
      auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Categoria "${c.nome}" atualizada.`);
      refreshAudit();
      
      return prevCategories.map(item => item.id === c.id ? c : item);
    });
  };

  const deleteClientCategory = (id: string) => {
    console.log('Deleting category:', id);
    const target = clientCategories.find(c => c.id === id);
    if (!target) return;

    setClientCategories(prev => prev.filter(c => c.id !== id));
    apiSync('clientCategories', 'DELETE', { id });
    setClients(prev => {
      const newClients = prev.map(client => client.categoria === target.nome ? { ...client, categoria: '' } : client);
      apiSync('clients', 'SET', newClients);
      return newClients;
    });
    
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CONFIG', `Categoria "${target.nome}" removida.`);
    refreshAudit();
  };

  const addMailHistory = (h: MailHistory) => {
    setHistory(prev => [h, ...prev]);
    apiSync('history', 'ADD', h);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'SEND', 'COMUNICACAO', `Envio em massa (${h.tipo}) para ${h.destinatarios.length} destinos. Assunto: ${h.assunto}`);
    refreshAudit();
  };

  const updateSLASettings = (settings: SLASettings) => {
    const diff = getDetailedDiff(slaSettings, settings, { Baixa: 'SLA Baixa', Média: 'SLA Média', Alta: 'SLA Alta', Crítica: 'SLA Crítica' });
    setSlaSettings(settings);
    apiSync('slaSettings', 'SET', settings);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Prazos de SLA redefinidos. ${diff}`);
    refreshAudit();
  };

  const updateEmailSettings = (settings: EmailSettings) => {
    setEmailSettings(settings);
    apiSync('emailSettings', 'SET', settings);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Configurações de E-mail atualizadas.`);
    refreshAudit();
  };

  const contextValue = useMemo(() => ({
    currentUser, users, clients, tasks, sectors, auditLogs, history, slaSettings, emailSettings, clientCategories, notifications,
    markNotificationAsRead, clearNotifications,
    login, logout, updateUser, addUser, deleteUser,
    addClient, updateClient, deleteClient,
    addTask, updateTask, deleteTask, 
    addSector, updateSector, deleteSector,
    addClientCategory, updateClientCategory, deleteClientCategory,
    addMailHistory, updateSLASettings, updateEmailSettings
  }), [
    currentUser, users, clients, tasks, sectors, auditLogs, history, slaSettings, emailSettings, clientCategories, notifications
  ]);

  return (
    <AppContext.Provider value={contextValue}>
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

const AttachmentsManager = ({ attachments = [], onUpdate, canEdit }: { attachments?: Attachment[], onUpdate: (atts: Attachment[]) => void, canEdit: boolean }) => {
  const { currentUser } = useApp();
  const { error } = useToast();
  const { confirm } = useConfirm();
  const [uploading, setUploading] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('senseirm_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          name: data.name,
          url: data.url,
          size: data.size,
          type: data.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser?.nome || 'Sistema'
        };
        onUpdate([...attachments, newAttachment]);
      } else {
        error('Erro ao fazer upload do arquivo.');
      }
    } catch (err) {
      console.error('Upload error', err);
      error('Erro ao fazer upload do arquivo.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleRemove = (id: string) => {
    confirm({
      title: 'Remover Anexo',
      message: 'Deseja realmente remover este anexo?',
      confirmLabel: 'Remover',
      isDestructive: true,
      onConfirm: () => {
        onUpdate(attachments.filter(a => a.id !== id));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Anexos e Documentos</h4>
        {canEdit && (
          <div>
            <input type="file" id="fileUpload" className="hidden" onChange={handleFileChange} disabled={uploading} />
            <label htmlFor="fileUpload" className={`cursor-pointer px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 ${uploading ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-primary border-primary hover:bg-primary hover:text-white'}`}>
              <Icon name={uploading ? 'spinner' : 'upload'} className={uploading ? 'animate-spin' : ''} />
              {uploading ? 'Enviando...' : 'Anexar Arquivo'}
            </label>
          </div>
        )}
      </div>

      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attachments.map(att => (
            <div key={att.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Icon name={att.type.includes('image') ? 'image' : att.type.includes('pdf') ? 'file-pdf' : 'file-alt'} className="text-xl" />
                </div>
                <div className="min-w-0">
                  <a href={att.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-700 hover:text-primary truncate block" title={att.name}>
                    {att.name}
                  </a>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {formatSize(att.size)} • {new Date(att.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {canEdit && (
                <button type="button" onClick={() => handleRemove(att.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <Icon name="trash" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
          <Icon name="folder-open" className="text-3xl text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum anexo encontrado</p>
        </div>
      )}
    </div>
  );
};

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

const NotificationsPopover = () => {
  const { notifications, markNotificationAsRead, clearNotifications } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
      >
        <Icon name="bell" className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Notificações</h3>
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="text-[10px] text-slate-400 hover:text-red-500 uppercase font-bold tracking-widest transition-colors">
                  Limpar
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Icon name="bell-slash" className="text-3xl mb-2 opacity-20 mx-auto" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${!n.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-xs font-bold ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</h4>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{n.message}</p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Header = ({ title }: { title: string }) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
    <div className="flex items-center gap-4">
      <NotificationsPopover />
    </div>
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
  const navigate = useNavigate();

  const isAdmin = currentUser?.perfil === UserRole.ADMIN;
  const perms = currentUser?.permissoes;

  // Membros calculados para KPIs
  const kpis = useMemo(() => {
    // Escopo de tarefas
    const scopeTasks = isAdmin ? tasks : tasks.filter(t => t.responsavelId === currentUser?.id);
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
  }, [clients, tasks, users, currentUser, isAdmin]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
      
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Olá, {currentUser?.nome.split(' ')[0]} 👋</h2>
          <p className="text-slate-500 text-sm mt-1">Aqui está o resumo das suas operações hoje.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {(isAdmin || perms?.clientes?.incluir) && (
            <button 
              onClick={() => navigate('/clientes', { state: { openModal: true } })}
              className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
            >
              <Icon name="building-plus" className="w-4 h-4" />
              Novo Cliente
            </button>
          )}
          {(isAdmin || perms?.tarefas?.incluir) && (
            <button 
              onClick={() => navigate('/tarefas', { state: { openModal: true } })}
              className="flex items-center gap-2 bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
            >
              <Icon name="file-plus" className="w-4 h-4" />
              Nova Tarefa
            </button>
          )}
          {(isAdmin || perms?.malaDireta?.incluir) && (
            <button 
              onClick={() => navigate('/mala-direta')}
              className="flex items-center gap-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
            >
              <Icon name="mala-direta" className="w-4 h-4" />
              Mala Direta
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => navigate('/usuarios', { state: { openModal: true } })}
              className="flex items-center gap-2 bg-purple-500/10 text-purple-600 hover:bg-purple-600 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
            >
              <Icon name="user-plus" className="w-4 h-4" />
              Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* OPERACIONAL (Tarefas) - Ocupa 8 colunas */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link to="/tarefas" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <Icon name="check-circle" className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-800">{kpis.tasksCompleted}</span>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Concluídas</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Tarefas finalizadas com sucesso</p>
            </div>
          </Link>

          <Link to="/tarefas" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  <Icon name="play-circle" className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-800">{kpis.tasksInProgress}</span>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Em Andamento</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Demandas em execução ativa</p>
            </div>
          </Link>

          <Link to="/tarefas" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                  <Icon name="alert-circle" className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-red-600">{kpis.tasksOverdue}</span>
              </div>
              <p className="text-xs font-black text-red-500 uppercase tracking-widest">Atrasadas</p>
              <p className="text-[10px] text-red-400 mt-1 font-bold">Atenção urgente necessária</p>
            </div>
          </Link>
        </div>

        {/* CLIENTES OVERVIEW - Ocupa 4 colunas */}
        <div className="md:col-span-4 bg-primary text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Icon name="briefcase" className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Base de Clientes</h3>
            </div>
            
            <div className="mb-6">
              <span className="text-5xl font-black tracking-tighter">{kpis.totalClients}</span>
              <span className="text-primary-foreground/70 text-sm ml-2 font-medium">total</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary-foreground/80 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Ativos</span>
                <span className="font-bold">{kpis.clientsActive}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary-foreground/80 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/40" /> Inativos</span>
                <span className="font-bold">{kpis.clientsInactive}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary-foreground/80 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400" /> Bloqueados</span>
                <span className="font-bold">{kpis.clientsBlocked}</span>
              </div>
            </div>
          </div>
          
          <Link to="/clientes" className="relative z-10 mt-6 w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-center text-xs font-bold uppercase tracking-widest transition-colors">
            Ver Todos
          </Link>
        </div>

        {/* RANKING DE CLIENTES - Ocupa 8 colunas */}
        <div className="md:col-span-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                <Icon name="award" className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Top Clientes (Avaliação)</h3>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">Média: <span className="text-amber-500">{kpis.avgRating}</span> <Icon name="star" className="w-3 h-3 inline pb-0.5" /></span>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-4">
            {kpis.rankedClients.map((c, idx) => (
              <Link to="/clientes" key={c.id} className="bg-slate-50 hover:bg-amber-50 p-4 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all flex flex-col items-center text-center relative group">
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-sm z-10">
                  {idx + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Icon name="building" className="text-sm text-slate-600" />
                </div>
                <p className="text-[10px] font-black text-slate-800 line-clamp-2 h-8 flex items-center justify-center mb-2" title={c.nomeRazaoSocial}>
                  {c.nomeRazaoSocial}
                </p>
                <div className="flex gap-0.5 text-amber-400">
                  {[1,2,3,4,5].map(i => <Icon key={i} name="star" className={`w-3 h-3 ${i <= (c.avaliacaoInterna || 0) ? 'fill-current' : 'opacity-30'}`} />)}
                </div>
              </Link>
            ))}
            {kpis.rankedClients.length === 0 && (
              <div className="col-span-full flex items-center justify-center text-slate-400 italic font-medium text-sm">
                Nenhuma avaliação registrada para compor o ranking.
              </div>
            )}
          </div>
        </div>

        {/* USUÁRIOS OVERVIEW - Ocupa 4 colunas */}
        <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
              <Icon name="users" className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Equipe</h3>
          </div>

          <div className="flex justify-around items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativos</p>
              <p className="text-3xl font-black text-emerald-500">{kpis.usersActive}</p>
            </div>
            <div className="w-[1px] h-12 bg-slate-200" />
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inativos</p>
              <p className="text-3xl font-black text-slate-400">{kpis.usersInactive}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-purple-50/50 rounded-xl border border-purple-100/50">
              <span className="text-xs font-bold text-purple-700 flex items-center gap-2">
                <Icon name="shield-alt" className="w-4 h-4" /> Administradores
              </span>
              <span className="font-black text-purple-700">{kpis.usersAdmin}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
              <span className="text-xs font-bold text-indigo-700 flex items-center gap-2">
                <Icon name="user" className="w-4 h-4" /> Usuários Padrão
              </span>
              <span className="font-black text-indigo-700">{kpis.usersStandard}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const ClientsPage = () => {
  const { clients, addClient, updateClient, deleteClient, currentUser, clientCategories } = useApp();
  const { confirm } = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'id' | 'end' | 'cont' | 'fin' | 'crm' | 'anexos'>('id');
  const [contactPeople, setContactPeople] = useState<ContactPerson[]>([]);
  const [tipoPessoa, setTipoPessoa] = useState<'Física' | 'Jurídica'>('Jurídica');

  useEffect(() => {
    if (location.state?.openModal) {
      setEditingClient(null);
      setActiveTab('id');
      setIsModalOpen(true);
      // Clear state to prevent reopening on reload
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Controlled Identity states (Fixes the bug of not showing data on edit)
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [documento, setDocumento] = useState('');
  const [isDocumentoValid, setIsDocumentoValid] = useState(true);
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [status, setStatus] = useState<EntityStatus>(EntityStatus.ACTIVE);
  const [chavePix, setChavePix] = useState('');
  const [tipoChavePix, setTipoChavePix] = useState<'CPF/CNPJ' | 'E-mail' | 'Telefone' | 'Aleatória'>('CPF/CNPJ');

  // Address lookup states
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

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
      setChavePix(editingClient.chavePix || '');
      setTipoChavePix(editingClient.tipoChavePix || 'CPF/CNPJ');
      
      setCep(editingClient.cep || '');
      setLogradouro(editingClient.logradouro || '');
      setBairro(editingClient.bairro || '');
      setCidade(editingClient.cidade || '');
      setUf(editingClient.uf || '');
      setAttachments(editingClient.attachments || []);
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
      setAttachments([]);
    }
  }, [editingClient, isModalOpen]);

  const handleDocumentoBlur = async () => {
    if (tipoPessoa !== 'Jurídica') return;
    const cleanCnpj = documento.replace(/\D/g, '');
    if (cleanCnpj.length === 14) {
      setLoadingCnpj(true);
      try {
        // Try publica.cnpj.ws first for Inscrição Estadual
        const resPublica = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
        if (resPublica.ok) {
          const data = await resPublica.json();
          setNomeRazaoSocial(data.razao_social || '');
          setNomeFantasia(data.estabelecimento?.nome_fantasia || '');
          const ie = data.estabelecimento?.inscricoes_estaduais?.[0]?.inscricao_estadual;
          setInscricaoEstadual(ie || '');
        } else {
          // Fallback to BrasilAPI if rate limited
          const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
          if (resBrasil.ok) {
            const data = await resBrasil.json();
            setNomeRazaoSocial(data.razao_social || '');
            setNomeFantasia(data.nome_fantasia || '');
            setInscricaoEstadual('');
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CNPJ", err);
      } finally {
        setLoadingCnpj(false);
      }
    }
  };

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
    
    // Manual validation for all tabs
    const form = e.currentTarget;
    const inputs = Array.from(form.querySelectorAll('input, select, textarea')) as HTMLInputElement[];
    const firstInvalid = inputs.find(input => !input.checkValidity());
    
    if (firstInvalid) {
      // Find which tab contains the invalid input
      const tabContainer = firstInvalid.closest('[data-tab-id]');
      if (tabContainer) {
        const tabId = tabContainer.getAttribute('data-tab-id') as any;
        setActiveTab(tabId);
        // Need to wait for React to render the tab before reporting validity
        setTimeout(() => {
          firstInvalid.reportValidity();
        }, 100);
      } else {
        firstInvalid.reportValidity();
      }
      return;
    }

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
      chavePix: chavePix,
      tipoChavePix: tipoChavePix,

      categoria: data.categoria,
      origem: data.origem,
      observacoes: data.observacoes,

      situacao: data.situacao || 'Ativo',
      motivoBloqueio: data.motivoBloqueio,
      dataUltimaVenda: data.dataUltimaVenda,
      avaliacaoInterna: Number(data.avaliacaoInterna) || 0,
      attachments: attachments
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

  const clientTabs = [
    { id: 'id', label: 'Identificação', icon: 'id-card' },
    { id: 'end', label: 'Endereço', icon: 'map-marker-alt' },
    { id: 'cont', label: 'Contatos', icon: 'phone' },
    { id: 'fin', label: 'Financeiro', icon: 'wallet' },
    { id: 'crm', label: 'CRM & Gov', icon: 'shield-alt' },
    { id: 'anexos', label: 'Anexos', icon: 'paperclip' }
  ] as const;

  const currentTabIndex = clientTabs.findIndex(t => t.id === activeTab);

  const handleNextTab = () => {
    const form = document.getElementById('clientForm') as HTMLFormElement;
    if (form) {
      const currentTabContainer = form.querySelector(`[data-tab-id="${activeTab}"]`);
      if (currentTabContainer) {
        const inputs = Array.from(currentTabContainer.querySelectorAll('input, select, textarea')) as HTMLInputElement[];
        const firstInvalid = inputs.find(input => !input.checkValidity());
        if (firstInvalid) {
          firstInvalid.reportValidity();
          return;
        }
      }
    }

    if (currentTabIndex < clientTabs.length - 1) {
      setActiveTab(clientTabs[currentTabIndex + 1].id);
    }
  };

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(clientTabs[currentTabIndex - 1].id);
    }
  };

  const TabButton = ({ id, label, icon, index }: { key?: string, id: any, label: string, icon: string, index: number }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 border-b-4 transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-400 hover:text-slate-600'} ${index < currentTabIndex ? 'text-slate-600' : ''}`}
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${activeTab === id ? 'bg-primary text-white' : (index < currentTabIndex ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400')}`}>
        {index < currentTabIndex ? <Icon name="check" /> : index + 1}
      </div>
      <Icon name={icon} className={activeTab === id ? 'text-primary' : ''} /> {label}
    </button>
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
           <p className="text-slate-500 font-medium">Gestão avançada da carteira de clientes e parceiros.</p>
        </div>
        {canInclude && (
          <button onClick={() => { setEditingClient(null); setActiveTab('id'); setIsModalOpen(true); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center gap-2 transition-all">
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
                <td className="px-6 py-5 text-slate-600 font-medium">{formatDocumento(c.documento)}</td>
                <td className="px-6 py-5 text-slate-500 text-sm font-medium">{c.cidade ? `${c.cidade}/${c.uf}` : 'Não inf.'}</td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${c.status === EntityStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit && <button onClick={() => { setEditingClient(c); setActiveTab('id'); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Icon name="edit" /></button>}
                    {canDelete && <button onClick={() => { confirm({ title: 'Excluir Cliente', message: 'Excluir registro definitivamente?', onConfirm: () => deleteClient(c.id) }); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icon name="trash" /></button>}
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
               {clientTabs.map((tab, index) => (
                 <TabButton key={tab.id} id={tab.id} label={tab.label} icon={tab.icon} index={index} />
               ))}
            </div>

            <form 
              id="clientForm" 
              key={editingClient?.id || 'new'} 
              onSubmit={handleSubmit} 
              noValidate
              className="flex-1 overflow-y-auto p-10 bg-white"
            >
               <div data-tab-id="id" className={activeTab === 'id' ? 'block' : 'hidden'}>
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
                            onChange={(e) => setNomeRazaoSocial(capitalizeWords(e.target.value))}
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
                            onChange={(e) => setNomeFantasia(capitalizeWords(e.target.value))}
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                           {tipoPessoa === 'Jurídica' ? 'CNPJ' : 'CPF'}
                           {loadingCnpj && <Icon name="spinner" className="animate-spin text-primary" />}
                         </label>
                         <input 
                            name="documento" 
                            required 
                            value={documento} 
                            onChange={(e) => {
                               const val = e.target.value;
                               const masked = tipoPessoa === 'Jurídica' ? maskCNPJ(val) : maskCPF(val);
                               setDocumento(masked);
                               const raw = val.replace(/\D/g, "");
                               if (raw.length > 0) {
                                 setIsDocumentoValid(tipoPessoa === 'Jurídica' ? validateCNPJ(masked) : validateCPF(masked));
                               } else {
                                 setIsDocumentoValid(true);
                               }
                             }}
                            onBlur={handleDocumentoBlur}
                            placeholder={tipoPessoa === 'Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'} 
                            className={`w-full px-6 py-4 rounded-2xl border font-bold outline-none focus:border-primary transition-colors ${!isDocumentoValid && documento.length > 0 ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-100 bg-slate-50'}`} 
                         />
                         {!isDocumentoValid && documento.length > 0 && (
                           <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter ml-2 animate-pulse">Documento Inválido</span>
                         )}
                       </div>
                       {tipoPessoa === 'Jurídica' && (
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inscrição Estadual</label>
                            <input 
                              name="inscricaoEstadual" 
                              value={inscricaoEstadual} 
                              onChange={(e) => setInscricaoEstadual(maskIE(e.target.value))}
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
               </div>

               <div data-tab-id="end" className={activeTab === 'end' ? 'block' : 'hidden'}>
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                           CEP {loadingCep && <Icon name="spinner" className="animate-spin text-primary" />}
                         </label>
                         <input 
                           name="cep" 
                           value={cep} 
                           onChange={(e) => setCep(maskCEP(e.target.value))}
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
               </div>

               <div data-tab-id="cont" className={activeTab === 'cont' ? 'block' : 'hidden'}>
                 <div className="space-y-10 animate-in slide-in-from-left-4 duration-300">
                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Canais de Contato Institucional</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal</label>
                             <PhoneInput name="telefonePrincipal" required defaultValue={editingClient?.telefonePrincipal} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Secundário</label>
                             <PhoneInput name="telefoneSecundario" defaultValue={editingClient?.telefoneSecundario} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site / URL</label>
                             <input 
                               name="site" 
                               defaultValue={editingClient?.site} 
                               onBlur={(e) => {
                                 if (e.target.value && !e.target.value.startsWith('http')) {
                                   e.target.value = `https://${e.target.value}`;
                                 }
                               }}
                               placeholder="https://..." 
                               className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                             />
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
                                   <input value={phoneMask(person.telefone)} onChange={(e) => updateContactPerson(person.id, 'telefone', phoneMask(e.target.value))} placeholder="+55 (00) 00000-0000" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none text-sm font-bold" />
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
               </div>

               <div data-tab-id="fin" className={activeTab === 'fin' ? 'block' : 'hidden'}>
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
                                <select 
                                  name="tipoChavePix" 
                                  value={tipoChavePix}
                                  onChange={(e) => {
                                    setTipoChavePix(e.target.value as any);
                                    setChavePix('');
                                  }}
                                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary"
                                >
                                   <option value="CPF/CNPJ">CPF/CNPJ</option>
                                   <option value="E-mail">E-mail</option>
                                   <option value="Telefone">Telefone</option>
                                   <option value="Aleatória">Chave Aleatória</option>
                                </select>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Chave PIX</label>
                                <input 
                                  name="chavePix" 
                                  value={chavePix}
                                  onChange={(e) => {
                                    let val = e.target.value;
                                    if (tipoChavePix === 'CPF/CNPJ') {
                                      val = val.replace(/\D/g, "");
                                      if (val.length <= 11) val = maskCPF(val);
                                      else val = maskCNPJ(val);
                                    } else if (tipoChavePix === 'Telefone') {
                                      val = phoneMask(val);
                                    }
                                    setChavePix(val);
                                  }}
                                  placeholder="Insira a chave registrada" 
                                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary shadow-inner" 
                                />
                             </div>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex gap-4 items-center">
                             <div className="bg-emerald-500 text-white p-3 rounded-xl"><Icon name="info-circle" /></div>
                             <p className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase tracking-tight">Utilize estas informações preferencialmente para emissão de notas fiscais e conciliação bancária automatizada.</p>
                          </div>
                       </div>
                    </div>
                 </div>
               </div>

               <div data-tab-id="crm" className={activeTab === 'crm' ? 'block' : 'hidden'}>
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
                       <div className="space-y-1">
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
               </div>

               <div data-tab-id="anexos" className={activeTab === 'anexos' ? 'block' : 'hidden'}>
                 <div className="space-y-10 animate-in slide-in-from-left-4 duration-300">
                    <section className="space-y-6">
                      <AttachmentsManager 
                        attachments={attachments} 
                        onUpdate={setAttachments} 
                        canEdit={canEdit} 
                      />
                    </section>
                 </div>
               </div>
            </form>

            <div className="p-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-white transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
                <div className="flex gap-4">
                  {currentTabIndex > 0 && (
                    <button type="button" onClick={handlePrevTab} className="px-10 py-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-white transition-all uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <Icon name="arrow-left" /> Anterior
                    </button>
                  )}
                  {currentTabIndex < clientTabs.length - 1 ? (
                    <button type="button" onClick={handleNextTab} className="px-14 py-4 rounded-2xl bg-primary text-white font-black shadow-xl hover:brightness-110 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2">
                      Próximo <Icon name="arrow-right" />
                    </button>
                  ) : (
                    <button type="submit" form="clientForm" className="px-14 py-4 rounded-2xl bg-emerald-500 text-white font-black shadow-xl hover:brightness-110 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <Icon name="check" /> Confirmar
                    </button>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.OPEN: return 'bg-blue-50 text-blue-600 border-blue-200';
    case TaskStatus.ANALYSIS: return 'bg-purple-50 text-purple-600 border-purple-200';
    case TaskStatus.EXECUTION: return 'bg-amber-50 text-amber-600 border-amber-200';
    case TaskStatus.WAITING_THIRD: return 'bg-orange-50 text-orange-600 border-orange-200';
    case TaskStatus.WAITING_USER: return 'bg-orange-50 text-orange-600 border-orange-200';
    case TaskStatus.COMPLETED: return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    case TaskStatus.CANCELED: return 'bg-red-50 text-red-600 border-red-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.OPEN: return 'inbox';
    case TaskStatus.ANALYSIS: return 'search';
    case TaskStatus.EXECUTION: return 'play';
    case TaskStatus.WAITING_THIRD: return 'clock';
    case TaskStatus.WAITING_USER: return 'user';
    case TaskStatus.COMPLETED: return 'check-circle';
    case TaskStatus.CANCELED: return 'x-circle';
    default: return 'circle';
  }
};

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.CRITICAL: return 'bg-red-50 text-red-600 border-red-200';
    case TaskPriority.HIGH: return 'bg-orange-50 text-orange-600 border-orange-200';
    case TaskPriority.MEDIUM: return 'bg-blue-50 text-blue-600 border-blue-200';
    case TaskPriority.LOW: return 'bg-slate-50 text-slate-600 border-slate-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const getPriorityIcon = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.CRITICAL: return 'alert-triangle';
    case TaskPriority.HIGH: return 'arrow-up';
    case TaskPriority.MEDIUM: return 'minus';
    case TaskPriority.LOW: return 'arrow-down';
    default: return 'minus';
  }
};

const TasksPage = () => {
  const { tasks, addTask, updateTask, deleteTask, users, currentUser, slaSettings, sectors } = useApp();
  const { confirm } = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [showLogInput, setShowLogInput] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [draggedOverStatus, setDraggedOverStatus] = useState<TaskStatus | null>(null);

  useEffect(() => {
    if (location.state?.openModal) {
      setEditingTask(null);
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  
  // Local Form States
  const [startDate, setStartDate] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(TaskStatus.OPEN);
  const [conclusaoReal, setConclusaoReal] = useState<string>('');
  const [tempoGasto, setTempoGasto] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  const actionRef = useRef<HTMLTextAreaElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');

  const isAdmin = currentUser?.perfil === UserRole.ADMIN;
  const perms = currentUser?.permissoes.tarefas;

  const canEdit = isAdmin || perms?.editar;
  const canDelete = isAdmin || perms?.excluir;
  const canInclude = isAdmin || perms?.incluir;

  const activeUsers = useMemo(() => users.filter(u => u.status === EntityStatus.ACTIVE), [users]);

  const filteredTasks = useMemo(() => {
    let baseTasks = isAdmin ? tasks : tasks.filter(t => t.responsavelId === currentUser?.id);
    
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      baseTasks = baseTasks.filter(t => 
        t.titulo.toLowerCase().includes(lowerSearch) || 
        t.taskNumber.toLowerCase().includes(lowerSearch) ||
        t.descricao.toLowerCase().includes(lowerSearch)
      );
    }
    
    if (filterPriority !== 'all') {
      baseTasks = baseTasks.filter(t => t.prioridade === filterPriority);
    }
    
    return baseTasks;
  }, [tasks, currentUser, isAdmin, debouncedSearchTerm, filterPriority]);

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
      tempoGasto: tempoGasto,
      attachments: attachments
    };

    const logs: TaskLog[] = [...(editingTask?.logs || [])];
    
    if (editingTask) {
      const details = getChangeDetails(editingTask, newTaskPartial);
      if (details.length > 0) {
        const justificativa = (needsLogEntry && actionRef.current?.value) ? actionRef.current.value : 'Ajuste de parâmetros técnicos.';
        
        logs.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          fromStatus: editingTask.status,
          toStatus: currentStatus,
          action: `Atualização de tarefa`,
          changes: details,
          justification: justificativa,
          userId: currentUser?.id || 'sys',
          userName: currentUser?.nome || 'Sistema'
        });
      }
    } else {
      logs.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        fromStatus: currentStatus,
        toStatus: currentStatus,
        action: `Criação da tarefa`,
        changes: ['Tarefa inicializada com os dados básicos.'],
        justification: 'Criação inicial',
        userId: currentUser?.id || 'sys',
        userName: currentUser?.nome || 'Sistema'
      });
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
    setTempoGasto(t?.tempoGasto || '');
    setAttachments(t?.attachments || []);
    setIsModalOpen(true);
  };

  const openHistoryModal = (t: Task) => {
    setHistoryTask(t);
    setIsHistoryModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedOverStatus !== status) {
      setDraggedOverStatus(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDraggedOverStatus(null);
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== status && canEdit) {
      const logs = [...(task.logs || [])];
      logs.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        fromStatus: task.status,
        toStatus: status,
        action: `Movido via Kanban`,
        changes: [`Status: "${task.status}" → "${status}"`],
        justification: 'Movimentação rápida pelo quadro Kanban',
        userId: currentUser?.id || 'sys',
        userName: currentUser?.nome || 'Sistema'
      });
      
      let dataConclusaoReal = task.dataConclusaoReal;
      if (status === TaskStatus.COMPLETED && !dataConclusaoReal) {
        dataConclusaoReal = new Date().toISOString().split('T')[0];
      }

      updateTask({ ...task, status, dataConclusaoReal, logs });
    }
  };

  const renderTaskCard = (t: Task, isKanban: boolean = false) => {
    const owner = users.find(u => u.id === t.responsavelId);
    const progress = calculateProgress(t);
    const isOverdue = t.dataVencimento && new Date(t.dataVencimento) < new Date() && t.status !== TaskStatus.COMPLETED;
    
    if (isKanban) {
      return (
        <div 
          key={t.id} 
          draggable={canEdit}
          onDragStart={(e) => handleDragStart(e, t.id)}
          className="bg-white p-4 rounded-3xl border border-slate-200 hover:shadow-lg transition-all relative group cursor-grab active:cursor-grabbing mb-3"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-2 items-center">
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border flex items-center gap-1 ${getPriorityColor(t.prioridade)}`}>
                <Icon name={getPriorityIcon(t.prioridade)} className="w-3 h-3" />
                {t.prioridade}
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.taskNumber}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               {canEdit && <button onClick={() => openTaskModal(t)} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><Icon name="edit" className="w-4 h-4" /></button>}
            </div>
          </div>
          
          <h4 className="text-sm font-extrabold text-slate-800 leading-tight mb-3 line-clamp-2">{t.titulo}</h4>
          
          <div className="space-y-3">
             <ProgressBar progress={progress} />
             
             <div className="flex justify-between items-end pt-1">
                <div className="flex flex-col gap-1.5">
                  {t.dataVencimento && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                      <Icon name="calendar" className="w-3 h-3" />
                      {new Date(t.dataVencimento).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Icon name="paperclip" className="w-3 h-3" />
                    {t.attachments?.length || 0}
                  </div>
                </div>
                <img src={owner?.foto || 'https://picsum.photos/seed/default/40'} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" title={owner?.nome} />
             </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={t.id} 
        className="bg-white p-6 rounded-[2.5rem] border border-slate-200 hover:shadow-xl transition-all relative overflow-hidden group"
      >
        <div className={`absolute left-0 top-0 bottom-0 w-2 ${t.prioridade === TaskPriority.CRITICAL ? 'bg-red-600' : t.prioridade === TaskPriority.HIGH ? 'bg-orange-500' : 'bg-blue-400'}`} />
        <div className="flex justify-between items-start pl-3 mb-4">
          <div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.taskNumber} • {t.tipo}</span>
             <h4 className="text-lg font-extrabold text-slate-800 leading-tight mt-1">{t.titulo}</h4>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => openHistoryModal(t)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl" title="Ver Histórico"><Icon name="history" /></button>
             {canEdit && <button onClick={() => openTaskModal(t)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl" title="Editar"><Icon name="edit" /></button>}
             {canDelete && <button onClick={() => { confirm({ title: 'Excluir Tarefa', message: 'Remover?', onConfirm: () => deleteTask(t.id) }); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl" title="Excluir"><Icon name="trash" /></button>}
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
  };

  return (
    <div className="p-8 space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="text-slate-500 font-medium">Ciclo de vida operacional das tarefas.</p>
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')} 
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lista
            </button>
            <button 
              onClick={() => setViewMode('kanban')} 
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Kanban
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar tarefas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm w-64"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-slate-600 appearance-none cursor-pointer"
          >
            <option value="all">Todas as Prioridades</option>
            {Object.values(TaskPriority).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {canInclude && (
            <button onClick={() => openTaskModal(null)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center gap-2 transition-all">
              <Icon name="plus" /> Adicionar Atividade
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredTasks.map(t => renderTaskCard(t, false))}
          {filteredTasks.length === 0 && <div className="col-span-2 py-20 text-center text-slate-400 font-medium">Nenhuma tarefa encontrada no seu escopo.</div>}
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4 flex-1 items-start min-h-[600px] snap-x">
          {Object.values(TaskStatus).map(status => {
            const statusTasks = filteredTasks.filter(t => t.status === status);
            const colorClass = getStatusColor(status);
            const iconName = getStatusIcon(status);
            const isDraggedOver = draggedOverStatus === status;
            return (
              <div 
                key={status} 
                className={`flex-shrink-0 w-80 rounded-[2.5rem] p-4 border flex flex-col h-full snap-center transition-all duration-300 ${isDraggedOver ? 'bg-slate-200 border-primary shadow-inner scale-[1.02]' : 'bg-slate-100/50 border-slate-200'}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="flex justify-between items-center mb-4 px-2 pt-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl border ${colorClass}`}>
                      <Icon name={iconName} className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">{status}</h3>
                  </div>
                  <span className="bg-white text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm border border-slate-100">{statusTasks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                  {statusTasks.map(t => renderTaskCard(t, true))}
                  {statusTasks.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-24 flex items-center justify-center text-slate-400 text-xs font-medium">
                      Arraste tarefas para cá
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                        <div className="mb-4">
                          {/* Fallback for old logs without changes/justification */}
                          {(!log.changes && !log.justification) ? (
                            <p className="text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">{log.action}</p>
                          ) : (
                            <p className="text-slate-800 font-bold text-sm mb-2">{log.action}</p>
                          )}
                          
                          {log.changes && log.changes.length > 0 && (
                            <div className="mb-3 space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alterações:</p>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-1">
                                {log.changes.map((change, i) => (
                                  <li key={i}>{change}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {log.justification && (
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Justificativa:</p>
                              <p className="text-xs text-slate-700 italic">"{log.justification}"</p>
                            </div>
                          )}
                        </div>
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
                    <input name="tempoGasto" placeholder="Ex: 08:30" value={tempoGasto} onChange={(e) => setTempoGasto(maskTime(e.target.value))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold shadow-inner" />
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

              <section className="space-y-6">
                <AttachmentsManager 
                  attachments={attachments} 
                  onUpdate={setAttachments} 
                  canEdit={canEdit} 
                />
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
                <button type="submit" form="taskForm" className="px-14 py-4 rounded-2xl bg-primary text-white font-extrabold shadow-xl hover:brightness-110 transition-all">Confirmar</button>
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
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalPhoto, setModalPhoto] = useState<string>('');
  const [modalPerms, setModalPerms] = useState<UserPermissions>(INITIAL_USER.permissoes);
  const [modalProfile, setModalProfile] = useState<UserRole>(UserRole.USER);
  const [hasWhatsapp, setHasWhatsapp] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.perfil === UserRole.ADMIN;

  useEffect(() => {
    if (location.state?.openModal && isAdmin) {
      setEditingUser(null);
      setModalPhoto('');
      setModalPerms(INITIAL_USER.permissoes);
      setModalProfile(UserRole.USER);
      setHasWhatsapp(false);
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, isAdmin]);

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
                    <PhoneInput name="celular" defaultValue={editingUser?.celular} className={`w-full px-6 py-4 rounded-3xl border border-slate-100 outline-none font-bold transition-colors shadow-inner ${hasWhatsapp ? 'bg-emerald-100 border-emerald-300' : 'bg-slate-50'}`} />
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 rounded-2xl border-2 border-slate-200 text-slate-500 font-black text-xs uppercase hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" form="userForm" className="px-14 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase shadow-xl hover:brightness-110 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfiguracoesPage = () => {
  const { currentUser, updateUser, slaSettings, updateSLASettings, sectors, addSector, updateSector, deleteSector, users, clientCategories, addClientCategory, updateClientCategory, deleteClientCategory } = useApp();
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState('aparencia');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClientCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'sector' | 'category'; name: string } | null>(null);
  
  const isAdmin = currentUser?.perfil === UserRole.ADMIN;

  const tabs = [
    ...(isAdmin ? [{ id: 'setores', label: 'Setores', icon: 'building' }] : []),
    ...(isAdmin ? [{ id: 'categorias', label: 'Categorias', icon: 'tag' }] : []),
    ...(isAdmin ? [{ id: 'sla', label: 'Regras de SLA', icon: 'clock' }] : []),
    ...(isAdmin ? [{ id: 'email', label: 'E-mail', icon: 'email' }] : []),
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
    success('Parametrização de SLA atualizada com sucesso!');
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

  const { emailSettings, updateEmailSettings } = useApp();
  const [selectedProvider, setSelectedProvider] = useState(emailSettings.provider);

  const handleSaveEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const provider = data.get('provider') as string;
    const host = data.get('host') as string;
    const port = Number(data.get('port'));
    const user = data.get('user') as string;
    const pass = data.get('pass') as string;
    const secure = data.get('secure') === 'on';

    updateEmailSettings({ provider, host, port, user, pass, secure });
    success('Configurações de E-mail atualizadas com sucesso!');
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
                    <div className="flex gap-2 relative z-50">
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          setEditingSector(s); 
                          setIsSectorModalOpen(true); 
                        }} 
                        className="p-3 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-blue-50" 
                        title="Editar"
                      >
                        <Edit size={20} className="pointer-events-none" />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          setDeleteConfirm({ id: s.id, type: 'sector', name: s.nome });
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
                  <div className="flex gap-2 relative z-50">
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        setEditingCategory(cat); 
                        setIsCategoryModalOpen(true); 
                      }} 
                      className="p-3 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-blue-50" 
                      title="Editar"
                    >
                      <Edit size={20} className="pointer-events-none" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        setDeleteConfirm({ id: cat.id, type: 'category', name: cat.nome });
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

        {activeTab === 'email' && isAdmin && (
           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10 animate-in slide-in-from-bottom-2">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Configurações de E-mail</h3>
                <p className="text-sm text-slate-400 font-medium">Defina as credenciais do servidor SMTP para envio de mala direta.</p>
              </div>
              <form onSubmit={handleSaveEmail} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Provedor</label>
                    <select 
                      name="provider" 
                      defaultValue={emailSettings.provider} 
                      className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner"
                      onChange={(e) => {
                        const provider = e.target.value;
                        setSelectedProvider(provider);
                        const form = e.target.closest('form');
                        if (!form) return;
                        const hostInput = form.querySelector('input[name="host"]') as HTMLInputElement;
                        const portInput = form.querySelector('input[name="port"]') as HTMLInputElement;
                        const secureInput = form.querySelector('input[name="secure"]') as HTMLInputElement;
                        
                        if (provider === 'GMail') {
                          hostInput.value = 'smtp.gmail.com';
                          portInput.value = '587';
                          secureInput.checked = true;
                        } else if (provider === 'Office365') {
                          hostInput.value = 'smtp.office365.com';
                          portInput.value = '587';
                          secureInput.checked = true;
                        } else if (provider === 'SendGrid') {
                          hostInput.value = 'smtp.sendgrid.net';
                          portInput.value = '587';
                          secureInput.checked = true;
                        } else if (provider === 'Amazon SES') {
                          hostInput.value = 'email-smtp.us-east-1.amazonaws.com';
                          portInput.value = '587';
                          secureInput.checked = true;
                        } else if (provider === 'Mailgun') {
                          hostInput.value = 'smtp.mailgun.org';
                          portInput.value = '587';
                          secureInput.checked = true;
                        } else if (provider === 'SMTP') {
                          hostInput.value = '';
                          portInput.value = '587';
                          secureInput.checked = false;
                        }
                      }}
                    >
                      <option value="SMTP">SMTP Personalizado</option>
                      <option value="GMail">GMail</option>
                      <option value="Office365">Office365</option>
                      <option value="SendGrid">SendGrid</option>
                      <option value="Amazon SES">Amazon SES</option>
                      <option value="Mailgun">Mailgun</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Host SMTP</label>
                    <input name="host" required defaultValue={emailSettings.host} placeholder="smtp.exemplo.com" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Porta</label>
                    <input name="port" type="number" required defaultValue={emailSettings.port} placeholder="587" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
                    <input name="user" required defaultValue={emailSettings.user} placeholder="seu-email@exemplo.com" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                    <input name="pass" type="password" required defaultValue={emailSettings.pass} placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner" />
                 </div>
                 <div className="space-y-1 md:col-span-2 flex items-center gap-3">
                    <input name="secure" type="checkbox" id="secure" defaultChecked={emailSettings.secure} className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="secure" className="text-sm font-bold text-slate-700">Usar conexão segura (SSL/TLS)</label>
                 </div>
                 {(selectedProvider === 'GMail' || selectedProvider === 'Office365') && (
                   <div className="md:col-span-2 bg-amber-50 border border-amber-200 p-6 rounded-2xl flex gap-4 items-start">
                     <div className="text-amber-500 shrink-0 mt-1">
                       <AlertTriangle size={24} />
                     </div>
                     <div>
                       <h4 className="font-bold text-amber-800 text-sm mb-1">Atenção: Senha de Aplicativo Necessária</h4>
                       <p className="text-xs text-amber-700 font-medium leading-relaxed">
                         Para provedores como {selectedProvider}, você não pode usar a senha normal da sua conta se a Autenticação em Duas Etapas (2FA) estiver ativada. Você precisará gerar uma <strong>Senha de Aplicativo</strong> nas configurações de segurança da sua conta e inseri-la no campo "Senha" acima.
                       </p>
                     </div>
                   </div>
                 )}
                 <button type="submit" className="md:col-span-2 py-5 bg-primary text-white rounded-[2rem] font-black text-lg shadow-xl hover:brightness-110 transition-all hover:-translate-y-1">Salvar Configurações</button>
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
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl space-y-8 animate-in zoom-in duration-200">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-slate-800">Confirmar Exclusão</h3>
              <p className="text-slate-500 font-medium">Você tem certeza que deseja remover {deleteConfirm.type === 'sector' ? 'o setor' : 'a categoria'} <span className="font-bold text-slate-800">"{deleteConfirm.name}"</span>? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm.type === 'sector') deleteSector(deleteConfirm.id);
                  else deleteClientCategory(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditoriaPage = () => {
  const { auditLogs, currentUser } = useApp();
  const { confirm } = useConfirm();
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
        {isAdmin && <button onClick={() => { confirm({ title: 'Limpar Histórico', message: 'Limpar logs permanentemente?', onConfirm: () => { auditService.clearLogs(); window.location.reload(); } }); }} className="text-red-600 bg-red-50 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">Limpar Histórico</button>}
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

const SobrePage = () => {
  const { users, clients, tasks, history } = useApp();

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-[#337ab7] rounded-xl p-10 text-white text-center space-y-4 shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <Icon name="users" className="text-3xl" />
          <h1 className="text-3xl font-bold tracking-tight">NelMac Sistemas</h1>
        </div>
        <div className="h-px bg-white/30 w-full max-w-4xl mx-auto" />
        <p className="text-sm font-medium opacity-90">Soluções em tecnologia para otimizar sua gestão empresarial</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Column 1: Informações do Sistema */}
        <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 space-y-8">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="code" className="text-lg" />
            <h3 className="font-black uppercase tracking-widest text-xs">Informações do Sistema</h3>
          </div>
          
          <div className="inline-block px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest">
            Versão 1.0.9
          </div>

          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            O <span className="font-bold text-slate-800">SenseiRM</span> é um sistema de CRM (Customer Relationship Management) compacto desenvolvido para otimizar a gestão de relacionamento com clientes, tarefas e comunicação empresarial.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Icon name="activity" className="text-slate-800 text-sm mt-1" />
              <div>
                <p className="text-xs font-bold text-slate-800">Alta Performance</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="shield-alt" className="text-slate-800 text-sm mt-1" />
              <div>
                <p className="text-xs font-bold text-slate-800">Segurança Avançada</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="smartphone" className="text-slate-800 text-sm mt-1" />
              <div>
                <p className="text-xs font-bold text-slate-800">Totalmente Responsivo</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Icon name="tag" className="text-slate-400 text-xs" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tecnologias Utilizadas</h4>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              HTML5, CSS3, JavaScript ES6+, LocalStorage API, Font Awesome 6, Google Fonts
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Icon name="star" className="text-xs" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Destaques da Versão 1.0.9</h4>
            </div>
            <ul className="space-y-3">
              {['Sistema completo de permissões de usuário', 'Controle de acesso administrativo', 'Interface totalmente redesenhada', 'Dashboard com métricas avançadas', 'Sistema de backup e restore'].map((item, i) => (
                <li key={i} className="text-[11px] text-slate-600 font-medium flex items-center gap-2 border-b border-slate-50 pb-2 last:border-0">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 2: Características Técnicas */}
        <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 space-y-8">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="settings" className="text-lg" />
            <h3 className="font-black uppercase tracking-widest text-xs">Características Técnicas</h3>
          </div>

          <div className="space-y-5">
            {[
              { label: 'Arquitetura', value: 'Single Page Application (SPA)' },
              { label: 'Persistência', value: 'LocalStorage com backup automático' },
              { label: 'Segurança', value: 'Autenticação multi-nível com criptografia' },
              { label: 'Performance', value: 'Carregamento assíncrono e cache inteligente' },
              { label: 'Compatibilidade', value: 'Todos os navegadores modernos' },
              { label: 'Responsividade', value: 'Mobile-first design' },
              { label: 'Acessibilidade', value: 'WCAG 2.1 Level AA' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <Icon name="check" className="text-primary text-xs mt-1" />
                <div className="flex-1 flex justify-between gap-2">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{item.label}:</span>
                  <span className="text-[11px] text-slate-500 font-medium text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Icon name="pie-chart" className="text-slate-400 text-xs" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estatísticas do Sistema</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total de Usuários', value: users.length },
                { label: 'Total de Clientes', value: clients.length },
                { label: 'Total de Tarefas', value: tasks.length },
                { label: 'Mensagens', value: history.length },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                  <p className="text-xl font-black text-primary">{stat.value}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Segurança e Privacidade */}
        <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 space-y-8">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="shield-alt" className="text-lg" />
            <h3 className="font-black uppercase tracking-widest text-xs">Segurança e Privacidade</h3>
          </div>

          <ul className="space-y-5">
            {[
              'Sistema de autenticação robusto',
              'Controle de acesso baseado em perfis',
              'Permissões granulares por módulo',
              'Dados armazenados localmente no navegador',
              'Validação de formulários em tempo real',
              'Proteção contra XSS e injection',
              'Logs de atividades detalhados',
              'Backup automático dos dados',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <Icon name="check" className="text-primary text-xs mt-1" />
                <span className="text-[11px] text-slate-600 font-medium">{item}</span>
              </li>
            ))}
          </ul>

          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <Icon name="alert-triangle" className="text-xs" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Importante</h4>
            </div>
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              Os dados são armazenados localmente no seu navegador. Recomendamos fazer backup regularmente e evitar limpar os dados do navegador.
            </p>
          </div>
        </div>
      </div>

      {/* Funcionalidades Principais */}
      <div className="space-y-8">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="star" className="text-lg" />
          <h3 className="text-sm font-black uppercase tracking-widest">Funcionalidades Principais</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: 'pie-chart', title: 'Dashboard Inteligente', desc: 'Visão geral com métricas em tempo real, gráficos interativos e KPIs do negócio' },
            { icon: 'user', title: 'Gestão de Clientes', desc: 'Cadastro completo com histórico de interações, segmentação e dados de contato' },
            { icon: 'tarefas', title: 'Gestão de Tarefas', desc: 'Organização de atividades com prioridades, prazos e atribuição de responsáveis' },
            { icon: 'email', title: 'Mala Direta', desc: 'Comunicação em massa por e-mail e WhatsApp com templates personalizáveis' },
            { icon: 'users', title: 'Gestão de Usuários', desc: 'Controle de acesso multi-nível com permissões granulares por módulo' },
            { icon: 'smartphone', title: 'Design Responsivo', desc: 'Interface adaptável para todos os dispositivos com experiência otimizada' },
          ].map((func, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-4 hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Icon name={func.icon} />
              </div>
              <h4 className="font-black text-slate-800 tracking-tight">{func.title}</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{func.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Contato */}
      <div className="bg-slate-50/50 rounded-[3rem] p-10 border border-slate-100 space-y-10">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="message-square" className="text-lg" />
          <h3 className="text-sm font-black uppercase tracking-widest">Contato & Suporte</h3>
        </div>

        <p className="text-center text-xs text-slate-500 font-medium">Para mais informações sobre o SenseiRM ou outros produtos da NelMac Sistemas:</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto text-primary shadow-sm border border-slate-100">
              <Icon name="email" className="text-sm" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail:</p>
              <p className="text-xs font-bold text-slate-800">contato@nelmacsistemas.com.br</p>
            </div>
          </div>
          <div className="text-center space-y-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto text-primary shadow-sm border border-slate-100">
              <Icon name="globe" className="text-sm" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site:</p>
              <p className="text-xs font-bold text-slate-800">www.nelmacsistemas.com.br</p>
            </div>
          </div>
          <div className="text-center space-y-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto text-primary shadow-sm border border-slate-100">
              <Icon name="phone" className="text-sm" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone:</p>
              <p className="text-xs font-bold text-slate-800">(51) 99273-3121</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 text-center space-y-2">
          <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Desenvolvido por NelMac Sistemas</p>
          <p className="text-[10px] text-slate-400 font-medium">Transformando ideias em soluções tecnológicas inovadoras desde 2023</p>
        </div>
      </div>
    </div>
  );
};

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
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-12 italic">SenseiRM <span className="text-primary"></span></h2>
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
  const { error, success, warning } = useToast();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [type, setType] = useState<'email' | 'whatsapp'>('email');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // WhatsApp Queue State
  const [whatsappQueue, setWhatsappQueue] = useState<string[]>([]);
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const isAdmin = currentUser?.perfil === UserRole.ADMIN;
  const perms = currentUser?.permissoes.malaDireta;
  const canSend = isAdmin || perms?.incluir;

  // Reset selection when changing type
  useEffect(() => {
    setSelectedClients([]);
  }, [type]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Validation: Must have the required contact info
      if (type === 'email' && !c.emailPrincipal) return false;
      if (type === 'whatsapp' && !c.telefoneSecundario && !c.telefonePrincipal) return false;

      const matchesSearch = c.nomeRazaoSocial.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            (c.emailPrincipal?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase()) ||
                            (c.telefoneSecundario || '').includes(debouncedSearchTerm);
      const matchesRating = filterRating === 'all' || c.avaliacaoInterna === filterRating;
      return matchesSearch && matchesRating;
    });
  }, [clients, debouncedSearchTerm, filterRating, type]);

  const selectAll = () => {
    const ids = filteredClients.map(c => c.id);
    setSelectedClients(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAll = () => {
    const ids = filteredClients.map(c => c.id);
    setSelectedClients(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSend) return error('Restrição de acesso.');
    if (selectedClients.length === 0) return warning('Selecione destinos.');
    if (!message.trim() || message === '<p><br></p>') return warning('A mensagem não pode estar vazia.');
    
    const formData = new FormData(e.currentTarget);
    const assunto = (formData.get('assunto') as string) || '';

    const entry: MailHistory = { 
      id: crypto.randomUUID(), 
      data: new Date().toISOString(), 
      tipo: type, 
      destinatarios: selectedClients, 
      assunto, 
      mensagem: message 
    };

    if (type === 'whatsapp') {
      addMailHistory(entry);
      setWhatsappQueue(selectedClients);
      setWhatsappIndex(0);
      setWhatsappMessage(message);
      setSelectedClients([]);
    } else {
      setIsSending(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subject: assunto,
            message: message,
            recipients: selectedClients
          })
        });
        
        const data = await res.json();
        if (res.ok) {
          addMailHistory(entry);
          success(`E-mails enviados com sucesso para ${data.sentCount} destinatários!`);
          setSelectedClients([]);
          setMessage('');
          (e.target as HTMLFormElement).reset();
        } else {
          error(data.error || 'Erro ao enviar e-mails.');
        }
      } catch (err) {
        error('Erro de conexão ao enviar e-mails.');
      } finally {
        setIsSending(false);
      }
    }
  };

  const processNextWhatsApp = () => {
    if (whatsappIndex >= whatsappQueue.length) {
      setWhatsappQueue([]);
      return;
    }
    
    const clientId = whatsappQueue[whatsappIndex];
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const phoneRaw = client.telefoneSecundario || client.telefonePrincipal || '';
      const phone = phoneRaw.replace(/\D/g, '');
      
      const firstName = client.nomeRazaoSocial.split(' ')[0];
      let personalizedMessage = whatsappMessage
        .replace(/{nome}/g, firstName)
        .replace(/{empresa}/g, client.nomeRazaoSocial)
        .replace(/{email}/g, client.emailPrincipal || '')
        .replace(/{telefone}/g, client.telefonePrincipal || '');

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(personalizedMessage)}`;
      window.open(url, '_blank');
    }
    setWhatsappIndex(prev => prev + 1);
  };

  const skipWhatsApp = () => {
    setWhatsappIndex(prev => prev + 1);
  };

  const cancelWhatsAppQueue = () => {
    setWhatsappQueue([]);
  };

  return (
    <div className="p-8 flex gap-8 animate-in fade-in duration-500 h-[calc(100vh-100px)] relative">
      {/* WhatsApp Queue Overlay */}
      {whatsappQueue.length > 0 && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center rounded-[3.5rem]">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Icon name="phone" className="text-4xl" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Fila de Envio WhatsApp</h3>
              <p className="text-sm text-slate-500 font-medium mt-2">
                Enviando {whatsappIndex + 1} de {whatsappQueue.length}
              </p>
            </div>
            
            {whatsappIndex < whatsappQueue.length ? (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Próximo Destinatário:</p>
                <p className="font-bold text-slate-700">{clients.find(c => c.id === whatsappQueue[whatsappIndex])?.nomeRazaoSocial}</p>
                <p className="text-xs text-slate-500">{clients.find(c => c.id === whatsappQueue[whatsappIndex])?.telefoneSecundario || clients.find(c => c.id === whatsappQueue[whatsappIndex])?.telefonePrincipal}</p>
              </div>
            ) : (
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <p className="font-bold text-emerald-700">Todos os envios foram processados!</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {whatsappIndex < whatsappQueue.length ? (
                <>
                  <button onClick={processNextWhatsApp} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all">
                    Abrir WhatsApp Web
                  </button>
                  <div className="flex gap-3">
                    <button onClick={skipWhatsApp} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Pular</button>
                    <button onClick={cancelWhatsAppQueue} className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all">Cancelar Fila</button>
                  </div>
                </>
              ) : (
                <button onClick={cancelWhatsAppQueue} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black shadow-lg hover:bg-slate-900 transition-all">
                  Concluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-200 flex flex-col space-y-8 overflow-hidden">
         <div className="flex bg-slate-50 p-2 rounded-3xl border border-slate-100 shadow-inner shrink-0">
            <button type="button" onClick={() => setType('email')} className={`flex-1 py-5 rounded-2xl font-black tracking-widest text-sm transition-all ${type === 'email' ? 'bg-white text-primary shadow-xl' : 'text-slate-400'}`}>MAIL SERVICE</button>
            <button type="button" onClick={() => setType('whatsapp')} className={`flex-1 py-5 rounded-2xl font-black tracking-widest text-sm transition-all ${type === 'whatsapp' ? 'bg-white text-primary shadow-xl' : 'text-slate-400'}`}>WHATSAPP API</button>
         </div>
         
         <div className="flex gap-2 shrink-0 flex-wrap">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center mr-2">Variáveis Dinâmicas:</span>
           {['{nome}', '{empresa}', '{email}', '{telefone}'].map(tag => (
             <button type="button" key={tag} onClick={() => setMessage(prev => prev + tag)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-mono font-bold transition-colors">
               {tag}
             </button>
           ))}
         </div>

         <form onSubmit={handleSend} className="flex-1 flex flex-col space-y-6 overflow-hidden">
            {type === 'email' && (
              <input name="assunto" required className="w-full px-7 py-5 rounded-3xl border border-slate-200 outline-none font-bold focus:border-primary shadow-inner shrink-0" placeholder="Assunto da Comunicação" />
            )}
            
            <div className="flex-1 flex flex-col min-h-0 relative">
              {type === 'email' ? (
                <div className="flex-1 overflow-hidden flex flex-col rounded-3xl border border-slate-200 focus-within:border-primary transition-colors">
                  <ReactQuill 
                    theme="snow" 
                    value={message} 
                    onChange={setMessage} 
                    className="flex-1 flex flex-col h-full"
                    placeholder="Escreva sua mensagem rica aqui..."
                  />
                </div>
              ) : (
                <textarea 
                  name="mensagem" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required 
                  className="flex-1 w-full px-7 py-6 rounded-[2.5rem] border border-slate-200 outline-none resize-none font-medium focus:border-primary shadow-inner" 
                  placeholder="Mensagem estruturada para WhatsApp..." 
                />
              )}
            </div>

            <button type="submit" disabled={!canSend || isSending} className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all shrink-0 flex items-center justify-center gap-3 ${canSend && !isSending ? 'bg-primary text-white hover:brightness-110' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
               {isSending ? (
                 <>Enviando... <Icon name="loader" className="animate-spin" /></>
               ) : (
                 <>Broadcast ({selectedClients.length})</>
               )}
            </button>
         </form>
      </div>
      
      <div className="w-96 bg-white p-8 rounded-[3.5rem] border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        <h4 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-xs border-b border-slate-50 pb-4 shrink-0">
          Destinos Válidos <span className="text-slate-400 font-medium ml-1">({filteredClients.length})</span>
        </h4>
        
        {/* Search and Filters */}
        <div className="space-y-4 mb-6 shrink-0">
          <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold outline-none focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary"
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos Ratings</option>
              <option value="1">1 - Baixo Potencial</option>
              <option value="2">2 - Potencial Médio</option>
              <option value="3">3 - Bom Cliente</option>
              <option value="4">4 - Prioritário</option>
              <option value="5">5 - Cliente VIP</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={selectAll}
              className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
            >
              Selecionar Filtrados
            </button>
            <button 
              type="button"
              onClick={deselectAll}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Limpar Filtrados
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {filteredClients.length === 0 ? (
            <div className="text-center py-10 opacity-30">
              <Icon name="search" className="text-3xl mb-2 mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum cliente válido encontrado</p>
            </div>
          ) : (
            filteredClients.map(c => (
              <label 
                key={c.id} 
                title={type === 'email' ? `E-mail: ${c.emailPrincipal}` : `WhatsApp: ${c.telefoneSecundario || c.telefonePrincipal}`}
                className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${selectedClients.includes(c.id) ? 'bg-primary/5 border-primary/20 shadow-sm' : 'border-slate-50 hover:bg-slate-50'}`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedClients.includes(c.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                  {selectedClients.includes(c.id) && <Icon name="check" className="text-white text-[10px]" />}
                </div>
                <input type="checkbox" className="hidden" checked={selectedClients.includes(c.id)} onChange={() => setSelectedClients(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} />
                <div className="overflow-hidden flex-1">
                  <span className="text-xs font-extrabold text-slate-700 block truncate">{c.nomeRazaoSocial}</span>
                  <span className="text-[9px] text-slate-400 font-bold block truncate">
                    {type === 'email' ? c.emailPrincipal : (c.telefoneSecundario || c.telefonePrincipal)}
                  </span>
                </div>
                {c.avaliacaoInterna > 0 && (
                  <div className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black">
                    {c.avaliacaoInterna}★
                  </div>
                )}
              </label>
            ))
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Selecionado</span>
          <span className="text-lg font-black text-primary">{selectedClients.length}</span>
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
    '/sobre': 'Sobre o SenseiRM'
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
    <ToastProvider>
      <ConfirmProvider>
        <AppProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={<MainLayout />} />
            </Routes>
          </HashRouter>
        </AppProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
};

export default App;