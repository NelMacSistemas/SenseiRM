import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Trust proxy settings for Cloud Run / Nginx
// Set to 1 to trust the first hop (the immediate proxy)
app.set('trust proxy', 1);
const server = http.createServer(app);
// SEG-02: CORS restrito por allowlist (Socket.IO)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO CORS bloqueado: origem não permitida'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// SEG-01: JWT_SECRET sem fallback inseguro — gera um temporário se não configurado
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  [AVISO DE SEGURANÇA] JWT_SECRET não definido em variáveis de ambiente.');
  console.warn('⚠️  Um segredo temporário foi gerado. Defina JWT_SECRET no arquivo .env para persistência.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const DATA_FILE = path.join(__dirname, 'data.json');

// --- Security Middlewares ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SEG-08: Cabeçalhos de Segurança (Manual Helmet)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss: https://brasilapi.com.br https://viacep.com.br https://publica.cnpj.ws;");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5000, 
  message: { error: 'Muitas requisições. Tente novamente em breve.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global Request Logger for diagnostics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
  }
});

// SEG-07: Validação de Magic Bytes (assinatura de arquivo)
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|csv|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Tipo de arquivo não permitido.'));
  }
});

// Middleware para verificar magic bytes pós-upload (camada extra de segurança)
const validateFileContent = (req: any, res: any, next: any) => {
  if (!req.file) return next();
  
  const filePath = req.file.path;
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);

  const hex = buffer.toString('hex').toUpperCase();
  const mime = req.file.mimetype;

  // Assinaturas comuns
  const signatures: Record<string, string[]> = {
    'image/jpeg': ['FFD8FF'],
    'image/png': ['89504E47'],
    'application/pdf': ['25504446']
  };

  if (signatures[mime]) {
    const isValid = signatures[mime].some(sig => hex.startsWith(sig));
    if (!isValid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Conteúdo do arquivo não condiz com a extensão (File Spoofing detectado).' });
    }
  }

  next();
};

// SEG-02: CORS restrito por allowlist (HTTP)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS bloqueado: origem não permitida'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

// SEG-03: Limite seguro para body JSON (era 100MB — vetor de DoS)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Utility Functions ---
const maskPII = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  // Mask emails: user@example.com -> u***@example.com
  let masked = text.replace(/([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]+)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, first, middle, rest) => {
    return first + '*'.repeat(Math.min(middle.length, 5)) + rest;
  });

  // Mask phone numbers: (51) 99273-3121 -> (51) 9****-3121
  masked = masked.replace(/(\(?\d{2}\)?\s?\d)(\d{4})(\d{4})/g, (match, prefix, middle, suffix) => {
    return prefix + '****' + suffix;
  });

  // Mask CPF: 123.456.789-00 -> 123.***.***-00
  masked = masked.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/g, '$1.***.***-$4');

  return masked;
};

const maskObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in masked) {
    if (typeof masked[key] === 'string') {
      // Check if key name suggests PII
      const piiKeys = ['email', 'telefone', 'celular', 'cpf', 'cnpj', 'senha', 'password', 'documento'];
      if (piiKeys.some(k => key.toLowerCase().includes(k))) {
        masked[key] = '********';
      } else {
        masked[key] = maskPII(masked[key]);
      }
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskObject(masked[key]);
    }
  }
  
  return masked;
};

const maskDiff = (diff: any[]): any[] => {
  if (!Array.isArray(diff)) return diff;
  return diff.map(item => {
    const piiKeys = ['email', 'telefone', 'celular', 'cpf', 'cnpj', 'senha', 'password', 'documento'];
    const isPIIField = piiKeys.some(k => item.field?.toLowerCase().includes(k));
    
    return {
      ...item,
      oldValue: isPIIField ? '********' : (typeof item.oldValue === 'string' ? maskPII(item.oldValue) : item.oldValue),
      newValue: isPIIField ? '********' : (typeof item.newValue === 'string' ? maskPII(item.newValue) : item.newValue)
    };
  });
};

