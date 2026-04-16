const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `import { \n  Edit, Trash2, Plus, Tag, Building2, Clock, Palette, Shield, Check, \n  'edit': Edit,`;

const replacementStr = `import { 
  Edit, Trash2, Plus, Tag, Building2, Clock, Palette, Shield, Check, 
  Users, LayoutDashboard, Mail, FileText, Settings, ShieldCheck, Info,
  Search, Filter, Download, Upload, LogOut, User as UserIcon, Phone, Mail as MailIcon,
  Globe, MapPin, CreditCard, PieChart as PieChartIcon, Activity, AlertTriangle, ChevronRight,
  ChevronLeft, MoreVertical, X, Calendar, MessageSquare, ExternalLink, HelpCircle,
  Bell, BellOff, Zap, TrendingUp, Target, Briefcase, Star, Award, CheckCircle,
  AlertCircle, PlayCircle, CheckSquare, ListTodo, UserPlus, FilePlus, Building,
  Sun, Moon, Send, ClipboardList, Cog, BookOpen, BarChart2, Home, MoreHorizontal, Wand2, MessageCircle, Loader2,
  Wallet, Paperclip, History, UserCog, Eye, Cpu, FolderOpen, Key, ArrowLeft, ArrowRight, Camera, Copy, Save, Code
} from 'lucide-react';

// Icons from Lucide — mapeamento completo e correto
const iconMap: Record<string, any> = {
  // Ações
  'edit': Edit,`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('App.tsx', code, 'utf8');
console.log("App.tsx fixed successfully!");
