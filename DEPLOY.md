# Deploy (versão experimental, 100% gratuita)

## Estado atual (2026-10-17)

| Peça | Endereço / onde configurar |
|---|---|
| Repositório | https://github.com/ffernandosf/TCCEcowatt (branch `main`; Render faz deploy automático a cada push) |
| Backend (Render) | https://monitor-energia-backend-aow4.onrender.com — `/health` ok. O nome sem sufixo já era de outra conta, por isso o `-aow4`. |
| Frontend (Firebase Hosting) | https://ecowatt2.web.app — build com `frontend/.env.production` (não versionado; `VITE_API_URL` = URL do Render acima) |
| CORS | `CORS_ALLOWED_ORIGINS=https://ecowatt2.web.app` no painel do Render — validado |
| Banco | Neon (connection string só no painel do Render, em `DATABASE_URL`) |
| Dispositivo IoT | Emulado no Wokwi: ver `firmware/ecowatt-esp32/README.md` |

Aprendizados do primeiro deploy:
- O Render usa Python 3.14 por padrão e o `pydantic-core` 2.27.1 não tem
  wheel pra ele (tenta compilar Rust e falha). Python fixado em 3.12.10 via
  `backend/.python-version` e `PYTHON_VERSION` no `render.yaml`.
- `FIREBASE_SERVICE_ACCOUNT_JSON` foi colado em uma linha só (JSON
  minificado).
- `.gitignore` agora cobre `.env.*` (antes `.env.production` escapava).
- `firebase login` e `gh auth login` são interativos: rodar num PowerShell
  separado, não dentro do Claude Code.

Para atualizar o frontend depois de mudanças: `cd frontend; npm run build;
cd ..; firebase deploy --only hosting`. Backend: só dar push na `main`.

Stack escolhida pra TCC — sem custo, sem escalabilidade real, só precisa
funcionar de ponta a ponta na internet:

| Peça | Onde | Por quê |
|---|---|---|
| Postgres | [Neon](https://neon.tech) free | Único free tier de Postgres que não expira (compute "dorme" e volta sozinho na próxima query, mas os dados ficam). Render/Supabase têm free tier que expira ou pausa o projeto inteiro. |
| Backend (FastAPI) | [Render](https://render.com) free Web Service | Único free tier "de verdade" pra rodar um processo Python sem cartão de crédito. Limitação: dorme após 15 min sem tráfego e demora ~1 min pra acordar na próxima requisição — aceitável pra demo. |
| RTDB + Auth | Firebase (já em uso) | Já configurado, sem mudança. |
| Frontend | Firebase Hosting free | Já é o mesmo projeto Firebase, sem precisar de outra conta. |

**Limitação aceita (experimental):** o `APScheduler` que calcula os rollups
hora/dia só roda enquanto o backend está "acordado". Numa demo isso é
suficiente — os rollups são recalculados quando alguém acessa o dashboard
depois de um tempo parado.

## 1. Banco (Neon)

1. Crie conta em https://neon.tech e um projeto novo.
2. Copie a *connection string* (formato `postgresql://user:pass@host/db?sslmode=require`).
3. Adapte o driver pro que o projeto usa (`psycopg` v3 async): troque o
   prefixo para `postgresql+psycopg://...` — fica igual ao `DATABASE_URL`
   local, só muda host/user/senha/db.
4. Roda a migração uma vez contra o Neon (do seu PC, antes do primeiro deploy):
   ```powershell
   cd backend
   $env:DATABASE_URL = "postgresql+psycopg://...neon..."
   .\venv\Scripts\alembic.exe upgrade head
   ```

## 2. Backend (Render)

1. Suba o repo pro GitHub (Render faz deploy a partir de um repo Git).
2. Em https://dashboard.render.com → **New → Blueprint**, aponte pro repo —
   ele detecta o `render.yaml` da raiz do projeto automaticamente.
3. No painel do serviço, preencha as env vars marcadas `sync: false` no
   `render.yaml`:
   - `DATABASE_URL` → a connection string do Neon.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` → cole o **conteúdo inteiro** do
     `firebase-service-account.json` (não o caminho — Render não tem
     filesystem persistente pra secrets). Isso tem prioridade sobre
     `FIREBASE_SERVICE_ACCOUNT_PATH`.
   - `FIREBASE_DATABASE_URL` → igual ao `.env` local.
   - `CORS_ALLOWED_ORIGINS` → a URL do Firebase Hosting (passo 3), ex.
     `https://ecowatt2.web.app`. Pode deixar em branco por ora e voltar
     aqui depois de ter a URL do frontend.
4. Deploy. A URL pública fica algo como
   `https://monitor-energia-backend.onrender.com`. Teste
   `.../health` (pode demorar ~1 min na primeira chamada, é o cold start).

## 3. Frontend (Firebase Hosting)

1. Confirme que o Hosting está habilitado no projeto `ecowatt2` em
   https://console.firebase.google.com → Hosting → Começar.
2. Instale a CLI se não tiver: `npm install -g firebase-tools`.
3. `firebase login` (abre o navegador pra autenticar).
4. Crie `frontend/.env.production` com a URL real do Render:
   ```
   VITE_API_URL=https://monitor-energia-backend.onrender.com
   VITE_DEVICE_ID=demo-device
   VITE_FIREBASE_API_KEY=...        (iguais ao frontend/.env atual)
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=ecowatt2
   VITE_FIREBASE_APP_ID=...
   ```
5. Build + deploy (da raiz `monitor-energia/`):
   ```powershell
   cd frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```
6. A URL final sai no terminal (`https://ecowatt2.web.app`). Volte no
   Render e preencha `CORS_ALLOWED_ORIGINS` com essa URL exata.

## 4. Validar ponta a ponta

1. Abra a URL do Hosting, faça login, reivindique um device na aba
   "Configurar dispositivo" (gera a `X-Device-Key`).
2. Rode o simulador apontando pro backend público:
   ```powershell
   .\backend\venv\Scripts\python.exe scripts\simulate_device.py \
     --device-id meu-medidor --device-key <chave> \
     --api-url https://monitor-energia-backend.onrender.com
   ```
3. Veja a potência chegando ao vivo no dashboard.

## 5. Firmware real (quando tiver o ESP32 em mãos)

O exemplo `.ino` já fica pronto na aba "Configurar dispositivo" do
frontend, só falta trocar `WIFI_SSID`/`WIFI_PASSWORD` e gravar no board —
`API_URL` já aponta pro backend que você configurou lá (local ou Render,
o que estiver em `VITE_API_URL` no build usado).
