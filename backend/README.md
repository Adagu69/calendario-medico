# Doctor Calendar Backend

Backend API para el sistema de turnos médicos desarrollado con Node.js, Express, TypeScript y PostgreSQL.

## 🚀 Características

- **Autenticación JWT**: Sistema seguro de autenticación con roles
- **Base de datos PostgreSQL**: Almacenamiento robusto y escalable
- **TypeScript**: Tipado estático para mayor seguridad
- **Arquitectura REST**: APIs bien estructuradas y documentadas
- **Middleware de seguridad**: Helmet, CORS, validaciones
- **Control de acceso por roles**: Admin, doctor, enfermera, recepcionista

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- PostgreSQL >= 12.0
- npm o yarn

## 🔧 Instalación

1. **Instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:
```env
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=doctor_calendar
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura
JWT_EXPIRES_IN=24h

# CORS
FRONTEND_URL=http://localhost:5173
```

3. **Crear la base de datos:**
```sql
CREATE DATABASE doctor_calendar;
```

4. **Ejecutar migraciones:**
```bash
npm run migrate
```

5. **Poblar la base de datos (opcional):**
```bash
npm run seed
```

## 🏃‍♂️ Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 📊 Estructura de la Base de Datos

### Tablas principales:
- **users**: Usuarios del sistema (admin, doctores, etc.)
- **specialties**: Especialidades médicas
- **offices**: Consultorios y salas de procedimientos
- **time_slots**: Franjas horarias disponibles
- **doctors**: Información de médicos
- **appointments**: Citas médicas

## 🔐 API Endpoints

### Autenticación
```
POST /api/auth/login       # Iniciar sesión
POST /api/auth/register    # Registrar usuario
GET  /api/auth/me          # Obtener perfil
POST /api/auth/refresh     # Renovar token
```

### Citas Médicas
```
GET    /api/appointments                 # Listar citas
GET    /api/appointments/calendar-events # Eventos para calendario
GET    /api/appointments/:id             # Obtener cita específica
POST   /api/appointments                 # Crear cita (solo admin)
PUT    /api/appointments/:id             # Actualizar cita (solo admin)
DELETE /api/appointments/:id             # Eliminar cita (solo admin)
```

## 👥 Usuarios de Prueba

Después de ejecutar `npm run seed`:

| Email | Password | Rol | Especialidades |
|-------|----------|-----|----------------|
| admin@clinica.com | admin123 | admin | Todas |
| pediatria@clinica.com | ped123 | doctor | Pediatría |
| nutricion@clinica.com | nut123 | doctor | Nutrición |
| urologia@clinica.com | uro123 | doctor | Urología |

## 🔍 Health Check

```bash
GET /health
```

Respuesta:
```json
{
  "success": true,
  "message": "Doctor Calendar API is running",
  "timestamp": "2025-01-08T15:30:00.000Z",
  "environment": "development"
}
```

## 🛡️ Seguridad

- **JWT Authentication**: Tokens seguros con expiración
- **Role-based Access**: Control granular de permisos
- **Password Hashing**: bcrypt con salt rounds
- **CORS Protection**: Configurado para el frontend
- **Helmet**: Headers de seguridad HTTP
- **Input Validation**: Validación de datos de entrada

## 📝 Scripts Disponibles

```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar TypeScript
npm start        # Ejecutar versión compilada
npm run migrate  # Ejecutar migraciones
npm run seed     # Poblar base de datos
```

## 🔧 Configuración de Producción

### Variables de entorno adicionales:
```env
NODE_ENV=production
DB_SSL=true
LOG_LEVEL=error
```

### Recomendaciones:
- Usar PM2 para gestión de procesos
- Configurar reverse proxy (nginx)
- Habilitar SSL/TLS
- Configurar backup de base de datos
- Implementar monitoring y logs

## 🐛 Debugging

Para habilitar logs detallados:
```bash
DEBUG=* npm run dev
```

## 📚 Documentación Adicional

- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [JWT](https://jwt.io/)

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.
