import React, { useState, useEffect } from 'react';
import { MaterialIcon } from '@/shared/ui';
import type { Proveedor } from '../../types/Proveedor';
import { ProveedorService } from '../../services/ProveedorService';
import { ConfirmModal, Skeleton, PageHeader, PageHeaderMetaChip, PageActionButton, PageActionGroup, ModalPortal, ModalMotionOverlay, useModalBodyScrollLock, useModalMotion } from '@/shared/ui';
import { mensajeErrorRuc } from '../../utils/validarDocumentosPeru';

const GestionProveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresOriginal, setProveedoresOriginal] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulario, setShowFormulario] = useState(false);
  const { overlayClass, panelClass, shouldRender: shouldRenderFormulario, requestClose: requestCloseFormulario } = useModalMotion({ open: showFormulario });
  const [proveedorEditar, setProveedorEditar] = useState<Proveedor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorRucInline, setErrorRucInline] = useState<string | null>(null);
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

  useModalBodyScrollLock(showFormulario);

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
    requestCloseFormulario(() => {
      setShowFormulario(false);
      setFormData({ nombre: '', ruc: '' });
      setProveedorEditar(null);
      setError(null);
      setErrorRucInline(null);
    });
  };

  const verificarRUC = async () => {
    const errRuc = mensajeErrorRuc(formData.ruc);
    if (errRuc) {
      setError(errRuc);
      setErrorRucInline(errRuc);
      return;
    }
    setErrorRucInline(null);

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
    const errRuc = mensajeErrorRuc(formData.ruc);
    if (errRuc) {
      setError(errRuc);
      setErrorRucInline(errRuc);
      return;
    }
    setErrorRucInline(null);

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
    setErrorRucInline(null);
  };

  const handleNuevo = () => {
    setProveedorEditar(null);
    setFormData({ nombre: '', ruc: '' });
    setShowFormulario(true);
    setError(null);
    setErrorRucInline(null);
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
    <div className="max-w-[1600px] mx-auto pb-8">
      <PageHeader
        surface="elevated"
        eyebrow="Catálogo · Proveedores"
        title="Gestión de proveedores"

        actions={
          <PageActionGroup>
            <PageActionButton grouped onClick={handleNuevo}>
              <MaterialIcon icon="add" className="w-4 h-4" />
              Nuevo Proveedor
            </PageActionButton>
          </PageActionGroup>
        }
      />

      {/* Primary Filters Bar */}
      <div className="bg-app-surface/80 backdrop-blur-md rounded-3xl p-4 mb-10 shadow-sm border border-app-border sticky top-4 z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          <div className="lg:col-span-5 relative group">
            <MaterialIcon icon="search" className="w-4 h-4 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="Razon Social o RUC"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full pl-12 pr-6 py-4 bg-app-input border border-app-border rounded-2xl text-sm focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all font-bold text-app-text placeholder:text-app-text-muted"
            />
          </div>

          <div className="lg:col-span-3">
            <div className="h-[56px] flex items-center justify-between bg-app-bg-muted border border-app-border rounded-2xl px-6 text-app-text">
              <div className="flex items-center gap-3">
                <MaterialIcon icon="corporate_fare" className="w-4 h-4 text-gray-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total</span>
              </div>
              <span className="text-xl font-black tabular-nums">{proveedores.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-app-surface rounded-2xl shadow-sm border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-app-surface border-b border-app-border">
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-app-text-muted uppercase">
                  Identidad del Socio
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-app-text-muted uppercase">
                  RUC / Identificación
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-app-text-muted uppercase">
                  Estado
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-app-text-muted uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
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
                  <td colSpan={4} className="px-8 py-16 text-center bg-app-bg-muted">
                    <div className="flex flex-col items-center max-w-md mx-auto">
                      <MaterialIcon icon="corporate_fare" className="w-14 h-14 text-app-text-muted mb-4" />
                      <p className="text-base font-bold text-app-text">
                        {proveedoresOriginal.length === 0
                          ? "Aún no hay proveedores"
                          : "Sin resultados para esta búsqueda"}
                      </p>
                      <p className="text-sm text-app-text-muted mt-2">
                        {proveedoresOriginal.length === 0
                          ? "Registra el primero para vincularlo a productos y compras."
                          : "Prueba con otro nombre o RUC, o borra el filtro para ver la lista completa."}
                      </p>
                      <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleNuevo}
                          className="inline-flex items-center gap-2 rounded-xl bg-app-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-app-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                        >
                          <MaterialIcon icon="add" className="w-4 h-4" />
                          Nuevo proveedor
                        </button>
                        {proveedoresOriginal.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-app-text shadow-sm transition-all hover:bg-app-hover-overlay active:scale-[0.98]"
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
                <tr key={proveedor.idProveedor} className="hover:bg-app-hover-overlay transition-colors duration-150 group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-app-accent flex items-center justify-center text-app-accent-fg shadow-lg">
                        <MaterialIcon icon="corporate_fare" className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-app-text leading-tight mb-1">
                          {proveedor.nombre}
                        </span>
                        <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider">
                          Socio Logístico • ID {proveedor.idProveedor}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-app-text-muted">
                       <span className="px-3 py-1 bg-app-bg-muted rounded-lg text-sm font-mono font-bold tracking-tighter text-app-text">
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
                    <div className="flex items-center justify-end gap-2 text-app-text-muted opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditar(proveedor)}
                        className="p-2.5 hover:bg-app-accent hover:text-app-accent-fg rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent"
                        title="Editar"
                      >
                        <MaterialIcon icon="edit" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => solicitarEliminar(proveedor.idProveedor!)}
                        className="p-2.5 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent text-red-400 hover:text-white"
                        title="Eliminar"
                      >
                        <MaterialIcon icon="delete" className="w-4 h-4" />
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
        <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest">
          Mostrando <span className="text-app-text">{proveedoresPaginados.length}</span> de <span className="text-app-text">{proveedores.length}</span> proveedores
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

      {shouldRenderFormulario && (
        <ModalPortal>
        <ModalMotionOverlay
          overlayClass={overlayClass}
          onClick={cerrarModalConAnimacion}
          className="app-modal-overlay"
          scrimClassName="bg-black/50"
        >
          <div
            className={`relative z-10 bg-app-surface rounded-[2.5rem] shadow-xl w-full max-w-lg overflow-hidden border border-app-border ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-12">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-[24px] font-black tracking-tighter text-app-text uppercase">
                    {proveedorEditar ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">
                    Registro de Socios Logísticos
                  </p>
                </div>
                <button
                  onClick={cerrarModalConAnimacion}
                  className="p-3 bg-app-bg-muted hover:bg-app-hover-overlay rounded-2xl transition-colors text-app-text-muted"
                >
                  <MaterialIcon icon="add" className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                {error && (
                  <div className="bg-red-50 p-5 rounded-2xl border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <MaterialIcon icon="error" className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <label className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
                    RUC / Identificación Fiscal
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.ruc}
                      onChange={(e) => {
                        if (e.target.value === '' || /^\d+$/.test(e.target.value)) {
                          setFormData(prev => ({ ...prev, ruc: e.target.value }));
                          if (errorRucInline) setErrorRucInline(null);
                        }
                      }}
                      onBlur={() => {
                        if (!proveedorEditar && formData.ruc.trim()) {
                          setErrorRucInline(mensajeErrorRuc(formData.ruc));
                        }
                      }}
                      className={`flex-1 px-6 py-5 bg-app-input border-2 rounded-2xl text-sm font-black text-app-text focus:bg-app-surface focus:border-app-border-strong transition-all outline-none disabled:opacity-50 ${
                        errorRucInline
                          ? 'border-red-500'
                          : 'border-transparent'
                      }`}
                      placeholder="11 Dígitos..."
                      maxLength={11}
                      disabled={!!proveedorEditar}
                      required
                    />
                    {!proveedorEditar && (
                      <button
                        type="button"
                        onClick={verificarRUC}
                        disabled={buscandoProveedor || !!mensajeErrorRuc(formData.ruc)}
                        className="px-6 py-4 bg-app-accent text-app-accent-fg rounded-2xl hover:opacity-90 disabled:opacity-30 transition-all shadow-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                      >
                        {buscandoProveedor ? <MaterialIcon icon="sync" className="w-4 h-4 animate-spin" /> : <MaterialIcon icon="search" className="w-4 h-4" />}
                        Verificar
                      </button>
                    )}
                  </div>
                  {errorRucInline && (
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider pl-1 animate-fadeIn">
                      <MaterialIcon icon="error" className="w-3.5 h-3.5 flex-shrink-0" />
                      {errorRucInline}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
                    Nombre o Razón Social
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-6 py-5 bg-app-input border-2 border-transparent rounded-2xl text-sm font-black text-app-text focus:bg-app-surface focus:border-app-border-strong transition-all outline-none"
                    placeholder="Nombre completo..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelar}
                    className="flex-1 py-5 bg-app-bg-muted hover:bg-app-hover-overlay text-app-text rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-5 bg-app-accent hover:opacity-90 text-app-accent-fg rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <MaterialIcon icon="save" className="w-4 h-4" />
                    <span>{proveedorEditar ? 'Actualizar' : 'Guardar'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalMotionOverlay>
        </ModalPortal>
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
