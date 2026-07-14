import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

# Asegurar que las carpetas existan
script_dir = os.path.dirname(os.path.abspath(__file__))
workspace_dir = os.path.dirname(script_dir)
output_dir = os.path.join(workspace_dir, "docs", "reportes_ia")
os.makedirs(output_dir, exist_ok=True)

print("Iniciando generación de reporte estadístico y gráficos...")

# 1. Cargar datos de entrenamiento
csv_path = os.path.join(script_dir, "datos_entrenamiento_dakani.csv")
if not os.path.exists(csv_path):
    print("No se encontró 'datos_entrenamiento_dakani.csv'. Ejecutando preparar_datos.py...")
    import preparar_datos
    # Recargar path por si acaso
    df = pd.read_csv(csv_path)
else:
    df = pd.read_csv(csv_path)

# 2. Separar X e y
X = df.drop(columns=['cantidad_vendida'])
y = df['cantidad_vendida']

# 3. Dividir Train/Test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Configurar hiperparámetros
hiperparametros = {
    'n_estimators': 300,
    'learning_rate': 0.05,
    'max_depth': 5,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'random_state': 42,
    'n_jobs': -1
}

params_path = os.path.join(script_dir, "mejores_parametros.json")
if os.path.exists(params_path):
    try:
        with open(params_path, 'r') as f:
            params_optimos = json.load(f)
        if 'max_depth' in params_optimos:
            params_optimos['max_depth'] = int(params_optimos['max_depth'])
        if 'n_estimators' in params_optimos:
            params_optimos['n_estimators'] = int(params_optimos['n_estimators'])
        hiperparametros.update(params_optimos)
        print(f"Cargados parámetros óptimos: {params_optimos}")
    except Exception as e:
        print(f"Error al cargar mejores parámetros: {e}")

# 5. Entrenar el modelo
modelo = xgb.XGBRegressor(**hiperparametros)
modelo.fit(X_train, y_train)

# 6. Predecir y Calcular Métricas
predicciones = modelo.predict(X_test)
# Evitar predicciones negativas por lógica de negocio
predicciones = np.clip(predicciones, 0, None)

mae = mean_absolute_error(y_test, predicciones)
rmse = root_mean_squared_error(y_test, predicciones)
r2 = r2_score(y_test, predicciones)

# Calcular MAPE (Mean Absolute Percentage Error) omitiendo y=0 para evitar división por cero
y_test_no_zero = y_test[y_test != 0].values
pred_no_zero = predicciones[(y_test != 0).values]
mape = np.mean(np.abs((y_test_no_zero - pred_no_zero) / y_test_no_zero)) * 100 if len(y_test_no_zero) > 0 else 0.0

# Métricas comerciales y de tolerancia
exactitud_comercial = 100.0 - mape
margen_tolerancia = 15.0
diferencias = np.abs(y_test.values - predicciones)
correctos_tolerancia = (diferencias <= margen_tolerancia).sum()
exactitud_tolerancia = (correctos_tolerancia / len(y_test)) * 100

# 7. Imprimir Reporte de Métricas
print("\n" + "="*50)
print("             REPORTE DE EVALUACIÓN DE IA")
print("="*50)
print(f"Error Absoluto Medio (MAE): {mae:.4f} unidades")
print(f"Raíz del Error Cuadrático Medio (RMSE): {rmse:.4f} unidades")
print(f"Coeficiente de Determinación (R² Score): {r2:.4f} ({r2*100:.2f}% de confiabilidad)")
print(f"Error Porcentual Absoluto Medio (MAPE): {mape:.2f}%")
print(f"Exactitud Comercial (100% - MAPE): {exactitud_comercial:.2f}%")
print(f"Exactitud por Tolerancia (Margen +/- {margen_tolerancia} unidades): {exactitud_tolerancia:.2f}%")
print("="*50)

# Guardar informe de texto unificado
reporte_text_path = os.path.join(output_dir, "informe_metricas.txt")
with open(reporte_text_path, "w", encoding="utf-8") as f:
    f.write("==================================================\n")
    f.write("      REPORTE DE CONFIABILIDAD - MODELO DAKANI\n")
    f.write("==================================================\n")
    f.write(f"Error Absoluto Medio (MAE): {mae:.4f} unidades\n")
    f.write(f"Coeficiente de Determinación (R2 Score): {r2:.6f}\n")
    f.write(f"Porcentaje de Varianza Explicada (Confiabilidad): {r2*100:.2f}%\n\n")
    f.write("2. MÉTRICAS DE EXACTITUD DE PRONÓSTICO (Regresión)\n")
    f.write(f"   - Exactitud Comercial (100% - MAPE): {exactitud_comercial:.2f}%\n")
    f.write("     (Métrica estándar en retail: qué porcentaje del volumen real es correctamente estimado por la IA)\n")
    f.write(f"   - Exactitud por Tolerancia (Margen de +/- {margen_tolerancia:.1f} unidades): {exactitud_tolerancia:.2f}%\n")
    f.write("     (Porcentaje de variantes que caen dentro del margen de seguridad del almacén)\n")
    f.write("==================================================\n")

