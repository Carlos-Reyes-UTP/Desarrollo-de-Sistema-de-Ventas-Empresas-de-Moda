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
      {/* Panel izquierdo - Diseño moderno con gradiente */}
      <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white flex-col justify-between p-10 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center mb-14">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h1 className="ml-4 text-2xl font-bold tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">DK-SYSTEM</h1>
          </div>

          <div className="mb-20">
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Sistema de <br/>
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Gestión Empresarial</span>
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Plataforma integral para la gestión de ventas, inventario y relaciones con clientes.
              <br/>Optimiza tu negocio con herramientas profesionales.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-y-6">
            <div className="flex items-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Análisis de datos</h3>
                <p className="text-gray-300 text-sm">Estadísticas y reportes en tiempo real</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Gestión de inventario</h3>
                <p className="text-gray-300 text-sm">Control eficiente de productos y stock</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Facturación digital</h3>
                <p className="text-gray-300 text-sm">Emisión de comprobantes electrónicos</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">CRM avanzado</h3>
                <p className="text-gray-300 text-sm">Gestión integral de clientes y ventas</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-gray-400 text-xs space-y-1">
          <p className="font-medium">Desarrollado por Carlos Reyes · Jorge Nina · Jeremy Leon</p>
          <p>DK-System v1.0.0 © 2025</p>
        </div>
      </div>

      {/* Panel derecho - Formulario de login moderno */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-2xl rounded-2xl p-8">
          <div className="text-center md:text-left mb-8">
            <div className="flex items-center justify-center md:justify-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">DK-SYSTEM</span>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-gray-800">Bienvenido de nuevo</h2>
            <p className="text-gray-600">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={manejarSubmit} className="space-y-6">
            <div>
              <label htmlFor="usuario" className="block text-sm font-semibold text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="usuario"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-200 placeholder-gray-400"
                  placeholder="Ingrese su nombre de usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="clave" className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="clave"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white/70 backdrop-blur-sm transition-all duration-200 placeholder-gray-400"
                  placeholder="Ingrese su contraseña"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recordarme"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                />
                <label htmlFor="recordarme" className="ml-2 block text-sm text-gray-700 font-medium">
                  Recordarme
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
              >
                {cargando ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center text-xs text-gray-500 space-y-1">
              <p className="font-medium">🚀 Asegúrese de que el servidor backend esté ejecutándose</p>
              <p>Backend: <span className="font-mono text-blue-600">http://localhost:8080</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginaLogin;
