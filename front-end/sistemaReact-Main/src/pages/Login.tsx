import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PaginaLogin = () => {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordarme, setRecordarme] = useState(false);
  const { iniciarSesion, cargando, error: authError } = useAuth();
  const navegar = useNavigate();

  // Actualizamos el estado de error local si cambia en el contexto de autenticación
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const manejarSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!usuario.trim()) {
      setError('Por favor ingrese su nombre de usuario');
      return;
    }

    if (!clave) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      console.log('Intentando iniciar sesión con:', { usuario });
      const exito = await iniciarSesion({ usuario, clave });
      
      if (exito) {
        console.log('Inicio de sesión exitoso, redirigiendo...');
        navegar('/');
      } else {
        // Si iniciarSesion devuelve false pero no hay error en authError
        if (!authError) {
          setError('Credenciales incorrectas. Por favor, intente nuevamente.');
        }
      }
    } catch (err: any) {
      console.error('Error en el manejo de inicio de sesión:', err);
      setError('Error al intentar iniciar sesión. Inténtelo más tarde.');
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Panel izquierdo (negro) */}
      <div className="hidden md:flex md:w-5/12 bg-black text-white flex-col justify-between p-10">
        <div>
          <div className="flex items-center mb-14">
            <div className="w-10 h-10 rounded-full border border-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="ml-4 text-xl font-medium tracking-wide">VENTASPRO</h1>
          </div>

          <div className="mb-20">
            <h2 className="text-5xl font-bold mb-5">Sistema de Ventas</h2>
            <p className="text-gray-400 text-sm">
              Plataforma integral para la gestión de ventas, inventario y relaciones con clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-y-8">
            <div className="flex items-center">
              <div className="p-3 bg-gray-800 rounded-md mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-sm">Análisis de datos</h3>
                <p className="text-gray-400 text-xs">Estadísticas y reportes en tiempo real</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="p-3 bg-gray-800 rounded-md mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-sm">Gestión de inventario</h3>
                <p className="text-gray-400 text-xs">Control eficiente de productos</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="p-3 bg-gray-800 rounded-md mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-sm">Facturación</h3>
                <p className="text-gray-400 text-xs">Emisión de comprobantes digitales</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="p-3 bg-gray-800 rounded-md mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-sm">CRM</h3>
                <p className="text-gray-400 text-xs">Gestión integral de clientes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-gray-500 text-xs">
          <p>Desarrollado por Carlos Reyes · Jorge Nina · Jeremy Leon</p>
          <p>v1.0.0 © 2025</p>
        </div>
      </div>

      {/* Panel derecho (formulario de login) */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white border border-gray-100 shadow-md rounded-lg p-8">
          <div className="text-center md:text-left mb-12">
            <h2 className="text-2xl font-bold mb-1">Bienvenido de nuevo</h2>
            <p className="text-gray-600 text-sm">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-600 text-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={manejarSubmit}>
            <div className="mb-5">
              <label htmlFor="usuario" className="block text-gray-700 mb-2 text-sm font-medium">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="usuario"
                  className="w-full pl-10 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 bg-white"
                  placeholder="Ingrese su nombre de usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="clave" className="block text-gray-700 text-sm font-medium">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="clave"
                  className="w-full pl-10 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 bg-white"
                  placeholder="Ingrese su contraseña"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recordarme"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                  className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                />
                <label htmlFor="recordarme" className="ml-2 block text-sm text-gray-700">
                  Recordarme
                </label>
              </div>
            </div>

            <div className="mb-6">
              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-md transition duration-200 text-sm font-medium"
              >
                {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          <div className="text-center">
            {/* Información adicional sobre el backend */}
            <div className="text-xs text-gray-500 mt-8 border-t pt-4">
              <p>Nota: Asegúrese de que el servidor de backend esté en ejecución en http://localhost:8080</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginaLogin;