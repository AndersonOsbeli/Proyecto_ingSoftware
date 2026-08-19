-- ===============================================================================
-- SISTEMA INTEGRAL DE GESTIÓN (ENTRADAS/SALIDAS, EMPLEADOS, INVENTARIO, AUDITORÍA)
-- SCRIPT MASTER DESDE CERO CON TABLAS, RELACIONES, TRIGGERS, PROCEDIMIENTOS ALMACENADOS Y VISTAS
-- Motor: Microsoft SQL Server (2016 o superior / Express / LocalDB / Azure SQL)
-- Archivo: tablas_sql_server.txt
-- ===============================================================================

USE master;
GO

-- 1. CREACIÓN DE LA BASE DE DATOS Y LIMPIEZA
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'SistemaGestionDB')
BEGIN
    ALTER DATABASE SistemaGestionDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SistemaGestionDB;
END
GO

CREATE DATABASE SistemaGestionDB;
GO

USE SistemaGestionDB;
GO

-- ===============================================================================
-- SECCIÓN 1: ROLES, USUARIOS Y CONFIGURACIÓN DEL SISTEMA
-- ===============================================================================

CREATE TABLE Roles (
    RolID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE, -- 'superadmin', 'admin', 'rrhh'
    Descripcion NVARCHAR(255) NULL,
    Estado BIT DEFAULT 1 NOT NULL,
    FechaCreacion DATETIME2 DEFAULT SYSDATETIME() NOT NULL
);

CREATE TABLE Usuarios (
    UsuarioID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    NombreCompleto NVARCHAR(150) NOT NULL,
    Correo NVARCHAR(100) NOT NULL UNIQUE,
    RolID INT NOT NULL,
    Estado BIT DEFAULT 1 NOT NULL,
    UltimoAcceso DATETIME2 NULL,
    FechaCreacion DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (RolID) REFERENCES Roles(RolID)
);

CREATE TABLE ConfiguracionSistema (
    ConfigID INT IDENTITY(1,1) PRIMARY KEY,
    Clave NVARCHAR(50) NOT NULL UNIQUE,
    Valor NVARCHAR(255) NOT NULL,
    Descripcion NVARCHAR(255) NULL,
    FechaModificacion DATETIME2 DEFAULT SYSDATETIME() NOT NULL
);

-- ===============================================================================
-- SECCIÓN 2: ESTRUCTURA ORGANIZACIONAL Y EMPLEADOS (CON ENVÍO DE QR POR CORREO)
-- ===============================================================================

CREATE TABLE Departamentos (
    DepartamentoID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255) NULL,
    Estado BIT DEFAULT 1 NOT NULL
);

CREATE TABLE Sucursales (
    SucursalID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    Direccion NVARCHAR(255) NULL,
    Telefono NVARCHAR(20) NULL,
    Estado BIT DEFAULT 1 NOT NULL
);

CREATE TABLE Cargos (
    CargoID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255) NULL,
    Estado BIT DEFAULT 1 NOT NULL
);

CREATE TABLE Empleados (
    EmpleadoID INT IDENTITY(1,1) PRIMARY KEY,
    CodigoEmpleado NVARCHAR(50) NOT NULL UNIQUE, -- Código QR / Tarjeta ID
    NombreCompleto NVARCHAR(150) NOT NULL,
    Correo NVARCHAR(100) NOT NULL UNIQUE, -- Correo destino para recepción del QR
    Genero NVARCHAR(20) NOT NULL CHECK (Genero IN ('masculino', 'femenino', 'otro')),
    Estado NVARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (Estado IN ('activo', 'inactivo', 'vacaciones', 'permiso', 'suspendido')),
    DepartamentoID INT NOT NULL,
    CargoID INT NOT NULL,
    SucursalID INT NOT NULL,
    SupervisorID INT NULL,
    FotoBase64 NVARCHAR(MAX) NULL,
    BiometricTemplate NVARCHAR(MAX) NULL,
    QREnviadoPorCorreo BIT DEFAULT 0 NOT NULL, -- Indicador de si se envió el código QR por correo
    FechaEnvioQR DATETIME2 NULL,              -- Fecha y hora del envío exitoso del QR por email
    FechaIngreso DATE NOT NULL,
    UsuarioCreacionID INT NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Empleados_Departamentos FOREIGN KEY (DepartamentoID) REFERENCES Departamentos(DepartamentoID),
    CONSTRAINT FK_Empleados_Cargos FOREIGN KEY (CargoID) REFERENCES Cargos(CargoID),
    CONSTRAINT FK_Empleados_Sucursales FOREIGN KEY (SucursalID) REFERENCES Sucursales(SucursalID),
    CONSTRAINT FK_Empleados_Supervisor FOREIGN KEY (SupervisorID) REFERENCES Empleados(EmpleadoID)
);

