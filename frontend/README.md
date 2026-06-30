# CogAssess — React Frontend

React + Vite single-page application for the CogAssess clinical speech assessment platform.

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

The dev server proxies nothing — it expects the FastAPI backend running at `http://localhost:8000`. Start the backend first (see root `README.md`).

## Production build

```bash
npm run build      # outputs to frontend/dist/
```

The `dist/` folder is served as static files by nginx (see `docs/DEPLOYMENT.md §6.2`). Do not use `npm run dev` in production.

## Pages

| Route | Page | Notes |
|-------|------|-------|
| `/login` | LoginPage | JWT authentication |
| `/dashboard` | DashboardPage | All assessments |
| `/assessments/new` | IntakePage | Patient intake form |
| `/assessments/:key/patient` | PatientPage | Patient-facing recording screen |
| `/assessments/:key/report` | ReportPage | Clinical report with scores and flags |
| `/assessments/:key/findings` | ClinicalFindingsPage | Clinician outcome recording |
| `/assessments/:key/summary` | PatientSummaryPage | Printable patient-facing summary |
| `/monitoring` | MonitoringPage | Change management dashboard (drift, events, clinical metrics) |
| `/about` | AboutPage | Platform information |

## API base URL

All pages hardcode `http://localhost:8000` as the API base. For production, update each page or centralise into a shared constant before building.

## Key dependencies

| Package | Purpose |
|---------|---------|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| Vite | Build tool and dev server |

*Part of CogAssess — St John lynch & Co. Ltd. © 2026* Shared with MemoryTell as a feasibility/prototype June 2026 at v.0.5.0. 
