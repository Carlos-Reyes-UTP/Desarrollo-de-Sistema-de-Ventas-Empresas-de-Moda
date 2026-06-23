import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

print("Cargando datos para entrenar la IA de Dakani...")

# 1. Cargar los datos procesados
df = pd.read_csv('datos_entrenamiento_dakani.csv')

# 2. Separar las características (X) de la respuesta que queremos predecir (y)
# Quitamos la columna 'cantidad_vendida' porque es la respuesta del examen
X = df.drop(columns=['cantidad_vendida'])
y = df['cantidad_vendida']

# 3. Dividir los datos: 80% para estudiar, 20% para el examen final
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Configurar e instanciar el modelo XGBoost Regressor con hiperparámetros optimizados
import os
import json

# Parámetros por defecto (optimizados previamente para evitar sobreajuste y reducir MAE)
hiperparametros = {
    'n_estimators': 300,
    'learning_rate': 0.05,
    'max_depth': 5,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'random_state': 42,
    'n_jobs': -1
}

# Intentar cargar mejores_parametros.json si existe en las rutas de búsqueda comunes
script_dir = os.path.dirname(os.path.abspath(__file__))
rutas_busqueda = [
    'mejores_parametros.json',
    os.path.join(script_dir, 'mejores_parametros.json'),
    os.path.join(script_dir, 'api_ia', 'mejores_parametros.json'),
    os.path.join(os.path.dirname(script_dir), 'mejores_parametros.json')
]

params_cargados = False
for ruta in rutas_busqueda:
    if os.path.exists(ruta):
        try:
            with open(ruta, 'r') as f:
                params_optimos = json.load(f)
            # Asegurar tipos correctos para XGBoost
            if 'max_depth' in params_optimos:
                params_optimos['max_depth'] = int(params_optimos['max_depth'])
            if 'n_estimators' in params_optimos:
                params_optimos['n_estimators'] = int(params_optimos['n_estimators'])
            
            hiperparametros.update(params_optimos)
            print(f"Cargados hiperparámetros optimizados desde {os.path.abspath(ruta)}: {params_optimos}")
            params_cargados = True
            break
        except Exception as e:
            print(f"Error al leer {ruta}: {e}")

if not params_cargados:
    print("No se encontró 'mejores_parametros.json'. Usando hiperparámetros predeterminados optimizados.")

modelo = xgb.XGBRegressor(**hiperparametros)

print("Entrenando el modelo XGBoost... (Esto tomará unos segundos)")

# 5. El Entrenamiento
modelo.fit(X_train, y_train)

# 6. Tomar el examen (Evaluación)
# Le pedimos al modelo que prediga las ventas del 20% de datos que no ha visto
predicciones = modelo.predict(X_test)

# Comparamos lo que predijo la IA contra lo que realmente se vendió
error_absoluto = mean_absolute_error(y_test, predicciones)
error_cuadratico = root_mean_squared_error(y_test, predicciones)

print("\n--- RESULTADOS DEL ENTRENAMIENTO ---")
print(f"Error Absoluto Medio (MAE): {error_absoluto:.2f} unidades")
print(f"Raíz del Error Cuadrático Medio (RMSE): {error_cuadratico:.2f} unidades")


# 7. Guardar el cerebro del modelo
nombre_modelo = 'modelo_dakani.json'
modelo.save_model(nombre_modelo)

# 8. Guardar las métricas de evaluación en un JSON
import json
metricas = {
    "mae": float(error_absoluto),
    "rmse": float(error_cuadratico)
}
with open("metricas_modelo.json", "w") as f:
    json.dump(metricas, f, indent=4)

print(f"\n¡Entrenamiento finalizado! Modelo guardado como '{nombre_modelo}' y métricas en 'metricas_modelo.json'")
