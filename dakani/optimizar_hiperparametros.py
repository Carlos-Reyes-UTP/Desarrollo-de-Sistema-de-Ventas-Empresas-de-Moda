import pandas as pd
import xgboost as xgb
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

# Buscar de forma inteligente el archivo datos_entrenamiento_dakani.csv
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
rutas_busqueda = [
    'datos_entrenamiento_dakani.csv',
    os.path.join(script_dir, 'datos_entrenamiento_dakani.csv'),
    os.path.join(script_dir, 'api_ia', 'datos_entrenamiento_dakani.csv'),
    os.path.join(os.path.dirname(script_dir), 'datos_entrenamiento_dakani.csv')
]

ruta_seleccionada = None
for r in rutas_busqueda:
    if os.path.exists(r):
        ruta_seleccionada = r
        break

if not ruta_seleccionada:
    raise FileNotFoundError("No se encontró el archivo 'datos_entrenamiento_dakani.csv' en ninguna de las rutas de búsqueda.")

print(f"Cargando datos para optimización de hiperparámetros desde: {os.path.abspath(ruta_seleccionada)}")
df = pd.read_csv(ruta_seleccionada)

X = df.drop(columns=['cantidad_vendida'])
y = df['cantidad_vendida']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Definir la cuadrícula de búsqueda de hiperparámetros
param_dist = {
    'n_estimators': [100, 300, 500, 800, 1200],
    'max_depth': [3, 4, 5, 6, 7, 8],
    'learning_rate': [0.01, 0.03, 0.05, 0.1],
    'subsample': [0.7, 0.8, 0.9, 1.0],
    'colsample_bytree': [0.7, 0.8, 0.9, 1.0]
}

print("Iniciando búsqueda aleatoria de hiperparámetros (RandomizedSearchCV)...")
modelo_base = xgb.XGBRegressor(random_state=42, n_jobs=-1)

search = RandomizedSearchCV(
    estimator=modelo_base,
    param_distributions=param_dist,
    n_iter=15,               # Número de combinaciones a probar
    scoring='neg_mean_absolute_error',
    cv=3,                    # Validación cruzada de 3 pliegues
    random_state=42,
    n_jobs=-1,
    verbose=1
)

search.fit(X_train, y_train)

best_params = search.best_params_
print("\n--- MEJORES HIPERPARÁMETROS ENCONTRADOS ---")
print(best_params)

# Evaluar el mejor modelo
best_model = search.best_estimator_
predicciones = best_model.predict(X_test)

mae = mean_absolute_error(y_test, predicciones)
rmse = root_mean_squared_error(y_test, predicciones)

print(f"\nMAE con el modelo optimizado: {mae:.2f} unidades")
print(f"RMSE con el modelo optimizado: {rmse:.2f} unidades")

# Guardar los mejores parámetros en un JSON para referencia
import json
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
rutas_guardado = [
    "mejores_parametros.json",
    os.path.join(script_dir, "mejores_parametros.json")
]

for ruta in rutas_guardado:
    try:
        with open(ruta, "w") as f:
            json.dump(best_params, f, indent=4)
        print(f"Mejores parámetros guardados en: {os.path.abspath(ruta)}")
    except Exception as e:
        print(f"No se pudo guardar en {ruta}: {e}")
