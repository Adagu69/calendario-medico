# 🏥 Backend del Sistema de Turnos Médicos

## 📋 Instrucciones de Configuración

### 1. Prerequisitos

**Instalar PostgreSQL:**
- Descargar desde: https://www.postgresql.org/download/windows/
- Instalar con las opciones por defecto
- Recordar la contraseña del usuario `postgres`

### 2. Configurar la Base de Datos

```sql
-- Conectarse a PostgreSQL como administrador
-- Crear la base de datos
CREATE DATABASE doctor_calendar;

-- Crear un usuario específico (opcional)
CREATE USER doctor_user WITH PASSWORD 'doctor_password';
GRANT ALL PRIVILEGES ON DATABASE doctor_calendar TO doctor_user;
```

### 3. Configurar Variables de Entorno

Editar el archivo `.env` en la carpeta `backend`:

```env
# Cambiar estos valores según tu configuración
DB_HOST=localhost
DB_PORT=5432
DB_NAME=doctor_calendar
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_DE_POSTGRES
```

### 4. Ejecutar el Backend

```bash
# Navegar a la carpeta backend
cd backend

# Crear las tablas
npm run migrate

# Poblar con datos de prueba
npm run seed

# Iniciar el servidor
npm run dev
```

### 5. Verificar Funcionamiento

- Backend: http://localhost:3001/health
- Frontend: http://localhost:5173

## 🔧 Comandos Útiles

```bash
# Ver logs de PostgreSQL
# En Windows: Event Viewer > Windows Logs > Application

# Conectarse a PostgreSQL desde terminal
psql -U postgres -d doctor_calendar

# Ver tablas creadas
\dt

# Ver usuarios del sistema
SELECT name, email, role FROM users;
```

## ⚠️ Solución de Problemas

### Error de conexión a PostgreSQL:
1. Verificar que PostgreSQL esté ejecutándose
2. Revisar usuario y contraseña en `.env`
3. Verificar que el puerto 5432 esté disponible

### Error de permisos:
1. Verificar que el usuario tenga permisos en la base de datos
2. Ejecutar como administrador si es necesario

### Puerto ocupado:
- Cambiar el puerto en `.env` (ejemplo: PORT=3002)