// --- Data Store ---
const defaultRoles = [
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
  },
  {
    id: 'user',
    name: 'Usuário Padrão',
    description: 'Acesso básico ao sistema',
    permissions: {
      dashboard: { acesso: true, leitura: true, incluir: false, editar: false, excluir: false },
      clientes: { acesso: true, leitura: true, incluir: false, editar: false, excluir: false },
      malaDireta: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
      tarefas: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
      usuarios: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
      configuracoes: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
      auditoria: { acesso: false, leitura: false, incluir: false, editar: false, excluir: false },
      calendario: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true }
    }
  }
];

const salt = bcrypt.genSaltSync(10);

// SEG-05: Senha do admin gerada aleatoriamente no primeiro boot
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(10).toString('base64url');
if (!process.env.ADMIN_INITIAL_PASSWORD) {
  console.log('\n' + '='.repeat(60));
  console.log('🔑  SENHA INICIAL DO ADMINISTRADOR (primeiro acesso)');
  console.log('    Email: admin@senseirm.com');
  console.log(`    Senha: ${ADMIN_INITIAL_PASSWORD}`);
  console.log('    Altere imediatamente após o primeiro login!');
  console.log('='.repeat(60) + '\n');
}

const defaultAdmin = [
  {
    id: '1',
    nome: 'Administrador',
    email: 'admin@senseirm.com',
    senha: bcrypt.hashSync(ADMIN_INITIAL_PASSWORD, salt),
    roleId: 'admin',
    status: 'ativo',
    tema: 'verde',
    dataCriacao: new Date().toISOString(),
    foto: '',
    telefone: '',
    celular: '',
    possuiWhatsapp: false
  }
];

let db = {
  users: [...defaultAdmin],
  roles: [...defaultRoles],
  clients: [],
  tasks: [],
  sectors: [],
  clientCategories: [],
  customFields: [],
  auditLogs: [],
  history: [],
  templates: [
    { id: 't1', name: 'Boas-vindas', subject: 'Bem-vindo(a) à nossa plataforma!', content: 'Olá {nome},\n\nSeja muito bem-vindo(a) à nossa plataforma! É um prazer ter você conosco.\n\nQualquer dúvida, estamos à disposição.\n\nAbraços,\nEquipe' },
    { id: 't2', name: 'Aviso de Vencimento', subject: 'Lembrete de Vencimento', content: 'Prezado(a) {nome},\n\nLembramos que sua fatura vence nos próximos dias. Por favor, desconsidere se já houver efetuado o pagamento.\n\nAtenciosamente,\nFinanceiro' },
    { id: 't3', name: 'Promoção Especial', subject: 'Oferta Exclusiva para Você', content: 'Olá {nome}!\n\nTemos uma oferta exclusiva para você este mês. Aproveite nossos descontos especiais para clientes VIP.\n\nConfira em nosso site!' },
    { id: 't4', name: 'Pesquisa de Satisfação', subject: 'Sua opinião é importante', content: 'Oi {nome},\n\nSua opinião é muito importante para nós! Poderia responder a uma rápida pesquisa sobre nosso atendimento?\n\nObrigado!' }
  ],
  slaSettings: {
    'Baixa': 72,
    'Média': 48,
    'Alta': 24,
    'Crítica': 4
  },
  emailSettings: {
    provider: 'SMTP',
    host: '',
    port: 587,
    user: '',
    pass: '',
    secure: false
  },
  systemSettings: {
    companyName: 'CRM Ecosystem',
    appLogo: ''
  },
  systemPolicies: {
    maxUploadSizeMB: 10,
    loginAttempts: 5,
    lockoutDurationMin: 30,
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    version: Date.now()
  },
  notifications: [],
};

let isDataLoaded = false;

