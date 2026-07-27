// const mysql2 = require('mysql2/promise');
// require('dotenv').config();

// const pool = mysql2.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'pengaduan_tb',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// // Test connection
// pool.getConnection()
//   .then(conn => {
//     console.log('✅ Database connected successfully');
//     conn.release();
//   })
//   .catch(err => {
//     console.error('❌ Database connection failed:');
//     console.error('Code:', err.code);
//     console.error('Errno:', err.errno);
//     console.error('Message:', err.message);
//     console.error('Full error:', err);
//   });

// module.exports = pool;

const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const fs = require("fs");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    ca: fs.readFileSync("./certs/isrgrootx1.pem"),
  },
});

module.exports = pool;