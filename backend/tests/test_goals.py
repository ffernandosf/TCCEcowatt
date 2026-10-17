from datetime import datetime, timezone

import pytest

from app.services.goals import days_in_month, project_month_end_cost


def test_projects_linearly_from_days_elapsed():
    # R$30 gastos em 10 dias de um mês de 30 dias -> projeta R$90
    assert project_month_end_cost(30.0, 10, 30) == pytest.approx(90.0)


def test_full_month_elapsed_returns_same_value():
    assert project_month_end_cost(75.0, 30, 30) == pytest.approx(75.0)


def test_zero_days_elapsed_returns_current_cost():
    assert project_month_end_cost(0.0, 0, 30) == 0.0


def test_days_in_month_handles_february_and_december():
    assert days_in_month(datetime(2026, 2, 15, tzinfo=timezone.utc)) == 28
    assert days_in_month(datetime(2026, 12, 15, tzinfo=timezone.utc)) == 31
