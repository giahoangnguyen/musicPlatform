# Spotify Clone Backend (JavaScript/Node.js)

Starter repository for a Spotify-style backend in **Node.js** using **Express** and **SQLite (Knex)**.

## Structure
- `src/app.js` — main Express app
- `src/config/`, `src/controllers/`, `src/middleware/`, `src/routes/`, `src/migrations/`, `src/seeds`, `src/utils/`
- `uploads/` — runtime uploads (gitignored)
- `knexfile.js`, `nodemon.json`, `.env.example`, `package.json`

## Getting Started
1. Create `.env` and set `JWT_SECRET`.
2. Install deps:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```
4. Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

## Database
- SQLite file at project root: `database.sqlite` (created after migrations)
- Run migrations:
  ```bash
  npx knex migrate:latest
  ```
- Run seeds:
  ```bash
  npx knex seed:run
  ```

## Notes
- Add routes/controllers incrementally per your roadmap.
- Static uploads are served from `/uploads` URL path.
