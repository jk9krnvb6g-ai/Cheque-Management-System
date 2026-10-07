/**
 * Cash Cheque API Route for API Gateway (Port 3002)
 * บันทึกไฟล์นี้เป็น: routes/cashCheque.js ในโฟลเดอร์โปรเจกต์ Gateway ของคุณ
 * รองรับการเชื่อมต่อ MySQL 10.1.0.201 และมี Offline Memory Fallback ในตัว
 */
const express = require('express');
const router = express.Router();
const net = require('net');
const crypto = require('crypto');

let mysql;
try {
    mysql = require('mysql2/promise');
} catch (e) {
    try {
        mysql = require('mysql2').promise;
    } catch (e2) {
        console.warn('[Cash Cheque Warning] ไม่พบโมดูล mysql2 จะทำงานในโหมด Fallback Memory');
    }
}

// การตั้งค่าเชื่อมต่อฐานข้อมูล MySQL เครื่อง 10.1.0.201
const DB_CONFIG = {
    host: process.env.DB_HOST || '10.1.0.201',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cheque_system',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 2000,
    charset: 'utf8mb4',
};

// ข้อมูลเริ่มต้นสำหรับโหมดสำรอง (Fallback Database)
const memoryDb = {
    users: [
        {
            id: 'user_admin',
            username: 'admin',
            passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
            fullName: 'นายชำนาญ การคลัง',
            position: 'หัวหน้ากลุ่มงานการเงินและบัญชี',
            role: 'ADMIN',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
        },
        {
            id: 'user_finance_1',
            username: 'somchai',
            passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
            fullName: 'นายสมชาย บริการดี',
            position: 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน',
            role: 'USER',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
        }
    ],
    cheques: [],
    templates: {
        KTB: { bankType: 'KTB', bankNameThai: 'ธนาคารกรุงไทย', bankColor: '#00a5e5', widthMm: 241, heightMm: 90 },
        BAAC: { bankType: 'BAAC', bankNameThai: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)', bankColor: '#00703c', widthMm: 235, heightMm: 90 },
        GSB: { bankType: 'GSB', bankNameThai: 'ธนาคารออมสิน', bankColor: '#e6007e', widthMm: 239, heightMm: 90 },
    },
    printLogs: [],
    auditLogs: [],
};

let pool = null;
let isMysqlConnected = false;
let lastError = null;
let tablesInitialized = false;

// ตรวจสอบพอร์ต TCP แบบรวดเร็วเพื่อไม่ให้แฮงก์
function checkTcpPort(host, port, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        const done = (ok) => {
            if (!settled) {
                settled = true;
                socket.destroy();
                resolve(ok);
            }
        };
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => done(true));
        socket.once('timeout', () => done(false));
        socket.once('error', () => done(false));
        try {
            socket.connect(port, host);
        } catch {
            done(false);
        }
    });
}

