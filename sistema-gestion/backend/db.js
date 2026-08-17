const sql = require('mssql');
require('dotenv').config();

// Detectar si el usuario usa Autenticación de Windows o Usuario/Contraseña SQL
const useWindowsAuth = !process.env.DB_USER || process.env.DB_USER.trim() === '' || process.env.DB_USER === 'windows';

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SistemaGestionDB',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    trustedConnection: useWindowsAuth, // Autenticación de Windows integrada (MIKE-COTZOJAY\Mike Cotzojay)
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

// Si se especificó usuario SQL (ej. 'sa'), asignamos credenciales
if (!useWindowsAuth) {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
}

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log(`✅ Conexión exitosa a SQL Server (localhost - SistemaGestionDB)`);
    return pool;
  })
  .catch(err => {
    console.error('❌ Error de Conexión a SQL Server: ', err.message);
  });

module.exports = {
  sql,
  poolPromise
};
