FLAG_SURCHARGE_BRL_PER_KWH = {
    "green": 0.0,
    "yellow": 0.01874,
    "red1": 0.03971,
    "red2": 0.09492,
}

FLAG_LABEL = {
    "green": "Verde",
    "yellow": "Amarela",
    "red1": "Vermelha 1",
    "red2": "Vermelha 2",
}


def surcharge_for(flag: str) -> float:
    return FLAG_SURCHARGE_BRL_PER_KWH.get(flag, 0.0)


def label_for(flag: str) -> str:
    return FLAG_LABEL.get(flag, flag)


def effective_tariff_rate(base_rate: float, flag: str) -> float:
    return base_rate + surcharge_for(flag)
