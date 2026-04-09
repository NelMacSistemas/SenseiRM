import 'dotenv/config';
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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-senseirm';

// --- Security Middlewares ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // increased to avoid blocking LAN environments sharing IPs
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5000, // vastly increased to bypass LAN rate limit false-positives
  message: { error: 'Muitas requisições. Tente novamente em breve.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Socket.io
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });
});

// Uploads setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|csv|txt|zip|rar/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Tipo de arquivo não permitido.'));
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data initialization logic (importing from legacy data.json if needed)
const seedDataIfEmpty = async () => {
    let usersCount = await prisma.user.count();
    if (usersCount === 0) {
        console.log("Database empty. Seeding defaults...");
        // Default Role
        const roleStr = JSON.stringify({
            dashboard: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
            clientes: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
            malaDireta: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
            tarefas: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
            usuarios: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
            configuracoes: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
            auditoria: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true },
            calendario: { acesso: true, leitura: true, incluir: true, editar: true, excluir: true }
        });
        
        await prisma.role.create({
            data: { id: 'admin', name: 'Administrador', description: 'Acesso total', permissions: roleStr }
        });

        // Default Admin User
        const salt = bcrypt.genSaltSync(10);
        await prisma.user.create({
            data: {
                id: '1',
                nome: 'Administrador',
                email: 'admin@senseirm.com',
                senha: bcrypt.hashSync('admin123', salt),
                roleId: 'admin',
                status: 'ativo',
                tema: 'verde',
                dataCriacao: new Date().toISOString(),
                telefone: '5133334444',
                celular: '51992733121',
                possuiWhatsapp: true
            }
        });

        // Default SLAs
        await prisma.sLASettings.create({
            data: { id: "1", baixa: 72, media: 48, alta: 24, critica: 4 }
        });

        // Default System Settings
        await prisma.systemSettings.create({
            data: { id: "1", companyName: "CRM Ecosystem", appLogo: "" }
        });

        // Default Email Settings
        await prisma.emailSettings.create({
            data: { id: "1", provider: "SMTP", host: "", port: 587, user: "", pass: "", secure: false }
        });

        console.log("Database seeded with defaults.");
    }
};

const maskPII = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  let masked = text.replace(/([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]+)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (m, f, md, r) => f + '*'.repeat(Math.min(md.length, 5)) + r);
  masked = masked.replace(/(\(?\d{2}\)?\s?\d)(\d{4})(\d{4})/g, (m, p, md, s) => p + '****' + s);
  return masked.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/g, '$1.***.***-$4');
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

const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Check permissions middleware (fetching from DB mapping)
const checkPermission = (module: string, action: 'acesso' | 'leitura' | 'incluir' | 'editar' | 'excluir') => {
  return async (req: any, res: any, next: any) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.sendStatus(404);
        const role = await prisma.role.findUnique({ where: { id: user.roleId } });
        if (!role) return res.status(403).json({ error: 'Função não encontrada' });
        if (role.id === 'admin') return next();
        
        const permsJSON = role.permissions ? JSON.parse(role.permissions) : {};
        if (permsJSON[module] && permsJSON[module][action]) return next();
        
        res.status(403).json({ error: `Permissão insuficiente para ${action} no módulo ${module}` });
    } catch {
        res.sendStatus(500);
    }
  };
};

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auth
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, pass } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (user && user.status === 'ativo' && user.senha && bcrypt.compareSync(pass, user.senha)) {
    const token = jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: '24h' });
    
    await prisma.auditEntry.create({
      data: {
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.nome,
        action: 'LOGIN',
        module: 'AUTH',
        details: `Usuário ${user.nome} autenticou.`,
        ip: req.ip || req.socket.remoteAddress || ''
      }
    });
    
    const { senha, ...userWithoutPass } = user;
    res.json({ token, user: { ...userWithoutPass, notificationPreferences: user.notificationPreferences ? JSON.parse(user.notificationPreferences) : undefined } });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.sendStatus(404);
  const { senha, ...u } = user;
  res.json({ ...u, notificationPreferences: u.notificationPreferences ? JSON.parse(u.notificationPreferences) : undefined });
});

app.post('/api/upload', authenticateToken, (req: any, res: any) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
  });
});

