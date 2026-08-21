const odbc = require('odbc');
require('dotenv').config();

const server = process.env.DB_SERVER || '(DEPINFOR20\SQLEXPRESS)';
const database = process.env.DB_NAME || 'SistemaGestion';

const connectionString = process.env.DB_CONNECTION_STRING || 
  `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`;

class OdbcRequestWrapper {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.params = [];
    this.paramMap = {};
  }

  input(name, typeOrVal, val) {
    const value = val !== undefined ? val : typeOrVal;
    this.params.push(value);
    this.paramMap[name] = value;
    return this;
  }

  async query(queryString) {
    const conn = await odbc.connect(this.connectionString);
    try {
      const result = await conn.query(queryString, this.params);
      const recordset = Array.isArray(result) ? Array.from(result) : [];
      return { recordset, rowsAffected: [result.count || recordset.length] };
    } finally {
      await conn.close();
    }
  }

  async execute(spName) {
    const placeholders = this.params.map(() => '?').join(', ');
    const conn = await odbc.connect(this.connectionString);
    try {
      const sqlCall = `EXEC ${spName} ${placeholders}`;
      const result = await conn.query(sqlCall, this.params);
      const recordset = Array.isArray(result) ? Array.from(result) : [];
      return { recordset, rowsAffected: [result.count || recordset.length] };
    } finally {
      await conn.close();
    }
  }
}

class OdbcPoolWrapper {
  constructor(connectionString) {
    this.connectionString = connectionString;
  }

  async init() {
    const conn = await odbc.connect(this.connectionString);
    console.log(`✅ Conexión exitosa a SQL Server (${database}) vía ODBC Driver 18`);
    await conn.close();
    return this;
  }

  request() {
    return new OdbcRequestWrapper(this.connectionString);
  }
}

const poolWrapper = new OdbcPoolWrapper(connectionString);
const poolPromise = poolWrapper.init().catch(err => {
  console.error(`⚠️ Error al conectar a SQL Server (${database}):`, err.message);
  return null;
});

const sql = {
  Int: 'Int',
  NVarChar: (len) => `NVarChar(${len})`,
  VarChar: (len) => `VarChar(${len})`,
  Bit: 'Bit',
  Date: 'Date',
  MAX: 'MAX'
};

module.exports = {
  sql,
  poolPromise
};
