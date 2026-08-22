## API surface

Run the backend from this directory:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Read APIs:

- `GET /operations/snapshot` - dashboard, staff, alerts, audit and compliance summary
- `GET /documents` - indexed document metadata
- `GET /staff` - staff profiles and competency inputs
- `GET /trainsets` - induction board data
- `GET /compliance` - expiry radar, violations and validity gaps
- `GET /alerts` and `GET /audit` - operational feeds
- `GET /smartmap/feed` - simulated train and station feed for the demo

Write and intelligence APIs:

- `POST /alerts/{alert_id}/acknowledge` - acknowledge and audit an alert
- `POST /audit/events` - persist an action log entry
- `POST /induction-plan` and `POST /explain` - planner output and decision trace
- `POST /ask` - RAG/Q&A contract; replace the fallback with Aarohi's service

The seed script requires `SUPABASE_SERVICE_ROLE_KEY` because the target tables
are protected by Row Level Security. Keep that key in `backend/.env` only.
