# Diagrama entidad–relación (base de datos)

Origen: entidades JPA (`com.tienda.ropa.entity`) + migraciones Flyway `V1`, `V7`–`V13`.

**Descargar como imagen:** abre este archivo en [mermaid.live](https://mermaid.live), pega el bloque `mermaid` de abajo y usa **Actions → PNG/SVG**.

```mermaid
erDiagram
  usuario {
    bigint id_usuario PK
    varchar usuario
    varchar password
    boolean activo
  }

  rol {
    bigint id_rol PK
    varchar nombre_rol UK
  }

  usuario_rol {
    bigint id_usuario PK_FK
    bigint id_rol PK_FK
  }

  categoria {
    bigint id_categoria PK
    varchar nombre
    bigint categoria_padre_id FK
  }

  proveedores {
    bigint id_proveedor PK
    varchar nombre
    varchar ruc UK
  }

  producto {
    bigint id_producto PK
    varchar codigo_identificacion UK
    varchar codigo_barras UK
    varchar nombre
    text descripcion
    varchar sexo
    varchar tipo_publico
    varchar marca
    bigint id_subcategoria FK
    bigint id_sub_categoria2 FK
    bigint id_categoria_padre FK
    bigint id_proveedor FK
    numeric precio_unitario
    numeric precio_cuarto
    numeric precio_media_docena
    numeric precio_docena
    int cantidad
  }

  producto_variante {
    bigint id_producto_variante PK
    bigint id_producto FK
    varchar color
    varchar talla
    varchar sku UK
    varchar codigo_barras
    int cantidad
  }

  ubicacion {
    bigint id_ubicacion PK
    varchar nombre
    varchar area
    text descripcion
  }

  inventario_ubicacion {
    bigint id_inventario_ubicacion PK
    bigint id_variante FK
    bigint id_ubicacion FK
    int stock_actual
    int stock_minimo
    int stock_maximo
  }

  solicitud {
    bigint id_solicitud PK
    bigint id_usuario FK
    varchar tipo_solicitud
    varchar estado
    bigint id_ubicacion_origen FK
    bigint id_ubicacion_destino FK
    timestamp fecha_creacion
    varchar motivo_rechazo
  }

  detalle_solicitud {
    bigint id_detalle_solicitud PK
    bigint id_solicitud FK
    bigint id_variante FK
    int cantidad
  }

  cliente {
    bigint id_cliente PK
    varchar nombre_cliente
    varchar tipo_cliente
    varchar numero_documento UK
  }

  mayorista {
    bigint id_cliente PK_FK
    varchar codigo_mayorista UK
  }

  venta {
    bigint id_venta PK
    bigint id_usuario FK
    bigint id_cliente FK
    varchar metodo_pago
    varchar tipo_comprobante
    timestamp fecha_venta
    numeric total_ventas
  }

  detalle_venta {
    bigint id_detalle_venta PK
    bigint id_venta FK
    bigint id_producto_variante FK
    int cantidad
    numeric precio_unitario
  }

  caja {
    bigint id_caja PK
    bigint id_usuario FK
    timestamp fecha_apertura
    numeric monto_apertura
    timestamp fecha_cierre
    numeric monto_cierre
    numeric monto_ventas_efectivo
    numeric monto_ventas_tarjeta
    numeric monto_ventas_yape
    numeric monto_esperado
    numeric discrepancia
    text observaciones
    varchar estado
    varchar numero_operacion UK
  }

  movimiento_caja {
    bigint id_movimiento PK
    bigint id_caja FK
    varchar tipo_movimiento
    numeric monto
    varchar metodo_pago
    text descripcion
    timestamp fecha_movimiento
    bigint referencia_id
  }

  usuario ||--o{ usuario_rol : ""
  rol ||--o{ usuario_rol : ""

  usuario ||--o{ venta : ""
  cliente ||--o{ venta : ""

  venta ||--o{ detalle_venta : ""
  producto_variante ||--o{ detalle_venta : ""

  usuario ||--o{ caja : ""
  caja ||--o{ movimiento_caja : ""

  cliente ||--|| mayorista : ""

  categoria ||--o{ categoria : "padre"
  categoria ||--o{ producto : "subcategoria"
  categoria ||--o{ producto : "subcategoria2"
  categoria ||--o{ producto : "categoria_padre"

  proveedores ||--o{ producto : ""

  producto ||--o{ producto_variante : ""

  producto_variante ||--o{ inventario_ubicacion : ""
  ubicacion ||--o{ inventario_ubicacion : ""

  usuario ||--o{ solicitud : ""
  ubicacion ||--o{ solicitud : "origen"
  ubicacion ||--o{ solicitud : "destino"
  solicitud ||--o{ detalle_solicitud : ""
  producto_variante ||--o{ detalle_solicitud : ""
```
