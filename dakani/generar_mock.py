import pandas as pd
import random
from datetime import datetime, timedelta

print("Iniciando generación de 50,000 ventas simuladas para Dakani")

# 1. Configuración de tiempo
num_registros = 200000
fecha_inicio = datetime(2018, 1, 1)

# 2. Catálogo enfocado en Ropa Interior y Básicos
productos = [
    {"id": 1, "nombre": "Polo Básico"},
    {"id": 2, "nombre": "Boxer Algodón"},
    {"id": 3, "nombre": "Medias Clásicas"},
    {"id": 4, "nombre": "Blusa Casual"},
    {"id": 5, "nombre": "Brasier Encaje"}
]

colores = ["ROJO", "BLANCO", "NEGRO", "AZUL", "VERDE", "PLOMO"]
tallas = ["S", "M", "L"]

datos_generados = []

# 3. Bucle de generación
for _ in range(num_registros):
    dias_offset = random.randint(0, 2920)
    fecha_venta = fecha_inicio + timedelta(days=dias_offset)
    m = fecha_venta.month
    d = fecha_venta.day

    prod = random.choice(productos)
    color = random.choice(colores)
    talla = random.choice(tallas)

    cantidad = random.randint(1, 3)

    # --- INYECTANDO LÓGICA DE NEGOCIO  ---

    # A) Navidad y Año Nuevo
    if (m == 12 and d >= 15) or (m == 1 and d <= 5):
        if color in ["ROJO", "VERDE"]:
            cantidad += random.randint(5, 15)

    # B) San Valentín (10 al 20 Feb): Lencería/Ropa interior Roja y Negra
    elif m == 2 and 10 <= d <= 20:
        if color in ["ROJO", "NEGRO"] and prod["nombre"] in ["Brasier Encaje", "Boxer Algodón"]:
            cantidad += random.randint(8, 20)

    # C) Campaña Escolar (Marzo): Polos y Medias
    elif m == 3:
        if color in ["BLANCO", "NEGRO", "AZUL"] and prod["nombre"] in ["Medias Clásicas", "Polo Básico"]:
            cantidad += random.randint(15, 30)

    # D) Fiestas Patrias (22 al 31 Jul)
    elif m == 7 and 22 <= d <= 31:
        if color in ["ROJO", "BLANCO"]:
            cantidad += random.randint(5, 12)

    datos_generados.append({
        "fecha_obj": fecha_venta,
        "ID de Producto": prod["id"],
        "Color": color,
        "Talla": talla,
        "Cantidad": cantidad
    })

# 4. Formatear y Guardar
df = pd.DataFrame(datos_generados)
df = df.sort_values(by="fecha_obj")
df['Fecha'] = df['fecha_obj'].dt.strftime('%d/%m/%Y')
df = df.drop(columns=['fecha_obj'])
df = df[['ID de Producto', 'Color', 'Talla', 'Cantidad', 'Fecha']]

nombre_archivo = "ventas_crudas.csv"
df.to_csv(nombre_archivo, sep=';', index=False, encoding='utf-8')

print(f"¡Éxito! Se generaron {len(df)} registros simulados.")