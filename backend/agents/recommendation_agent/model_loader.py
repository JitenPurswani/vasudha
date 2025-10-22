import joblib
import os

# Define the path to the shared models directory relative to this file
# Adjust '..' based on your exact structure if needed
SHARED_MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'shared', 'models')

# Load the artifacts when the module is imported
try:
    pipeline_path = os.path.join(SHARED_MODEL_DIR, 'xgboost_pipeline.pkl')
    label_encoder_path = os.path.join(SHARED_MODEL_DIR, 'label_encoder.pkl')

    pipeline = joblib.load(pipeline_path)
    label_encoder = joblib.load(label_encoder_path)

    print("✅ Model pipeline and label encoder loaded successfully!")

except FileNotFoundError as e:
    print(f"❌ Error loading model artifacts: {e}")
    print(f"Searched in: {SHARED_MODEL_DIR}")
    pipeline = None
    label_encoder = None

except Exception as e:
    print(f"❌ An unexpected error occurred during loading: {e}")
    pipeline = None
    label_encoder = None