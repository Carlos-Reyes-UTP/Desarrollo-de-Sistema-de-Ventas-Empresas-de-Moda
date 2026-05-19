import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, Building2, Loader2, AlertCircle } from 'lucide-react';
import type { Proveedor } from '../../types/Proveedor';
import { ProveedorService } from '../../services/ProveedorService';
import { ConfirmModal, Skeleton } from '@/shared/ui';

const GestionProveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresOriginal, setProveedoresOriginal] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [proveedorEditar, setProveedorEditar] = useState<Proveedor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; proveedorId: number | null }>({ open: false, proveedorId: null });
  const [ultimaCargaLista, setUltimaCargaLista] = useState<string | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    ruc: ''
  });

  // Paginación de proveedores
  const [paginaActual, setPaginaActual] = useState(1);
  const proveedoresPorPagina = 10;
  const totalPaginas = Math.ceil(proveedores.length / proveedoresPorPagina);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const data = await ProveedorService.obtenerTodosProveedores();
      setProveedores(data);
      setProveedoresOriginal(data);
      setUltimaCargaLista(
        new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
      );
    } catch (err) {
      setError('Error al cargar proveedores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cerrarModalConAnimacion = () => {
    setCerrandoModal(true);
    setTimeout(() => {
      setShowFormulario(false);
      setCerrandoModal(false);
      setFormData({ nombre: '', ruc: '' });
      setProveedorEditar(null);
      setError(null);
    }, 300);
  };

  const verificarRUC = async () => {
    if (!formData.ruc.trim()) {
      setError('Ingrese un RUC para buscar');
      return;
    }
    
    if (!/^\d{11}$/.test(formData.ruc)) {
      setError('El RUC debe tener 11 dígitos');
      return;
    }

    setError(null);
    setBuscandoProveedor(true);
    
    try {
      const proveedoresExistentes = await ProveedorService.obtenerTodosProveedores();
      const existente = proveedoresExistentes.find(p => p.ruc === formData.ruc);
      
      if (existente) {
        setError(`El proveedor con RUC ${formData.ruc} ya existe como "${existente.nombre}"`);
        setBuscandoProveedor(false);
        return;
      }
      
      try {
        const proveedorEncontrado = await ProveedorService.obtenerProveedorPorRUC(formData.ruc);
        if (proveedorEncontrado) {
          setFormData(prev => ({
            ...prev,
            nombre: proveedorEncontrado.nombre
          }));
          setError(null);
        } else {
          setError('No se encontró información del proveedor con este RUC');
        }
      } catch (err) {
        console.error('Error al buscar proveedor por RUC:', err);
        setError('Error al buscar información del proveedor');
      }
    } catch (err) {
      console.error('Error al verificar RUC:', err);
      setError('Error al verificar el RUC');
    } finally {
      setBuscandoProveedor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!formData.ruc.trim()) {
      setError('El RUC es requerido');
      return;
    }
    if (!/^\d{11}$/.test(formData.ruc)) {
      setError('El RUC debe tener 11 dígitos');
      return;
    }

    try {
      if (!proveedorEditar) {
        const proveedoresExistentes = await ProveedorService.obtenerTodosProveedores();
        const existente = proveedoresExistentes.find(p => p.ruc === formData.ruc);
        if (existente) {
          setError(`El proveedor con RUC ${formData.ruc} ya existe como "${existente.nombre}"`);
          return;
        }
      }

      if (proveedorEditar?.idProveedor) {
        await ProveedorService.actualizarProveedor(proveedorEditar.idProveedor, {
          ...formData,
          idProveedor: proveedorEditar.idProveedor
        });
      } else {
        await ProveedorService.crearProveedor(formData);
      }
      
      cerrarModalConAnimacion();
      cargarProveedores();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Ya existe un proveedor con ese RUC');
      } else {
        setError('Error al guardar proveedor');
      }
      console.error(err);
    }
  };

  const solicitarEliminar = (id: number) => {
    setConfirmModal({ open: true, proveedorId: id });
  };

  const confirmarEliminar = async () => {
    if (confirmModal.proveedorId == null) return;

    try {
      await ProveedorService.eliminarProveedor(confirmModal.proveedorId);
      cargarProveedores();
      setConfirmModal({ open: false, proveedorId: null });
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('No se puede eliminar el proveedor porque tiene productos asociados');
      } else {
        setError('Error al eliminar proveedor');
      }
      console.error(err);
      setConfirmModal({ open: false, proveedorId: null });
    }
  };

  const cancelarEliminar = () => {
    setConfirmModal({ open: false, proveedorId: null });
  };

  const handleEditar = (proveedor: Proveedor) => {
    setProveedorEditar(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      ruc: proveedor.ruc
    });
    setShowFormulario(true);
    setError(null);
  };

  const handleNuevo = () => {
    setProveedorEditar(null);
    setFormData({ nombre: '', ruc: '' });
    setShowFormulario(true);
    setError(null);
  };

  const handleCancelar = () => {
    cerrarModalConAnimacion();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Búsqueda en tiempo real activa por el useEffect [searchTerm]
    }
  };

  useEffect(() => {
    setPaginaActual(1);
    if (!searchTerm.trim()) {
      setProveedores(proveedoresOriginal);
    } else {
      const resultados = proveedoresOriginal.filter(proveedor =>
        proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.ruc.includes(searchTerm)
      );
      setProveedores(resultados);
    }
  }, [searchTerm, proveedoresOriginal]);

  const proveedoresPaginados = proveedores.slice(
    (paginaActual - 1) * proveedoresPorPagina,
    paginaActual * proveedoresPorPagina
  );

  return (
    <div className="max-w-[1600px] mx-auto animate-fadeIn pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.5rem] font-bold tracking-tight text-black leading-none mb-2">
            Gestión de proveedores
          </h1>
          <p className="text-gray-500 text-sm max-w-lg font-medium">
            Administración centralizada de socios estratégicos y logística para DK-SYSTEM.
          </p>
          {ultimaCargaLista && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1 font-semibold text-gray-700 shadow-sm">
                {proveedoresOriginal.length}{" "}
                {proveedoresOriginal.length === 1 ? "proveedor registrado" : "proveedores registrados"}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-3 py-1 font-medium">
                Datos cargados · {ultimaCargaLista}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleNuevo}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Primary Filters Bar */}
      <div className="bg-white rounded-[2rem] p-8 mb-8 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-8 items-end">
          
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Buscar Proveedor
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Nombre o RUC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all font-medium"
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="h-[46px] flex items-center justify-center bg-[#f8f8f8] rounded-xl px-4 text-gray-400">
              <Building2 className="w-4 h-4" />
              <span className="ml-2 text-xs font-bold uppercase tracking-widest">{proveedores.length} Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-zebra">
            <thead>
              <tr className="bg-white border-b border-gray-50">
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Identidad del Socio
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  RUC / Identificación
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Estado
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading &&
                Array.from({ length: 8 }, (_, row) => (
                  <tr key={`sk-prov-${row}`}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </td>
                    <td className="px-8 py-6"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-8 py-6"><Skeleton className="h-6 w-16 rounded-lg" /></td>
                    <td className="px-8 py-6 text-right"><Skeleton className="ml-auto h-8 w-24 rounded-xl" /></td>
                  </tr>
                ))}
              {!loading && proveedores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center max-w-md mx-auto">
                      <Building2 className="w-14 h-14 text-slate-300 mb-4" />
                      <p className="text-base font-bold text-gray-900">
                        {proveedoresOriginal.length === 0
                          ? "Aún no hay proveedores"
                          : "Sin resultados para esta búsqueda"}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {proveedoresOriginal.length === 0
                          ? "Registra el primero para vincularlo a productos y compras."
                          : "Prueba con otro nombre o RUC, o borra el filtro para ver la lista completa."}
                      </p>
                      <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleNuevo}
                          className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98]"
                        >
                          <Plus className="w-4 h-4" />
                          Nuevo proveedor
                        </button>
                        {proveedoresOriginal.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98]"
                          >
                            Limpiar búsqueda
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {proveedoresPaginados.map((proveedor) => (
                <tr key={proveedor.idProveedor} className="hover:bg-slate-100/60 transition-colors duration-150 group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-lg">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-black leading-tight mb-1">
                          {proveedor.nombre}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Socio Logístico • ID {proveedor.idProveedor}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-600">
                       <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-mono font-bold tracking-tighter">
                        {proveedor.ruc}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                      <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">
                        ACTIVO
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditar(proveedor)}
                        className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => solicitarEliminar(proveedor.idProveedor!)}
                        className="p-2.5 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent text-red-400 hover:text-white"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Mostrando <span className="text-black">{proveedoresPaginados.length}</span> de <span className="text-black">{proveedores.length}</span> proveedores
        </p>
        
        <div className="flex items-center gap-1 bg-white p-1 rounded-[14px] shadow-sm border border-gray-100">
          <button
            onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
            disabled={paginaActual === 1}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setPaginaActual(num)}
                className={`w-9 h-9 flex items-center justify-center rounded-[10px] text-xs font-bold transition-all ${
                  paginaActual === num ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
            disabled={paginaActual === totalPaginas}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>

      {showFormulario && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
          <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
            <div className="p-10">
              <div className="mb-6 w-12 h-1 bg-black"></div>
              <h2 className="text-2xl font-bold tracking-tight text-black mb-2 uppercase">
                {proveedorEditar ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-gray-500 text-sm mb-10 font-medium">
                Sincronización de datos con SUNAT y gestión de registros logísticos.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    RUC / Identificación Fiscal
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.ruc}
                      onChange={(e) => {
                        if (e.target.value === '' || /^\d+$/.test(e.target.value)) {
                          setFormData(prev => ({ ...prev, ruc: e.target.value }));
                        }
                      }}
                      className="flex-1 px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all disabled:opacity-50"
                      placeholder="11 Dígitos..."
                      maxLength={11}
                      disabled={!!proveedorEditar}
                      required
                    />
                    {!proveedorEditar && (
                      <button
                        type="button"
                        onClick={verificarRUC}
                        disabled={buscandoProveedor || formData.ruc.length !== 11}
                        className="px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all shadow-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                      >
                        {buscandoProveedor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Verificar
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    Nombre o Razón Social
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                    placeholder="Nombre completo..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={handleCancelar}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-black hover:bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {proveedorEditar ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for Delete */}
      <ConfirmModal
        open={confirmModal.open}
        message="¿Estás seguro de eliminar este proveedor?"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default GestionProveedores;
