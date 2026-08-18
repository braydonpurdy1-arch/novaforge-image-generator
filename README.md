# NovaForge Image Studios

Secure creative-generation gateway for NovaForge Studios.

This branch adds Google Veo 3.1 video generation as the first production provider integration while keeping provider credentials out of browsers, prompts, client apps and source control.

## Veo integration

The gateway supports:

- `veo-3.1-generate-preview`
- `veo-3.1-fast-generate-preview`
- 16:9 and 9:16 output
- 720p, 1080p and 4K output
- 4, 6 and 8 second requests (1080p/4K are automatically constrained to 8 seconds)
- native Veo audio
- asynchronous job start/status/download flow

### API flow

```text
ChatGPT / approved NovaForge client
        |
        | Bearer NOVAFORGE_API_TOKEN
        v
NovaForge Image Studios
        |
        | server-side GEMINI_API_KEY
        v
Google Gemini API -> Veo 3.1
```

The Google API key is never returned to the caller.

## Endpoints

- `GET /api/health` — basic service readiness.
- `POST /api/veo/generate` — start a Veo job.
- `GET /api/veo/status?operation=...` — poll a job.
- `GET /api/veo/download?operation=...` — securely proxy the finished MP4.

Generation, status and download endpoints require:

```http
Authorization: Bearer <NOVAFORGE_API_TOKEN>
```

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these only in the server/deployment environment:

```env
GEMINI_API_KEY=...
NOVAFORGE_API_TOKEN=...
```

Never commit either value.

## Example request

```bash
curl -X POST http://localhost:3000/api/veo/generate \
  -H "Authorization: Bearer $NOVAFORGE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cinematic metallic VF emblem in deep space with blue and red plasma energy, realistic reflections and native electrical ambience",
    "model": "veo-3.1-generate-preview",
    "resolution": "1080p",
    "aspectRatio": "16:9",
    "durationSeconds": "8"
  }'
```

The response returns an operation name and status URL. Poll the status URL until `done` is true, then use the returned protected download URL.

## ChatGPT integration

`openapi.yaml` is the action contract for a custom GPT or approved ChatGPT integration.

Before importing it:

1. Deploy NovaForge Image Studios to an HTTPS domain.
2. Replace `https://novaforge.example.com` in `openapi.yaml` with that domain.
3. Store `GEMINI_API_KEY` and `NOVAFORGE_API_TOKEN` in the deployment's secret/environment store.
4. Configure the GPT Action to use bearer authentication with the NovaForge gateway token.
5. Never place the Google Gemini API key in the GPT instructions, knowledge files, conversation, browser code or mobile clients.

## Security boundary

- Provider secrets are server-side only.
- The public UI cannot generate video directly without an authenticated gateway path.
- Operation names are validated before they are sent upstream.
- Generation inputs use an allowlist for Veo models, aspect ratios, durations and resolutions.
- Google video downloads are proxied by NovaForge so clients never need the Google API key.
- `.env`, private keys, keystores and build output are ignored by Git.

## Next provider work

The provider gateway is intentionally isolated from the VF Command Center repository. Future image/video providers can be added behind the same NovaForge policy boundary without placing provider credentials in Android, iOS or browser clients.
