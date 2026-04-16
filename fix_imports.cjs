const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `Sun, Moon, Send, ClipboardList, Cog, BookOpen, BarChart2, Home, MoreHorizontal, Wand2, MessageCircle, Loader2
} from 'lucide-react';`;

const replaceStr = `Sun, Moon, Send, ClipboardList, Cog, BookOpen, BarChart2, Home, MoreHorizontal, Wand2, MessageCircle, Loader2,
  Wallet, Paperclip, History, UserCog, Eye, Cpu, FolderOpen, Key, ArrowLeft, ArrowRight, Camera, Copy, Save, Code, AlertTriangle as ExclamationTriangle, X, Edit as EditAlt, Mail as Envelope, FileText as FileAlt
} from 'lucide-react';`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('App.tsx imports fixed.');
