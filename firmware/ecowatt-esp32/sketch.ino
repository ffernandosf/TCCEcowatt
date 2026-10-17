// EcoWatt — firmware do medidor (ESP32)
//
// Roda no simulador Wokwi (https://wokwi.com) ou num ESP32 real.
// Segue a regra de arquitetura do projeto: o dispositivo SÓ fala com a API
// (POST /api/v1/ingest com X-Device-Key) — nunca direto no RTDB ou no banco.
//
// Carga simulada (no lugar de um sensor tipo PZEM-004T):
//   - Potenciômetro (GPIO34): carga da casa, de standby até ~2 kW
//   - Chave deslizante (GPIO27): liga/desliga o chuveiro elétrico (+5,5 kW)
//   - LED (GPIO2): pisca a cada leitura aceita pela API

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

// No Wokwi a rede é "Wokwi-GUEST" sem senha. Num ESP32 real, troque pela sua.
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

const char* API_URL = "https://monitor-energia-backend-aow4.onrender.com/api/v1/ingest";
const char* DEVICE_ID = "demo-device";
// Gerada uma única vez na aba "Configurar dispositivo" do app.
const char* DEVICE_KEY = "COLE_AQUI_A_X_DEVICE_KEY";

const int PIN_LOAD = 34;
const int PIN_SHOWER = 27;
const int PIN_LED = 2;

const unsigned long SEND_INTERVAL_MS = 5000;
const float STANDBY_W = 35.0;     // geladeira em repouso, roteador, stand-by
const float MAX_LOAD_W = 2000.0;  // potenciômetro no máximo
const float SHOWER_W = 5500.0;
const float NOMINAL_VOLTAGE = 220.0;

float energyWh = 0.0;  // contador acumulado, como um medidor real
unsigned long lastSendMs = 0;

float noise(float amplitude) {
  return amplitude * ((random(0, 2001) - 1000) / 1000.0);
}

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
  // A API exige timestamp ISO-8601 em UTC — pega a hora via NTP.
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Sincronizando relógio (NTP)");
  struct tm now;
  while (!getLocalTime(&now, 1000)) {
    Serial.print(".");
  }
  Serial.println(" ok");
}

bool isoTimestamp(char* buf, size_t len) {
  struct tm now;
  if (!getLocalTime(&now, 2000)) return false;
  strftime(buf, len, "%Y-%m-%dT%H:%M:%SZ", &now);
  return true;
}

float readPower() {
  float load = STANDBY_W + (analogRead(PIN_LOAD) / 4095.0) * MAX_LOAD_W;
  if (digitalRead(PIN_SHOWER) == LOW) load += SHOWER_W;
  return max(0.0f, load + noise(load * 0.02));
}

void sendReading(float power, float dtHours) {
  energyWh += power * dtHours;

  float voltage = NOMINAL_VOLTAGE + noise(2.0);
  float powerFactor = 0.95 + noise(0.03);
  float current = power / (voltage * powerFactor);
  float frequency = 60.0 + noise(0.05);

  char timestamp[25];
  if (!isoTimestamp(timestamp, sizeof(timestamp))) {
    Serial.println("Sem hora NTP, leitura descartada");
    return;
  }

  char payload[320];
  snprintf(payload, sizeof(payload),
           "{\"device_id\":\"%s\",\"timestamp\":\"%s\",\"power\":%.1f,"
           "\"voltage\":%.1f,\"current\":%.3f,\"energy\":%.2f,"
           "\"frequency\":%.2f,\"power_factor\":%.3f}",
           DEVICE_ID, timestamp, power, voltage, current, energyWh, frequency,
           powerFactor);

  // O Render usa HTTPS; setInsecure() pula a validação do certificado
  // (aceitável para o protótipo do TCC).
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  // Free tier do Render "dorme": a primeira requisição pode levar ~1 min.
  http.setConnectTimeout(30000);
  http.setTimeout(30000);
  http.begin(client, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  int status = http.POST(payload);
  if (status == 201) {
    Serial.printf("[%s] %.0f W | %.1f Wh acumulados -> ok\n", timestamp, power, energyWh);
    digitalWrite(PIN_LED, HIGH);
    delay(80);
    digitalWrite(PIN_LED, LOW);
  } else if (status == 401) {
    Serial.printf("401: %s — reivindique o device no app e confira DEVICE_KEY\n",
                  http.getString().c_str());
  } else {
    Serial.printf("Falha no envio (HTTP %d): %s\n", status, http.getString().c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SHOWER, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  randomSeed(esp_random());

  connectWifi();
  syncClock();
  lastSendMs = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  unsigned long nowMs = millis();
  if (nowMs - lastSendMs >= SEND_INTERVAL_MS) {
    float dtHours = (nowMs - lastSendMs) / 3600000.0;
    lastSendMs = nowMs;
    sendReading(readPower(), dtHours);
  }
  delay(50);
}
