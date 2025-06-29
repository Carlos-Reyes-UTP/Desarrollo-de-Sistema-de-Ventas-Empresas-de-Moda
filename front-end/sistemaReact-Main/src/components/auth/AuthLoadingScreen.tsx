import React from 'react';
import { Loader2 } from 'lucide-react';

interface AuthLoadingProps {
  message?: string;
}

/**
 * Componente que muestra una pantalla de carga mientras se valida la autenticación
 * al recargar la página o al inicializar la aplicación.
 */
export const AuthLoadingScreen: React.FC<AuthLoadingProps> = ({ 
  message = "Validando sesión..." 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 text-center">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
