# U-Job

Personal job-search PWA for Belgium.

## Railway setup

1. Connect this GitHub repository to a Railway service.
2. Leave Root Directory empty.
3. Add one Railway variable:
   - OPENAI_API_KEY = your OpenAI secret key
4. Deploy.
5. Generate a public domain.
6. Open /api/health and confirm:
   - ok: true
   - configured: true
   - model: gpt-6-luna
   - appVersion: 2.0.0-clean

The app listens on Railway's PORT variable and falls back to port 3000 locally.

<!-- deploy-trigger: 2026-10-07-ujob-2.3.0 -->

<!-- deploy-trigger: ujob-2.4.1-five-independent -->

<!-- deploy-trigger: ujob-2.5.0-background-search -->

<!-- deploy-trigger: ujob-2.6.0-openai-background -->

<!-- deploy-trigger: ujob-2.7.0-actions -->

<!-- deploy-trigger: ujob-2.7.1-actions-compact -->

<!-- deploy-trigger: ujob-2.8.0-ai-mode -->

<!-- deploy-trigger: ujob-2.9.0-prestige-highpaid-watchlist -->

<!-- deploy-trigger: ujob-3.0.0-focused-modes -->

<!-- deploy-trigger: ujob-3.1.0-linkedin-mode -->

<!-- deploy-trigger: ujob-3.2.0-global-remote -->

<!-- deploy-trigger: ujob-3.3.0-swmo-mode -->
