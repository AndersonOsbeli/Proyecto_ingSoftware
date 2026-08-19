const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const useWindowsAuth = !process.env.DB_USER || process.env.DB_USER.trim() === '' || process.env.DB_USER === 'windows';

const server = process.env.DB_SERVER || 'localhost';
const database = process.env.DB_NAME || 'SistemaGestionDB';
const port = parseInt(process.env.DB_PORT || '1433');
const encrypt = process.env.DB_ENCRYPT === 'true' ? 'yes' : 'no';
const trustServerCertificate = process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' ? 'yes' : 'yes';

const config = {
  server,
  database,
  port,
  connectionString: useWindowsAuth
    ? `Driver={ODBC Driver 17 for SQL Server};Server=${server},${port};Database=${database};Trusted_Connection=yes;Encrypt=${encrypt};TrustServerCertificate=${trustServerCertificate};`
    : `Driver={ODBC Driver 17 for SQL Server};Server=${server},${port};Database=${database};Uid=${process.env.DB_USER};Pwd=${process.env.DB_PASSWORD};Encrypt=${encrypt};TrustServerCertificate=${trustServerCertificate};`
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log(`✅ Conexión exitosa a SQL Server (${config.server} - ${config.database})`);
    return pool;
  })
  .catch(err => {
    console.error('❌ Error de Conexión a SQL Server');
    console.error(`Destino: ${server},${port} | Base: ${database} | Autenticación: ${useWindowsAuth ? 'Windows' : 'SQL'}`);
    console.dir(err, { depth: 10 });
    return null;
  });

module.exports = {
  sql,
  poolPromise
};
