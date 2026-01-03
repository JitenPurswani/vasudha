import joblib
import os
import json

# Path to shared models directory
SHARED_MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    '..', '..', 'shared', 'models'
)

try:
    pipeline_path = os.path.join(SHARED_MODEL_DIR, 'xgboost_pipeline.pkl')
    label_encoder_path = os.path.join(SHARED_MODEL_DIR, 'label_encoder.pkl')
    feature_names_path = os.path.join(SHARED_MODEL_DIR, 'feature_names.json')

    pipeline = joblib.load(pipeline_path)
    label_encoder = joblib.load(label_encoder_path)

    # Load and store expected feature order
    with open(feature_names_path, "r") as f:
        FEATURE_COLUMNS = json.load(f)

    # 🔍 Debug visibility (VERY IMPORTANT)
    print("✅ Model pipeline loaded successfully")
    print("✅ Label encoder loaded successfully")
    print("📌 Model expects features:", FEATURE_COLUMNS)

except FileNotFoundError as e:
    print(f"❌ Error loading model artifacts: {e}")
    print(f"Searched in: {SHARED_MODEL_DIR}")
    pipeline = None
    label_encoder = None
    FEATURE_COLUMNS = None

except Exception as e:
    print(f"❌ Unexpected error during model loading: {e}")
    pipeline = None
    label_encoder = None
    FEATURE_COLUMNS = None