-- ===============================================================================
-- SECCIÓN 3: HORARIOS Y ASIGNACIONES
-- ===============================================================================

CREATE TABLE HorariosLaborales (
    HorarioID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    HoraEntrada TIME(0) NOT NULL,
    HoraSalida TIME(0) NOT NULL,
    DiasSemana NVARCHAR(100) NOT NULL, -- "lunes,martes,miercoles,jueves,viernes"
    ToleranciaMinutos INT DEFAULT 10 NOT NULL,
    SucursalID INT NOT NULL,
    Estado BIT DEFAULT 1 NOT NULL,
    FechaCreacion DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_HorariosLaborales_Sucursales FOREIGN KEY (SucursalID) REFERENCES Sucursales(SucursalID)
);

CREATE TABLE HorarioAsignaciones (
    AsignacionID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    HorarioID INT NOT NULL,
    FechaInicio DATE NOT NULL,
    FechaFin DATE NULL,
    FechaAsignacion DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    AsignadoPorID INT NULL,
    CONSTRAINT FK_HorarioAsignaciones_Empleados FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID),
    CONSTRAINT FK_HorarioAsignaciones_Horarios FOREIGN KEY (HorarioID) REFERENCES HorariosLaborales(HorarioID)
);

-- ===============================================================================
-- SECCIÓN 4: ENTRADAS Y SALIDAS (CONTROL DE ACCESOS Y VISITANTES)
-- ===============================================================================

CREATE TABLE EntradasSalidas (
    RegistroID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NULL, -- NULL para visitantes externos / contratistas
    NombrePersona NVARCHAR(150) NOT NULL,
    AreaDestino NVARCHAR(100) NOT NULL,
    TipoRegistro NVARCHAR(20) NOT NULL CHECK (TipoRegistro IN ('entrada', 'salida')),
    FechaRegistro DATE DEFAULT CAST(SYSDATETIME() AS DATE) NOT NULL,
    HoraRegistro TIME(0) DEFAULT CAST(SYSDATETIME() AS TIME(0)) NOT NULL,
    Motivo NVARCHAR(255) NOT NULL,
    Observaciones NVARCHAR(MAX) NULL,
    FotoCapturada NVARCHAR(MAX) NULL, -- Fotografía Base64 capturada desde la cámara web
    MetodoAcceso NVARCHAR(50) DEFAULT 'manual' NOT NULL CHECK (MetodoAcceso IN ('manual', 'camara_biometrica', 'qr_scanner')),
    AutorizacionEspecial BIT DEFAULT 0 NOT NULL, -- Para ingresos en fines de semana o feriados
    RegistradoPorUsuarioID INT NULL,
    FechaCreacion DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_EntradasSalidas_Empleados FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID),
    CONSTRAINT FK_EntradasSalidas_Usuarios FOREIGN KEY (RegistradoPorUsuarioID) REFERENCES Usuarios(UsuarioID)
);

-- ===============================================================================
-- SECCIÓN 5: MARCAJES BIOMÉTRICOS Y NOVEDADES (VACACIONES, PERMISOS, AUSENCIAS)
-- ===============================================================================

