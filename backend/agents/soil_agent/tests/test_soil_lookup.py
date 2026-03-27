from http import HTTPStatus

import pytest

import main


@pytest.mark.usefixtures("clean_soil_table")
def test_query_soil_data_known_district_state():
    """Known district/state pair should return the stored N/P/K/pH values."""

    result = main.query_soil_data("Pune", "Maharashtra")

    assert result is not None
    assert result["N_avg"] == 120.0
    assert result["P_avg"] == 40.0
    assert result["K_avg"] == 80.0
    assert result["pH_avg"] == 6.8


@pytest.mark.usefixtures("clean_soil_table")
def test_query_soil_data_known_with_extra_whitespace_and_case():
    """Lookup should be robust to leading/trailing spaces, mixed case, and district suffixes."""

    # Extra spaces and different case
    result = main.query_soil_data("  pune district  ", "  maharashtra  ")

    assert result is not None
    assert result["N_avg"] == 120.0


@pytest.mark.usefixtures("clean_soil_table")
def test_query_soil_data_unknown_district():
    """Unknown district should result in None from query_soil_data."""

    result = main.query_soil_data("NonExistingDistrict", "Maharashtra")

    assert result is None


@pytest.mark.usefixtures("clean_soil_table")
def test_get_soil_data_by_district_endpoint_known(client):
    """Endpoint should return OK status and soil values for known district/state."""

    resp = client.get(
        "/get_soil_data_by_district/",
        params={"district": "Pune", "state": "Maharashtra"},
    )

    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert data["status"] == "OK"
    assert data["soil_data"]["N"] == 120.0
    assert data["soil_data"]["P"] == 40.0
    assert data["soil_data"]["K"] == 80.0
    assert data["soil_data"]["pH"] == 6.8


@pytest.mark.usefixtures("clean_soil_table")
def test_get_soil_data_by_district_endpoint_unknown(client):
    """Endpoint should return DistrictOrStateNotFoundInDB for unknown district."""

    resp = client.get(
        "/get_soil_data_by_district/",
        params={"district": "UnknownDistrict", "state": "Maharashtra"},
    )

    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert data["status"] == "DistrictOrStateNotFoundInDB"
    assert data["soil_data"]["N"] is None
    assert data["soil_data"]["P"] is None
    assert data["soil_data"]["K"] is None
    assert data["soil_data"]["pH"] is None
