from pathlib import Path
import sys
import time

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient


# Ensure the recommendation_agent service directory (one level up from tests/) is on sys.path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import main  # noqa: E402
import model_loader  # noqa: E402


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient bound to the recommendation agent app."""
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def clear_prediction_cache():
    """Clear in-memory prediction cache before each test to avoid cross-test interference."""
    main._prediction_cache.clear()
    yield
    main._prediction_cache.clear()


@pytest.fixture
def dummy_model(monkeypatch):
    """Patch the pipeline and related artifacts with a lightweight dummy model for tests.

    The dummy model:
    - Accepts 6 numeric features.
    - Returns a fixed but non-trivial probability distribution over 3 crops.
    - Is deterministic for easier assertions.
    """

    class DummyPipeline:
        def __init__(self):
            # pretend we have 3 classes
            self.classes_ = np.array([0, 1, 2])

        def predict_proba(self, X):  # noqa: N803
            # X is expected to be a 2D array-like [n_samples, n_features]
            n_samples = len(X)
            base = np.array([[0.1, 0.3, 0.6]])  # simple fixed distribution
            return np.repeat(base, n_samples, axis=0)

    class DummyLabelEncoder:
        def inverse_transform(self, indices):
            mapping = {0: "Wheat", 1: "Rice", 2: "Maize"}
            return np.array([mapping[i] for i in indices])

    # Patch model artifacts
    monkeypatch.setattr(model_loader, "pipeline", DummyPipeline(), raising=False)
    monkeypatch.setattr(model_loader, "label_encoder", DummyLabelEncoder(), raising=False)
    monkeypatch.setattr(model_loader, "FEATURE_COLUMNS", [
        "N", "P", "K", "pH", "rainfall", "temperature"
    ], raising=False)

    # Also patch into the main module, which imported these names directly
    monkeypatch.setattr(main, "pipeline", model_loader.pipeline, raising=False)
    monkeypatch.setattr(main, "label_encoder", model_loader.label_encoder, raising=False)
    monkeypatch.setattr(main, "FEATURE_COLUMNS", model_loader.FEATURE_COLUMNS, raising=False)

    # For SHAP-related parts, we don't need full functionality in these tests; let
    # compute_shap_summary run with explainer=None which safely skips SHAP.
    monkeypatch.setattr(main, "shap_explainer", None, raising=False)

    return model_loader.pipeline