function saveData() {
  if (!isDataLoaded) {
    console.warn('Attempted to save data before it was loaded. Skipping to prevent data loss.');
    return;
  }
  
  // Final integrity check before saving
  if (!db.users || db.users.length === 0 || !db.roles || db.roles.length === 0) {
    console.error('CRITICAL: Attempted to save data with empty users or roles. Aborting save to prevent system lockout.');
    console.error('Current state:', { users: db.users?.length, roles: db.roles?.length });
    console.error('Users detail:', JSON.stringify(db.users?.map(u => ({ id: u.id, email: u.email }))));
    return;
  }

  console.log(`Saving data to ${DATA_FILE}. Users: ${db.users.length}, Roles: ${db.roles.length}, AuditLogs: ${db.auditLogs.length}`);

  try {
    const tempFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
    fs.renameSync(tempFile, DATA_FILE);
    console.log('Data saved successfully.');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Load initial data
if (fs.existsSync(DATA_FILE)) {
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    if (content.trim()) {
      const parsed = JSON.parse(content);
      // Merge carefully to preserve defaults if parsed data is missing or empty
      db.users = Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : [...defaultAdmin];
      db.roles = Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : [...defaultRoles];
      db.clients = Array.isArray(parsed.clients) ? parsed.clients : [];
      db.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      db.sectors = Array.isArray(parsed.sectors) ? parsed.sectors : [];
      db.auditLogs = Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [];
      db.history = Array.isArray(parsed.history) ? parsed.history : [];
      db.templates = Array.isArray(parsed.templates) ? parsed.templates : [];
      db.slaSettings = parsed.slaSettings || { ...db.slaSettings };
      db.emailSettings = parsed.emailSettings || { ...db.emailSettings };
      db.systemSettings = parsed.systemSettings || { ...db.systemSettings };
      db.systemPolicies = { ...db.systemPolicies, ...(parsed.systemPolicies || {}) };
      db.clientCategories = Array.isArray(parsed.clientCategories) ? parsed.clientCategories : [];
      db.customFields = Array.isArray(parsed.customFields) ? parsed.customFields : [];
      db.notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
      
      console.log('Data loaded successfully from data.json');
    }
    isDataLoaded = true;
  } catch (e) {
    console.error('Error reading data.json, using defaults', e);
    isDataLoaded = true; // We use defaults, so it's "loaded"
  }
} else {
  isDataLoaded = true;
  saveData();
  console.log('No data.json found, initialized with defaults');
}

// SECURITY: Ensure data integrity after loading (e.g. restore masked/missing passwords)
(function checkDataIntegrity() {
  if (!db.users || db.users.length === 0) return;
  
  let fixesApplied = false;
  db.users.forEach((user: any) => {
    // SECURITY: Only restore admin password if it's missing or accidentally masked
    // If you need to force a reset again, temporarily change this condition or delete 'senha' from data.json
    const isCorrupted = !user.senha || user.senha === '********';
    
    if (user.roleId === 'admin' && user.email === 'admin@senseirm.com' && isCorrupted) {
      console.warn(`[SECURITY] Restoring administrator password for: ${user.email}`);
      user.senha = bcrypt.hashSync(ADMIN_INITIAL_PASSWORD, salt);
      fixesApplied = true;
    }
    
    // Warn about any other users with masked passwords (these must be reset manually)
    if (user.senha === '********' && user.email !== 'admin@senseirm.com') {
      console.warn(`[SECURITY] Detected masked password for user: ${user.email}. This account is currently locked out.`);
    }
  });
  
  if (fixesApplied) {
    saveData();
  }
})();


// --- Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const checkPermission = (module: string, action: 'acesso' | 'leitura' | 'incluir' | 'editar' | 'excluir') => {
  return (req: any, res: any, next: any) => {
    const user = db.users.find((u: any) => u.id === req.user.id);
    if (!user) return res.sendStatus(404);
    
    const role = db.roles.find((r: any) => r.id === user.roleId);
    if (!role) return res.status(403).json({ error: 'Função não encontrada' });

    // SEG-06: Verificação via matriz de permissões (sem bypass por ID hardcoded)
    const permissions = role.permissions?.[module];
    if (permissions && permissions[action]) {
      return next();
    }
    
    res.status(403).json({ error: `Permissão insuficiente para ${action} no módulo ${module}` });
  };
};

// --- API Routes ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dataLoaded: isDataLoaded,
    usersCount: db.users?.length,
    rolesCount: db.roles?.length
  });
});

// Public Settings for Login Screen
app.get('/api/public-settings', (req, res) => {
  res.json({
    companyName: (db.systemSettings as any)?.companyName || (db.systemSettings as any)?.appSlogan || 'CRM Ecosystem',
    appLogo: db.systemSettings?.appLogo || ''
  });
});

