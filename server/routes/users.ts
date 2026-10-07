import { Router, Request, Response } from 'express';
import { db } from '../db/memoryDb';
import { User } from '../../src/types/index';

export const userRouter = Router();

// GET /api/users
userRouter.get('/', (_req: Request, res: Response) => {
  const users = db.getUsers().map(({ passwordHash, ...safe }) => safe);
  res.json({ success: true, data: users });
});

// POST /api/users/login
userRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const user = db.findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
  }

  if (user.status === 'INACTIVE') {
    return res.status(403).json({ success: false, message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน' });
  }

  const { passwordHash, ...safeUser } = user;
  res.json({ success: true, data: safeUser });
});

// POST /api/users/register
userRouter.post('/register', (req: Request, res: Response) => {
  const { username, fullName, position, role, password } = req.body;
  if (!username || !fullName) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const existing = db.findUserByUsername(username);
  if (existing) {
    return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' });
  }

  const newUser: User = {
    id: `user_${Date.now()}`,
    username: username.toLowerCase().trim(),
    fullName: fullName.trim(),
    position: position?.trim() || 'เจ้าหน้าที่การเงิน',
    role: role || 'USER',
    status: 'ACTIVE',
    passwordHash: 'dummy_hash',
    createdAt: new Date().toISOString(),
  };

  db.addUser(newUser);
  const { passwordHash, ...safeUser } = newUser;
  res.json({ success: true, data: safeUser });
});
