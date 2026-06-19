import pandas as pd
from sklearn.preprocessing import LabelEncoder

print("Iniciando procesamiento de datos para Dakani...")

# 1. Cargar los datos crudos
df_crudo = pd.read_csv('ventas_crudas.csv', sep=';')
print(df_crudo.columns)
# 2. Procesar Fecha y extraer mes y año
df_crudo['Fecha'] = pd.to_datetime(df_crudo['Fecha'], format='%d/%m/%Y')
df_crudo['ano'] = df_crudo['Fecha'].dt.year
df_crudo['mes'] = df_crudo['Fecha'].dt.month


# 3. Función para detectar las campañas exactas
def detectar_campana(fecha):
    m = fecha.month
    d = fecha.day
    # Navidad y Año Nuevo (15 Dic al 5 Ene)
    if (m == 12 and d >= 15) or (m == 1 and d <= 5): return 1
    # Escolar (Todo Marzo)
    if m == 3: return 1
    # San Valentín (10 al 20 de Febrero)
    if m == 2 and 10 <= d <= 20: return 1
    # Fiestas Patrias (Aproximando la semana del 28: del 22 al 31 de Julio)
    if m == 7 and 22 <= d <= 31: return 1

    return 0  # Si no es ninguna de esas fechas, es 0 (venta normal)


# Aplicar la función a cada fila
df_crudo['es_campana'] = df_crudo['Fecha'].apply(detectar_campana)

# 4. Agrupar por Variante y Mes
# Aquí SUMAMOS la columna 'Cantidad' y tomamos el valor MÁXIMO de la campaña
# (Si al menos un día de ese mes fue campaña, el mes entero cuenta como campaña)
df_agrupado = df_crudo.groupby(['ID de Producto', 'Color', 'Talla', 'ano', 'mes']).agg(
    cantidad_vendida=('Cantidad', 'sum'),
    es_campana=('es_campana', 'max')
).reset_index()

# 5. Calcular la variable de rezago (Ventas del mes pasado)
# Ordenamos estrictamente por producto, color, talla y tiempo
df_agrupado = df_agrupado.sort_values(by=['ID de Producto', 'Color', 'Talla', 'ano', 'mes'])

# El comando shift(1) mueve las ventas un espacio hacia abajo
df_agrupado['ventas_mes_pasado'] = df_agrupado.groupby(['ID de Producto', 'Color', 'Talla'])[
    'cantidad_vendida'].shift(1)
df_agrupado['ventas_mes_pasado'] = df_agrupado['ventas_mes_pasado'].fillna(0)

# 6. Transformar textos a números (Encoding)
import joblib

encoder_color = LabelEncoder()
df_agrupado['color_num'] = encoder_color.fit_transform(df_agrupado['Color'])

encoder_talla = LabelEncoder()
df_agrupado['talla_num'] = encoder_talla.fit_transform(df_agrupado['Talla'])

# Guardamos los codificadores (no solo el modelo)
joblib.dump(encoder_color, 'encoder_color.pkl')
joblib.dump(encoder_talla, 'encoder_talla.pkl')

# 7. Seleccionar columnas finales para XGBoost
columnas_finales = [
    'ID de Producto', 'color_num', 'talla_num',
    'mes', 'es_campana',
    'ventas_mes_pasado', 'cantidad_vendida'
]
df_final = df_agrupado[columnas_finales]

# 8. Exportar
df_final.to_csv('datos_entrenamiento_dakani.csv', index=False)

print("¡Listo! Datos procesados con campañas inyectadas.")