// Auth
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, pass: incomingPass, senha } = req.body;
  const pass = incomingPass || senha;
  
  console.log(`Login attempt for email: ${email}`);
  
  if (!db.users || db.users.length === 0) {
    console.error('CRITICAL: db.users is empty in memory during login attempt! Attempting emergency restore.');
    db.users = [...defaultAdmin];
  }

  // Ensure case-insensitive email matching
  const targetEmail = (email || '').toLowerCase();
  const user = db.users.find((u: any) => (u.email || '').toLowerCase() === targetEmail && u.status !== 'inativo' && u.status !== 'bloqueado');
  
  if (user) {
    console.log(`User found: ${user.nome}. Comparing password...`);
    try {
      if (bcrypt.compareSync(pass, user.senha)) {
        console.log(`Password match for user: ${user.nome}`);
        const token = jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: '24h' });
        
        // Log audit
        db.auditLogs.unshift({
          id: Math.random().toString(36).substring(2, 11),
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.nome,
          action: 'LOGIN',
          module: 'AUTH',
          details: `Usuário ${user.nome} autenticou.`,
          ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
        } as any);
        saveData();
        
        // Don't send password hash to client
        const { senha, ...userWithoutPass } = user;
        res.json({ token, user: userWithoutPass });
      } else {
        console.warn(`Password mismatch for user: ${user.nome}`);
        res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo/bloqueado' });
      }
    } catch (err) {
      console.error(`Error during password comparison for ${email}:`, err);
      res.status(500).json({ error: 'Erro interno no servidor durante a autenticação' });
    }
  } else {
    console.warn(`User not found, inactive or blocked for email: ${email}. Total users in memory: ${db.users.length}`);
    res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo/bloqueado' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res: any) => {
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) return res.sendStatus(404);
  const { senha, ...userWithoutPass } = user;
  res.json(userWithoutPass);
});

app.post('/api/upload', authenticateToken, (req: any, res: any) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // SEG-07: Validação de Magic Bytes após o upload
    validateFileContent(req, res, () => {
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl, name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
    });
  });
});

// Data Sync (Get all data for the SPA)
app.get('/api/data', authenticateToken, apiLimiter, (req: any, res: any) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) return res.sendStatus(404);

  const role = db.roles.find((r: any) => r.id === user.roleId);
  // SEG-06: isAdmin determinado por permissões completas, não por ID hardcoded
  const isAdmin = user.roleId === 'admin';
  const perms: any = role?.permissions || {};
  // DEBUG LOG
  try {
    fs.appendFileSync(path.join(__dirname, 'debug.log'), `[${new Date().toISOString()}] /api/data called. isAdmin=${isAdmin}. db.systemPolicies=${JSON.stringify(db.systemPolicies)}\n`);
  } catch (e) {}

  // Filter data based on permissions: Respect RBAC but allow self-visibility
  const safeUsers = db.users
    .filter((u: any) => isAdmin || perms.usuarios?.acesso || u.id === req.user.id)
    .map(({ senha, ...u }: any) => u);

  res.json({
    users: safeUsers,
    roles: db.roles,
    clients: (isAdmin || perms.clientes?.acesso) ? db.clients : [],
    tasks: (isAdmin || perms.tarefas?.acesso) ? db.tasks : [],
    sectors: (isAdmin || perms.configuracoes?.acesso) ? db.sectors : [],
    clientCategories: (isAdmin || perms.configuracoes?.acesso) ? db.clientCategories : [],
    auditLogs: (isAdmin || perms.auditoria?.acesso) ? db.auditLogs : [],
    history: (isAdmin || perms.clientes?.acesso) ? db.history : [],
    templates: (isAdmin || perms.configuracoes?.acesso) ? db.templates : [],
    customFields: (isAdmin || perms.configuracoes?.acesso) ? db.customFields : [],
    slaSettings: (isAdmin || perms.configuracoes?.acesso) ? db.slaSettings : {},
    systemPolicies: db.systemPolicies,
    emailSettings: isAdmin ? db.emailSettings : {}, // Only admin sees email settings
    systemSettings: {
      companyName: (db.systemSettings as any)?.companyName || (db.systemSettings as any)?.appSlogan || 'CRM Ecosystem',
      appLogo: db.systemSettings?.appLogo || ''
    }
  });
});

