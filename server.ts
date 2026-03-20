import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
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
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-senseirm';
const DATA_FILE = path.join(__dirname, 'data.json');

// --- Security Middlewares ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: { error: 'Muitas requisições. Tente novamente em breve.' }
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

app.use(cors());
app.use(express.json({ limit: '50mb' })); // For base64 images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Data Store ---
let db = {
  users: [],
  clients: [],
  tasks: [],
  sectors: [],
  clientCategories: [],
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
  }
};

// Load initial data
if (fs.existsSync(DATA_FILE)) {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    db = JSON.parse(data);
  } catch (e) {
    console.error('Error reading data.json', e);
  }
} else {
  // Initialize with default admin
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('admin123', salt);
  const fullPermission = { acesso: true, leitura: true, incluir: true, editar: true, excluir: true };
  db.users.push({
    id: '1',
    nome: 'Administrador',
    email: 'admin@senseirm.com',
    senha: hash, // Hashed password
    perfil: 'admin',
    status: 'ativo',
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
  });
  saveData();
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

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
    
    if (user.perfil === 'admin') return next();
    
    const permissions = user.permissoes?.[module];
    if (permissions && permissions[action]) {
      return next();
    }
    
    res.status(403).json({ error: `Permissão insuficiente para ${action} no módulo ${module}` });
  };
};

// --- API Routes ---

// Auth
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, pass } = req.body;
  const user = db.users.find((u: any) => u.email === email && u.status === 'ativo');
  
  if (user && bcrypt.compareSync(pass, user.senha)) {
    const token = jwt.sign({ id: user.id, email: user.email, perfil: user.perfil }, JWT_SECRET, { expiresIn: '24h' });
    
    // Log audit
    db.auditLogs.unshift({
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.nome,
      action: 'LOGIN',
      module: 'AUTH',
      details: `Usuário ${user.nome} autenticou.`
    } as never);
    saveData();
    
    // Don't send password hash to client
    const { senha, ...userWithoutPass } = user;
    res.json({ token, user: userWithoutPass });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo' });
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
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
  });
});

// Data Sync (Get all data for the SPA)
app.get('/api/data', authenticateToken, apiLimiter, (req: any, res: any) => {
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) return res.sendStatus(404);

  const isAdmin = user.perfil === 'admin';
  const perms = user.permissoes || {};

  // Filter data based on permissions
  const safeUsers = db.users
    .filter(() => isAdmin || perms.usuarios?.acesso)
    .map(({ senha, ...u }: any) => u);

  res.json({
    users: safeUsers,
    clients: (isAdmin || perms.clientes?.acesso) ? db.clients : [],
    tasks: (isAdmin || perms.tarefas?.acesso) ? db.tasks : [],
    sectors: (isAdmin || perms.configuracoes?.acesso) ? db.sectors : [],
    clientCategories: (isAdmin || perms.configuracoes?.acesso) ? db.clientCategories : [],
    auditLogs: (isAdmin || perms.auditoria?.acesso) ? db.auditLogs : [],
    history: (isAdmin || perms.clientes?.acesso) ? db.history : [],
    templates: (isAdmin || perms.configuracoes?.acesso) ? db.templates : [],
    slaSettings: (isAdmin || perms.configuracoes?.acesso) ? db.slaSettings : {},
    emailSettings: isAdmin ? db.emailSettings : {} // Only admin sees email settings
  });
});

// Generic CRUD endpoints with permission checks
app.post('/api/sync', authenticateToken, apiLimiter, (req: any, res: any) => {
  const { type, action, payload } = req.body;
  const user = db.users.find((u: any) => u.id === req.user.id);
  if (!user) return res.sendStatus(404);

  const isAdmin = user.perfil === 'admin';
  const perms = user.permissoes || {};

  // Map collection types to permission modules
  const typeToModule: Record<string, string> = {
    'users': 'usuarios',
    'clients': 'clientes',
    'tasks': 'tarefas',
    'sectors': 'configuracoes',
    'clientCategories': 'configuracoes',
    'templates': 'configuracoes',
    'slaSettings': 'configuracoes',
    'emailSettings': 'configuracoes'
  };

  const module = typeToModule[type];
  const permissionAction = action === 'ADD' ? 'incluir' : (action === 'UPDATE' ? 'editar' : (action === 'DELETE' ? 'excluir' : 'acesso'));

  if (!isAdmin && (!module || !perms[module] || !perms[module][permissionAction])) {
    return res.status(403).json({ error: `Permissão insuficiente para ${action} em ${type}` });
  }
  
  if (action === 'ADD') {
    if (type === 'users' && payload.senha) {
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
      if (type === 'users' && payload.senha && !payload.senha.startsWith('$2a$')) {
        payload.senha = bcrypt.hashSync(payload.senha, 10);
      } else if (type === 'users' && !payload.senha) {
        payload.senha = (db as any)[type][index].senha; // Keep old password if not provided
      }
      
      const oldItem = (db as any)[type][index];
      (db as any)[type][index] = payload;
      
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
    (db as any)[type] = (db as any)[type].filter((item: any) => item.id !== payload.id);
  } else if (action === 'SET') {
    (db as any)[type] = payload;
  }
  
  saveData();
  
  // Broadcast to all clients that data has changed
  io.emit('data_updated', { type, action });
  
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

app.post('/api/audit', authenticateToken, (req: any, res: any) => {
  const { action, module, details, entityId, diff } = req.body;
  const user = db.users.find((u: any) => u.id === req.user.id);
  
  db.auditLogs.unshift({
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    userId: req.user.id,
    userName: user ? (user as any).nome : 'Sistema',
    action,
    module,
    details,
    entityId,
    diff
  } as never);
  
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  
  saveData();
  res.json({ success: true });
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
