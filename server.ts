import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-senseirm';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' })); // For base64 images

// --- Data Store ---
let db = {
  users: [],
  clients: [],
  tasks: [],
  sectors: [],
  clientCategories: [],
  auditLogs: [],
  history: [],
  slaSettings: {
    'Baixa': 72,
    'Média': 48,
    'Alta': 24,
    'Crítica': 4
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
  db.users.push({
    id: '1',
    nome: 'Administrador',
    email: 'admin@senseirm.com',
    senha: hash, // Hashed password
    perfil: 'Administrador',
    status: 'Ativo',
    tema: 'verde',
    permissoes: {
      clientes: { visualizar: true, incluir: true, editar: true, excluir: true },
      tarefas: { visualizar: true, incluir: true, editar: true, excluir: true },
      usuarios: { visualizar: true, incluir: true, editar: true, excluir: true },
      setores: { visualizar: true, incluir: true, editar: true, excluir: true },
      malaDireta: { visualizar: true, incluir: true, editar: true, excluir: true },
      relatorios: { visualizar: true, incluir: true, editar: true, excluir: true }
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

// --- API Routes ---

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, pass } = req.body;
  const user = db.users.find((u: any) => u.email === email && u.status === 'Ativo');
  
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

// Data Sync (Get all data for the SPA)
app.get('/api/data', authenticateToken, (req: any, res: any) => {
  // Return everything except passwords
  const safeUsers = db.users.map(({ senha, ...u }: any) => u);
  res.json({
    users: safeUsers,
    clients: db.clients,
    tasks: db.tasks,
    sectors: db.sectors,
    clientCategories: db.clientCategories,
    auditLogs: db.auditLogs,
    history: db.history,
    slaSettings: db.slaSettings
  });
});

// Generic CRUD endpoints
app.post('/api/sync', authenticateToken, (req: any, res: any) => {
  const { type, action, payload } = req.body;
  
  if (action === 'ADD') {
    if (type === 'users' && payload.senha) {
      payload.senha = bcrypt.hashSync(payload.senha, 10);
    }
    (db as any)[type].push(payload);
  } else if (action === 'UPDATE') {
    const index = (db as any)[type].findIndex((item: any) => item.id === payload.id);
    if (index !== -1) {
      if (type === 'users' && payload.senha && !payload.senha.startsWith('$2a$')) {
        payload.senha = bcrypt.hashSync(payload.senha, 10);
      } else if (type === 'users' && !payload.senha) {
        payload.senha = (db as any)[type][index].senha; // Keep old password if not provided
      }
      (db as any)[type][index] = payload;
    }
  } else if (action === 'DELETE') {
    (db as any)[type] = (db as any)[type].filter((item: any) => item.id !== payload.id);
  } else if (action === 'SET') {
    (db as any)[type] = payload;
  }
  
  saveData();
  res.json({ success: true });
});

app.post('/api/audit', authenticateToken, (req: any, res: any) => {
  const { action, module, details } = req.body;
  const user = db.users.find((u: any) => u.id === req.user.id);
  
  db.auditLogs.unshift({
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    userId: req.user.id,
    userName: user ? (user as any).nome : 'Sistema',
    action,
    module,
    details
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