// Generic CRUD endpoints with permission checks
app.post('/api/sync', authenticateToken, apiLimiter, (req: any, res: any) => {
  const { type, action, payload } = req.body;
  console.log('--- SYNC REQUEST RECEIVED ---');
  console.log('Type:', type, 'Action:', action);
  console.log('Payload:', JSON.stringify(payload).substring(0, 100));
  
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) {
    console.log('User not found in memory:', req.user.id);
    return res.sendStatus(404);
  }

  const role = db.roles.find((r: any) => r.id === user.roleId);
  // SEG-06: isAdmin é determinado pelas permissões completas, não pelo ID hardcoded
  const isAdmin = user.roleId === 'admin';
  const perms: any = role?.permissions || {};

  // Map collection types to permission modules
  const typeToModule: Record<string, string> = {
    'users': 'usuarios',
    'roles': 'configuracoes',
    'clients': 'clientes',
    'tasks': 'tarefas',
    'sectors': 'configuracoes',
    'clientCategories': 'configuracoes',
    'templates': 'configuracoes',
    'slaSettings': 'configuracoes',
    'emailSettings': 'configuracoes',
    'systemSettings': 'configuracoes',
    'systemPolicies': 'configuracoes'
  };

  const module = typeToModule[type];
  const permissionAction = action === 'ADD' ? 'incluir' : (action === 'UPDATE' ? 'editar' : (action === 'DELETE' ? 'excluir' : 'acesso'));

  // Allow self-update for non-admins (restricted fields handled below)
  const isSelfUpdate = type === 'users' && action === 'UPDATE' && payload.id === user.id;

  if (!isAdmin && !isSelfUpdate && (!module || !perms[module] || !perms[module][permissionAction])) {
    return res.status(403).json({ error: `Permissão insuficiente para ${action} em ${type}` });
  }
  
  if (action === 'ADD') {
    if (type === 'users' && payload.senha && !/^\$2[aby]\$/.test(payload.senha.substring(0, 4))) {
      payload.senha = bcrypt.hashSync(payload.senha, 10);
    }
    (db as any)[type].push(payload);
    
    if (type === 'tasks') {
      io.to(payload.responsavelId).emit('notification', {
        title: 'Nova Tarefa',
        message: `Você foi designado para a tarefa: ${payload.titulo}`
      });
    }
  } else if (action === 'UPDATE') {
    const index = (db as any)[type].findIndex((item: any) => item.id === payload.id);
    if (index !== -1) {
      const oldItem = (db as any)[type][index];
      
      if (type === 'users' && payload.status === 'inativo' && oldItem.status !== 'inativo') {
        const pendingResponsibleTasks = db.tasks.filter((t: any) => t.responsavelId === payload.id && t.status !== 'Concluída' && t.status !== 'Cancelada');
        const pendingRequestTasks = db.tasks.filter((t: any) => t.solicitanteId === payload.id && t.status !== 'Concluída' && t.status !== 'Cancelada');
        const activeSectors = db.sectors.filter((s: any) => s.responsavelId === payload.id);
        
        if (pendingResponsibleTasks.length > 0 || pendingRequestTasks.length > 0 || activeSectors.length > 0) {
          let errorMsg = 'O usuário não pode ser inativado pois possui as seguintes pendências:';
          
          if (activeSectors.length > 0) {
            errorMsg += `\n- Responsável pelo(s) setor(es): ${activeSectors.map((s: any) => `"${s.nome}"`).join(', ')}`;
          }
          
          if (pendingResponsibleTasks.length > 0) {
            errorMsg += `\n- Responsável por ${pendingResponsibleTasks.length} tarefa(s) pendente(s)`;
          }
          
          if (pendingRequestTasks.length > 0) {
            errorMsg += `\n- Solicitante de ${pendingRequestTasks.length} tarefa(s) pendente(s)`;
          }

          return res.status(400).json({ error: errorMsg });
        }
      }

      if (type === 'users' && isSelfUpdate && !isAdmin) {
        // Self-update for non-admins: Only allow sensitive fields
        const updatedUser = {
          ...oldItem,
          celular: payload.celular || oldItem.celular,
          possuiWhatsapp: payload.possuiWhatsapp !== undefined ? payload.possuiWhatsapp : oldItem.possuiWhatsapp
        };
        
        if (payload.senha && payload.senha.length > 0 && !/^\$2[aby]\$/.test(payload.senha.substring(0, 4))) {
          updatedUser.senha = bcrypt.hashSync(payload.senha, 10);
        }
        
        (db as any)[type][index] = updatedUser;
      } else {
        if (type === 'users' && payload.senha && !/^\$2[aby]\$/.test(payload.senha.substring(0, 4))) {
          payload.senha = bcrypt.hashSync(payload.senha, 10);
        } else if (type === 'users' && !payload.senha) {
          payload.senha = oldItem.senha; // Keep old password if not provided
        }
        
        (db as any)[type][index] = payload;
      }
      
      if (type === 'tasks') {
        if (oldItem.responsavelId !== payload.responsavelId) {
          io.to(payload.responsavelId).emit('notification', {
            title: 'Tarefa Reatribuída',
            message: `Você foi designado para a tarefa: ${payload.titulo}`
          });
        } else if (oldItem.status !== payload.status) {
          io.to(payload.solicitanteId).emit('notification', {
            title: 'Status da Tarefa Atualizado',
            message: `A tarefa "${payload.titulo}" mudou para ${payload.status}`
          });
          io.to(payload.responsavelId).emit('notification', {
            title: 'Status da Tarefa Atualizado',
            message: `A tarefa "${payload.titulo}" mudou para ${payload.status}`
          });
        }
      }
    }
  } else if (action === 'DELETE') {
    if (type === 'users' && payload.id === '1') {
      return res.status(400).json({ error: 'Não é permitido excluir o administrador principal.' });
    }
    const newArray = (db as any)[type].filter((item: any) => item.id !== payload.id);
    if ((type === 'users' || type === 'roles') && newArray.length === 0) {
      console.error(`CRITICAL: Attempted to DELETE last item of ${type}. Aborting sync.`);
      return res.status(400).json({ error: `Não é permitido excluir o último item de ${type}.` });
    }
    (db as any)[type] = newArray;
  } else if (action === 'SET') {
    if ((type === 'users' || type === 'roles') && (!Array.isArray(payload) || payload.length === 0)) {
      console.error(`CRITICAL: Attempted to SET ${type} with empty or invalid payload. Aborting sync.`);
      return res.status(400).json({ error: `Não é permitido limpar a lista de ${type} via sincronização.` });
    }
    console.log(`SET action for type: ${type}. Payload size: ${Array.isArray(payload) ? payload.length : 'N/A'}`);
    (db as any)[type] = payload;
  }
  
  saveData();
  
  // Broadcast to all clients that data has changed
  io.emit('data_updated', { type, action });
  
  res.json({ success: true });
});

