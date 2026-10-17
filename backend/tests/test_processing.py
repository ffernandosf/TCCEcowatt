import pytest

from app.services import processing


def test_energy_wh_between_constant_power_for_one_hour():
    assert processing.energy_wh_between(100.0, 100.0, 3600) == pytest.approx(100.0)


def test_energy_wh_between_ramp_uses_trapezoidal_average():
    # potência sobe de 0 a 200 W em 1h -> média 100 W -> 100 Wh
    assert processing.energy_wh_between(0.0, 200.0, 3600) == pytest.approx(100.0)


def test_energy_wh_between_non_positive_seconds_is_zero():
    assert processing.energy_wh_between(100.0, 200.0, 0) == 0.0
    assert processing.energy_wh_between(100.0, 200.0, -10) == 0.0


def test_cost_brl_converts_wh_to_kwh_and_applies_tariff():
    assert processing.cost_brl(1000.0, 0.75) == pytest.approx(0.75)
    assert processing.cost_brl(500.0, 0.75) == pytest.approx(0.375)
