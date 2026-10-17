import pytest

from app.services.tariff_flag import effective_tariff_rate, label_for, surcharge_for


def test_green_flag_has_no_surcharge():
    assert surcharge_for("green") == 0.0


def test_red2_flag_has_highest_surcharge():
    assert surcharge_for("red2") > surcharge_for("red1") > surcharge_for("yellow") > surcharge_for("green")


def test_unknown_flag_defaults_to_no_surcharge():
    assert surcharge_for("unknown") == 0.0


def test_effective_tariff_rate_adds_surcharge():
    assert effective_tariff_rate(0.75, "yellow") == pytest.approx(0.75 + 0.01874)


def test_label_for_known_and_unknown_flag():
    assert label_for("red1") == "Vermelha 1"
    assert label_for("unknown") == "unknown"
