import type { DatosVentaBoleta, ProductoBoleta } from './types';

const renderItemsHtml = (productos: ProductoBoleta[]) =>
  productos
    .map((producto, index) => {
      const hayDescuento =
        producto.tipoDescuento &&
        producto.precioOriginal > producto.precioUnitarioAplicado;

      return `
      <div class="item">
        <div class="item-header">
          <span class="item-name">${producto.descripcion}</span>
          <span class="item-total">S/${producto.totalParcial.toFixed(2)}</span>
        </div>
        <div class="item-details">
          <span class="item-quantity">Cant: ${producto.cantidad}</span>
          <span class="item-price">@ S/${producto.precioUnitarioAplicado.toFixed(2)}</span>
          ${hayDescuento ? '<span class="discount-applied">*Descuento aplicado</span>' : ''}
        </div>
        ${index < productos.length - 1 ? '<div class="item-separator"></div>' : ''}
      </div>
    `;
    })
    .join('');

export const imprimirBoletaVenta = (datos: DatosVentaBoleta) => {
  const fechaFormateada = new Date(datos.fechaHora).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subtotalCalculado = datos.totalGeneral / 1.18;
  const igvCalculado = datos.totalGeneral - subtotalCalculado;
  const itemsHtml = renderItemsHtml(datos.productos);

  const boletaHtml = `
    <html>
      <head>
        <title>Boleta de Venta - ${datos.cliente}</title>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; color: #000; }
          .receipt { max-width: 320px; margin: 0 auto; border: 1px solid #000; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
          .company-name { font-size: 16px; font-weight: bold; }
          .receipt-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .info-row, .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px; }
          .products-section { margin: 12px 0; }
          .section-title { font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 8px; }
          .item { margin-bottom: 8px; }
          .item-header { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .item-name { font-size: 10px; font-weight: bold; margin-right: 8px; }
          .item-total { font-size: 11px; font-weight: bold; white-space: nowrap; }
          .item-details { display: flex; justify-content: space-between; font-size: 9px; color: #333; }
          .discount-applied { font-size: 8px; color: #666; font-style: italic; }
          .item-separator { height: 1px; background: #ccc; margin-top: 6px; }
          .totals-section { border-top: 2px solid #000; padding-top: 8px; margin-top: 12px; }
          .final-total { border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-weight: bold; }
          .footer { margin-top: 12px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 9px; text-align: center; }
          @media print { body { padding: 0; } .receipt { border: none; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="company-name">SISTEMA DE VENTAS</div>
            <div class="receipt-title">Boleta de Venta</div>
          </div>
          <div class="info-row"><span>Fecha y Hora:</span><span>${fechaFormateada}</span></div>
          <div class="info-row"><span>Cliente:</span><span>${datos.cliente ?? 'Público General'}</span></div>
          <div class="info-row"><span>Documento:</span><span>${datos.documentoCliente ?? '—'}</span></div>
          <div class="info-row"><span>Método de Pago:</span><span>${datos.metodoPago.charAt(0).toUpperCase() + datos.metodoPago.slice(1)}</span></div>
          <div class="info-row"><span>Atendido por:</span><span>${datos.usuarioVendedor}</span></div>

          <div class="products-section">
            <div class="section-title">Productos</div>
            ${itemsHtml}
          </div>

          <div class="totals-section">
            <div class="total-row"><span>Subtotal (sin IGV):</span><span>S/${subtotalCalculado.toFixed(2)}</span></div>
            <div class="total-row"><span>IGV (18%):</span><span>S/${igvCalculado.toFixed(2)}</span></div>
            <div class="total-row final-total"><span>TOTAL A PAGAR:</span><span>S/${datos.totalGeneral.toFixed(2)}</span></div>
          </div>

          <div class="footer">
            <div><strong>¡Gracias por su compra!</strong></div>
            <div>Conserve este comprobante para cualquier reclamo o garantía</div>
          </div>
        </div>
        <script>setTimeout(() => window.print(), 500);</script>
      </body>
    </html>
  `;

  const popup = window.open(
    '',
    '_blank',
    `width=400,height=600,scrollbars=yes,resizable=yes,left=${screen.width / 2 - 200},top=${screen.height / 2 - 300}`
  );

  if (!popup) {
    return;
  }

  popup.document.write(boletaHtml);
  popup.document.close();
};

