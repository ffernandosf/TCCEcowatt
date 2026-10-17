from datetime import datetime, timedelta, timezone

import pytest

from app.services.standby import _standby_stats

T0 = datetime(2026, 7, 1, tzinfo=timezone.utc)


def at(minutes: int) -> datetime:
    return T0 + timedelta(minutes=minutes)


def test_continuous_low_power_counts_as_one_episode():
    samples = [(at(0), 5.0), (at(10), 5.0), (at(20), 5.0), (at(40), 5.0)]
    stats = _standby_stats(samples, threshold_w=15.0, min_episode_seconds=30 * 60)

    assert stats["standby_seconds"] == pytest.approx(40 * 60)
    assert stats["episodes"] == 1


def test_short_low_power_blip_is_not_counted_as_episode():
    samples = [(at(0), 5.0), (at(5), 5.0)]  # só 5 min, abaixo do mínimo de 30
    stats = _standby_stats(samples, threshold_w=15.0, min_episode_seconds=30 * 60)

    assert stats["episodes"] == 0
    assert stats["standby_seconds"] == pytest.approx(5 * 60)


def test_high_power_interrupts_episode():
    samples = [
        (at(0), 5.0),
        (at(40), 5.0),  # episódio 1: 40 min de standby
        (at(50), 500.0),  # uso ativo interrompe
        (at(60), 5.0),
        (at(100), 5.0),  # episódio 2: 40 min de standby
    ]
    stats = _standby_stats(samples, threshold_w=15.0, min_episode_seconds=30 * 60)

    assert stats["episodes"] == 2