// Verify current password (for self-service password change)
app.post('/api/verify-password', authenticateToken, (req: any, res: any) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Senha não fornecida.' });

  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const match = bcrypt.compareSync(password, user.senha);
  if (!match) return res.status(401).json({ error: 'Senha incorreta.' });

  res.json({ success: true });
});

// Self-service password change — bypasses RBAC, requires only valid JWT
app.post('/api/change-password', authenticateToken, (req: any, res: any) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Nova senha inválida.' });
  }

  const index = db.users.findIndex((u: any) => u.id === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  db.users[index] = {
    ...db.users[index],
    senha: bcrypt.hashSync(newPassword, 10)
  };

  saveData();
  io.emit('data_updated', { type: 'users', action: 'UPDATE' });
  res.json({ success: true });
});

app.post('/api/mail/send', authenticateToken, checkPermission('malaDireta', 'incluir'), async (req: any, res: any) => {
  const { subject, message, recipients } = req.body;
  const settings = db.emailSettings;

  if (!settings || !settings.host) {
    return res.status(400).json({ error: 'Configurações de e-mail não definidas.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
    });

    let sentCount = 0;

    for (const clientId of recipients) {
      const client = db.clients.find((c: any) => c.id === clientId);
      if (!client || !client.emailPrincipal) continue;

      const firstName = client.nomeRazaoSocial.split(' ')[0];
      
      let personalizedSubject = subject
        .replace(/{nome}/g, firstName)
        .replace(/{empresa}/g, client.nomeRazaoSocial)
        .replace(/{email}/g, client.emailPrincipal)
        .replace(/{telefone}/g, client.telefonePrincipal || '');

      let personalizedMessage = message
        .replace(/{nome}/g, firstName)
        .replace(/{empresa}/g, client.nomeRazaoSocial)
        .replace(/{email}/g, client.emailPrincipal)
        .replace(/{telefone}/g, client.telefonePrincipal || '');

      await transporter.sendMail({
        from: `"${req.user.nome || 'Sistema'}" <${settings.user}>`,
        to: client.emailPrincipal,
        subject: personalizedSubject,
        html: personalizedMessage,
      });
      sentCount++;
    }

    res.json({ success: true, sentCount });
  } catch (error: any) {
    console.error('Mail error:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar e-mails' });
  }
});

