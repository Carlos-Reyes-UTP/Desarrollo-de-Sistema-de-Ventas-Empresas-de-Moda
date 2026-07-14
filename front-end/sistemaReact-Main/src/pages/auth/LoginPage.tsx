import { useState, useEffect, useRef } from 'react';
import { MaterialIcon } from '@/shared/ui';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const LoginPage = () => {
  const [usuario, setUsuario] = useState(() => sessionStorage.getItem('login_usuario') ?? '');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordarme, setRecordarme] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const claveInputRef = useRef<HTMLInputElement>(null);
  const { iniciarSesion, error: authError } = useAuth();
  const navegar = useNavigate();

  const enfocarClave = () => {
    globalThis.requestAnimationFrame(() => {
      claveInputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (authError) {
      setError(authError);
      setIniciando(false);
      enfocarClave();
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

    sessionStorage.setItem('login_usuario', usuario);

    try {
      setIniciando(true);
      const exito = await iniciarSesion({ usuario, clave });

      if (exito) {
        sessionStorage.removeItem('login_usuario');
        navegar('/');
      } else {
        setError('Credenciales incorrectas. Por favor, intente nuevamente.');
        setIniciando(false);
        enfocarClave();
      }
    } catch (err: unknown) {
      console.error('Error en el manejo de inicio de sesión:', err);
      setError('Error al intentar iniciar sesión. Inténtelo más tarde.');
      setIniciando(false);
      enfocarClave();
    }
  };

  const inputClassName =
    'w-full px-5 py-4 bg-[#f5f5f5] border border-[#eeeeee] rounded-2xl text-[#0a0a0a] text-[15px] focus:outline-none focus:bg-white focus:border-neutral-300 focus:ring-4 focus:ring-neutral-100 transition-all placeholder:text-neutral-400 font-medium';

  return (
    <div
      data-theme="classic"
      style={{ colorScheme: 'light' }}
      className="flex min-h-screen w-full bg-[#fafafa] font-sans text-[#0a0a0a] overflow-x-hidden relative"
    >
      <div
        className="fixed top-0 left-0 right-0 h-8 pointer-events-none z-[9999] md:flex hidden"
        style={{ WebkitAppRegion: 'drag' } as Record<string, string>}
      />

      <style>{`
        @keyframes floatSoft1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(3%, 4%) scale(1.04); }
        }
        @keyframes floatSoft2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-4%, -3%) scale(1.05); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-soft-1 { animation: floatSoft1 28s infinite ease-in-out; }
        .animate-float-soft-2 { animation: floatSoft2 34s infinite ease-in-out; }
        .animate-form-enter { animation: fadeSlideIn 0.4s ease-out both; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #f5f5f5 inset !important;
          -webkit-text-fill-color: #0a0a0a !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Panel marca — soft charcoal, marca como héroe */}
      <div className="hidden md:flex md:w-[46%] flex-col relative overflow-hidden bg-[#111111] text-white">
        {/* Textura / atmósfera */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full bg-white/[0.06] blur-2xl animate-float-soft-1" />
          <div className="absolute -bottom-28 -left-16 w-[380px] h-[380px] rounded-full bg-white/[0.04] blur-2xl animate-float-soft-2" />
          {/* Bloques soft tipo vitrina moda */}
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-[42%] max-w-[220px] space-y-3 opacity-40">
            <div className="h-28 rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="h-40 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent" />
            <div className="h-20 rounded-2xl border border-white/10 bg-white/[0.04]" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full p-12 lg:px-14 lg:py-12">
          <div aria-hidden className="h-10" />

          <div className="max-w-[340px]">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45 mb-5">Gestión de moda</p>
            <h1 className="text-[3.25rem] lg:text-[3.75rem] leading-[0.95] font-semibold tracking-[-0.04em] text-white">
              DK
              <span className="text-white/35">-</span>
              SYSTEM
            </h1>
            <p className="mt-6 text-[15px] leading-relaxed text-white/55 max-w-[280px]">
              Controla ventas, inventario y clientes desde un entorno pensado para retail.
            </p>
            <div className="mt-10 flex flex-wrap gap-2">
              {['Ventas', 'Inventario', 'Clientes'].map((label) => (
                <span
                  key={label}
                  className="px-3.5 py-1.5 rounded-full border border-white/15 bg-white/[0.06] text-[12px] tracking-wide text-white/70"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <p className="text-[11px] tracking-[0.08em] text-white/35">© DK-SYSTEM</p>
        </div>
      </div>

      {/* Panel formulario */}
      <div className="w-full md:w-[54%] flex flex-col items-center justify-center p-6 md:p-12 bg-[#f7f7f7] relative min-h-screen">
        <div className="w-full max-w-[460px] animate-form-enter rounded-[28px] border border-black/[0.06] bg-white px-8 py-10 md:px-10 md:py-12 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          {/* Marca compacta en móvil */}
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-[0.2em] text-[#0a0a0a]">DK-SYSTEM</span>
          </div>

          <h2 className="text-[1.75rem] font-semibold text-[#0a0a0a] mb-2 tracking-tight">Iniciar sesión</h2>
          <p className="text-[15px] text-neutral-500 mb-9">Ingresa tus credenciales para continuar</p>

          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3.5 bg-red-50 text-red-600 text-sm font-medium border border-red-100 rounded-2xl flex items-start"
            >
              <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={manejarSubmit} className="space-y-5">
            <div>
              <label htmlFor="usuario" className="block text-xs font-medium text-neutral-500 mb-2 ml-0.5 text-left">
                Usuario
              </label>
              <input
                type="text"
                id="usuario"
                className={inputClassName}
                placeholder="usuario@dk-system.com"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="clave" className="block text-xs font-medium text-neutral-500 mb-2 ml-0.5 text-left">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={mostrarClave ? 'text' : 'password'}
                  id="clave"
                  ref={claveInputRef}
                  className={`${inputClassName} pr-12 tracking-[0.2em] placeholder:tracking-normal`}
                  placeholder="••••••••••••"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave(!mostrarClave)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#0a0a0a] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 rounded"
                  aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarClave ? (
                    <MaterialIcon icon="visibility_off" className="w-5 h-5" />
                  ) : (
                    <MaterialIcon icon="visibility" className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
                    className="peer appearance-none w-[18px] h-[18px] border border-neutral-300 rounded-full checked:bg-[#0a0a0a] checked:border-[#0a0a0a] transition-colors focus:ring-2 focus:ring-neutral-200 focus:outline-none"
                    checked={recordarme}
                    onChange={(e) => setRecordarme(e.target.checked)}
                  />
                  <svg
                    className="absolute w-[10px] h-[10px] text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3.5}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-neutral-500 group-hover:text-[#0a0a0a] transition-colors">
                  Recordar dispositivo
                </span>
              </label>

              <a
                href="#"
                className="text-sm font-medium text-[#0a0a0a] hover:opacity-70 transition-opacity"
              >
                ¿Olvidó su clave?
              </a>
            </div>

            <button
              type="submit"
              disabled={iniciando}
              className="w-full mt-2 py-4 px-8 bg-[#0a0a0a] hover:bg-neutral-800 active:scale-[0.99] transition-all text-white font-semibold tracking-[0.08em] text-sm uppercase rounded-full flex items-center justify-center gap-3 disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span>{iniciando ? 'Procesando...' : 'Iniciar sesión'}</span>
              {iniciando ? (
                <svg className="animate-spin h-[18px] w-[18px] text-white" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : null}
            </button>
          </form>

          <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] tracking-[0.04em] text-neutral-400">
            <a href="#" className="hover:text-[#0a0a0a] transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-[#0a0a0a] transition-colors">
              Términos
            </a>
            <a href="#" className="hover:text-[#0a0a0a] transition-colors">
              Seguridad
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
