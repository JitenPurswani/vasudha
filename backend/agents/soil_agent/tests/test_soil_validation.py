import main


def test_soil_value_bounds_in_test_db():
    """Basic sanity check: N/P/K/pH values in the test DB fall within expected agronomic ranges.

    This doesn't enforce validation logic (none exists in the service yet),
    but ensures our test fixture data is realistic and can be extended later
    if you introduce explicit validation rules.
    """

    result = main.query_soil_data("Pune", "Maharashtra")
    assert result is not None

    n = result["N_avg"]
    p = result["P_avg"]
    k = result["K_avg"]
    ph = result["pH_avg"]

    assert 0 <= n <= 300
    assert 0 <= p <= 200
    assert 0 <= k <= 400
    assert 3.5 <= ph <= 9.5