app.post('/api/audit/clear', authenticateToken, (req: any, res: any) => {
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) return res.sendStatus(404);

  const role = db.roles.find((r: any) => r.id === user.roleId);
  if (role?.id !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem limpar os logs.' });
  }

  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Um motivo válido (mínimo 5 caracteres) é obrigatório.' });
  }

  // Clear logs
  console.log(`[AUDIT CLEAR] Request received. Reason: ${reason}. Current users count: ${db.users?.length}`);
  
  if (!db.users || db.users.length === 0) {
    console.error('[AUDIT CLEAR] CRITICAL: db.users is empty before processing. Restoring from defaultAdmin.');
    db.users = [...defaultAdmin];
  }

  // Register the clearing action
  const clearEntry = {
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    userId: req.user.id,
    userName: user.nome,
    action: 'DELETE',
    module: 'AUDITORIA',
    details: maskPII(`Histórico de auditoria limpo integralmente. Motivo: ${reason}`),
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
  };
  
  // Clear logs and add the clearing action as the first entry
  console.log(`[AUDIT CLEAR] Before clearing logs: users=${db.users?.length}`);
  db.auditLogs = [clearEntry as any];
  console.log(`[AUDIT CLEAR] After clearing logs: users=${db.users?.length}`);

  saveData();
  
  // Broadcast to all clients using SET to ensure they get the new state with the clearing log
  io.emit('data_updated', { type: 'auditLogs', action: 'SET', payload: db.auditLogs });
  
  console.log(`[AUDIT CLEAR] Data saved successfully. Final users count: ${db.users?.length}`);
  res.json({ success: true });
});

app.post('/api/audit', authenticateToken, (req: any, res: any) => {
  const { action, module, details, entityId, diff } = req.body;
  console.log(`--- AUDIT REQUEST RECEIVED --- Action: ${action}, Module: ${module}`);
  const user = db.users.find((u: any) => u.id === req.user.id);
  
  db.auditLogs.unshift({
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    userId: req.user.id,
    userName: user ? (user as any).nome : 'Sistema',
    action,
    module,
    details: maskPII(details),
    entityId,
    diff: maskDiff(diff),
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
  } as any);
  
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  
  saveData();
  io.emit('data_updated', { type: 'auditLogs', action: 'ADD' });
  res.json({ success: true });
});

