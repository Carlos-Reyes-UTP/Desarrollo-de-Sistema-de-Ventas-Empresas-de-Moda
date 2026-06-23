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

## 2. Estructura y Rol de los Datos de Entrenamiento (`datos_entrenamiento_dakani.csv`)

El archivo de entrenamiento contiene datos históricos consolidados a nivel mensual para cada variante de producto. A continuación se detalla la justificación técnica de la presencia de cada campo y por qué es fundamental para que el modelo XGBoost aprenda patrones reales de venta:

*   **`ID de Producto` (Identificador del Producto):**
    *   **¿Para qué sirve?:** Indica el modelo base de la prenda (por ejemplo: Jeans Slim Fit, Camisa Oxford, Casaca de Cuero).
    *   **Importancia:** Cada tipo de producto tiene una rotación e inercia de ventas inherente. Una prenda básica de alta demanda no se comporta igual que un accesorio de nicho. Al incluir este identificador, el modelo aprende a agrupar los datos históricos y a establecer un volumen base de demanda específico para cada artículo.

*   **`color_num` (Color de la variante, codificado numéricamente):**
    *   **¿Para qué sirve?:** Representa el color de la variante (ej: Rojo, Negro, Blanco) traducido a un índice numérico mediante `LabelEncoder` (ya que XGBoost solo admite entradas numéricas).
    *   **Importancia:** En la industria textil, el color es una de las variables estéticas que más influye en el comportamiento de compra. Ciertos colores neutros (como el negro o azul marino) suelen tener una rotación alta y sostenida, mientras que otros colores más llamativos (como amarillo o verde fosforescente) pueden ser estacionales o tener una demanda mucho menor. El modelo utiliza este dato para evitar proyectar las mismas ventas a variantes de colores poco populares.

*   **`talla_num` (Talla de la variante, codificada numéricamente):**
    *   **¿Para qué sirve?:** Indica el tamaño específico de la prenda (S, M, L, XL, etc.) codificado a un índice entero.
    *   **Importancia:** La curva de tallas en el mercado de moda no es uniforme; las tallas centrales (como M y L) concentran la gran mayoría del volumen de ventas, mientras que las tallas en los extremos (como XS o XXL) registran ventas muy bajas. Si omitiéramos esta variable, la IA sugeriría comprar la misma cantidad para todas las tallas, ocasionando un grave quiebre de stock en las tallas más comunes y un exceso innecesario (sobreabastecimiento) de las tallas extremas.

*   **`mes` (Mes del año):**
    *   **¿Para qué sirve?:** Identifica el mes (del 1 al 12) del registro histórico.
    *   **Importancia:** La estacionalidad es crítica en el retail textil. Las casacas y abrigos se venden casi en su totalidad durante los meses de invierno (junio a agosto), mientras que los polos y vestidos cortos dominan en verano (diciembre a febrero). Al indicarle el mes, XGBoost correlaciona la fecha de la predicción con el comportamiento estacional histórico para ajustar la estimación.

*   **`es_campana` (Indicador de Campaña Comercial):**
    *   **¿Para qué sirve?:** Es un campo binario (`1` o `0`) que señala si el mes analizado coincide con una festividad o temporada comercial clave (como la campaña escolar de útiles y prendas en marzo, San Valentín en febrero, Fiestas Patrias en julio o Navidad y Año Nuevo en diciembre/enero).
    *   **Importancia:** Durante estas campañas, la demanda suele dispararse exponencialmente. Un volumen de venta normal de 20 unidades puede escalar a 300 debido al pico comercial. Si el modelo no supiera que es un mes de campaña, vería estos picos como anomalías o ruido de datos inexplicable y trataría de "suavizar" sus predicciones a la baja. Al marcar explícitamente `es_campana = 1`, la IA aprende que este flag activa un comportamiento de demanda acelerada, permitiéndole pronosticar y justificar los picos de abastecimiento con total precisión.

*   **`ventas_mes_pasado` (Rezago Temporal o *Lag Feature* calculado con `.shift(1)`):**
    *   **¿Para qué sirve?:** Contiene la cantidad de unidades que la variante específica vendió en el mes anterior inmediato. Se genera en Pandas agrupando por producto-color-talla y aplicando `.shift(1)`.
    *   **Importancia:** En series de tiempo, la inercia del mes anterior inmediato (autocorrelación) es el predictor más fuerte y estable del comportamiento actual. Si una variante vendió 80 unidades en abril, es extremadamente probable que en mayo mantenga un ritmo cercano (por ejemplo, entre 70 y 90 unidades), a menos que haya un cambio estacional drástico. Esta variable le proporciona "memoria reciente" al modelo, evitando que haga predicciones erráticas o desconectadas del rendimiento de ventas real e inmediato de la tienda.

*   **`cantidad_vendida` (Variable Objetivo / Target):**
    *   **¿Para qué sirve?:** Es la cantidad real de unidades vendidas al término de ese mes para esa variante.
    *   **Importancia:** Es la variable a predecir (`y`). Durante el entrenamiento, funciona como la "respuesta correcta del examen". XGBoost compara sus estimaciones contra esta columna para medir la pérdida (error) y, mediante optimización matemática (*gradient boosting*), ajusta iterativamente las ramas y hojas de sus árboles para acercarse lo máximo posible a este valor.

---

## 3. Tecnologías y Librerías Clave Utilizadas

*   **FastAPI:** Microframework de Python de alto rendimiento y bajo consumo. Se utiliza para exponer los endpoints de predicción y entrenamiento como servicios web (API REST) consumibles por el backend de Spring Boot. Su ventaja es que es asíncrono y valida datos automáticamente.
*   **Pandas:** Librería fundamental para el análisis y manipulación de estructuras de datos tabulares (DataFrames). Se utiliza para agrupar transacciones diarias, ordenar cronológicamente las ventas y calcular variables temporales complejas.
*   **Scikit-Learn (sklearn):**
    *   `train_test_split`: Para dividir el conjunto de datos en entrenamiento (80%) y evaluación (20%), garantizando que las métricas de error se calculen sobre datos que la IA nunca ha visto.
    *   `LabelEncoder`: Convierte datos de texto categóricos (como nombres de colores "Rojo", "Azul" o tallas "S", "M") a valores numéricos enteros ordenados. XGBoost solo comprende datos numéricos, por lo que esta conversión es vital.
    *   `RandomizedSearchCV`: Realiza una búsqueda aleatoria cruzada de hiperparámetros en el espacio definido, permitiendo descubrir la combinación de configuraciones más óptima de manera rápida y sin evaluar exhaustivamente cada combinación.
*   **Joblib:** Librería de persistencia de objetos en Python. Se utiliza para serializar (guardar) y deserializar (cargar) los codificadores de color y talla (`LabelEncoder`), asegurando que las predicciones en tiempo real utilicen el mismo mapeo numérico con el que se entrenó la IA.
*   **Pydantic:** Utilizada internamente por FastAPI para definir los esquemas de datos estructurados de entrada (JSON) mediante anotaciones de tipos de Python, garantizando la consistencia y el control de errores en las peticiones web.

---

## 4. Explicación Detallada de cada Script (Paso a Paso)

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
