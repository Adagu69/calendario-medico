# 🧪 PRUEBAS DE INTEGRACIÓN FRONTEND-BACKEND

## ✅ Estado de la Integración

### **🔄 Cambios Realizados**

1. **✅ LoginForm actualizado**
   - Usa el backend real con PostgreSQL
   - Autenticación JWT funcional
   - Manejo de errores mejorado

2. **✅ FullCalendarView integrado**
   - Carga datos desde API REST
   - Filtros dinámicos del backend
   - CRUD de citas conectado

3. **✅ Servicios API creados**
   - Cliente Axios configurado
   - Interceptores para tokens JWT
   - Manejo de errores centralizados

### **🚀 URLs para Probar**

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### **👥 Usuarios para Probar**

```
Email: admin@clinica.com
Password: admin123
Rol: Administrador (puede crear/editar/eliminar)

Email: pediatria@clinica.com  
Password: ped123
Rol: Doctor (solo ve pediatría)

Email: nutricion@clinica.com
Password: nut123  
Rol: Doctor (solo ve nutrición)

Email: urologia@clinica.com
Password: uro123
Rol: Doctor (solo ve urología)
```

### **🧪 Casos de Prueba**

#### **1. Prueba de Login**
- [ ] Ir a http://localhost:5173
- [ ] Hacer clic en "Sistema de Turnos"
- [ ] Intentar login con credenciales incorrectas (debería fallar)
- [ ] Login con admin@clinica.com / admin123
- [ ] Verificar que aparece el calendario FullCalendar

#### **2. Prueba de Roles**
- [ ] Login como admin: debería ver botón "Nuevo Turno"
- [ ] Login como pediatria: solo debería ver turnos de pediatría
- [ ] Verificar filtros dinámicos funcionando

#### **3. Prueba de CRUD**
- [ ] Como admin: crear una nueva cita
- [ ] Editar una cita existente
- [ ] Eliminar una cita
- [ ] Verificar que los cambios persisten

#### **4. Prueba de Filtros**
- [ ] Filtrar por especialidad
- [ ] Filtrar por consultorio
- [ ] Filtrar por doctor
- [ ] Verificar contadores en "Resumen"

### **🐛 Posibles Problemas**

1. **Error de conexión CORS**
   - Verificar que backend esté en puerto 3001
   - Revisar configuración en backend/.env

2. **Error 401 Unauthorized**
   - Token JWT expirado o inválido
   - Hacer logout y login nuevamente

3. **Error al cargar datos**
   - Verificar que PostgreSQL esté ejecutándose
   - Comprobar que las tablas tienen datos

### **📝 Notas Técnicas**

- **Cache**: Los datos se cachean en memoria para mejor rendimiento
- **Tokens**: Se guardan en localStorage automáticamente  
- **CORS**: Configurado para localhost:5173
- **Validación**: Solo admins pueden modificar datos

### **🔧 Comandos de Debug**

```bash
# Ver logs del backend
cd backend
npm run dev

# Verificar datos en PostgreSQL
psql -U postgres -d doctor_calendar
SELECT * FROM users;
SELECT * FROM appointments;

# Limpiar cache del navegador
Ctrl+Shift+R (o F12 > Application > Clear Storage)
```

¡La integración está lista! Ahora tienes un sistema completo con backend real conectado a PostgreSQL. 🎉
