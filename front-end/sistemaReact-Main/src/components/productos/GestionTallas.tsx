import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,

    X,
    Ruler,
    RefreshCw,
    Loader2,
    AlertCircle,
    CheckCircle,
    
} from 'lucide-react';
import type { Talla } from '../../interfaces/Talla';
import { TallaService } from '../../services/TallaService';

const GestionTallas: React.FC = () => {
    const [tallas, setTallas] = useState<Talla[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [mensajeAccion, setMensajeAccion] = useState<{ texto: string; tipo: 'success' | 'error'; visible: boolean }>({
        texto: '',
        tipo: 'success',
        visible: false
    });

    // Estados para el modal
    const [mostrarModal, setMostrarModal] = useState(false);
    const [cerrandoModal, setCerrandoModal] = useState(false);
    const [tallaEditar, setTallaEditar] = useState<Talla | null>(null);
    const [formData, setFormData] = useState({
        nombreTalla: '',
        descripcion: ''
    });

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [idAEliminar, setIdAEliminar] = useState<number | null>(null);

    const tallasFiltradas = tallas.filter(talla =>
        talla.nombreTalla.toLowerCase().includes(searchTerm.toLowerCase()) ||
        talla.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const tallasPorPagina = 10;
    const totalPaginas = Math.ceil(tallasFiltradas.length / tallasPorPagina);

    useEffect(() => {
        cargarTallas();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [searchTerm, loading]);

    const cargarTallas = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await TallaService.getTallasOrdenadas();
            setTallas(data);
        } catch (err: any) {
            setError('Error al sincronizar las tallas del catálogo.');
        } finally {
            setLoading(false);
        }
    };

    const mostrarMensaje = (texto: string, tipo: 'success' | 'error') => {
        setMensajeAccion({ texto, tipo, visible: true });
        setTimeout(() => setMensajeAccion(prev => ({ ...prev, visible: false })), 5000);
    };

    const cerrarModalConAnimacion = () => {
        setCerrandoModal(true);
        setTimeout(() => {
            setMostrarModal(false);
            setCerrandoModal(false);
            setFormData({ nombreTalla: '', descripcion: '' });
            setTallaEditar(null);
            setError(null);
        }, 300);
    };

    const handleNuevo = () => {
        setTallaEditar(null);
        setFormData({ nombreTalla: '', descripcion: '' });
        setMostrarModal(true);
    };

    const handleEditar = (talla: Talla) => {
        setTallaEditar(talla);
        setFormData({
            nombreTalla: talla.nombreTalla,
            descripcion: talla.descripcion || ''
        });
        setMostrarModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombreTalla.trim()) {
            setError('La denominación de la talla es obligatoria.');
            return;
        }

        try {
            const tallaData = {
                nombreTalla: formData.nombreTalla,
                descripcion: formData.descripcion || undefined
            };

            if (tallaEditar?.idTalla) {
                await TallaService.updateTalla(tallaEditar.idTalla, {
                    ...tallaData,
                    idTalla: tallaEditar.idTalla
                });
                mostrarMensaje('Talla actualizada correctamente', 'success');
            } else {
                await TallaService.createTalla(tallaData);
                mostrarMensaje('Nueva talla registrada con éxito', 'success');
            }
            
            cerrarModalConAnimacion();
            cargarTallas();
        } catch (err) {
            setError('Error interno al guardar la configuración de talla.');
        }
    };

    const handleEliminar = (id: number) => {
        setIdAEliminar(id);
        setConfirmModalOpen(true);
    };

    const confirmarEliminar = async () => {
        if (idAEliminar === null) return;
        try {
            await TallaService.deleteTalla(idAEliminar);
            mostrarMensaje('Talla eliminada correctamente', 'success');
            cargarTallas();
        } catch (err) {
            mostrarMensaje('Error: La talla podría estar en uso.', 'error');
        } finally {
            setConfirmModalOpen(false);
            setIdAEliminar(null);
        }
    };

    const cancelarEliminar = () => {
        setConfirmModalOpen(false);
        setIdAEliminar(null);
    };

    const tallasPaginadas = tallasFiltradas.slice(
        (paginaActual - 1) * tallasPorPagina,
        paginaActual * tallasPorPagina
    );

    return (
        <div className="p-10 max-w-[1600px] mx-auto bg-[#fafafa] min-h-screen animate-fadeIn text-left">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-[2.5rem] font-bold tracking-tight text-black leading-none mb-2">
                        Gestión de tallas
                    </h1>
                    <p className="text-gray-500 text-sm max-w-md font-medium">
                        Administración de escalas de tallaje y dimensiones para prendas y accesorios.
                    </p>
                </div>

                <button
                    onClick={handleNuevo}
                    className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Talla
                </button>
            </div>

            {/* Action Messages */}
            {mensajeAccion.visible && (
                <div className={`mb-8 p-5 rounded-[1.5rem] border flex items-center justify-between shadow-sm animate-fadeIn ${
                    mensajeAccion.tipo === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                    <div className="flex items-center gap-3">
                        {mensajeAccion.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">{mensajeAccion.texto}</span>
                    </div>
                    <button onClick={() => setMensajeAccion(prev => ({ ...prev, visible: false }))}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-white rounded-[2rem] p-8 mb-8 shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    <div className="md:col-span-8 lg:col-span-10">
                        <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 text-left">Identificador o Descriptor</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Nombre de la talla..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all font-medium border-none"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-4 lg:col-span-2">
                        <button
                            onClick={cargarTallas}
                            className="w-full h-[46px] bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Recargar
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-gray-50">
                            <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Configuración de Talla</th>
                            <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Detalle Técnico</th>
                            <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading && tallas.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-black" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando tallajes...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : tallasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-8 py-20 text-center text-gray-400 italic">
                                    Sin coincidencias en la base de datos de tallas.
                                </td>
                            </tr>
                        ) : (
                            tallasPaginadas.map((talla) => (
                                <tr key={talla.idTalla} className="hover:bg-[#fafafa] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black text-white shadow-lg">
                                                <Ruler className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-black uppercase">{talla.nombreTalla}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Talla</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                                            {talla.descripcion || 'Sin descripción técnica registrada.'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditar(talla)} className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all border border-transparent shadow-sm">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => talla.idTalla && handleEliminar(talla.idTalla)} className="p-2.5 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-transparent shadow-sm">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-6 px-8">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Total: {tallasFiltradas.length} Clasificaciones</span>
                {totalPaginas > 1 && (
                    <div className="flex gap-2 p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                            <button
                                key={n}
                                onClick={() => setPaginaActual(n)}
                                className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${paginaActual === n ? 'bg-black text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {mostrarModal && (
                <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
                    <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
                        <div className="p-10 text-left">
                            <div className="mb-6 w-12 h-1 bg-black"></div>
                            <h2 className="text-2xl font-bold tracking-tight text-black mb-2 uppercase">
                                {tallaEditar ? 'Modificar Talla' : 'Nueva Medida'}
                            </h2>
                            <p className="text-gray-500 text-sm mb-10 font-medium">Establezca los parámetros dimensionales de la nueva variante.</p>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Denominación Técnica</label>
                                    <input
                                        type="text"
                                        value={formData.nombreTalla}
                                        onChange={(e) => setFormData({ ...formData, nombreTalla: e.target.value })}
                                        className="w-full px-5 py-4 bg-[#f8f8f8] rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all border-none"
                                        placeholder="Ej: Extra Grande, 42, S, XL..."
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descripción Adicional</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full px-5 py-4 bg-[#f8f8f8] rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all border-none min-h-[120px] resize-none"
                                        placeholder="Detalles sobre el tallaje o equivalencias..."
                                    />
                                </div>

                                <div className="flex gap-4 pt-6 border-t border-gray-50">
                                    <button type="button" onClick={cerrarModalConAnimacion} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100">Cancelar</button>
                                    <button type="submit" className="flex-1 py-4 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-gray-800">Confirmar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                open={confirmModalOpen}
                message="¿Estás seguro de que deseas eliminar esta talla? Revise que no existan productos vinculados."
                onConfirm={confirmarEliminar}
                onCancel={cancelarEliminar}
            />
        </div>
    );
};

const ConfirmModal: React.FC<{
    open: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ open, message, onConfirm, onCancel }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md relative animate-scaleIn">
                <div className="mb-6 w-12 h-1 bg-red-500"></div>
                <h2 className="text-2xl font-bold tracking-tight text-black mb-4 uppercase">
                    Confirmar Eliminación
                </h2>
                <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">
                    {message}
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={onCancel} 
                        className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="flex-1 py-4 bg-black hover:bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GestionTallas;
