import numpy as np
import pandas as pd

import main


def test_input_features_mapped_and_ordered_correctly(dummy_model):  # noqa: ARG001
    """Prediction endpoint should build a DataFrame with the exact FEATURE_COLUMNS order.

    This indirectly tests the feature preprocessing / mapping step: the incoming
    Pydantic model is converted to a dict, then to a DataFrame, then reordered
    using FEATURE_COLUMNS.
    """

    features = main.InputFeatures(
        N=100.0,
        P=40.0,
        K=60.0,
        pH=6.5,
        rainfall=800.0,
        temperature=28.0,
    )

    input_df = pd.DataFrame([features.model_dump()])

    # enforce the schema as main.predict_crops does
    input_df = input_df[main.FEATURE_COLUMNS]

    assert list(input_df.columns) == [
        "N", "P", "K", "pH", "rainfall", "temperature"
    ]


def test_feature_values_survive_rounding_in_cache_key(dummy_model):  # noqa: ARG001
    """get_cache_key should round floats to 1 decimal place, avoiding tiny-diff misses."""

    # Use pairs that round to the same value at 1 decimal place
    features1 = {
        "N": 100.041,
        "P": 40.049,
        "K": 60.0,
        "pH": 6.541,
        "rainfall": 800.0,
        "temperature": 28.0,
    }
    features2 = {
        "N": 100.049,
        "P": 40.044,
        "K": 60.0,
        "pH": 6.549,
        "rainfall": 800.0,
        "temperature": 28.0,
    }

    key1 = main.get_cache_key(features1, top_n=3)
    key2 = main.get_cache_key(features2, top_n=3)

    # After rounding to 1 decimal place, these should be identical
    assert key1 == key2
