# Como rodar o projeto localmente

Ordem: **Postgres → backend → frontend**. Sempre nessa ordem, cada um em um terminal separado.

## 1. Banco de dados (Postgres via Docker)

Na raiz do projeto (`monitor-energia/`):

```powershell
docker compose up -d
```

Deixa rodando em background. Pra conferir se subiu:

```powershell
docker compose ps
```

## 2. Backend (FastAPI)

```powershell
cd monitor-energia\backend
.\venv\Scripts\Activate.ps1
alembic upgrade head
uvicorn app.main:app --reload
```

- `alembic upgrade head` só precisa rodar quando houver migração nova (não tem problema rodar sempre, é idempotente).
- Servidor sobe em `http://localhost:8000`.
- Confirma que está de pé: abra `http://localhost:8000/health` (deve responder `200`) ou `http://localhost:8000/docs`.
- Requer `backend/.env` preenchido (`DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_DATABASE_URL`) e o `firebase-service-account.json` presente.

## 3. Frontend (React + Vite)

Em outro terminal:

```powershell
cd monitor-energia\frontend
npm run dev
```

- Sobe em `http://localhost:5173` (se a porta estiver ocupada, o Vite sobe na próxima livre, ex. `5174` — olha o output do terminal).
- Requer `frontend/.env` preenchido com `VITE_API_URL`, `VITE_DEVICE_ID` e as chaves `VITE_FIREBASE_*` (pegar em Firebase Console → Configurações do projeto → Seus apps → app Web).

## Checklist rápido se der tela branca ou erro

1. `frontend/.env` existe e está preenchido (sem aspas quebradas)?
2. Backend respondendo em `/health`?
3. Postgres rodando (`docker compose ps`)?
4. Console do navegador (F12) mostrando algum erro?

## Parar tudo

```powershell
# Ctrl+C nos terminais do uvicorn e do npm run dev
docker compose down
```