CREATE TABLE MarcajesBiometricos (
    MarcajeID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    TipoMarcaje NVARCHAR(20) NOT NULL CHECK (TipoMarcaje IN ('entrada', 'salida')),
    Fecha DATE NOT NULL,
    Hora TIME(0) NOT NULL,
    Ubicacion NVARCHAR(150) NULL,
    Resultado NVARCHAR(50) NOT NULL CHECK (Resultado IN ('exitoso', 'no_reconocido', 'empleado_inactivo', 'en_vacaciones', 'con_permiso', 'sin_horario')),
    FotoCapturada NVARCHAR(MAX) NULL,
    Observaciones NVARCHAR(MAX) NULL,
    RegistradoPorUsuarioID INT NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_MarcajesBiometricos_Empleados FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID)
);

CREATE TABLE BalanceVacaciones (
    BalanceID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    Anio INT NOT NULL,
    DiasTotales INT DEFAULT 15 NOT NULL,
    DiasUsados INT DEFAULT 0 NOT NULL,
    DiasPendientes AS (DiasTotales - DiasUsados),
    CONSTRAINT UQ_Empleado_Anio UNIQUE (EmpleadoID, Anio),
    CONSTRAINT FK_BalanceVacaciones_Empleados FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID)
);

CREATE TABLE Vacaciones (
    VacacionID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    TipoVacacion NVARCHAR(30) NOT NULL CHECK (TipoVacacion IN ('anual', 'personal', 'medica')),
    FechaInicio DATE NOT NULL,
    FechaFin DATE NOT NULL,
    DiasSolicitados INT NOT NULL,
    Estado NVARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (Estado IN ('pendiente', 'aprobada', 'rechazada', 'en_curso', 'completada')),
    Motivo NVARCHAR(255) NOT NULL,
    AprobadoPorUsuarioID INT NULL,
    FechaAprobacion DATETIME2 NULL,
    Observaciones NVARCHAR(MAX) NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Vacaciones_Empleados FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID)
);

CREATE TABLE Permisos (
    PermisoID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    TipoPermiso NVARCHAR(30) NOT NULL CHECK (TipoPermiso IN ('medico', 'personal', 'familiar', 'educativo', 'otro')),
    FechaInicio DATE NOT NULL,
    FechaFin DATE NOT NULL,
    Horas DECIMAL(5,2) NOT NULL,
    Motivo NVARCHAR(255) NOT NULL,
    DocumentoAdjunto NVARCHAR(MAX) NULL,
    Estado NVARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (Estado IN ('pendiente', 'aprobado', 'rechazado')),
    AprobadoPorUsuarioID INT NULL,
    FechaAprobacion DATETIME2 NULL,
    Observaciones NVARCHAR(MAX) NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Permisos_Empleados FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID)
);

CREATE TABLE Ausencias (
    AusenciaID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    Fecha DATE NOT NULL,
    TipoAusencia NVARCHAR(30) NOT NULL CHECK (TipoAusencia IN ('injustificada', 'justificada_medica', 'justificada_personal', 'otro')),
    Motivo NVARCHAR(255) NOT NULL,
    DocumentoAdjunto NVARCHAR(MAX) NULL,
    Estado NVARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (Estado IN ('pendiente', 'aprobada', 'rechazada')),
    AprobadoPorUsuarioID INT NULL,
    FechaAprobacion DATETIME2 NULL,
    ObservacionesAprobacion NVARCHAR(MAX) NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Ausencias_Empleados FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID)
);

-- ===============================================================================
-- SECCIÓN 6: INVENTARIO, EQUIPOS E INSPECCIONES DE CALIDAD
-- ===============================================================================

CREATE TABLE Proveedores (
    ProveedorID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(150) NOT NULL UNIQUE,
    Contacto NVARCHAR(100) NULL,
    Telefono NVARCHAR(30) NULL,
    Correo NVARCHAR(100) NULL,
    Estado BIT DEFAULT 1 NOT NULL
);

