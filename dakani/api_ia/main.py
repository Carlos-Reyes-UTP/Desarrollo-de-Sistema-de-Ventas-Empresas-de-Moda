from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import xgboost as xgb
import pandas as pd
import subprocess
import sys

# 1. Inicializar la aplicación
app = FastAPI(title="API de Predicción Dakani", version="2.0")

# 2. Cargar el modelo globalmente para poder actualizarlo después
modelo = xgb.XGBRegressor()
modelo.load_model("modelo_dakani.json")

# 3. Cargar Codificadores de Encoding
import joblib

try:
    encoder_color = joblib.load("encoder_color.pkl")
    encoder_talla = joblib.load("encoder_talla.pkl")
except Exception as e:
    print(f"Error al cargar codificadores: {e}")
    encoder_color = None
    encoder_talla = None


def encode_color(color_name: str) -> int:
    if encoder_color is not None:
        try:
            return int(encoder_color.transform([color_name.upper()])[0])
        except ValueError:
            return 0
    return 0


def encode_talla(talla_name: str) -> int:
    if encoder_talla is not None:
        try:
            return int(encoder_talla.transform([talla_name.upper()])[0])
        except ValueError:
            return 0
    return 0


class ConsultaStock(BaseModel):
    id_producto: int
    color: str
    talla: str
    semana_ano: int
    es_campana: int
    ventas_semana_pasada: int


# --- ENDPOINT 1: Predicción Masiva (Para tu nueva tabla React) ---
@app.post("/predecir_lote")
def predecir_stock_lote(consultas: List[ConsultaStock]):
    try:
        datos_lista = []
        for c in consultas:
            datos_lista.append({
                'ID de Producto': c.id_producto,
                'color_num': encode_color(c.color),
                'talla_num': encode_talla(c.talla),
                'semana_ano': c.semana_ano,
                'es_campana': c.es_campana,
                'ventas_semana_pasada': c.ventas_semana_pasada
            })

        df_entrada = pd.DataFrame(datos_lista)
        predicciones = modelo.predict(df_entrada)

        resultados = []
        for i, c in enumerate(consultas):
            cant = int(round(predicciones[i]))
            resultados.append({
                "id_producto": c.id_producto,
                "variante": f"{c.color}-{c.talla}",
                "prediccion_ventas": cant if cant > 0 else 0
            })

        return {"status": "success", "resultados": resultados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- ENDPOINT 2: Predicción Individual (Para tu simulador manual) ---
@app.post("/predecir")
def predecir_stock(consulta: ConsultaStock):
    try:
        color_num = encode_color(consulta.color)
        talla_num = encode_talla(consulta.talla)

        datos_entrada = pd.DataFrame([{
            'ID de Producto': consulta.id_producto,
            'color_num': color_num,
            'talla_num': talla_num,
            'semana_ano': consulta.semana_ano,
            'es_campana': consulta.es_campana,
            'ventas_semana_pasada': consulta.ventas_semana_pasada
        }])

        prediccion = modelo.predict(datos_entrada)
        cantidad_final = int(round(prediccion[0]))

        return {
            "status": "success",
            "id_producto": consulta.id_producto,
            "color": consulta.color,
            "talla": consulta.talla,
            "cantidad_recomendada": cantidad_final if cantidad_final > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- ENDPOINT 3: Automatización MLOps (Llamado por Spring Boot) ---
@app.post("/entrenar_modelo")
def reentrenar_ia():
    global modelo, encoder_color, encoder_talla  # Usamos las variables globales para poder sobreescribirlas
    try:
        print("Iniciando pipeline de reentrenamiento...")

        # 1. Ejecutar preparar_datos.py
        # sys.executable asegura que usemos el entorno virtual correcto (.venv)
        subprocess.run([sys.executable, "../preparar_datos.py"], check=True)
        print("Datos preparados.")

        # 2. Ejecutar entrenar_modelo.py
        subprocess.run([sys.executable, "../entrenar_modelo.py"], check=True)
        print("Modelo entrenado.")

        # 3. Hot-Reload: Recargar el nuevo cerebro en la RAM sin apagar el servidor
        modelo = xgb.XGBRegressor()
        modelo.load_model("modelo_dakani.json")
        
        encoder_color = joblib.load("encoder_color.pkl")
        encoder_talla = joblib.load("encoder_talla.pkl")
        print("Nuevo modelo y codificadores cargados en memoria.")

        return {
            "status": "success",
            "message": "Pipeline completado. El modelo ha sido actualizado con los datos más recientes."
        }

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error al ejecutar scripts: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))