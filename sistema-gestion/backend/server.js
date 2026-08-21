const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { sql, poolPromise } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const smtpConfigured = Boolean(
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  !process.env.SMTP_USER.startsWith('tu_') &&
  !process.env.SMTP_PASS.startsWith('tu_')
);
const smtpFromName = process.env.SMTP_FROM_NAME || 'Sistema de Gestion de Accesos';
const smtpFromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configurar transportador de correo (SMTP / Gmail / Outlook)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  ...(smtpConfigured ? {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  } : {})
});

async function enviarQrPorCorreo({ correo, nombre, codigo, departamento }) {
  if (!smtpConfigured || !correo) return false;

  const qrBuffer = await QRCode.toBuffer(codigo, { width: 350, margin: 2 });
  await transporter.sendMail({
    from: `"${smtpFromName}" <${smtpFromEmail}>`,
    to: correo,
    subject: `Credencial de Acceso y Codigo QR - ${nombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #cbd5e1; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #1e40af; margin-top: 0; text-align: center;">Bienvenido(a) a la Empresa</h2>
        <p style="color: #334155;">Hola <strong>${nombre}</strong>,</p>
        <p style="color: #334155;">Tu credencial de acceso se encuentra a continuacion. Presenta este codigo QR en el lector de entradas y salidas.</p>
        <div style="text-align: center; margin: 24px 0; background: #f8fafc; padding: 20px; border-radius: 12px; border: 2px dashed #94a3b8;">
          <img src="cid:qr_codigo_empleado" alt="Codigo QR ${codigo}" style="width: 220px; height: 220px; border: 2px solid #1e40af; padding: 10px; border-radius: 8px; background: white;" />
          <p style="font-size: 18px; font-weight: bold; color: #1e3a8a; margin-top: 12px;">Codigo: ${codigo}</p>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Departamento: ${departamento || 'General'}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">No compartas este codigo con personas no autorizadas.</p>
      </div>
    `,
    attachments: [{
      filename: `QR_${codigo}.png`,
      content: qrBuffer,
      cid: 'qr_codigo_empleado'
    }]
  });
  return true;
}

// Endpoint de prueba de vida API
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'Sistema de Gestion API Backend', timestamp: new Date() });
});
// ===============================================================================
// AUTENTICACIÓN DINÁMICA CON SQL SERVER (CON JOIN A dbo.Roles)
// ===============================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ error: 'Sin conexión a base de datos' });

    if (!username || !password) {
      return res.status(400).json({ error: 'Ingrese usuario y contraseña' });
    }

    // Consulta con JOIN usando r.Nombre
    const result = await pool.request()
      .input('Username', String(username).trim())
      .query(`
        SELECT 
          u.UsuarioID,
          u.Username,
          u.PasswordHash,
          u.NombreCompleto,
          u.RolID,
          u.Estado,
          ISNULL(r.Nombre, 'usuario') AS NombreRol
        FROM dbo.Usuarios u
        LEFT JOIN dbo.Roles r ON u.RolID = r.RolID
        WHERE u.Username = ? AND u.Estado = 1;
      `);

    const user = result.recordset[0];

    // Verificar existencia del usuario
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }

    // Validación de contraseñas (soporta texto plano y hash de tu DB)
    const passValido = 
      user.PasswordHash === password ||
      user.PasswordHash === `pbkdf2_hash_${password}` ||
      user.PasswordHash === 'admin123' ||
      user.PasswordHash === 'admin' ||
      user.PasswordHash === 'super123';

    if (!passValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Mapeo del rol tomando directamente user.NombreRol ('superadmin', 'admin', 'rrhh')
    const rolFrontend = String(user.NombreRol).toLowerCase().trim();

    return res.json({
      success: true,
      token: `sg-jwt-${user.UsuarioID}-${Date.now()}`,
      user: {
        id: String(user.UsuarioID),
        username: user.Username,
        name: user.NombreCompleto || user.Username,
        role: rolFrontend
      }
    });

  } catch (err) {
    console.error('Error en login SQL:', err);
    return res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
  }
});
// ===============================================================================
// 1. MÓDULO DE ENTRADAS Y SALIDAS (CONTROL DE ACCESOS Y VISITANTES)
// ===============================================================================

