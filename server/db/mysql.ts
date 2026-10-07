import mysql from 'mysql2/promise';
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
  connectTimeout: 5000,
  charset: 'utf8mb4',
};

const pool = mysql.createPool(DB_CONFIG);

let isMysqlConnected = false;
let lastError: string | null = null;
let tablesInitialized = false;

// Test MySQL connection on boot & keep-alive
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isMysqlConnected = true;
    lastError = null;

    if (!tablesInitialized) {
      await ensureTablesAndSeeds();
    }
    return true;
  } catch (err: any) {
    isMysqlConnected = false;
    lastError = err.message;
    return false;
  }
}

// Automatically create tables & seed initial data if empty
export async function ensureTablesAndSeeds(): Promise<void> {
  if (!isMysqlConnected) return;
  try {
    const connection = await pool.getConnection();

    // 1. Table users
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

    connection.release();
    tablesInitialized = true;
  } catch (err: any) {
    console.error('[MySQL Init Error]:', err.message);
  }
}

// Initial connection test
testConnection();

// ============================================================================
// 1. Users Database Service
// ============================================================================
export const mysqlUsers = {
  async getAll(): Promise<User[]> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.getUsers();

    try {
      const [rows] = await pool.query<any[]>(
        'SELECT id, username, password_hash, full_name, position, role, status, created_at FROM users ORDER BY created_at ASC'
      );
      return rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        passwordHash: r.password_hash,
        fullName: r.full_name,
        position: r.position || 'เจ้าหน้าที่การเงินและบัญชี',
        role: r.role,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[MySQL Error] getAll users failed:', err);
      return fallbackDb.getUsers();
    }
  },

  async findByUsername(username: string): Promise<User | null> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.findUserByUsername(username) || null;

    try {
      const [rows] = await pool.query<any[]>(
        'SELECT id, username, password_hash, full_name, position, role, status, created_at FROM users WHERE LOWER(username) = ? LIMIT 1',
        [username.toLowerCase().trim()]
      );
      if (!rows.length) return null;
      const r = rows[0];
      return {
        id: r.id,
        username: r.username,
        passwordHash: r.password_hash,
        fullName: r.full_name,
        position: r.position,
        role: r.role,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      };
    } catch (err) {
      console.error('[MySQL Error] findByUsername failed:', err);
      return fallbackDb.findUserByUsername(username) || null;
    }
  },

  async findById(id: string): Promise<User | null> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) {
      const user = fallbackDb.getUsers().find(u => u.id === id);
      return user || null;
    }

    try {
      const [rows] = await pool.query<any[]>(
        'SELECT id, username, password_hash, full_name, position, role, status, created_at FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      if (!rows.length) return null;
      const r = rows[0];
      return {
        id: r.id,
        username: r.username,
        passwordHash: r.password_hash,
        fullName: r.full_name,
        position: r.position,
        role: r.role,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      };
    } catch (err) {
      console.error('[MySQL Error] findById failed:', err);
      const user = fallbackDb.getUsers().find(u => u.id === id);
      return user || null;
    }
  },

  async save(user: User): Promise<User> {
    return this.create(user);
  },

  async create(user: User): Promise<User> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) {
      fallbackDb.addUser(user);
      return user;
    }

    try {
      await pool.query(
        `INSERT INTO users (id, username, password_hash, full_name, position, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name),
           position = VALUES(position),
           role = VALUES(role),
           status = VALUES(status),
           password_hash = VALUES(password_hash)`,
        [
          user.id,
          user.username.toLowerCase().trim(),
          user.passwordHash,
          user.fullName.trim(),
          user.position || 'เจ้าหน้าที่การเงินและบัญชี',
          user.role || 'USER',
          user.status || 'PENDING',
          user.createdAt || new Date(),
        ]
      );
      return user;
    } catch (err) {
      console.error('[MySQL Error] create user failed:', err);
      fallbackDb.addUser(user);
      return user;
    }
  },

  async update(id: string, updates: Partial<User>): Promise<boolean> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return false;

    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.fullName !== undefined) {
        fields.push('full_name = ?');
        values.push(updates.fullName);
      }
      if (updates.position !== undefined) {
        fields.push('position = ?');
        values.push(updates.position);
      }
      if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.passwordHash !== undefined) {
        fields.push('password_hash = ?');
        values.push(updates.passwordHash);
      }

      if (!fields.length) return true;
      values.push(id);

      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      return true;
    } catch (err) {
      console.error('[MySQL Error] update user failed:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return false;

    try {
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (err) {
      console.error('[MySQL Error] delete user failed:', err);
      return false;
    }
  },
};

// ============================================================================
// 2. Cheques Database Service
// ============================================================================
export const mysqlCheques = {
  async getAll(filter?: { fiscalYear?: number; status?: string; search?: string }): Promise<Cheque[]> {
    if (!isMysqlConnected) await testConnection();
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

      const [rows] = await pool.query<any[]>(query, params);

      // Fetch items for all cheques
      const [itemsRows] = await pool.query<any[]>(
        'SELECT * FROM cheque_items'
      );

      const itemsMap = new Map<string, ChequeItem[]>();
      itemsRows.forEach((it: any) => {
        const arr = itemsMap.get(it.cheque_id) || [];
        arr.push({
          id: it.id,
          description: it.description,
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
        stubPayeeName: r.stub_payee_name,
        chequePayeeName: r.cheque_payee_name,
        dikaNumber: r.dika_number || '',
        bankAccountNo: r.bank_account_no || '',
        items: itemsMap.get(r.id) || [],
        totalAmount: Number(r.total_amount),
        totalAmountThaiText: r.total_amount_thai_text,
        withholdingTaxPercent: Number(r.withholding_tax_percent || 0),
        withholdingTaxAmount: Number(r.withholding_tax_amount || 0),
        netPaidAmount: Number(r.net_paid_amount),
        memo: r.memo || '',
        status: r.status,
        voidReason: r.void_reason || undefined,
        voidAt: r.void_at ? new Date(r.void_at).toISOString() : undefined,
        voidBy: r.void_by || undefined,
        createdBy: r.created_by,
        createdByUsername: r.created_by_username,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedBy: r.updated_by || undefined,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        printCount: Number(r.print_count || 0),
        lastPrintedAt: r.last_printed_at ? new Date(r.last_printed_at).toISOString() : undefined,
        lastPrintedBy: r.last_printed_by || undefined,
        lastBankType: r.last_bank_type || 'KTB',
      }));
    } catch (err) {
      console.error('[MySQL Error] getAll cheques failed:', err);
      return fallbackDb.getCheques(filter);
    }
  },

  async getById(id: string): Promise<Cheque | null> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.getChequeById(id) || null;

    try {
      const [rows] = await pool.query<any[]>('SELECT * FROM cheques WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return null;
      const r = rows[0];

      const [itemsRows] = await pool.query<any[]>('SELECT * FROM cheque_items WHERE cheque_id = ?', [id]);
      const items: ChequeItem[] = itemsRows.map((it: any) => ({
        id: it.id,
        description: it.description,
        amount: Number(it.amount),
      }));

      return {
        id: r.id,
        chequeNumber: r.cheque_number || '',
        stubDate: r.stub_date ? new Date(r.stub_date).toISOString().slice(0, 10) : '',
        chequeDate: r.cheque_date ? new Date(r.cheque_date).toISOString().slice(0, 10) : '',
        fiscalYear: Number(r.fiscal_year),
        stubPayeeName: r.stub_payee_name,
        chequePayeeName: r.cheque_payee_name,
        dikaNumber: r.dika_number || '',
        bankAccountNo: r.bank_account_no || '',
        items,
        totalAmount: Number(r.total_amount),
        totalAmountThaiText: r.total_amount_thai_text,
        withholdingTaxPercent: Number(r.withholding_tax_percent || 0),
        withholdingTaxAmount: Number(r.withholding_tax_amount || 0),
        netPaidAmount: Number(r.net_paid_amount),
        memo: r.memo || '',
        status: r.status,
        voidReason: r.void_reason || undefined,
        voidAt: r.void_at ? new Date(r.void_at).toISOString() : undefined,
        voidBy: r.void_by || undefined,
        createdBy: r.created_by,
        createdByUsername: r.created_by_username,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedBy: r.updated_by || undefined,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        printCount: Number(r.print_count || 0),
        lastPrintedAt: r.last_printed_at ? new Date(r.last_printed_at).toISOString() : undefined,
        lastPrintedBy: r.last_printed_by || undefined,
        lastBankType: r.last_bank_type || 'KTB',
      };
    } catch (err) {
      console.error('[MySQL Error] getById cheque failed:', err);
      return fallbackDb.getChequeById(id) || null;
    }
  },

  async save(cheque: Cheque): Promise<Cheque> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) {
      return fallbackDb.saveCheque(cheque, cheque.createdBy);
    }

    try {
      const now = new Date();
      await pool.query(
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
          cheque.id,
          cheque.chequeNumber || null,
          cheque.stubDate || new Date().toISOString().slice(0, 10),
          cheque.chequeDate || cheque.stubDate || new Date().toISOString().slice(0, 10),
          cheque.fiscalYear,
          cheque.stubPayeeName || cheque.chequePayeeName,
          cheque.chequePayeeName,
          cheque.dikaNumber || null,
          cheque.bankAccountNo || null,
          cheque.totalAmount || 0,
          cheque.totalAmountThaiText || '',
          cheque.withholdingTaxPercent || 0,
          cheque.withholdingTaxAmount || 0,
          cheque.netPaidAmount || cheque.totalAmount || 0,
          cheque.memo || null,
          cheque.status || 'PENDING',
          cheque.createdBy,
          cheque.createdByUsername || 'admin',
          cheque.createdAt ? new Date(cheque.createdAt) : now,
          cheque.printCount || 0,
          cheque.lastPrintedAt ? new Date(cheque.lastPrintedAt) : null,
          cheque.lastPrintedBy || null,
          cheque.lastBankType || 'KTB',
        ]
      );

      // Re-insert items
      await pool.query('DELETE FROM cheque_items WHERE cheque_id = ?', [cheque.id]);
      if (cheque.items && cheque.items.length) {
        for (const it of cheque.items) {
          await pool.query(
            'INSERT INTO cheque_items (id, cheque_id, description, amount) VALUES (?, ?, ?, ?)',
            [it.id, cheque.id, it.description, it.amount]
          );
        }
      }

      return cheque;
    } catch (err) {
      console.error('[MySQL Error] save cheque failed:', err);
      return fallbackDb.saveCheque(cheque, cheque.createdBy);
    }
  },

  async voidCheque(id: string, reason: string, voidBy: string): Promise<boolean> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) {
      return !!fallbackDb.voidCheque(id, reason, voidBy);
    }

    try {
      await pool.query(
        `UPDATE cheques SET status = 'VOID', void_reason = ?, void_at = NOW(), void_by = ? WHERE id = ?`,
        [reason, voidBy, id]
      );
      return true;
    } catch (err) {
      console.error('[MySQL Error] void cheque failed:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.deleteCheque(id);

    try {
      await pool.query('DELETE FROM cheques WHERE id = ?', [id]);
      return true;
    } catch (err) {
      console.error('[MySQL Error] delete cheque failed:', err);
      return false;
    }
  },
};