CREATE TABLE IngresosEquipo (
    IngresoID INT IDENTITY(1,1) PRIMARY KEY,
    TipoProducto NVARCHAR(100) NOT NULL,
    ProveedorID INT NULL,
    FechaIngreso DATE NOT NULL,
    Cantidad INT NOT NULL DEFAULT 1,
    CodigoBarras NVARCHAR(100) NOT NULL UNIQUE,
    Ubicacion NVARCHAR(100) NULL,
    Activo BIT DEFAULT 1 NOT NULL,
    Folio NVARCHAR(50) NULL,
    EstadoDocumental NVARCHAR(50) DEFAULT 'con_documento' NOT NULL,
    EspecificacionesJSON NVARCHAR(MAX) NULL,
    Observaciones NVARCHAR(MAX) NULL,
    RegistradoPorUsuarioID INT NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_IngresosEquipo_Proveedores FOREIGN KEY (ProveedorID) REFERENCES Proveedores(ProveedorID)
);

CREATE TABLE Inspecciones (
    InspeccionID INT IDENTITY(1,1) PRIMARY KEY,
    IngresoID INT NOT NULL,
    Folio NVARCHAR(50) NOT NULL UNIQUE,
    Estado NVARCHAR(30) NOT NULL DEFAULT 'pendiente_revision' CHECK (Estado IN ('pendiente_revision', 'cuarentena_tecnica', 'en_proceso', 'completada')),
    CondicionFisica NVARCHAR(30) NULL CHECK (CondicionFisica IN ('sin_dano', 'con_observaciones', 'con_dano', '')),
    Resultado NVARCHAR(30) NULL CHECK (Resultado IN ('conforme', 'conforme_observaciones', 'no_conforme', '')),
    DisposicionFinal NVARCHAR(30) NULL CHECK (DisposicionFinal IN ('liberacion', 'retencion', 'rechazo', '')),
    JustificacionDisposicion NVARCHAR(MAX) NULL,
    ComentarioFinal NVARCHAR(MAX) NULL,
    FechaCierre DATETIME2 NULL,
    CreadoPorUsuarioID INT NULL,
    FechaCreacion DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Inspecciones_Ingresos FOREIGN KEY (IngresoID) REFERENCES IngresosEquipo(IngresoID)
);

CREATE TABLE HallazgosInspeccion (
    HallazgoID INT IDENTITY(1,1) PRIMARY KEY,
    InspeccionID INT NOT NULL,
    Tipo NVARCHAR(30) NOT NULL CHECK (Tipo IN ('documental', 'fisico', 'tecnico', 'accesorio_faltante', 'sin_hallazgos')),
    Severidad NVARCHAR(20) NOT NULL CHECK (Severidad IN ('baja', 'media', 'alta', 'critica')),
    PasoAsociado NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(MAX) NOT NULL,
    RegistradoPorUsuarioID INT NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Hallazgos_Inspecciones FOREIGN KEY (InspeccionID) REFERENCES Inspecciones(InspeccionID)
);

CREATE TABLE EvidenciasInspeccion (
    EvidenciaID INT IDENTITY(1,1) PRIMARY KEY,
    InspeccionID INT NOT NULL,
    HallazgoID INT NULL,
    NombreArchivo NVARCHAR(255) NOT NULL,
    TipoMime NVARCHAR(100) NOT NULL,
    ContenidoBase64 NVARCHAR(MAX) NOT NULL,
    TamanoBytes INT NOT NULL,
    Etapa NVARCHAR(50) NOT NULL,
    FechaRegistro DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    CONSTRAINT FK_Evidencias_Inspecciones FOREIGN KEY (InspeccionID) REFERENCES Inspecciones(InspeccionID),
    CONSTRAINT FK_Evidencias_Hallazgos FOREIGN KEY (HallazgoID) REFERENCES HallazgosInspeccion(HallazgoID)
);

