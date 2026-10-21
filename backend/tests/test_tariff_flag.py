import pytest

from datetime import date

from app.services.tariff_flag import (
    effective_tariff_rate,
    flag_from_aneel_name,
    label_for,
    parse_aneel_record,
    surcharge_for,
)


def test_green_flag_has_no_surcharge():
    assert surcharge_for("green") == 0.0


def test_red2_flag_has_highest_surcharge():
    assert surcharge_for("red2") > surcharge_for("red1") > surcharge_for("yellow") > surcharge_for("green")


def test_unknown_flag_defaults_to_no_surcharge():
    assert surcharge_for("unknown") == 0.0


def test_effective_tariff_rate_adds_surcharge():
    assert effective_tariff_rate(0.75, "yellow") == pytest.approx(0.75 + 0.01885)


def test_label_for_known_and_unknown_flag():
    assert label_for("red1") == "Vermelha 1"
    assert label_for("unknown") == "unknown"


@pytest.mark.parametrize(
    "name, expected",
    [
        ("Verde", "green"),
        ("Amarela", "yellow"),
        ("Vermelha P1", "red1"),
        ("Vermelha P2", "red2"),
        ("Escassez Hídrica", "red2"),
    ],
)
def test_flag_from_aneel_name(name, expected):
    assert flag_from_aneel_name(name) == expected


def test_parse_aneel_record_converts_mwh_to_kwh():
    flag = parse_aneel_record(
        {"DatCompetencia": "2026-09-01", "NomBandeiraAcionada": "Amarela", "VlrAdicionalBandeira": "18,85"}
    )
    assert flag.flag == "yellow"
    assert flag.surcharge_brl_per_kwh == pytest.approx(0.01885)
    assert flag.reference_month == date(2026, 9, 1)
    assert flag.source == "aneel"


def test_parse_aneel_record_green_has_zero_surcharge():
    flag = parse_aneel_record(
        {"DatCompetencia": "2026-10-01", "NomBandeiraAcionada": "Verde", "VlrAdicionalBandeira": ",00"}
    )
    assert flag.surcharge_brl_per_kwh == 0.0