app.get('/api/data', authenticateToken, apiLimiter, async (req: any, res: any) => {
  try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const role = user ? await prisma.role.findUnique({ where: { id: user.roleId } }) : null;
      if (!user || !role) return res.sendStatus(404);

      const isAdmin = role.id === 'admin';
      const perms = role.permissions ? JSON.parse(role.permissions) : {};

      // Load collections concurrently
      const [rawUsers, rawRoles, rawClients, rawTasks, sectors, clientCategories, auditLogs, history, templates, customFields, slaSettingsRaw, emailSettingsRaw, sysSettingsRaw] = await Promise.all([
          prisma.user.findMany(),
          prisma.role.findMany(),
          (isAdmin || perms.clientes?.acesso) ? prisma.client.findMany() : Promise.resolve([]),
          (isAdmin || perms.tarefas?.acesso) ? prisma.task.findMany() : Promise.resolve([]),
          (isAdmin || perms.configuracoes?.acesso) ? prisma.sector.findMany() : Promise.resolve([]),
          (isAdmin || perms.configuracoes?.acesso) ? prisma.clientCategory.findMany() : Promise.resolve([]),
          (isAdmin || perms.auditoria?.acesso) ? prisma.auditEntry.findMany({ orderBy: { timestamp: 'desc' }, take: 1000 }) : Promise.resolve([]),
          (isAdmin || perms.clientes?.acesso) ? prisma.mailHistory.findMany({ orderBy: { data: 'desc' } }) : Promise.resolve([]),
          (isAdmin || perms.configuracoes?.acesso) ? prisma.mailTemplate.findMany() : Promise.resolve([]),
          (isAdmin || perms.configuracoes?.acesso) ? prisma.customField.findMany() : Promise.resolve([]),
          (isAdmin || perms.configuracoes?.acesso) ? prisma.sLASettings.findUnique({ where: { id: "1" } }) : Promise.resolve(null),
          isAdmin ? prisma.emailSettings.findUnique({ where: { id: "1" } }) : Promise.resolve(null),
          prisma.systemSettings.findUnique({ where: { id: "1" } })
      ]);

      const users = rawUsers
          .filter(() => isAdmin || perms.usuarios?.acesso)
          .map(({ senha, ...u }) => ({ ...u, notificationPreferences: u.notificationPreferences ? JSON.parse(u.notificationPreferences) : undefined }));
      
      const roles = rawRoles.map(r => ({ ...r, permissions: r.permissions ? JSON.parse(r.permissions) : {} }));
      
      const clients = rawClients.map(c => ({
          ...c,
          pessoasContato: JSON.parse(c.pessoasContato || '[]'),
          attachments: JSON.parse(c.attachments || '[]'),
          interactions: JSON.parse(c.interactions || '[]'),
          customData: c.customData ? JSON.parse(c.customData) : undefined
      }));

      const tasks = rawTasks.map(t => ({
          ...t,
          logs: JSON.parse(t.logs || '[]'),
          attachments: JSON.parse(t.attachments || '[]'),
          subtasks: JSON.parse(t.subtasks || '[]'),
          comments: JSON.parse(t.comments || '[]')
      }));

      const sysSettings = sysSettingsRaw || { companyName: 'CRM Ecosystem', appLogo: '' };

      res.json({
          users, roles, clients, tasks, sectors, clientCategories, 
          auditLogs: auditLogs.map(a => ({...a, diff: a.diff ? JSON.parse(a.diff) : undefined})), 
          history: history.map(h => ({...h, destinatarios: h.destinatarios ? JSON.parse(h.destinatarios) : undefined})), 
          templates, 
          customFields: customFields.map(cf => ({...cf, options: cf.options ? JSON.parse(cf.options) : undefined})), 
          slaSettings: slaSettingsRaw || { Baixa: 72, Média: 48, Alta: 24, Crítica: 4 },
          emailSettings: emailSettingsRaw || { provider: 'SMTP', host: '', port: 587, user: '', pass: '', secure: false },
          systemSettings: typeof sysSettings.companyName === 'string' ? sysSettings : { companyName: 'CRM Ecosystem', appLogo: '' }
      });
  } catch (error) {
    console.error("Error formatting data payload:", error);
    res.status(500).json({ error: "Failed to load data" });
  }
});

const modelMap: Record<string, string> = {
    'users': 'user', 'roles': 'role', 'clients': 'client', 'tasks': 'task',
    'sectors': 'sector', 'clientCategories': 'clientCategory', 'auditLogs': 'auditEntry',
    'history': 'mailHistory', 'templates': 'mailTemplate', 'customFields': 'customField',
    'slaSettings': 'sLASettings', 'emailSettings': 'emailSettings', 'systemSettings': 'systemSettings'
};

