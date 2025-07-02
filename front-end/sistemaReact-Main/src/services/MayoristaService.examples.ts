// 📋 EJEMPLOS DE USO DEL MAYORISTA SERVICE
// Guía rápida para implementar los endpoints en tus componentes React

import { MayoristaService } from '../services/MayoristaService';
import type { MayoristaDTO, CrearMayoristaCompletoDTO } from '../interfaces/MayoristaDTO';

// 🎯 EJEMPLOS PRÁCTICOS DE USO

// ═══════════════════════════════════════════════════════════════
// 📋 1. OBTENER TODOS LOS MAYORISTAS (Para listados/tablas)
// ═══════════════════════════════════════════════════════════════
const EjemploListarMayoristas = async () => {
  try {
    const mayoristas = await MayoristaService.obtenerTodosMayoristas();
    console.log('Lista de mayoristas:', mayoristas);
    // Usar en: Tabla de mayoristas, selectores, etc.
  } catch (error) {
    console.error('Error al obtener mayoristas:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔍 2. BUSCAR MAYORISTA POR CÓDIGO (Para facturas/ventas)
// ═══════════════════════════════════════════════════════════════
const EjemploBuscarPorCodigo = async (codigo: string) => {
  try {
    const mayorista = await MayoristaService.obtenerMayoristaPorCodigo(codigo);
    if (mayorista) {
      console.log(`Mayorista encontrado: ${mayorista.nombreCliente}`);
      // Aplicar descuentos de mayorista
      // Mostrar precios especiales
    } else {
      console.log('Código de mayorista no encontrado');
      // Tratar como cliente regular
    }
  } catch (error) {
    console.error('Error al buscar mayorista:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// 📄 3. VERIFICAR SI ES MAYORISTA POR DOCUMENTO
// ═══════════════════════════════════════════════════════════════
const EjemploVerificarMayorista = async (numeroDocumento: string) => {
  try {
    const esMayorista = await MayoristaService.esMayorista(numeroDocumento);
    if (esMayorista) {
      const mayorista = await MayoristaService.obtenerMayoristaPorDocumento(numeroDocumento);
      console.log(`Cliente es mayorista: ${mayorista?.codigoMayorista}`);
      // Activar modo mayorista en la venta
    } else {
      console.log('Cliente no es mayorista');
      // Continuar como venta regular
    }
  } catch (error) {
    console.error('Error al verificar mayorista:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ⬆️ 4. PROMOCIONAR CLIENTE EXISTENTE A MAYORISTA
// ═══════════════════════════════════════════════════════════════
const EjemploPromoverCliente = async (idCliente: number) => {
  try {
    const nuevoMayorista = await MayoristaService.crearMayoristaDeClienteExistente(idCliente);
    console.log(`Cliente promocionado! Código: ${nuevoMayorista.codigoMayorista}`);
    // Mostrar notificación de éxito
    // Actualizar UI para reflejar el cambio
  } catch (error) {
    console.error('Error al promocionar cliente:', error);
    // El cliente podría ya ser mayorista
  }
};

// ═══════════════════════════════════════════════════════════════
// ➕ 5. CREAR MAYORISTA COMPLETO DESDE CERO
// ═══════════════════════════════════════════════════════════════
const EjemploCrearMayoristaCompleto = async () => {
  const nuevoMayorista: CrearMayoristaCompletoDTO = {
    nombreCliente: "Distribuidora El Rosario S.A.C.",
    tipoCliente: "RUC",
    numeroDocumento: "20123456789"
  };

  try {
    const mayorista = await MayoristaService.crearMayoristaCompleto(nuevoMayorista);
    console.log(`Mayorista creado! Código: ${mayorista.codigoMayorista}`);
    // Redirigir a la página del mayorista
    // Mostrar código generado al usuario
  } catch (error) {
    console.error('Error al crear mayorista:', error);
    // Documento podría estar duplicado
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 6. ACTUALIZAR DATOS DE MAYORISTA
// ═══════════════════════════════════════════════════════════════
const EjemploActualizarMayorista = async (id: number) => {
  try {
    const datosActualizados = {
      nombreCliente: "Nuevo Nombre de la Empresa"
    };
    
    const mayoristaActualizado = await MayoristaService.actualizarMayorista(id, datosActualizados);
    console.log('Mayorista actualizado:', mayoristaActualizado);
    // Actualizar estado del componente
  } catch (error) {
    console.error('Error al actualizar mayorista:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// 🗑️ 7. ELIMINAR MAYORISTA (Quitar privilegios)
// ═══════════════════════════════════════════════════════════════
const EjemploEliminarMayorista = async (id: number) => {
  try {
    const eliminado = await MayoristaService.eliminarMayorista(id);
    if (eliminado) {
      console.log('Privilegios de mayorista removidos');
      // El cliente sigue existiendo como cliente regular
    } else {
      console.log('Mayorista no encontrado');
    }
  } catch (error) {
    console.error('Error al eliminar mayorista:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔍 8. BÚSQUEDA INTELIGENTE (Código o documento)
// ═══════════════════════════════════════════════════════════════
const EjemploBusquedaInteligente = async (termino: string) => {
  try {
    const resultados = await MayoristaService.buscarMayoristas(termino);
    if (resultados.length > 0) {
      console.log('Mayoristas encontrados:', resultados);
      // Mostrar resultados en un dropdown
    } else {
      console.log('No se encontraron mayoristas con ese término');
    }
  } catch (error) {
    console.error('Error en búsqueda:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// 🎯 HOOK PERSONALIZADO PARA COMPONENTES REACT
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';

export const useMayoristas = () => {
  const [mayoristas, setMayoristas] = useState<MayoristaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarMayoristas = async () => {
    try {
      setLoading(true);
      const data = await MayoristaService.obtenerTodosMayoristas();
      setMayoristas(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar mayoristas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMayoristas();
  }, []);

  return {
    mayoristas,
    loading,
    error,
    recargar: cargarMayoristas
  };
};

// ═══════════════════════════════════════════════════════════════
// 💡 CONSEJOS DE IMPLEMENTACIÓN
// ═══════════════════════════════════════════════════════════════

/*
🎯 CASOS DE USO PRINCIPALES:

1. 📊 PANEL DE ADMINISTRACIÓN:
   - Usar obtenerTodosMayoristas() para tabla
   - Usar crearMayoristaCompleto() para registro
   - Usar actualizarMayorista() para edición

2. 🛒 SISTEMA DE VENTAS:
   - Usar obtenerMayoristaPorCodigo() para aplicar descuentos
   - Usar esMayorista() para verificar estado
   - Usar obtenerMayoristaPorDocumento() para búsqueda

3. 👥 GESTIÓN DE CLIENTES:
   - Usar crearMayoristaDeClienteExistente() para promociones
   - Usar eliminarMayorista() para degradar
   - Usar buscarMayoristas() para búsquedas rápidas

🚀 MEJORES PRÁCTICAS:

- Siempre manejar errores con try/catch
- Usar loading states para UX
- Implementar búsqueda con debounce
- Cachear resultados cuando sea posible
- Validar permisos de usuario (solo admin)

🔐 SEGURIDAD:

- Estos endpoints son solo para ADMIN (/api/admin/...)
- Verificar roles antes de mostrar opciones
- Implementar confirmaciones para eliminaciones
- Logs de auditoría para cambios importantes
*/

export default {
  EjemploListarMayoristas,
  EjemploBuscarPorCodigo,
  EjemploVerificarMayorista,
  EjemploPromoverCliente,
  EjemploCrearMayoristaCompleto,
  EjemploActualizarMayorista,
  EjemploEliminarMayorista,
  EjemploBusquedaInteligente,
  useMayoristas
};
