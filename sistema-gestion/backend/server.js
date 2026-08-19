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

// GET: Listar Equipos Ingresados
app.get('/api/Ingresos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        CAST(IngresoID AS VARCHAR(50)) AS id,
        TipoProducto AS tipoProducto,
        Cantidad AS cantidad,
        CodigoBarras AS codigoBarras,
        Ubicacion AS ubicacion,
        Activo AS activo,
        Folio AS folio,
        EstadoDocumental AS estadoDocumental,
        EspecificacionesJSON AS especificaciones,
        CONVERT(VARCHAR(10), FechaIngreso, 120) AS fechaIngreso
      FROM IngresosEquipo
      ORDER BY FechaRegistro DESC
    `);

    // Formatear JSON de especificaciones
    const items = result.recordset.map(row => ({
      ...row,
      especificaciones: row.especificaciones ? JSON.parse(row.especificaciones) : []
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Registrar nuevo Equipo en Inventario
app.post('/api/Ingresos', async (req, res) => {
  try {
    const { tipoProducto, cantidad, codigoBarras, ubicacion, folio, estadoDocumental, observaciones, especificaciones } = req.body;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('TipoProducto', sql.NVarChar(100), tipoProducto)
      .input('FechaIngreso', sql.Date, new Date())
      .input('Cantidad', sql.Int, cantidad || 1)
      .input('CodigoBarras', sql.NVarChar(100), codigoBarras || `CB-${Date.now()}`)
      .input('Ubicacion', sql.NVarChar(100), ubicacion || 'Almacen Principal')
      .input('Folio', sql.NVarChar(50), folio || `FOL-${Date.now()}`)
      .input('EstadoDocumental', sql.NVarChar(50), estadoDocumental || 'con_documento')
      .input('EspecificacionesJSON', sql.NVarChar(sql.MAX), JSON.stringify(especificaciones || []))
      .input('Observaciones', sql.NVarChar(sql.MAX), observaciones || '')
      .query(`
        INSERT INTO IngresosEquipo (TipoProducto, FechaIngreso, Cantidad, CodigoBarras, Ubicacion, Folio, EstadoDocumental, EspecificacionesJSON, Observaciones)
        VALUES (@TipoProducto, @FechaIngreso, @Cantidad, @CodigoBarras, @Ubicacion, @Folio, @EstadoDocumental, @EspecificacionesJSON, @Observaciones);
        SELECT SCOPE_IDENTITY() AS NuevoIngresoID;
      `);

    res.status(201).json({ success: true, id: result.recordset[0].NuevoIngresoID });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