const serializePayload = (type: string, payload: any) => {
    const data = { ...payload };
    if (type === 'users' && data.notificationPreferences) data.notificationPreferences = JSON.stringify(data.notificationPreferences);
    if (type === 'roles' && data.permissions) data.permissions = JSON.stringify(data.permissions);
    if (type === 'clients') {
        if (data.pessoasContato) data.pessoasContato = JSON.stringify(data.pessoasContato);
        if (data.attachments) data.attachments = JSON.stringify(data.attachments);
        if (data.interactions) data.interactions = JSON.stringify(data.interactions);
        if (data.customData) data.customData = JSON.stringify(data.customData);
    }
    if (type === 'tasks') {
        if (data.logs) data.logs = JSON.stringify(data.logs);
        if (data.attachments) data.attachments = JSON.stringify(data.attachments);
        if (data.subtasks) data.subtasks = JSON.stringify(data.subtasks);
        if (data.comments) data.comments = JSON.stringify(data.comments);
    }
    if (type === 'customFields' && data.options) data.options = JSON.stringify(data.options);
    if (type === 'history' && data.destinatarios) data.destinatarios = JSON.stringify(data.destinatarios);
    if (type === 'auditLogs' && data.diff) data.diff = JSON.stringify(data.diff);
    return data;
};

app.post('/api/sync', authenticateToken, apiLimiter, async (req: any, res: any) => {
  const { type, action, payload } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const role = user ? await prisma.role.findUnique({ where: { id: user.roleId } }) : null;
  if (!user || !role) return res.sendStatus(404);

  const isAdmin = role.id === 'admin';
  const perms = role.permissions ? JSON.parse(role.permissions) : {};

  const typeToModule: Record<string, string> = {
    'users': 'usuarios', 'roles': 'configuracoes', 'clients': 'clientes', 'tasks': 'tarefas',
    'sectors': 'configuracoes', 'clientCategories': 'configuracoes', 'templates': 'configuracoes',
    'slaSettings': 'configuracoes', 'emailSettings': 'configuracoes', 'systemSettings': 'configuracoes'
  };

  const module = typeToModule[type];
  const permissionAction = action === 'ADD' ? 'incluir' : (action === 'UPDATE' ? 'editar' : (action === 'DELETE' ? 'excluir' : 'acesso'));

  if (!isAdmin && (!module || !perms[module] || !perms[module][permissionAction])) {
    return res.status(403).json({ error: `Permissão insuficiente para ${action} em ${type}` });
  }

  const model = modelMap[type];
  if (!model) return res.status(400).json({ error: "Invalid type" });

  try {
      if (action === 'ADD') {
        const dataForDb = serializePayload(type, payload);
        if (type === 'users' && dataForDb.senha && !/^\$2[aby]\$/.test(dataForDb.senha.substring(0, 4))) {
            dataForDb.senha = bcrypt.hashSync(dataForDb.senha, 10);
        }
        await (prisma as any)[model].create({ data: dataForDb });
        
        if (type === 'tasks') {
            io.to(payload.responsavelId).emit('notification', { title: 'Nova Tarefa', message: `Você foi designado para a tarefa: ${payload.titulo}` });
        }
      } else if (action === 'UPDATE') {
        const dataForDb = serializePayload(type, payload);
        if (type === 'users' && dataForDb.senha && !/^\$2[aby]\$/.test(dataForDb.senha.substring(0, 4))) {
            dataForDb.senha = bcrypt.hashSync(dataForDb.senha, 10);
        } else if (type === 'users' && !dataForDb.senha) {
            delete dataForDb.senha; // Don't override with nothing
        }

        const oldItem = await (prisma as any)[model].findUnique({ where: { id: payload.id }});
        await (prisma as any)[model].update({ where: { id: payload.id }, data: dataForDb });
        
        if (type === 'tasks' && oldItem) {
            if (oldItem.responsavelId !== payload.responsavelId) {
                io.to(payload.responsavelId).emit('notification', { title: 'Tarefa Reatribuída', message: `Você foi designado para a tarefa: ${payload.titulo}` });
            } else if (oldItem.status !== payload.status) {
                io.to(payload.solicitanteId).emit('notification', { title: 'Status Atualizado', message: `A tarefa "${payload.titulo}" mudou para ${payload.status}` });
                io.to(payload.responsavelId).emit('notification', { title: 'Status Atualizado', message: `A tarefa "${payload.titulo}" mudou para ${payload.status}` });
            }
        }
      } else if (action === 'DELETE') {
        if (type === 'users' && payload.id === '1') return res.status(400).json({ error: 'Não é permitido excluir o administrador principal.' });
        await (prisma as any)[model].delete({ where: { id: payload.id } });
      } else if (action === 'SET') {
          // Typically not supported well for relational dbs via front-end payload without wiping arrays, 
          // but we can map SET as essentially wiping and inserting all or throwing error. 
          return res.status(400).json({ error: 'Operação SET não é suportada diretamente via Banco de Dados nesta API.' });
      }
      
      io.emit('data_updated', { type, action });
      res.json({ success: true });
  } catch (error: any) {
      console.error(`[SYNC ERROR] Falha no /api/sync para ${type} - Ação: ${action}:`, error);
      res.status(500).json({ error: `Falha no banco de dados: ${error.message || 'Erro desconhecido'}` });
  }
});

