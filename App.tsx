import React, { useState, useEffect, useMemo, createContext, useContext, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addDays, 
  isToday, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Client, ContactPerson, AuditEntry, MailHistory, EntityStatus, TaskStatus, TaskPriority, UserPermissions, Permission, TaskType, SLASettings, TaskLog, Sector, Task, ClientCategory, Attachment, Notification, MailTemplate, ClientInteraction, Subtask, Comment, CustomField, Role } from './types';
import { INITIAL_USER, THEMES } from './constants';
import { auditService } from './services/auditService';

// --- Dashboard & Charts ---
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

import { 
  Edit, Trash2, Plus, Tag, Building2, Clock, Palette, Shield, Check, 
  Users, LayoutDashboard, Mail, FileText, Settings, ShieldCheck, Info,
  Search, Filter, Download, Upload, LogOut, User as UserIcon, Phone, Mail as MailIcon,
  Globe, MapPin, CreditCard, PieChart as PieChartIcon, Activity, AlertTriangle, ChevronRight,
  ChevronLeft, MoreVertical, X, Calendar, MessageSquare, ExternalLink, HelpCircle,
  Bell, BellOff, Zap, TrendingUp, Target, Briefcase, Star, Award, CheckCircle,
  AlertCircle, PlayCircle, CheckSquare, ListTodo, UserPlus, FilePlus, Building,
  Sun, Moon, Send, ClipboardList, Cog, BookOpen, BarChart2, Home, MoreHorizontal, Wand2, MessageCircle, Loader2
} from 'lucide-react';

// Icons from Lucide — mapeamento completo e correto
const iconMap: Record<string, any> = {
  // Ações
  'edit': Edit,
  'trash': Trash2,
  'plus': Plus,
  'check': Check,
  'x': X,
  'search': Search,
  'filter': Filter,
  'download': Download,
  'upload': Upload,
  'external-link': ExternalLink,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'more-vertical': MoreVertical,
  'more-horizontal': MoreHorizontal,
  'logout': LogOut,
  // Navegação (USA-04: nomes corrigidos para equivalentes Lucide)
  'dashboard': LayoutDashboard,
  'home': Home,
  'calendar': Calendar,
  'address-book': Users,        // FA: address-book → Lucide: Users
  'chart-line': BarChart2,      // FA: chart-line → Lucide: BarChart2
  'paper-plane': Send,          // FA: paper-plane → Lucide: Send
  'mala-direta': Send,
  'tasks': ClipboardList,       // FA: tasks → Lucide: ClipboardList
  'tarefas': ClipboardList,
  'users': Users,
  'cog': Cog,                   // FA: cog → Lucide: Cog
  'configuracoes': Settings,
  'shield-alt': ShieldCheck,    // FA: shield-alt → Lucide: ShieldCheck
  'auditoria': ShieldCheck,
  'info-circle': Info,          // FA: info-circle → Lucide: Info
  'sobre': Info,
  // Entidades
  'tag': Tag,
  'building': Building2,
  'building-plus': Building,
  'user': UserIcon,
  'user-plus': UserPlus,
  'file-plus': FilePlus,
  'briefcase': Briefcase,
  // Comunicação
  'phone': Phone,
  'email': MailIcon,
  'bell': Bell,
  'bell-slash': BellOff,
  'message-square': MessageSquare,
  'mail': Mail,
  // Status e indicadores
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'play-circle': PlayCircle,
  'check-square': CheckSquare,
  'list-todo': ListTodo,
  'shield': Shield,
  // Gráficos e dados
  'pie-chart': PieChartIcon,
  'bar-chart': BarChart2,
  'activity': Activity,
  'trending-up': TrendingUp,
  'target': Target,
  // Miscelânea
  'clock': Clock,
  'palette': Palette,
  'globe': Globe,
  'map-pin': MapPin,
  'credit-card': CreditCard,
  'star': Star,
  'award': Award,
  'zap': Zap,
  'book-open': BookOpen,
  'sun': Sun,
  'moon': Moon,
  'magic': Wand2,
  'message-circle': MessageCircle,
  'spinner': Loader2,

  'eye': Eye,
  'cpu': Cpu,
  'folder-open': FolderOpen,
  'exclamation-triangle': ExclamationTriangle,
  'key': Key,
  'times': X,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'edit-alt': EditAlt,
  'camera': Camera,
  'copy': Copy,
  'save': Save,
  'calendar-alt': Calendar,
  'envelope': Envelope,
  'loader': Loader2,
  'file-text': FileAlt,
  'code': Code,

  // All other previously found missing icons in the first batch
  'id-card': UserIcon,
  'map-marker-alt': MapPin,
  'wallet': Wallet,
  'paperclip': Paperclip,
  'history': History,
  'users-cog': Users,
  'user-tie': Briefcase,
  'shield-check': ShieldCheck,

};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("[CRITICAL] App Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-4">Falha no Componente</h1>
            <p className="text-slate-500 mb-8 font-medium">Ocorreu um erro ao renderizar esta parte do sistema. Detalhes: <code className="bg-slate-100 p-1 rounded text-red-500 text-xs">{this.state.error?.message}</code></p>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all">Recarregar App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Icon: React.FC<{ name: string; className?: string; title?: string }> = ({ name, className = "", title }) => {
  const LucideIcon = iconMap[name] || HelpCircle;
  return <LucideIcon className={`${className} pointer-events-none`} size={18} />;
};

export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// --- Helpers for Detailed Audit ---
const getDetailedDiff = (oldObj: any, newObj: any, labels: Record<string, string>): { text: string, diff: { field: string, oldValue: any, newValue: any }[] } => {
  const changes: string[] = [];
  const diff: { field: string, oldValue: any, newValue: any }[] = [];
  Object.keys(labels).forEach(key => {
    const oldVal = oldObj[key] === undefined || oldObj[key] === null || oldObj[key] === '' ? 'Vazio' : String(oldObj[key]);
    const newVal = newObj[key] === undefined || newObj[key] === null || newObj[key] === '' ? 'Vazio' : String(newObj[key]);
    
    if (oldVal !== newVal) {
      changes.push(`${labels[key]}: "${oldVal}" → "${newVal}"`);
      diff.push({ field: labels[key], oldValue: oldVal, newValue: newVal });
    }
  });
  return {
    text: changes.length > 0 ? `Alterações: [${changes.join(' | ')}]` : 'Nenhuma alteração nos campos principais.',
    diff
  };
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
  name?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  onChange?: (val: string) => void;
}> = ({ name, value, defaultValue, required, placeholder, className, onChange }) => {
  const [internalValue, setInternalValue] = useState(phoneMask(defaultValue || value || ""));

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(phoneMask(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = phoneMask(e.target.value);
    setInternalValue(masked);
    if (onChange) onChange(masked);
  };

  return (
    <input
      name={name}
      required={required}
      value={internalValue}
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

const maskDocumentoPrivacy = (doc: string) => {
  if (!doc) return "";
  const v = doc.replace(/\D/g, "");
  if (v.length === 11) {
    return `${v.substring(0, 3)}.***.***-${v.substring(9)}`;
  }
  if (v.length === 14) {
    return `${v.substring(0, 2)}.***.***/****-${v.substring(12)}`;
  }
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
  title?: string;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  toast: (options: { title?: string, message: string, type: ToastType }) => void;
}

const ToastContext = createContext<ToastContextData | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de um ToastProvider");
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((options: { title?: string, message: string, type: ToastType } | string, type: ToastType = 'info') => {
    const id = generateUUID();
    if (typeof options === 'string') {
      setToasts(prev => [...prev, { id, message: options, type }]);
    } else {
      setToasts(prev => [...prev, { id, ...options }]);
    }
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
    warning: (msg: string) => addToast(msg, 'warning'),
    toast: (options: { title?: string, message: string, type: ToastType }) => addToast(options)
  }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-8 fade-in duration-300
              ${t.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100' : 
                t.type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-900 text-red-900 dark:text-red-100' : 
                t.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950 border-amber-100 dark:border-amber-900 text-amber-900 dark:text-amber-100' : 
                'bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-100'}`}
          >
            <Icon 
              name={t.type === 'success' ? 'check-circle' : t.type === 'error' ? 'alert-circle' : t.type === 'warning' ? 'alert-triangle' : 'bell'} 
              className={`shrink-0 ${t.type === 'success' ? 'text-emerald-500' : t.type === 'error' ? 'text-red-500' : t.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}
            />
            <div className="flex flex-col min-w-0">
              {t.title && <p className="font-black text-xs uppercase tracking-wider mb-0.5">{t.title}</p>}
              <p className="font-bold text-sm">{t.message}</p>
            </div>
            <button onClick={() => removeToast(t.id)} className="ml-2 shrink-0 opacity-50 hover:opacity-100 transition-opacity">
              <X size={14} />
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

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 w-[95vw] lg:w-[90vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col">
            <div className={`p-6 border-b ${
              options.isDestructive 
                ? 'bg-red-50 dark:bg-red-950/50 border-red-100 dark:border-red-900' 
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  options.isDestructive 
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' 
                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                }`}>
                  <Icon name={options.isDestructive ? 'alert-triangle' : 'alert-circle'} className="text-xl" />
                </div>
                <h3 className={`font-black text-lg ${
                  options.isDestructive 
                    ? 'text-red-900 dark:text-red-100' 
                    : 'text-slate-900 dark:text-slate-50'
                }`}>
                  {options.title || 'Confirmação'}
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{options.message}</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button 
                onClick={handleCancel}
                className="px-6 py-3 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
              >
                {options.cancelLabel || 'Cancelar'}
              </button>
              <button 
                onClick={handleConfirm}
                className={`px-6 py-3 rounded-xl font-black text-white shadow-lg transition-all text-sm ${
                  options.isDestructive 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-primary hover:brightness-110 shadow-primary/20'
                }`}
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

export interface SystemSettings {
  companyName: string;
  appLogo: string;
}

// --- Context ---
interface AppState {
  currentUser: User | null;
  users: User[];
  roles: Role[];
  clients: Client[];
  tasks: Task[];
  sectors: Sector[];
  clientCategories: ClientCategory[];
  customFields: CustomField[];
  auditLogs: AuditEntry[];
  history: MailHistory[];
  slaSettings: SLASettings;
  notifications: Notification[];
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
  addUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addRole: (role: Role) => void;
  updateRole: (role: Role) => void;
  deleteRole: (id: string) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addCustomField: (field: CustomField) => void;
  updateCustomField: (field: CustomField) => void;
  deleteCustomField: (id: string) => void;
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
  templates: MailTemplate[];
  addTemplate: (template: MailTemplate) => void;
  updateTemplate: (template: MailTemplate) => void;
  deleteTemplate: (id: string) => void;
  updateSLASettings: (settings: SLASettings) => void;
  emailSettings: EmailSettings;
  updateEmailSettings: (settings: EmailSettings) => void;
  systemSettings: SystemSettings;
  updateSystemSettings: (settings: SystemSettings) => void;
  updateSync: (type: string, action: 'ADD' | 'UPDATE' | 'DELETE' | 'SET', payload: any) => Promise<void>;
  hasPermission: (module: keyof UserPermissions, action: keyof Permission) => boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const SenseiLogo = ({ className = "" }: { className?: string }) => (
  <span className={`font-black tracking-tighter uppercase italic ${className}`}>
    Sensei<span className="text-primary not-italic">RM</span>
  </span>
);

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp deve ser usado dentro de um AppProvider");
  return context;
};

// --- Provider ---
const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('senseirm_theme');
    return (stored as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('senseirm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('senseirm_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error parsing stored user', e);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      nome: 'Administrador',
      email: 'admin@senseirm.com',
      senha: '', // Senha não é exposta no frontend
      roleId: 'admin',
      status: EntityStatus.ACTIVE,
      tema: 'verde',
      foto: '',
      possuiWhatsapp: true,
      dataCriacao: new Date().toISOString()
    }
  ]);
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'admin',
      name: 'Administrador',
      description: 'Acesso total ao sistema',
      permissions: {
        dashboard: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
        clientes: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
        malaDireta: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
        tarefas: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
        usuarios: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
        configuracoes: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
        auditoria: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
        calendario: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true }
      }
    }
  ]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [clientCategories, setClientCategories] = useState<ClientCategory[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [history, setHistory] = useState<MailHistory[]>([]);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [slaSettings, setSlaSettings] = useState<SLASettings>({ Baixa: 15, Média: 7, Alta: 3, Crítica: 1 });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({ provider: 'SMTP', host: '', port: 587, user: '', pass: '', secure: false });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ companyName: 'CRM Ecosystem', appLogo: '' });
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    
    const socket = io();

    socket.on('connect', () => {
      socket.emit('join', currentUser.id);
    });

    socket.on('data_updated', (info) => {
      console.log('[Sync] Update received:', info);
      if ((window as any)._loadDataTimeout) clearTimeout((window as any)._loadDataTimeout);
      (window as any)._loadDataTimeout = setTimeout(() => {
        loadData();
      }, 1000);
    });

    socket.on('notification', (data: { title: string, message: string }) => {
      const newNotification: Notification = {
        id: generateUUID(),
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
  }, [currentUser?.id]); // Use ID only to prevent loops on data refresh

  // --- USA-02: Session Timeout com aviso prévio de 2 minutos ---
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState(120);

  useEffect(() => {
    if (!currentUser) return;

    let logoutTimeout: NodeJS.Timeout;
    let warningTimeout: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos
    const WARNING_BEFORE = 2 * 60 * 1000;    // aviso 2 min antes

    const resetTimer = () => {
      clearTimeout(logoutTimeout);
      clearTimeout(warningTimeout);
      clearInterval(countdownInterval);
      setShowSessionWarning(false);
      setSessionCountdown(120);

      // Aviso 2 minutos antes
      warningTimeout = setTimeout(() => {
        setShowSessionWarning(true);
        setSessionCountdown(120);
        countdownInterval = setInterval(() => {
          setSessionCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, INACTIVITY_LIMIT - WARNING_BEFORE);

      // Logout após 30 minutos
      logoutTimeout = setTimeout(() => {
        setShowSessionWarning(false);
        logout();
      }, INACTIVITY_LIMIT);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(logoutTimeout);
      clearTimeout(warningTimeout);
      clearInterval(countdownInterval);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [currentUser]);

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const loadData = async () => {
    setIsLoading(true);
    
    // Safety timeout: stop loader after 10s even if it hangs
    const safetyTimeout = setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          console.warn('[App] loadData safety timeout reached. Unlocking UI.');
          // We don't use toast here yet as error might follow
          return false;
        }
        return false;
      });
    }, 10000);

    try {
      const token = localStorage.getItem('senseirm_token');
      if (!token) {
        setIsLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }
      
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData);
        localStorage.setItem('senseirm_current_user', JSON.stringify(meData));
      } else if (meRes.status === 401 || meRes.status === 403 || meRes.status === 404) {
        logout();
        setIsLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }

      const res = await fetch(`/api/data?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        console.log('[App] Data loaded successfully');
        const data = await res.json();
        // Batch updates to minimize triggers
        if (data.users && data.users.length > 0) setUsers(data.users);
        if (data.roles && data.roles.length > 0) setRoles(data.roles);
        setClients(data.clients || []);
        setTasks(data.tasks || []);
        setSectors(data.sectors || []);
        setClientCategories(data.clientCategories || []);
        setCustomFields(data.customFields || []);
        setHistory(data.history || []);
        setTemplates(data.templates || []);
        setAuditLogs(data.auditLogs || []);
        if (data.slaSettings) setSlaSettings(data.slaSettings);
        if (data.emailSettings) setEmailSettings(data.emailSettings);
        if (data.systemSettings) setSystemSettings(data.systemSettings);
        if (data.notifications) setNotifications(data.notifications);
      } else {
        const errText = `Server error ${res.status}`;
        console.error(`[App] Server error during loadData: ${res.status} ${res.statusText}`);
        toast({ title: 'Erro de Sincronização', message: 'Não foi possível carregar os dados do sistema.', type: 'error' });
      }
    } catch (e) {
      console.error('[App] Failed to load data:', e);
      toast({ title: 'Falha de Conexão', message: 'Verifique sua internet ou tente novamente.', type: 'error' });
    } finally {
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('senseirm_token');
    if (token) {
      loadData();
    }
  }, []);

  const apiSync = useCallback(async (type: string, action: 'ADD' | 'UPDATE' | 'DELETE' | 'SET', payload: any) => {
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
      } else if (res.status === 429) {
        // USA-01: Sem alert() — erro tratado via console e retorno de erro
        console.warn('[SYNC] Rate limit atingido. Tente novamente em instantes.');
      } else if (!res.ok) {
        console.error('Sync error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Failed to sync data', e);
    }
  }, []);

  useEffect(() => {
    const themeId = currentUser?.tema || 'verde';
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--primary-color', theme.color);
    THEMES.forEach(t => document.body.classList.remove(`theme-${t.id}`));
    document.body.classList.add(`theme-${themeId}`);
  }, [currentUser?.tema]);

  useEffect(() => {
    document.title = `SenseiRM - ${(appName || systemSettings.companyName)}`;
  }, [(appName || systemSettings.companyName)]);

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

  const logout = async () => {
    if (currentUser) await auditService.log(currentUser.id, currentUser.nome, 'LOGOUT', 'AUTH', 'Sessão encerrada.');
    setCurrentUser(null);
    localStorage.removeItem('senseirm_current_user');
    localStorage.removeItem('senseirm_token');
  };

  const addUser = (u: User) => {
    setUsers(prev => [...prev, u]);
    apiSync('users', 'ADD', u);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'USUARIOS', `Usuário ${u.nome} criado.`, u.id);
  };

  const updateUser = (u: User) => {
    const oldUser = users.find(item => item.id === u.id);
    const diffResult = oldUser ? getDetailedDiff(oldUser, u, USER_LABELS) : { text: '', diff: [] };
    setUsers(prev => prev.map(item => item.id === u.id ? u : item));
    apiSync('users', 'UPDATE', u);
    if (currentUser?.id === u.id) {
      setCurrentUser(u);
      localStorage.setItem('senseirm_current_user', JSON.stringify(u));
    }
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'USUARIOS', `Usuário ${u.nome} alterado. ${diffResult.text}`, u.id, diffResult.diff);
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    apiSync('users', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'USUARIOS', `Usuário removido: ${target?.nome} (${target?.email})`, id);
  };

  const addRole = (r: Role) => {
    setRoles(prev => [...prev, r]);
    apiSync('roles', 'ADD', r);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CONFIGURACOES', `Função ${r.name} criada.`, r.id);
  };

  const updateRole = (r: Role) => {
    setRoles(prev => prev.map(item => item.id === r.id ? r : item));
    apiSync('roles', 'UPDATE', r);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIGURACOES', `Função ${r.name} alterada.`, r.id);
  };

  const deleteRole = (id: string) => {
    const target = roles.find(r => r.id === id);
    setRoles(prev => prev.filter(r => r.id !== id));
    apiSync('roles', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CONFIGURACOES', `Função removida: ${target?.name}`, id);
  };

  const addClient = (c: Client) => {
    setClients(prev => [...prev, c]);
    apiSync('clients', 'ADD', c);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CLIENTES', `Cliente ${c.nomeRazaoSocial} (${c.clientCode}) criado.`, c.id);
  };

  const updateClient = (c: Client) => {
    const oldClient = clients.find(item => item.id === c.id);
    const diffResult = oldClient ? getDetailedDiff(oldClient, c, CLIENT_LABELS) : { text: '', diff: [] };
    setClients(prev => prev.map(item => item.id === c.id ? c : item));
    apiSync('clients', 'UPDATE', c);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CLIENTES', `Cliente ${c.nomeRazaoSocial} atualizado. ${diffResult.text}`, c.id, diffResult.diff);
  };

  const deleteClient = (id: string) => {
    const target = clients.find(c => c.id === id);
    setClients(prev => prev.filter(c => c.id !== id));
    apiSync('clients', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CLIENTES', `Cliente removido: ${target?.nomeRazaoSocial} (${target?.clientCode})`, id);
  };

  const addTask = (t: Task) => {
    setTasks(prev => [...prev, t]);
    apiSync('tasks', 'ADD', t);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'TAREFAS', `Tarefa ${t.taskNumber}: "${t.titulo}" criada.`, t.id);
  };

  const updateTask = (t: Task) => {
    const oldTask = tasks.find(item => item.id === t.id);
    const diffResult = oldTask ? getDetailedDiff(oldTask, t, TASK_LABELS) : { text: '', diff: [] };
    
    // Notification for task assignment (Functional Improvement)
    if (oldTask && t.responsavelId !== oldTask.responsavelId && t.responsavelId) {
      const newNotification: Notification = {
        id: generateUUID(),
        title: 'Nova Tarefa Atribuída',
        message: `Você foi definido como responsável pela tarefa: ${t.titulo}`,
        timestamp: new Date().toISOString(),
        read: false,
        link: '/tarefas'
      };
      
      // In a real app, this would be sent via socket to the target user.
      // Here we simulate it locally if the current user is the target.
      if (t.responsavelId === currentUser?.id) {
        setNotifications(prev => [newNotification, ...prev]);
      }
    }

    setTasks(prev => prev.map(item => item.id === t.id ? t : item));
    apiSync('tasks', 'UPDATE', t);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'TAREFAS', `Tarefa ${t.taskNumber} alterada. ${diffResult.text}`, t.id, diffResult.diff);
  };

  const deleteTask = (id: string) => {
    const target = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    apiSync('tasks', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'TAREFAS', `Tarefa excluída: ${target?.taskNumber} - ${target?.titulo}`, id);
  };

  const addSector = (s: Sector) => {
    setSectors(prev => [...prev, s]);
    apiSync('sectors', 'ADD', s);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'SETORES', `Setor "${s.nome}" criado.`, s.id);
  };

  const updateSector = (s: Sector) => {
    const oldSec = sectors.find(item => item.id === s.id);
    const diffResult = oldSec ? getDetailedDiff(oldSec, s, { nome: 'Nome', descricao: 'Descrição', responsavelId: 'Gestor' }) : { text: '', diff: [] };
    setSectors(prev => prev.map(item => item.id === s.id ? s : item));
    apiSync('sectors', 'UPDATE', s);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'SETORES', `Setor "${s.nome}" atualizado. ${diffResult.text}`, s.id, diffResult.diff);
  };

  const deleteSector = (id: string) => {
    const target = sectors.find(s => s.id === id);
    if (!target) return;

    setSectors(prev => prev.filter(s => s.id !== id));
    apiSync('sectors', 'DELETE', { id });
    setTasks(prev => prev.map(task => task.setorId === id ? { ...task, setorId: '' } : task));
    
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'SETORES', `Setor "${target.nome}" removido.`, id);
  };

  const addClientCategory = (c: ClientCategory) => {
    setClientCategories(prev => [...prev, c]);
    apiSync('clientCategories', 'ADD', c);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CONFIG', `Categoria "${c.nome}" criada.`, c.id);
  };

  const updateClientCategory = (c: ClientCategory) => {
    setClientCategories(prevCategories => {
      const old = prevCategories.find(item => item.id === c.id);
      const diffResult = old ? getDetailedDiff(old, c, { nome: 'Nome', descricao: 'Descrição', cor: 'Cor' }) : { text: '', diff: [] };
      
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
      auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Categoria "${c.nome}" atualizada. ${diffResult.text}`, c.id, diffResult.diff);
      
      return prevCategories.map(item => item.id === c.id ? c : item);
    });
  };

  const deleteClientCategory = (id: string) => {
    const target = clientCategories.find(c => c.id === id);
    if (!target) return;

    setClientCategories(prev => prev.filter(c => c.id !== id));
    apiSync('clientCategories', 'DELETE', { id });
    setClients(prev => {
      const newClients = prev.map(client => client.categoria === target.nome ? { ...client, categoria: '' } : client);
      apiSync('clients', 'SET', newClients);
      return newClients;
    });
    
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CONFIG', `Categoria "${target.nome}" removida.`, id);
  };

  const addCustomField = (f: CustomField) => {
    setCustomFields(prev => [...prev, f]);
    apiSync('customFields', 'ADD', f);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'CONFIG', `Campo personalizado "${f.name}" criado.`, f.id);
  };

  const updateCustomField = (f: CustomField) => {
    const old = customFields.find(item => item.id === f.id);
    const diffResult = old ? getDetailedDiff(old, f, { name: 'Nome', type: 'Tipo', required: 'Obrigatório' }) : { text: '', diff: [] };
    setCustomFields(prev => prev.map(item => item.id === f.id ? f : item));
    apiSync('customFields', 'UPDATE', f);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Campo personalizado "${f.name}" atualizado. ${diffResult.text}`, f.id, diffResult.diff);
  };

  const deleteCustomField = (id: string) => {
    const target = customFields.find(f => f.id === id);
    if (!target) return;
    setCustomFields(prev => prev.filter(f => f.id !== id));
    apiSync('customFields', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'CONFIG', `Campo personalizado "${target.name}" removido.`, id);
  };

  const addMailHistory = (h: MailHistory) => {
    setHistory(prev => [h, ...prev]);
    apiSync('history', 'ADD', h);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'SEND', 'COMUNICACAO', `Envio em massa (${h.tipo}) para ${h.destinatarios.length} destinos. Assunto: ${h.assunto}`);
  };

  const addTemplate = (t: MailTemplate) => {
    setTemplates(prev => [...prev, t]);
    apiSync('templates', 'ADD', t);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'CREATE', 'TEMPLATE', `Template "${t.name}" criado.`, t.id);
  };

  const updateTemplate = (t: MailTemplate) => {
    const old = templates.find(x => x.id === t.id);
    const diffResult = old ? getDetailedDiff(old, t, { name: 'Nome', subject: 'Assunto', content: 'Conteúdo' }) : { text: '', diff: [] };
    setTemplates(prev => prev.map(x => x.id === t.id ? t : x));
    apiSync('templates', 'UPDATE', t);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'TEMPLATE', `Template "${t.name}" atualizado. ${diffResult.text}`, t.id, diffResult.diff);
  };

  const deleteTemplate = (id: string) => {
    const target = templates.find(t => t.id === id);
    if (!target) return;
    setTemplates(prev => prev.filter(t => t.id !== id));
    apiSync('templates', 'DELETE', { id });
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'DELETE', 'TEMPLATE', `Template "${target.name}" removido.`, id);
  };

  const updateSLASettings = (settings: SLASettings) => {
    const diffResult = getDetailedDiff(slaSettings, settings, { Baixa: 'SLA Baixa', Média: 'SLA Média', Alta: 'SLA Alta', Crítica: 'SLA Crítica' });
    setSlaSettings(settings);
    apiSync('slaSettings', 'SET', settings);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Prazos de SLA redefinidos. ${diffResult.text}`, 'slaSettings', diffResult.diff);
  };

  const updateEmailSettings = (settings: EmailSettings) => {
    const diffResult = getDetailedDiff(emailSettings, settings, { host: 'Host', port: 'Porta', user: 'Usuário', from: 'Remetente' });
    setEmailSettings(settings);
    apiSync('emailSettings', 'SET', settings);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Configurações de E-mail atualizadas. ${diffResult.text}`, 'emailSettings', diffResult.diff);
  };

  const updateSystemSettings = (settings: SystemSettings) => {
    const diffResult = getDetailedDiff(systemSettings, settings, { companyName: 'Nome da Empresa', appLogo: 'Logo' });
    setSystemSettings(settings);
    apiSync('systemSettings', 'SET', settings);
    auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'CONFIG', `Configurações do Sistema atualizadas. ${diffResult.text}`, 'systemSettings', diffResult.diff);
  };

  const hasPermission = useCallback((module: keyof UserPermissions, action: keyof Permission) => {
    if (!currentUser) return false;
    const role = roles.find(r => r.id === currentUser.roleId);
    if (!role) return false;
    // Data-driven RBAC: check the permission matrix
    return !!role.permissions[module]?.[action];
  }, [currentUser, roles]);

  const contextValue = useMemo(() => ({
    currentUser, users, roles, clients, tasks, sectors, auditLogs, history, templates, slaSettings, emailSettings, systemSettings, clientCategories, customFields, notifications,
    markNotificationAsRead, clearNotifications,
    login, logout, updateUser, addUser, deleteUser,
    addRole, updateRole, deleteRole,
    addClient, updateClient, deleteClient,
    addCustomField, updateCustomField, deleteCustomField,
    addTask, updateTask, deleteTask, 
    addSector, updateSector, deleteSector,
    addClientCategory, updateClientCategory, deleteClientCategory,
    addMailHistory, addTemplate, updateTemplate, deleteTemplate, updateSLASettings, updateEmailSettings, updateSystemSettings,
    updateSync: apiSync,
    hasPermission,
    theme,
    toggleTheme,
    isLoading
  }), [
    currentUser, users, roles, clients, tasks, sectors, auditLogs, history, templates, slaSettings, emailSettings, systemSettings, clientCategories, customFields, notifications, apiSync, hasPermission, theme, isLoading
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
      {/* USA-06: Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] animate-pulse">Carregando Ecossistema</p>
          </div>
        </div>
      )}

      {/* USA-02: Modal de aviso de sessão expirando */}
      {showSessionWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-amber-200 dark:border-amber-800 animate-in zoom-in-95 duration-300 w-[95vw] lg:w-[90vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col">
            <div className="p-6 border-b border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-black text-amber-900 dark:text-amber-100 text-base">Sessão Expirando</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Por inatividade</p>
                </div>
              </div>
            </div>
            <div className="p-6 text-center">
              <div className="w-20 h-20 rounded-full border-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{sessionCountdown}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed">
                Sua sessão será encerrada em <strong>{sessionCountdown}</strong> segundo{sessionCountdown !== 1 ? 's' : ''} por inatividade. Deseja continuar?
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700 flex gap-3">
              <button
                onClick={logout}
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
              >
                Sair Agora
              </button>
              <button
                onClick={() => {
                  setShowSessionWarning(false);
                  // Simula interação do usuário para resetar o timer
                  window.dispatchEvent(new MouseEvent('mousemove'));
                }}
                className="flex-[2] py-3 rounded-xl font-black text-white bg-primary shadow-lg shadow-primary/20 hover:brightness-110 transition-all text-sm"
              >
                Manter Sessão
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
};

// --- Helper Components ---

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number, 
  totalPages: number, 
  onPageChange: (page: number) => void 
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 mt-4 shrink-0">
      <div className="flex flex-1 justify-between sm:hidden">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">Anterior</button>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">Próxima</button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">Página <span className="font-black text-slate-700">{currentPage}</span> de <span className="font-black text-slate-700">{totalPages}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all">
            <Icon name="chevron-left" className="h-4 w-4 mr-1" /> Anterior
          </button>
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all">
            Próxima <Icon name="chevron-right" className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

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
          id: generateUUID(),
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
                  <Icon name={(att.type || '').includes('image') ? 'image' : (att.type || '').includes('pdf') ? 'file-pdf' : 'file-alt'} className="text-xl" />
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
  <div className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col hover:shadow-md transition-all cursor-pointer`}>
     <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
     <span className={`text-xl font-black mt-1 ${color}`}>{value}</span>
  </div>
);