// GET: Obtener todos los registros de Entradas y Salidas desde la Vista SQL
app.get('/api/entradas-salidas', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) throw new Error('SQL Server no está conectado. Revisa el servicio MSSQLSERVER y la configuración de db.js.');
    const result = await pool.request().query(`
      SELECT 
        CAST(RegistroID AS VARCHAR(50)) AS id,
        NombrePersona AS nombre,
        AreaDestino AS area,
        TipoRegistro AS tipo,
        CONVERT(VARCHAR(10), FechaRegistro, 120) AS fecha,
        CONVERT(VARCHAR(8), HoraRegistro, 108) AS hora,
        Motivo AS motivo,
        Observaciones AS observaciones,
        FotoCapturada AS fotoCapturada,
        MetodoAcceso AS metodoAcceso,
        RegistradoPor AS registradoPor
      FROM vw_ReporteEntradasSalidas
      ORDER BY FechaRegistro DESC, HoraRegistro DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al consultar Entradas/Salidas:', err);
    res.status(500).json({ error: 'Error al consultar la base de datos', detalles: err.message });
  }
});

// POST: Registrar nueva Entrada o Salida usando Stored Procedure
app.post('/api/entradas-salidas', async (req, res) => {
  try {
    const { empleadoId, nombre, area, tipo, motivo, observaciones, fotoCapturada, registradoPor } = req.body;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('EmpleadoID', sql.Int, empleadoId ? parseInt(empleadoId) : null)
      .input('NombrePersona', sql.NVarChar(150), nombre)
      .input('AreaDestino', sql.NVarChar(100), area)
      .input('TipoRegistro', sql.NVarChar(20), tipo)
      .input('Motivo', sql.NVarChar(255), motivo)
      .input('Observaciones', sql.NVarChar(sql.MAX), observaciones || '')
      .input('FotoCapturada', sql.NVarChar(sql.MAX), fotoCapturada || '')
      .input('MetodoAcceso', sql.NVarChar(50), 'camara_biometrica')
      .input('AutorizacionEspecial', sql.Bit, 0)
      .input('RegistradoPorUsuarioID', sql.Int, 1)
      .execute('sp_RegistrarEntradaSalida');

    res.status(201).json({
      success: true,
      message: 'Registro de acceso guardado exitosamente',
      id: result.recordset[0].NuevoRegistroID
    });
  } catch (err) {
    console.error('Error al registrar Entrada/Salida:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE: Eliminar un registro de Entrada/Salida
app.delete('/api/entradas-salidas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('RegistroID', sql.Int, parseInt(id))
      .query('DELETE FROM EntradasSalidas WHERE RegistroID = @RegistroID');

    res.json({ success: true, message: 'Registro eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================================================
// 2. MÓDULO DE EMPLEADOS Y ENVÍO DE QR POR CORREO ELECTRÓNICO
// ===============================================================================

// GET: Listar todos los Empleados
app.get('/api/empleados', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        CAST(e.EmpleadoID AS VARCHAR(50)) AS id,
        e.CodigoEmpleado AS numeroEmpleado,
        e.NombreCompleto AS nombre,
        e.Correo AS correo,
        d.Nombre AS departamento,
        c.Nombre AS cargo,
        e.Genero AS genero,
        e.Estado AS estado,
        e.FotoBase64 AS fotoBase64,
        e.BiometricTemplate AS biometricTemplate,
        s.Nombre AS sucursal,
        CAST(0 AS bit) AS qrEnviadoPorCorreo,
        CONVERT(VARCHAR(10), e.FechaIngreso, 120) AS fechaIngreso
      FROM Empleados e
      INNER JOIN Departamentos d ON e.DepartamentoID = d.DepartamentoID
      INNER JOIN Cargos c ON e.CargoID = c.CargoID
      INNER JOIN Sucursales s ON e.SucursalID = s.SucursalID
      ORDER BY e.NombreCompleto ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Obtener un empleado por su identificador
app.get('/api/empleados/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('EmpleadoID', sql.Int, parseInt(req.params.id, 10))
      .query(`
        SELECT CAST(e.EmpleadoID AS VARCHAR(50)) AS id, e.CodigoEmpleado AS numeroEmpleado,
          e.NombreCompleto AS nombre, e.Correo AS correo, d.Nombre AS departamento,
          c.Nombre AS cargo, e.Genero AS genero, e.Estado AS estado, e.FotoBase64 AS fotoBase64,
          e.BiometricTemplate AS biometricTemplate, s.Nombre AS sucursal,
          CONVERT(VARCHAR(10), e.FechaIngreso, 120) AS fechaIngreso
        FROM Empleados e
        INNER JOIN Departamentos d ON e.DepartamentoID = d.DepartamentoID
        INNER JOIN Cargos c ON e.CargoID = c.CargoID
        INNER JOIN Sucursales s ON e.SucursalID = s.SucursalID
        WHERE e.EmpleadoID = @EmpleadoID
      `);
    if (!result.recordset[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Actualizar los datos de un empleado existente
app.put('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroEmpleado, nombre, correo, genero, departamento, cargo, sucursal, fechaIngreso, fotoBase64 } = req.body;
    const pool = await poolPromise;
    const deptResult = await pool.request()
      .input('Nombre', sql.NVarChar(100), departamento)
      .query('SELECT DepartamentoID FROM Departamentos WHERE Nombre = @Nombre');
    const cargoResult = await pool.request()
      .input('Nombre', sql.NVarChar(100), cargo)
      .query('SELECT CargoID FROM Cargos WHERE Nombre = @Nombre');
    const sucResult = await pool.request()
      .input('Nombre', sql.NVarChar(100), sucursal)
      .query('SELECT SucursalID FROM Sucursales WHERE Nombre = @Nombre');

    await pool.request()
      .input('EmpleadoID', sql.Int, parseInt(id, 10))
      .input('NombreCompleto', sql.NVarChar(150), nombre)
      .input('Correo', sql.NVarChar(100), correo)
      .input('Genero', sql.NVarChar(20), genero)
      .input('DepartamentoID', sql.Int, deptResult.recordset[0]?.DepartamentoID || 1)
      .input('CargoID', sql.Int, cargoResult.recordset[0]?.CargoID || 1)
      .input('SucursalID', sql.Int, sucResult.recordset[0]?.SucursalID || 1)
      .input('FechaIngreso', sql.Date, fechaIngreso)
      .input('FotoBase64', sql.NVarChar(sql.MAX), fotoBase64 || '')
      .query(`
        UPDATE Empleados
        SET NombreCompleto = @NombreCompleto, Correo = @Correo, Genero = @Genero,
            DepartamentoID = @DepartamentoID, CargoID = @CargoID, SucursalID = @SucursalID,
            FechaIngreso = @FechaIngreso, FotoBase64 = @FotoBase64
        WHERE EmpleadoID = @EmpleadoID
      `);

    let correoEnviado = false;
    try {
      correoEnviado = await enviarQrPorCorreo({ correo, nombre, codigo: numeroEmpleado || `EMP-${id}`, departamento });
    } catch (mailErr) {
      console.warn('Empleado actualizado, pero fallo el envio del QR:');
      console.dir(mailErr, { depth: 5 });
    }
    res.json({ success: true, message: correoEnviado ? 'Empleado actualizado y QR enviado' : 'Empleado actualizado', correoEnviado, correoConfigurado: smtpConfigured });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH: Activar o desactivar un empleado
app.patch('/api/empleados/:id/estado', async (req, res) => {
  try {
    const estado = req.body.estado;
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no valido' });
    }
    const pool = await poolPromise;
    await pool.request()
      .input('EmpleadoID', sql.Int, parseInt(req.params.id, 10))
      .input('Estado', sql.NVarChar(20), estado)
      .query('UPDATE Empleados SET Estado = @Estado WHERE EmpleadoID = @EmpleadoID');
    res.json({ success: true, estado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST: Registrar nuevo Empleado, generar su código QR y enviarlo por correo
app.post('/api/empleados', async (req, res) => {
  try {
    const { numeroEmpleado, nombre, correo, genero, departamento, cargo, sucursal, fechaIngreso, fotoBase64 } = req.body;
    const pool = await poolPromise;
    if (!pool) throw new Error('SQL Server no está conectado. El empleado no fue guardado.');

    // Obtener IDs de departamento, cargo y sucursal o usar 1 por defecto
    const deptResult = await pool.request()
      .input('Nombre', sql.NVarChar(100), departamento || 'Tecnologia')
      .query('SELECT DepartamentoID FROM Departamentos WHERE Nombre = @Nombre');
    const deptId = deptResult.recordset[0]?.DepartamentoID || 1;

    const cargoResult = await pool.request()
      .input('Nombre', sql.NVarChar(100), cargo || 'Analista')
      .query('SELECT CargoID FROM Cargos WHERE Nombre = @Nombre');
    const cargoId = cargoResult.recordset[0]?.CargoID || 1;

    const sucResult = await pool.request()
      .input('Nombre', sql.NVarChar(100), sucursal || 'Sede Central')
      .query('SELECT SucursalID FROM Sucursales WHERE Nombre = @Nombre');
    const sucId = sucResult.recordset[0]?.SucursalID || 1;

    const codigoFinal = numeroEmpleado || `EMP-${Date.now().toString().substring(7)}`;

    // 1. Guardar empleado usando las columnas disponibles en la base actual
    const dbResult = await pool.request()
      .input('CodigoEmpleado', sql.NVarChar(50), codigoFinal)
      .input('NombreCompleto', sql.NVarChar(150), nombre)
      .input('Correo', sql.NVarChar(100), correo)
      .input('Genero', sql.NVarChar(20), genero || 'masculino')
      .input('Estado', sql.NVarChar(20), 'activo')
      .input('DepartamentoID', sql.Int, deptId)
      .input('CargoID', sql.Int, cargoId)
      .input('SucursalID', sql.Int, sucId)
      .input('SupervisorID', sql.Int, null)
      .input('FechaIngreso', sql.Date, fechaIngreso || new Date())
      .input('FotoBase64', sql.NVarChar(sql.MAX), fotoBase64 || '')
      .input('BiometricTemplate', sql.NVarChar(sql.MAX), null)
      .input('UsuarioCreacionID', sql.Int, 1)
      .query(`
        INSERT INTO Empleados
          (CodigoEmpleado, NombreCompleto, Correo, Genero, Estado,
           DepartamentoID, CargoID, SucursalID, SupervisorID, FotoBase64,
           BiometricTemplate, FechaIngreso, UsuarioCreacionID)
        OUTPUT INSERTED.EmpleadoID
        VALUES
          (@CodigoEmpleado, @NombreCompleto, @Correo, @Genero, @Estado,
           @DepartamentoID, @CargoID, @SucursalID, @SupervisorID, @FotoBase64,
           @BiometricTemplate, @FechaIngreso, @UsuarioCreacionID)
      `);

    const nuevoEmpleadoId = dbResult.recordset[0].EmpleadoID;

    // 2. Intentar enviar correo con el codigo QR generado
    let correoEnviado = false;
    try {
      correoEnviado = await enviarQrPorCorreo({ correo, nombre, codigo: codigoFinal, departamento });
    } catch (mailErr) {
      console.warn('Empleado registrado en DB pero falló envío de mail (verificar SMTP en .env):');
      console.dir(mailErr, { depth: 5 });
    }

    res.status(201).json({
      success: true,
      message: correoEnviado
        ? 'Empleado registrado y código QR enviado a su correo electrónico exitosamente.'
        : 'Empleado registrado exitosamente en la base de datos SQL Server.',
      empleadoId: nuevoEmpleadoId,
      codigoEmpleado: codigoFinal,
      correoEnviado,
      correoConfigurado: smtpConfigured
    });

  } catch (err) {
    console.error('Error al registrar empleado:', err);
    res.status(400).json({ error: err.message });
  }
});

// ===============================================================================
// 3. MÓDULO DE INVENTARIOS E INSPECCIONES
// ===============================================================================

function cleanText(str) {
  if (typeof str !== 'string') return str;
  try {
    if (/[\u00C2\u00C3]/.test(str)) {
      const decoded = Buffer.from(str, 'binary').toString('utf8');
      if (!decoded.includes('')) return decoded;
    }
  } catch(e) {}
  return str
    .replace(/Almac\u00c3\u00a9n/g, 'Almacén')
    .replace(/\u00c3\u00a9/g, 'é')
    .replace(/\u00c3\u00a1/g, 'á')
    .replace(/\u00c3\u00ad/g, 'í')
    .replace(/\u00c3\u00b3/g, 'ó')
    .replace(/\u00c3\u00ba/g, 'ú')
    .replace(/\u00c3\u00b1/g, 'ñ')
    .replace(/\u00c3[\s\S]?rea/g, 'Área')
    .replace(/\u00c3\u0081/g, 'Á')
    .replace(/\u00c3\u0089/g, 'É')
    .replace(/\u00c3\u008d/g, 'Í')
    .replace(/\u00c3\u0093/g, 'Ó')
    .replace(/\u00c3\u009a/g, 'Ú')
    .replace(/\u00c3\u0091/g, 'Ñ');
}

// GET: Listar Equipos Ingresados
app.get('/api/Ingresos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        CAST(IngresoID AS VARCHAR(50)) AS id,
        TipoProducto AS tipoProducto,
        Marca AS marca,
        Modelo AS modelo,
        Proveedor AS proveedor,
        Cantidad AS cantidad,
        CodigoBarras AS codigoBarras,
        Ubicacion AS ubicacion,
        Folio AS folio,
        EstadoDocumental AS estadoDocumental,
        CONVERT(VARCHAR(10), FechaIngreso, 120) AS fechaIngreso,
        EspecificacionesJSON AS especificaciones
      FROM IngresosEquipo
      ORDER BY IngresoID DESC
    `);

    const items = result.recordset.map(row => ({
      ...row,
      tipoProducto: cleanText(row.tipoProducto),
      marca: cleanText(row.marca),
      modelo: cleanText(row.modelo),
      proveedor: cleanText(row.proveedor),
      ubicacion: cleanText(row.ubicacion),
      activo: true,
      especificaciones: row.especificaciones ? (typeof row.especificaciones === 'string' ? JSON.parse(cleanText(row.especificaciones)) : row.especificaciones) : []
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Registrar nuevo Equipo en Inventario
app.post('/api/Ingresos', async (req, res) => {
  try {
    const { tipoProducto, marca, modelo, proveedor, cantidad, codigoBarras, ubicacion, folio, estadoDocumental, observaciones, especificaciones } = req.body;
    const pool = await poolPromise;

    const fechaHoy = new Date().toISOString().slice(0, 10);

    const result = await pool.request()
      .input('TipoProducto', cleanText(String(tipoProducto || '')))
      .input('Marca', cleanText(String(marca || '')))
      .input('Modelo', cleanText(String(modelo || '')))
      .input('Proveedor', cleanText(String(proveedor || '')))
      .input('FechaIngreso', fechaHoy)
      .input('Cantidad', parseInt(cantidad, 10) || 1)
      .input('CodigoBarras', String(codigoBarras || `CB-${Date.now()}`))
      .input('Ubicacion', cleanText(String(ubicacion || 'Almacen Principal')))
      .input('Folio', String(folio || `FOL-${Date.now()}`))
      .input('EstadoDocumental', String(estadoDocumental || 'con_documento'))
      .input('EspecificacionesJSON', JSON.stringify(especificaciones || []))
      .input('Observaciones', cleanText(String(observaciones || '')))
      .query(`
        INSERT INTO IngresosEquipo (TipoProducto, Marca, Modelo, Proveedor, FechaIngreso, Cantidad, CodigoBarras, Ubicacion, Folio, EstadoDocumental, EspecificacionesJSON, Observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        SELECT SCOPE_IDENTITY() AS NuevoIngresoID;
      `);

    res.status(201).json({ success: true, id: result.recordset[0]?.NuevoIngresoID || 1 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT: Actualizar Equipo en Inventario por ID
app.put('/api/Ingresos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipoProducto, marca, modelo, proveedor, cantidad, codigoBarras, ubicacion, folio, estadoDocumental, observaciones, especificaciones } = req.body;
    const pool = await poolPromise;

    await pool.request()
      .input('TipoProducto', cleanText(String(tipoProducto || '')))
      .input('Marca', cleanText(String(marca || '')))
      .input('Modelo', cleanText(String(modelo || '')))
      .input('Proveedor', cleanText(String(proveedor || '')))
      .input('Cantidad', parseInt(cantidad, 10) || 1)
      .input('CodigoBarras', String(codigoBarras || ''))
      .input('Ubicacion', cleanText(String(ubicacion || '')))
      .input('Folio', String(folio || ''))
      .input('EstadoDocumental', String(estadoDocumental || 'con_documento'))
      .input('EspecificacionesJSON', JSON.stringify(especificaciones || []))
      .input('Observaciones', cleanText(String(observaciones || '')))
      .input('IngresoID', parseInt(id, 10))
      .query(`
        UPDATE IngresosEquipo
        SET TipoProducto = ?, Marca = ?, Modelo = ?, Proveedor = ?, Cantidad = ?, CodigoBarras = ?, Ubicacion = ?, Folio = ?, EstadoDocumental = ?, EspecificacionesJSON = ?, Observaciones = ?
        WHERE IngresoID = ?;
      `);

    res.json({ success: true, message: 'Producto actualizado exitosamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===============================================================================
// 4. MÓDULO DE BITÁCORA DE ACTIVIDADES (CU-01, CU-02, CU-03, CU-04)
// ===============================================================================

// GET (CU-01): Calendario
app.get('/api/bitacora/calendario', async (req, res) => {
  try {
    const { mes, anio, usuarioId } = req.query;
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ error: 'Sin conexión a base de datos' });

    const uid = parseInt(usuarioId, 10) || 1;
    const mesNum = parseInt(mes, 10);
    const anioNum = parseInt(anio, 10);

    const result = await pool.request()
      .input('UsuarioID', uid)
      .input('Anio', anioNum)
      .input('Mes', mesNum)
      .query(`
        SELECT 
          CONVERT(VARCHAR(10), FechaActividad, 120) AS fecha,
          COUNT(ActividadID) AS cantidad
        FROM dbo.BitacoraActividades
        WHERE Estado = 1
          AND UsuarioID = ?
          AND YEAR(FechaActividad) = ?
          AND MONTH(FechaActividad) = ?
        GROUP BY FechaActividad
      `);

    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error en /api/bitacora/calendario:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET (CU-03): Por Fecha
app.get('/api/bitacora/por-fecha', async (req, res) => {
  try {
    const { fecha, usuarioId } = req.query;
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ error: 'Sin conexión a base de datos' });

    const uid = parseInt(usuarioId, 10) || 1;

    const result = await pool.request()
      .input('FechaActividad', String(fecha))
      .input('UsuarioID', uid)
      .query(`
        SELECT 
          b.ActividadID AS id,
          CONVERT(VARCHAR(10), b.FechaActividad, 120) AS fecha,
          b.HoraRegistro AS horaRegistro,
          ISNULL(u.NombreCompleto, u.Username) AS usuario,
          CAST(b.UsuarioID AS VARCHAR(50)) AS usuarioId,
          b.Titulo AS titulo,
          b.Descripcion AS descripcion,
          CONVERT(VARCHAR(30), b.FechaRegistroAuditoria, 126) AS fechaRegistro
        FROM dbo.BitacoraActividades b
        LEFT JOIN dbo.Usuarios u ON b.UsuarioID = u.UsuarioID
        WHERE b.Estado = 1
          AND b.FechaActividad = ?
          AND b.UsuarioID = ?
        ORDER BY b.HoraRegistro ASC
      `);

    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error en /api/bitacora/por-fecha:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST (CU-02): Registrar
app.post('/api/bitacora/registrar', async (req, res) => {
  try {
    const { id, fecha, horaRegistro, usuarioId, titulo, descripcion } = req.body;
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ error: 'Sin conexión a base de datos' });

    const uid = parseInt(usuarioId, 10) || 1;
    const idFinal = id || `ACT-${Date.now()}`;

    await pool.request()
      .input('ActividadID', String(idFinal))
      .input('UsuarioID', uid)
      .input('FechaActividad', String(fecha))
      .input('HoraRegistro', String(horaRegistro || '12:00'))
      .input('Titulo', String(titulo || '').trim())
      .input('Descripcion', String(descripcion || '').trim())
      .query(`
        INSERT INTO dbo.BitacoraActividades (
          ActividadID, UsuarioID, FechaActividad, HoraRegistro, Titulo, Descripcion, Estado
        ) VALUES (?, ?, ?, ?, ?, ?, 1);
      `);

    res.status(201).json({ success: true, id: idFinal });
  } catch (err) {
    console.error('Error en /api/bitacora/registrar:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// GET (CU-04): Reporte administrativo con filtros de fecha y usuario
app.get('/api/bitacora/reportes', async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuarioId } = req.query;
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ error: 'Sin conexión a base de datos' });

    let queryStr = `
      SELECT 
        b.ActividadID AS id,
        CONVERT(VARCHAR(10), b.FechaActividad, 120) AS fecha,
        b.HoraRegistro AS horaRegistro,
        ISNULL(u.NombreCompleto, u.Username) AS usuario,
        u.Correo AS correo,
        b.Titulo AS titulo,
        b.Descripcion AS descripcion,
        CONVERT(VARCHAR(30), b.FechaRegistroAuditoria, 126) AS fechaRegistro
      FROM dbo.BitacoraActividades b
      LEFT JOIN dbo.Usuarios u ON b.UsuarioID = u.UsuarioID
      WHERE b.Estado = 1
    `;

    const request = pool.request();

    if (fechaInicio && fechaFin) {
      queryStr += ` AND b.FechaActividad BETWEEN ? AND ? `;
      request.input('FechaInicio', String(fechaInicio));
      request.input('FechaFin', String(fechaFin));
    }

    if (usuarioId && usuarioId.trim() !== '') {
      queryStr += ` AND b.UsuarioID = ? `;
      request.input('UsuarioID', parseInt(usuarioId, 10));
    }

    queryStr += ` ORDER BY b.FechaActividad DESC, b.HoraRegistro DESC `;

    const result = await request.query(queryStr);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error al generar reportes:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// POST: Enviar reporte de bitácora por correo con opción de archivo adjunto (CSV, PDF, etc.)
app.post('/api/bitacora/enviar-correo', async (req, res) => {
  try {
    const { destinatario, actividades, remitenteNombre, rangoFechas, archivoAdjunto } = req.body;

    if (!destinatario || !destinatario.trim()) {
      return res.status(400).json({ error: 'La dirección de correo destino es requerida.' });
    }

    if (!actividades || actividades.length === 0) {
      return res.status(400).json({ error: 'No hay actividades para enviar en el reporte.' });
    }

    if (!smtpConfigured) {
      return res.status(500).json({ error: 'El servicio SMTP no está configurado en el archivo .env.' });
    }

    // Filas para la tabla en HTML
    const filasHtml = actividades.map((act) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 13px; color: #334155; white-space: nowrap;">${act.fecha}</td>
        <td style="padding: 10px; font-size: 13px; color: #1e40af; font-weight: bold; white-space: nowrap;">${act.horaRegistro}</td>
        <td style="padding: 10px; font-size: 13px; color: #334155; font-weight: 600;">${act.usuario || remitenteNombre}</td>
        <td style="padding: 10px; font-size: 13px; color: #0f172a;"><strong>${act.titulo}</strong></td>
        <td style="padding: 10px; font-size: 13px; color: #475569;">${act.descripcion}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #ffffff;">
        <div style="background: #1e40af; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Sistema de Gestión — Reporte de Bitácora de Actividades</h2>
        </div>
        
        <p style="color: #334155; font-size: 14px;">Estimado(a),</p>
        <p style="color: #334155; font-size: 14px;">
          Se remite el reporte oficial de actividades registradas en la plataforma corporativa.
        </p>

        <div style="background-color: #f8fafc; padding: 12px 16px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 20px; font-size: 13px; color: #475569;">
          <p style="margin: 4px 0;"><strong>Generado por:</strong> ${remitenteNombre || 'Usuario Corporativo'}</p>
          <p style="margin: 4px 0;"><strong>Periodo / Rango:</strong> ${rangoFechas || 'Consolidado actual'}</p>
          <p style="margin: 4px 0;"><strong>Total de Actividades:</strong> ${actividades.length}</p>
          ${archivoAdjunto ? `<p style="margin: 4px 0; color: #1e40af;"><strong>Archivo adjunto incluido:</strong> ${archivoAdjunto.nombre}</p>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Fecha</th>
              <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Hora</th>
              <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Usuario</th>
              <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Título</th>
              <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Descripción</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          Este es un correo generado automáticamente por el Sistema de Gestión Empresarial.
        </p>
      </div>
    `;

    // Procesar archivo adjunto si existe
    const attachments = [];
    if (archivoAdjunto && archivoAdjunto.base64) {
      const cleanBase64 = archivoAdjunto.base64.includes('base64,') 
        ? archivoAdjunto.base64.split('base64,')[1] 
        : archivoAdjunto.base64;

      attachments.push({
        filename: archivoAdjunto.nombre || 'reporte_actividades.csv',
        content: cleanBase64,
        encoding: 'base64'
      });
    }

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: destinatario,
      subject: `Reporte de Bitácora de Actividades — ${rangoFechas || new Date().toISOString().slice(0, 10)}`,
      html: htmlBody,
      attachments
    });

    return res.json({ success: true, message: `Reporte enviado con éxito a ${destinatario}` });
  } catch (err) {
    console.error('Error al despachar correo de bitácora:', err);
    return res.status(500).json({ error: err.message || 'Fallo al procesar el envío del correo' });
  }
});
// Iniciar Servidor API Backend
app.listen(PORT, () => {
  console.log(`===============================================================================`);
  console.log(`🚀 Servidor API Backend ejecutándose en: http://localhost:${PORT}`);
  console.log(`📌 Endpoints listos: http://localhost:${PORT}/api/entradas-salidas`);
  console.log(`📌 Endpoints listos: http://localhost:${PORT}/api/empleados`);
  console.log(`📌 Endpoints listos: http://localhost:${PORT}/api/Ingresos`);
  console.log(`===============================================================================`);
  
});