app.post('/api/mail/send', authenticateToken, checkPermission('malaDireta', 'incluir'), async (req: any, res: any) => {
  const { subject, message, recipients } = req.body;
  const settings = await prisma.emailSettings.findFirst({ where: { id: "1" }});

  if (!settings || !settings.host) return res.status(400).json({ error: 'Configurações de e-mail não definidas.' });

  try {
    const transporter = nodemailer.createTransport({ host: settings.host, port: settings.port, secure: settings.secure, auth: { user: settings.user, pass: settings.pass }});
    let sentCount = 0;
    for (const clientId of recipients) {
      const client = await prisma.client.findUnique({ where: { id: clientId }});
      if (!client || !client.emailPrincipal) continue;

      const firstName = client.nomeRazaoSocial.split(' ')[0];
      const pSubj = subject.replace(/{nome}/g, firstName).replace(/{empresa}/g, client.nomeRazaoSocial).replace(/{email}/g, client.emailPrincipal).replace(/{telefone}/g, client.telefonePrincipal || '');
      const pMsg = message.replace(/{nome}/g, firstName).replace(/{empresa}/g, client.nomeRazaoSocial).replace(/{email}/g, client.emailPrincipal).replace(/{telefone}/g, client.telefonePrincipal || '');

      await transporter.sendMail({ from: `"${req.user.nome || 'Sistema'}" <${settings.user}>`, to: client.emailPrincipal, subject: pSubj, html: pMsg });
      sentCount++;
    }
    
    // Log history
    await prisma.mailHistory.create({
        data: {
            data: new Date().toISOString(),
            tipo: 'email',
            destinatarios: JSON.stringify(recipients),
            assunto: subject,
            mensagem: message
        }
    });

    res.json({ success: true, sentCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao enviar e-mails' });
  }
});

app.post('/api/audit/clear', authenticateToken, async (req: any, res: any) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }});
  if (!user || user.roleId !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
  
  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) return res.status(400).json({ error: 'Motivo válido obrigatório.' });

  await prisma.auditEntry.deleteMany({});
  
  const clearEntry = await prisma.auditEntry.create({
    data: {
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      userName: user.nome,
      action: 'DELETE',
      module: 'AUDITORIA',
      details: maskPII(`Histórico de auditoria limpo integralmente. Motivo: ${reason}`),
      ip: req.ip || req.socket.remoteAddress || ''
    }
  });

  io.emit('data_updated', { type: 'auditLogs', action: 'ADD', payload: clearEntry });
  res.json({ success: true });
});

app.post('/api/audit', authenticateToken, async (req: any, res: any) => {
  const { action, module, details, entityId, diff } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id }});
  
  await prisma.auditEntry.create({
    data: {
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        userName: user ? user.nome : 'Sistema',
        action, module,
        details: maskPII(details),
        entityId,
        diff: diff ? JSON.stringify(maskDiff(diff)) : undefined,
        ip: req.ip || req.socket.remoteAddress || ''
    }
  });
  
  io.emit('data_updated', { type: 'auditLogs', action: 'ADD' });
  res.json({ success: true });
});

async function startServer() {
  await seedDataIfEmpty();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