print(f"\nInforme de texto unificado guardado en: {reporte_text_path}")

# 8. Intentar importar Matplotlib y Seaborn para los gráficos
try:
    import matplotlib.pyplot as plt
    import seaborn as sns
    
    # Configurar estilo visual premium
    sns.set_theme(style="whitegrid")
    plt.rcParams.update({
        'font.size': 11,
        'axes.labelsize': 12,
        'axes.titlesize': 14,
        'xtick.labelsize': 10,
        'ytick.labelsize': 10,
        'figure.titlesize': 16
    })

    # --- GRÁFICO 1: Importancia de Características ---
    plt.figure(figsize=(10, 6))
    importances = modelo.feature_importances_
    features = X.columns
    # Traducir características para el reporte escolar
    features_es = {
        'ID de Producto': 'ID de Prenda',
        'color_num': 'Color (Numérico)',
        'talla_num': 'Talla (Numérico)',
        'mes': 'Mes del Año',
        'es_campana': 'Indicador Campaña',
        'ventas_mes_pasado': 'Ventas Mes Anterior'
    }
    features_mapped = [features_es.get(col, col) for col in features]
    
    indices = np.argsort(importances)
    plt.title("Importancia de Variables en la Predicción de Ventas", pad=20)
    plt.barh(range(len(indices)), importances[indices], color='#3b82f6', align='center', height=0.6)
    plt.yticks(range(len(indices)), [features_mapped[i] for i in indices])
    plt.xlabel("Importancia Relativa (Gain)")
    plt.tight_layout()
    plot1_path = os.path.join(output_dir, "importancia_caracteristicas.png")
    plt.savefig(plot1_path, dpi=300)
    plt.close()
    print(f"Gráfico 1 guardado en: {plot1_path}")

    # --- GRÁFICO 2: Valores Reales vs Predichos ---
    plt.figure(figsize=(8, 8))
    sns.scatterplot(x=y_test, y=predicciones, alpha=0.6, color='#10b981', edgecolor='w', s=60)
    # Línea ideal y = x
    max_val = max(y_test.max(), predicciones.max())
    plt.plot([0, max_val], [0, max_val], color='#ef4444', linestyle='--', linewidth=2, label="Predicción Perfecta (Y=X)")
    plt.title("Comparación de Ventas Reales vs Predichas por la IA", pad=20)
    plt.xlabel("Ventas Reales (Unidades)")
    plt.ylabel("Ventas Predichas por la IA (Unidades)")
    plt.legend()
    plt.tight_layout()
    plot2_path = os.path.join(output_dir, "reales_vs_predichos.png")
    plt.savefig(plot2_path, dpi=300)
    plt.close()
    print(f"Gráfico 2 guardado en: {plot2_path}")

    # --- GRÁFICO 3: Distribución de Errores (Residuos) ---
    plt.figure(figsize=(10, 6))
    residuos = y_test - predicciones
    sns.histplot(residuos, kde=True, color='#f59e0b', bins=30, edgecolor='white')
    plt.axvline(x=0, color='#ef4444', linestyle='--', linewidth=2, label="Error Cero")
    plt.title("Distribución de los Errores de Predicción (Residuos)", pad=20)
    plt.xlabel("Diferencia (Real - Predicho)")
    plt.ylabel("Frecuencia")
    plt.legend()
    plt.tight_layout()
    plot3_path = os.path.join(output_dir, "distribucion_errores.png")
    plt.savefig(plot3_path, dpi=300)
    plt.close()
    print(f"Gráfico 3 guardado en: {plot3_path}")

    # --- GRÁFICO 4: Comparativa de Líneas (Muestra de 30 registros) ---
    plt.figure(figsize=(12, 6))
    muestra_indices = np.random.choice(len(y_test), size=min(40, len(y_test)), replace=False)
    y_test_muestra = y_test.iloc[muestra_indices].values
    pred_muestra = predicciones[muestra_indices]
    
    plt.plot(y_test_muestra, label="Ventas Reales", color='#2563eb', marker='o', linewidth=2)
    plt.plot(pred_muestra, label="Predicción IA", color='#f59e0b', marker='x', linestyle='--', linewidth=2)
    plt.title("Comparativa de Tendencia: Ventas Reales vs Predichas (Muestra)", pad=20)
    plt.xlabel("Muestra de Prendas/Variantes Aleatorias")
    plt.ylabel("Cantidad de Unidades Vendidas")
    plt.legend()
    plt.tight_layout()
    plot4_path = os.path.join(output_dir, "comparativa_lineal.png")
    plt.savefig(plot4_path, dpi=300)
    plt.close()
    print(f"Gráfico 4 guardado en: {plot4_path}")

    print("\n¡Todos los gráficos de confiabilidad fueron generados exitosamente en la carpeta docs/reportes_ia!")

except ImportError:
    print("\n[ADVERTENCIA] No se pudo generar los gráficos porque 'matplotlib' o 'seaborn' no están instalados.")
    print("Para instalarlos y ver los gráficos, ejecuta: pip install matplotlib seaborn")
