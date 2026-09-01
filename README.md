# NovaForge Studios Gateway

This repository is the controlled media and memory integration surface shared by Nova, NovaForge Studios, NovaForge Image Studios, Google Antigravity, and a developer-mode ChatGPT app.

## Included integrations

- **Wan 3.0** through Alibaba Cloud Model Studio's asynchronous video API.
- **Lumina (Seedance)** through Lumina's documented BytePlus ModelArk API path.
- **COG-inspired second brain** using local Markdown, source/confidence/verification metadata, proposal-first writes, and explicit commit approval. New entries remain `unverified` until a later memory-hygiene pass; this is a selective integration, not a wholesale copy of the COG repository.
- **ChatGPT and Antigravity** through one Streamable HTTP MCP endpoint at `/mcp`.
- A small same-origin NovaForge Image Studios web surface at `/`.

Antigravity is a development environment, not a media model. It consumes this gateway through MCP and repository rules; it is intentionally not listed as a generation provider.

## Safety defaults

- The server binds to `127.0.0.1` unless `HOST` is explicitly changed.
- REST and MCP require a bearer token by default.
- Paid media creation requires `NOVAFORGE_WRITE_ENABLED=true` **and** `confirmed=true` on each job.
- Persistent memory requires `NOVAFORGE_MEMORY_WRITE_ENABLED=true` **and** confirmation on the reviewed proposal.
- Provider keys only come from environment variables. Never place them in the browser, Android/iOS apps, ChatGPT prompts, Git, or logs.
- No vehicle-control or CAN-writing tools are exposed.

## Run locally

```bash
cp .env.example .env
npm install
npm test
npm start
```

Set environment variables through your shell or deployment secret manager; this service deliberately does not load `.env` itself. The UI is at `http://127.0.0.1:8787/`, and MCP is at `http://127.0.0.1:8787/mcp`.

## Provider setup

### Wan 3.0

Create an Alibaba Cloud Model Studio workspace and region-matched API key, then set:

```text
WAN3_ENABLED=true
WAN3_REGION=singapore
WAN3_WORKSPACE_ID=...
DASHSCOPE_API_KEY=...
```

### Lumina / Seedance

Create a BytePlus ModelArk API key, verify that the configured Seedance model is available in the same region, then set:

```text
LUMINA_ENABLED=true
BYTEPLUS_ARK_API_KEY=...
LUMINA_MODEL=dreamina-seedance-2-5-260628
```

## Connect Antigravity

Antigravity reads workspace MCP definitions from `.agents/mcp_config.json`. For a remote deployment:

```json
{
  "mcpServers": {
    "novaforge-studios": {
      "serverUrl": "https://YOUR_HOST/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_RUNTIME_TOKEN"
      }
    }
  }
}
```

Keep the real token in an untracked local configuration. For Antigravity IDE, open the agent panel menu, select MCP Servers, then Manage MCP Servers. The same server can be added through the CLI `/mcp` manager.

## Connect ChatGPT

ChatGPT web cannot read a local Codex or Antigravity config. It needs a reachable MCP endpoint:

1. Run this service locally with `NOVA_AUTH_MODE=tunnel` and keep `HOST=127.0.0.1`, then expose `/mcp` with OpenAI Secure MCP Tunnel; or deploy it behind OAuth at a stable HTTPS URL.
2. In ChatGPT web, open **Settings → Security and login → Developer mode**.
3. Open **ChatGPT Plugins**, select **+**, and create a developer-mode app using the HTTPS `/mcp` URL or tunnel ID.
4. Review the discovered tools. Leave write tools disabled until both provider configuration and confirmation behavior are tested.

Do not expose token mode as a public unauthenticated service. Public/plugin distribution requires OAuth and a stable HTTPS deployment; this repository does not create cloud resources or credentials automatically.

## Verification

```bash
npm test
npm run check
npx @modelcontextprotocol/inspector@latest
```

In MCP Inspector, connect to `http://127.0.0.1:8787/mcp` using tunnel mode or the configured bearer token. Tests mock every external provider; they do not submit paid jobs.

## Official references

- Wan 3.0 API: <https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference>
- Lumina: <https://ai.byteplus.com/lumina/en>
- BytePlus video API: <https://docs.byteplus.com/en/docs/ModelArk/1520757>
- Google Antigravity MCP: <https://antigravity.google/docs/mcp/>
- COG second brain: <https://github.com/huytieu/COG-second-brain>
- ChatGPT developer mode: <https://developers.openai.com/api/docs/guides/developer-mode>
- Connect ChatGPT to MCP: <https://developers.openai.com/plugins/deploy/connect-chatgpt>
