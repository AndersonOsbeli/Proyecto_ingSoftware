# 🚀 Backend API REST - Sistema de Gestión (SQL Server)

Servidor API REST desarrollado en **Node.js, Express y SQL Server (T-SQL)** para conectar el Frontend React del Sistema de Gestión.

---

## 📋 Requisitos Previos
1. **Node.js** v18 o superior instalado.
2. **Microsoft SQL Server** (2016+, Express, LocalDB o Azure SQL) con la base de datos `SistemaGestionDB` creada mediante el script `script_base_datos_completo.sql`.

---

## ⚡ Instalación e Inicio en 3 Pasos

### Paso 1: Abrir la terminal en la carpeta backend
```bash
cd backend
```

### Paso 2: Dar formato a las variables en `.env` (si es necesario)
Revisa las credenciales de tu SQL Server en el archivo `backend/.env`:
```ini
DB_USER=sa
DB_PASSWORD=TuPassword123
DB_SERVER=localhost
DB_NAME=SistemaGestionDB
```

### Paso 3: Instalar dependencias e Iniciar
```bash
npm install
npm start
```

Verás el mensaje en consola:
```text
✅ Base de Datos Conectada: Conexión exitosa a SQL Server (SistemaGestionDB)
🚀 Servidor API Backend ejecutándose en: http://localhost:5000
```

---

## 🔗 Endpoints de la API Disponibles

| Método | URL Endpoint | Descripción |
|--------|--------------|-------------|
| **GET** | `/api/entradas-salidas` | Obtiene el reporte completo de Entradas y Salidas de personal y visitas desde la vista SQL. |
| **POST** | `/api/entradas-salidas` | Registra una nueva entrada o salida llamando al Stored Procedure `sp_RegistrarEntradaSalida`. |
| **GET** | `/api/empleados` | Consulta todos los empleados desde SQL Server. |
| **POST** | `/api/empleados` | Registra un nuevo empleado, **genera su código QR en imagen PNG y se lo envía a su correo electrónico** automáticamente con `Nodemailer`. |
| **GET** | `/api/Ingresos` | Obtiene equipos e inventario cargados en la base de datos. |
| **POST** | `/api/Ingresos` | Inserta nuevos productos en la tabla `IngresosEquipo`. |