// --- Layout ---

const Sidebar = () => {
  const { currentUser, logout, roles, hasPermission, systemSettings } = useApp();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'chart-line', perm: 'dashboard' },
    { path: '/calendario', label: 'Calendário', icon: 'calendar', perm: 'calendario' },
    { path: '/clientes', label: 'Clientes', icon: 'address-book', perm: 'clientes' },
    { path: '/mala-direta', label: 'Mala Direta', icon: 'paper-plane', perm: 'malaDireta' },
    { path: '/tarefas', label: 'Tarefas', icon: 'tasks', perm: 'tarefas' },
    { path: '/usuarios', label: 'Usuários', icon: 'users', perm: 'usuarios' },
    { path: '/configuracoes', label: 'Configurações', icon: 'cog', perm: 'configuracoes' },
    { path: '/auditoria', label: 'Auditoria', icon: 'shield-alt', perm: 'auditoria' },
    { path: '/sobre', label: 'Sobre', icon: 'info-circle', perm: null },
  ];

  return (
    <>
      {/* Mobile Back Button (only where needed, maybe in Header instead) */}

      <div className={`w-64 bg-slate-900 h-screen flex flex-col fixed left-0 top-0 text-slate-300 shadow-xl z-[90] transition-transform duration-300 hidden lg:flex`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          {(appLogo || systemSettings.appLogo) ? (
            <img src={appLogo || systemSettings.appLogo} alt="SenseiRM" className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
          ) : (
            // VIS-04: Fallback usa inicial da empresa em vez do texto fixo 'SEN'
            <div className="bg-primary w-10 h-10 rounded-lg text-white flex items-center justify-center font-black text-xl tracking-tighter shadow-lg">
              {(appName || systemSettings.companyName)?.charAt(0)?.toUpperCase() || 'S'}
            </div>
          )}
          <div>
            <h1 className="text-white leading-none"><SenseiLogo className="text-lg" /></h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{(appName || systemSettings.companyName)}</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              if (item.perm && !hasPermission(item.perm as any, 'acesso')) return null;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Icon name={item.icon} className={isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200'} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 bg-slate-800/50 m-4 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            {currentUser?.foto ? (
              <img src={currentUser.foto} alt={currentUser.nome} className="w-10 h-10 rounded-full border-2 border-primary/30 object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {currentUser?.nome?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold truncate">{currentUser?.nome}</p>
              <p className="text-xs text-slate-500 uppercase tracking-tighter">{roles.find(r => r.id === currentUser?.roleId)?.name}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-50/50 dark:bg-slate-800/30/20 hover:text-red-400 transition-all rounded-lg text-sm font-bold">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
    </>
  );
};

const BottomNavigation = () => {
  const { hasPermission } = useApp();
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainItems = [
    { path: '/dashboard', label: 'Início', icon: 'chart-line', perm: 'dashboard' },
    { path: '/calendario', label: 'Agenda', icon: 'calendar', perm: 'calendario' },
    { path: '/clientes', label: 'Clientes', icon: 'address-book', perm: 'clientes' },
    { path: '/tarefas', label: 'Tarefas', icon: 'tasks', perm: 'tarefas' },
  ];

  const moreItems = [
    { path: '/mala-direta', label: 'Mala Direta', icon: 'paper-plane', perm: 'malaDireta' },
    { path: '/usuarios', label: 'Usuários', icon: 'users', perm: 'usuarios' },
    { path: '/configuracoes', label: 'Config.', icon: 'cog', perm: 'configuracoes' },
    { path: '/auditoria', label: 'Auditoria', icon: 'shield-alt', perm: 'auditoria' },
    { path: '/sobre', label: 'Sobre', icon: 'info-circle', perm: null },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-20 px-4 flex items-center justify-around z-[95] lg:hidden pb-safe">
        {mainItems.map(item => {
          if (item.perm && !hasPermission(item.perm as any, 'acesso')) return null;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-slate-400'}`}
            >
              <div className={`p-2 rounded-xl ${isActive ? 'bg-primary/10' : ''}`}>
                <Icon name={item.icon} className="text-xl" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
        {/* USA-04: ícone corrigido de 'ellipsis-h' (FA) para 'more-horizontal' (Lucide) */}
        <button 
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center gap-1 transition-all ${isMoreMenuOpen ? 'text-primary' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl ${isMoreMenuOpen ? 'bg-primary/10' : ''}`}>
            <MoreHorizontal size={18} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Mais</span>
        </button>
      </nav>

      {/* More Menu Drawer */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMoreMenuOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8 cursor-pointer" onClick={() => setIsMoreMenuOpen(false)} />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Menu Adicional</h3>
              {/* RES-02: ThemeToggle acessível no mobile via drawer 'Mais' */}
              <ThemeToggle showLabel />
            </div>
            <div className="grid grid-cols-3 gap-6">
              {moreItems.map(item => {
                if (item.perm && !hasPermission(item.perm as any, 'acesso')) return null;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                      <Icon name={item.icon} className="text-xl" />
                    </div>
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
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
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
      >
        <Icon name="bell" className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-slate-50/50 dark:bg-slate-800/50 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 w-[95vw] lg:w-[90vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Notificações</h3>
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 uppercase font-bold tracking-widest transition-colors">
                  Limpar
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                  <Icon name="bell-slash" className="text-3xl mb-2 opacity-20 mx-auto" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-xs font-bold ${!n.read ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>{n.title}</h4>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{n.message}</p>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
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

// VIS-06 + RES-02: ThemeToggle com ícones Sun/Moon, acessível em todas as resoluções
const ThemeToggle = ({ showLabel = false }: { showLabel?: boolean }) => {
  const { theme, toggleTheme } = useApp();
  return (
    <button 
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400"
      title={theme === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      {showLabel && (
        <span className="text-xs font-bold uppercase tracking-widest">
          {theme === 'light' ? 'Escuro' : 'Claro'}
        </span>
      )}
    </button>
  );
};

const Header = ({ title }: { title: React.ReactNode }) => (
  <header className="h-16 lg:h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-colors duration-300">
    <div className="flex items-center gap-3">
      {/* RES-01: Header mobile com branding contextual */}
      <div className="lg:hidden">
        <SenseiLogo className="text-sm text-slate-700 dark:text-slate-200" />
      </div>
      <div className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-50 tracking-tight truncate max-w-[40vw] sm:max-w-[50vw]">{title}</div>
    </div>
    <div className="flex items-center gap-2 md:gap-3">
      {/* ThemeToggle visível em desktop com label, sinóptico no mobile */}
      <div className="hidden sm:block">
        <ThemeToggle showLabel />
      </div>
      <div className="sm:hidden">
        <ThemeToggle />
      </div>
      <NotificationsPopover />
    </div>
  </header>
);

const StatCard = ({ label, value, icon, color, subText }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer">
    <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shrink-0`}>
      <Icon name={icon} className="text-2xl" />
    </div>
    <div className="overflow-hidden">
      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest truncate">{label}</p>
      <p className="text-2xl font-black text-slate-800 dark:text-slate-50 leading-none mt-1">{value}</p>
      {subText && <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-2 truncate italic">{subText}</p>}
    </div>
  </div>
);

// --- Pages ---

const CalendarView = () => {
  const { tasks, users, sectors, updateSync, hasPermission, addTask } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  
  // Filters State
  const [filters, setFilters] = useState({
    responsavelId: '',
    setorId: '',
    prioridade: '',
    status: ''
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate)
  });

  const next = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const prev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.responsavelId && t.responsavelId !== filters.responsavelId) return false;
      if (filters.setorId && t.setorId !== filters.setorId) return false;
      if (filters.prioridade && t.prioridade !== filters.prioridade) return false;
      if (filters.status && t.status !== filters.status) return false;
      return true;
    });
  }, [tasks, filters]);

  const getTasksForDay = (day: Date) => {
    return filteredTasks.filter(t => t.dataVencimento && isSameDay(parseISO(t.dataVencimento), day));
  };

  const getPriorityClasses = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL: return 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200 dark:shadow-red-900/20';
      case TaskPriority.HIGH: return 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-200 dark:shadow-orange-900/20';
      case TaskPriority.MEDIUM: return 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200 dark:shadow-blue-900/20';
      default: return 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200 dark:shadow-slate-900/20';
    }
  };

  const navigate = useNavigate();
  const handleQuickCreate = (day: Date) => {
    if (!hasPermission('tarefas', 'incluir')) return;
    navigate('/tarefas', { state: { openModal: true, initialDate: day.toISOString().split('T')[0] } });
  };

  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDayDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && hasPermission('tarefas', 'editar')) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const newDate = day.toISOString().split('T')[0];
        const updatedTask = { ...task, dataVencimento: newDate };
        updateTask(updatedTask);
        if (success) success(`Prazo de "${task.titulo}" alterado para ${format(day, 'dd/MM/yyyy')}`);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 flex flex-col h-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
               <Icon name="calendar" />
             </div>
             <h1 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tight">Calendário de Prazos</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">Central de inteligência temporal e gestão de vencimentos</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* View Toggles */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
            {[
              { id: 'month', label: 'Mês' },
              { id: 'week', label: 'Semana' },
              { id: 'day', label: 'Lista' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === mode.id ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 ml-auto xl:ml-0">
            <button onClick={prev} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-400">
              <Icon name="chevron-left" />
            </button>
            <button onClick={goToToday} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-700">Hoje</button>
            <span className="px-4 font-black text-slate-700 dark:text-slate-200 min-w-[160px] text-center uppercase tracking-widest text-xs">
              {format(currentDate, viewMode === 'day' ? 'dd MMMM yyyy' : 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={next} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-400">
              <Icon name="chevron-right" />
            </button>
          </div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="flex flex-wrap items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mr-2">
          <Icon name="filter" className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Filtros:</span>
        </div>
        
        <select 
          value={filters.responsavelId}
          onChange={e => setFilters(f => ({ ...f, responsavelId: e.target.value }))}
          className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary transition-all min-w-[150px]"
        >
          <option value="">Todos Responsáveis</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>

        <select 
          value={filters.setorId}
          onChange={e => setFilters(f => ({ ...f, setorId: e.target.value }))}
          className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary transition-all min-w-[150px]"
        >
          <option value="">Todos Setores</option>
          {sectors.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <select 
          value={filters.prioridade}
          onChange={e => setFilters(f => ({ ...f, prioridade: e.target.value }))}
          className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary transition-all"
        >
          <option value="">Prioridades</option>
          {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select 
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary transition-all"
        >
          <option value="">Status</option>
          {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {(filters.responsavelId || filters.setorId || filters.prioridade || filters.status) && (
          <button 
            onClick={() => setFilters({ responsavelId: '', setorId: '', prioridade: '', status: '' })}
            className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-colors ml-auto mr-4"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* CALENDAR BODY */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
        {viewMode === 'month' && (
          <>
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dayTasks = getTasksForDay(day);
                const isCurMonth = isSameMonth(day, monthStart);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => handleQuickCreate(day)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDayDrop(e, day)}
                    className={`min-h-[72px] md:min-h-[110px] lg:min-h-[160px] p-1.5 md:p-3 border-r border-b border-slate-50 dark:border-slate-800/50 transition-all hover:bg-slate-50/70 dark:hover:bg-slate-800/30 cursor-pointer group ${!isCurMonth ? 'bg-slate-50/50 dark:bg-slate-800/30 dark:bg-slate-900/50 opacity-40' : ''} ${isWeekend ? 'bg-slate-50/20 dark:bg-slate-800/10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[11px] font-black w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-xl md:rounded-2xl transition-all ${isToday(day) ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : isCurMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                        {format(day, 'd')}
                      </span>
                      {hasPermission('tarefas', 'incluir') && (
                        <div className="p-1 text-slate-200 group-hover:text-primary transition-colors">
                          <Plus size={14} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 md:space-y-1.5 md:flex-col">
                      {dayTasks.slice(0, 5).map(task => (
                        <div 
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task.id)}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate('/tarefas', { state: { taskId: task.id } });
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black text-white truncate cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center gap-1.5 ${getPriorityClasses(task.prioridade)}`}
                          title={`${task.taskNumber}: ${task.titulo} (${task.status})`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-300' : task.status === TaskStatus.EXECUTION ? 'bg-blue-300' : 'bg-white/40'}`} />
                          <span className="truncate hidden md:inline">{task.titulo}</span>
                        </div>
                      ))}
                      {dayTasks.length > 5 && (
                        <div className="text-[8px] md:text-[9px] font-black text-primary bg-primary/10 dark:bg-primary/20 text-center py-1 md:py-2 rounded-lg md:rounded-xl mt-1 md:mt-2 border border-primary/10 w-full">
                          + {dayTasks.length - 5} {window.innerWidth < 768 ? '' : 'TAREFAS'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {viewMode === 'week' && (
          <div className="grid grid-cols-7 h-[400px] md:h-[550px] lg:h-[650px]">
            {weekDays.map(day => {
               const dayTasks = getTasksForDay(day);
               const isWeekend = day.getDay() === 0 || day.getDay() === 6;
               return (
                 <div key={day.toString()} onClick={() => handleQuickCreate(day)} className={`flex flex-col border-r border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer ${isWeekend ? 'bg-slate-50/20 dark:bg-slate-800/10' : ''}`}>
                    <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 dark:bg-slate-800/30">
                      <p className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{format(day, 'EEE', { locale: ptBR })}</p>
                      <p className={`text-2xl font-black ${isToday(day) ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>{format(day, 'd')}</p>
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate('/tarefas', { state: { taskId: task.id } });
                          }}
                          className={`p-4 rounded-[1.5rem] text-white shadow-lg hover:brightness-110 transition-all cursor-pointer ${getPriorityClasses(task.prioridade)}`}
                        >
                          <p className="text-xs font-black leading-tight mb-2">{task.titulo}</p>
                          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/20">
                            <Icon name="clock" className="w-3 h-3 text-white/70" />
                            <span className="text-[9px] font-bold text-white/80 uppercase">{task.status}</span>
                          </div>
                        </div>
                      ))}
                      {dayTasks.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                          <Icon name="calendar" className="text-4xl mb-2 text-slate-300" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vazio</p>
                        </div>
                      )}
                    </div>
                 </div>
               );
            })}
          </div>
        )}

        {viewMode === 'day' && (
          <div className="p-8 space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar">
            {filteredTasks.sort((a,b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || '')).map(task => (
              <div 
                key={task.id} 
                onClick={() => navigate('/tarefas', { state: { taskId: task.id } })}
                className="flex items-center gap-6 p-6 rounded-[2rem] bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-white shadow-xl ${getPriorityClasses(task.prioridade)}`}>
                  <p className="text-lg font-black">{task.dataVencimento ? format(parseISO(task.dataVencimento), 'd') : '?'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">{task.titulo}</h4>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">{task.status}</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 font-medium italic">{task.descricao || 'Sem descrição.'}</p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{task.dataVencimento ? format(parseISO(task.dataVencimento), 'MMMM', { locale: ptBR }) : 'Sem data'}</p>
                  <Icon name="chevron-right" className="text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
               <div className="p-20 text-center space-y-4">
                 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                   <Icon name="calendar" className="text-3xl text-slate-200" />
                 </div>
                 <p className="text-slate-400 font-bold italic">Nenhuma tarefa encontrada para os filtros selecionados.</p>
               </div>
            )}
          </div>
        )}
      </div>
      
      {/* Task Details Modal - Optimized with Premium UI */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100" onClick={() => setSelectedTask(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 w-[95vw] lg:w-[90vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* RES-04: padding e altura responsivos — mobile-first */}
            <div className={`h-24 md:h-32 p-4 md:p-8 flex justify-between items-start ${getPriorityClasses(selectedTask.prioridade)}`}>

              <div className="px-5 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Prioridade {selectedTask.prioridade}
              </div>
              <button onClick={() => setSelectedTask(null)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all border border-white/20 shadow-sm">
                <Icon name="x" />
              </button>
            </div>
            
            <div className="p-5 md:p-8 -mt-6 md:-mt-8 bg-white dark:bg-slate-900 rounded-t-[2rem] md:rounded-t-[3rem] relative">
              <h3 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-3 md:mb-4 tracking-tighter">{selectedTask.titulo}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base mb-6 md:mb-10 leading-relaxed font-medium">{selectedTask.descricao || 'Nenhuma descrição detalhada fornecida para esta tarefa.'}</p>
              
              <div className="grid grid-cols-2 gap-3 md:gap-6 mb-6 md:mb-10">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner group hover:bg-white dark:hover:bg-slate-800 transition-all">
                  <span className="block text-xs font-black text-slate-500 dark:text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-2">
                    <Icon name="activity" className="w-3 h-3" /> Status Atual
                  </span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">{selectedTask.status}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner group hover:bg-white dark:hover:bg-slate-800 transition-all">
                  <span className="block text-xs font-black text-slate-500 dark:text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-2">
                    <Icon name="calendar" className="w-3 h-3" /> Prazo de Entrega
                  </span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">{selectedTask.dataVencimento ? format(parseISO(selectedTask.dataVencimento), 'dd/MM/yyyy') : 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Voltar
                </button>
                <Link 
                  to="/tarefas" 
                  onClick={() => setSelectedTask(null)}
                  className="flex-[2] py-5 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/40 hover:brightness-110 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Icon name="external-link" /> Gestão Completa
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  console.log('[App] Rendering Dashboard...');
  const { clients, tasks, users, currentUser, updateSync, hasPermission, roles, auditLogs } = useApp();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const canViewAllTasks = hasPermission('tarefas', 'leitura');
  const canViewAllUsers = hasPermission('usuarios', 'leitura');

  // Membros calculados para KPIs
  const kpis = useMemo(() => {
    // Escopo de tarefas
    const scopeTasks = canViewAllTasks ? tasks : tasks.filter(t => t.responsavelId === currentUser?.id);
    const now = new Date();
    
    // Indicadores de CLIENTES
    const clientsActive = clients.filter(c => c.status === EntityStatus.ACTIVE).length;
    const clientsInactive = clients.filter(c => c.status === EntityStatus.INACTIVE).length;
    const clientsBlocked = clients.filter(c => c.status === EntityStatus.BLOCKED || c.situacao === 'Bloqueado para venda').length;

    // Indicadores de USUàRIOS
    const usersActive = users.filter(u => u.status === EntityStatus.ACTIVE).length;
    const usersInactive = users.filter(u => u.status === EntityStatus.INACTIVE).length;
    const usersAdmin = users.filter(u => u.roleId === 'admin').length;
    const usersStandard = users.filter(u => u.roleId !== 'admin').length;

    // Indicadores de TAREFAS
    const tasksCompleted = scopeTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const tasksInProgress = scopeTasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED).length;
    const tasksOverdue = scopeTasks.filter(t => {
      if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELED || !t.dataVencimento) return false;
      return new Date(t.dataVencimento) < now;
    }).length;

    // Dados para Gráficos
    const taskStatusData = [
      { name: 'Concluídas', value: tasksCompleted, color: '#10b981' },
      { name: 'Em Andamento', value: tasksInProgress - tasksOverdue, color: '#3b82f6' },
      { name: 'Atrasadas', value: tasksOverdue, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const clientStatusData = [
      { name: 'Ativos', value: clientsActive, color: '#10b981' },
      { name: 'Inativos', value: clientsInactive, color: '#94a3b8' },
      { name: 'Bloqueados', value: clientsBlocked, color: '#f43f5e' }
    ].filter(d => d.value > 0);

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
      totalUsers: users.length,
      tasksCompleted, tasksInProgress, tasksOverdue,
      totalClients: clients.length,
      adimplenceRate, avgRating,
      rankedClients, taskStatusData, clientStatusData
    };
  }, [clients, tasks, users, currentUser, canViewAllTasks]);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPass = formData.get('currentPass') as string;
    const newPass = formData.get('newPass') as string;
    const confirmPass = formData.get('confirmPass') as string;

    if (newPass !== confirmPass) {
      return toast({ title: 'Erro', message: 'As senhas não coincidem.', type: 'error' });
    }

    if (currentPass !== currentUser?.senha) {
      return toast({ title: 'Erro', message: 'Senha atual incorreta.', type: 'error' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPass)) {
      return toast({ 
        title: 'Senha Fraca', 
        message: 'A nova senha deve ter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma minúscula, um número e um caractere especial.', 
        type: 'warning' 
      });
    }

    try {
      const updatedUser = { ...currentUser, senha: newPass };
      await updateSync('users', 'UPDATE', updatedUser);
      
      auditService.log(currentUser?.id || 'sys', currentUser?.nome || 'Sistema', 'UPDATE', 'AUTH', 'Senha alterada pelo usuário.', currentUser?.id);
      
      toast({ title: 'Sucesso', message: 'Senha alterada com sucesso!', type: 'success' });
      setIsPasswordModalOpen(false);
    } catch (err) {
      toast({ title: 'Erro', message: 'Falha ao alterar senha.', type: 'error' });
    }
  };

  // AUD-04: Warning at 80% log limit
  const logLimit = 5000;
  const showLogLimitWarning = auditLogs.length > (logLimit * 0.8);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
      {/* AUD-04: Alerta visual de limite de logs */}
      {showLogLimitWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Icon name="exclamation-triangle" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">Base de Auditoria Quase Cheia</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Você atingiu <strong>{auditLogs.length}</strong> de 5.000 logs permitidos. Considere realizar uma limpeza.</p>
            </div>
          </div>
          <Link to="/auditoria" className="px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shrink-0 shadow-lg shadow-amber-600/20">
            Limpar Agora
          </Link>
        </div>
      )}
      
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-50 tracking-tight">Olá, {currentUser?.nome?.split(' ')[0] || 'Usuário'} 👋</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aqui está o resumo das suas operações hoje.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex-1 lg:flex-none justify-center items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex"
          >
            <Icon name="key" className="w-4 h-4" />
            Alterar Senha
          </button>
          {hasPermission('clientes', 'incluir') && (
            <button 
              onClick={() => navigate('/clientes', { state: { openModal: true } })}
              className="flex-1 lg:flex-none justify-center items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light hover:bg-primary hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex"
            >
              <Icon name="building-plus" className="w-4 h-4" />
              Novo Cliente
            </button>
          )}
          {hasPermission('tarefas', 'incluir') && (
            <button 
              onClick={() => navigate('/tarefas', { state: { openModal: true } })}
              className="flex-1 lg:flex-none justify-center items-center gap-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex"
            >
              <Icon name="file-plus" className="w-4 h-4" />
              Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* OPERACIONAL (Tarefas) - Ocupa 8 colunas */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link to="/tarefas" className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Icon name="check-circle" className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-800 dark:text-slate-50">{kpis.tasksCompleted}</span>
              </div>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Concluídas</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Tarefas finalizadas com sucesso</p>
            </div>
          </Link>

          <Link to="/tarefas" className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Icon name="play-circle" className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-800 dark:text-slate-50">{kpis.tasksInProgress}</span>
              </div>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Em Andamento</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Demandas em execução ativa</p>
            </div>
          </Link>

          <Link to="/tarefas" className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl">
                  <Icon name="alert-circle" className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-red-600 dark:text-red-400">{kpis.tasksOverdue}</span>
              </div>
              <p className="text-xs font-black text-red-500 dark:text-red-400 uppercase tracking-widest">Atrasadas</p>
              <p className="text-[10px] text-red-400 dark:text-red-500 mt-1 font-bold">Atenção urgente necessária</p>
            </div>
          </Link>

          {/* SECURITY STATUS (New) */}
          <div className="bg-slate-900 p-6 rounded-3xl shadow-sm relative overflow-hidden group col-span-full sm:col-span-1">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/10 text-emerald-400 rounded-2xl">
                  <Icon name="shield" className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sessão Segura</span>
                  <span className="text-[10px] font-bold text-slate-400">Expira em 30m</span>
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-widest">Status de Segurança</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-medium">Proteção de dados ativa</p>
              </div>
            </div>
          </div>
        </div>

        {/* GRàFICO DE TAREFAS - Ocupa 4 colunas */}
        <div className="md:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-[300px]">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-50 uppercase tracking-widest mb-4">Distribuição de Tarefas</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kpis.taskStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {kpis.taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-white)', color: 'var(--tw-colors-slate-800)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RANKING DE CLIENTES - Ocupa 12 colunas */}
        <div className="md:col-span-12 bg-white dark:bg-slate-900 p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl">
                <Icon name="award" className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-50 uppercase tracking-widest">Top Clientes (Avaliação)</h3>
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">Média: <span className="text-amber-500">{kpis.avgRating}</span> <Icon name="star" className="w-3 h-3 inline pb-0.5" /></span>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-4">
            {kpis.rankedClients.map((c, idx) => (
              <Link to="/clientes" key={c.id} className="bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800 transition-all flex flex-col items-center text-center relative group">
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 dark:bg-amber-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-sm z-10">
                  {idx + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Icon name="building" className="text-sm text-slate-600 dark:text-slate-400" />
                </div>
                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 line-clamp-2 h-8 flex items-center justify-center mb-2" title={c.nomeRazaoSocial}>
                  {c.nomeRazaoSocial}
                </p>
                <div className="flex gap-0.5 text-amber-400 dark:text-amber-500">
                  {[1,2,3,4,5].map(i => <Icon key={i} name="star" className={`w-3 h-3 ${i <= (c.avaliacaoInterna || 0) ? 'fill-current' : 'opacity-30'}`} />)}
                </div>
              </Link>
            ))}
            {kpis.rankedClients.length === 0 && (
              <div className="col-span-full flex items-center justify-center text-slate-400 dark:text-slate-500 italic font-medium text-sm">
                Nenhuma avaliação registrada para compor o ranking.
              </div>
            )}
          </div>
        </div>

        {/* CLIENTES OVERVIEW - Ocupa 6 colunas */}
        <div className={`${canViewAllUsers ? 'md:col-span-6' : 'md:col-span-12'} bg-primary dark:bg-primary-dark text-white p-6 rounded-2xl md:rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between group`}>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 dark:bg-black/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 dark:bg-black/20 rounded-xl backdrop-blur-sm">
                <Icon name="briefcase" className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Base de Clientes</h3>
            </div>
            
            <div className="mb-6">
              <span className="text-5xl font-black tracking-tighter">{kpis.totalClients}</span>
              <span className="text-primary-foreground/70 dark:text-white/70 text-sm ml-2 font-medium">total</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary-foreground/80 dark:text-white/80 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Ativos</span>
                <span className="font-bold">{kpis.clientsActive}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary-foreground/80 dark:text-white/80 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/40 dark:bg-white/20" /> Inativos</span>
                <span className="font-bold">{kpis.clientsInactive}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary-foreground/80 dark:text-white/80 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400" /> Bloqueados</span>
                <span className="font-bold">{kpis.clientsBlocked}</span>
              </div>
            </div>
          </div>
          
          <Link to="/clientes" className="relative z-10 mt-6 w-full py-3 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 backdrop-blur-sm rounded-xl text-center text-xs font-bold uppercase tracking-widest transition-colors">
            Ver Todos
          </Link>
        </div>

        {/* USUàRIOS OVERVIEW - Ocupa 6 colunas */}
        {canViewAllUsers && (
          <div className="md:col-span-6 bg-slate-800 dark:bg-slate-950 text-white p-6 rounded-2xl md:rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Icon name="users" className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest">Usuários do Sistema</h3>
              </div>
              
              <div className="mb-6">
                <span className="text-5xl font-black tracking-tighter">{kpis.totalUsers}</span>
                <span className="text-white/50 text-sm ml-2 font-medium">total</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Ativos</span>
                  <span className="font-bold">{kpis.usersActive}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500" /> Inativos</span>
                  <span className="font-bold">{kpis.usersInactive}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Administradores</span>
                  <span className="font-bold">{kpis.usersAdmin}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /> Outros Perfis</span>
                  <span className="font-bold">{kpis.usersStandard}</span>
                </div>
              </div>
            </div>
            
            <Link to="/usuarios" className="relative z-10 mt-6 w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-center text-xs font-bold uppercase tracking-widest transition-colors">
              Gerenciar Usuários
            </Link>
          </div>
        )}

      </div>

      {/* PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-200 border border-slate-100 dark:border-slate-800 w-[95vw] lg:w-[90vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-50">Alterar Senha</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <Icon name="times" className="text-xl" />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">Senha Atual</label>
                <input 
                  type="password" 
                  name="currentPass" 
                  required 
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:border-primary dark:focus:border-primary transition-all font-medium text-sm text-slate-800 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">Nova Senha</label>
                <input 
                  type="password" 
                  name="newPass" 
                  required 
                  minLength={6}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:border-primary dark:focus:border-primary transition-all font-medium text-sm text-slate-800 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  name="confirmPass" 
                  required 
                  minLength={6}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:border-primary dark:focus:border-primary transition-all font-medium text-sm text-slate-800 dark:text-slate-50"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all text-sm"
                >
                  Salvar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientsPage = () => {
  const { clients, addClient, updateClient, deleteClient, currentUser, clientCategories, users, customFields, hasPermission } = useApp();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'id' | 'end' | 'cont' | 'fin' | 'crm' | 'anexos' | 'interacoes' | 'diag'>('id');
  const [contactPeople, setContactPeople] = useState<ContactPerson[]>([]);
  const [tipoPessoa, setTipoPessoa] = useState<'Física' | 'Jurídica'>('Jurídica');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState<EntityStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');
  const [filterSituacao, setFilterSituacao] = useState<string | 'all'>('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (location.state?.openModal) {
      setEditingClient(null);
      setIsViewOnly(false);
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
  const [isChavePixValid, setIsChavePixValid] = useState(true);
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [status, setStatus] = useState<EntityStatus>(EntityStatus.ACTIVE);
  const [chavePix, setChavePix] = useState('');
  const [tipoChavePix, setTipoChavePix] = useState<'CPF/CNPJ' | 'E-mail' | 'Telefone' | 'Aleatória'>('CPF/CNPJ');

  // Aditional Controlled States for Clients (Fixing multi-tab data loss)
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [pais, setPais] = useState('Brasil');
  const [telefonePrincipal, setTelefonePrincipal] = useState('');
  const [telefoneSecundario, setTelefoneSecundario] = useState('');
  const [emailPrincipal, setEmailPrincipal] = useState('');
  const [emailFinanceiro, setEmailFinanceiro] = useState('');
  const [site, setSite] = useState('');
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState('Corrente');
  const [categoria, setCategoria] = useState('');
  const [origem, setOrigem] = useState('Site');
  const [observacoes, setObservacoes] = useState('');
  const [situacao, setSituacao] = useState('Ativo');
  const [motivoBloqueio, setMotivoBloqueio] = useState('');
  const [dataUltimaVenda, setDataUltimaVenda] = useState('');
  const [avaliacaoInterna, setAvaliacaoInterna] = useState(0);
  const [customData, setCustomData] = useState<Record<string, any>>({});

  // Address lookup states
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [newInteractionType, setNewInteractionType] = useState<'EMAIL' | 'CALL' | 'MEETING' | 'NOTE' | 'WHATSAPP'>('NOTE');
  const [newInteractionDesc, setNewInteractionDesc] = useState('');
  const lastCnpjSearched = useRef('');
  const lastCepSearched = useRef('');

  // Today for date validations
  const today = new Date().toISOString().split('T')[0];

  const canEdit = hasPermission('clientes', 'editar');
  const canDelete = hasPermission('clientes', 'excluir');
  const canInclude = hasPermission('clientes', 'incluir');

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
      setInteractions(editingClient.interactions || []);

      // Initialization for additional controlled states
      setInscricaoMunicipal(editingClient.inscricaoMunicipal || '');
      setNumero(editingClient.numero || '');
      setComplemento(editingClient.complemento || '');
      setPais(editingClient.pais || 'Brasil');
      setTelefonePrincipal(editingClient.telefonePrincipal || '');
      setTelefoneSecundario(editingClient.telefoneSecundario || '');
      setEmailPrincipal(editingClient.emailPrincipal || '');
      setEmailFinanceiro(editingClient.emailFinanceiro || '');
      setSite(editingClient.site || '');
      setBanco(editingClient.banco || '');
      setAgencia(editingClient.agencia || '');
      setConta(editingClient.conta || '');
      setTipoConta(editingClient.tipoConta || 'Corrente');
      setCategoria(editingClient.categoria || '');
      setOrigem(editingClient.origem || 'Site');
      setObservacoes(editingClient.observacoes || '');
      setSituacao(editingClient.situacao || 'Ativo');
      setMotivoBloqueio(editingClient.motivoBloqueio || '');
      setDataUltimaVenda(editingClient.dataUltimaVenda || '');
      setAvaliacaoInterna(editingClient.avaliacaoInterna || 0);
      setCustomData(editingClient.customData || {});

      // Sync search refs to avoid redundant calls for existing data
      lastCnpjSearched.current = (editingClient.documento || '').replace(/\D/g, '');
      lastCepSearched.current = (editingClient.cep || '').replace(/\D/g, '');
    } else {
      if (!isModalOpen) setIsViewOnly(false);
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
      setInteractions([]);

      // Reset search refs for new registrations
      lastCnpjSearched.current = '';
      lastCepSearched.current = '';

      // Reset for additional controlled states
      setInscricaoMunicipal('');
      setNumero('');
      setComplemento('');
      setPais('Brasil');
      setTelefonePrincipal('');
      setTelefoneSecundario('');
      setEmailPrincipal('');
      setEmailFinanceiro('');
      setSite('');
      setBanco('');
      setAgencia('');
      setConta('');
      setTipoConta('Corrente');
      setCategoria('');
      setOrigem('Site');
      setObservacoes('');
      setSituacao('Ativo');
      setMotivoBloqueio('');
      setDataUltimaVenda('');
      setAvaliacaoInterna(0);
      setCustomData({});
    }
  }, [editingClient, isModalOpen]);

  const [isProxyMode, setIsProxyMode] = useState(true);
  const [diagResults, setDiagResults] = useState<any>(null);
  const [isDiagRunning, setIsDiagRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsDiagRunning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/diag/connectivity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const results = await response.json();
        setDiagResults(results);
        const allOk = results.tests.every((t: any) => t.ok);
        if (!allOk) {
          toast({ 
            title: 'Bloqueio Detectado', 
            message: 'O servidor está sem acesso à internet. Use o Modo de Compatibilidade.', 
            type: 'warning' 
          });
        } else {
          toast({ title: 'Diagnóstico Concluído', message: 'Servidor conectado!', type: 'success' });
        }
      } else {
        toast({ title: 'Falha no Servidor', message: `Erro ${response.status}: Não foi possível iniciar o diagnóstico.`, type: 'error' });
      }
    } catch (err) {
      toast({ title: 'Erro de Diagnóstico', message: 'Não foi possível comunicar com o servidor de diagnóstico.', type: 'error' });
    } finally {
      setIsDiagRunning(false);
    }
  };

  const fetchCnpjData = async (cleanCnpj: string, signal?: AbortSignal) => {
    if (cleanCnpj === lastCnpjSearched.current) return;
    lastCnpjSearched.current = cleanCnpj;
    setLoadingCnpj(true);
    
    // Mostramos apenas UM toast de busca no início de todo o processo
    toast({ message: `Buscando dados do CNPJ ${formatDocumento(cleanCnpj)}...`, type: 'info' });
    
    let currentLookupMode = isProxyMode ? 'proxy' : 'browser';
    let data = null;

    try {
      // --- FASE 1: TENTATIVA VIA PROXY SERVIDOR ---
      if (currentLookupMode === 'proxy') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/lookup/cnpj/${cleanCnpj}`, {
            signal,
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            data = await response.json();
          } else {
            console.warn(`[Lookup] Servidor retornou status ${response.status}`);
          }
        } catch (e) {
          console.error("[Lookup] Erro na requisição via servidor:", e);
        }
      }

      // --- FASE 2: FALLBACK IMEDIATO VIA NAVEGADOR (CROSS-ORIGIN) ---
      // Se não temos dados (seja por falha do servidor ou modo navegador já ativo)
      if (!data) {
        if (currentLookupMode === 'proxy') {
           setIsProxyMode(false);
           currentLookupMode = 'browser';
           console.log("[Lookup] Ativando fallback para o navegador...");
        }

        try {
          const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, { 
            signal,
            referrerPolicy: "no-referrer"
          });
          if (resBrasil.ok) {
            data = await resBrasil.json();
          } else {
            const resPublica = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`, { 
              signal,
              referrerPolicy: "no-referrer"
            });
            if (resPublica.ok) {
              const temp = await resPublica.json();
              data = {
                razao_social: temp.razao_social,
                nome_fantasia: temp.estabelecimento?.nome_fantasia,
                estabelecimento: temp.estabelecimento
              };
            }
          }
        } catch (e) {
           console.error("[Lookup] Erro na busca direta via navegador:", e);
        }
      }

      // --- FASE 3: PROCESSAMENTO DOS RESULTADOS ---
      if (data) {
        setNomeRazaoSocial(data.razao_social || data.nome || '');
        setNomeFantasia(data.nome_fantasia || data.estabelecimento?.nome_fantasia || '');
        const ie = data.estabelecimento?.inscricoes_estaduais?.[0]?.inscricao_estadual;
        setInscricaoEstadual(ie || '');
        toast({ title: 'CNPJ Localizado', message: `Sucesso via ${currentLookupMode === 'proxy' ? 'Servidor' : 'Navegador'}.`, type: 'success' });
      } else {
        toast({ title: 'Não Localizado', message: `Dados não encontrados via ${currentLookupMode === 'proxy' ? 'SERVIDOR' : 'NAVEGADOR'}. Verifique o número.`, type: 'warning' });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("[Lookup] Erro crítico final:", err);
      toast({ title: 'Falha de Conexão', message: `Erro ao buscar (${currentLookupMode === 'proxy' ? 'SERVIDOR' : 'NAVEGADOR'}): ${err.message || 'Bloqueio de Rede'}.`, type: 'error' });
    } finally {
      setLoadingCnpj(false);
    }
  };

  const fetchCepData = async (cleanCep: string, signal?: AbortSignal) => {
    if (cleanCep === lastCepSearched.current) return;
    lastCepSearched.current = cleanCep;
    setLoadingCep(true);
    toast({ message: 'Buscando endereço...', type: 'info' });
    
    let currentLookupMode = isProxyMode ? 'proxy' : 'browser';
    let data = null;

    try {
      // --- FASE 1: PROXY ---
      if (currentLookupMode === 'proxy') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/lookup/cep/${cleanCep}`, {
            signal,
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            data = await response.json();
          }
        } catch (e) {
          console.error("[CEP] Erro no servidor:", e);
        }
      }

      // --- FASE 2: FALLBACK ---
      if (!data) {
         if (currentLookupMode === 'proxy') setIsProxyMode(false);
         currentLookupMode = 'browser';
         try {
           const resBrasil = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, { signal });
           if (resBrasil.ok) {
             data = await resBrasil.json();
           } else {
             const resVia = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, { signal });
             const temp = await resVia.json();
             if (!temp.erro) data = temp;
           }
         } catch (e) {
           console.error("[CEP] Erro no navegador:", e);
         }
      }

      if (data) {
        setLogradouro(data.street || data.logradouro || '');
        setBairro(data.neighborhood || data.bairro || '');
        setCidade(data.city || data.localidade || '');
        setUf(data.state || data.uf || '');
        toast({ title: 'Endereço Atualizado', message: `Sucesso via ${currentLookupMode === 'proxy' ? 'Servidor' : 'Navegador'}.`, type: 'success' });
      } else {
        toast({ title: 'CEP não encontrado', message: 'Endereço não localizado.', type: 'warning' });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("[CEP] Erro crítico:", err);
      toast({ title: 'Falha na Busca', message: 'Não foi possível localizar o endereço.', type: 'error' });
    } finally {
      setLoadingCep(false);
    }
  };

  useEffect(() => {
    const abortCtrl = new AbortController();
    const raw = documento.replace(/\D/g, "");
    
    if (tipoPessoa === 'Jurídica' && raw.length === 14) {
      if (validateCNPJ(documento)) {
        fetchCnpjData(raw, abortCtrl.signal);
      } else {
        toast({ title: 'CNPJ Inválido', message: 'O dígito verificador informado não é válido. Verifique o número.', type: 'warning' });
      }
    } else if (tipoPessoa === 'Jurídica' && raw.length < 14) {
      lastCnpjSearched.current = '';
    } else if (tipoPessoa === 'Física' && raw.length === 11) {
       if (!editingClient) {
          toast({ title: 'Aviso', message: 'A busca automática só está disponível para empresas (CNPJ).', type: 'info' });
       }
    }

    return () => abortCtrl.abort();
  }, [documento, tipoPessoa]);

  useEffect(() => {
    const abortCtrl = new AbortController();
    const raw = cep.replace(/\D/g, "");
    
    if (raw.length === 8) {
      fetchCepData(raw, abortCtrl.signal);
    } else if (raw.length < 8) {
      lastCepSearched.current = '';
    }

    return () => abortCtrl.abort();
  }, [cep]);

  const handleDocumentoChange = (val: string) => {
    const masked = tipoPessoa === 'Jurídica' ? maskCNPJ(val) : maskCPF(val);
    setDocumento(masked);
    const raw = masked.replace(/\D/g, "");
    if (raw.length > 0) {
      setIsDocumentoValid(tipoPessoa === 'Jurídica' ? validateCNPJ(masked) : validateCPF(masked));
    } else {
      setIsDocumentoValid(true);
    }
  };

  const handleCepChange = (val: string) => {
    const masked = maskCEP(val);
    setCep(masked);
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

    if (!isDocumentoValid || !isChavePixValid) {
      setActiveTab(!isDocumentoValid ? 'id' : 'fin');
      toast({ 
        title: 'Erro de Validação', 
        message: !isDocumentoValid ? 'Por favor, corrija o documento (CPF/CNPJ) do cliente.' : 'Por favor, corrija a Chave PIX informada.', 
        type: 'error' 
      });
      return;
    }

    // Duplicate check for new clients
    if (!editingClient) {
      const cleanDoc = documento.replace(/\D/g, '');
      const duplicate = clients.find(c => c.documento.replace(/\D/g, '') === cleanDoc);
      if (duplicate) {
        toast({ 
          title: 'Cliente Duplicado', 
          message: `Já existe um cliente cadastrado com este documento (${formatDocumento(cleanDoc)}): ${duplicate.nomeRazaoSocial}`, 
          type: 'warning' 
        });
        setActiveTab('id');
        return;
      }
    }

    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    const client: Client = {
      ...editingClient,
      id: editingClient?.id || generateUUID(),
      clientCode: editingClient?.clientCode || `CLI-${String(clients.length + 1).padStart(3, '0')}`,
      tipoPessoa: tipoPessoa,
      nomeRazaoSocial: nomeRazaoSocial,
      nomeFantasia: nomeFantasia,
      documento: documento,
      inscricaoEstadual: tipoPessoa === 'Jurídica' ? inscricaoEstadual : '',
      inscricaoMunicipal: inscricaoMunicipal,
      dataCadastro: editingClient?.dataCadastro || new Date().toISOString(),
      status: status,
      
      cep: cep,
      logradouro: logradouro,
      numero: numero,
      complemento: complemento,
      bairro: bairro,
      cidade: cidade,
      uf: uf,
      pais: pais || 'Brasil',

      telefonePrincipal: telefonePrincipal,
      telefoneSecundario: telefoneSecundario,
      emailPrincipal: emailPrincipal,
      emailFinanceiro: emailFinanceiro,
      site: site,

      pessoasContato: contactPeople,

      banco: banco,
      agencia: agencia,
      conta: conta,
      tipoConta: tipoConta,
      chavePix: chavePix,
      tipoChavePix: tipoChavePix,

      categoria: categoria,
      origem: origem,
      observacoes: observacoes,

      situacao: situacao || 'Ativo',
      motivoBloqueio: motivoBloqueio,
      dataUltimaVenda: dataUltimaVenda,
      avaliacaoInterna: Number(avaliacaoInterna) || 0,
      attachments: attachments,
      interactions: interactions,
      
      customData: customData
    } as Client;

    if (editingClient) updateClient(client); else addClient(client);
    setEditingClient(client);
    if (toast) toast({ message: 'Cliente salvo com sucesso!', type: 'success' });
    setIsModalOpen(false);
  };

  const addContactPerson = () => {
    const newPerson: ContactPerson = {
      id: generateUUID(),
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

  const addInteraction = () => {
    if (!newInteractionDesc.trim()) return;
    const newInteraction: ClientInteraction = {
      id: generateUUID(),
      date: new Date().toISOString(),
      type: newInteractionType,
      description: newInteractionDesc,
      userId: currentUser?.id || ''
    };
    setInteractions([newInteraction, ...interactions]);
    setNewInteractionDesc('');
  };

  const removeInteraction = (id: string) => {
    setInteractions(interactions.filter(i => i.id !== id));
  };

  const clientTabs = [
    { id: 'id', label: 'Identificação', icon: 'id-card' },
    { id: 'end', label: 'Endereço', icon: 'map-marker-alt' },
    { id: 'cont', label: 'Contatos', icon: 'phone' },
    { id: 'fin', label: 'Financeiro', icon: 'wallet' },
    { id: 'crm', label: 'CRM & Gov', icon: 'shield-alt' },
    { id: 'anexos', label: 'Anexos', icon: 'paperclip' },
    { id: 'interacoes', label: 'Interações', icon: 'history' }
  ] as const;

  const currentTabIndex = clientTabs.findIndex(t => t.id === activeTab);

  const handleNextTab = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
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

  const handlePrevTab = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (currentTabIndex > 0) {
      setActiveTab(clientTabs[currentTabIndex - 1].id);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      let importedCount = 0;
      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        const clientData: any = {
          id: Math.random().toString(36).substring(2, 11),
          clientCode: `CLI-${(clients.length + importedCount + 1).toString().padStart(4, '0')}`,
          dataCadastro: new Date().toISOString(),
          status: EntityStatus.ACTIVE,
          situacao: 'Ativo',
          pessoasContato: [],
          interactions: [],
          attachments: [],
          pais: 'Brasil'
        };

        headers.forEach((header, index) => {
          const val = values[index];
          if (!val) return;

          if (header === 'Nome/Razão Social') clientData.nomeRazaoSocial = val;
          if (header === 'Documento') clientData.documento = val;
          if (header === 'Cidade') clientData.cidade = val;
          if (header === 'UF') clientData.uf = val;
          if (header === 'Status') clientData.status = val as EntityStatus;
          if (header === 'Categoria') clientData.categoria = val;
        });

        if (clientData.nomeRazaoSocial && clientData.documento) {
          // Check for duplicates
          const isDuplicate = clients.some(c => c.documento === clientData.documento);
          if (!isDuplicate) {
            addClient(clientData);
            importedCount++;
          }
        }
      });
      
      toast({ title: 'Importação Concluída', message: `${importedCount} novos clientes importados.`, type: 'success' });
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const exportToCSV = () => {
    const headers = ['Código', 'Nome/Razão Social', 'Documento', 'Cidade', 'UF', 'Status', 'Categoria'];
    const csvContent = [
      headers.join(','),
      ...filteredClients.map(c => [
        c.clientCode,
        `"${c.nomeRazaoSocial}"`,
        c.documento,
        `"${c.cidade || ''}"`,
        c.uf || '',
        c.status,
        `"${c.categoria || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const TabButton = ({ id, label, icon, index }: { key?: string, id: any, label: string, icon: string, index: number }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-3.5 border-b-2 transition-all text-[10px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 ${
        activeTab === id
          ? 'border-primary text-primary'
          : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
        activeTab === id ? 'bg-primary text-white' : (index < currentTabIndex ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400')
      }`}>
        {index < currentTabIndex ? <Icon name="check" className="text-[8px]" /> : index + 1}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const filteredClients = useMemo(() => {
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return clients.filter(c => {
      const matchesSearch = c.nomeRazaoSocial.toLowerCase().includes(lowerSearch) ||
        c.clientCode.toLowerCase().includes(lowerSearch) ||
        c.documento.includes(debouncedSearchTerm) ||
        (c.cidade && c.cidade.toLowerCase().includes(lowerSearch));
      
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || c.categoria === filterCategory;
      const matchesSituacao = filterSituacao === 'all' || c.situacao === filterSituacao;

      return matchesSearch && matchesStatus && matchesCategory && matchesSituacao;
    });
  }, [clients, debouncedSearchTerm, filterStatus, filterCategory, filterSituacao]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, filterCategory, filterSituacao]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <p className="text-slate-500 dark:text-slate-400 font-medium">Gestão avançada da carteira de clientes e parceiros.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {selectedClients.length > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-2xl border border-primary/20 animate-in slide-in-from-top-2">
              <span className="text-xs font-bold text-primary">{selectedClients.length} selecionados</span>
              <div className="h-4 w-px bg-primary/20 mx-2" />
              <button 
                onClick={() => {
                  confirm({
                    title: 'Confirmar Exclusão',
                    message: `Deseja excluir ${selectedClients.length} clientes selecionados?`,
                    confirmLabel: 'Excluir',
                    cancelLabel: 'Cancelar',
                    isDestructive: true,
                    onConfirm: () => {
                      selectedClients.forEach(id => deleteClient(id));
                      setSelectedClients([]);
                    }
                  });
                }}
                className="text-[10px] font-black uppercase text-red-600 hover:text-red-700 transition-colors"
              >
                Excluir
              </button>
              <button 
                onClick={() => setSelectedClients([])}
                className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
          <div className="relative flex-1 md:flex-none">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar clientes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium w-full md:w-64 text-slate-800 dark:text-slate-50"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-primary"
            >
              <option value="all">Todos Status</option>
              {Object.values(EntityStatus).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>

            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-primary"
            >
              <option value="all">Todas Categorias</option>
              {clientCategories.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>

            <select 
              value={filterSituacao} 
              onChange={(e) => setFilterSituacao(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-primary"
            >
              <option value="all">Todas Situações</option>
              <option value="Ativo">Ativo</option>
              <option value="Inadimplente">Inadimplente</option>
              <option value="Bloqueado para venda">Bloqueado</option>
            </select>
          </div>

          <input 
            type="file" 
            id="import-csv" 
            accept=".csv" 
            className="hidden" 
            onChange={handleImport} 
          />
          <button 
            onClick={() => document.getElementById('import-csv')?.click()} 
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all flex-1 md:flex-none"
          >
            <Icon name="upload" /> Importar
          </button>
          <button onClick={exportToCSV} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all flex-1 md:flex-none">
            <Icon name="download" /> Exportar
          </button>
          {canInclude && (
            <button onClick={() => { setEditingClient(null); setIsViewOnly(false); setActiveTab('id'); setIsModalOpen(true); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center justify-center gap-2 transition-all flex-1 md:flex-none">
              <Icon name="plus" /> Novo Registro
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left hidden md:table">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary"
                    checked={selectedClients.length === paginatedClients.length && paginatedClients.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClients(paginatedClients.map(c => c.id));
                      } else {
                        setSelectedClients([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Cód.</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Nome / Razão Social</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Documento</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Cidade/UF</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {paginatedClients.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${selectedClients.includes(c.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                  <td className="px-6 py-5">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary"
                      checked={selectedClients.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClients([...selectedClients, c.id]);
                        } else {
                          setSelectedClients(selectedClients.filter(id => id !== c.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500">{c.clientCode}</td>
                  <td className="px-6 py-5">
                     <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{c.nomeRazaoSocial}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{c.categoria || 'Geral'}</span>
                     </div>
                  </td>
                  <td className="px-6 py-5 text-slate-600 dark:text-slate-400 font-medium">{maskDocumentoPrivacy(c.documento)}</td>
                  <td className="px-6 py-5 text-slate-500 dark:text-slate-400 text-sm font-medium">{c.cidade ? `${c.cidade}/${c.uf}` : 'Não inf.'}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${c.status === EntityStatus.ACTIVE ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/50'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      {c.telefonePrincipal && (
                        <a 
                          href={`https://wa.me/${c.telefonePrincipal.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                          title="WhatsApp"
                        >
                          <Icon name="message-square" />
                        </a>
                      )}
                      <button onClick={() => { setEditingClient(c); setIsViewOnly(true); setActiveTab('id'); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-primary dark:hover:bg-slate-800/50 rounded-xl transition-all" title="Visualizar"><Icon name="eye" /></button>
                      {canEdit && <button onClick={() => { setEditingClient(c); setIsViewOnly(false); setActiveTab('id'); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all" title="Editar"><Icon name="edit" /></button>}
                      {canDelete && <button onClick={() => { confirm({ title: 'Excluir Cliente', message: 'Excluir registro definitivamente?', onConfirm: () => deleteClient(c.id) }); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all" title="Excluir"><Icon name="trash" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedClients.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-300 dark:text-slate-600 italic font-bold">Nenhum cliente encontrado.</td></tr>}
            </tbody>
          </table>
          
          {/* Mobile View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/50">
            {paginatedClients.map(c => (
              <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{c.clientCode}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{c.nomeRazaoSocial}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{c.categoria || 'Geral'}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase border shrink-0 ${c.status === EntityStatus.ACTIVE ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/50'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Documento</span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{maskDocumentoPrivacy(c.documento)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cidade/UF</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{c.cidade ? `${c.cidade}/${c.uf}` : 'Não inf.'}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                  <button onClick={() => { setEditingClient(c); setIsViewOnly(true); setActiveTab('id'); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-primary rounded-xl transition-all"><Icon name="eye" /></button>
                  {canEdit && <button onClick={() => { setEditingClient(c); setIsViewOnly(false); setActiveTab('id'); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Icon name="edit" /></button>}
                  {canDelete && <button onClick={() => { confirm({ title: 'Excluir Cliente', message: 'Excluir registro definitivamente?', onConfirm: () => deleteClient(c.id) }); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"><Icon name="trash" /></button>}
                </div>
              </div>
            ))}
            {paginatedClients.length === 0 && <div className="p-10 text-center text-slate-300 dark:text-slate-600 italic font-bold">Nenhum cliente encontrado.</div>}
          </div>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
               <div>
                 <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">{editingClient ? editingClient.clientCode : 'Novo Cadastro Corporativo'}</span>
                 <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <Icon name={isViewOnly ? 'eye' : (editingClient ? 'edit' : 'user-plus')} className="text-primary" />
                    {isViewOnly ? 'Visualização de Cliente' : (editingClient ? 'Edição de Cliente' : 'Novo Cliente')}
                 </h2>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>

            <div className="flex bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 overflow-x-auto scrollbar-hide shrink-0">
               {clientTabs.map((tab, index) => (
                 <TabButton key={tab.id} id={tab.id} label={tab.label} icon={tab.icon} index={index} />
               ))}
            </div>

            <form 
              id="clientForm" 
              key={editingClient?.id || 'new'} 
              onSubmit={handleSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault();
                }
              }}
              noValidate
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <fieldset disabled={isViewOnly} className="flex-1 flex flex-col h-full overflow-hidden border-none p-0 m-0">
               <div data-tab-id="id" className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-10 ${activeTab === 'id' ? 'flex-1 flex flex-col' : 'hidden'}`}>
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Pessoa</label>
                         <select value={tipoPessoa} onChange={(e: any) => setTipoPessoa(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200">
                            <option value="Jurídica">Pessoa Jurídica (PJ)</option>
                            <option value="Física">Pessoa Física (PF)</option>
                         </select>
                       </div>
                       <div className="md:col-span-2 space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Nome / Razão Social</label>
                         <input 
                            name="nomeRazaoSocial" 
                            required 
                            value={nomeRazaoSocial} 
                            onChange={(e) => setNomeRazaoSocial(capitalizeWords(e.target.value))}
                            placeholder="Ex: Razão Social da Empresa" 
                            className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary shadow-inner text-slate-800 dark:text-slate-200" 
                         />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Fantasia</label>
                         <input 
                            name="nomeFantasia" 
                            value={nomeFantasia} 
                            onChange={(e) => setNomeFantasia(capitalizeWords(e.target.value))}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                           {tipoPessoa === 'Jurídica' ? 'CNPJ' : 'CPF'}
                         </label>
                         <div className="relative">
                              <input 
                                name="documento" 
                                required 
                                value={documento} 
                                onChange={(e) => handleDocumentoChange(e.target.value)}
                                className={`w-full px-4 py-2.5 rounded-xl border ${!isDocumentoValid && documento.length > 0 ? 'border-red-500 bg-red-50' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'} transition-all text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 outline-none pr-10`}
                                placeholder={tipoPessoa === 'Jurídica' ? "00.000.000/0000-00" : "000.000.000-00"}
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                {loadingCnpj && <Icon name="spinner" className="animate-spin text-primary" />}
                                {tipoPessoa === 'Jurídica' && (
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const raw = documento.replace(/\D/g, "");
                                      if (raw.length === 14) {
                                        if (validateCNPJ(documento)) {
                                          fetchCnpjData(raw);
                                        } else {
                                          toast({ title: 'Erro de Dígito', message: 'Este CNPJ é matematicamente inválido.', type: 'error' });
                                        }
                                      } else {
                                        toast({ title: 'Aviso', message: 'Preencha o CNPJ completo para consultar.', type: 'warning' });
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-primary transition-colors"
                                    title="Tentar buscar dados novamente"
                                  >
                                    <Icon name="magic" />
                                  </button>
                                )}
                              </div>
                            </div>
                         {!isDocumentoValid && documento.length > 0 && (
                           <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter ml-2 animate-pulse">Documento Inválido</span>
                         )}
                       </div>
                       {tipoPessoa === 'Jurídica' && (
                         <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Inscrição Estadual</label>
                            <input 
                              value={inscricaoEstadual} 
                              onChange={(e) => setInscricaoEstadual(maskIE(e.target.value))}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" 
                            />
                         </div>
                       )}
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Status Base</label>
                         <select 
                            value={status} 
                            onChange={(e: any) => setStatus(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200"
                         >
                            <option value={EntityStatus.ACTIVE}>Ativo</option>
                            <option value={EntityStatus.INACTIVE}>Inativo</option>
                            <option value={EntityStatus.BLOCKED}>Bloqueado</option>
                         </select>
                       </div>
                    </div>
                 </div>
               </div>

               <div data-tab-id="end" className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-10 ${activeTab === 'end' ? 'flex-1 flex flex-col' : 'hidden'}`}>
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                           CEP {loadingCep && <Icon name="spinner" className="animate-spin text-primary" />}
                         </label>
                         <input 
                           value={cep} 
                           onChange={(e) => handleCepChange(e.target.value)}
                           placeholder="00000-000" 
                           className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary shadow-inner text-slate-800 dark:text-slate-200" 
                         />
                       </div>
                       <div className="md:col-span-2 space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Logradouro</label>
                         <input 
                           value={logradouro} 
                           onChange={(e) => setLogradouro(e.target.value)}
                           placeholder="Rua, Av, Travessa..." 
                           className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary shadow-inner text-slate-800 dark:text-slate-200" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Número</label>
                         <input value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary shadow-inner text-slate-800 dark:text-slate-200" />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Complemento</label>
                         <input value={complemento} onChange={(e) => setComplemento(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
                         <input 
                           value={bairro} 
                           onChange={(e) => setBairro(e.target.value)}
                           className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                         <input 
                           value={cidade} 
                           onChange={(e) => setCidade(e.target.value)}
                           className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" 
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">UF</label>
                         <input 
                           value={uf} 
                           onChange={(e) => setUf(e.target.value.toUpperCase())}
                           maxLength={2} 
                           className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary uppercase text-slate-800 dark:text-slate-200" 
                         />
                       </div>
                    </div>
                 </div>
               </div>

               <div data-tab-id="cont" className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-10 ${activeTab === 'cont' ? 'flex-1 flex flex-col' : 'hidden'}`}>
                 <div className="space-y-6 animate-in slide-in-from-left-4 duration-300 pb-20">
                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Canais de Contato Institucional</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-1">
                             <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone Principal</label>
                             <PhoneInput value={telefonePrincipal} onChange={(val) => setTelefonePrincipal(val)} required className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp / Secundário</label>
                             <PhoneInput value={telefoneSecundario} onChange={(val) => setTelefoneSecundario(val)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Site / URL</label>
                             <input 
                               value={site} 
                               onChange={(e) => setSite(e.target.value)}
                               onBlur={(e) => {
                                 if (e.target.value && !e.target.value.startsWith('http')) {
                                   setSite(`https://${e.target.value}`);
                                 }
                               }}
                               placeholder="https://..." 
                               className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail Principal</label>
                             <input required type="email" value={emailPrincipal} onChange={(e) => setEmailPrincipal(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail Financeiro</label>
                             <input type="email" value={emailFinanceiro} onChange={(e) => setEmailFinanceiro(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                          </div>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Pessoas de Contato (B2B)</h4>
                          <button type="button" onClick={addContactPerson} className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl uppercase hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all">Adicionar Pessoa</button>
                       </div>
                       
                       <div className="space-y-4">
                          {contactPeople.map((person, idx) => (
                             <div key={person.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative group animate-in slide-in-from-top-2">
                                <div className="md:col-span-4 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Nome Completo</label>
                                   <input value={person.nome} onChange={(e) => updateContactPerson(person.id, 'nome', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary dark:focus:border-primary outline-none text-sm font-bold text-slate-800 dark:text-slate-200" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Cargo</label>
                                   <input value={person.cargo} onChange={(e) => updateContactPerson(person.id, 'cargo', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary dark:focus:border-primary outline-none text-sm font-bold text-slate-800 dark:text-slate-200" />
                                </div>
                                <div className="md:col-span-3 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">E-mail</label>
                                   <input type="email" value={person.email} onChange={(e) => updateContactPerson(person.id, 'email', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary dark:focus:border-primary outline-none text-sm font-bold text-slate-800 dark:text-slate-200" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Telefone</label>
                                   <input value={phoneMask(person.telefone)} onChange={(e) => updateContactPerson(person.id, 'telefone', phoneMask(e.target.value))} placeholder="+55 (00) 00000-0000" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary dark:focus:border-primary outline-none text-sm font-bold text-slate-800 dark:text-slate-200" />
                                </div>
                                <div className="md:col-span-1 flex items-end justify-center pb-1">
                                   <button type="button" onClick={() => removeContactPerson(person.id)} className="p-2 text-red-300 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"><Icon name="trash" /></button>
                                </div>
                             </div>
                          ))}
                          {contactPeople.length === 0 && <p className="text-center py-8 text-slate-300 dark:text-slate-600 italic text-sm">Nenhuma pessoa de contato registrada.</p>}
                       </div>
                    </section>
                 </div>
               </div>

               <div data-tab-id="fin" className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-10 ${activeTab === 'fin' ? 'flex-1 flex flex-col' : 'hidden'}`}>
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="space-y-4">
                          <h5 className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800 pb-2">Domicílio Bancário</h5>
                          <div className="space-y-4">
                             <input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Instituição (Banco)" className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                             <div className="grid grid-cols-2 gap-4">
                                <input value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="Agência" className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                                <input value={conta} onChange={(e) => setConta(e.target.value)} placeholder="Conta" className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200" />
                             </div>
                             <select value={tipoConta} onChange={(e) => setTipoConta(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200">
                                <option value="Corrente">Conta Corrente</option>
                                <option value="Poupança">Conta Poupança</option>
                             </select>
                          </div>
                       </div>
                       <div className="md:col-span-2 space-y-4">
                          <h5 className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800 pb-2">Sistema de Recebimento PIX</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Tipo da Chave</label>
                                <select 
                                  name="tipoChavePix" 
                                  value={tipoChavePix}
                                  onChange={(e) => {
                                    setTipoChavePix(e.target.value as any);
                                    setChavePix('');
                                  }}
                                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-200"
                                >
                                   <option value="CPF/CNPJ">CPF/CNPJ</option>
                                   <option value="E-mail">E-mail</option>
                                   <option value="Telefone">Telefone</option>
                                   <option value="Aleatória">Chave Aleatória</option>
                                </select>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Chave PIX</label>
                                <input 
                                  name="chavePix" 
                                  value={chavePix}
                                  onChange={(e) => {
                                    let val = e.target.value;
                                    if (tipoChavePix === 'CPF/CNPJ') {
                                      val = val.replace(/\D/g, "");
                                      const masked = val.length <= 11 ? maskCPF(val) : maskCNPJ(val);
                                      setChavePix(masked);
                                      if (val.length > 0) {
                                        setIsChavePixValid(val.length <= 11 ? validateCPF(masked) : validateCNPJ(masked));
                                      } else {
                                        setIsChavePixValid(true);
                                      }
                                    } else if (tipoChavePix === 'Telefone') {
                                      val = phoneMask(val);
                                      setChavePix(val);
                                      setIsChavePixValid(true);
                                    } else {
                                      setChavePix(val);
                                      setIsChavePixValid(true);
                                    }
                                  }}
                                  placeholder="Insira a chave registrada" 
                                  className={`w-full px-4 py-3 rounded-2xl border ${!isChavePixValid ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50'} font-bold outline-none focus:border-primary shadow-inner transition-colors`}
                                />
                                {!isChavePixValid && (
                                  <p className="text-[10px] font-bold text-red-500 ml-2 animate-in fade-in slide-in-from-top-1">Documento inválido</p>
                                )}
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

               <div data-tab-id="crm" className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-10 ${activeTab === 'crm' ? 'flex-1 flex flex-col' : 'hidden'}`}>
                 <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       <div className="space-y-1">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Categoria Comercial</label>
                          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                             {clientCategories.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Origem do Lead</label>
                          <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                             <option value="Site">Site Institucional</option>
                             <option value="Indicação">Indicação Direta</option>
                             <option value="Prospecção">Prospecção Ativa</option>
                             <option value="Eventos">Eventos / Feiras</option>
                             <option value="Outros">Outros Canais</option>
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Avaliação Interna (Rating)</label>
                          <select 
                            value={avaliacaoInterna} 
                            onChange={(e) => setAvaliacaoInterna(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary"
                          >
                             <option value="0">0 - Não Avaliado</option>
                             <option value="1">1 - Baixo Potencial / Risco Alto</option>
                             <option value="2">2 - Potencial Médio / Regular</option>
                             <option value="3">3 - Bom Cliente / Estável</option>
                             <option value="4">4 - Cliente Prioritário / Potencial Alto</option>
                             <option value="5">5 - Cliente VIP / Master</option>
                          </select>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Status & Governança de Vendas</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-1">
                             <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Situação de Crédito</label>
                             <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary">
                                <option value="Ativo">Liberado / Ativo</option>
                                <option value="Inadimplente">Inadimplente</option>
                                <option value="Bloqueado para venda">Bloqueado para venda</option>
                             </select>
                          </div>
                          <div className="lg:col-span-2 space-y-1">
                             <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Motivo do Bloqueio (Se houver)</label>
                             <input value={motivoBloqueio} onChange={(e) => setMotivoBloqueio(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Data àšltima Venda</label>
                             <input 
                               type="date" 
                               value={dataUltimaVenda}
                               onChange={(e) => setDataUltimaVenda(e.target.value)}
                               max={today}
                               className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                             />
                          </div>
                       </div>
                    </section>

                    <section className="space-y-1">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Observações Gerais</label>
                       <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={4} placeholder="Notas internas sobre o relacionamento, histórico e peculiaridades..." className="w-full px-7 py-6 rounded-2xl border border-slate-100 bg-slate-50 outline-none resize-none font-medium focus:border-primary shadow-inner" />
                    </section>

                    {customFields.length > 0 && (
                      <section className="space-y-6">
                         <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Campos Personalizados</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {customFields.map(field => (
                               <div key={field.id} className="space-y-1">
                                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{field.name}</label>
                                  {field.type === 'select' ? (
                                     <select 
                                       required={field.required}
                                       value={customData[field.id] || ''} 
                                       onChange={(e) => setCustomData({ ...customData, [field.id]: e.target.value })}
                                       className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary"
                                     >
                                        <option value="">{field.placeholder || 'Selecione...'}</option>
                                        {field.options?.map(opt => (
                                           <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                     </select>
                                  ) : field.type === 'boolean' ? (
                                     <div className="flex items-center h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50">
                                        <label className="flex items-center gap-3 cursor-pointer w-full">
                                           <input 
                                             type="checkbox" 
                                             checked={customData[field.id] === 'on' || customData[field.id] === true}
                                             onChange={(e) => setCustomData({ ...customData, [field.id]: e.target.checked })}
                                             className="w-5 h-5 rounded text-primary focus:ring-primary" 
                                           />
                                           <span className="font-bold text-slate-700">Sim</span>
                                        </label>
                                     </div>
                                  ) : (
                                     <input 
                                       type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                       required={field.required}
                                       pattern={field.regex}
                                       maxLength={field.maxLength}
                                       placeholder={field.placeholder}
                                       value={customData[field.id] || ''} 
                                       onChange={(e) => setCustomData({ ...customData, [field.id]: e.target.value })}
                                       className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary" 
                                     />
                                  )}
                               </div>
                            ))}
                         </div>
                      </section>
                    )}
                 </div>
               </div>

               <div data-tab-id="anexos" className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-10 ${activeTab === 'anexos' ? 'flex-1 flex flex-col' : 'hidden'}`}>
                 <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                    <section className="space-y-6">
                      <AttachmentsManager 
                        attachments={attachments} 
                        onUpdate={setAttachments} 
                        canEdit={canEdit} 
                      />
                    </section>
                 </div>
               </div>

               <div data-tab-id="interacoes" className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-10 ${activeTab === 'interacoes' ? 'flex-1 flex flex-col' : 'hidden'}`}>
                 <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Registrar Interação</h4>
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                          <div className="flex flex-col md:flex-row gap-4">
                             <div className="w-full md:w-1/3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Interação</label>
                                <select 
                                  value={newInteractionType} 
                                  onChange={(e) => setNewInteractionType(e.target.value as any)} 
                                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold outline-none focus:border-primary"
                                >
                                   <option value="NOTE">Anotação Interna</option>
                                   <option value="CALL">Ligação Telefà´nica</option>
                                   <option value="WHATSAPP">WhatsApp</option>
                                   <option value="EMAIL">E-mail</option>
                                   <option value="MEETING">Reunião</option>
                                </select>
                             </div>
                             <div className="w-full md:w-2/3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                   <input 
                                     value={newInteractionDesc} 
                                     onChange={(e) => setNewInteractionDesc(e.target.value)}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                         e.preventDefault();
                                         addInteraction();
                                       }
                                     }}
                                     placeholder="Detalhes da interação..." 
                                     className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-primary" 
                                   />
                                   <button 
                                     type="button" 
                                     onClick={addInteraction} 
                                     disabled={!newInteractionDesc.trim()}
                                     className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                   >
                                     Registrar
                                   </button>
                                </div>
                             </div>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Timeline de Interações</h4>
                       <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                          {interactions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 font-medium italic">Nenhuma interação registrada.</div>
                          ) : (
                            interactions.map((interaction, idx) => {
                              const user = users.find(u => u.id === interaction.userId);
                              const getInteractionIcon = (type: string) => {
                                switch(type) {
                                  case 'EMAIL': return 'email';
                                  case 'CALL': return 'phone';
                                  case 'WHATSAPP': return 'message-square';
                                  case 'MEETING': return 'users';
                                  default: return 'sticky-note';
                                }
                              };
                              const getInteractionColor = (type: string) => {
                                switch(type) {
                                  case 'EMAIL': return 'bg-blue-500';
                                  case 'CALL': return 'bg-emerald-500';
                                  case 'WHATSAPP': return 'bg-green-500';
                                  case 'MEETING': return 'bg-purple-500';
                                  default: return 'bg-amber-500';
                                }
                              };
                              
                              return (
                                <div key={interaction.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active`}>
                                   <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${getInteractionColor(interaction.type)} text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2`}>
                                      <Icon name={getInteractionIcon(interaction.type)} className="text-sm" />
                                   </div>
                                   <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                                      <div className="flex justify-between items-start mb-1">
                                         <div className="flex items-center gap-2">
                                            <img src={user?.foto || 'https://picsum.photos/seed/default/40'} className="w-5 h-5 rounded-full" />
                                            <span className="text-xs font-bold text-slate-700">{user?.nome || 'Usuário'}</span>
                                         </div>
                                         <span className="text-[10px] font-bold text-slate-400">{new Date(interaction.date).toLocaleString('pt-BR')}</span>
                                      </div>
                                      <p className="text-sm text-slate-600 mt-2">{interaction.description}</p>
                                      {canEdit && (
                                        <button type="button" onClick={() => removeInteraction(interaction.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1">
                                          <Icon name="trash" className="text-xs" />
                                        </button>
                                      )}
                                   </div>
                                </div>
                              );
                            })
                          )}
                       </div>
                    </section>
                 </div>
               </div>

            </fieldset>
          </form>

            <div className="p-6 md:p-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-3 rounded-2xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-white transition-all uppercase text-[10px] tracking-widest text-center">{isViewOnly ? 'Fechar' : 'Cancelar'}</button>
                {!isViewOnly && (
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    {currentTabIndex > 0 && (
                      <button type="button" onClick={handlePrevTab} className="w-full sm:w-auto px-8 py-3 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-white transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                        <Icon name="arrow-left" /> Anterior
                      </button>
                    )}
                    {currentTabIndex < clientTabs.length - 1 ? (
                      <button key="next" type="button" onClick={handleNextTab} className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-primary text-white font-black shadow-xl hover:brightness-110 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                        Próximo <Icon name="arrow-right" />
                      </button>
                    ) : (
                      <button key="submit" type="submit" form="clientForm" className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-500 text-white font-black shadow-xl hover:brightness-110 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                        <Icon name="check" /> Confirmar
                      </button>
                    )}
                  </div>
                )}
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
  const { tasks, addTask, updateTask, deleteTask, users, currentUser, slaSettings, sectors, hasPermission } = useApp();
  const { confirm } = useConfirm();
  const { success, toast } = useToast();
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
    if (location.state?.openModal || location.state?.taskId) {
      const taskToEdit = location.state?.taskId ? tasks.find(t => t.id === location.state.taskId) : null;
      openTaskModal(taskToEdit || null);
      if (location.state?.initialDate && !taskToEdit) {
        setStartDate(location.state.initialDate);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, tasks]);
  
  // Local Form States
  const [startDate, setStartDate] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(TaskStatus.OPEN);
  const [conclusaoReal, setConclusaoReal] = useState<string>('');
  const [tempoGasto, setTempoGasto] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  
  const actionRef = useRef<HTMLTextAreaElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // New Controlled Form States (Fixing multi-tab data loss)
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TaskType>(TaskType.REQUEST);
  const [solicitanteId, setSolicitanteId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [interessados, setInteressados] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModalTab, setActiveModalTab] = useState<'geral' | 'checklist' | 'anexos' | 'historico'>('geral');
  const itemsPerPage = 10;

  const canEdit = hasPermission('tarefas', 'editar');
  const canDelete = hasPermission('tarefas', 'excluir');
  const canInclude = hasPermission('tarefas', 'incluir');
  const canViewAllTasks = hasPermission('tarefas', 'leitura');

  const activeUsers = useMemo(() => users.filter(u => u.status === EntityStatus.ACTIVE), [users]);

  const filteredTasks = useMemo(() => {
    let baseTasks = canViewAllTasks && !filterMyTasks ? tasks : tasks.filter(t => t.responsavelId === currentUser?.id);
    
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
  }, [tasks, currentUser, canViewAllTasks, debouncedSearchTerm, filterPriority, filterMyTasks]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterPriority, filterMyTasks, viewMode]);

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
    
    if (t.subtasks && t.subtasks.length > 0) {
      const completed = t.subtasks.filter(s => s.completed).length;
      return Math.round((completed / t.subtasks.length) * 100);
    }

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

    // Subtasks Comparison
    const oldSubtasks = oldT.subtasks || [];
    const newSubtasks = newT.subtasks || [];

    newSubtasks.forEach(nst => {
      const ost = oldSubtasks.find(o => o.id === nst.id);
      if (!ost) {
        changes.push(`Subtarefa adicionada: "${nst.title}"`);
      } else if (ost.completed !== nst.completed) {
        changes.push(`Subtarefa "${nst.title}": ${ost.completed ? 'Concluída → Pendente' : 'Pendente → Concluída'}`);
      }
    });

    oldSubtasks.forEach(ost => {
      if (!newSubtasks.find(n => n.id === ost.id)) {
        changes.push(`Subtarefa removida: "${ost.title}"`);
      }
    });

    // Comments Comparison
    const oldCommentsCnt = (oldT.comments || []).length;
    const newCommentsCnt = (newT.comments || []).length;
    if (newCommentsCnt > oldCommentsCnt) {
      changes.push(`${newCommentsCnt - oldCommentsCnt} novo(s) comentário(s) adicionado(s)`);
    }

    return changes;
  };

  const needsLogEntry = useMemo(() => {
    if (!editingTask) return false;
    
    const statusChanged = currentStatus !== editingTask.status;
    const dateChanged = startDate !== (editingTask.dataInicio || '');
    const priorityChanged = priority !== editingTask.prioridade;
    const conclusaoRealChanged = conclusaoReal !== (editingTask.dataConclusaoReal || '');
    
    // Subtasks or Comments changes
    const subtasksChanged = JSON.stringify(subtasks) !== JSON.stringify(editingTask.subtasks || []);
    const commentsChanged = comments.length !== (editingTask.comments || []).length;

    const isRealDateChange = editingTask.dataInicio ? dateChanged : (startDate !== '' && startDate !== new Date().toISOString().split('T')[0]);
    const isRealConclusaoChange = editingTask.dataConclusaoReal ? conclusaoRealChanged : (conclusaoReal !== '');

    return statusChanged || (editingTask.dataInicio && dateChanged) || priorityChanged || (editingTask.dataConclusaoReal && conclusaoRealChanged) || subtasksChanged || commentsChanged;
  }, [currentStatus, startDate, priority, conclusaoReal, subtasks, comments, editingTask]);

  useEffect(() => {
    setShowLogInput(needsLogEntry);
  }, [needsLogEntry]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const newTaskPartial: Partial<Task> = {
      titulo: titulo,
      descricao: descricao,
      tipo: tipo,
      solicitanteId: solicitanteId,
      responsavelId: responsavelId || currentUser?.id,
      setorId: setorId,
      interessados: interessados,
      prioridade: priority,
      status: currentStatus,
      dataInicio: startDate,
      dataConclusaoReal: conclusaoReal,
      tempoGasto: tempoGasto,
      attachments: attachments,
      subtasks: subtasks,
      comments: comments
    };

    const logs: TaskLog[] = [...(editingTask?.logs || [])];
    
    if (editingTask) {
      const details = getChangeDetails(editingTask, newTaskPartial);
      if (details.length > 0) {
        const justificativa = (needsLogEntry && actionRef.current?.value) ? actionRef.current.value : 'Ajuste de parà¢metros técnicos.';
        
        logs.push({
          id: generateUUID(),
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
        id: generateUUID(),
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
      id: editingTask?.id || generateUUID(),
      taskNumber: editingTask?.taskNumber || `TSK-${String(tasks.length + 1).padStart(3, '0')}`,
      dataCriacao: editingTask?.dataCriacao || new Date().toISOString(),
      dataVencimento: calculatedDeadline,
      logs: logs,
      subtasks: subtasks,
      comments: comments
    } as Task;

    if (editingTask) updateTask(task); else addTask(task);
    setEditingTask(task);
    if (success) success('Tarefa salva!'); else if (toast) toast({ message: 'Tarefa salva!', type: 'success' });
    setIsModalOpen(false);
  };

  const openTaskModal = (t: Task | null) => {
    setEditingTask(t);
    // Control States Setup
    setTitulo(t?.titulo || '');
    setDescricao(t?.descricao || '');
    setTipo(t?.tipo || TaskType.REQUEST);
    setSolicitanteId(t?.solicitanteId || (t ? '' : currentUser?.id || ''));
    setResponsavelId(t?.responsavelId || (t ? '' : currentUser?.id || ''));
    setSetorId(t?.setorId || '');
    setInteressados(t?.interessados || '');

    setStartDate(t?.dataInicio || new Date().toISOString().split('T')[0]);
    setPriority(t?.prioridade || TaskPriority.MEDIUM);
    setCurrentStatus(t?.status || TaskStatus.OPEN);
    setConclusaoReal(t?.dataConclusaoReal || '');
    setTempoGasto(t?.tempoGasto || '');
    setAttachments(t?.attachments || []);
    setSubtasks(t?.subtasks || []);
    setComments(t?.comments || []);
    setNewSubtaskTitle('');
    setNewCommentText('');
    setActiveModalTab('geral');
    if (actionRef.current) actionRef.current.value = '';
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
        id: generateUUID(),
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
          className="bg-white p-4 rounded-3xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all relative group cursor-grab active:cursor-grabbing mb-3 overflow-hidden"
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.prioridade === TaskPriority.CRITICAL ? 'bg-red-600' : t.prioridade === TaskPriority.HIGH ? 'bg-orange-500' : 'bg-blue-400'}`} />
          <div className="flex justify-between items-start mb-3 pl-2">
            <div className="flex gap-2 items-center flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border flex items-center gap-1 ${getPriorityColor(t.prioridade)}`}>
                <Icon name={getPriorityIcon(t.prioridade)} className="w-3 h-3" />
                {t.prioridade}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase border bg-slate-50 text-slate-500 border-slate-200">
                {t.tipo}
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.taskNumber}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
               <button onClick={() => openHistoryModal(t)} className="p-1 text-amber-400 hover:text-amber-500 transition-colors" title="Ver Histórico"><Icon name="history" className="w-4 h-4" /></button>
               {canEdit && <button onClick={() => openTaskModal(t)} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><Icon name="edit" className="w-4 h-4" /></button>}
            </div>
          </div>
          
          <h4 className="text-sm font-extrabold text-slate-800 leading-tight mb-3 line-clamp-2 pl-2">{t.titulo}</h4>
          
          <div className="space-y-3 pl-2">
             <ProgressBar progress={progress} />
             
             <div className="flex justify-between items-end pt-1">
                <div className="flex flex-col gap-1.5">
                  {t.dataVencimento && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100' : 'text-slate-500'}`}>
                      <Icon name={isOverdue ? 'alert-circle' : 'calendar'} className="w-3 h-3" />
                      {new Date(t.dataVencimento).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    {t.attachments && t.attachments.length > 0 && <span className="flex items-center gap-1"><Icon name="paperclip" className="w-3 h-3" />{t.attachments.length}</span>}
                    {t.subtasks && t.subtasks.length > 0 && <span className="flex items-center gap-1"><Icon name="check-square" className="w-3 h-3" />{t.subtasks.filter(s => s.completed).length}/{t.subtasks.length}</span>}
                    {t.comments && t.comments.length > 0 && <span className="flex items-center gap-1"><Icon name="message-square" className="w-3 h-3" />{t.comments.length}</span>}
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
        className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-xl transition-all relative overflow-hidden group"
      >
        <div className={`absolute left-0 top-0 bottom-0 w-2 ${t.prioridade === TaskPriority.CRITICAL ? 'bg-red-600' : t.prioridade === TaskPriority.HIGH ? 'bg-orange-500' : 'bg-blue-400'}`} />
        <div className="flex justify-between items-start pl-3 mb-4">
          <div>
             <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.taskNumber} • {t.tipo}</span>
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
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><Icon name="paperclip" className="w-3 h-3" />{t.attachments?.length || 0}</span>
                <span className="flex items-center gap-1"><Icon name="check-square" className="w-3 h-3" />{t.subtasks?.filter(s => s.completed).length || 0}/{t.subtasks?.length || 0}</span>
                <span className="flex items-center gap-1"><Icon name="message-square" className="w-3 h-3" />{t.comments?.length || 0}</span>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${t.status === TaskStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{t.status}</span>
           </div>
        </div>
      </div>
    );
  };

  const exportToCSV = () => {
    const headers = ['Número', 'Título', 'Tipo', 'Status', 'Prioridade', 'Data Início', 'Data Vencimento', 'Responsável'];
    const csvContent = [
      headers.join(','),
      ...filteredTasks.map(t => [
        t.taskNumber,
        `"${t.titulo}"`,
        t.tipo,
        t.status,
        t.prioridade,
        t.dataInicio ? new Date(t.dataInicio).toLocaleDateString() : '',
        t.dataVencimento ? new Date(t.dataVencimento).toLocaleDateString() : '',
        `"${users.find(u => u.id === t.responsavelId)?.nome || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tarefas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <p className="text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Ciclo de vida operacional das tarefas.</p>
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Lista
            </button>
            <button 
              onClick={() => setViewMode('kanban')} 
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Kanban
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar tarefas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm w-full sm:w-64"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
            className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-slate-600 dark:text-slate-300 appearance-none cursor-pointer w-full sm:w-auto"
          >
            <option value="all">Prioridades</option>
            {Object.values(TaskPriority).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
            className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-slate-600 dark:text-slate-300 appearance-none cursor-pointer w-full sm:w-auto"
          >
            <option value="all">Status</option>
            {Object.values(TaskStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {canViewAllTasks && (
            <button 
              onClick={() => setFilterMyTasks(!filterMyTasks)} 
              className={`px-4 py-3 rounded-2xl font-black text-xs uppercase shadow-sm flex items-center justify-center gap-2 transition-all border w-full sm:w-auto ${filterMyTasks ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Icon name="user" className="w-4 h-4" /> Minhas Tarefas
            </button>
          )}
          <button onClick={exportToCSV} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all w-full sm:w-auto">
            <Icon name="download" /> Exportar
          </button>
          {canInclude && (
            <button onClick={() => openTaskModal(null)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center justify-center gap-2 transition-all w-full sm:w-auto">
              <Icon name="plus" /> Adicionar Atividade
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="flex flex-col flex-1">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 content-start">
            {paginatedTasks.map(t => renderTaskCard(t, false))}
            {paginatedTasks.length === 0 && <div className="col-span-1 xl:col-span-2 py-20 text-center text-slate-400 font-medium">Nenhuma tarefa encontrada no seu escopo.</div>}
          </div>
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4 flex-1 items-start min-h-[600px] snap-x custom-scrollbar">
          {Object.values(TaskStatus).map(status => {
            const statusTasks = filteredTasks.filter(t => t.status === status);
            const colorClass = getStatusColor(status);
            const iconName = getStatusIcon(status);
            const isDraggedOver = draggedOverStatus === status;
            return (
              <div 
                key={status} 
                className={`flex-shrink-0 w-[85vw] md:w-80 rounded-2xl md:rounded-2xl p-4 border flex flex-col h-[calc(100vh-250px)] md:h-[calc(100vh-200px)] min-h-[400px] md:min-h-[500px] snap-center transition-all duration-300 ${isDraggedOver ? 'bg-slate-200/80 dark:bg-slate-800/80 border-primary shadow-inner scale-[1.02]' : 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="flex justify-between items-center mb-4 px-2 pt-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border shadow-sm ${colorClass}`}>
                      <Icon name={iconName} className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-xs">{status}</h3>
                  </div>
                  <span className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">{statusTasks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-4">
                  {statusTasks.map(t => renderTaskCard(t, true))}
                  {statusTasks.length === 0 && (
                    <div className={`border-2 border-dashed rounded-[2rem] h-24 flex items-center justify-center text-xs font-medium transition-colors ${isDraggedOver ? 'border-primary text-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'}`}>
                      Arraste tarefas para cá
                    </div>
                  )}
                  {status === TaskStatus.OPEN && canInclude && (
                    <button 
                      onClick={() => openTaskModal(null)}
                      className="w-full py-3 mt-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Icon name="plus" className="w-4 h-4" /> Nova Tarefa
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isHistoryModalOpen && historyTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{historyTask.taskNumber}</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Timeline de Ações</h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
              {historyTask.logs && historyTask.logs.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
                  {historyTask.logs.map((log, idx) => (
                    <div key={log.id} className="relative pl-10 animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-white border-4 border-primary shadow-sm" />
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
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
                              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Alterações:</p>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-1">
                                {log.changes.map((change, i) => (
                                  <li key={i}>{change}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {log.justification && (
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Justificativa:</p>
                              <p className="text-xs text-slate-700 italic">"{log.justification}"</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                           <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary font-black uppercase">
                              {log.userName.charAt(0)}
                           </div>
                           <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Realizado por {log.userName}</span>
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
            <div className="p-6 md:p-8 border-t border-slate-100 flex justify-end bg-slate-50/50 dark:bg-slate-800/30">
               <button onClick={() => setIsHistoryModalOpen(false)} className="w-full sm:w-auto px-10 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase shadow-lg hover:bg-slate-800 transition-all text-center">Fechar Timeline</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">{editingTask ? editingTask.taskNumber : 'Identificador Automático'}</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Gerenciamento de Atividade</h3>
              </div>
            <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-4">
                    {[
                        { id: 'geral', label: 'Geral', icon: 'info-circle' },
                        { id: 'checklist', label: 'Checklist', icon: 'check-square' },
                        { id: 'anexos', label: 'Anexos', icon: 'paperclip' },
                        { id: 'historico', label: 'Histórico', icon: 'history' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveModalTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeModalTab === tab.id ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <Icon name={tab.icon} className="w-3 h-3" />
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            </div>
            <form id="taskForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 md:space-y-6 bg-white dark:bg-slate-900 custom-scrollbar pb-24 md:pb-12">
              {activeModalTab === 'geral' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">1. Identificação da Tarefa</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Título</label>
                        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary outline-none font-bold shadow-inner text-slate-800 dark:text-slate-200" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Demanda</label>
                        <select value={tipo} onChange={(e: any) => setTipo(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold text-slate-800 dark:text-slate-200">
                          {Object.values(TaskType).map(v => <option key={v} value={v} className="dark:bg-slate-900">{v}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Descrição Detalhada</label>
                        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-medium resize-none shadow-inner text-slate-800 dark:text-slate-200" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">2. Pessoas Envolvidas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Solicitante</label>
                        <select value={solicitanteId} onChange={(e) => setSolicitanteId(e.target.value)} required className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold text-slate-800 dark:text-slate-200">
                          <option value="" className="dark:bg-slate-900">Selecione...</option>
                          {activeUsers.map(u => <option key={u.id} value={u.id} className="dark:bg-slate-900">{u.nome}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Responsável (Owner)</label>
                        <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold text-primary">
                          {users.map(u => <option key={u.id} value={u.id} className="dark:bg-slate-900">{u.nome}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Equipe / Setor (Config.)</label>
                        <select value={setorId} onChange={(e) => setSetorId(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold text-slate-800 dark:text-slate-200">
                          <option value="" className="dark:bg-slate-900">Nenhum Setor Selecionado</option>
                          {sectors.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.nome}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Stakeholders / Interessados</label>
                        <input value={interessados} onChange={(e) => setInteressados(e.target.value)} placeholder="E-mails ou nomes..." className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold shadow-inner text-slate-800 dark:text-slate-200" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">3. Esforço e Prazos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Data de Início</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary outline-none font-bold shadow-inner text-slate-800 dark:text-slate-200" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Prazo (SLA / Auto)</label>
                        <input type="date" value={calculatedDeadline} readOnly className="w-full px-4 py-3 rounded-2xl border border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold outline-none cursor-not-allowed" />
                      </div>
                       <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Conclusão Efetiva</label>
                        <input type="date" value={conclusaoReal} readOnly className="w-full px-4 py-3 rounded-2xl border border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold outline-none cursor-not-allowed" />
                      </div>
                       <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Esforço Gasto (H:M)</label>
                        <input name="tempoGasto" placeholder="Ex: 08:30" value={tempoGasto} onChange={(e) => setTempoGasto(maskTime(e.target.value))} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold shadow-inner text-slate-800 dark:text-slate-200" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">4. Governança e Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Prioridade (Config. SLA)</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-black text-slate-800 dark:text-slate-200">
                          {Object.values(TaskPriority).map(v => <option key={v} value={v} className="dark:bg-slate-900">{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Status Atual</label>
                        <select 
                          value={currentStatus} 
                          onChange={(e) => {
                            const newStatus = e.target.value as TaskStatus;
                            setCurrentStatus(newStatus);
                            if (newStatus === TaskStatus.COMPLETED) {
                              setConclusaoReal(new Date().toISOString().split('T')[0]);
                            } else if (newStatus !== TaskStatus.COMPLETED && !editingTask?.dataConclusaoReal) {
                              setConclusaoReal('');
                            }
                          }} 
                          className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-black text-primary"
                        >
                          {Object.values(TaskStatus).map(v => <option key={v} value={v} className="dark:bg-slate-900">{v}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeModalTab === 'checklist' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Subtarefas (Checklist)</h4>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newSubtaskTitle} 
                          onChange={(e) => setNewSubtaskTitle(e.target.value)} 
                          placeholder="Adicionar nova subtarefa..." 
                          className="flex-1 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold shadow-inner text-slate-800 dark:text-slate-200"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newSubtaskTitle.trim()) {
                                setSubtasks([...subtasks, { id: generateUUID(), title: newSubtaskTitle.trim(), completed: false }]);
                                setNewSubtaskTitle('');
                              }
                            }
                          }}
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            if (newSubtaskTitle.trim()) {
                              setSubtasks([...subtasks, { id: generateUUID(), title: newSubtaskTitle.trim(), completed: false }]);
                              setNewSubtaskTitle('');
                            }
                          }}
                          className="px-4 py-3 bg-primary text-white rounded-2xl font-black shadow-md hover:brightness-110 transition-all"
                        >
                          <Icon name="plus" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {subtasks.map(st => (
                          <div key={st.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input 
                                type="checkbox" 
                                checked={st.completed} 
                                onChange={() => {
                                  setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s));
                                }}
                                className="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                              />
                              <span className={`font-medium ${st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>{st.title}</span>
                            </label>
                            <button type="button" onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))} className="text-slate-400 hover:text-red-500 p-2">
                              <Icon name="trash" />
                            </button>
                          </div>
                        ))}
                        {subtasks.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nenhuma subtarefa adicionada.</p>}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Comentários</h4>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newCommentText} 
                          onChange={(e) => setNewCommentText(e.target.value)} 
                          placeholder="Escreva um comentário..." 
                          className="flex-1 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold shadow-inner text-slate-800 dark:text-slate-200"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCommentText.trim()) {
                                setComments([...comments, { id: generateUUID(), userId: currentUser?.id || 'sys', text: newCommentText.trim(), createdAt: new Date().toISOString() }]);
                                setNewCommentText('');
                              }
                            }
                          }}
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            if (newCommentText.trim()) {
                              setComments([...comments, { id: generateUUID(), userId: currentUser?.id || 'sys', text: newCommentText.trim(), createdAt: new Date().toISOString() }]);
                              setNewCommentText('');
                            }
                          }}
                          className="px-4 py-3 bg-primary text-white rounded-2xl font-black shadow-md hover:brightness-110 transition-all"
                        >
                          <Icon name="message-square" />
                        </button>
                      </div>
                      <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {comments.map(c => {
                          const commentUser = users.find(u => u.id === c.userId);
                          return (
                            <div key={c.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{commentUser?.nome || 'Usuário Desconhecido'}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{c.text}</p>
                            </div>
                          );
                        })}
                        {comments.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nenhum comentário ainda.</p>}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeModalTab === 'anexos' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Gestão de Arquivos</h4>
                    <AttachmentsManager 
                      attachments={attachments} 
                      onUpdate={setAttachments} 
                      canEdit={canEdit} 
                    />
                  </section>
                </div>
              )}

              {activeModalTab === 'historico' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Timeline de Ações e Auditoria</h4>
                    <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-6">
                      {editingTask?.logs && editingTask.logs.length > 0 ? (
                        editingTask.logs.map((log, idx) => (
                          <div key={log.id} className="relative pl-10">
                            <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-4 border-primary shadow-sm" />
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
                              <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                                <span className="text-[9px] font-black text-slate-400 uppercase">{log.fromStatus}</span>
                                <Icon name="arrow-right" className="text-[8px] text-slate-300" />
                                <span className="text-[9px] font-black text-primary uppercase">{log.toStatus}</span>
                              </div>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                              <p className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">{log.action}</p>
                              {log.changes && log.changes.length > 0 && (
                                <div className="mb-3 space-y-1">
                                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Alterações:</p>
                                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1 ml-1">
                                    {log.changes.map((change, i) => (
                                      <li key={i}>{change}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {log.justification && (
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Justificativa:</p>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{log.justification}"</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary font-black uppercase">
                                    {log.userName.charAt(0)}
                                </div>
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Realizado por {log.userName}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-slate-400 italic">Nenhum log registrado.</div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {showLogInput && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-3xl border-2 border-amber-200 dark:border-amber-800/50 space-y-4 animate-in slide-in-from-top-4">
                    <h5 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2"><Icon name="edit-alt" /> Justificativa / Ação Realizada (Obrigatório para Log)</h5>
                    <textarea ref={actionRef} required placeholder="Descreva o motivo das alterações nos campos gatilho..." className="w-full px-7 py-5 rounded-[2rem] border border-amber-300 dark:border-amber-800 focus:border-amber-500 outline-none h-32 font-medium bg-white dark:bg-slate-900 shadow-inner text-slate-800 dark:text-slate-200" />
                </div>
              )}
            </form>
            <div className="p-6 md:p-10 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all text-center">Cancelar</button>
                <button type="submit" form="taskForm" className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-primary text-white font-extrabold shadow-xl hover:brightness-110 transition-all text-center">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const UsersPage = () => {
  const { users, addUser, updateUser, currentUser, hasPermission, roles } = useApp();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalPhoto, setModalPhoto] = useState<string>('');
  const [modalRoleId, setModalRoleId] = useState<string>('user');
  const [hasWhatsapp, setHasWhatsapp] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const canManageUsers = hasPermission('usuarios', 'editar') || hasPermission('usuarios', 'incluir');
  const canViewAllUsers = hasPermission('usuarios', 'leitura');

  useEffect(() => {
    if (location.state?.openModal && canManageUsers) {
      setEditingUser(null);
      setModalPhoto('');
      setModalRoleId('user');
      setHasWhatsapp(false);
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, canManageUsers]);

  const filteredUsers = useMemo(() => {
    let result = canViewAllUsers ? users : users.filter(u => u.id === currentUser?.id);
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(u => 
        u.nome.toLowerCase().includes(lowerSearch) ||
        u.email.toLowerCase().includes(lowerSearch) ||
        (roles.find(r => r.id === u.roleId)?.name || '').toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  }, [users, currentUser, canViewAllUsers, debouncedSearchTerm, roles]);

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
      id: editingUser?.id || generateUUID(), 
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
    if (canManageUsers) {
      u.roleId = modalRoleId;
    }
    if (editingUser) updateUser(u); else addUser(u);
    setEditingUser(u);
    if (toast) toast({ message: 'Usuário salvo com sucesso!', type: 'success' });
    setIsModalOpen(false);
  };

  const openModal = (u: User | null) => {
    setEditingUser(u);
    setModalPhoto(u?.foto || '');
    setModalRoleId(u?.roleId || 'user');
    setHasWhatsapp(u?.possuiWhatsapp || false);
    setIsModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'E-mail', 'Perfil', 'Status', 'Telefone', 'Celular', 'WhatsApp'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => [
        `"${u.nome}"`,
        `"${u.email}"`,
        `"${roles.find(r => r.id === u.roleId)?.name || 'Usuário'}"`,
        u.status,
        `"${u.telefone || ''}"`,
        `"${u.celular || ''}"`,
        u.possuiWhatsapp ? 'Sim' : 'Não'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const canInclude = hasPermission('usuarios', 'incluir');
  const canExport = hasPermission('usuarios', 'leitura'); // Assuming export is part of reading users list

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <p className="text-slate-500 font-medium">Gestão de Usuários e Acessos ao Sistema.</p>
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {canViewAllUsers && (
            <div className="relative flex-1 md:flex-none">
              <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar usuários..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium w-full md:w-64"
              />
            </div>
          )}
          {canExport && (
            <button onClick={exportToCSV} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-sm hover:bg-slate-200 flex items-center justify-center gap-2 transition-all flex-1 md:flex-none">
              <Icon name="download" /> Exportar
            </button>
          )}
          {canInclude && <button onClick={() => openModal(null)} className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 flex-1 md:flex-none"><Icon name="plus" /> Novo Usuário</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedUsers.map(u => (
          <div key={u.id} className="bg-white dark:bg-slate-900 p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all text-center space-y-4">
             <img src={u.foto || `https://picsum.photos/seed/${u.id}/200`} className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-50 dark:border-slate-800 shadow-lg mx-auto" />
             <div>
                <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{u.nome}</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{roles.find(r => r.id === u.roleId)?.name || 'Usuário'}</p>
             </div>
             <button onClick={() => openModal(u)} className="w-full px-6 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-primary transition-all">{canManageUsers ? 'Gerenciar' : 'Ver Perfil'}</button>
          </div>
        ))}
        {paginatedUsers.length === 0 && <div className="col-span-full p-10 text-center text-slate-300 dark:text-slate-700 italic font-bold">Nenhum usuário encontrado.</div>}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-fit max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 dark:bg-slate-800/30 shrink-0">
               <div>
                 <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Gestão de Perfil</span>
                 <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">Acesso ao Sistema</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex justify-center mb-8 shrink-0">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <img src={modalPhoto || `https://picsum.photos/seed/${editingUser?.id || 'new'}/200`} className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-slate-50 shadow-xl" />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Icon name="camera" className="text-white text-xl md:text-2xl" />
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
              </div>
              <form id="userForm" onSubmit={handleSubmit} className="space-y-8">
              <section className="space-y-4 md:space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Identificação</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Exibição</label>
                    <input name="nome" readOnly={!canManageUsers} defaultValue={editingUser?.nome} required className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-slate-50 outline-none font-bold shadow-inner text-sm md:text-base" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input name="email" readOnly={!canManageUsers} defaultValue={editingUser?.email} required type="email" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-slate-50 outline-none font-bold shadow-inner text-sm md:text-base" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Chave de Acesso (Senha)</label>
                    <input name="senha" type="password" placeholder="Defina a senha" defaultValue={editingUser?.senha} required className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-slate-50 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold shadow-inner text-sm md:text-base" />
                  </div>
                  {canManageUsers && (
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Status da Conta</label>
                      <select name="status" defaultValue={editingUser?.status || EntityStatus.ACTIVE} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-slate-50 outline-none font-bold text-sm md:text-base">
                        <option value={EntityStatus.ACTIVE}>Ativo</option>
                        <option value={EntityStatus.INACTIVE}>Inativo</option>
                      </select>
                    </div>
                  )}
                </div>
              </section>
              <section className="space-y-4 md:space-y-6">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest">Contato Direto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                   <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Celular</label>
                    <PhoneInput name="celular" defaultValue={editingUser?.celular} className={`w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 outline-none font-bold transition-colors shadow-inner text-sm md:text-base ${hasWhatsapp ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 dark:text-emerald-50' : 'bg-slate-50 dark:bg-slate-900 dark:text-slate-50'}`} />
                   </div>
                   <div className="flex items-center gap-3 pt-2 md:pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div onClick={() => setHasWhatsapp(!hasWhatsapp)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${hasWhatsapp ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-700'}`}>
                          {hasWhatsapp && <Icon name="check" className="text-white text-[10px]" />}
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">WhatsApp Ativo</span>
                      </label>
                   </div>
                </div>
              </section>
              {canManageUsers && (
                <section className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Função (Role)</label>
                      <select name="roleId" value={modalRoleId} onChange={(e) => setModalRoleId(e.target.value)} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-slate-50 outline-none font-bold text-sm md:text-base">
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              )}
            </form>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-10 py-2 md:py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-black text-xs uppercase hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" form="userForm" className="w-full sm:w-auto px-14 py-2 md:py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase shadow-xl hover:brightness-110 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplatesTab = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate, currentUser, hasPermission } = useApp();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MailTemplate | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const canEdit = hasPermission('malaDireta', 'editar');
  const canDelete = hasPermission('malaDireta', 'excluir');
  const canInclude = hasPermission('malaDireta', 'incluir');

  const totalPages = Math.ceil(templates.length / itemsPerPage);
  const paginatedTemplates = templates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const template: MailTemplate = {
      id: editingTemplate?.id || generateUUID(),
      name: data.name as string,
      subject: data.subject as string,
      content: data.content as string
    };

    if (editingTemplate) updateTemplate(template);
    else addTemplate(template);
    setEditingTemplate(template);
    if (toast) toast({ message: 'Template salvo com sucesso!', type: 'success' });
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-bottom-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Templates de Mensagem</h3>
           <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Gerencie os modelos de e-mail e WhatsApp para mala direta.</p>
        </div>
        {canInclude && (
          <button onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center justify-center gap-2 transition-all">
            <Icon name="plus" /> Novo Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {paginatedTemplates.map(t => (
          <div key={t.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-10 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl">{t.name}</h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {canEdit && (
                  <button onClick={() => { setEditingTemplate(t); setIsModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-3 rounded-2xl transition-colors bg-white/50 shadow-sm border border-blue-50">
                    <Icon name="edit" />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => confirm({ title: 'Excluir Template', message: 'Deseja excluir este template?', onConfirm: () => deleteTemplate(t.id) })} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-3 rounded-2xl transition-colors bg-white/50 shadow-sm border border-red-50">
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Assunto (E-mail)</p>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300 truncate">{t.subject || '-'}</p>
            </div>
            <div className="mt-6 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conteúdo</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-4 whitespace-pre-wrap leading-relaxed">{t.content.replace(/<[^>]*>?/gm, '')}</p>
            </div>
          </div>
        ))}
        {paginatedTemplates.length === 0 && (
          <div className="col-span-full p-20 text-center text-slate-400 font-bold italic bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
            Nenhum template cadastrado.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
               <div>
                 <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">{editingTemplate ? 'Edição' : 'Novo Cadastro'}</span>
                 <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Template de Mensagem</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Template</label>
                <input name="name" required defaultValue={editingTemplate?.name} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary text-sm md:text-base" placeholder="Ex: Boas-vindas" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Assunto (Para E-mails)</label>
                <input name="subject" defaultValue={editingTemplate?.subject} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-primary text-sm md:text-base" placeholder="Assunto do e-mail" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Conteúdo</label>
                <textarea name="content" required rows={8} defaultValue={editingTemplate?.content} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 font-medium outline-none focus:border-primary resize-none text-sm md:text-base" placeholder="Conteúdo da mensagem. Use {nome} para o nome do cliente." />
                <p className="text-xs text-slate-400 mt-2 ml-1">Variáveis disponíveis: <code className="bg-slate-100 px-1 rounded text-primary font-bold">{'{nome}'}</code>, <code className="bg-slate-100 px-1 rounded text-primary font-bold">{'{empresa}'}</code>, <code className="bg-slate-100 px-1 rounded text-primary font-bold">{'{email}'}</code>, <code className="bg-slate-100 px-1 rounded text-primary font-bold">{'{telefone}'}</code></p>
              </div>

              <div className="pt-4 md:pt-6 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-2 md:py-3 rounded-2xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" className="w-full sm:w-auto px-8 py-2 md:py-3 rounded-2xl bg-primary text-white font-bold hover:brightness-110 transition-all uppercase text-[10px] tracking-widest shadow-lg shadow-primary/30">Salvar Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const RolesTab = () => {
  const { roles, addRole, updateRole, deleteRole, hasPermission } = useApp();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [modalPerms, setModalPerms] = useState<UserPermissions>({
    dashboard: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
    clientes: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
    malaDireta: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
    tarefas: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
    usuarios: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
    configuracoes: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
    auditoria: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
    calendario: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false }
  });

  const canEdit = hasPermission('configuracoes', 'editar');
  const canDelete = hasPermission('configuracoes', 'excluir');
  const canInclude = hasPermission('configuracoes', 'incluir');

  const openModal = (role: Role | null) => {
    if (role) {
      setEditingRole(role);
      setModalPerms(role.permissions);
    } else {
      setEditingRole(null);
      setModalPerms({
        dashboard: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
        clientes: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
        malaDireta: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
        tarefas: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
        usuarios: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
        configuracoes: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
        auditoria: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
        calendario: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false }
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const role: Role = {
      id: editingRole?.id || generateUUID(),
      name: data.name as string,
      description: data.description as string,
      permissions: modalPerms
    };

    if (editingRole) updateRole(role);
    else addRole(role);
    setEditingRole(role);
    if (toast) toast({ message: 'Função salva com sucesso!', type: 'success' });
    setIsModalOpen(false);
  };

  const togglePerm = (modKey: string, permKey: string) => {
    const newPerms = { ...modalPerms };
    const mod = { ...newPerms[modKey as keyof UserPermissions] };
    
    const newVal = !(mod as any)[permKey];
    (mod as any)[permKey] = newVal;
    
    if (permKey === 'acesso' && !newVal) {
      mod.leitura = false;
      mod.incluir = false;
      mod.editar = false;
      mod.excluir = false;
    } else if (newVal && permKey !== 'acesso') {
      mod.acesso = true;
    }
    
    (newPerms as any)[modKey] = mod;
    setModalPerms(newPerms);
  };

  const setModuleAll = (modKey: string, val: boolean) => {
    const newPerms = { ...modalPerms };
    (newPerms as any)[modKey] = {
      acesso: val,
      leitura: val,
      incluir: val,
      editar: val,
      excluir: val
    };
    setModalPerms(newPerms);
  };

  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'malaDireta', label: 'Mala Direta' },
    { key: 'tarefas', label: 'Tarefas' },
    { key: 'usuarios', label: 'Usuários' },
    { key: 'configuracoes', label: 'Configurações' },
    { key: 'auditoria', label: 'Auditoria' },
    { key: 'calendario', label: 'Calendário' }
  ];

  const types = [
    { key: 'acesso', label: 'Acesso' },
    { key: 'leitura', label: 'Leitura' },
    { key: 'incluir', label: 'Incluir' },
    { key: 'editar', label: 'Editar' },
    { key: 'excluir', label: 'Excluir' }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-bottom-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Funções e Permissões (RBAC)</h3>
           <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Gerencie os perfis de acesso e suas permissões granulares.</p>
        </div>
        {canInclude && (
          <button onClick={() => openModal(null)} className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center justify-center gap-2 transition-all">
            <Icon name="plus" /> Nova Função
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {roles.map(r => (
          <div key={r.id} className="bg-slate-50 dark:bg-slate-800/50 p-10 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl">{r.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">{r.description}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {canEdit && (
                  <button onClick={() => openModal(r)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-3 rounded-2xl transition-colors bg-white/50 shadow-sm" title="Editar">
                    <Icon name="edit" />
                  </button>
                )}
                {canInclude && (
                  <button 
                    onClick={() => {
                      const clone = { ...r, id: generateUUID(), name: `${r.name} (Cópia)` };
                      addRole(clone);
                      if (toast) toast({ message: 'Função clonada!', type: 'success' });
                    }} 
                    className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-3 rounded-2xl transition-colors bg-white/50 shadow-sm"
                    title="Clonar Função"
                  >
                    <Icon name="copy" />
                  </button>
                )}
                {canDelete && r.id !== 'admin' && r.id !== 'user' && (
                  <button onClick={() => confirm({ title: 'Excluir Função', message: 'Deseja excluir esta função?', onConfirm: () => deleteRole(r.id) })} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-3 rounded-2xl transition-colors bg-white/50 shadow-sm">
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              {modules.filter(m => r.permissions[m.key as keyof UserPermissions]?.acesso).map(m => (
                <span key={m.key} className="bg-white/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-600 shadow-sm">{m.label}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 dark:bg-slate-800/30 shrink-0">
               <div>
                 <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">{editingRole ? 'Edição' : 'Novo Cadastro'}</span>
                 <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Função de Acesso</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Função</label>
                  <input name="name" required defaultValue={editingRole?.name} disabled={editingRole?.id === 'admin'} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 font-bold outline-none focus:border-primary text-sm md:text-base disabled:opacity-50" placeholder="Ex: Analista de Vendas" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                  <input name="description" required defaultValue={editingRole?.description} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 font-bold outline-none focus:border-primary text-sm md:text-base" placeholder="Descrição da função" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-primary border-l-4 border-primary pl-3 uppercase tracking-widest pt-4">Matriz de Permissões</h4>
                <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/30 dark:bg-slate-800/30 custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-100/50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Módulo</th>
                        {types.map(t => (
                          <th key={t.key} className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest text-center border-b border-slate-200 dark:border-slate-800">{t.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {modules.map(m => {
                        const mod = modalPerms[m.key as keyof UserPermissions];
                        return (
                          <tr key={m.key} className="hover:bg-white dark:hover:bg-slate-800 transition-colors group/row">
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{m.label}</span>
                                <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => setModuleAll(m.key, true)} className="p-1 text-primary hover:bg-primary/10 rounded-lg text-[9px] font-black uppercase tracking-tighter">Tudo</button>
                                  <button type="button" onClick={() => setModuleAll(m.key, false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-[9px] font-black uppercase tracking-tighter">Limpar</button>
                                </div>
                              </div>
                            </td>
                            {types.map(t => (
                              <td key={t.key} className="px-4 py-3 text-center">
                                <button 
                                  type="button"
                                  onClick={() => togglePerm(m.key, t.key)}
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    (mod as any)[t.key] 
                                      ? 'bg-primary border-primary text-white shadow-lg' 
                                      : 'border-slate-200 dark:border-slate-700 text-transparent hover:border-primary'
                                  }`}
                                >
                                  <Icon name="check" className="text-[10px]" />
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 md:pt-6 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-2 md:py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" className="w-full sm:w-auto px-8 py-2 md:py-3 rounded-2xl bg-primary text-white font-bold hover:brightness-110 transition-all uppercase text-[10px] tracking-widest shadow-lg shadow-primary/30">Salvar Função</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfiguracoesPage = () => {
  const { currentUser, updateUser, slaSettings, updateSLASettings, sectors, addSector, updateSector, deleteSector, users, clientCategories, addClientCategory, updateClientCategory, deleteClientCategory, customFields, addCustomField, updateCustomField, deleteCustomField, hasPermission, systemSettings, updateSystemSettings } = useApp();
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState('aparencia');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClientCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState<CustomField | null>(null);
  const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'sector' | 'category' | 'customField'; name: string } | null>(null);
  
  const [currentPageSectors, setCurrentPageSectors] = useState(1);
  const [currentPageCategories, setCurrentPageCategories] = useState(1);
  const [currentPageCustomFields, setCurrentPageCustomFields] = useState(1);
  const itemsPerPage = 6;

  const canAccessConfig = hasPermission('configuracoes', 'acesso');
  const canAccessMalaDireta = hasPermission('malaDireta', 'acesso');

  const tabs = [
    ...(canAccessConfig ? [{ id: 'sistema', label: 'Sistema', icon: 'settings' }] : []),
    ...(canAccessConfig ? [{ id: 'roles', label: 'Funções (RBAC)', icon: 'users-cog' }] : []),
    ...(canAccessConfig ? [{ id: 'setores', label: 'Setores', icon: 'building' }] : []),
    ...(canAccessConfig ? [{ id: 'categorias', label: 'Categorias', icon: 'tag' }] : []),
    ...(canAccessConfig ? [{ id: 'customFields', label: 'Campos Personalizados', icon: 'list-alt' }] : []),
    ...(canAccessConfig ? [{ id: 'sla', label: 'Regras de SLA', icon: 'clock' }] : []),
    ...(canAccessConfig ? [{ id: 'email', label: 'E-mail', icon: 'email' }] : []),
    ...(canAccessMalaDireta ? [{ id: 'templates', label: 'Templates', icon: 'file-alt' }] : []),
    { id: 'aparencia', label: 'Aparência', icon: 'palette' },
    { id: 'notificacoes', label: 'Notificações', icon: 'bell' }
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
      setEditingSector({ ...editingSector, nome, responsavelId, descricao });
    } else {
      const novo = { id: newId, nome, responsavelId, descricao, dataCriacao: new Date().toISOString() };
      addSector(novo);
      setEditingSector(novo);
    }
    success('Setor salvo com sucesso!');
    setIsSectorModalOpen(false);
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
      setEditingCategory({ ...editingCategory, nome, descricao, cor });
    } else {
      const nova = { id: newId, nome, descricao, cor, dataCriacao: new Date().toISOString() };
      addClientCategory(nova);
      setEditingCategory(nova);
    }
    success('Categoria salva com sucesso!');
    setIsCategoryModalOpen(false);
  };

  const handleSaveCustomField = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get('name') as string;
    const type = data.get('type') as 'text' | 'number' | 'date' | 'boolean' | 'select';
    const required = data.get('required') === 'on';
    const optionsStr = data.get('options') as string;
    const options = type === 'select' && optionsStr ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const regex = data.get('regex') as string;
    const maxLength = data.get('maxLength') ? Number(data.get('maxLength')) : undefined;
    const placeholder = data.get('placeholder') as string;

    const newId = Math.random().toString(36).substring(2, 11);
    if (editingCustomField) {
      updateCustomField({ ...editingCustomField, name, type, required, options, regex, maxLength, placeholder });
      setEditingCustomField({ ...editingCustomField, name, type, required, options, regex, maxLength, placeholder });
    } else {
      const novo = { id: newId, name, type, required, options, entity: 'client', regex, maxLength, placeholder };
      addCustomField(novo);
      setEditingCustomField(novo);
    }
    success('Campo personalizado salvo!');
    setIsCustomFieldModalOpen(false);
  };

  const handleSaveNotificationPrefs = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const data = new FormData(e.currentTarget);
    const email = data.get('email') === 'on';
    const system = data.get('system') === 'on';
    
    updateUser({
      ...currentUser,
      notificationPreferences: { email, system }
    });
    success('Preferências de notificação atualizadas com sucesso!');
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
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 w-full md:w-fit shadow-sm overflow-x-auto custom-scrollbar scrollbar-hide">
        <div className="flex gap-1.5 min-w-max">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <Icon name={tab.icon} className="text-sm md:text-base" />{tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="w-full max-w-[1550px]">
        {activeTab === 'sistema' && canAccessConfig && (
           <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 md:space-y-8 animate-in slide-in-from-bottom-2">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0">
                  <Icon name="settings" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-50 tracking-tight">Configurações do Sistema</h3>
                  <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Personalize o nome, slogan e logo do sistema.</p>
                </div>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const file = data.get('appLogo') as File;
                let logoBase64 = systemSettings.appLogo;
                if (file && file.size > 0) {
                  logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                  });
                }
                updateSystemSettings({
                  companyName: data.get('companyName') as string,
                  appLogo: logoBase64
                });
                success('Configurações do sistema atualizadas!');
              }} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                 <div className="space-y-1 md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-[2rem] md:rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Nome do Sistema</label>
                    <input name="appName" disabled value="SenseiRM" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 outline-none font-bold shadow-sm text-sm md:text-base text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                 </div>
                 <div className="space-y-1 md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-[2rem] md:rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Nome da Empresa</label>
                    <input name="companyName" key={(appName || systemSettings.companyName)} required defaultValue={(appName || systemSettings.companyName)} placeholder="Sua Empresa" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold focus:border-primary shadow-sm text-sm md:text-base text-slate-800 dark:text-slate-200" />
                 </div>
                 <div className="space-y-1 md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-[2rem] md:rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Logo do Sistema</label>
                    <div className="flex items-center gap-4">
                      {systemSettings.appLogo && (
                        <img src={appLogo || systemSettings.appLogo} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-700 p-1" />
                      )}
                      <input type="file" name="appLogo" accept="image/*" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 outline-none font-bold focus:border-primary shadow-sm text-sm md:text-base text-slate-800 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                    </div>
                 </div>
                 <button type="submit" className="md:col-span-2 py-4 md:py-5 bg-primary text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-lg shadow-xl hover:brightness-110 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3">
                   <Icon name="save" /> Salvar Configurações do Sistema
                 </button>
              </form>
           </div>
        )}

        {activeTab === 'roles' && canAccessConfig && (
           <RolesTab />
        )}

        {activeTab === 'setores' && canAccessConfig && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 md:space-y-8 animate-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0">
                   <Icon name="building" />
                 </div>
                 <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-50 tracking-tight">Setores da Organização</h3>
                   <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Gerencie os departamentos e suas respectivas lideranças.</p>
                 </div>
               </div>
               <button onClick={() => { setEditingSector(null); setIsSectorModalOpen(true); }} className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 flex items-center justify-center gap-2 transition-all">
                 <Icon name="plus" /> Novo Setor
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {sectors.slice((currentPageSectors - 1) * itemsPerPage, currentPageSectors * itemsPerPage).map(s => {
                const manager = users.find(u => u.id === s.responsavelId);
                return (
                  <div key={s.id} className="p-6 rounded-2xl md:rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all shadow-sm">
                    <div className="flex-1 overflow-hidden pr-4">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg truncate">{s.nome}</h4>
                      <p className="text-xs font-black text-primary uppercase tracking-widest mt-1 flex items-center gap-1">
                        <Icon name="user" className="text-[10px]" /> {manager?.nome || 'Não definido'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium line-clamp-2">{s.descricao || 'Sem descrição definida.'}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-4 font-black uppercase tracking-widest flex items-center gap-1">
                        <Icon name="calendar-alt" className="text-[10px]" /> Desde {new Date(s.dataCriacao).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 relative z-50 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <Edit size={18} className="pointer-events-none" />
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
                        <Trash2 size={18} className="pointer-events-none" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {sectors.length === 0 && (
                <div className="col-span-2 p-20 text-center text-slate-400 font-bold italic bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                  Nenhum setor registrado no sistema.
                </div>
              )}
            </div>
            {sectors.length > itemsPerPage && (
              <Pagination 
                currentPage={currentPageSectors} 
                totalPages={Math.ceil(sectors.length / itemsPerPage)} 
                onPageChange={setCurrentPageSectors} 
              />
            )}
          </div>
        )}

        {activeTab === 'categorias' && canAccessConfig && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 md:space-y-8 animate-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0">
                   <Icon name="tag" />
                 </div>
                 <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Categorias de Clientes</h3>
                   <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Gerencie as segmentações para organizar sua base de clientes.</p>
                 </div>
               </div>
               <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2">
                 <Icon name="plus" /> Nova Categoria
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-8">
              {clientCategories.slice((currentPageCategories - 1) * itemsPerPage, currentPageCategories * itemsPerPage).map(cat => (
                <div key={cat.id} className="p-6 md:p-10 rounded-2xl md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all shadow-sm">
                  <div className="flex-1 overflow-hidden pr-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: cat.cor || 'var(--primary-color)' }}>
                        <Icon name="tag" className="text-lg md:text-xl" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-lg md:text-xl truncate">{cat.nome}</h4>
                    </div>
                    <p className="text-sm md:text-base text-slate-400 dark:text-slate-500 mt-4 font-medium italic line-clamp-2 leading-relaxed">{cat.descricao || 'Sem descrição definida.'}</p>
                  </div>
                  <div className="flex gap-2 relative z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        setEditingCategory(cat); 
                        setIsCategoryModalOpen(true); 
                      }} 
                      className="p-4 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-blue-50" 
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
                      className="p-4 text-red-600 hover:bg-red-100 rounded-2xl transition-all cursor-pointer shadow-sm bg-white border border-red-50" 
                      title="Excluir"
                    >
                      <Trash2 size={20} className="pointer-events-none" />
                    </button>
                  </div>
                </div>
              ))}
              {clientCategories.length === 0 && (
                <div className="col-span-full p-20 text-center text-slate-400 font-bold italic bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                  Nenhuma categoria cadastrada.
                </div>
              )}
            </div>
            {clientCategories.length > itemsPerPage && (
              <Pagination 
                currentPage={currentPageCategories} 
                totalPages={Math.ceil(clientCategories.length / itemsPerPage)} 
                onPageChange={setCurrentPageCategories} 
              />
            )}
          </div>
        )}

        {activeTab === 'customFields' && canAccessConfig && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 md:space-y-8 animate-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0">
                   <Icon name="list-alt" />
                 </div>
                 <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-50 tracking-tight">Campos Personalizados</h3>
                   <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Crie campos dinà¢micos para o cadastro de clientes.</p>
                 </div>
               </div>
               <button onClick={() => { setEditingCustomField(null); setIsCustomFieldModalOpen(true); }} className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2">
                 <Icon name="plus" /> Novo Campo
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {customFields.slice((currentPageCustomFields - 1) * itemsPerPage, currentPageCustomFields * itemsPerPage).map(field => (
                <div key={field.id} className="p-6 md:p-10 rounded-2xl md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all shadow-sm">
                  <div className="flex-1 overflow-hidden pr-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 shadow-lg">
                        <Icon name={field.type === 'text' ? 'font' : field.type === 'number' ? 'hashtag' : field.type === 'date' ? 'calendar' : field.type === 'boolean' ? 'check-square' : 'list'} className="text-lg md:text-xl" />
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg md:text-xl truncate">{field.name}</h4>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-6">
                      <span className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-slate-200 text-slate-600 rounded-xl">
                        {field.type === 'text' ? 'Texto' : field.type === 'number' ? 'Número' : field.type === 'date' ? 'Data' : field.type === 'boolean' ? 'Sim/Não' : 'Seleção'}
                      </span>
                      {field.required && (
                        <span className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-red-100 text-red-600 rounded-xl">
                          Obrigatório
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCustomField(field); setIsCustomFieldModalOpen(true); }} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary flex items-center justify-center transition-colors shadow-sm"><Icon name="edit" /></button>
                    <button onClick={() => setDeleteConfirm({ id: field.id, type: 'customField', name: field.name })} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 flex items-center justify-center transition-colors shadow-sm"><Icon name="trash" /></button>
                  </div>
                </div>
              ))}
              {customFields.length === 0 && (
                <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                  <Icon name="list-alt" className="text-4xl text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">Nenhum campo personalizado cadastrado.</p>
                </div>
              )}
            </div>
            {customFields.length > itemsPerPage && (
              <Pagination 
                currentPage={currentPageCustomFields} 
                totalPages={Math.ceil(customFields.length / itemsPerPage)} 
                onPageChange={setCurrentPageCustomFields} 
              />
            )}
          </div>
        )}

        {activeTab === 'sla' && canAccessConfig && (
           <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:space-y-6 animate-in slide-in-from-bottom-2">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-blue-50 text-blue-500 flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0">
                  <Icon name="clock" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Parametrização de SLA</h3>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">Defina o prazo de entrega (em dias) para cada nível de criticidade.</p>
                </div>
              </div>
              <form onSubmit={handleSaveSLA} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                 {Object.keys(slaSettings).map(p => {
                   const colors: Record<string, string> = {
                     'Baixa': 'text-emerald-500 bg-emerald-50',
                     'Média': 'text-amber-500 bg-amber-50',
                     'Alta': 'text-orange-500 bg-orange-50',
                     'Crítica': 'text-red-500 bg-red-50'
                   };
                   const colorClass = colors[p] || 'text-slate-500 bg-slate-50';
                   const bgClass = colorClass.split(' ')[1];
                   const textClass = colorClass.split(' ')[0];
                   
                   return (
                     <div key={p} className="bg-slate-50 p-4 md:p-6 rounded-[2rem] md:rounded-2xl border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className={`absolute top-0 left-0 w-2 h-full ${bgClass.replace('50', '500')}`} />
                        <div className="flex items-center justify-between mb-3 md:mb-4 pl-4">
                          <label className={`text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 ${textClass}`}>
                            <div className={`w-2 h-2 rounded-full ${bgClass.replace('50', '500')}`} />
                            Prioridade {p}
                          </label>
                        </div>
                        <div className="relative pl-4">
                          <input name={p} type="number" min="0" defaultValue={slaSettings[p as keyof SLASettings]} className="w-full px-4 md:px-6 py-3 md:py-5 rounded-xl md:rounded-2xl border border-slate-200 bg-white focus:bg-white outline-none font-black text-xl md:text-2xl text-slate-800 focus:border-primary transition-all shadow-sm" />
                          <span className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px] md:text-xs uppercase">Dias</span>
                        </div>
                     </div>
                   );
                 })}
                 <button type="submit" className="md:col-span-2 py-4 md:py-5 bg-primary text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-lg shadow-xl hover:brightness-110 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3">
                   <Icon name="save" /> Efetivar Configurações de SLA
                 </button>
              </form>
           </div>
        )}

        {activeTab === 'email' && canAccessConfig && (
           <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:space-y-6 animate-in slide-in-from-bottom-2">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-indigo-50 text-indigo-500 flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0">
                  <Icon name="envelope" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Configurações de E-mail</h3>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">Defina as credenciais do servidor SMTP para envio de mala direta.</p>
                </div>
              </div>
              <form onSubmit={handleSaveEmail} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                 <div className="space-y-1 md:col-span-2 bg-slate-50 p-4 md:p-6 rounded-[2rem] md:rounded-2xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Provedor</label>
                    <select 
                      name="provider" 
                      defaultValue={emailSettings.provider} 
                      className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 bg-white focus:bg-white outline-none font-bold focus:border-primary shadow-sm mt-2 text-sm md:text-base"
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
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Host SMTP</label>
                    <input name="host" required defaultValue={emailSettings.host} placeholder="smtp.exemplo.com" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 bg-white focus:bg-white outline-none font-bold focus:border-primary shadow-sm text-sm md:text-base" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Porta</label>
                    <input name="port" type="number" required defaultValue={emailSettings.port} placeholder="587" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 bg-white focus:bg-white outline-none font-bold focus:border-primary shadow-sm text-sm md:text-base" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Usuário</label>
                    <input name="user" required defaultValue={emailSettings.user} placeholder="seu-email@exemplo.com" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 bg-white focus:bg-white outline-none font-bold focus:border-primary shadow-sm text-sm md:text-base" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Senha</label>
                    <input name="pass" type="password" required defaultValue={emailSettings.pass} placeholder="••••••••" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 bg-white focus:bg-white outline-none font-bold focus:border-primary shadow-sm text-sm md:text-base" />
                 </div>
                 <div className="space-y-1 md:col-span-2 flex items-center gap-3 bg-slate-50 p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100">
                    <input name="secure" type="checkbox" id="secure" defaultChecked={emailSettings.secure} className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="secure" className="text-xs md:text-sm font-bold text-slate-700">Usar conexão segura (SSL/TLS)</label>
                 </div>
                 {(selectedProvider === 'GMail' || selectedProvider === 'Office365') && (
                   <div className="md:col-span-2 bg-amber-50 border border-amber-200 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex flex-col sm:flex-row gap-4 items-start shadow-sm">
                     <div className="text-amber-500 shrink-0 mt-1 bg-white p-2 rounded-xl shadow-sm">
                       <Icon name="exclamation-triangle" />
                     </div>
                     <div>
                       <h4 className="font-black text-amber-800 text-xs md:text-sm mb-1">Atenção: Senha de Aplicativo Necessária</h4>
                       <p className="text-[10px] md:text-xs text-amber-700 font-medium leading-relaxed">
                         Para provedores como {selectedProvider}, você não pode usar a senha normal da sua conta se a Autenticação em Duas Etapas (2FA) estiver ativada. Você precisará gerar uma <strong>Senha de Aplicativo</strong> nas configurações de segurança da sua conta e inseri-la no campo "Senha" acima.
                       </p>
                     </div>
                   </div>
                 )}
                 <button type="submit" className="md:col-span-2 py-4 md:py-5 bg-primary text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-lg shadow-xl hover:brightness-110 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3">
                   <Icon name="save" /> Salvar Configurações de E-mail
                 </button>
              </form>
           </div>
        )}

        {activeTab === 'templates' && canAccessMalaDireta && (
           <TemplatesTab />
        )}

        {activeTab === 'aparencia' && (
           <div className="bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl space-y-4 md:space-y-6 animate-in slide-in-from-bottom-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-white/10 text-white flex items-center justify-center text-xl md:text-2xl backdrop-blur-md border border-white/10 shrink-0">
                  <Icon name="palette" />
                </div>
                <div>
                  <h3 className="text-xl md:text-3xl font-black text-white tracking-tight">Ecossistema Visual</h3>
                  <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">Personalize a identidade do framework para seu perfil.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10 relative z-10">
                 {THEMES.map(t => (
                   <button key={t.id} onClick={() => updateUser({ ...currentUser!, tema: t.id })} className={`p-6 md:p-10 rounded-2xl md:rounded-[3.5rem] border-2 transition-all flex flex-col items-center gap-4 md:gap-6 relative group ${currentUser?.tema === t.id ? 'border-primary bg-white/10 shadow-lg shadow-primary/20 scale-105' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                     <div className="w-16 h-16 md:w-24 md:h-24 rounded-full shadow-2xl transition-transform group-hover:scale-110 flex items-center justify-center" style={{ backgroundColor: t.color, boxShadow: `0 0 40px ${t.color}88` }}>
                       {currentUser?.tema === t.id && <Icon name="check" className="text-white text-xl md:text-2xl drop-shadow-md" />}
                     </div>
                     <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-[0.2em] text-center">{t.name}</span>
                   </button>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-6 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[2rem] bg-purple-50 text-purple-500 flex items-center justify-center text-2xl shadow-inner shrink-0">
                <Icon name="bell" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Preferências de Notificação</h3>
                <p className="text-sm text-slate-400 font-medium mt-1">Escolha como deseja ser notificado sobre novas tarefas e atualizações.</p>
              </div>
            </div>
            
            <form onSubmit={handleSaveNotificationPrefs} className="max-w-2xl space-y-8">
              <div className="space-y-4">
                <label className="flex items-center gap-4 p-6 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-white hover:shadow-md transition-all">
                  <input 
                    type="checkbox" 
                    name="system" 
                    defaultChecked={currentUser?.notificationPreferences?.system ?? true}
                    className="w-6 h-6 rounded text-primary focus:ring-primary" 
                  />
                  <div>
                    <div className="font-bold text-slate-800">Notificações no Sistema</div>
                    <div className="text-sm text-slate-500 font-medium">Receber alertas dentro da plataforma (ícone de sino).</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-4 p-6 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-white hover:shadow-md transition-all">
                  <input 
                    type="checkbox" 
                    name="email" 
                    defaultChecked={currentUser?.notificationPreferences?.email ?? true}
                    className="w-6 h-6 rounded text-primary focus:ring-primary" 
                  />
                  <div>
                    <div className="font-bold text-slate-800">Notificações por E-mail</div>
                    <div className="text-sm text-slate-500 font-medium">Receber um e-mail quando uma tarefa for atribuída a você.</div>
                  </div>
                </label>
              </div>
              
              <button type="submit" className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase shadow-xl hover:brightness-110 transition-all flex items-center gap-2">
                <Icon name="save" /> Salvar Preferências
              </button>
            </form>
          </div>
        )}
      </div>

      {isSectorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 md:mb-8">
               <h3 className="text-xl md:text-2xl font-black text-slate-800">{editingSector ? 'Configurar Setor' : 'Novo Setor'}</h3>
               <button onClick={() => setIsSectorModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            <form onSubmit={handleSaveSector} className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Setor</label>
                <input name="nome" required defaultValue={editingSector?.nome} placeholder="Ex: Engenharia, Comercial..." className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner text-sm md:text-base" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Responsável pelo Setor</label>
                <select name="responsavelId" defaultValue={editingSector?.responsavelId} required className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary text-sm md:text-base">
                  <option value="">Selecione um gestor...</option>
                  {users.filter(u => u.status === EntityStatus.ACTIVE).map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                <textarea name="descricao" rows={3} defaultValue={editingSector?.descricao} placeholder="Breve resumo da responsabilidade da equipe..." className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-medium resize-none focus:border-primary shadow-inner text-sm md:text-base" />
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-3 pt-4 md:pt-6">
                 <button type="button" onClick={() => setIsSectorModalOpen(false)} className="w-full md:w-auto px-8 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all text-sm md:text-base">Desistir</button>
                 <button type="submit" className="w-full md:w-auto px-10 py-3 rounded-xl bg-primary text-white font-black hover:brightness-110 shadow-lg transition-all text-sm md:text-base">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 md:mb-8">
               <h3 className="text-xl md:text-2xl font-black text-slate-800">{editingCategory ? 'Configurar Categoria' : 'Nova Categoria'}</h3>
               <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Categoria</label>
                <input name="nome" required defaultValue={editingCategory?.nome} placeholder="Ex: VIP, Atacadista..." className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner text-sm md:text-base" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Cor de Identificação</label>
                <input name="cor" type="color" defaultValue={editingCategory?.cor || '#10b981'} className="w-full h-12 p-1 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                <textarea name="descricao" rows={3} defaultValue={editingCategory?.descricao} placeholder="Defina o perfil desta categoria..." className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-medium resize-none focus:border-primary shadow-inner text-sm md:text-base" />
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-3 pt-4 md:pt-6">
                 <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="w-full md:w-auto px-8 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all text-sm md:text-base">Desistir</button>
                 <button type="submit" className="w-full md:w-auto px-10 py-3 rounded-xl bg-primary text-white font-black hover:brightness-110 shadow-lg transition-all text-sm md:text-base">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isCustomFieldModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 md:mb-8">
               <h3 className="text-xl md:text-2xl font-black text-slate-800">{editingCustomField ? 'Editar Campo' : 'Novo Campo Personalizado'}</h3>
               <button onClick={() => setIsCustomFieldModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><Icon name="times" className="text-2xl" /></button>
            </div>
            <form onSubmit={handleSaveCustomField} className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Campo</label>
                <input name="name" required defaultValue={editingCustomField?.name} placeholder="Ex: Data de Aniversário" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner text-sm md:text-base" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
                  <select name="type" required defaultValue={editingCustomField?.type || 'text'} className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner text-sm md:text-base">
                    <option value="text">Texto Curto</option>
                    <option value="number">Número</option>
                    <option value="date">Data</option>
                    <option value="boolean">Sim/Não (Checkbox)</option>
                    <option value="select">Lista de Seleção</option>
                  </select>
                </div>
                <div className="space-y-1 flex flex-col justify-center">
                  <label className="flex items-center gap-3 mt-2 md:mt-6 cursor-pointer">
                    <input type="checkbox" name="required" defaultChecked={editingCustomField?.required} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                    <span className="font-bold text-slate-700 text-sm md:text-base">Campo Obrigatório</span>
                  </label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Opções (Apenas para Lista de Seleção)</label>
                <input name="options" defaultValue={editingCustomField?.options?.join(', ')} placeholder="Opção 1, Opção 2, Opção 3..." className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-medium focus:border-primary shadow-inner text-sm md:text-base" />
                <p className="text-xs text-slate-400 ml-2 mt-1">Separe as opções por vírgula.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Placeholder / Dica</label>
                  <input name="placeholder" defaultValue={editingCustomField?.placeholder} placeholder="Ex: DD/MM/AAAA" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner text-sm md:text-base" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tamanho Máximo</label>
                  <input type="number" name="maxLength" defaultValue={editingCustomField?.maxLength} placeholder="Ex: 50" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-bold focus:border-primary shadow-inner text-sm md:text-base" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Expressão Regular (Regex) para Validação</label>
                <input name="regex" defaultValue={editingCustomField?.regex} placeholder="Ex: ^[0-9]*$" className="w-full px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white outline-none font-medium focus:border-primary shadow-inner text-sm md:text-base" />
                <p className="text-xs text-slate-400 ml-2 mt-1">Opcional: Use regex para validar o formato do campo.</p>
              </div>
              
              <div className="pt-4 flex flex-col md:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsCustomFieldModalOpen(false)} className="w-full md:w-auto px-6 py-2 md:py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm md:text-base">Cancelar</button>
                <button type="submit" className="w-full md:w-auto bg-primary text-white px-8 py-2 md:py-3 rounded-2xl font-black uppercase shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm md:text-base">
                  <Icon name="save" /> Salvar Campo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 p-6 md:p-8">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-red-500 md:w-10 md:h-10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-slate-800">Confirmar Exclusão</h3>
              <p className="text-slate-500 font-medium text-sm md:text-base">Você tem certeza que deseja remover {deleteConfirm.type === 'sector' ? 'o setor' : 'a categoria'} <span className="font-bold text-slate-800">"{deleteConfirm.name}"</span>? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 md:py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm md:text-base"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm.type === 'sector') deleteSector(deleteConfirm.id);
                  else deleteClientCategory(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2 md:py-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all text-sm md:text-base"
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
  const { auditLogs, currentUser, hasPermission } = useApp();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearReason, setClearReason] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const handleClearLogs = async () => {
    if (!clearReason || clearReason.trim().length < 5) return;
    setIsClearing(true);
    const success = await auditService.clearLogs(clearReason);
    if (success) {
      setIsClearModalOpen(false);
      setClearReason('');
      setIsClearing(false);
      // window.location.reload() is removed to prevent race conditions.
      // The real-time update via Socket.IO will trigger loadData() automatically.
    } else {
      alert('Erro ao limpar logs. Verifique as permissões.');
      setIsClearing(false);
    }
  };
  
  const filteredLogs = useMemo(() => {
    let logs = currentUser?.roleId === 'admin' ? auditLogs : auditLogs.filter(log => log.userId === currentUser?.id);
    if (debouncedSearchTerm) {
      const lowerTerm = debouncedSearchTerm.toLowerCase();
      logs = logs.filter(log => 
        log.details.toLowerCase().includes(lowerTerm) || 
        log.module.toLowerCase().includes(lowerTerm) ||
        log.userName.toLowerCase().includes(lowerTerm) ||
        (log.entityId && log.entityId.toLowerCase().includes(lowerTerm)) ||
        (log.ip && log.ip.toLowerCase().includes(lowerTerm))
      );
    }
    return logs;
  }, [auditLogs, currentUser, debouncedSearchTerm]);
  
  const canExport = hasPermission('auditoria', 'leitura');
  const canClear = currentUser?.roleId === 'admin'; // Only super admin can clear logs

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

  const exportToCSV = () => {
    const headers = ['Horário', 'Autor', 'IP', 'Módulo', 'Operação', 'Detalhes', 'Entidade ID'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        `"${new Date(log.timestamp).toLocaleString()}"`,
        `"${log.userName}"`,
        `"${log.ip || ''}"`,
        `"${getModuleLabel(log.module)}"`,
        `"${log.action}"`,
        `"${log.details.replace(/"/g, '""')}"`,
        `"${log.entityId || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <p className="text-slate-500 font-medium">Log completo de segurança e rastreabilidade de dados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 outline-none font-medium text-sm text-slate-700 dark:text-slate-200 focus:border-primary dark:focus:border-primary transition-all shadow-sm"
            />
          </div>
          {canExport && (
            <button onClick={exportToCSV} className="bg-slate-100 text-slate-600 px-5 py-3 rounded-2xl font-black text-xs uppercase shadow-sm hover:bg-slate-200 flex items-center justify-center gap-2 transition-all whitespace-nowrap flex-1 md:flex-none">
              <Icon name="download" /> Exportar
            </button>
          )}
          {canClear && (
            <button 
              onClick={() => setIsClearModalOpen(true)} 
              className="text-red-600 bg-red-50 px-5 py-3 rounded-2xl text-xs font-black uppercase border border-red-100 hover:bg-slate-50/50 dark:bg-slate-800/30 hover:text-white transition-all shadow-sm whitespace-nowrap flex-1 md:flex-none justify-center flex items-center"
            >
              <Icon name="trash" className="inline-block mr-2 -mt-1" />
              Limpar Histórico
            </button>
          )}
        </div>
      </div>

      {isClearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-8 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300 w-[95vw] lg:w-[90vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col">
            <div className="p-8 border-b bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm">
                  <Icon name="trash" className="text-2xl" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-red-900 dark:text-red-50">Limpar Histórico</h3>
                  <p className="text-red-600/70 dark:text-red-400/70 text-[10px] font-black uppercase tracking-wider">Ação Irreversível</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Esta ação irá remover permanentemente todos os registros de auditoria. Por favor, informe o motivo desta ação para fins de conformidade.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Motivo da Limpeza</label>
                <textarea 
                  value={clearReason}
                  onChange={(e) => setClearReason(e.target.value)}
                  placeholder="Ex: Manutenção periódica, Limpeza de logs antigos..."
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none font-medium text-sm text-slate-700 dark:text-slate-200 focus:border-red-500 dark:focus:border-red-500 transition-all min-h-[120px] resize-none"
                  autoFocus
                />
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-1">Mínimo de 5 caracteres.</p>
              </div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={() => { setIsClearModalOpen(false); setClearReason(''); }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                disabled={isClearing}
              >
                Cancelar
              </button>
              <button 
                onClick={handleClearLogs}
                disabled={!clearReason || clearReason.trim().length < 5 || isClearing}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200 dark:shadow-red-900/40 transition-all flex items-center justify-center gap-2"
              >
                {isClearing ? (
                  <>
                    <Icon name="loader" className="animate-spin" />
                    Limpando...
                  </>
                ) : (
                  'Confirmar Limpeza'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse hidden md:table">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest w-32">Horário</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest w-48">Autor</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest w-32">IP</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest w-40">Módulo</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center w-32">Operação</th>
                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Detalhes & Comparação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 align-top">
                     <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 whitespace-nowrap">{new Date(log.timestamp).toLocaleDateString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                     </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 uppercase shadow-sm">
                           {log.userName.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.userName}</span>
                     </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                     <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700">
                        {log.ip || '---'}
                     </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg">{getModuleLabel(log.module)}</span>
                  </td>
                  <td className="px-6 py-5 text-center align-top">
                     <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${getActionColor(log.action)}`}>
                        {log.action}
                     </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                     <div className="space-y-3">
                       <p className="text-xs font-medium text-slate-600 leading-relaxed">
                         {log.details.split('Alterações:')[0]}
                       </p>
                       
                       {log.diff && log.diff.length > 0 && (
                         <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mt-2">
                           <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                               <Icon name="file-text" className="text-slate-400" /> Comparação de Alterações
                             </span>
                           </div>
                           <div className="p-4 space-y-3">
                             {log.diff.map((d, idx) => (
                               <div key={idx} className="text-xs font-mono grid grid-cols-[120px_1fr] gap-4 items-start">
                                 <span className="font-bold text-slate-500 text-right pt-1">{d.field}:</span>
                                 <div className="space-y-1 flex-1">
                                   <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-100 flex items-start gap-2 break-all">
                                     <span className="text-red-400 font-black select-none">-</span>
                                     <span className="line-through opacity-80">{d.oldValue}</span>
                                   </div>
                                   <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-start gap-2 break-all">
                                     <span className="text-emerald-500 font-black select-none">+</span>
                                     <span className="font-medium">{d.newValue}</span>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                 <tr>
                   <td colSpan={5} className="p-20 text-center text-slate-400">
                     <div className="flex flex-col items-center justify-center">
                       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                         <Icon name="search" className="text-3xl text-slate-300" />
                       </div>
                       <p className="font-bold text-slate-500 text-lg">Nenhum registro encontrado</p>
                       <p className="text-sm text-slate-400 mt-1">Não há logs de auditoria que correspondam à sua busca.</p>
                     </div>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedLogs.map(log => (
              <div key={log.id} className="p-4 space-y-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 uppercase shadow-sm shrink-0">
                       {log.userName.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{log.userName}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono">
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase border shrink-0 ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </div>
                
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg inline-block mb-2">{getModuleLabel(log.module)}</span>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    {log.details.split('Alterações:')[0]}
                  </p>
                </div>

                {log.diff && log.diff.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mt-2">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="file-text" className="text-slate-400 w-3 h-3" /> Comparação
                      </span>
                    </div>
                    <div className="p-3 space-y-3">
                      {log.diff.map((d, idx) => (
                        <div key={idx} className="text-[10px] font-mono flex flex-col gap-1">
                          <span className="font-bold text-slate-500">{d.field}:</span>
                          <div className="space-y-1">
                            <div className="bg-red-50 text-red-700 px-2 py-1 rounded-lg border border-red-100 flex items-start gap-1 break-all">
                              <span className="text-red-400 font-black select-none">-</span>
                              <span className="line-through opacity-80">{d.oldValue}</span>
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 flex items-start gap-1 break-all">
                              <span className="text-emerald-500 font-black select-none">+</span>
                              <span className="font-medium">{d.newValue}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {paginatedLogs.length === 0 && (
               <div className="p-10 text-center text-slate-400">
                 <div className="flex flex-col items-center justify-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                     <Icon name="search" className="text-3xl text-slate-300" />
                   </div>
                   <p className="font-bold text-slate-500 text-lg">Nenhum registro encontrado</p>
                   <p className="text-sm text-slate-400 mt-1">Não há logs de auditoria que correspondam à sua busca.</p>
                 </div>
               </div>
            )}
          </div>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
};

const SobrePage = () => {
  const { users, clients, tasks, history, systemSettings } = useApp();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-20 space-y-8 animate-in fade-in duration-700">
      {/* Hero Section - Editorial Style (Combined at Top) */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 py-16 sm:py-24 px-6 sm:px-12 text-center shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#3b82f6_0%,transparent_50%)] animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-center gap-4">
            {(appLogo || systemSettings.appLogo) ? (
              <img src={appLogo || systemSettings.appLogo} alt="SenseiRM" className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-2xl" />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-3xl flex items-center justify-center shadow-xl rotate-3">
                <Icon name="users" className="text-white text-2xl sm:text-3xl" />
              </div>
            )}
            <h1 className="text-white"><SenseiLogo className="text-4xl sm:text-6xl" /></h1>
          </div>
          
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-slate-400 text-xs sm:text-sm font-black uppercase tracking-[0.3em]">Framework de Gestão Inteligente</p>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent w-full" />
            <p className="text-lg sm:text-xl text-slate-300 font-medium leading-relaxed italic serif">
              "Transformando dados em relacionamentos, e tarefas em resultados extraordinários."
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <span className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Versão 1.2.0</span>
            <span className="px-6 py-2 bg-primary/20 backdrop-blur-md border border-primary/20 rounded-full text-xs font-black text-primary uppercase tracking-widest">Standard Edition</span>
            <span className="px-6 py-2 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">Status: Operacional</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Quick Stats - Horizontal Row */}
        <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Usuários Ativos', value: users.length, icon: 'users', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Carteira de Clientes', value: clients.length, icon: 'user-tie', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Fluxo de Tarefas', value: tasks.length, icon: 'tasks', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Registros de Auditoria', value: history.length, icon: 'shield-check', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 flex flex-col justify-between group hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                  <Icon name={stat.icon} className="text-sm" />
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase">Live</span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">{stat.value}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features Bento - Grid within Grid */}
        <div className="md:col-span-12 lg:col-span-9 bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-100 dark:border-slate-800 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Inovações da Versão 1.2.0</h3>
            </div>
            <Icon name="chevron-right" className="text-slate-300" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Gestão Avançada', desc: 'Filtros dinà¢micos e busca fonética inteligente.', icon: 'search' },
              { title: 'WhatsApp 2.0', desc: 'Comunicação instantà¢nea integrada ao fluxo.', icon: 'message-circle' },
              { title: 'Assisted Field', desc: 'Campos que automatizam busca de dados.', icon: 'magic' },
              { title: 'Campos Customizáveis', desc: 'Adapte o sistema à sua realidade de negócio.', icon: 'settings' },
              { title: 'Auditoria 360', desc: 'Rastreamento completo de todas as operações.', icon: 'shield' },
              { title: 'High Performance', desc: 'Resposta ultra-rápida com novo motor de cache.', icon: 'zap' },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-primary/20 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-primary mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <Icon name={f.icon} className="text-sm" />
                </div>
                <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase mb-1">{f.title}</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Specs Sidebar */}
        <div className="md:col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Icon name="cpu" className="text-xs" />
              <h4 className="text-[9px] font-black uppercase tracking-widest">Tecnologia</h4>
            </div>
            <div className="space-y-3">
              {[
                { k: 'Engine', v: 'React 19' },
                { k: 'Style', v: 'Tailwind 4' },
                { k: 'Runtime', v: 'Node/Express' },
                { k: 'Database', v: 'Prisma/SQLite' },
                { k: 'Realtime', v: 'Socket.io' },
                { k: 'Types', v: 'TS 5.8' },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center font-mono">
                  <span className="text-[9px] text-slate-400 uppercase">{s.k}</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{s.v}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                Arquitetura moderna e resiliente, otimizada para alta performance e segurança de dados.
              </p>
            </div>
          </div>
        </div>

        {/* Developer & Contact - Full Width */}
        <div className="md:col-span-12 bg-primary rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Icon name="code" className="text-xl" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest">Desenvolvimento</h4>
                  <p className="text-xl font-bold">NelMac Sistemas</p>
                </div>
              </div>
              <p className="text-sm font-medium leading-relaxed italic opacity-80 max-w-md">
                "Transformando ideias em soluções tecnológicas inovadoras desde 2023. Nossa missão é simplificar a complexidade através do design e da engenharia."
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-all">
                    <Icon name="globe" className="text-xs" />
                  </div>
                  <span className="text-xs font-bold">www.nelmacsistemas.com.br</span>
                </div>
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-all">
                    <Icon name="mail" className="text-xs" />
                  </div>
                  <span className="text-xs font-bold">contato@nelmacsistemas.com.br</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-all">
                    <Icon name="phone" className="text-xs" />
                  </div>
                  <span className="text-xs font-bold">(51) 99273-3121</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Icon name="shield" className="text-xs" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Dados Protegidos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* Footer Micro-Label */}
      <div className="text-center pt-8">
        <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em]">
          Â© 2026 NelMac Sistemas • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { login, currentUser, systemSettings } = useApp();
  const [error, setError] = useState('');
  if (currentUser) return <Navigate to="/dashboard" />;
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = data.get('email') as string;
    const pass = data.get('pass') as string;
    const success = await login(email, pass);
    if (!success) setError('Acesso negado: Credenciais ou conta inativa.');
  };
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[4rem] shadow-2xl p-8 sm:p-14 z-10 text-center border border-slate-100 dark:border-slate-800">
        {(appLogo || systemSettings.appLogo) ? (
          <img src={appLogo || systemSettings.appLogo} alt="SenseiRM" className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-8 sm:mb-10 object-contain drop-shadow-xl" />
        ) : (
          <div className="inline-block p-5 sm:p-7 bg-primary rounded-[2rem] sm:rounded-2xl mb-8 sm:mb-10 shadow-primary/20">
            <Icon name="users-cog" className="text-4xl sm:text-5xl text-white" />
          </div>
        )}
        <h2 className="text-slate-900 dark:text-slate-50 mb-2">
          <SenseiLogo className="text-3xl sm:text-4xl" />
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 sm:mb-12 uppercase tracking-widest">{(appName || systemSettings.companyName)}</p>
        <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8 text-left">
          <input 
            name="email" 
            type="email" 
            required 
            className="w-full px-5 sm:px-7 py-4 sm:py-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-50 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 font-bold transition-all shadow-inner text-sm sm:text-base" 
            placeholder="ex: admin@senseirm.com" 
          />
          <input 
            name="pass" 
            type="password" 
            required 
            className="w-full px-5 sm:px-7 py-4 sm:py-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-50 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 font-bold transition-all shadow-inner text-sm sm:text-base" 
            placeholder="••••••••" 
          />
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
              <Icon name="alert-circle" className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          <button 
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 sm:py-6 rounded-2xl sm:rounded-3xl shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all text-lg mt-4"
          >
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

const MailListPage = () => {
  const { clients, addMailHistory, currentUser, templates, hasPermission } = useApp();
  const { error, success, warning } = useToast();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [type, setType] = useState<'email' | 'whatsapp'>('email');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // WhatsApp Queue State
  const [whatsappQueue, setWhatsappQueue] = useState<string[]>([]);
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
      if (type === 'email') {
        setSubject(template.subject);
      }
    }
  };

  const canSend = hasPermission('malaDireta', 'incluir');

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

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterRating, type]);

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
      id: generateUUID(), 
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
    <div className="p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-4 md:gap-8 animate-in fade-in duration-500 h-auto lg:h-[calc(100vh-120px)] relative">
      {/* WhatsApp Queue Overlay */}
      {whatsappQueue.length > 0 && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center rounded-[2rem] sm:rounded-[3.5rem] p-4">
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6 sm:space-y-8 animate-in zoom-in-95">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Icon name="phone" className="text-3xl sm:text-4xl" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Fila de Envio WhatsApp</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
                Enviando {whatsappIndex + 1} de {whatsappQueue.length}
              </p>
            </div>
            
            {whatsappIndex < whatsappQueue.length ? (
              <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 text-left">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Próximo Destinatário:</p>
                <p className="font-bold text-slate-700 text-sm sm:text-base">{clients.find(c => c.id === whatsappQueue[whatsappIndex])?.nomeRazaoSocial}</p>
                <p className="text-xs text-slate-500">{clients.find(c => c.id === whatsappQueue[whatsappIndex])?.telefoneSecundario || clients.find(c => c.id === whatsappQueue[whatsappIndex])?.telefonePrincipal}</p>
              </div>
            ) : (
              <div className="bg-emerald-50 p-4 sm:p-6 rounded-2xl border border-emerald-100">
                <p className="font-bold text-emerald-700 text-sm sm:text-base">Todos os envios foram processados!</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {whatsappIndex < whatsappQueue.length ? (
                <>
                  <button onClick={processNextWhatsApp} className="w-full py-3 sm:py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all text-sm sm:text-base">
                    Abrir WhatsApp Web
                  </button>
                  <div className="flex gap-3">
                    <button onClick={skipWhatsApp} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm sm:text-base">Pular</button>
                    <button onClick={cancelWhatsAppQueue} className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all text-sm sm:text-base">Cancelar Fila</button>
                  </div>
                </>
              ) : (
                <button onClick={cancelWhatsAppQueue} className="w-full py-3 sm:py-4 bg-slate-800 text-white rounded-2xl font-black shadow-lg hover:bg-slate-900 transition-all text-sm sm:text-base">
                  Concluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-slate-900 p-6 md:p-10 lg:p-12 rounded-2xl md:rounded-[3.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col space-y-6 md:space-y-8 overflow-hidden min-h-[600px] lg:min-h-0">
         <div className="flex bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner shrink-0">
            <button type="button" onClick={() => setType('email')} className={`flex-1 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-black tracking-widest text-xs sm:text-sm transition-all ${type === 'email' ? 'bg-white dark:bg-slate-900 text-primary shadow-xl' : 'text-slate-400 dark:text-slate-500'}`}>MAIL SERVICE</button>
            <button type="button" onClick={() => setType('whatsapp')} className={`flex-1 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-black tracking-widest text-xs sm:text-sm transition-all ${type === 'whatsapp' ? 'bg-white dark:bg-slate-900 text-primary shadow-xl' : 'text-slate-400 dark:text-slate-500'}`}>WHATSAPP API</button>
         </div>
         
         <div className="flex gap-2 shrink-0 flex-wrap">
           <span className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest flex items-center mr-2 w-full sm:w-auto mb-2 sm:mb-0">Variáveis Dinà¢micas:</span>
           {['{nome}', '{empresa}', '{email}', '{telefone}'].map(tag => (
             <button type="button" key={tag} onClick={() => setMessage(prev => prev + tag)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-mono font-bold transition-colors">
               {tag}
             </button>
           ))}
         </div>

         <form onSubmit={handleSend} className="flex-1 flex flex-col space-y-4 sm:space-y-6 overflow-hidden">
            <div className="flex gap-4 shrink-0">
               <select 
                 onChange={(e) => applyTemplate(e.target.value)} 
                 className="flex-1 px-5 sm:px-7 py-4 sm:py-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 outline-none font-bold focus:border-primary dark:focus:border-primary shadow-inner bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm sm:text-base"
               >
                 <option value="">Carregar Template Rápido...</option>
                 {templates.map(t => (
                   <option key={t.id} value={t.id}>{t.name}</option>
                 ))}
               </select>
            </div>
            {type === 'email' && (
              <input 
                name="assunto" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required 
                className="w-full px-5 sm:px-7 py-4 sm:py-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 outline-none font-bold focus:border-primary dark:focus:border-primary shadow-inner shrink-0 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" 
                placeholder="Assunto da Comunicação" 
              />
            )}
            
            <div className="flex-1 flex flex-col min-h-0 relative">
              {type === 'email' ? (
                <div className="flex-1 overflow-hidden flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 focus-within:border-primary dark:focus-within:border-primary transition-colors">
                  <ReactQuill 
                    theme="snow" 
                    value={message} 
                    onChange={setMessage} 
                    className="flex-1 flex flex-col h-full dark:text-slate-100"
                    placeholder="Escreva sua mensagem rica aqui..."
                  />
                </div>
              ) : (
                <textarea 
                  name="mensagem" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required 
                  className="flex-1 w-full px-5 sm:px-7 py-4 sm:py-6 rounded-[2rem] sm:rounded-2xl border border-slate-200 dark:border-slate-700 outline-none resize-none font-medium focus:border-primary dark:focus:border-primary shadow-inner text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" 
                  placeholder="Mensagem estruturada para WhatsApp..." 
                />
              )}
            </div>

            <button type="submit" disabled={!canSend || isSending} className={`w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl shadow-2xl transition-all shrink-0 flex items-center justify-center gap-3 ${canSend && !isSending ? 'bg-primary text-white hover:brightness-110' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
               {isSending ? (
                 <>Enviando... <Icon name="loader" className="animate-spin" /></>
               ) : (
                 <>Broadcast ({selectedClients.length})</>
               )}
            </button>
         </form>
      </div>
      
      <div className="w-full lg:w-96 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm overflow-hidden h-[600px] lg:h-auto">
        <h4 className="font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest text-xs border-b border-slate-50 dark:border-slate-800 pb-4 shrink-0">
          Destinos Válidos <span className="text-slate-400 dark:text-slate-500 font-medium ml-1">({filteredClients.length})</span>
        </h4>
        
        {/* Search and Filters */}
        <div className="space-y-4 mb-6 shrink-0">
          <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none focus:border-primary dark:focus:border-primary text-slate-700 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary dark:focus:border-primary text-slate-700 dark:text-slate-200"
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
          {paginatedClients.length === 0 ? (
            <div className="text-center py-10 opacity-30">
              <Icon name="search" className="text-3xl mb-2 mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum cliente válido encontrado</p>
            </div>
          ) : (
            paginatedClients.map(c => (
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
                    {c.avaliacaoInterna}â˜…
                  </div>
                )}
              </label>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 shrink-0">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center shrink-0">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Selecionado</span>
          <span className="text-lg font-black text-primary">{selectedClients.length}</span>
        </div>
      </div>
    </div>
  );
};


// VIS-05: Wrapper de transição de página — animação de entrada CSS em cada rota
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="page-enter w-full">
    {children}
  </div>
);

const MainLayout = () => {
  const { currentUser, systemSettings } = useApp();
  const location = useLocation();
  const titles: Record<string, string> = {
    '/dashboard': 'Indicadores de Performance',
    '/calendario': 'Calendário de Prazos',
    '/clientes': 'Gerenciamento de Clientes',
    '/mala-direta': 'Comunicação Estratégica',
    '/tarefas': 'Gerenciamento Operacional',
    '/usuarios': 'Usuários do Sistema',
    '/configuracoes': 'Definições do Sistema',
    '/auditoria': 'Segurança de Dados',
    '/sobre': `Sobre o SenseiRM`
  };
  if (!currentUser) return <Navigate to="/login" />;
  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen">
      <Sidebar />
      <BottomNavigation />
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col w-full">
        <Header title={titles[Object.keys(titles).find(k => location.pathname.startsWith(k)) || ''] || <SenseiLogo className="text-xl" />} />
        <main className="flex-1 lg:pb-16 w-full max-w-[100vw] overflow-x-hidden">
          {/* Chave da rota para garantir re-animação a cada navegação */}
          <Routes location={location} key={location.pathname}>
            <Route path="/dashboard"     element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/calendario"    element={<PageTransition><CalendarView /></PageTransition>} />
            <Route path="/clientes"      element={<PageTransition><ClientsPage /></PageTransition>} />
            <Route path="/mala-direta"   element={<PageTransition><MailListPage /></PageTransition>} />
            <Route path="/tarefas"       element={<PageTransition><TasksPage /></PageTransition>} />
            <Route path="/usuarios"      element={<PageTransition><UsersPage /></PageTransition>} />
            <Route path="/configuracoes" element={<PageTransition><ConfiguracoesPage /></PageTransition>} />
            <Route path="/auditoria"     element={<PageTransition><AuditoriaPage /></PageTransition>} />
            <Route path="/sobre"         element={<PageTransition><SobrePage /></PageTransition>} />
            <Route path="*"              element={<Navigate to="/dashboard" />} />
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
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={<MainLayout />} />
              </Routes>
            </ErrorBoundary>
          </HashRouter>
        </AppProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
};

export default App;