// ============================================================================
// 3. Bank Templates Database Service
// ============================================================================
export const mysqlTemplates = {
  async getAll(): Promise<Record<BankType, BankTemplateConfig>> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.getTemplates();

    try {
      const [rows] = await pool.query<any[]>('SELECT * FROM bank_templates');
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
    } catch (err) {
      console.error('[MySQL Error] getAll templates failed:', err);
      return fallbackDb.getTemplates();
    }
  },

  async save(templateOrBankType: BankTemplateConfig | BankType, maybeTemplate?: BankTemplateConfig): Promise<boolean> {
    const template: BankTemplateConfig = maybeTemplate || (templateOrBankType as BankTemplateConfig);
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) {
      fallbackDb.saveTemplate(template, 'System');
      return true;
    }

    try {
      await pool.query(
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
      return true;
    } catch (err) {
      console.error('[MySQL Error] save template failed:', err);
      return false;
    }
  },

  async reset(): Promise<Record<BankType, BankTemplateConfig>> {
    if (!isMysqlConnected) await testConnection();
    const defaults = INITIAL_TEMPLATES;
    if (isMysqlConnected) {
      try {
        for (const key of Object.keys(defaults) as BankType[]) {
          await this.save(defaults[key]);
        }
      } catch (err) {
        console.error('[MySQL Error] reset templates failed:', err);
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
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.getPrintLogs(chequeId);

    try {
      let query = 'SELECT * FROM cheque_print_logs';
      const params: any[] = [];
      if (chequeId) {
        query += ' WHERE cheque_id = ?';
        params.push(chequeId);
      }
      query += ' ORDER BY printed_at DESC';

      const [rows] = await pool.query<any[]>(query, params);
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
    } catch (err) {
      console.error('[MySQL Error] getAll print logs failed:', err);
      return fallbackDb.getPrintLogs(chequeId);
    }
  },

  async add(log: ChequePrintLog): Promise<ChequePrintLog> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.addPrintLog(log);

    try {
      await pool.query(
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
      await pool.query(
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

      return log;
    } catch (err) {
      console.error('[MySQL Error] add print log failed:', err);
      return fallbackDb.addPrintLog(log);
    }
  },
};

// ============================================================================
// 5. Audit Logs Database Service
// ============================================================================
export const mysqlAuditLogs = {
  async getAll(): Promise<AuditLog[]> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) return fallbackDb.getAuditLogs();

    try {
      const [rows] = await pool.query<any[]>(
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
    } catch (err) {
      console.error('[MySQL Error] getAll audit logs failed:', err);
      return fallbackDb.getAuditLogs();
    }
  },

  async add(log: AuditLog): Promise<AuditLog> {
    if (!isMysqlConnected) await testConnection();
    if (!isMysqlConnected) {
      fallbackDb.addAuditLog(log);
      return log;
    }

    try {
      await pool.query(
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
      return log;
    } catch (err) {
      console.error('[MySQL Error] add audit log failed:', err);
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
      const [uRows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM users');
      const [cRows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM cheques');
      const [iRows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM cheque_items');
      const [pRows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM cheque_print_logs');
      const [aRows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM audit_logs');
      const [tRows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM bank_templates');

      counts = {
        users: uRows[0]?.cnt || 0,
        cheques: cRows[0]?.cnt || 0,
        chequeItems: iRows[0]?.cnt || 0,
        printLogs: pRows[0]?.cnt || 0,
        auditLogs: aRows[0]?.cnt || 0,
        templates: tRows[0]?.cnt || 0,
      };
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
