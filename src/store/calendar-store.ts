import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  SGHMonth, 
  SGHTimeSlot, 
  SGHMonthDay, 
  SGHChangeRequest,
  MonthState,
  MonthThemeConfig,
  ApiResponse 
} from '../types/sgh-types';

// API client para el calendario
const calendarAPI = {
  async getMonth(monthId: number): Promise<ApiResponse<SGHMonth>> {
    const response = await fetch(`/api/calendar/months/${monthId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async updateMonth(monthId: number, data: any): Promise<ApiResponse<SGHMonth>> {
    const response = await fetch(`/api/calendar/months/${monthId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async getTimeSlots(monthId: number): Promise<ApiResponse<SGHTimeSlot[]>> {
    const response = await fetch(`/api/time-slots/month/${monthId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async createTimeSlot(data: any): Promise<ApiResponse<SGHTimeSlot>> {
    const response = await fetch('/api/time-slots', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async updateTimeSlot(slotId: number, data: any): Promise<ApiResponse<SGHTimeSlot>> {
    const response = await fetch(`/api/time-slots/${slotId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async deleteTimeSlot(slotId: number): Promise<ApiResponse<null>> {
    const response = await fetch(`/api/time-slots/${slotId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async getDays(monthId: number): Promise<ApiResponse<SGHMonthDay[]>> {
    const response = await fetch(`/api/days/month/${monthId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async updateDay(monthId: number, day: number, data: any): Promise<ApiResponse<SGHMonthDay>> {
    const response = await fetch(`/api/days/${monthId}/${day}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Store de estado del calendario
interface CalendarStore extends MonthState {
  // Estado
  currentMonth: SGHMonth | null;
  timeSlots: SGHTimeSlot[];
  days: { [day: number]: SGHMonthDay };
  changeRequests: SGHChangeRequest[];
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: string;
  error?: string;
  
  // Debounce timer
  saveTimer?: NodeJS.Timeout;
  
  // Acciones básicas
  setCurrentMonth: (month: SGHMonth | null) => void;
  setTimeSlots: (slots: SGHTimeSlot[]) => void;
  setDays: (days: SGHMonthDay[]) => void;
  setError: (error: string | undefined) => void;
  setIsSaving: (saving: boolean) => void;
  
  // Acciones de carga
  loadMonth: (monthId: number) => Promise<void>;
  
  // Acciones de time slots
  addTimeSlot: (slot: Omit<SGHTimeSlot, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTimeSlot: (slotId: number, updates: Partial<SGHTimeSlot>) => Promise<void>;
  deleteTimeSlot: (slotId: number) => Promise<void>;
  
  // Acciones de días
  updateDay: (day: number, timeSlotIds: number[], notes?: string) => void;
  clearDay: (day: number) => void;
  
  // Acciones de tema
  updateTheme: (theme: Partial<MonthThemeConfig>) => void;
  
  // Acciones de guardado
  saveChanges: () => Promise<void>;
  markDirty: () => void;
  
  // Utilidades
  reset: () => void;
  getDaySlots: (day: number) => SGHTimeSlot[];
}

export const useCalendarStore = create<CalendarStore>()(
  devtools(
    immer((set, get) => ({
      // Estado inicial
      currentMonth: null,
      timeSlots: [],
      days: {},
      changeRequests: [],
      isDirty: false,
      isSaving: false,
      lastSaved: undefined,
      error: undefined,
      saveTimer: undefined,

      // Setters básicos
      setCurrentMonth: (month) => {
        set((state) => {
          state.currentMonth = month;
        });
      },

      setTimeSlots: (slots) => {
        set((state) => {
          state.timeSlots = slots;
        });
      },

      setDays: (days) => {
        set((state) => {
          state.days = {};
          days.forEach(day => {
            state.days[day.day] = day;
          });
        });
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      setIsSaving: (saving) => {
        set((state) => {
          state.isSaving = saving;
        });
      },

      // Cargar mes completo
      loadMonth: async (monthId) => {
        try {
          set((state) => {
            state.isSaving = true;
            state.error = undefined;
          });

          // Cargar datos en paralelo
          const [monthResponse, slotsResponse, daysResponse] = await Promise.all([
            calendarAPI.getMonth(monthId),
            calendarAPI.getTimeSlots(monthId),
            calendarAPI.getDays(monthId)
          ]);

          if (!monthResponse.success || !slotsResponse.success || !daysResponse.success) {
            throw new Error(monthResponse.error || 'Error cargando datos del mes');
          }

          set((state) => {
            state.currentMonth = monthResponse.data!;
            state.timeSlots = slotsResponse.data!;
            state.days = {};
            daysResponse.data!.forEach(day => {
              state.days[day.day] = day;
            });
            state.isDirty = false;
            state.isSaving = false;
            state.lastSaved = new Date().toISOString();
          });

        } catch (error) {
          console.error('Error loading month:', error);
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Error desconocido';
            state.isSaving = false;
          });
        }
      },

      // Agregar time slot
      addTimeSlot: async (slotData) => {
        try {
          const { currentMonth } = get();
          if (!currentMonth) throw new Error('No hay mes seleccionado');

          const response = await calendarAPI.createTimeSlot({
            ...slotData,
            monthId: currentMonth.id
          });

          if (!response.success) {
            throw new Error(response.error || 'Error creando horario');
          }

          set((state) => {
            state.timeSlots.push(response.data!);
            state.lastSaved = new Date().toISOString();
          });

        } catch (error) {
          console.error('Error adding time slot:', error);
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Error agregando horario';
          });
          throw error;
        }
      },

      // Actualizar time slot
      updateTimeSlot: async (slotId, updates) => {
        try {
          const response = await calendarAPI.updateTimeSlot(slotId, updates);

          if (!response.success) {
            throw new Error(response.error || 'Error actualizando horario');
          }

          set((state) => {
            const index = state.timeSlots.findIndex(slot => slot.id === slotId);
            if (index !== -1) {
              state.timeSlots[index] = response.data!;
            }
            state.lastSaved = new Date().toISOString();
          });

        } catch (error) {
          console.error('Error updating time slot:', error);
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Error actualizando horario';
          });
          throw error;
        }
      },

      // Eliminar time slot
      deleteTimeSlot: async (slotId) => {
        try {
          const response = await calendarAPI.deleteTimeSlot(slotId);

          if (!response.success) {
            throw new Error(response.error || 'Error eliminando horario');
          }

          set((state) => {
            state.timeSlots = state.timeSlots.filter(slot => slot.id !== slotId);
            // Limpiar días que usen este slot
            Object.values(state.days).forEach(day => {
              day.timeSlotIds = day.timeSlotIds.filter(id => id !== slotId);
            });
            state.lastSaved = new Date().toISOString();
          });

        } catch (error) {
          console.error('Error deleting time slot:', error);
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Error eliminando horario';
          });
          throw error;
        }
      },

      // Actualizar día (con autosave)
      updateDay: (day, timeSlotIds, notes) => {
        set((state) => {
          state.days[day] = {
            id: state.days[day]?.id || 0,
            monthId: state.currentMonth?.id || 0,
            day,
            timeSlotIds,
            notes,
            createdAt: state.days[day]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          state.isDirty = true;
        });

        // Programar autosave con debounce
        get().markDirty();
      },

      // Limpiar día
      clearDay: (day) => {
        set((state) => {
          if (state.days[day]) {
            state.days[day].timeSlotIds = [];
            state.days[day].notes = undefined;
            state.days[day].updatedAt = new Date().toISOString();
            state.isDirty = true;
          }
        });

        get().markDirty();
      },

      // Actualizar tema
      updateTheme: (themeUpdates) => {
        set((state) => {
          if (state.currentMonth) {
            state.currentMonth.themeConfig = {
              ...state.currentMonth.themeConfig,
              ...themeUpdates
            };
            state.isDirty = true;
          }
        });

        get().markDirty();
      },

      // Marcar como dirty y programar autosave
      markDirty: () => {
        const { saveTimer } = get();
        
        // Cancelar timer anterior
        if (saveTimer) {
          clearTimeout(saveTimer);
        }

        // Programar nuevo save con debounce de 800ms
        const newTimer = setTimeout(() => {
          get().saveChanges();
        }, 800);

        set((state) => {
          state.saveTimer = newTimer;
        });
      },

      // Guardar cambios
      saveChanges: async () => {
        const { currentMonth, days, isDirty, isSaving } = get();
        
        if (!isDirty || isSaving || !currentMonth) return;

        try {
          set((state) => {
            state.isSaving = true;
            state.error = undefined;
          });

          // Guardar tema si cambió
          if (isDirty) {
            await calendarAPI.updateMonth(currentMonth.id, {
              themeConfig: currentMonth.themeConfig
            });
          }

          // Guardar días modificados
          const daysToSave = Object.values(days).filter(day => 
            day.updatedAt > (get().lastSaved || '2024-01-01')
          );

          for (const day of daysToSave) {
            await calendarAPI.updateDay(currentMonth.id, day.day, {
              timeSlotIds: day.timeSlotIds,
              notes: day.notes
            });
          }

          set((state) => {
            state.isDirty = false;
            state.isSaving = false;
            state.lastSaved = new Date().toISOString();
          });

          console.log('💾 Changes saved successfully');

        } catch (error) {
          console.error('Error saving changes:', error);
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Error guardando cambios';
            state.isSaving = false;
            // Mantener isDirty = true para retry
          });

          // Programar retry exponencial
          setTimeout(() => {
            if (get().isDirty) {
              get().saveChanges();
            }
          }, 2000);
        }
      },

      // Obtener slots de un día específico
      getDaySlots: (day) => {
        const { days, timeSlots } = get();
        const dayData = days[day];
        
        if (!dayData || !dayData.timeSlotIds.length) {
          return [];
        }

        return timeSlots.filter(slot => 
          dayData.timeSlotIds.includes(slot.id)
        );
      },

      // Reset del store
      reset: () => {
        const { saveTimer } = get();
        if (saveTimer) {
          clearTimeout(saveTimer);
        }

        set((state) => {
          state.currentMonth = null;
          state.timeSlots = [];
          state.days = {};
          state.changeRequests = [];
          state.isDirty = false;
          state.isSaving = false;
          state.lastSaved = undefined;
          state.error = undefined;
          state.saveTimer = undefined;
        });
      }
    })),
    {
      name: 'calendar-store',
      partialize: (state) => ({
        // Solo persistir datos esenciales, no estado temporal
        currentMonth: state.currentMonth,
        timeSlots: state.timeSlots,
        days: state.days
      })
    }
  )
);