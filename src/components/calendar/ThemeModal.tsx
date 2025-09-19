import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, RotateCcw, Save, Eye } from 'lucide-react';
import type { ThemeModalProps, MonthThemeConfig } from '@/types/sgh-types';

const ThemeModal: React.FC<ThemeModalProps> = ({
  currentTheme,
  onThemeUpdate,
  onClose,
  isOpen
}) => {
  const [theme, setTheme] = useState<MonthThemeConfig>(currentTheme);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  
  // Tema por defecto
  const defaultTheme: MonthThemeConfig = {
    font: {
      family: 'Inter',
      size: 14,
      weight: 'normal'
    },
    colors: {
      background: '#ffffff',
      text: '#374151',
      primary: '#3b82f6',
      secondary: '#e5e7eb'
    },
    layout: {
      borderRadius: 8,
      spacing: 12
    },
    doctor: {
      displayName: 'Dr. SGH'
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      setTheme(currentTheme);
      setHasChanges(false);
    }
  }, [isOpen, currentTheme]);
  
  useEffect(() => {
    const isChanged = JSON.stringify(theme) !== JSON.stringify(currentTheme);
    setHasChanges(isChanged);
  }, [theme, currentTheme]);
  
  const updateThemeColor = (key: string, value: string) => {
    setTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value
      }
    }));
  };
  
  const updateThemeFont = (key: string, value: string | number) => {
    setTheme(prev => ({
      ...prev,
      font: {
        ...prev.font,
        [key]: value
      }
    }));
  };
  
  const updateThemeLayout = (key: string, value: number) => {
    setTheme(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: value
      }
    }));
  };
  
  const resetToDefault = () => {
    setTheme(defaultTheme);
  };
  
  const handleSave = () => {
    onThemeUpdate(theme);
    setHasChanges(false);
    onClose();
  };
  
  const handleCancel = () => {
    setTheme(currentTheme);
    setHasChanges(false);
    onClose();
  };
  
  const ColorInput: React.FC<{ 
    label: string; 
    value: string; 
    onChange: (value: string) => void;
    description?: string;
  }> = ({ label, value, onChange, description }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 p-1 border-2"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
  
  const previewStyle = {
    backgroundColor: theme.colors?.background || '#ffffff',
    color: theme.colors?.text || '#374151',
    fontFamily: theme.font?.family || 'Inter',
    fontSize: `${theme.font?.size || 14}px`,
    borderRadius: `${theme.layout?.borderRadius || 8}px`,
    padding: `${theme.layout?.spacing || 12}px`
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            Personalizar Tema del Calendario
          </DialogTitle>
          <DialogDescription>
            Configura los colores y estilos del calendario mensual
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Colores</TabsTrigger>
            <TabsTrigger value="layout">Diseño</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ColorInput
                label="Color Primario"
                value={theme.colors?.primary || '#3b82f6'}
                onChange={(value) => updateThemeColor('primary', value)}
                description="Color principal del calendario"
              />
              
              <ColorInput
                label="Color Secundario"
                value={theme.colors?.secondary || '#e5e7eb'}
                onChange={(value) => updateThemeColor('secondary', value)}
                description="Color de fondo secundario"
              />
              
              <ColorInput
                label="Fondo"
                value={theme.colors?.background || '#ffffff'}
                onChange={(value) => updateThemeColor('background', value)}
                description="Color de fondo principal"
              />
              
              <ColorInput
                label="Texto"
                value={theme.colors?.text || '#374151'}
                onChange={(value) => updateThemeColor('text', value)}
                description="Color del texto principal"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="layout" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Familia de Fuente</Label>
                <select
                  value={theme.font?.family || 'Inter'}
                  onChange={(e) => updateThemeFont('family', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="Inter">Inter</option>
                  <option value="system-ui">Sistema</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tamaño de Fuente</Label>
                <Input
                  type="number"
                  min="10"
                  max="24"
                  value={theme.font?.size || 14}
                  onChange={(e) => updateThemeFont('size', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Radio de Bordes</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={theme.layout?.borderRadius || 8}
                  onChange={(e) => updateThemeLayout('borderRadius', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Espaciado</Label>
                <Input
                  type="number"
                  min="4"
                  max="32"
                  value={theme.layout?.spacing || 12}
                  onChange={(e) => updateThemeLayout('spacing', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4" />
              <Label className="font-medium">Vista Previa del Calendario</Label>
            </div>
            
            <div 
              className="border-2 border-gray-200 p-4 rounded-lg"
              style={previewStyle}
            >
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <div 
                    key={day}
                    className="p-2 font-semibold"
                    style={{ 
                      backgroundColor: theme.colors?.secondary || '#e5e7eb',
                      borderRadius: previewStyle.borderRadius
                    }}
                  >
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i + 1;
                  const isToday = day === 15;
                  const isSelected = day === 10;
                  
                  return (
                    <div
                      key={i}
                      className="p-2 text-center cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isSelected ? (theme.colors?.primary || '#3b82f6') :
                                       isToday ? (theme.colors?.secondary || '#e5e7eb') : 'transparent',
                        color: isSelected ? '#FFFFFF' : (theme.colors?.text || '#374151'),
                        border: `1px solid ${theme.colors?.secondary || '#e5e7eb'}`,
                        borderRadius: previewStyle.borderRadius
                      }}
                    >
                      {day <= 31 ? day : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer
            </Button>
            {hasChanges && (
              <span className="flex items-center gap-1 text-sm text-orange-600">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                Cambios sin guardar
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Tema
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeModal;