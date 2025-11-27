# ml/retrain_with_feedback.py - EMOJIS CORREGIDOS
import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib

# Configuración
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "..", "data", "dataset.json")
FEEDBACK_PATH = os.path.join(BASE_DIR, "..", "data", "feedback_logs.json")
HISTORY_PATH = os.path.join(BASE_DIR, "..", "data", "data.json")
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")

def load_and_combine_data():
    """Combina dataset original + feedback CORREGIDO"""
    
    # Cargar dataset original
    if not os.path.exists(DATASET_PATH):
        print("ERROR: No existe dataset.json")
        return None
        
    df_original = pd.read_json(DATASET_PATH)
    df_original["texto"] = (
        df_original["titulo"].fillna("") + " " + 
        df_original["cuerpo"].fillna("") + " " + 
        "Fuente: " + df_original["fuente"].fillna("")
    )
    
    # Cargar feedback
    if not os.path.exists(FEEDBACK_PATH):
        print("INFO: No hay archivo de feedback")
        return df_original
        
    with open(FEEDBACK_PATH, 'r', encoding='utf-8') as f:
        feedback_data = json.load(f)
    
    # Cargar historial para obtener las noticias originales
    if not os.path.exists(HISTORY_PATH):
        print("ERROR: No existe data.json (historial)")
        return df_original
        
    with open(HISTORY_PATH, 'r', encoding='utf-8') as f:
        history_data = json.load(f)
    
    # Convertir feedback a formato de entrenamiento CORREGIDO
    feedback_rows = []
    for fb in feedback_data:
        # SOLO procesar feedbacks donde el usuario corrigió
        if fb.get('user_feedback') not in ['user_corrected_analysis']:
            continue
        
        # BUSCAR LA NOTICIA ORIGINAL EN EL HISTORIAL
        original_analysis = None
        for analysis in history_data:
            if analysis.get('id') == fb['analysis_id']:
                original_analysis = analysis
                break
        
        if original_analysis:
            # USAR LA NOTICIA REAL con la CORRECCIÓN del usuario
            feedback_rows.append({
                'titulo': original_analysis.get('title', ''),
                'cuerpo': original_analysis.get('body', ''),
                'fuente': original_analysis.get('source', 'user_feedback'),
                'etiqueta': fb['correct_verdict'],  # La corrección del usuario
                'texto': (
                    original_analysis.get('title', '') + " " + 
                    original_analysis.get('body', '') + " " + 
                    "Fuente: " + original_analysis.get('source', '')
                )
            })
            print(f"Agregando noticia corregida: {fb['analysis_id']} -> {fb['correct_verdict']}")
        else:
            print(f"WARN: No se encontro analisis {fb['analysis_id']} en historial")
    
    df_feedback = pd.DataFrame(feedback_rows)
    
    # Combinar datasets
    if not df_feedback.empty:
        combined_df = pd.concat([df_original, df_feedback], ignore_index=True)
        print(f"Datos combinados: {len(df_original)} original + {len(df_feedback)} feedback corregido")
        return combined_df
    else:
        print("INFO: No hay feedback valido para agregar")
        return df_original

def main():
    print("Iniciando re-entrenamiento con feedback...")
    
    # Verificar que existen los archivos necesarios
    if not os.path.exists(FEEDBACK_PATH):
        print("INFO: No existe archivo de feedback")
        return
        
    if not os.path.exists(HISTORY_PATH):
        print("ERROR: No existe archivo de historial")
        return
    
    # Cargar datos combinados
    df = load_and_combine_data()
    
    if df is None or len(df) < 10:
        print(f"ERROR: Datos insuficientes para re-entrenar: {len(df) if df else 0}")
        return
    
    # Preparar features y target
    X = df["texto"]
    y = df["etiqueta"]
    
    # Entrenar nuevo modelo
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_vec = vectorizer.fit_transform(X)
    
    model = LogisticRegression(max_iter=1000, class_weight="balanced")
    model.fit(X_vec, y)
    
    # Guardar modelo
    joblib.dump((vectorizer, model), MODEL_PATH)
    print(f"Modelo re-entrenado y guardado. Muestras: {len(df)}")
    
    # Evaluar el modelo (opcional)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    X_test_vec = vectorizer.transform(X_test)
    y_pred = model.predict(X_test_vec)
    
    print("Resultados del re-entrenamiento:")
    print(classification_report(y_test, y_pred))

if __name__ == "__main__":
    main()