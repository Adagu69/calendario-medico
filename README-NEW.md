# 📅 Doctor Calendar

Un calendario interactivo y personalizable para gestionar horarios de doctores de diferentes especialidades médicas.

## ✨ Características

- **Calendario Visual**: Vista mensual clara y navegable
- **Gestión de Doctores**: Soporte para múltiples doctores con diferentes especialidades
- **Horarios Flexibles**: Cada doctor puede tener múltiples turnos con colores personalizados
- **Edición Interactiva**: Click en cualquier día para asignar/cambiar turnos
- **Exportación**: Descarga el calendario en formato PNG o JPG
- **Editor de Horarios**: Interface amigable para gestionar turnos y colores
- **Diseño Responsivo**: Funciona perfectamente en móviles y escritorio

## 🚀 Tecnologías

- **React 19** con TypeScript
- **Vite** para desarrollo rápido
- **Tailwind CSS** para estilos
- **shadcn/ui** para componentes UI elegantes
- **date-fns** para manejo de fechas
- **html2canvas** para exportación de imágenes
- **Lucide React** para iconos

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev

# Construir para producción
npm run build
```

## 🎯 Uso

### Navegación Básica
- Usa las flechas `←` `→` para cambiar de mes
- Selecciona diferentes doctores desde el dropdown
- Click en cualquier día para asignar turnos

### Gestión de Horarios
1. Click en "Editar horarios" 
2. Modifica los horarios existentes o agrega nuevos
3. Cambia colores para diferenciar turnos
4. Elimina horarios que ya no necesites

### Exportación
1. Selecciona el formato (PNG/JPG)
2. Click en "Exportar"
3. El calendario se descarga automáticamente

## 🏗️ Estructura del Proyecto

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── select.tsx
│   └── DoctorCalendar.tsx  # Componente principal
├── lib/
│   └── utils.ts         # Utilidades (cn function)
├── types/
│   └── index.ts         # Tipos TypeScript
├── App.tsx
├── main.tsx
└── index.css            # Estilos base + Tailwind
```

## 🔧 Personalización

### Agregar Nuevos Doctores

Edita el array `INITIAL_DOCTORS` en `DoctorCalendar.tsx`:

```typescript
const INITIAL_DOCTORS: Doctor[] = [
  {
    id: "nuevo-doctor",
    name: "Dr. Nuevo Doctor",
    specialty: "Especialidad",
    photo: "/images/nuevo-doctor.svg",
    shifts: [
      { id: "morning", label: "8:00 am – 12:00 pm", color: "bg-blue-500" }
    ],
    schedule: {}
  }
];
```

### Cambiar Colores Disponibles

Modifica `COLOR_OPTIONS` para nuevas opciones de color:

```typescript
const COLOR_OPTIONS = [
  "bg-emerald-500",
  "bg-purple-600",
  "bg-amber-500",
  // ... más colores
];
```

---

**Desarrollado con ❤️ para facilitar la gestión de horarios médicos**