-- ===============================================================================
-- SECCIÓN 7: BITÁCORAS Y AUDITORÍA DEL SISTEMA
-- ===============================================================================

CREATE TABLE BitacoraEventos (
    BitacoraID INT IDENTITY(1,1) PRIMARY KEY,
    TipoEvento NVARCHAR(50) NOT NULL,
    Modulo NVARCHAR(50) NOT NULL,
    Descripcion NVARCHAR(MAX) NOT NULL,
    UsuarioID INT NULL,
    IpOrigen NVARCHAR(45) NULL,
    FechaHora DATETIME2 DEFAULT SYSDATETIME() NOT NULL
);

CREATE TABLE AuditoriaSistema (
    AuditoriaID INT IDENTITY(1,1) PRIMARY KEY,
    Usuario NVARCHAR(100) NOT NULL,
    Accion NVARCHAR(30) NOT NULL CHECK (Accion IN ('crear', 'editar', 'eliminar', 'activar', 'desactivar', 'aprobar', 'rechazar', 'marcaje', 'exportar')),
    Modulo NVARCHAR(50) NOT NULL,
    RegistroAfectado NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(MAX) NOT NULL,
    DatosAnteriores NVARCHAR(MAX) NULL,
    DatosNuevos NVARCHAR(MAX) NULL,
    Ip NVARCHAR(45) NULL,
    FechaHora DATETIME2 DEFAULT SYSDATETIME() NOT NULL
);

GO

-- ===============================================================================
-- SECCIÓN 8: TRIGGERS (DISPARADORES AUTOMÁTICOS DE AUDITORÍA Y NEGOCIO)
-- ===============================================================================

-- Trigger 1: Auditoría automática al registrar una Entrada o Salida
CREATE TRIGGER TR_EntradasSalidas_Auditoria
ON EntradasSalidas
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO BitacoraEventos (TipoEvento, Modulo, Descripcion, UsuarioID)
    SELECT 
        'ACCESO_REGISTRADO',
        'ENTRADAS_SALIDAS',
        CONCAT('Registro de ', i.TipoRegistro, ' para: ', i.NombrePersona, ' en area: ', i.AreaDestino, ' (Metodo: ', i.MetodoAcceso, ')'),
        i.RegistradoPorUsuarioID
    FROM inserted i;

    INSERT INTO AuditoriaSistema (Usuario, Accion, Modulo, RegistroAfectado, Descripcion)
    SELECT 
        ISNULL(u.Username, 'SISTEMA_LOCAL'),
        'crear',
        'EntradasSalidas',
        CAST(i.RegistroID AS NVARCHAR(50)),
        CONCAT('Nuevo acceso ', UPPER(i.TipoRegistro), ' - Persona: ', i.NombrePersona)
    FROM inserted i
    LEFT JOIN Usuarios u ON i.RegistradoPorUsuarioID = u.UsuarioID;
END;
GO

-- Trigger 2: Descontar días de vacaciones del Balance automáticamente al ser aprobadas
CREATE TRIGGER TR_Vacaciones_ActualizarBalance
ON Vacaciones
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(Estado)
    BEGIN
        UPDATE b
        SET b.DiasUsados = b.DiasUsados + i.DiasSolicitados
        FROM BalanceVacaciones b
        INNER JOIN inserted i ON b.EmpleadoID = i.EmpleadoID AND b.Anio = YEAR(i.FechaInicio)
        INNER JOIN deleted d ON i.VacacionID = d.VacacionID
        WHERE i.Estado = 'aprobada' AND d.Estado <> 'aprobada';
    END
END;
GO

-- Trigger 3: Cambiar estado de Empleado cuando inicia vacaciones
CREATE TRIGGER TR_Vacaciones_EstadoEmpleado
ON Vacaciones
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(Estado)
    BEGIN
        UPDATE e
        SET e.Estado = 'vacaciones'
        FROM Empleados e
        INNER JOIN inserted i ON e.EmpleadoID = i.EmpleadoID
        WHERE i.Estado = 'en_curso';

        UPDATE e
        SET e.Estado = 'activo'
        FROM Empleados e
        INNER JOIN inserted i ON e.EmpleadoID = i.EmpleadoID
        WHERE i.Estado = 'completada';
    END
