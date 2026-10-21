// Trechos de código exibidos no tutorial da aba Dispositivos. Ficam como
// String.raw com marcadores (__API_URL__, __DEVICE_ID__, __DEVICE_KEY__) pra
// manter as aspas/barras do C++ e do shell intactas; `fillSnippet` troca os
// marcadores pelos valores reais do dispositivo selecionado.

export interface SnippetValues {
  apiUrl: string
  deviceId: string
  deviceKey: string
}

export function fillSnippet(template: string, values: SnippetValues): string {
  return template
    .split('__API_URL__').join(values.apiUrl)
    .split('__DEVICE_ID__').join(values.deviceId)
    .split('__DEVICE_KEY__').join(values.deviceKey)
}

export const PAYLOAD_SNIPPET = String.raw`{
  "device_id": "__DEVICE_ID__",
  "timestamp": "2026-06-25T14:32:00Z",
  "voltage": 220.3,
  "current": 1.35,
  "power": 297.4,
  "energy": 1820.5,
  "frequency": 60.0,
  "power_factor": 0.98
}`

export const RESPONSE_SNIPPET = String.raw`HTTP/1.1 201 Created
{
  "id": 48213,
  "device_id": "__DEVICE_ID__",
  "timestamp": "2026-06-25T14:32:00Z",
  "power": 297.4
}`

export const CURL_SNIPPET = String.raw`curl -X POST __API_URL__/api/v1/ingest \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: __DEVICE_KEY__" \
  -d '{"device_id":"__DEVICE_ID__","timestamp":"2026-06-25T14:32:00Z","power":297.4}'`

// PowerShell usa crase (`) como continuação de linha, que não cabe dentro
// de template literal — por isso esses dois são montados linha a linha.
export const POWERSHELL_SNIPPET = [
  '$body = @{',
  '  device_id = "__DEVICE_ID__"',
  '  timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")',
  '  power     = 297.4',
  '  voltage   = 220.3',
  '} | ConvertTo-Json',
  '',
  'Invoke-RestMethod -Method Post -Uri "__API_URL__/api/v1/ingest" `',
  '  -ContentType "application/json" `',
  '  -Headers @{ "X-Device-Key" = "__DEVICE_KEY__" } `',
  '  -Body $body',
].join('\n')

export const ARDUINO_SNIPPET = String.raw`// EcoWatt — firmware de exemplo (placa compatível com Arduino + Wi-Fi)
// Escrito para ESP32; em outras placas troque as bibliotecas de rede pelas
// equivalentes. A única parte específica do seu sensor é readSensor().

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

// ---------- Configuração ----------
const char* WIFI_SSID     = "SUA_REDE";
const char* WIFI_PASSWORD = "SUA_SENHA";

const char* API_URL    = "__API_URL__/api/v1/ingest";
const char* DEVICE_ID  = "__DEVICE_ID__";
const char* DEVICE_KEY = "__DEVICE_KEY__";

const unsigned long SEND_INTERVAL_MS = 5000;  // 1 leitura a cada 5 s

struct Reading {
  float power;      // W   (obrigatório)
  float voltage;    // V   (opcional: NAN se o sensor não mede)
  float current;    // A   (opcional)
  float energyWh;   // Wh  (opcional, acumulado)
  float frequency;  // Hz  (opcional)
  float pf;         // 0–1 (opcional)
};

// ---------- Leitura do sensor ----------
// Substitua pelo código do seu sensor (biblioteca do fabricante, leitura
// analógica, Modbus, I2C...). Devolva NAN nos campos que ele não fornece.
bool readSensor(Reading& r) {
  r.power = 0.0;      // ex.: meuSensor.lerPotencia();
  r.voltage = NAN;
  r.current = NAN;
  r.energyWh = NAN;
  r.frequency = NAN;
  r.pf = NAN;
  return !isnan(r.power);
}

// ---------- Rede e envio ----------
unsigned long lastSendMs = 0;

void connectWifi() {
  Serial.printf("Conectando ao Wi-Fi %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.printf("\nWi-Fi ok, IP %s\n", WiFi.localIP().toString().c_str());
}

void syncClock() {
  // O timestamp precisa estar em UTC: a hora vem da internet (NTP).
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Sincronizando relógio");
  struct tm now;
  while (!getLocalTime(&now, 1000)) Serial.print(".");
  Serial.println(" ok");
}

bool isoTimestamp(char* buf, size_t len) {
  struct tm now;
  if (!getLocalTime(&now, 2000)) return false;
  strftime(buf, len, "%Y-%m-%dT%H:%M:%SZ", &now);
  return true;
}

// Acrescenta ,"campo":valor ao JSON só quando o sensor forneceu o valor.
void appendField(String& json, const char* name, float value, int decimals) {
  if (isnan(value)) return;
  json += ",\"";
  json += name;
  json += "\":";
  json += String(value, decimals);
}

void sendReading() {
  Reading r;
  if (!readSensor(r)) {
    Serial.println("Sensor sem leitura — confira a ligação");
    return;
  }

  char timestamp[25];
  if (!isoTimestamp(timestamp, sizeof(timestamp))) {
    Serial.println("Sem hora sincronizada, leitura descartada");
    return;
  }

  String json = String("{\"device_id\":\"") + DEVICE_ID +
                "\",\"timestamp\":\"" + timestamp + "\"";
  appendField(json, "power", r.power, 1);
  appendField(json, "voltage", r.voltage, 1);
  appendField(json, "current", r.current, 3);
  appendField(json, "energy", r.energyWh, 2);
  appendField(json, "frequency", r.frequency, 2);
  appendField(json, "power_factor", r.pf, 2);
  json += "}";

  WiFiClientSecure client;
  client.setInsecure();  // simplifica o protótipo; em produção, valide o certificado
  HTTPClient http;
  http.setTimeout(15000);
  http.begin(client, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  int status = http.POST(json);
  if (status == 201) {
    Serial.printf("[%s] %.0f W -> ok\n", timestamp, r.power);
  } else {
    Serial.printf("Falha no envio (HTTP %d): %s\n", status, http.getString().c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  connectWifi();
  syncClock();
  lastSendMs = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  if (millis() - lastSendMs >= SEND_INTERVAL_MS) {
    lastSendMs = millis();
    sendReading();
  }
  delay(50);
}`

export const SERIAL_SNIPPET = String.raw`Conectando ao Wi-Fi MinhaCasa....
Wi-Fi ok, IP 192.168.0.42
Sincronizando relógio.. ok
[2026-06-25T14:32:05Z] 297 W -> ok
[2026-06-25T14:32:10Z] 301 W -> ok`
