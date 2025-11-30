// testDbConnection.js
const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
    user: process.env.DB_USER,          // from .env
    password: process.env.DB_PASSWORD,  // from .env
    server: process.env.DB_SERVER,      // e.g., localhost\\SQLEXPRESS
    database: process.env.DB_NAME,      // e.g., OnBoard
    options: {
        encrypt: false,                 // disable SSL for local dev
        trustServerCertificate: true,  // accept self-signed certificate
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

(async () => {
    try {
        console.log('🔌 Attempting to connect to SQL Server...');
        const pool = await sql.connect(sqlConfig);
        console.log('✅ Connected to SQL Server successfully!');

        // Optional: run a simple query to test
        const result = await pool.request().query('SELECT TOP 5 * FROM Users');
        console.log('📝 Sample data from "members" table:');
        console.table(result.recordset);

        await pool.close();
        console.log('🔒 Connection closed.');
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
})();
