# CareerDesk

CareerDesk is a standalone, multi-user job-search and application workspace with open account registration. It does not modify or depend on Jarvis.

## What is real

- Job listings are fetched live from public Greenhouse and Lever employer-board APIs. Add a company's board slug under **Find jobs**; CareerDesk checks the public endpoint before it saves the source. It does not scrape pages or invent sample listings.
- Greenhouse and Lever APIs are employer-board scoped, not a universal jobs index. Search filters the current live results from the employer boards you configured.
- The hosted AI integration creates editable, job-specific CV and cover-letter suggestions when you ask it to. It never submits application content.
- Your explicit approval is required before the app enables an application handoff. The handoff opens the employer's actual application page; you complete and submit their form yourself. “Employer page opened” is not a submission confirmation.
- Anyone can create an account with an email and password. Passwords are stored as scrypt hashes, and each account's CV, employer boards, and application drafts are scoped to that user.
- New accounts are active immediately; email verification and password-reset emails are not configured. Each account's data is stored in the configured PostgreSQL database.
- Existing records from the former single-user schema are left unassigned rather than exposed to whichever person registers first.

## Local setup

Requirements: Node.js 20.19 or later and Docker Desktop (or a PostgreSQL 15+ server).

1. Copy `.env.example` to `.env.local`.
2. Set `APP_SESSION_SECRET` to a random secret of at least 32 characters. For example, generate one with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. Start the local database:

   ```powershell
   docker compose up -d postgres
   ```

4. Install packages, generate the Prisma client, and apply the checked-in database migration:

   ```powershell
   npm install
   npm run db:generate
   npm run db:deploy
   ```

5. Start the app:

   ```powershell
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000), choose **Create an account**, and register with your name, email, and a password of at least 12 characters. After that, sign in with that email and password.

Email verification and password-reset email are not enabled because no email provider is configured. Users who forget their password will need help from the site operator; do not share passwords by email.

When you change `prisma/schema.prisma` during development, create and apply a migration with `npm run db:migrate -- --name describe-change`.

To enable AI tailoring, configure `AI_API_KEY` and `AI_MODEL` on the server. `AI_BASE_URL` defaults to the OpenAI API base and can be set to another OpenAI-compatible HTTPS endpoint. Credentials are never sent to the browser. The CV and selected job description are sent to that provider only when you press **Tailor with AI**; review the provider's data-handling terms before using real personal information. If these settings are absent, editing CVs, finding live jobs, and manually drafting applications still work.

## Greenhouse and Lever sources

Under **Find jobs**, add the employer name, provider, and board slug. The slug is the company-specific identifier in the employer careers URL, not a complete URL. The server calls only fixed Greenhouse/Lever API hosts, validates the board by querying it, and returns canonical HTTPS application links from those providers. Listings may change or disappear; confirm details on the employer site.

The official APIs document their coverage and submission boundaries:

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) exposes public job-board listings. Programmatic application submission requires employer-side authorization.
- [Lever Postings API](https://github.com/lever/postings-api) exposes public postings per site and does not provide universal full-text search.

## Free Render test deployment

The repository includes a Render Blueprint in `render.yaml`. In the Render Dashboard, choose **New > Blueprint**, connect GitHub, and select `charleschukwudifrancis-hub/job-application-app`. It creates a public web service and PostgreSQL database in Frankfurt, generates the session secret, wires the database connection, and applies migrations when the service starts. After deployment, open the generated `onrender.com` URL and create an account.

This free setup is for testing only: the web service spins down after 15 minutes without traffic, and the PostgreSQL database expires 30 days after creation. Data in that database will be deleted when it expires. Do not use it for real CVs or other personal data; back up or move the database to a paid persistent plan before then. The first page load after the service sleeps can take about a minute.

Email verification, password-reset email, and signup rate limiting are not configured. Add `AI_API_KEY` and `AI_MODEL` in the Render Dashboard if you want to enable AI tailoring; these values are optional and must not be committed to GitHub.

## Production deployment

Deploy the Next.js app and PostgreSQL database to services you control. Set `DATABASE_URL` and `APP_SESSION_SECRET` in the deployment's secret manager; set `AI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL` only if AI tailoring is desired. Run `npm run db:deploy` as the release migration step. Use HTTPS in production; the session cookie is marked `Secure` there. Account registration is open to anyone who can reach the deployed site; configure email verification, password recovery, and signup rate limiting before relying on it for a public production service.

The included `Dockerfile` builds a standalone Next.js image. Set the same runtime environment variables when launching the image; build-time database URL is only a placeholder used for Prisma client generation and is never used to connect during the build.

## Checks

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```
