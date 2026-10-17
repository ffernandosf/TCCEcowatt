import pytest

from app.services.carbon import carbon_kg, trees_equivalent


def test_carbon_kg_converts_wh_to_kwh_and_applies_intensity():
    assert carbon_kg(1000.0, 0.08) == pytest.approx(0.08)
    assert carbon_kg(5000.0, 0.08) == pytest.approx(0.4)


def test_trees_equivalent_uses_21kg_per_tree_per_year():
    assert trees_equivalent(21.0) == pytest.approx(1.0)
    assert trees_equivalent(42.0) == pytest.approx(2.0)
