"""Emula um Arduino/ESP32 enviando leituras para POST /api/v1/ingest em loop.

Uso:
    python scripts/simulate_device.py --device-id meu-medidor --device-key <chave-gerada-no-app>

A chave é obtida reivindicando o device na aba "Configurar dispositivo" do
frontend (gera a X-Device-Key uma única vez). O script simula uma curva de
consumo residencial (carga base + ruído + picos ocasionais) e mantém um
contador de energia acumulada (Wh), igual a um medidor real faria.
"""

import argparse
import random
import time
from datetime import datetime, timezone

import requests


def simulate_power(elapsed_minutes: float) -> float:
    """Carga base ~150W, picos de geladeira/chuveiro, ruído."""
    hour = (elapsed_minutes / 60) % 24
    base = 150.0
    if 6 <= hour < 9 or 18 <= hour < 22:
        base = 450.0
    if random.random() < 0.03:
        base += random.uniform(800, 2500)  # chuveiro/forno ligando
    return max(20.0, base + random.gauss(0, 20))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--device-id", required=True)
    parser.add_argument("--device-key", required=True)
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--interval", type=float, default=5.0, help="segundos entre leituras")
    parser.add_argument("--speed", type=float, default=60.0, help="minutos simulados por leitura")
    args = parser.parse_args()

    url = f"{args.api_url}/api/v1/ingest"
    headers = {"Content-Type": "application/json", "X-Device-Key": args.device_key}

    energy_wh = 0.0
    elapsed_minutes = 0.0
    print(f"Enviando leituras para {url} (device_id={args.device_id}), Ctrl+C para parar")

    try:
        while True:
            power = simulate_power(elapsed_minutes)
            voltage = 220.0 + random.gauss(0, 2)
            current = power / voltage
            energy_wh += power * (args.interval / 3600.0)
            payload = {
                "device_id": args.device_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "voltage": round(voltage, 1),
                "current": round(current, 3),
                "power": round(power, 1),
                "energy": round(energy_wh, 1),
                "frequency": 60.0,
                "power_factor": round(random.uniform(0.92, 0.99), 2),
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=5)
            print(f"{payload['timestamp']}  power={payload['power']:>7}W  -> {resp.status_code}")
            if resp.status_code >= 400:
                print(f"  erro: {resp.text}")

            elapsed_minutes += args.speed
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nParado.")


if __name__ == "__main__":
    main()
