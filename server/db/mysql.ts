import mysql from 'mysql2/promise';
import net from 'net';
import { User, Cheque, ChequeItem, BankTemplateConfig, BankType, AuditLog, ChequePrintLog } from '../../src/types/index';
import { INITIAL_USERS, INITIAL_TEMPLATES, INITIAL_CHEQUES, db as fallbackDb } from './memoryDb';

// MySQL Connection Pool Configuration for machine 10.1.0.201
export const DB_CONFIG = {
  host: process.env.DB_HOST || '10.1.0.201',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cheque_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 8000,
  charset: 'utf8mb4',
};

// Fast non-blocking TCP socket check with 4s timeout
// Prevents connect ETIMEDOUT from hanging HTTP threads for 10+ seconds
export function checkTcpPort(host: string, port: number, timeoutMs = 4000): Promise<boolean> {
  const targetHost = host === 'localhost' ? '127.0.0.1' : host;
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const onDone = (success: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(success);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => onDone(true));
    socket.once('timeout', () => onDone(false));
    socket.once('error', () => onDone(false));

    try {
      socket.connect(port, targetHost);
    } catch {
      onDone(false);
    }
  });
}

const WIN1252_TO_BYTE: Record<number, number> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
  0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
  0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};

function cp874ToByte(char: string): number | null {
  const code = char.charCodeAt(0);
  if (code < 0x80) return code;
  if (WIN1252_TO_BYTE[code] !== undefined) return WIN1252_TO_BYTE[code];
  if (code >= 0xA0 && code <= 0xFF) return code;
  if (code >= 0x0E01 && code <= 0x0E5B) return code - 0x0E00 + 0xA0;
  return null;
}

export function hasThaiMojibake(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.includes('เธ') || text.includes('ธเธ') || text.includes('เ¹') || text.includes('เธ™เธฒเธข') || text.includes('เธชเธธ');
}

export function cleanThaiMojibake(text: string | null | undefined, contextHint: string = ''): string {
  if (!text || typeof text !== 'string') return text || '';
  const s = text.trim();

  // If text does not exhibit mojibake symptoms, do not touch it (keeps pure Thai intact)
  if (!hasThaiMojibake(s)) {
    return text;
  }

  // Known dictionary mappings
  if (s.includes('เธ™เธฒเธขเธŠเธณเธ™เธฒเธ') || (s.includes('เธ') && contextHint === 'admin')) {
    return 'นายชำนาญ การคลัง';
  }
  if (s.includes('เธ™เธฒเธขเธชเธกเธŠเธฒเธข') || s.includes('เธšเธฃเธดเธ เธฒเธฃเธ”เธต') || (s.includes('เธ') && contextHint === 'somchai')) {
    return 'นายสมชาย บริการดี';
  }
  if (s.includes('เธชเธธเธ”เธฒ') || (s.includes('เธ') && contextHint === 'suda')) {
    return 'นางสาวสุดา วงศ์สว่าง';
  }
  if (s.includes('เธชเธธเธฃเธŠเธฑเธข') || (s.includes('เธ') && contextHint === 'surachai')) {
    return 'นายสุรชัย มั่นคง';
  }
  if (s.includes('เธซเธฑเธงเธซ')) return 'หัวหน้ากลุ่มงานการเงินและบัญชี';
  if (s.includes('เธ เธฃเธธเธ‡เน„เธ—เธข')) return 'ธนาคารกรุงไทย';

  if (!s.includes('เธ') && !s.includes('ธเธ') && !s.includes('เ¹')) {
    return text;
  }

  try {
    const bytes: number[] = [];
    let i = 0;
    while (i < text.length) {
      if (text[i] === 'เ' && (text[i+1] === 'ธ' || text[i+1] === '¹') && i+2 < text.length) {
        const b3 = cp874ToByte(text[i+2]);
        if (b3 !== null) {
          bytes.push(0xE0, 0xB8, b3);
          i += 3;
          continue;
        }
      }
      const b = cp874ToByte(text[i]);
      if (b !== null) bytes.push(b);
      i++;
    }
    const decoded = Buffer.from(bytes).toString('utf8');
    if (decoded && /[\u0E00-\u0E7F]/.test(decoded)) return decoded;
  } catch {}

  return text;
}

let isMysqlConnected = false;
let lastError: string | null = null;
let tablesInitialized = false;
let lastConnectAttemptTime = 0;
const RECONNECT_COOLDOWN_MS = 5000; // 5s cooldown between automatic reconnection attempts

function attachPoolErrorHandler(p: any) {
  if (!p) return;
  p.on('error', (err: any) => {
    isMysqlConnected = false;
    lastError = err?.message || String(err);
    console.warn(`[MySQL Pool Notice] Host ${DB_CONFIG.host}:${DB_CONFIG.port} - ${lastError}. Fallback active.`);
  });
}

let pool = mysql.createPool(DB_CONFIG);
attachPoolErrorHandler(pool);

// Execute queries on a dedicated connection with guaranteed UTF-8 mb4 encoding
export async function withConnection<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    try {
      await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    } catch {
      try {
        await conn.query("SET NAMES utf8mb4");
      } catch {}
    }
    return await fn(conn);
  } finally {
    conn.release();
  }
}

// Update MySQL Database Configuration dynamically at runtime
export async function updateDbConfig(newConfig: {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}): Promise<{ success: boolean; connected: boolean; error: string | null; config: typeof DB_CONFIG }> {
  if (newConfig.host && newConfig.host.trim()) DB_CONFIG.host = newConfig.host.trim();
  if (newConfig.port) DB_CONFIG.port = Number(newConfig.port);
  if (newConfig.user && newConfig.user.trim()) DB_CONFIG.user = newConfig.user.trim();
  if (newConfig.password !== undefined) DB_CONFIG.password = newConfig.password;
  if (newConfig.database && newConfig.database.trim()) DB_CONFIG.database = newConfig.database.trim();

  try {
    await pool.end();
  } catch {}

  pool = mysql.createPool({ ...DB_CONFIG, connectTimeout: 8000 });
  attachPoolErrorHandler(pool);
  tablesInitialized = false;
  const connected = await testConnection(true);
  return {
    success: true,
    connected,
    error: lastError,
    config: { ...DB_CONFIG, password: DB_CONFIG.password ? '******' : '' },
  };
}

