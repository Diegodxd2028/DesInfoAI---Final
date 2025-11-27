import os
import pandas as pd
from collections import Counter
import json
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib

# --------------------
# CONFIG DE RUTAS
# --------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(BASE_DIR, "..", "data", "dataset.json")
DATASET_PATH = os.path.normpath(DATASET_PATH)

FEEDBACK_PATH = os.path.join(BASE_DIR, "..", "data", "feedback_logs.json")
FEEDBACK_PATH = os.path.normpath(FEEDBACK_PATH)

HISTORY_PATH = os.path.join(BASE_DIR, "..", "data", "data.json")
HISTORY_PATH = os.path.normpath(HISTORY_PATH)

MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")
MODEL_PATH = os.path.normpath(MODEL_PATH)

def load_and_combine_data():
    """Carga dataset original + feedbacks para entrenamiento INTEGRADO"""
    
    # 1. Cargar dataset original
    if not os.path.exists(DATASET_PATH):
        raise ValueError(f"No existe dataset.json en {DATASET_PATH}")
    
    df_original = pd.read_json(DATASET_PATH, encoding="utf-8")
    
    # Normalizar columnas del dataset original
    for col_with_bom in list(df_original.columns):
        clean_col = col_with_bom.replace("\ufeff", "")
        if clean_col != col_with_bom:
            df_original.rename(columns={col_with_bom: clean_col}, inplace=True)

    required_cols = ["fuente", "titulo", "cuerpo", "etiqueta"]
    for c in required_cols:
        if c not in df_original.columns:
            raise ValueError(f"Falta columna '{c}' en dataset.json")

    # 2. Cargar y procesar feedbacks (si existen)
    feedback_rows = []
    if os.path.exists(FEEDBACK_PATH) and os.path.exists(HISTORY_PATH):
        try:
            with open(FEEDBACK_PATH, 'r', encoding='utf-8') as f:
                feedback_data = json.load(f)
            
            with open(HISTORY_PATH, 'r', encoding='utf-8') as f:
                history_data = json.load(f)
            
            # Convertir feedback a datos de entrenamiento
            for fb in feedback_data:
                if fb.get('user_feedback') not in ['user_corrected_analysis']:
                    continue
                
                # Buscar noticia original en historial
                original_analysis = None
                for analysis in history_data:
                    if analysis.get('id') == fb['analysis_id']:
                        original_analysis = analysis
                        break
                
                if original_analysis:
                    feedback_rows.append({
                        'fuente': original_analysis.get('source', 'user_feedback'),
                        'titulo': original_analysis.get('title', ''),
                        'cuerpo': original_analysis.get('body', ''),
                        'etiqueta': fb['correct_verdict'],  # Corrección del usuario
                    })
                    print(f"Agregando feedback: {fb['analysis_id']} -> {fb['correct_verdict']}")
                    
        except Exception as e:
            print(f"Advertencia procesando feedback: {e}")
    
    # 3. Combinar datasets
    if feedback_rows:
        df_feedback = pd.DataFrame(feedback_rows)
        combined_df = pd.concat([df_original, df_feedback], ignore_index=True)
        print(f"Dataset combinado: {len(df_original)} original + {len(df_feedback)} feedback")
    else:
        combined_df = df_original
        print("Dataset: solo datos originales (sin feedback)")
    
    return combined_df

def load_dataset():
    """
    Carga y prepara el dataset combinado con normalización.
    """
    df = load_and_combine_data()

    # Normalizar etiquetas a minúsculas y sin espacios
    df["etiqueta"] = df["etiqueta"].astype(str).str.strip().str.lower()

    # Mapear posibles sinónimos
    mapping = {
        "verdadera": "verdadera",
        "real": "verdadera",
        "true": "verdadera",
        "falsa": "falsa",
        "noticia falsa": "falsa",
        "false": "falsa"
    }
    df["etiqueta"] = df["etiqueta"].map(lambda x: mapping.get(x, x))

    # Eliminar filas con etiqueta vacía o NaN
    df = df[df["etiqueta"].notna() & (df["etiqueta"] != "")].copy()

    # Comprobar distribución de clases
    counts = Counter(df["etiqueta"])
    print("Distribución de clases ANTES de filtrar:", counts)

    # Filtrar clases que tengan al menos 2 muestras
    valid_labels = {label for label, cnt in counts.items() if cnt >= 2}
    df = df[df["etiqueta"].isin(valid_labels)].copy()

    counts_after = Counter(df["etiqueta"])
    print("Distribución de clases DESPUÉS de filtrar:", counts_after)

    if len(counts_after) < 2:
        raise ValueError(
            f"Después de filtrar, solo quedó una clase: {counts_after}. "
            f"Necesitas al menos dos clases para entrenar el modelo."
        )

    # Construir campo de texto de entrada
    df["texto"] = (
        df["titulo"].fillna("") + " "
        + df["cuerpo"].fillna("") + " "
        + "Fuente: " + df["fuente"].fillna("")
    )

    return df

def build_pipeline() -> Pipeline:
    """
    Crea el pipeline de ML: TF-IDF + Regresión Logística.
    """
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            lowercase=True
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            class_weight="balanced"
        ))
    ])
    return pipeline

def main():
    # 1. Cargar dataset COMBINADO
    df = load_dataset()

    X = df["texto"]
    y = df["etiqueta"]

    # 2. Partir en train / test con estratificación
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    print(f"Tamaño train: {len(X_train)}, test: {len(X_test)}")

    # 3. Crear pipeline y entrenar
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    # 4. Evaluar
    y_pred = pipeline.predict(X_test)
    print("\n=== Reporte de clasificación ===")
    print(classification_report(y_test, y_pred))

    # 5. Guardar modelo
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\nModelo guardado en: {MODEL_PATH}")

if __name__ == "__main__":
    main()