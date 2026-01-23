import joblib
import os
import json
import traceback
from sklearn.pipeline import Pipeline

# Path to shared models directory
SHARED_MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    '..', '..', 'shared', 'models'
)

pipeline = None
label_encoder = None
FEATURE_COLUMNS = None
model_classifier = None  # The actual classifier (XGBoost, RF, etc)
model_preprocessor = None  # The preprocessing step (if exists)

try:
    pipeline_path = os.path.join(SHARED_MODEL_DIR, 'xgboost_pipeline.pkl')
    label_encoder_path = os.path.join(SHARED_MODEL_DIR, 'label_encoder.pkl')
    feature_names_path = os.path.join(SHARED_MODEL_DIR, 'feature_names.json')

    print(f"[MODEL_LOADER] Loading pipeline from: {pipeline_path}")
    pipeline = joblib.load(pipeline_path)
    
    print(f"[MODEL_LOADER] Loading label_encoder from: {label_encoder_path}")
    label_encoder = joblib.load(label_encoder_path)

    # Load and store expected feature order
    print(f"[MODEL_LOADER] Loading feature names from: {feature_names_path}")
    with open(feature_names_path, "r") as f:
        FEATURE_COLUMNS = json.load(f)

    print(f"[MODEL_LOADER] Pipeline type: {type(pipeline)}")
    print(f"✅ [MODEL_LOADER] Label encoder loaded: {type(label_encoder)}")
    print(f"✅ [MODEL_LOADER] Features loaded: {FEATURE_COLUMNS}")
    
    # Extract classifier and preprocessor
    if isinstance(pipeline, Pipeline):
        print(f"[MODEL_LOADER] Pipeline is sklearn Pipeline with {len(pipeline.named_steps)} steps")
        model_classifier = pipeline[-1]
        model_preprocessor = pipeline[:-1]
        print(f"[MODEL_LOADER] Classifier: {type(model_classifier)}")
    else:
        print(f"[MODEL_LOADER] Pipeline is raw classifier: {type(pipeline)}")
        model_classifier = pipeline
        model_preprocessor = None

except FileNotFoundError as e:
    print(f"❌ [MODEL_LOADER] FileNotFoundError: {e}")
    print(f"❌ [MODEL_LOADER] Searched in: {SHARED_MODEL_DIR}")
    traceback.print_exc()

except Exception as e:
    print(f"❌ [MODEL_LOADER] Unexpected error: {e}")
    traceback.print_exc()
