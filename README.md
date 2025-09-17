# Analyzer

Production-ready Node.js project using TypeScript.

## Scripts
- `npm run build` — Compile TypeScript
- `npm run start` — Run compiled app
- `npm run dev` — Run in development mode
- `npm run lint` — Lint code
- `npm run format` — Format code
- `npm run test` — Run tests

## Environment
Copy `.env.example` to `.env` and fill in your secrets.

## Folder Structure
- `src/` — Source code
  - `config/` — Configuration files
  - `jobs/` — Scheduled jobs
  - `middlewares/` — Express middlewares
  - `models/` — Data models
  - `routes/` — API routes
  - `services/` — Business logic
  - `utils/` — Utility functions

## Security
- Uses `helmet` and `cors` for HTTP security
- Environment variables managed with `dotenv`

## Linting & Formatting
- ESLint and Prettier are configured for code quality

## Testing
- Jest is set up for unit testing
"# website_analyzer_backend" 
