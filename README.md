# TERA — Restaurant Automation System

Frontend prototype built with React, TypeScript, Vite, Tailwind CSS, React Router, and Lucide icons.

## Run locally

```sh
npm install
npm run dev
```

## Validate and build

```sh
npm run build
npm run preview
```

The manager dashboard is implemented. Navigation routes for login, tables, orders/POS, menu, KDS, inventory, payments, analytics, and AI forecasting are intentional placeholders for later phases. No backend or authentication is implemented.

`src/components` contains the shared layout and UI primitives; `src/data/mock.ts` contains demo data; `src/pages` contains page components. Dashboard period selection, notifications, section search, and mobile navigation use local React state. Dates, operational metrics, and forecast content are illustrative mock data.
