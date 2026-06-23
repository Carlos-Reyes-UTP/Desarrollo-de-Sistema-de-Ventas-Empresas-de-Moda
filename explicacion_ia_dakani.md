# Documentación Técnica del Sistema de Inteligencia Artificial (Dakani IA)

Este documento ha sido estructurado para explicar detalladamente el diseño, la arquitectura y el funcionamiento del módulo de Inteligencia Artificial del sistema **DK-SYSTEM**, enfocado en la predicción de demanda de ventas y la planificación de compras.

---

## 1. Conceptos Generales y Elección del Algoritmo

### ¿Para qué sirve el algoritmo?
El objetivo principal del módulo de IA es **predecir la cantidad de unidades de una variante de producto (combinación específica de producto, color y talla) que se venderán en el siguiente mes**. 
Con este valor y cruzándolo con el error promedio del modelo (MAE), el sistema calcula automáticamente un **Stock de Seguridad** y una **Sugerencia de Compra**, reduciendo tanto el quiebre de stock como el sobreabastecimiento en almacén.

### ¿Por qué se eligió XGBoost (eXtreme Gradient Boosting)?
Para este proyecto de predicción de ventas con datos tabulares e históricos temporales, se seleccionó **XGBoost Regressor** por las siguientes razones técnicas:
1.  **Estructura de Datos Tabulares:** Los modelos basados en árboles de decisión y *boosting* superan consistentemente a las Redes Neuronales Profundas en conjuntos de datos tabulares estructurados (como registros de ventas en CSV).
2.  **Aprendizaje Iterativo (Gradient Boosting):** XGBoost construye múltiples árboles de decisión de forma secuencial. Cada nuevo árbol aprende de los errores cometidos por los árboles anteriores, minimizando la función de pérdida del modelo en cada iteración.
3.  **Regularización Integrada (L1 y L2):** Evita el sobreajuste (overfitting), lo cual es crucial cuando el conjunto de datos de ventas reales presenta ruido o fluctuaciones atípicas.
4.  **Eficiencia y Paralelización:** Es sumamente rápido debido a que puede aprovechar múltiples núcleos del procesador de forma paralela durante el entrenamiento.
5.  **Manejo de Relaciones No Lineales:** Puede capturar fácilmente patrones complejos de estacionalidad (campañas de Navidad, escolar, etc.) y dependencias históricas (como la influencia directa de las ventas del mes anterior).

---

## 2. Tecnologías y Librerías Clave Utilizadas

*   **FastAPI:** Microframework de Python de alto rendimiento y bajo consumo. Se utiliza para exponer los endpoints de predicción y entrenamiento como servicios web (API REST) consumibles por el backend de Spring Boot. Su ventaja es que es asíncrono y valida datos automáticamente.
*   **Pandas:** Librería fundamental para el análisis y manipulación de estructuras de datos tabulares (DataFrames). Se utiliza para agrupar transacciones diarias, ordenar cronológicamente las ventas y calcular variables temporales complejas.
*   **Scikit-Learn (sklearn):**
    *   `train_test_split`: Para dividir el conjunto de datos en entrenamiento (80%) y evaluación (20%), garantizando que las métricas de error se calculen sobre datos que la IA nunca ha visto.
    *   `LabelEncoder`: Convierte datos de texto categóricos (como nombres de colores "Rojo", "Azul" o tallas "S", "M") a valores numéricos enteros ordenados. XGBoost solo comprende datos numéricos, por lo que esta conversión es vital.
    *   `RandomizedSearchCV`: Realiza una búsqueda aleatoria cruzada de hiperparámetros en el espacio definido, permitiendo descubrir la combinación de configuraciones más óptima de manera rápida y sin evaluar exhaustivamente cada combinación.
*   **Joblib:** Librería de persistencia de objetos en Python. Se utiliza para serializar (guardar) y deserializar (cargar) los codificadores de color y talla (`LabelEncoder`), asegurando que las predicciones en tiempo real utilicen el mismo mapeo numérico con el que se entrenó la IA.
*   **Pydantic:** Utilizada internamente por FastAPI para definir los esquemas de datos estructurados de entrada (JSON) mediante anotaciones de tipos de Python, garantizando la consistencia y el control de errores en las peticiones web.

---

## 3. Explicación Detallada de cada Script (Paso a Paso)