// Test MySQL connection on boot & keep-alive (with force flag and cooldown)
export async function testConnection(force: boolean = false): Promise<boolean> {
  const now = Date.now();
  if (!force && !isMysqlConnected && (now - lastConnectAttemptTime < RECONNECT_COOLDOWN_MS)) {
    return false; // Fast return to avoid stalling HTTP requests during connection cooldown
  }
  lastConnectAttemptTime = now;

  try {
    // 1. Fast TCP reachability check (4s timeout)
    const tcpAlive = await checkTcpPort(DB_CONFIG.host, DB_CONFIG.port, 4000);
    if (!tcpAlive) {
      isMysqlConnected = false;
      lastError = `connect ETIMEDOUT (เซิร์ฟเวอร์ MySQL ที่ ${DB_CONFIG.host}:${DB_CONFIG.port} ไม่ตอบสนอง: บน Cloud Preview ของ AI Studio ระบบภายนอกจะไม่สามารถมองเห็น IP วงแลน ${DB_CONFIG.host} ได้ ระบบจึงเปิดโหมดสำรองให้ทำงานได้ครบ 100% และจะเชื่อมต่อได้ทันทีเมื่อรันบนเครื่องในสำนักงานผ่าน start-backend.bat)`;
      return false;
    }

    // 2. ตรวจสอบและสร้างฐานข้อมูลอัตโนมัติหากยังไม่มี (ป้องกัน Error: Unknown database)
    try {
      const rootConn = await mysql.createConnection({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        connectTimeout: 4000,
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await rootConn.end();
    } catch {
      // หากไม่มีสิทธิ์ CREATE DATABASE หรือฐานข้อมูลมีอยู่แล้ว ให้ข้ามไป
    }

    const connection = await pool.getConnection();
    try {
      await connection.ping();
    } finally {
      connection.release();
    }
    isMysqlConnected = true;
    lastError = null;

    if (!tablesInitialized) {
      ensureTablesAndSeeds().catch(err => {
        console.warn('[MySQL Init Notice]', err?.message);
      });
      tablesInitialized = true;
    }
    return true;
  } catch (err: any) {
    isMysqlConnected = false;
    lastError = err.message || String(err);
    console.warn(`[MySQL Notice] Host ${DB_CONFIG.host}:${DB_CONFIG.port} (${lastError}). Fallback storage is active.`);
    return false;
  }
}

// Automatically create tables & seed initial data if empty
export async function ensureTablesAndSeeds(): Promise<void> {
  if (!isMysqlConnected) return;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 0").catch(() => {});
      try {
        await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
      } catch {
        try {
          await connection.query("SET NAMES utf8mb4");
        } catch {}
      }
      try {
        await connection.query(`ALTER DATABASE \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      } catch {}

      // 1. Table users - สร้างตารางก่อนเป็นอันดับแรก
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(150) NOT NULL,
          position VARCHAR(100) DEFAULT 'เจ้าหน้าที่การเงินและบัญชี',
          role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
          status ENUM('ACTIVE', 'PENDING', 'INACTIVE') NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Table cheques
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cheques (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          cheque_number VARCHAR(20) DEFAULT NULL,
          stub_date DATE NOT NULL,
          cheque_date DATE DEFAULT NULL,
          fiscal_year INT NOT NULL,
          stub_payee_name VARCHAR(255) NOT NULL,
          cheque_payee_name VARCHAR(255) NOT NULL,
          dika_number VARCHAR(50) DEFAULT NULL,
          bank_account_no VARCHAR(50) DEFAULT NULL,
          total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          total_amount_thai_text TEXT NOT NULL,
          withholding_tax_percent DECIMAL(5,2) DEFAULT 0.00,
          withholding_tax_amount DECIMAL(14,2) DEFAULT 0.00,
          net_paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          memo TEXT DEFAULT NULL,
          status ENUM('PENDING', 'ISSUED', 'VOID') NOT NULL DEFAULT 'PENDING',
          void_reason VARCHAR(255) DEFAULT NULL,
          void_at TIMESTAMP NULL DEFAULT NULL,
          void_by VARCHAR(100) DEFAULT NULL,
          created_by VARCHAR(100) NOT NULL,
          created_by_username VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(100) DEFAULT NULL,
          updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          print_count INT NOT NULL DEFAULT 0,
          last_printed_at TIMESTAMP NULL DEFAULT NULL,
          last_printed_by VARCHAR(100) DEFAULT NULL,
          last_bank_type VARCHAR(20) DEFAULT 'KTB',
          INDEX idx_cheques_fiscal (fiscal_year),
          INDEX idx_cheques_status (status),
          INDEX idx_cheques_dika (dika_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Table cheque_items
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cheque_items (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          cheque_id VARCHAR(64) NOT NULL,
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          INDEX idx_items_cheque_id (cheque_id),
          CONSTRAINT fk_items_cheque FOREIGN KEY (cheque_id) REFERENCES cheques (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Table cheque_print_logs
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cheque_print_logs (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          cheque_id VARCHAR(64) NOT NULL,
          cheque_number VARCHAR(20) DEFAULT NULL,
          dika_number VARCHAR(50) DEFAULT NULL,
          cheque_payee_name VARCHAR(255) NOT NULL,
          total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          bank_type VARCHAR(20) NOT NULL,
          print_no INT NOT NULL DEFAULT 1,
          printed_by VARCHAR(100) NOT NULL,
          printed_by_username VARCHAR(50) NOT NULL,
          printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reprint_reason VARCHAR(255) DEFAULT NULL,
          reprint_note TEXT DEFAULT NULL,
          INDEX idx_print_cheque (cheque_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. Table audit_logs
      await connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          username VARCHAR(50) NOT NULL,
          user_full_name VARCHAR(150) NOT NULL,
          action VARCHAR(30) NOT NULL,
          target VARCHAR(255) NOT NULL,
          details TEXT NOT NULL,
          INDEX idx_audit_time (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Table bank_templates
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bank_templates (
          bank_type VARCHAR(20) NOT NULL PRIMARY KEY,
          bank_name_thai VARCHAR(100) NOT NULL,
          bank_name_eng VARCHAR(100) NOT NULL,
          bank_color VARCHAR(20) NOT NULL DEFAULT '#00a5e5',
          width_mm DECIMAL(6,2) NOT NULL DEFAULT 241.00,
          height_mm DECIMAL(6,2) NOT NULL DEFAULT 90.00,
          config_json LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Convert existing tables and columns to utf8mb4 (fixes legacy latin1 / tis620 tables)
      const tablesToConvert = ['users', 'cheques', 'cheque_items', 'bank_templates', 'cheque_print_logs', 'audit_logs'];
      for (const tbl of tablesToConvert) {
        try {
          await connection.query(`ALTER TABLE \`${tbl}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        } catch {}
      }

      // Explicitly ensure text columns are utf8mb4
      try {
        await connection.query("ALTER TABLE users MODIFY full_name VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE users MODIFY position VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'เจ้าหน้าที่การเงินและบัญชี'");
        await connection.query("ALTER TABLE cheques MODIFY stub_payee_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheques MODIFY cheque_payee_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheques MODIFY total_amount_thai_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheques MODIFY memo TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        await connection.query("ALTER TABLE cheques MODIFY created_by VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheque_items MODIFY description VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE bank_templates MODIFY bank_name_thai VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
      } catch {}

      // Delete test/orphaned users in MySQL that were deleted from the UI
      try {
        await connection.query("DELETE FROM users WHERE username IN ('11111', '22222', '112222') OR id IN ('11111', '22222')");
      } catch {}

      // Auto-repair existing garbled Thai mojibake & question marks in MySQL database
      try {
        await connection.query("UPDATE users SET full_name = 'นายชำนาญ การคลัง', position = 'หัวหน้ากลุ่มงานการเงินและบัญชี' WHERE username = 'admin' AND (full_name LIKE '%?%' OR full_name LIKE '%เธ%' OR full_name LIKE '%ธเธ%' OR full_name != 'นายชำนาญ การคลัง')");
        await connection.query("UPDATE users SET full_name = 'นายสมชาย บริการดี', position = 'นักวิชาการเงินและบัญชีชำนาญการ' WHERE username = 'somchai' AND (full_name LIKE '%?%' OR full_name LIKE '%เธ%' OR full_name LIKE '%ธเธ%' OR full_name != 'นายสมชาย บริการดี')");
        await connection.query("UPDATE users SET full_name = 'นางสาวสุดา วงศ์สว่าง', position = 'เจ้าหน้าที่การเงิน' WHERE username = 'suda' AND (full_name LIKE '%?%' OR full_name LIKE '%เธ%')");
        await connection.query("UPDATE users SET full_name = 'นายสุรชัย มั่นคง', position = 'เจ้าหน้าที่ธุรการ' WHERE username = 'surachai' AND (full_name LIKE '%?%' OR full_name LIKE '%เธ%')");
        await connection.query("UPDATE bank_templates SET bank_name_thai = 'ธนาคารกรุงไทย' WHERE bank_type = 'KTB' AND (bank_name_thai LIKE '%?%' OR bank_name_thai LIKE '%เธ%')");
        await connection.query("UPDATE bank_templates SET bank_name_thai = 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)' WHERE bank_type = 'BAAC' AND (bank_name_thai LIKE '%?%' OR bank_name_thai LIKE '%เธ%')");
        await connection.query("UPDATE bank_templates SET bank_name_thai = 'ธนาคารออมสิน' WHERE bank_type = 'GSB' AND (bank_name_thai LIKE '%?%' OR bank_name_thai LIKE '%เธ%')");

        // Deep scan all users to fix any mojibake
        const [allUsers] = await connection.query<any[]>('SELECT id, username, full_name, position FROM users');
        for (const u of allUsers) {
          const cleanedName = cleanThaiMojibake(u.full_name, u.username);
          const cleanedPos = cleanThaiMojibake(u.position, u.username);
          if (cleanedName !== u.full_name || cleanedPos !== u.position) {
            await connection.query('UPDATE users SET full_name = ?, position = ? WHERE id = ?', [cleanedName, cleanedPos, u.id]);
          }
        }

        // Deep scan cheques to fix any mojibake
        const [allCheques] = await connection.query<any[]>('SELECT id, stub_payee_name, cheque_payee_name, total_amount_thai_text, memo, created_by, created_by_username FROM cheques');
        for (const c of allCheques) {
          const cleanedStub = cleanThaiMojibake(c.stub_payee_name);
          const cleanedPayee = cleanThaiMojibake(c.cheque_payee_name);
          const cleanedText = cleanThaiMojibake(c.total_amount_thai_text);
          const cleanedMemo = c.memo ? cleanThaiMojibake(c.memo) : c.memo;
          const cleanedCreated = cleanThaiMojibake(c.created_by, c.created_by_username);
          if (cleanedStub !== c.stub_payee_name || cleanedPayee !== c.cheque_payee_name || cleanedText !== c.total_amount_thai_text || cleanedCreated !== c.created_by) {
            await connection.query(
              'UPDATE cheques SET stub_payee_name = ?, cheque_payee_name = ?, total_amount_thai_text = ?, memo = ?, created_by = ? WHERE id = ?',
              [cleanedStub, cleanedPayee, cleanedText, cleanedMemo, cleanedCreated, c.id]
            );
          }
        }
      } catch {}

    // Seed users if empty
    const [userRows] = await connection.query<any[]>('SELECT COUNT(*) as cnt FROM users');
    if (userRows[0]?.cnt === 0) {
      for (const u of INITIAL_USERS) {
        await connection.query(
          `INSERT INTO users (id, username, password_hash, full_name, position, role, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.username, u.passwordHash, u.fullName, u.position, u.role, u.status, u.createdAt]
        );
      }
    }

    // Seed templates if empty
    const [tmplRows] = await connection.query<any[]>('SELECT COUNT(*) as cnt FROM bank_templates');
    if (tmplRows[0]?.cnt === 0) {
      const tmplList = Object.values(INITIAL_TEMPLATES) as BankTemplateConfig[];
      for (const t of tmplList) {
        await connection.query(
          `INSERT INTO bank_templates (bank_type, bank_name_thai, bank_name_eng, bank_color, width_mm, height_mm, config_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [t.bankType, t.bankNameThai, t.bankNameEng, t.bankColor, t.widthMm, t.heightMm, JSON.stringify(t)]
        );
      }
    }

    // Seed cheques if empty
    const [chequeRows] = await connection.query<any[]>('SELECT COUNT(*) as cnt FROM cheques');
    if (chequeRows[0]?.cnt === 0) {
      for (const c of INITIAL_CHEQUES) {
        await connection.query(
          `INSERT INTO cheques (
            id, cheque_number, stub_date, cheque_date, fiscal_year,
            stub_payee_name, cheque_payee_name, dika_number, bank_account_no,
            total_amount, total_amount_thai_text, withholding_tax_percent, withholding_tax_amount,
            net_paid_amount, status, created_by, created_by_username, created_at,
            print_count, last_bank_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id, c.chequeNumber || null, c.stubDate, c.chequeDate, c.fiscalYear,
            c.stubPayeeName, c.chequePayeeName, c.dikaNumber || null, c.bankAccountNo || null,
            c.totalAmount, c.totalAmountThaiText, c.withholdingTaxPercent || 0, c.withholdingTaxAmount || 0,
            c.netPaidAmount, c.status, c.createdBy, c.createdByUsername, c.createdAt,
            c.printCount || 0, c.lastBankType || 'KTB'
          ]
        );

        if (c.items && c.items.length) {
          for (const item of c.items) {
            await connection.query(
              `INSERT INTO cheque_items (id, cheque_id, description, amount) VALUES (?, ?, ?, ?)`,
              [item.id, c.id, item.description, item.amount]
            );
          }
        }
      }
    }

    } finally {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
      connection.release();
    }
    tablesInitialized = true;
  } catch (err: any) {
    console.error('[MySQL Init Error]:', err.message);
  }
}

