# Firmware EcoWatt (ESP32) — emulado no Wokwi

Medidor IoT que segue a arquitetura do projeto:

```
ESP32 (Wokwi) --HTTPS POST /api/v1/ingest + X-Device-Key--> FastAPI (Render)
    FastAPI --> Postgres (Neon, histórico) + Firebase RTDB /devices/{id}/live
    Frontend (Firebase Hosting) <-- RTDB listener (ao vivo) + API (histórico/custo)
```

O sensor de verdade (ex. PZEM-004T) é substituído por controles no circuito:

| Peça | Pino | Papel |
|---|---|---|
| Potenciômetro | GPIO34 | Carga da casa: ~35 W (standby) até ~2 kW |
| Chave deslizante | GPIO27 | Chuveiro elétrico ligado (+5,5 kW) |
| LED verde | GPIO2 | Pisca quando a API aceita a leitura (HTTP 201) |

A cada 5 s o ESP32 envia `power`, `voltage`, `current`, `energy` (Wh
acumulado), `frequency` e `power_factor`, com timestamp UTC via NTP.

## Rodando no Wokwi

1. Entre no app (https://ecowatt2.web.app), vá na aba **Configurar
   dispositivo** e reivindique o `demo-device`. Copie a `X-Device-Key`
   (ela só aparece uma vez).
2. Abra https://wokwi.com/projects/new/esp32.
3. Substitua o `sketch.ino` e o `diagram.json` do projeto pelos desta pasta.
4. No `sketch.ino`, cole a chave em `DEVICE_KEY`.
5. Clique em ▶. No Serial Monitor deve aparecer
   `... W | ... Wh acumulados -> ok`. A primeira leitura pode demorar ~1 min
   (o Render free "acorda" do sleep).
6. Gire o potenciômetro e ligue a chave do chuveiro — a potência muda ao vivo
   no dashboard; consumo (kWh) e custo (R$) aparecem conforme o histórico
   acumula.

Erros comuns no Serial Monitor:
- `401 Dispositivo não reivindicado` → o `DEVICE_ID` não foi reivindicado
  no app (ou o app está usando outro id).
- `401 Chave de dispositivo inválida` → `DEVICE_KEY` errada; reivindicar de
  novo gera uma chave nova.

## ESP32 real

Mesmo código: troque `WIFI_SSID`/`WIFI_PASSWORD` pela sua rede e, quando
tiver o sensor, substitua `readPower()` pela leitura dele.

## Alternativa sem circuito

`scripts/simulate_device.py` faz o mesmo envio a partir do PC, com uma curva
de consumo residencial automática:

```powershell
.\backend\venv\Scripts\python.exe scripts\simulate_device.py `
  --device-id demo-device --device-key <chave> `
  --api-url https://monitor-energia-backend-aow4.onrender.com
```
