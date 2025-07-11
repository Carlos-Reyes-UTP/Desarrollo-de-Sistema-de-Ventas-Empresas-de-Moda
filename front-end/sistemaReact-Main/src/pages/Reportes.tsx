import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { VentaService } from '../services/VentaServices';
import { DashboardService } from '../services/DashboardService';
import type { Venta } from '../interfaces/Venta';
import type { DetalleVenta } from '../interfaces/DetalleVenta';
import type { ProductoInventario } from '../interfaces/DashboardStats';

type VentasPorMes = { mes: string; total: number }[];
type VentasPorDia = { fecha: string; total: number }[];
type TopProducto = { nombre: string; cantidad: number }[];
type TopCliente = { nombre: string; total: number; compras: number }[];

function agruparVentasPorMes(ventas: Venta[]): VentasPorMes {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const agrupado = Array(12).fill(0);
  ventas.forEach((v: Venta) => {
    const mes = new Date(v.fechaVenta).getMonth();
    agrupado[mes] += v.totalVentas;
  });
  return meses.map((nombre, i) => ({ mes: nombre, total: agrupado[i] }));
}

function agruparVentasPorDia(ventas: Venta[]): VentasPorDia {
  const dias: Record<string, number> = {};
  ventas.forEach((v: Venta) => {
    const fecha = v.fechaVenta;
    dias[fecha] = (dias[fecha] || 0) + v.totalVentas;
  });
  return Object.entries(dias).map(([fecha, total]) => ({ fecha, total }));
}

const Reportes = () => {
  // Estados para cada gráfico
  const [ventasPorMes, setVentasPorMes] = useState<VentasPorMes>([]);
  const [ventasPorDia, setVentasPorDia] = useState<VentasPorDia>([]);
  const [topProductos, setTopProductos] = useState<TopProducto>([]);
  const [bajoStock, setBajoStock] = useState<ProductoInventario[]>([]);
  const [bajaRotacion, setBajaRotacion] = useState<ProductoInventario[]>([]);
  const [topClientes, setTopClientes] = useState<TopCliente>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      // 1. Ventas por mes y por día
      const ventas: Venta[] = await VentaService.obtenerTodasVentas();
      setVentasPorMes(agruparVentasPorMes(ventas));
      setVentasPorDia(agruparVentasPorDia(ventas));

      // 2. Top 10 productos más vendidos
      const productosVendidos: Record<string, number> = {};
      ventas.forEach((v: Venta) => {
        v.detalles.forEach((d: DetalleVenta) => {
          const nombre = d.productoVariante.producto.nombre;
          productosVendidos[nombre] = (productosVendidos[nombre] || 0) + d.cantidad;
        });
      });
      const topProd = Object.entries(productosVendidos)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);
      setTopProductos(topProd);

      // 3. Inventario bajo mínimo
      const inventario: ProductoInventario[] = await DashboardService.obtenerProductosInventario(100);
      setBajoStock(inventario.filter(p => p.stock <= 10));

      // 4. Productos con más stock y baja rotación
      // Baja rotación: mucho stock pero no aparecen en ventas
      const vendidosSet = new Set(topProd.map(p => p.nombre));
      setBajaRotacion(inventario.filter(p => p.stock > 20 && !vendidosSet.has(p.nombre)).slice(0, 10));

      // 5. Top clientes que más han gastado
      const clientes: Record<string, { nombre: string; total: number; compras: number }> = {};
      ventas.forEach((v: Venta) => {
        if (v.cliente && v.cliente.nombreCliente) {
          if (!clientes[v.cliente.nombreCliente]) {
            clientes[v.cliente.nombreCliente] = { nombre: v.cliente.nombreCliente, total: 0, compras: 0 };
          }
          clientes[v.cliente.nombreCliente].total += v.totalVentas;
          clientes[v.cliente.nombreCliente].compras += 1;
        }
      });
      setTopClientes(Object.values(clientes).sort((a, b) => b.total - a.total).slice(0, 10));

      setLoading(false);
    }
    cargarDatos();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-green-700">Reportes y Estadísticas</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Ventas por mes (línea o barras) */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Ventas por Mes</h2>
          <div className="h-72">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasPorMes} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {/* Ventas por semana o día (línea) */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Ventas por Día/Semana</h2>
          <div className="h-72">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ventasPorDia} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {/* Top 10 productos más vendidos */}
        <div className="bg-white rounded-xl shadow p-6 col-span-1 md:col-span-2">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Top 10 Productos Más Vendidos</h2>
          <div className="h-72">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topProductos} margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nombre" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#f59e42" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {/* Inventario bajo mínimo */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Inventario Bajo Mínimo</h2>
          <div className="h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
            ) : bajoStock.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">Sin productos bajo mínimo</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-green-50">
                    <th className="px-2 py-1 text-left">Producto</th>
                    <th className="px-2 py-1 text-left">Categoría</th>
                    <th className="px-2 py-1 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {bajoStock.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1">{p.nombre}</td>
                      <td className="px-2 py-1">{p.categoria}</td>
                      <td className="px-2 py-1 text-right">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Productos con más stock y baja rotación */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Productos con Más Stock y Baja Rotación</h2>
          <div className="h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
            ) : bajaRotacion.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">Sin productos de baja rotación</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-orange-50">
                    <th className="px-2 py-1 text-left">Producto</th>
                    <th className="px-2 py-1 text-left">Categoría</th>
                    <th className="px-2 py-1 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {bajaRotacion.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1">{p.nombre}</td>
                      <td className="px-2 py-1">{p.categoria}</td>
                      <td className="px-2 py-1 text-right">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Top clientes que más han gastado */}
        <div className="bg-white rounded-xl shadow p-6 col-span-1 md:col-span-2">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Top 10 Clientes que Más Han Gastado</h2>
          <div className="h-72">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topClientes} margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nombre" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#6366f1" name="Total gastado" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {!loading && topClientes.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">Número de compras: {topClientes[0].compras} (cliente top)</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;