app.get('/api/lookup/cnpj/:cnpj', authenticateToken, async (req: any, res: any) => {
  const { cnpj } = req.params;
  const cleanCnpj = cnpj.replace(/\D/g, '');
  
  if (cleanCnpj.length !== 14) {
    return res.status(400).json({ error: 'CNPJ inválido' });
  }

  try {
    console.log(`[LOOKUP] Consultando CNPJ via SERVIDOR: ${cleanCnpj}`);
    // Try BrasilAPI first
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log(`[LOOKUP] CNPJ ${cleanCnpj} encontrado na BrasilAPI.`);
        return res.json(data);
    }
    
    // Log verbose error to file for AI diagnosis
    const errorBody = await response.text().catch(() => 'N/A');
    const logEntry = `[${new Date().toISOString()}] CNPJ: ${cleanCnpj} | Provider: BrasilAPI | Status: ${response.status} | Body: ${errorBody.substring(0, 200)}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'lookup_errors.log'), logEntry);

    console.log(`[LOOKUP] BrasilAPI retornou status ${response.status}. Tentando fallback...`);

    // Fallback to Publica CNPJ
    const fallback = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`, {
      headers: { 'User-Agent': 'SenseiRM-Proxy/1.0' },
      signal: AbortSignal.timeout(15000)
    });
    
    if (fallback.ok) {
      const data = await fallback.json();
      console.log(`[LOOKUP] CNPJ ${cleanCnpj} encontrado na Publica CNPJ.`);
      return res.json(data);
    }

    const fallbackBody = await fallback.text().catch(() => 'N/A');
    const logEntryFallback = `[${new Date().toISOString()}] CNPJ: ${cleanCnpj} | Provider: Publica | Status: ${fallback.status} | Body: ${fallbackBody.substring(0, 200)}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'lookup_errors.log'), logEntryFallback);

    console.log(`[LOOKUP] CNPJ ${cleanCnpj} não localizado.`);
    res.status(fallback.status || 404).json({ error: 'CNPJ não localizado', status: fallback.status });
  } catch (err: any) {
    const logEntryErr = `[${new Date().toISOString()}] CNPJ: ${cleanCnpj} | CRITICAL ERROR: ${err.message}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'lookup_errors.log'), logEntryErr);
    console.error('Lookup CNPJ Error:', err.message);
    res.status(500).json({ error: 'Erro ao conectar aos serviços de consulta' });
  }
});

app.get('/api/lookup/cep/:cep', authenticateToken, async (req: any, res: any) => {
  const { cep } = req.params;
  const cleanCep = cep.replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    return res.status(400).json({ error: 'CEP inválido' });
  }

  try {
    console.log(`[LOOKUP] Consultando CEP: ${cleanCep}`);
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
      headers: { 'User-Agent': 'SenseiRM-Proxy/1.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[LOOKUP] CEP ${cleanCep} encontrado na BrasilAPI.`);
      return res.json(data);
    }

    console.log(`[LOOKUP] CEP ${cleanCep} não encontrado na BrasilAPI (Status: ${response.status}). Tentando ViaCEP...`);

    const fallback = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      headers: { 'User-Agent': 'SenseiRM-Proxy/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (fallback.ok) {
      const data = await fallback.json();
      if (!data.erro) {
        console.log(`[LOOKUP] CEP ${cleanCep} encontrado no ViaCEP.`);
        return res.json(data);
      }
    }
    
    console.log(`[LOOKUP] CEP ${cleanCep} não localizado (BrasilAPI: ${response.status}, ViaCEP: ${fallback.status})`);
    res.status(404).json({ error: 'CEP não localizado' });
  } catch (err: any) {
    console.error('Lookup CEP Error:', err.message);
    res.status(500).json({ error: 'Erro ao conectar aos serviços de consulta' });
  }
});

app.get('/api/diag/connectivity', authenticateToken, async (req: any, res: any) => {
  console.log(`[DIAG] Connectivity check requested by user: ${req.user?.nome || 'Unknown'}`);
  const results: any = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    tests: []
  };

  const testUrl = async (name: string, url: string) => {
    const start = Date.now();
    try {
      const response = await fetch(url, { 
        headers: { 'User-Agent': 'SenseiRM-Diag/1.0' },
        signal: AbortSignal.timeout(5000) 
      });
      results.tests.push({
        name,
        url,
        status: response.status,
        ok: response.ok,
        time: `${Date.now() - start}ms`
      });
    } catch (err: any) {
      results.tests.push({
        name,
        url,
        ok: false,
        error: err.message,
        time: `${Date.now() - start}ms`
      });
    }
  };

  await Promise.all([
    testUrl('BrasilAPI (CNPJ)', 'https://brasilapi.com.br/api/cnpj/v1/00000000000191'),
    testUrl('ViaCEP', 'https://viacep.com.br/ws/01001000/json/'),
    testUrl('Publica CNPJ', 'https://publica.cnpj.ws/cnpj/00000000000191'),
    testUrl('Google (DNS Check)', 'https://www.google.com')
  ]);

  res.json(results);
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      // Skip API and upload routes
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return next();
      }

      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (e instanceof Error) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Initial state:', { 
      users: db.users?.length, 
      roles: db.roles?.length,
      dataLoaded: isDataLoaded 
    });
  });
}

startServer();
