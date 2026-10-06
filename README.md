# U-Job

Mobile-first personal job-search PWA.

## Railway

1. Deploy this repository from GitHub.
2. Add `OPENAI_API_KEY` in Railway Variables.
3. Optional: `OPENAI_MODEL=gpt-6-sol`.
4. Generate a public domain after deployment succeeds.

The app listens on Railway's `PORT` environment variable and falls back to port 3000 locally.

Health check: `/api/health`