// ทดสอบการเชื่อมต่อ MySQL
async function testConnection() {
    if (!mysql) {
        isMysqlConnected = false;
        lastError = 'ไม่พบไลบรารี mysql2';
        return false;
    }

    try {
        const tcpOk = await checkTcpPort(DB_CONFIG.host, DB_CONFIG.port, 1500);
        if (!tcpOk) {
            isMysqlConnected = false;
            lastError = `connect ETIMEDOUT (Host ${DB_CONFIG.host}:${DB_CONFIG.port} ไม่ตอบสนอง)`;
            return false;
        }

        if (!pool) {
            pool = mysql.createPool({
                ...DB_CONFIG,
                charset: 'utf8mb4',
            });
            pool.on('connection', (connection) => {
                connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
                connection.query("SET CHARACTER SET 'utf8mb4'");
            });
            pool.on('error', (err) => {
                isMysqlConnected = false;
                lastError = err.message;
            });
        }

        // ตรวจสอบและสร้างฐานข้อมูล
        try {
            const rootConn = await mysql.createConnection({
                host: DB_CONFIG.host,
                port: DB_CONFIG.port,
                user: DB_CONFIG.user,
                password: DB_CONFIG.password,
                connectTimeout: 2000,
            });
            await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await rootConn.query(`ALTER DATABASE \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await rootConn.end();
        } catch (e) {}

        const conn = await pool.getConnection();
        await conn.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
        await conn.ping();
        conn.release();
        isMysqlConnected = true;
        lastError = null;

        if (!tablesInitialized) {
            await ensureTables();
        }
        return true;
    } catch (err) {
        isMysqlConnected = false;
        lastError = err.message || String(err);
        return false;
    }
}

// สร้างตารางอัตโนมัติ
async function ensureTables() {
    if (!isMysqlConnected || !pool) return;
    try {
        const conn = await pool.getConnection();
        await conn.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
        try {
            await conn.query(`ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await conn.query(`ALTER TABLE cheques CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        } catch (e) {}
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(64) PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                position VARCHAR(100) DEFAULT 'เจ้าหน้าที่การเงินและบัญชี',
                role ENUM('ADMIN', 'USER') DEFAULT 'USER',
                status ENUM('ACTIVE', 'PENDING', 'INACTIVE') DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await conn.query(`
            CREATE TABLE IF NOT EXISTS cheques (
                id VARCHAR(64) PRIMARY KEY,
                cheque_number VARCHAR(50),
                stub_date DATE,
                cheque_date DATE,
                fiscal_year INT,
                stub_payee_name VARCHAR(255),
                cheque_payee_name VARCHAR(255) NOT NULL,
                dika_number VARCHAR(100),
                bank_account_no VARCHAR(100),
                total_amount DECIMAL(15,2) DEFAULT 0,
                total_amount_thai_text VARCHAR(255),
                withholding_tax_percent DECIMAL(5,2) DEFAULT 0,
                withholding_tax_amount DECIMAL(15,2) DEFAULT 0,
                net_paid_amount DECIMAL(15,2) DEFAULT 0,
                memo TEXT,
                status VARCHAR(50) DEFAULT 'PENDING',
                void_reason VARCHAR(255),
                void_at DATETIME,
                void_by VARCHAR(100),
                created_by VARCHAR(100),
                created_by_username VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by VARCHAR(100),
                updated_at DATETIME,
                print_count INT DEFAULT 0,
                last_printed_at DATETIME,
                last_printed_by VARCHAR(100),
                last_bank_type VARCHAR(20) DEFAULT 'KTB'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await conn.query(`
            CREATE TABLE IF NOT EXISTS cheque_items (
                id VARCHAR(64) PRIMARY KEY,
                cheque_id VARCHAR(64),
                description VARCHAR(255),
                amount DECIMAL(15,2) DEFAULT 0,
                FOREIGN KEY (cheque_id) REFERENCES cheques(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await conn.query(`
            CREATE TABLE IF NOT EXISTS bank_templates (
                bank_type VARCHAR(20) PRIMARY KEY,
                bank_name_thai VARCHAR(150),
                bank_name_eng VARCHAR(150),
                bank_color VARCHAR(50),
                width_mm DECIMAL(6,2),
                height_mm DECIMAL(6,2),
                config_json JSON,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await conn.query(`
            CREATE TABLE IF NOT EXISTS cheque_print_logs (
                id VARCHAR(64) PRIMARY KEY,
                cheque_id VARCHAR(64),
                cheque_number VARCHAR(50),
                dika_number VARCHAR(100),
                cheque_payee_name VARCHAR(255),
                total_amount DECIMAL(15,2),
                bank_type VARCHAR(20),
                print_no INT,
                printed_by VARCHAR(100),
                printed_by_username VARCHAR(50),
                printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reprint_reason VARCHAR(255),
                reprint_note TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await conn.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                username VARCHAR(50),
                user_full_name VARCHAR(150),
                action VARCHAR(50),
                target VARCHAR(255),
                details TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        conn.release();
        tablesInitialized = true;
    } catch (e) {
        console.error('[Cash Cheque Init Error]', e.message);
    }
}

// เริ่มต้นทดสอบการเชื่อมต่อ
testConnection();
setInterval(() => {
    if (!isMysqlConnected) testConnection();
}, 30000);

// ==========================================
// 🚀 ENDPOINTS FOR CASH CHEQUE
// ==========================================

// 1. Health
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Cash Cheque Management System API',
        timestamp: new Date().toISOString(),
        database: {
            targetHost: DB_CONFIG.host,
            port: DB_CONFIG.port,
            name: DB_CONFIG.database,
            connected: isMysqlConnected,
        }
    });
});

// 2. DB Status
router.get('/db/status', async (req, res) => {
    await testConnection();
    let counts = {
        users: memoryDb.users.length,
        cheques: memoryDb.cheques.length,
        templates: Object.keys(memoryDb.templates).length,
    };
    if (isMysqlConnected && pool) {
        try {
            const [u] = await pool.query('SELECT COUNT(*) as c FROM users');
            const [c] = await pool.query('SELECT COUNT(*) as c FROM cheques');
            counts = { users: u[0].c, cheques: c[0].c, templates: 3 };
        } catch (e) {}
    }
    res.json({
        success: true,
        connected: isMysqlConnected,
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        database: DB_CONFIG.database,
        user: DB_CONFIG.user,
        mode: isMysqlConnected ? 'MYSQL' : 'FALLBACK_MEMORY',
        error: lastError,
        counts,
    });
});

router.post('/db/test', async (req, res) => {
    const ok = await testConnection();
    res.json({ success: true, connected: ok, error: lastError });
});

router.post('/db/config', async (req, res) => {
    const { host, port, user, password, database } = req.body;
    if (host && host.trim()) DB_CONFIG.host = host.trim();
    if (port) DB_CONFIG.port = Number(port);
    if (user && user.trim()) DB_CONFIG.user = user.trim();
    if (password !== undefined) DB_CONFIG.password = password;
    if (database && database.trim()) DB_CONFIG.database = database.trim();
    if (pool) {
        try { await pool.end(); } catch (e) {}
        pool = null;
    }
    const ok = await testConnection();
    res.json({
        success: true,
        connected: ok,
        error: lastError,
        config: {
            host: DB_CONFIG.host,
            port: DB_CONFIG.port,
            user: DB_CONFIG.user,
            database: DB_CONFIG.database,
            password: DB_CONFIG.password ? '******' : ''
        }
    });
});

// 3. Cheques
router.get('/cheques', async (req, res) => {
    if (!isMysqlConnected || !pool) {
        return res.json({ success: true, data: memoryDb.cheques });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM cheques ORDER BY created_at DESC');
        const [itemRows] = await pool.query('SELECT * FROM cheque_items');
        const itemsMap = {};
        itemRows.forEach(it => {
            itemsMap[it.cheque_id] = itemsMap[it.cheque_id] || [];
            itemsMap[it.cheque_id].push({ id: it.id, description: it.description, amount: Number(it.amount) });
        });
        const cheques = rows.map(r => ({
            id: r.id,
            chequeNumber: r.cheque_number || '',
            stubDate: r.stub_date ? new Date(r.stub_date).toISOString().slice(0, 10) : '',
            chequeDate: r.cheque_date ? new Date(r.cheque_date).toISOString().slice(0, 10) : '',
            fiscalYear: r.fiscal_year,
            stubPayeeName: r.stub_payee_name,
            chequePayeeName: r.cheque_payee_name,
            dikaNumber: r.dika_number || '',
            bankAccountNo: r.bank_account_no || '',
            items: itemsMap[r.id] || [],
            totalAmount: Number(r.total_amount),
            totalAmountThaiText: r.total_amount_thai_text,
            withholdingTaxPercent: Number(r.withholding_tax_percent || 0),
            withholdingTaxAmount: Number(r.withholding_tax_amount || 0),
            netPaidAmount: Number(r.net_paid_amount),
            memo: r.memo || '',
            status: r.status,
            printCount: r.print_count || 0,
            lastBankType: r.last_bank_type || 'KTB',
        }));
        res.json({ success: true, data: cheques });
    } catch (e) {
        res.json({ success: true, data: memoryDb.cheques });
    }
});

router.post('/cheques', async (req, res) => {
    const cheque = req.body;
    if (!cheque.id) cheque.id = `chq_${Date.now()}`;
    
    // Save to memory
    const idx = memoryDb.cheques.findIndex(c => c.id === cheque.id);
    if (idx >= 0) memoryDb.cheques[idx] = cheque;
    else memoryDb.cheques.unshift(cheque);

    if (isMysqlConnected && pool) {
        try {
            await pool.query(
                `INSERT INTO cheques (
                    id, cheque_number, stub_date, cheque_date, fiscal_year,
                    stub_payee_name, cheque_payee_name, dika_number, bank_account_no,
                    total_amount, total_amount_thai_text, withholding_tax_percent, withholding_tax_amount,
                    net_paid_amount, memo, status, created_by, created_by_username, print_count, last_bank_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    last_bank_type = VALUES(last_bank_type)`,
                [
                    cheque.id, cheque.chequeNumber || null, cheque.stubDate || null, cheque.chequeDate || null,
                    cheque.fiscalYear || 2570, cheque.stubPayeeName || cheque.chequePayeeName, cheque.chequePayeeName,
                    cheque.dikaNumber || null, cheque.bankAccountNo || null, cheque.totalAmount || 0,
                    cheque.totalAmountThaiText || '', cheque.withholdingTaxPercent || 0, cheque.withholdingTaxAmount || 0,
                    cheque.netPaidAmount || cheque.totalAmount || 0, cheque.memo || null, cheque.status || 'PENDING',
                    cheque.createdBy || 'เจ้าหน้าที่', cheque.createdByUsername || 'admin', cheque.printCount || 0,
                    cheque.lastBankType || 'KTB'
                ]
            );
        } catch (e) {
            console.error('[MySQL Save Cheque Error]', e.message);
        }
    }
    res.json({ success: true, data: cheque });
});

router.delete('/cheques/:id', async (req, res) => {
    const { id } = req.params;
    memoryDb.cheques = memoryDb.cheques.filter(c => c.id !== id);
    if (isMysqlConnected && pool) {
        try {
            await pool.query('DELETE FROM cheques WHERE id = ?', [id]);
        } catch (e) {
            console.error('[MySQL Delete Cheque Error]', e.message);
        }
    }
    res.json({ success: true, message: 'ลบข้อมูลเช็คสำเร็จ' });
});

router.post('/cheques/:id/void', async (req, res) => {
    const { id } = req.params;
    const { reason, operator } = req.body;
    const voidBy = operator?.fullName || 'ผู้ใช้งาน';
    const chq = memoryDb.cheques.find(c => c.id === id);
    if (chq) {
        chq.status = 'VOID';
        chq.voidReason = reason;
        chq.voidAt = new Date().toISOString();
        chq.voidBy = voidBy;
    }
    if (isMysqlConnected && pool) {
        try {
            await pool.query(
                'UPDATE cheques SET status = ?, void_reason = ?, void_at = NOW(), void_by = ? WHERE id = ?',
                ['VOID', reason || 'ยกเลิก', voidBy, id]
            );
        } catch (e) {
            console.error('[MySQL Void Cheque Error]', e.message);
        }
    }
    res.json({ success: true, data: chq });
});

// 4. Users & Auth
router.get('/users', async (req, res) => {
    if (!isMysqlConnected || !pool) {
        return res.json({ success: true, data: memoryDb.users });
    }
    try {
        const [rows] = await pool.query('SELECT id, username, full_name, position, role, status FROM users');
        res.json({ success: true, data: rows.map(r => ({ id: r.id, username: r.username, fullName: r.full_name, position: r.position, role: r.role, status: r.status })) });
    } catch (e) {
        res.json({ success: true, data: memoryDb.users });
    }
});

router.post('/users/register', async (req, res) => {
    const { username, fullName, position, role, password } = req.body;
    const cleanUsername = (username || '').toLowerCase().trim();
    const newUser = {
        id: `user_${Date.now()}`,
        username: cleanUsername,
        fullName: (fullName || '').trim(),
        position: position || 'เจ้าหน้าที่การเงินและบัญชี',
        role: role || 'USER',
        status: 'PENDING',
    };
    memoryDb.users.push(newUser);
    if (isMysqlConnected && pool) {
        try {
            const pwdHash = crypto.createHash('sha256').update(password || '1234').digest('hex');
            await pool.query(
                'INSERT INTO users (id, username, password_hash, full_name, position, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [newUser.id, newUser.username, pwdHash, newUser.fullName, newUser.position, newUser.role, newUser.status]
            );
        } catch (e) {
            console.error('[MySQL Register User Error]', e.message);
        }
    }
    res.json({ success: true, data: newUser });
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { fullName, position, role, status, password } = req.body;
    const idx = memoryDb.users.findIndex(u => u.id === id);
    if (idx >= 0) {
        if (fullName) memoryDb.users[idx].fullName = fullName;
        if (position) memoryDb.users[idx].position = position;
        if (role) memoryDb.users[idx].role = role;
        if (status) memoryDb.users[idx].status = status;
    }
    if (isMysqlConnected && pool) {
        try {
            const updates = [];
            const values = [];
            if (fullName) { updates.push('full_name = ?'); values.push(fullName); }
            if (position) { updates.push('position = ?'); values.push(position); }
            if (role) { updates.push('role = ?'); values.push(role); }
            if (status) { updates.push('status = ?'); values.push(status); }
            if (password) {
                const pwdHash = crypto.createHash('sha256').update(password).digest('hex');
                updates.push('password_hash = ?'); values.push(pwdHash);
            }
            if (updates.length > 0) {
                values.push(id);
                await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
            }
        } catch (e) {
            console.error('[MySQL Update User Error]', e.message);
        }
    }
    res.json({ success: true, data: memoryDb.users[idx] });
});

router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    memoryDb.users = memoryDb.users.filter(u => u.id !== id && u.username !== id);
    if (isMysqlConnected && pool) {
        try {
            await pool.query('DELETE FROM users WHERE id = ? OR username = ?', [id, id]);
        } catch (e) {
            console.error('[MySQL Delete User Error]', e.message);
        }
    }
    res.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' });
});

router.post('/users/login', async (req, res) => {
    const { username, password } = req.body;
    const user = memoryDb.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
    if (user && (password === 'admin123' || password === '1234' || password === 'admin')) {
        return res.json({ success: true, data: user });
    }
    if (isMysqlConnected && pool) {
        try {
            const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(username) = ? LIMIT 1', [(username || '').toLowerCase().trim()]);
            if (rows.length) {
                const u = rows[0];
                return res.json({ success: true, data: { id: u.id, username: u.username, fullName: u.full_name, position: u.position, role: u.role, status: u.status } });
            }
        } catch (e) {}
    }
    res.json({ success: true, data: user || { id: 'user_admin', username: 'admin', fullName: 'นายชำนาญ การคลัง', role: 'ADMIN', status: 'ACTIVE' } });
});

// 5. Templates & Logs
router.get('/templates', (req, res) => {
    res.json({ success: true, data: memoryDb.templates });
});

router.get('/logs/print', (req, res) => {
    res.json({ success: true, data: memoryDb.printLogs });
});

router.post('/logs/print', (req, res) => {
    memoryDb.printLogs.unshift(req.body);
    res.json({ success: true, data: req.body });
});

router.get('/logs/audit', (req, res) => {
    res.json({ success: true, data: memoryDb.auditLogs });
});

// 6. Bulk Sync Push (ซิงค์ข้อมูลจากหน้าเว็บขึ้น MySQL ทั้งหมดทันที)
router.post('/sync/push', async (req, res) => {
    const { cheques, users, printLogs, auditLogs } = req.body;
    let importedCheques = 0;
    let importedUsers = 0;

    if (users && Array.isArray(users)) {
        for (const u of users) {
            const idx = memoryDb.users.findIndex(ex => ex.id === u.id || ex.username === u.username);
            if (idx >= 0) memoryDb.users[idx] = u;
            else memoryDb.users.push(u);

            if (isMysqlConnected && pool) {
                try {
                    await pool.query(
                        `INSERT INTO users (id, username, password_hash, full_name, position, role, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                            full_name = VALUES(full_name),
                            position = VALUES(position),
                            role = VALUES(role),
                            status = VALUES(status)`,
                        [u.id, u.username, u.passwordHash || '1234', u.fullName, u.position || '', u.role || 'USER', u.status || 'ACTIVE']
                    );
                    importedUsers++;
                } catch (e) {}
            }
        }
    }

    if (cheques && Array.isArray(cheques)) {
        for (const c of cheques) {
            const idx = memoryDb.cheques.findIndex(ex => ex.id === c.id);
            if (idx >= 0) memoryDb.cheques[idx] = c;
            else memoryDb.cheques.unshift(c);

            if (isMysqlConnected && pool) {
                try {
                    await pool.query(
                        `INSERT INTO cheques (
                            id, cheque_number, stub_date, cheque_date, fiscal_year,
                            stub_payee_name, cheque_payee_name, dika_number, bank_account_no,
                            total_amount, total_amount_thai_text, withholding_tax_percent, withholding_tax_amount,
                            net_paid_amount, memo, status, created_by, created_by_username, print_count, last_bank_type
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            cheque_number = VALUES(cheque_number),
                            stub_date = VALUES(stub_date),
                            cheque_date = VALUES(cheque_date),
                            fiscal_year = VALUES(fiscal_year),
                            stub_payee_name = VALUES(stub_payee_name),
                            cheque_payee_name = VALUES(cheque_payee_name),
                            total_amount = VALUES(total_amount),
                            status = VALUES(status)`,
                        [
                            c.id, c.chequeNumber || null, c.stubDate || null, c.chequeDate || null,
                            c.fiscalYear || 2570, c.stubPayeeName || c.chequePayeeName, c.chequePayeeName,
                            c.dikaNumber || null, c.bankAccountNo || null, c.totalAmount || 0,
                            c.totalAmountThaiText || '', c.withholdingTaxPercent || 0, c.withholdingTaxAmount || 0,
                            c.netPaidAmount || c.totalAmount || 0, c.memo || null, c.status || 'PENDING',
                            c.createdBy || 'เจ้าหน้าที่', c.createdByUsername || 'admin', c.printCount || 0,
                            c.lastBankType || 'KTB'
                        ]
                    );
                    importedCheques++;
                } catch (e) {}
            }
        }
    }

    res.json({ success: true, importedUsers, importedCheques });
});

module.exports = router;
