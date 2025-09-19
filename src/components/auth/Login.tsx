import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Lock } from "lucide-react";
import type { User as UserType } from "@/types";

interface LoginProps {
  onLogin: (user: UserType) => void;
}

// Mock users para demo
const MOCK_USERS: UserType[] = [
  {
    id: "admin1",
    username: "admin",
    email: "admin@clinica.com",
    role: "admin",
    specialtyAccess: [],
    name: "Administrador"
  },
  {
    id: "pediatria1",
    username: "jefe.pediatria",
    email: "pediatria@clinica.com",
    role: "viewer",
    specialtyAccess: ["pediatria"],
    name: "Dr. Ana García - Jefe Pediatría"
  },
  {
    id: "urologia1",
    username: "jefe.urologia",
    email: "urologia@clinica.com",
    role: "viewer",
    specialtyAccess: ["urologia"],
    name: "Dr. Carlos López - Jefe Urología"
  },
  {
    id: "nutricion1",
    username: "jefe.nutricion",
    email: "nutricion@clinica.com",
    role: "viewer",
    specialtyAccess: ["nutricion"],
    name: "Lic. María Rodriguez - Jefe Nutrición"
  }
];

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simular autenticación
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = MOCK_USERS.find(u => u.username === username);
    
    if (user && password === "123456") {
      onLogin(user);
    } else {
      setError("Usuario o contraseña incorrectos");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Sistema de Turnos Médicos
          </CardTitle>
          <p className="text-gray-600">Ingrese sus credenciales</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Usuarios de prueba:</h4>
            <div className="text-xs space-y-1 text-gray-600">
              <p><strong>Admin:</strong> admin / 123456</p>
              <p><strong>Pediatría:</strong> jefe.pediatria / 123456</p>
              <p><strong>Urología:</strong> jefe.urologia / 123456</p>
              <p><strong>Nutrición:</strong> jefe.nutricion / 123456</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