END;
GO

-- ===============================================================================
-- SECCIÓN 9: PROCEDIMIENTOS ALMACENADOS (STORED PROCEDURES)
-- ===============================================================================

-- SP 1: Registrar Entrada / Salida con Validaciones
CREATE PROCEDURE sp_RegistrarEntradaSalida
    @EmpleadoID INT = NULL,
    @NombrePersona NVARCHAR(150),
    @AreaDestino NVARCHAR(100),
    @TipoRegistro NVARCHAR(20), -- 'entrada' | 'salida'
    @Motivo NVARCHAR(255),
    @Observaciones NVARCHAR(MAX) = NULL,
    @FotoCapturada NVARCHAR(MAX) = NULL,
    @MetodoAcceso NVARCHAR(50) = 'manual',
    @AutorizacionEspecial BIT = 0,
    @RegistradoPorUsuarioID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @EmpleadoID IS NOT NULL
    BEGIN
        DECLARE @EstadoEmpleado NVARCHAR(20);
        SELECT @EstadoEmpleado = Estado FROM Empleados WHERE EmpleadoID = @EmpleadoID;

        IF @EstadoEmpleado IN ('inactivo', 'suspendido')
        BEGIN
            RAISERROR('El empleado se encuentra inactivo o suspendido.', 16, 1);
            RETURN;
        END
    END

    INSERT INTO EntradasSalidas (
        EmpleadoID, NombrePersona, AreaDestino, TipoRegistro,
        FechaRegistro, HoraRegistro, Motivo, Observaciones,
        FotoCapturada, MetodoAcceso, AutorizacionEspecial, RegistradoPorUsuarioID
    )
    VALUES (
        @EmpleadoID, @NombrePersona, @AreaDestino, @TipoRegistro,
        CAST(SYSDATETIME() AS DATE), CAST(SYSDATETIME() AS TIME(0)), @Motivo, @Observaciones,
        @FotoCapturada, @MetodoAcceso, @AutorizacionEspecial, @RegistradoPorUsuarioID
    );

    SELECT SCOPE_IDENTITY() AS NuevoRegistroID;
END;
GO

-- SP 2: Registrar Empleado y Generar Código QR
CREATE PROCEDURE sp_RegistrarEmpleado
    @CodigoEmpleado NVARCHAR(50),
    @NombreCompleto NVARCHAR(150),
    @Correo NVARCHAR(100),
    @Genero NVARCHAR(20),
    @DepartamentoID INT,
    @CargoID INT,
    @SucursalID INT,
    @FechaIngreso DATE,
    @FotoBase64 NVARCHAR(MAX) = NULL,
    @UsuarioCreacionID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Empleados (
        CodigoEmpleado, NombreCompleto, Correo, Genero, Estado,
        DepartamentoID, CargoID, SucursalID, FechaIngreso, FotoBase64,
        UsuarioCreacionID, QREnviadoPorCorreo, FechaEnvioQR
    )
    VALUES (
        @CodigoEmpleado, @NombreCompleto, @Correo, @Genero, 'activo',
        @DepartamentoID, @CargoID, @SucursalID, @FechaIngreso, @FotoBase64,
        @UsuarioCreacionID, 0, NULL
    );

    DECLARE @NuevoEmpleadoID INT = SCOPE_IDENTITY();

    INSERT INTO BalanceVacaciones (EmpleadoID, Anio, DiasTotales, DiasUsados)
    VALUES (@NuevoEmpleadoID, YEAR(SYSDATETIME()), 15, 0);

    SELECT @NuevoEmpleadoID AS EmpleadoID, @CodigoEmpleado AS CodigoEmpleado, @Correo AS Correo;
END;
GO

-- SP 3: Confirmar Envío Exitoso del Código QR por Email
CREATE PROCEDURE sp_MarcarQREnviado
    @EmpleadoID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Empleados
    SET QREnviadoPorCorreo = 1,
        FechaEnvioQR = SYSDATETIME()
    WHERE EmpleadoID = @EmpleadoID;
END;
GO

-- SP 4: Obtener Reporte Filtrado de Entradas y Salidas
CREATE PROCEDURE sp_ObtenerReporteEntradasSalidas
    @FechaInicio DATE = NULL,
    @FechaFin DATE = NULL,
    @Area NVARCHAR(100) = NULL,
    @Tipo NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        es.RegistroID,
        es.NombrePersona,
        ISNULL(emp.CodigoEmpleado, 'VISITANTE') AS CodigoEmpleado,
        es.AreaDestino,
        es.TipoRegistro,
        es.FechaRegistro,
        es.HoraRegistro,
        es.Motivo,
        es.MetodoAcceso,
        es.AutorizacionEspecial,
        es.Observaciones,
        ISNULL(u.NombreCompleto, 'Sistema') AS RegistradoPor
    FROM EntradasSalidas es
    LEFT JOIN Empleados emp ON es.EmpleadoID = emp.EmpleadoID
    LEFT JOIN Usuarios u ON es.RegistradoPorUsuarioID = u.UsuarioID
    WHERE (@FechaInicio IS NULL OR es.FechaRegistro >= @FechaInicio)
      AND (@FechaFin IS NULL OR es.FechaRegistro <= @FechaFin)
      AND (@Area IS NULL OR es.AreaDestino = @Area)
      AND (@Tipo IS NULL OR es.TipoRegistro = @Tipo)
    ORDER BY es.FechaRegistro DESC, es.HoraRegistro DESC;
END;
GO

-- ===============================================================================
-- SECCIÓN 10: VISTAS DE REPORTES (SQL VIEWS)
-- ===============================================================================

CREATE VIEW vw_ReporteEntradasSalidas AS
SELECT 
    es.RegistroID,
    es.NombrePersona,
    ISNULL(emp.CodigoEmpleado, 'VISITANTE') AS CodigoEmpleado,
    es.AreaDestino,
    es.TipoRegistro,
    es.FechaRegistro,
    es.HoraRegistro,
    es.Motivo,
    es.MetodoAcceso,
    es.AutorizacionEspecial,
    es.Observaciones,
    u.NombreCompleto AS RegistradoPor,
    es.FechaCreacion
FROM EntradasSalidas es
LEFT JOIN Empleados emp ON es.EmpleadoID = emp.EmpleadoID
LEFT JOIN Usuarios u ON es.RegistradoPorUsuarioID = u.UsuarioID;
GO

CREATE VIEW vw_ResumenAccesosPorArea AS
SELECT 
    FechaRegistro,
    AreaDestino,
    SUM(CASE WHEN TipoRegistro = 'entrada' THEN 1 ELSE 0 END) AS TotalEntradas,
    SUM(CASE WHEN TipoRegistro = 'salida' THEN 1 ELSE 0 END) AS TotalSalidas,
    COUNT(*) AS TotalMovimientos
FROM EntradasSalidas
GROUP BY FechaRegistro, AreaDestino;
GO

-- ===============================================================================
-- SECCIÓN 11: DATOS INICIALES DE PRUEBA (SEED DATA)
-- ===============================================================================

INSERT INTO ConfiguracionSistema (Clave, Valor, Descripcion) VALUES
('NOMBRE_EMPRESA', 'Sistema de Gestión Empresarial', 'Nombre de la organización'),
('TOLERANCIA_MINUTOS', '10', 'Minutos de tolerancia por defecto'),
('VERSION_SISTEMA', '1.0.0', 'Versión instalada de la aplicación');

INSERT INTO Roles (Nombre, Descripcion) VALUES 
('superadmin', 'Super Administrador con acceso total'),
('admin', 'Administrador de operaciones'),
('rrhh', 'Gestion de Recursos Humanos y Accesos');

