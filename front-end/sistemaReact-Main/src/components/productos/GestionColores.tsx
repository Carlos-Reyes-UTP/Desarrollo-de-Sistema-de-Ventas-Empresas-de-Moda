import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    X,
    RefreshCw,
    Loader2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import type { Color } from '../../interfaces/Color';
import { ColorService } from '../../services/ColorService';

const ColorPill: React.FC<{ hexCode?: string }> = ({ hexCode }) => (
    <div
        className="w-10 h-10 rounded-xl border border-gray-100 shadow-sm"
        style={{ backgroundColor: hexCode || '#FFFFFF' }}
    />
);

const GestionColores: React.FC = () => {
    const [colores, setColores] = useState<Color[]>([]);
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
    const [modoEdicion, setModoEdicion] = useState(false);
    const [idEditando, setIdEditando] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        codigoHex: '#000000'
    });

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [idAEliminar, setIdAEliminar] = useState<number | null>(null);

    const coloresFiltrados = colores.filter(color =>
        color.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        color.codigoHex?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const coloresPorPagina = 10;
    const totalPaginas = Math.ceil(coloresFiltrados.length / coloresPorPagina);

    useEffect(() => {
        cargarColores();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [searchTerm, loading]);

    const cargarColores = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await ColorService.getAllColores();
            setColores(data);
        } catch (err: any) {
            setError('No se pudieron sincronizar los colores: ' + (err.message || 'Error de red'));
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
            setFormData({ nombre: '', codigoHex: '#000000' });
            setModoEdicion(false);
            setIdEditando(null);
            setError(null);
        }, 300);
    };

    const handleNuevo = () => {
        setModoEdicion(false);
        setFormData({ nombre: '', codigoHex: '#000000' });
        setMostrarModal(true);
    };

    const handleEditar = (color: Color) => {
        setModoEdicion(true);
        setIdEditando(color.idColor!);
        setFormData({ nombre: color.nombre, codigoHex: color.codigoHex || '#000000' });
        setMostrarModal(true);
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre.trim()) {
            setError('El nombre del color es obligatorio.');
            return;
        }

        try {
            if (modoEdicion && idEditando) {
                await ColorService.updateColor(idEditando, { ...formData, idColor: idEditando });
                mostrarMensaje('Color actualizado con éxito', 'success');
            } else {
                await ColorService.createColor(formData);
                mostrarMensaje('Color registrado con éxito', 'success');
            }
            cerrarModalConAnimacion();
            cargarColores();
        } catch (err: any) {
            setError(err.message || 'Error al procesar la solicitud');
        }
    };

    const handleEliminar = (id: number) => {
        setIdAEliminar(id);
        setConfirmModalOpen(true);
    };

    const confirmarEliminar = async () => {
        if (idAEliminar === null) return;
        try {
            await ColorService.deleteColor(idAEliminar);
            mostrarMensaje('Registro eliminado correctamente', 'success');
            cargarColores();
        } catch (err: any) {
            mostrarMensaje('Error: El color podría estar en uso.', 'error');
        } finally {
            setConfirmModalOpen(false);
            setIdAEliminar(null);
        }
    };

    const cancelarEliminar = () => {
        setConfirmModalOpen(false);
        setIdAEliminar(null);
    };

    const coloresPaginados = coloresFiltrados.slice(
        (paginaActual - 1) * coloresPorPagina,
        paginaActual * coloresPorPagina
    );

    return (
        <div className="p-10 max-w-[1600px] mx-auto bg-[#fafafa] min-h-screen animate-fadeIn text-left">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-[2.5rem] font-bold tracking-tight text-black leading-none mb-2">
                        Gestión de colores
                    </h1>
                    <p className="text-gray-500 text-sm max-w-md font-medium">
                        Administración de la paleta cromática oficial para inventario y catálogos.
                    </p>
                </div>

                <button
                    onClick={handleNuevo}
                    className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Color
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
                        <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 text-left">Búsqueda de Cromática</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Nombre o código hexadecimal..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all font-medium border-none"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-4 lg:col-span-2">
                        <button
                            onClick={cargarColores}
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
                            <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Identidad</th>
                            <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Especificación Hex</th>
                            <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading && colores.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-black" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando paleta...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : coloresFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-8 py-20 text-center text-gray-400 italic">
                                    No se encontraron registros que coincidan con la búsqueda.
                                </td>
                            </tr>
                        ) : (
                            coloresPaginados.map((color) => (
                                <tr key={color.idColor} className="hover:bg-[#fafafa] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4 text-left">
                                            <ColorPill hexCode={color.codigoHex} />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-black">{color.nombre}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IDC-{color.idColor}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                                            {color.codigoHex}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditar(color)} className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all border border-transparent shadow-sm">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => color.idColor && handleEliminar(color.idColor)} className="p-2.5 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-transparent shadow-sm">
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
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Total: {coloresFiltrados.length} Variantes</span>
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
                                {modoEdicion ? 'Actualizar Color' : 'Nueva Variante'}
                            </h2>
                            <p className="text-gray-500 text-sm mb-10 font-medium">Defina los parámetros técnicos de la variante cromática.</p>

                            <form onSubmit={handleGuardar} className="space-y-8">
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Denominación del Color</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-5 py-4 bg-[#f8f8f8] rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all border-none"
                                        placeholder="Ej: Negro Industrial, Azul Cobalto..."
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Muestra Hexadecimal</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="color"
                                            value={formData.codigoHex}
                                            onChange={(e) => setFormData({ ...formData, codigoHex: e.target.value })}
                                            className="w-16 h-16 rounded-xl border-none p-0 cursor-pointer overflow-hidden bg-transparent shadow-md"
                                        />
                                        <input
                                            type="text"
                                            value={formData.codigoHex}
                                            onChange={(e) => setFormData({ ...formData, codigoHex: e.target.value })}
                                            className="flex-1 px-5 py-4 bg-[#f8f8f8] rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all border-none font-mono"
                                            placeholder="#000000"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 border-t border-gray-50">
                                    <button type="button" onClick={cerrarModalConAnimacion} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100">Cancelar</button>
                                    <button type="submit" className="flex-1 py-4 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-gray-800">Sincronizar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirmModalOpen}
                message="¿Estás seguro de que deseas eliminar este color? Esta acción no se puede deshacer."
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

export default GestionColores;
