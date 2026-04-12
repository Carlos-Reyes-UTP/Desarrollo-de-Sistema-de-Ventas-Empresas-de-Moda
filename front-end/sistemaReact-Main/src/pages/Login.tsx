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
      setError('Por favor ingrese su contraseña');
      return;
    }

    try {
      console.log('Intentando iniciar sesión con:', { usuario });
      const exito = await iniciarSesion({ usuario, clave });
      
      if (exito) {
        console.log('Inicio de sesión exitoso, redirigiendo...');
        navegar('/');
      } else if (!authError) {
        // Si iniciarSesion devuelve false pero no hay error en authError
        setError('Credenciales incorrectas. Por favor, intente nuevamente.');
      }
    } catch (err: any) {
      console.error('Error en el manejo de inicio de sesión:', err);
      setError('Error al intentar iniciar sesión. Inténtelo más tarde.');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#fafafa] font-sans text-gray-900 overflow-x-hidden">
      {/* Elemento decorativo Top Nav que no se sobrepone al contenido de forma obstructiva */}


      {/* Panel izquierdo - Diseño minimalista oscuro */}
      <div className="hidden md:flex md:w-1/2 bg-[#0a0a0a] text-white flex-col justify-end p-16 relative">
        {/* Fondo sutil con gradientes abstractos */}
        <div className="absolute inset-0 opacity-40 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[150%] h-[150%] bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-black rounded-full blur-3xl transform -skew-y-[20deg]"></div>
          <div className="absolute bottom-[0%] left-[20%] w-[100%] h-[100%] bg-gradient-to-tl from-[#222] to-transparent rounded-full blur-[100px] opacity-30"></div>
        </div>
        
          <div className="flex items-center mb-12">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h1 className="ml-4 text-xl font-bold tracking-[0.2em] text-white">DK-SYSTEM</h1>
          </div>

          <h2 className="text-[3rem] leading-[1.1] font-bold tracking-tight mb-6">
            Sistema de <br/>
            <span className="text-gray-400">Gestión Empresarial</span>
          </h2>

          <p className="text-gray-300 text-[15px] leading-relaxed mb-16 max-w-md font-light">
            Plataforma integral para la gestión de ventas, inventario y relaciones con clientes.
            Optimiza tu negocio con herramientas profesionales y procesos automatizados.
          </p>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-w-lg mb-4">
            <div className="flex flex-col">
              <div className="h-1 w-6 bg-white mb-3"></div>
              <h3 className="font-semibold text-white text-[13px] tracking-widest uppercase mb-1">Análisis</h3>
              <p className="text-gray-500 text-xs">Reportes en tiempo real</p>
            </div>
            <div className="flex flex-col">
              <div className="h-1 w-6 bg-white mb-3"></div>
              <h3 className="font-semibold text-white text-[13px] tracking-widest uppercase mb-1">Inventario</h3>
              <p className="text-gray-500 text-xs">Control de productos</p>
            </div>
            <div className="flex flex-col">
              <div className="h-1 w-6 bg-white mb-3"></div>
              <h3 className="font-semibold text-white text-[13px] tracking-widest uppercase mb-1">Facturación</h3>
              <p className="text-gray-500 text-xs">Comprobantes válidos</p>
            </div>
            <div className="flex flex-col">
              <div className="h-1 w-6 bg-white mb-3"></div>
              <h3 className="font-semibold text-white text-[13px] tracking-widest uppercase mb-1">CRM</h3>
              <p className="text-gray-500 text-xs">Gestión de clientes</p>
            </div>
          </div>
        
        {/* Footer izquierdo (original decía copyright de los devs) */}
        <div className="relative z-10 text-gray-500/70 text-[10px] tracking-[0.15em] uppercase border-t border-white/5 pt-6 mt-8">
          <p>© 2024 DK-SYSTEM. PRECISIÓN SISTEMÁTICA EN NEGOCIOS.</p>
        </div>
      </div>

      {/* Panel derecho - Formulario de login moderno minimalista */}


      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 bg-[#fafafa] relative min-h-screen">
        <div className="max-w-[420px] w-full pt-20 pb-16">
          <div className="mb-6 w-12 h-[3px] bg-black"></div>
          
          <h1 className="text-[2.25rem] leading-tight font-bold tracking-tight text-black mb-3">
            AUTENTICACIÓN
          </h1>
          <p className="text-gray-600 text-sm mb-12 font-medium leading-relaxed">
            Accede al entorno de DK-SYSTEM. Seguridad verificada por estándares de encriptación arquitectónica.
          </p>

          {error && (
            <div className="mb-8 px-4 py-3 bg-red-50 text-red-600 text-sm font-medium border border-red-100 rounded-lg flex items-start">
               <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={manejarSubmit} className="space-y-7">
            <div>
              <label htmlFor="usuario" className="block text-[11px] font-bold tracking-[0.15em] text-gray-900 uppercase mb-3 text-left">
                Identidad de Terminal
              </label>
              <input
                type="text"
                id="usuario"
                className="w-full px-6 py-4 bg-[#f2f2f2] border border-transparent rounded-[2rem] text-gray-800 text-base focus:outline-none focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 transition-all placeholder:text-gray-400 font-medium"
                placeholder="usuario@dk-system.com"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="clave" className="block text-[11px] font-bold tracking-[0.15em] text-gray-900 uppercase mb-3 text-left">
                Clave de Acceso
              </label>
              <input
                type="password"
                id="clave"
                className="w-full px-6 py-4 bg-[#f2f2f2] border border-transparent rounded-[2rem] text-gray-800 text-base focus:outline-none focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 transition-all font-medium tracking-[0.25em] placeholder:tracking-normal placeholder:text-gray-400"
                placeholder="••••••••••••"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1 mb-8">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
                    className="peer appearance-none w-[18px] h-[18px] border border-gray-300 rounded-full checked:bg-black checked:border-black transition-colors focus:ring-2 focus:ring-gray-200 focus:outline-none"
                    checked={recordarme}
                    onChange={(e) => setRecordarme(e.target.checked)}
                  />
                  <svg className="absolute w-[10px] h-[10px] text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13px] font-medium text-gray-500 group-hover:text-black transition-colors">Recordar dispositivo</span>
              </label>
              
              <a href="#" className="text-[13px] font-medium text-gray-800 hover:text-black border-b border-gray-300 hover:border-black transition-all pb-[1px]">
                ¿Olvidó su Clave?
              </a>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-[1.125rem] px-8 bg-black hover:bg-gray-900 active:transform active:scale-[0.99] transition-all text-white font-bold tracking-[0.2em] font-sans text-xs uppercase rounded-full flex items-center justify-between group disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="pl-1">{cargando ? 'INICIANDO...' : 'INICIAR SESIÓN'}</span>
              {!cargando && (
                <svg className="w-[18px] h-[18px] mr-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>


          
          <div className="mt-8 text-center text-gray-400 text-xs space-y-1">
             <p className="md:hidden">Backend: <span className="font-mono text-gray-500">http://localhost:8080</span></p>
          </div>
        </div>

        {/* Footer links en la esquina inferior derecha */}
        <div className="absolute bottom-8 w-full md:w-auto md:right-12 px-8 md:px-0 flex justify-center md:justify-end space-x-6 text-[10px] font-bold tracking-[0.2em] text-gray-400/80 uppercase">
          <a href="#" className="hover:text-black transition-colors">Privacidad</a>
          <a href="#" className="hover:text-black transition-colors">Términos</a>
          <a href="#" className="hover:text-black transition-colors">Seguridad</a>
          <a href="#" className="hover:text-black transition-colors">Contacto</a>
        </div>
      </div>
      
    </div>
    
  );
};

export default PaginaLogin;