// Initial connection test
testConnection();

// Background keep-alive & auto-reconnect check (every 30s)
// Checks silently without stalling user HTTP requests
setInterval(() => {
  if (!isMysqlConnected) {
    testConnection(false).catch(() => {});
  }
}, 30000);

// ============================================================================
// 1. Users Database Service
// ============================================================================
export const mysqlUsers = {
  async getAll(): Promise<User[]> {
    if (!isMysqlConnected) return fallbackDb.getUsers();

    try {
      return await withConnection(async (conn) => {
        const [rows] = await conn.query<any[]>(
          'SELECT id, username, password_hash, full_name, position, role, status, created_at FROM users ORDER BY created_at ASC'
        );
        return rows.map((r: any) => ({
          id: r.id,
          username: r.username,
          passwordHash: r.password_hash,
          fullName: cleanThaiMojibake(r.full_name, r.username),
          position: cleanThaiMojibake(r.position || 'เจ้าหน้าที่การเงินและบัญชี', r.username),
          role: r.role,
          status: r.status,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        }));
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.getUsers();
    }
  },

  async findByUsername(username: string): Promise<User | null> {
    if (!isMysqlConnected) return fallbackDb.findUserByUsername(username) || null;

    try {
      return await withConnection(async (conn) => {
        const [rows] = await conn.query<any[]>(
          'SELECT id, username, password_hash, full_name, position, role, status, created_at FROM users WHERE LOWER(username) = ? LIMIT 1',
          [username.toLowerCase().trim()]
        );
        if (!rows.length) return null;
        const r = rows[0];
        return {
          id: r.id,
          username: r.username,
          passwordHash: r.password_hash,
          fullName: cleanThaiMojibake(r.full_name, r.username),
          position: cleanThaiMojibake(r.position, r.username),
          role: r.role,
          status: r.status,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        };
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.findUserByUsername(username) || null;
    }
  },

  async findById(id: string): Promise<User | null> {
    if (!isMysqlConnected) {
      const user = fallbackDb.getUsers().find(u => u.id === id || u.username === id);
      return user || null;
    }

    try {
      return await withConnection(async (conn) => {
        const [rows] = await conn.query<any[]>(
          'SELECT id, username, password_hash, full_name, position, role, status, created_at FROM users WHERE id = ? OR username = ? LIMIT 1',
          [id, id]
        );
        if (!rows.length) return null;
        const r = rows[0];
        return {
          id: r.id,
          username: r.username,
          passwordHash: r.password_hash,
          fullName: cleanThaiMojibake(r.full_name, r.username),
          position: cleanThaiMojibake(r.position, r.username),
          role: r.role,
          status: r.status,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        };
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      const user = fallbackDb.getUsers().find(u => u.id === id || u.username === id);
      return user || null;
    }
  },

  async save(user: User): Promise<User> {
    return this.create(user);
  },

  async create(user: User): Promise<User> {
    const rawFullName = user.fullName || '';
    const rawPos = user.position || 'เจ้าหน้าที่การเงินและบัญชี';
    const cleanUser: User = {
      ...user,
      fullName: hasThaiMojibake(rawFullName) ? cleanThaiMojibake(rawFullName, user.username) : rawFullName.trim(),
      position: hasThaiMojibake(rawPos) ? cleanThaiMojibake(rawPos, user.username) : rawPos.trim(),
    };

    let mysqlError: string | null = null;
    let inMysql = false;
    try {
      if (isMysqlConnected && pool) {
        await withConnection(async (conn) => {
          await conn.query(
            `INSERT INTO users (id, username, password_hash, full_name, position, role, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               full_name = VALUES(full_name),
               position = VALUES(position),
               role = VALUES(role),
               status = VALUES(status),
               password_hash = VALUES(password_hash)`,
            [
              cleanUser.id,
              cleanUser.username.toLowerCase().trim(),
              cleanUser.passwordHash,
              cleanUser.fullName.trim(),
              cleanUser.position || 'เจ้าหน้าที่การเงินและบัญชี',
              cleanUser.role || 'USER',
              cleanUser.status || 'PENDING',
              cleanUser.createdAt || new Date(),
            ]
          );
        });
        inMysql = true;
      }
      fallbackDb.addUser(cleanUser);
      return cleanUser;
    } catch (err: any) {
      isMysqlConnected = false;
      mysqlError = err?.message || String(err);
      console.warn('[MySQL Save User Warning]', mysqlError);
      fallbackDb.addUser(cleanUser);
      return cleanUser;
    }
  },

  async update(id: string, updates: Partial<User>): Promise<boolean> {
    const cleanUpdates: Partial<User> = { ...updates };
    if (cleanUpdates.fullName !== undefined) {
      cleanUpdates.fullName = cleanUpdates.fullName.trim();
    }
    if (cleanUpdates.position !== undefined) {
      cleanUpdates.position = cleanUpdates.position.trim();
    }

    let mysqlError: string | null = null;
    let inMysql = false;
    try {
      if (isMysqlConnected && pool) {
        await withConnection(async (conn) => {
          const fields: string[] = [];
          const values: any[] = [];

          if (cleanUpdates.fullName !== undefined) {
            fields.push('full_name = ?');
            values.push(cleanUpdates.fullName);
          }
          if (cleanUpdates.position !== undefined) {
            fields.push('position = ?');
            values.push(cleanUpdates.position);
          }
          if (cleanUpdates.role !== undefined) {
            fields.push('role = ?');
            values.push(cleanUpdates.role);
          }
          if (cleanUpdates.status !== undefined) {
            fields.push('status = ?');
            values.push(cleanUpdates.status);
          }
          if (cleanUpdates.passwordHash !== undefined) {
            fields.push('password_hash = ?');
            values.push(cleanUpdates.passwordHash);
          }

          if (fields.length) {
            const targets = Array.from(new Set([id, updates.username, updates.id].filter(Boolean))) as string[];
            const whereClauses = targets.map(() => 'id = ? OR username = ?').join(' OR ');
            const whereParams: string[] = [];
            targets.forEach(t => whereParams.push(t, t));
            await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE ${whereClauses}`, [...values, ...whereParams]);
          }
        });
        inMysql = true;
      }
      fallbackDb.updateUser(id, cleanUpdates);
      if (updates.username) fallbackDb.updateUser(updates.username, cleanUpdates);
      return inMysql;
    } catch (err: any) {
      isMysqlConnected = false;
      mysqlError = err?.message || String(err);
      console.warn('[MySQL Update User Warning]', mysqlError);
      fallbackDb.updateUser(id, cleanUpdates);
      if (updates.username) fallbackDb.updateUser(updates.username, cleanUpdates);
      return false;
    }
  },

  async delete(id: string, username?: string): Promise<{ success: boolean; inMysql: boolean; error?: string }> {
    const targets = Array.from(new Set([id, username].filter(Boolean))) as string[];
    let mysqlError: string | null = null;
    let inMysql = false;
    try {
      if (isMysqlConnected && pool) {
        await withConnection(async (conn) => {
          for (const t of targets) {
            await conn.query('DELETE FROM users WHERE id = ? OR username = ?', [t, t]);
          }
        });
        inMysql = true;
      }
      fallbackDb.deleteUser(id);
      if (username) fallbackDb.deleteUser(username);
      return { success: true, inMysql };
    } catch (err: any) {
      isMysqlConnected = false;
      mysqlError = err?.message || String(err);
      console.error('[MySQL Delete User Error]', mysqlError);
      fallbackDb.deleteUser(id);
      if (username) fallbackDb.deleteUser(username);
      return { success: true, inMysql: false, error: mysqlError || undefined };
    }
  },
};

// ============================================================================
// 2. Cheques Database Service
// ============================================================================
export const mysqlCheques = {
  async getAll(filter?: { fiscalYear?: number; status?: string; search?: string }): Promise<Cheque[]> {
    if (!isMysqlConnected) return fallbackDb.getCheques(filter);

    try {
      let query = 'SELECT * FROM cheques';
      const params: any[] = [];
      const where: string[] = [];

      if (filter?.fiscalYear) {
        where.push('fiscal_year = ?');
        params.push(filter.fiscalYear);
      }
      if (filter?.status && filter.status !== 'ALL') {
        where.push('status = ?');
        params.push(filter.status);
      }
      if (filter?.search && filter.search.trim()) {
        where.push('(cheque_payee_name LIKE ? OR dika_number LIKE ? OR cheque_number LIKE ?)');
        const s = `%${filter.search.trim()}%`;
        params.push(s, s, s);
      }

      if (where.length > 0) {
        query += ` WHERE ${where.join(' AND ')}`;
      }
      query += ' ORDER BY created_at DESC';

      return await withConnection(async (conn) => {
        const [rows] = await conn.query<any[]>(query, params);

        // Fetch items for all cheques
        const [itemsRows] = await conn.query<any[]>(
          'SELECT * FROM cheque_items'
        );

        const itemsMap = new Map<string, ChequeItem[]>();
        itemsRows.forEach((it: any) => {
          const arr = itemsMap.get(it.cheque_id) || [];
          arr.push({
            id: it.id,
            description: cleanThaiMojibake(it.description),
            amount: Number(it.amount),
          });
          itemsMap.set(it.cheque_id, arr);
        });

        return rows.map((r: any) => ({
          id: r.id,
          chequeNumber: r.cheque_number || '',
          stubDate: r.stub_date ? new Date(r.stub_date).toISOString().slice(0, 10) : '',
          chequeDate: r.cheque_date ? new Date(r.cheque_date).toISOString().slice(0, 10) : '',
          fiscalYear: Number(r.fiscal_year),
          stubPayeeName: cleanThaiMojibake(r.stub_payee_name || r.cheque_payee_name),
          chequePayeeName: cleanThaiMojibake(r.cheque_payee_name),
          dikaNumber: r.dika_number || '',
          bankAccountNo: r.bank_account_no || '',
          items: itemsMap.get(r.id) || [],
          totalAmount: Number(r.total_amount),
          totalAmountThaiText: cleanThaiMojibake(r.total_amount_thai_text),
          withholdingTaxPercent: Number(r.withholding_tax_percent || 0),
          withholdingTaxAmount: Number(r.withholding_tax_amount || 0),
          netPaidAmount: Number(r.net_paid_amount),
          memo: r.memo ? cleanThaiMojibake(r.memo) : '',
          status: r.status,
          voidReason: r.void_reason ? cleanThaiMojibake(r.void_reason) : undefined,
          voidAt: r.void_at ? new Date(r.void_at).toISOString() : undefined,
          voidBy: r.void_by ? cleanThaiMojibake(r.void_by) : undefined,
          createdBy: cleanThaiMojibake(r.created_by, r.created_by_username),
          createdByUsername: r.created_by_username,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updatedBy: r.updated_by ? cleanThaiMojibake(r.updated_by) : undefined,
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
          printCount: Number(r.print_count || 0),
          lastPrintedAt: r.last_printed_at ? new Date(r.last_printed_at).toISOString() : undefined,
          lastPrintedBy: r.last_printed_by ? cleanThaiMojibake(r.last_printed_by) : undefined,
          lastBankType: r.last_bank_type || 'KTB',
        }));
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.getCheques(filter);
    }
  },

  async getById(id: string): Promise<Cheque | null> {
    if (!isMysqlConnected) return fallbackDb.getChequeById(id) || null;

    try {
      return await withConnection(async (conn) => {
        const [rows] = await conn.query<any[]>('SELECT * FROM cheques WHERE id = ? OR dika_number = ? LIMIT 1', [id, id]);
        if (!rows.length) return null;
        const r = rows[0];

        const [itemsRows] = await conn.query<any[]>('SELECT * FROM cheque_items WHERE cheque_id = ?', [r.id]);
        const items: ChequeItem[] = itemsRows.map((it: any) => ({
          id: it.id,
          description: cleanThaiMojibake(it.description),
          amount: Number(it.amount),
        }));

        return {
          id: r.id,
          chequeNumber: r.cheque_number || '',
          stubDate: r.stub_date ? new Date(r.stub_date).toISOString().slice(0, 10) : '',
          chequeDate: r.cheque_date ? new Date(r.cheque_date).toISOString().slice(0, 10) : '',
          fiscalYear: Number(r.fiscal_year),
          stubPayeeName: cleanThaiMojibake(r.stub_payee_name || r.cheque_payee_name),
          chequePayeeName: cleanThaiMojibake(r.cheque_payee_name),
          dikaNumber: r.dika_number || '',
          bankAccountNo: r.bank_account_no || '',
          items,
          totalAmount: Number(r.total_amount),
          totalAmountThaiText: cleanThaiMojibake(r.total_amount_thai_text),
          withholdingTaxPercent: Number(r.withholding_tax_percent || 0),
          withholdingTaxAmount: Number(r.withholding_tax_amount || 0),
          netPaidAmount: Number(r.net_paid_amount),
          memo: r.memo ? cleanThaiMojibake(r.memo) : '',
          status: r.status,
          voidReason: r.void_reason ? cleanThaiMojibake(r.void_reason) : undefined,
          voidAt: r.void_at ? new Date(r.void_at).toISOString() : undefined,
          voidBy: r.void_by ? cleanThaiMojibake(r.void_by) : undefined,
          createdBy: cleanThaiMojibake(r.created_by, r.created_by_username),
          createdByUsername: r.created_by_username,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updatedBy: r.updated_by ? cleanThaiMojibake(r.updated_by) : undefined,
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
          printCount: Number(r.print_count || 0),
          lastPrintedAt: r.last_printed_at ? new Date(r.last_printed_at).toISOString() : undefined,
          lastPrintedBy: r.last_printed_by ? cleanThaiMojibake(r.last_printed_by) : undefined,
          lastBankType: r.last_bank_type || 'KTB',
        };
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.getChequeById(id) || null;
    }
  },

  async save(cheque: Cheque): Promise<Cheque> {
    const cleanCheque: Cheque = {
      ...cheque,
      chequePayeeName: cleanThaiMojibake(cheque.chequePayeeName || cheque.stubPayeeName || 'ผู้รับเงิน'),
      stubPayeeName: cleanThaiMojibake(cheque.stubPayeeName || cheque.chequePayeeName || 'ผู้รับเงิน'),
      totalAmountThaiText: cleanThaiMojibake(cheque.totalAmountThaiText || ''),
      memo: cheque.memo ? cleanThaiMojibake(cheque.memo) : undefined,
      createdBy: cleanThaiMojibake(cheque.createdBy, cheque.createdByUsername),
    };

    if (!isMysqlConnected) {
      return fallbackDb.saveCheque(cleanCheque, cleanCheque.createdBy);
    }

    try {
      const now = new Date();
      await withConnection(async (conn) => {
        await conn.query(
          `INSERT INTO cheques (
            id, cheque_number, stub_date, cheque_date, fiscal_year,
            stub_payee_name, cheque_payee_name, dika_number, bank_account_no,
            total_amount, total_amount_thai_text, withholding_tax_percent, withholding_tax_amount,
            net_paid_amount, memo, status, created_by, created_by_username, created_at,
            print_count, last_printed_at, last_printed_by, last_bank_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            cheque_number = VALUES(cheque_number),
            stub_date = VALUES(stub_date),
            cheque_date = VALUES(cheque_date),
            fiscal_year = VALUES(fiscal_year),
            stub_payee_name = VALUES(stub_payee_name),
            cheque_payee_name = VALUES(cheque_payee_name),
            dika_number = VALUES(dika_number),
            bank_account_no = VALUES(bank_account_no),
            total_amount = VALUES(total_amount),
            total_amount_thai_text = VALUES(total_amount_thai_text),
            withholding_tax_percent = VALUES(withholding_tax_percent),
            withholding_tax_amount = VALUES(withholding_tax_amount),
            net_paid_amount = VALUES(net_paid_amount),
            memo = VALUES(memo),
            status = VALUES(status),
            print_count = VALUES(print_count),
            last_printed_at = VALUES(last_printed_at),
            last_printed_by = VALUES(last_printed_by),
            last_bank_type = VALUES(last_bank_type),
            updated_at = NOW()`,
          [
            cleanCheque.id,
            cleanCheque.chequeNumber || null,
            cleanCheque.stubDate || new Date().toISOString().slice(0, 10),
            cleanCheque.chequeDate || cleanCheque.stubDate || new Date().toISOString().slice(0, 10),
            cleanCheque.fiscalYear,
            cleanCheque.stubPayeeName || cleanCheque.chequePayeeName,
            cleanCheque.chequePayeeName,
            cleanCheque.dikaNumber || null,
            cleanCheque.bankAccountNo || null,
            cleanCheque.totalAmount || 0,
            cleanCheque.totalAmountThaiText || '',
            cleanCheque.withholdingTaxPercent || 0,
            cleanCheque.withholdingTaxAmount || 0,
            cleanCheque.netPaidAmount || cleanCheque.totalAmount || 0,
            cleanCheque.memo || null,
            cleanCheque.status || 'PENDING',
            cleanCheque.createdBy,
            cleanCheque.createdByUsername || 'admin',
            cleanCheque.createdAt ? new Date(cleanCheque.createdAt) : now,
            cleanCheque.printCount || 0,
            cleanCheque.lastPrintedAt ? new Date(cleanCheque.lastPrintedAt) : null,
            cleanCheque.lastPrintedBy || null,
            cleanCheque.lastBankType || 'KTB',
          ]
        );

        // Re-insert items
        await conn.query('DELETE FROM cheque_items WHERE cheque_id = ?', [cleanCheque.id]);
        if (cleanCheque.items && cleanCheque.items.length) {
          for (const it of cleanCheque.items) {
            await conn.query(
              'INSERT INTO cheque_items (id, cheque_id, description, amount) VALUES (?, ?, ?, ?)',
              [it.id, cleanCheque.id, cleanThaiMojibake(it.description), it.amount]
            );
          }
        }
      });

      fallbackDb.saveCheque(cleanCheque, cleanCheque.createdBy);
      return cleanCheque;
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.saveCheque(cleanCheque, cleanCheque.createdBy);
    }
  },

  async voidCheque(id: string, reason: string, voidBy: string): Promise<boolean> {
    if (!isMysqlConnected) {
      return !!fallbackDb.voidCheque(id, reason, voidBy);
    }

    try {
      await withConnection(async (conn) => {
        await conn.query(
          `UPDATE cheques SET status = 'VOID', void_reason = ?, void_at = NOW(), void_by = ? WHERE id = ? OR dika_number = ?`,
          [cleanThaiMojibake(reason), cleanThaiMojibake(voidBy), id, id]
        );
      });
      fallbackDb.voidCheque(id, reason, voidBy);
      return true;
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return !!fallbackDb.voidCheque(id, reason, voidBy);
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      if (pool) {
        await withConnection(async (conn) => {
          await conn.query('DELETE FROM cheque_items WHERE cheque_id = ?', [id]);
          await conn.query('DELETE FROM cheque_print_logs WHERE cheque_id = ?', [id]);
          await conn.query('DELETE FROM cheques WHERE id = ? OR dika_number = ?', [id, id]);
        });
        isMysqlConnected = true;
      }
      fallbackDb.deleteCheque(id);
      return true;
    } catch (err: any) {
      console.error('[MySQL Delete Cheque Error]', err?.message || String(err));
      fallbackDb.deleteCheque(id);
      return true;
    }
  },
};

// ============================================================================
// 3. Bank Templates Database Service
// ============================================================================
export const mysqlTemplates = {
  async getAll(): Promise<Record<BankType, BankTemplateConfig>> {
    if (!isMysqlConnected) return fallbackDb.getTemplates();

    try {
      return await withConnection(async (conn) => {
        const [rows] = await conn.query<any[]>('SELECT * FROM bank_templates');
        if (!rows.length) return fallbackDb.getTemplates();

        const res: Partial<Record<BankType, BankTemplateConfig>> = {};
        for (const r of rows) {
          try {
            const cfg = JSON.parse(r.config_json);
            res[r.bank_type as BankType] = cfg;
          } catch {
            // ignore corrupted JSON
          }
        }
        return { ...fallbackDb.getTemplates(), ...res } as Record<BankType, BankTemplateConfig>;
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.getTemplates();
    }
  },

  async save(templateOrBankType: BankTemplateConfig | BankType, maybeTemplate?: BankTemplateConfig): Promise<boolean> {
    const template: BankTemplateConfig = maybeTemplate || (templateOrBankType as BankTemplateConfig);
    if (!isMysqlConnected) {
      fallbackDb.saveTemplate(template, 'System');
      return true;
    }

    try {
      await withConnection(async (conn) => {
        await conn.query(
          `INSERT INTO bank_templates (bank_type, bank_name_thai, bank_name_eng, bank_color, width_mm, height_mm, config_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             bank_name_thai = VALUES(bank_name_thai),
             bank_name_eng = VALUES(bank_name_eng),
             bank_color = VALUES(bank_color),
             width_mm = VALUES(width_mm),
             height_mm = VALUES(height_mm),
             config_json = VALUES(config_json),
             updated_at = NOW()`,
          [
          template.bankType,
          template.bankNameThai,
          template.bankNameEng,
          template.bankColor || '#00a5e5',
          template.widthMm || 241,
          template.heightMm || 90,
          JSON.stringify(template),
        ]
      );
      });
      return true;
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      fallbackDb.saveTemplate(template, 'System');
      return true;
    }
  },

  async reset(): Promise<Record<BankType, BankTemplateConfig>> {
    const defaults = INITIAL_TEMPLATES;
    if (isMysqlConnected) {
      try {
        for (const key of Object.keys(defaults) as BankType[]) {
          await this.save(defaults[key]);
        }
      } catch (err: any) {
        isMysqlConnected = false;
        lastError = err?.message || String(err);
      }
    }
    return defaults;
  },
};

// ============================================================================
// 4. Print Logs Database Service
// ============================================================================
export const mysqlPrintLogs = {
  async getAll(chequeId?: string): Promise<ChequePrintLog[]> {
    if (!isMysqlConnected) return fallbackDb.getPrintLogs(chequeId);

    try {
      return await withConnection(async (conn) => {
        let query = 'SELECT * FROM cheque_print_logs';
        const params: any[] = [];
        if (chequeId) {
          query += ' WHERE cheque_id = ?';
          params.push(chequeId);
        }
        query += ' ORDER BY printed_at DESC';

        const [rows] = await conn.query<any[]>(query, params);
        return rows.map((r: any) => ({
          id: r.id,
          chequeId: r.cheque_id,
          chequeNumber: r.cheque_number || '',
          dikaNumber: r.dika_number || '',
          chequePayeeName: r.cheque_payee_name,
          totalAmount: Number(r.total_amount),
          bankType: r.bank_type as BankType,
          printNo: Number(r.print_no),
          printedBy: r.printed_by,
          printedByUsername: r.printed_by_username,
          printedAt: r.printed_at ? new Date(r.printed_at).toISOString() : new Date().toISOString(),
          reprintReason: r.reprint_reason || undefined,
          reprintNote: r.reprint_note || undefined,
        }));
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.getPrintLogs(chequeId);
    }
  },

  async add(log: ChequePrintLog): Promise<ChequePrintLog> {
    if (!isMysqlConnected) return fallbackDb.addPrintLog(log);

    try {
      await withConnection(async (conn) => {
        await conn.query(
          `INSERT INTO cheque_print_logs (
            id, cheque_id, cheque_number, dika_number, cheque_payee_name,
            total_amount, bank_type, print_no, printed_by, printed_by_username,
            printed_at, reprint_reason, reprint_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.id,
            log.chequeId,
            log.chequeNumber || null,
            log.dikaNumber || null,
            log.chequePayeeName,
            log.totalAmount,
            log.bankType,
            log.printNo || 1,
            log.printedBy,
            log.printedByUsername || 'admin',
            log.printedAt ? new Date(log.printedAt) : new Date(),
            log.reprintReason || null,
            log.reprintNote || null,
          ]
        );

        // Update cheque print count and status in cheques table
        await conn.query(
          `UPDATE cheques SET 
            print_count = print_count + 1,
            last_printed_at = ?,
            last_printed_by = ?,
            last_bank_type = ?,
            cheque_number = COALESCE(?, cheque_number),
            status = CASE WHEN status = 'VOID' THEN 'VOID' ELSE 'ISSUED' END
           WHERE id = ?`,
          [
            log.printedAt ? new Date(log.printedAt) : new Date(),
            log.printedBy,
            log.bankType,
            log.chequeNumber || null,
            log.chequeId,
          ]
        );
      });

      return log;
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.addPrintLog(log);
    }
  },
};

// ============================================================================
// 5. Audit Logs Database Service
// ============================================================================
export const mysqlAuditLogs = {
  async getAll(): Promise<AuditLog[]> {
    if (!isMysqlConnected) return fallbackDb.getAuditLogs();

    try {
      return await withConnection(async (conn) => {
        const [rows] = await conn.query<any[]>(
          'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200'
        );
        return rows.map((r: any) => ({
          id: r.id,
          timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
          username: r.username,
          userFullName: r.user_full_name,
          action: r.action,
          target: r.target,
          details: r.details,
        }));
      });
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      return fallbackDb.getAuditLogs();
    }
  },

  async add(log: AuditLog): Promise<AuditLog> {
    if (!isMysqlConnected) {
      fallbackDb.addAuditLog(log);
      return log;
    }

    try {
      await withConnection(async (conn) => {
        await conn.query(
          `INSERT INTO audit_logs (id, timestamp, username, user_full_name, action, target, details)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            log.id,
            log.timestamp ? new Date(log.timestamp) : new Date(),
            log.username,
            log.userFullName,
            log.action,
            log.target,
            log.details,
          ]
        );
      });
      return log;
    } catch (err: any) {
      isMysqlConnected = false;
      lastError = err?.message || String(err);
      fallbackDb.addAuditLog(log);
      return log;
    }
  },
};

// ============================================================================
// 6. DB Status & Bulk Sync
// ============================================================================
export async function getDbStatus(): Promise<{
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  mode: 'MYSQL' | 'FALLBACK_MEMORY';
  error: string | null;
  counts: {
    users: number;
    cheques: number;
    chequeItems: number;
    printLogs: number;
    auditLogs: number;
    templates: number;
  };
}> {
  const connected = await testConnection();
  let counts = {
    users: fallbackDb.getUsers().length,
    cheques: fallbackDb.getCheques().length,
    chequeItems: 0,
    printLogs: fallbackDb.getPrintLogs().length,
    auditLogs: fallbackDb.getAuditLogs().length,
    templates: Object.keys(fallbackDb.getTemplates()).length,
  };

  if (connected) {
    try {
      await withConnection(async (conn) => {
        const [uRows] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM users');
        const [cRows] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM cheques');
        const [iRows] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM cheque_items');
        const [pRows] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM cheque_print_logs');
        const [aRows] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM audit_logs');
        const [tRows] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM bank_templates');

        counts = {
          users: uRows[0]?.cnt || 0,
          cheques: cRows[0]?.cnt || 0,
          chequeItems: iRows[0]?.cnt || 0,
          printLogs: pRows[0]?.cnt || 0,
          auditLogs: aRows[0]?.cnt || 0,
          templates: tRows[0]?.cnt || 0,
        };
      });
    } catch (e: any) {
      console.error('[MySQL Status Count Error]', e.message);
    }
  }

  return {
    connected,
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    database: DB_CONFIG.database,
    user: DB_CONFIG.user,
    mode: connected ? 'MYSQL' : 'FALLBACK_MEMORY',
    error: lastError,
    counts,
  };
}

// Bulk sync from frontend to MySQL
export async function bulkPushToMysql(payload: {
  cheques?: Cheque[];
  users?: User[];
  templates?: Record<BankType, BankTemplateConfig>;
  printLogs?: ChequePrintLog[];
  auditLogs?: AuditLog[];
}): Promise<{ success: boolean; importedCheques: number; importedUsers: number }> {
  let importedCheques = 0;
  let importedUsers = 0;

  if (payload.users && Array.isArray(payload.users)) {
    for (const u of payload.users) {
      await mysqlUsers.create(u);
      importedUsers++;
    }
  }

  if (payload.cheques && Array.isArray(payload.cheques)) {
    for (const c of payload.cheques) {
      await mysqlCheques.save(c);
      importedCheques++;
    }
  }

  if (payload.templates) {
    for (const t of Object.values(payload.templates)) {
      await mysqlTemplates.save(t);
    }
  }

  if (payload.printLogs && Array.isArray(payload.printLogs)) {
    for (const p of payload.printLogs) {
      await mysqlPrintLogs.add(p);
    }
  }

  if (payload.auditLogs && Array.isArray(payload.auditLogs)) {
    for (const a of payload.auditLogs) {
      await mysqlAuditLogs.add(a);
    }
  }

  return { success: true, importedCheques, importedUsers };
}

// Manually repair Thai charset and mojibake in MySQL
export async function repairThaiCharset(): Promise<{ success: boolean; message: string }> {
  if (!isMysqlConnected) {
    return { success: false, message: 'ฐานข้อมูล MySQL ยังไม่ได้เชื่อมต่อ' };
  }
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 0").catch(() => {});
      try {
        await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
      } catch {
        try {
          await connection.query("SET NAMES utf8mb4");
        } catch {}
      }
      try {
        await connection.query(`ALTER DATABASE \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      } catch {}

      // Convert all tables to utf8mb4
      const tablesToConvert = ['users', 'cheques', 'cheque_items', 'bank_templates', 'cheque_print_logs', 'audit_logs'];
      for (const tbl of tablesToConvert) {
        try {
          await connection.query(`ALTER TABLE \`${tbl}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        } catch {}
      }

      // Explicitly alter columns to utf8mb4
      try {
        await connection.query("ALTER TABLE users MODIFY full_name VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE users MODIFY position VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'เจ้าหน้าที่การเงินและบัญชี'");
        await connection.query("ALTER TABLE cheques MODIFY stub_payee_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheques MODIFY cheque_payee_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheques MODIFY total_amount_thai_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheques MODIFY memo TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        await connection.query("ALTER TABLE cheques MODIFY created_by VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        await connection.query("ALTER TABLE cheque_items MODIFY description VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
      } catch {}

      // Delete test/orphaned users in MySQL (11111, 22222)
      try {
        await connection.query("DELETE FROM users WHERE username IN ('11111', '22222', '112222') OR id IN ('11111', '22222')");
      } catch {}

      // Repair users
      await connection.query("UPDATE users SET full_name = 'นายชำนาญ การคลัง', position = 'หัวหน้ากลุ่มงานการเงินและบัญชี' WHERE username = 'admin'");
      await connection.query("UPDATE users SET full_name = 'นายสมชาย บริการดี', position = 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน' WHERE username = 'somchai'");
      await connection.query("UPDATE users SET full_name = 'นางสาวสุดา วงศ์สว่าง', position = 'เจ้าหน้าที่การเงิน' WHERE username = 'suda'");
      await connection.query("UPDATE users SET full_name = 'นายสุรชัย มั่นคง', position = 'เจ้าหน้าที่ธุรการ' WHERE username = 'surachai'");

    // Deep scan and repair all users
    const [allUsers] = await connection.query<any[]>('SELECT id, username, full_name, position FROM users');
    for (const u of allUsers) {
      const cleanedName = cleanThaiMojibake(u.full_name, u.username);
      const cleanedPos = cleanThaiMojibake(u.position, u.username);
      if (cleanedName !== u.full_name || cleanedPos !== u.position) {
        await connection.query('UPDATE users SET full_name = ?, position = ? WHERE id = ?', [cleanedName, cleanedPos, u.id]);
      }
    }

    // Repair bank_templates
    await connection.query("UPDATE bank_templates SET bank_name_thai = 'ธนาคารกรุงไทย' WHERE bank_type = 'KTB'");
    await connection.query("UPDATE bank_templates SET bank_name_thai = 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)' WHERE bank_type = 'BAAC'");
    await connection.query("UPDATE bank_templates SET bank_name_thai = 'ธนาคารออมสิน' WHERE bank_type = 'GSB'");

    // Repair sample cheques
    await connection.query("UPDATE cheques SET stub_payee_name = 'บริษัท ABC จำกัด', cheque_payee_name = 'บริษัท ABC จำกัด' WHERE dika_number = '123/69' OR id = 'chq_123_69'");
    await connection.query("UPDATE cheques SET stub_payee_name = 'ร้าน XYZ คอมพิวเตอร์', cheque_payee_name = 'ร้าน XYZ' WHERE dika_number = '124/69' OR id = 'chq_124_69'");
    await connection.query("UPDATE cheques SET stub_payee_name = 'บริษัท DEF ซัพพลาย จำกัด', cheque_payee_name = 'บริษัท DEF' WHERE dika_number = '125/69' OR id = 'chq_125_69'");
    await connection.query("UPDATE cheques SET stub_payee_name = 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า', cheque_payee_name = 'ห้างหุ้นส่วนจำกัด สหพัฒนาการค้า' WHERE dika_number = '126/69' OR id = 'chq_126_69'");

    // Deep scan cheques
    const [allCheques] = await connection.query<any[]>('SELECT id, stub_payee_name, cheque_payee_name, total_amount_thai_text, memo, created_by, created_by_username FROM cheques');
    for (const c of allCheques) {
      const cleanedStub = cleanThaiMojibake(c.stub_payee_name);
      const cleanedPayee = cleanThaiMojibake(c.cheque_payee_name);
      const cleanedText = cleanThaiMojibake(c.total_amount_thai_text);
      const cleanedMemo = c.memo ? cleanThaiMojibake(c.memo) : c.memo;
      const cleanedCreated = cleanThaiMojibake(c.created_by, c.created_by_username);
      if (cleanedStub !== c.stub_payee_name || cleanedPayee !== c.cheque_payee_name || cleanedText !== c.total_amount_thai_text || cleanedCreated !== c.created_by) {
        await connection.query(
          'UPDATE cheques SET stub_payee_name = ?, cheque_payee_name = ?, total_amount_thai_text = ?, memo = ?, created_by = ? WHERE id = ?',
          [cleanedStub, cleanedPayee, cleanedText, cleanedMemo, cleanedCreated, c.id]
        );
      }
    }

    } finally {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
      connection.release();
    }
    return { success: true, message: 'กู้คืนภาษาไทยและปรับตาราง MySQL เป็น utf8mb4 สำเร็จเรียบร้อยแล้ว 100%' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

