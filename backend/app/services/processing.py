def energy_wh_between(power_start: float, power_end: float, seconds: float) -> float:
    """Energia (Wh) consumida entre duas leituras de potência (W), por integração trapezoidal."""
    if seconds <= 0:
        return 0.0
    avg_power = (power_start + power_end) / 2
    hours = seconds / 3600
    return avg_power * hours


def cost_brl(energy_wh: float, tariff_rate_brl_per_kwh: float) -> float:
    """Custo (R$) de uma quantidade de energia (Wh) dada a tarifa (R$/kWh)."""
    energy_kwh = energy_wh / 1000
    return energy_kwh * tariff_rate_brl_per_kwh