INSERT INTO Usuarios (Username, PasswordHash, NombreCompleto, Correo, RolID) VALUES
('superadmin', 'pbkdf2_hash_superadmin123', 'Super Usuario', 'superadmin@empresa.com', 1),
('admin', 'pbkdf2_hash_admin123', 'Administrador General', 'admin@empresa.com', 2),
('rrhh', 'pbkdf2_hash_rrhh123', 'Recursos Humanos', 'rrhh@empresa.com', 3);

INSERT INTO Departamentos (Nombre, Descripcion) VALUES
('Tecnologia', 'Departamento de TI y Desarrollo'),
('Recursos Humanos', 'Gestion de Personal'),
('Soporte', 'Soporte Tecnico e Infraestructura'),
('Redes', 'Infraestructura de Comunicaciones'),
('Mantenimiento', 'Mantenimiento General'),
('Administracion', 'Gestion Administrativa'),
('Recepcion', 'Atencion al Cliente y Accesos');

INSERT INTO Sucursales (Nombre, Direccion, Telefono) VALUES
('Sede Central', 'Av. Principal 123, Zona Empresarial', '2200-0000'),
('Sucursal Norte', 'Plaza Norte Edificio B', '2200-0001');

INSERT INTO Cargos (Nombre, Descripcion) VALUES
('Director', 'Direccion Ejecutiva'),
('Gerente', 'Gerencia de Area'),
('Supervisor', 'Supervision Operativa'),
('Analista', 'Analisis y Gestion'),
('Tecnico', 'Tecnico Especialista');

EXEC sp_RegistrarEmpleado
    @CodigoEmpleado = 'EMP-001',
    @NombreCompleto = 'Carlos Ruiz',
    @Correo = 'carlos.ruiz@empresa.com',
    @Genero = 'masculino',
    @DepartamentoID = 1,
    @CargoID = 4,
    @SucursalID = 1,
    @FechaIngreso = '2023-01-15',
    @UsuarioCreacionID = 1;

EXEC sp_RegistrarEmpleado
    @CodigoEmpleado = 'EMP-002',
    @NombreCompleto = 'Ana Morales',
    @Correo = 'ana.morales@empresa.com',
    @Genero = 'femenino',
    @DepartamentoID = 2,
    @CargoID = 2,
    @SucursalID = 1,
    @FechaIngreso = '2022-05-10',
    @UsuarioCreacionID = 1;

INSERT INTO HorariosLaborales (Nombre, HoraEntrada, HoraSalida, DiasSemana, ToleranciaMinutos, SucursalID) VALUES
('Turno Matutino', '08:00:00', '17:00:00', 'lunes,martes,miercoles,jueves,viernes', 10, 1),
('Turno Vespertino', '14:00:00', '22:00:00', 'lunes,martes,miercoles,jueves,viernes', 10, 1);

EXEC sp_RegistrarEntradaSalida 
    @EmpleadoID = 1,
    @NombrePersona = 'Carlos Ruiz',
    @AreaDestino = 'Tecnologia',
    @TipoRegistro = 'entrada',
    @Motivo = 'Control de asistencia diario',
    @Observaciones = 'Ingreso puntual registrado con QR',
    @MetodoAcceso = 'qr_scanner',
    @RegistradoPorUsuarioID = 1;

EXEC sp_RegistrarEntradaSalida 
    @EmpleadoID = 2,
    @NombrePersona = 'Ana Morales',
    @AreaDestino = 'Recursos Humanos',
    @TipoRegistro = 'entrada',
    @Motivo = 'Control de asistencia diario',
    @Observaciones = 'Reconocimiento facial',
    @MetodoAcceso = 'camara_biometrica',
    @RegistradoPorUsuarioID = 1;

GO

PRINT '===============================================================================';
PRINT 'BASE DE DATOS SistemaGestionDB ACTUALIZADA CON CONTROL DE ENVÍO DE QR POR CORREO';
PRINT '===============================================================================';