El pipeline de MLOps del sistema se divide en cuatro scripts especializados dentro de la carpeta `dakani/`:

### A. [preparar_datos.py](file:///c:/Users/Gonzalo/Desktop/proyectoIntegrador/dakani/preparar_datos.py) (Procesamiento de datos)
Este script limpia y prepara la información transaccional exportada por el sistema:
1.  **Lectura:** Carga las ventas crudas (`ventas_crudas.csv`) generadas por el backend.
2.  **Inyección Estacional:** Convierte las fechas y determina mediante una función si el día de venta corresponde a una **campaña comercial específica** (Navidad/Año Nuevo, Campaña Escolar en Marzo, San Valentín en Febrero, Fiestas Patrias en Julio).
3.  **Agrupación Temporal:** Agrupa las ventas diarias sumando las cantidades a nivel mensual por cada variante (`ID Producto`, `Color`, `Talla`, `Año`, `Mes`).
4.  **Cálculo del Rezago (Lag):** Genera la columna `ventas_mes_pasado` mediante la función `.shift(1)` agrupada por variante. Esto le da al modelo memoria temporal (saber cuánto vendió el mes anterior es la característica más fuerte de predicción).
5.  **Codificación y Guardado:** Ejecuta `LabelEncoder` sobre colores y tallas, guarda los serializadores `.pkl` e imprime el archivo final estructurado: `datos_entrenamiento_dakani.csv`.

### B. [entrenar_modelo.py](file:///c:/Users/Gonzalo/Desktop/proyectoIntegrador/dakani/entrenar_modelo.py) (Entrenamiento y Evaluación)
Es el script que genera el "cerebro" matemático del modelo:
1.  **Carga:** Lee los datos preparados del CSV.
2.  **Búsqueda de Parámetros:** Verifica si existe el archivo de configuración `mejores_parametros.json`. Si existe, configura el modelo XGBoost con estos parámetros óptimos; de lo contrario, aplica valores predeterminados optimizados (`n_estimators=300`, `max_depth=5`, etc.) para evitar el sobreajuste.
3.  **Entrenamiento:** Ajusta el modelo (`.fit`) con el 80% de los datos.
4.  **Evaluación:** Predice sobre el 20% restante y calcula:
    *   **MAE (Error Absoluto Medio):** Mide la desviación promedio en unidades reales.
    *   **RMSE (Raíz del Error Cuadrático Medio):** Mide el error promedio penalizando de manera cuadrática las predicciones muy alejadas.
5.  **Persistencia:** Guarda el archivo de cerebro `modelo_dakani.json` y exporta las métricas a un JSON para que el frontend las muestre.

### C. [optimizar_hiperparametros.py](file:///c:/Users/Gonzalo/Desktop/proyectoIntegrador/dakani/optimizar_hiperparametros.py) (Ajuste Fino Avanzado)
Utilizado de forma periódica o manual para buscar las mejores configuraciones internas:
1.  **Definición de Rango:** Establece un rango de valores para parámetros clave (`n_estimators`, `max_depth`, `learning_rate`, `subsample`, `colsample_bytree`).
2.  **Random Search:** Mediante `RandomizedSearchCV` con validación cruzada de 3 pliegues (`cv=3`), entrena el modelo 45 veces probando combinaciones aleatorias.
3.  **Guardado:** Determina cuál combinación arroja el menor error absoluto (MAE) y la guarda de forma definitiva en `mejores_parametros.json` para que el script de entrenamiento rápido la adopte en el futuro.

### D. [main.py](file:///c:/Users/Gonzalo/Desktop/proyectoIntegrador/dakani/api_ia/main.py) (Servicio FastAPI)
Expone el modelo a la red:
*   **`/predecir_lote` (POST):** Recibe un listado de variantes con sus metadatos del mes, realiza la predicción masiva usando el modelo cargado en RAM y devuelve las estimaciones de ventas.
*   **`/entrenar_modelo` (POST):** Gatilla los subprocesos de preparación y entrenamiento rápido de manera secuencial, y recarga en caliente (*hot-reload*) los nuevos archivos generados en la memoria RAM del servidor.
*   **`/optimizar_modelo` (POST):** Realiza el pipeline completo incluyendo la búsqueda pesada de nuevos hiperparámetros óptimos (`optimizar_hiperparametros.py`) antes de entrenar y recargar el modelo.
