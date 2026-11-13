# TechSparkX

A React client and Express server for a service-marketplace concept. The repository is split into separately configured `client/` and `server/` applications.

## Technology and structure

- Client: React, TypeScript, Vite, React Router, and shared UI/auth components.
- Server: Express/Node.js, JWT/authentication dependencies, upload and payment integrations, and `nedb-promises` for local file-backed collections.
- The package lists Mongoose, but the active `server/models/db.js` module creates NeDB stores; this checkout does not use MongoDB for its active application persistence.
- `client/src/` — pages, route composition, and application state.
- `server/` — entry point, routes, models, and service setup.

## Run locally

Install dependencies and run each component in its own terminal:

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

The client defines `dev`, `build`, `lint`, and `preview` scripts; the server defines `dev` and `start` scripts.

## Configuration and API

The current database module stores users, projects, messages, escrows, referrals, and reviews in local NeDB files under `server/data/`. Configure authentication, upload, and payment integrations from server-side environment variables referenced by the source. No `.env.example` is included. Never expose payment secrets in the browser bundle. Route modules document available API behavior; no generated API schema was found.

## Deployment and next steps

No root deployment configuration was identified. Add a safe environment template, endpoint reference, and screenshots from a running build. Compare the project with the similar public job-portal repositories before selecting a single canonical portfolio example. No repository-level `LICENSE` file was found, so reuse terms for project code are unspecified.
