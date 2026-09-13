# Speechify MCP

A remote Model Context Protocol server for Speechify text-to-speech.

## Tools

- `speechify_list_voices` — list/filter available Speechify voices.
- `speechify_generate_speech` — generate audio from text or supported SSML.
- `speechify_speak_uk_english` — convenience tool using the Simba 3.2 English model.

## Environment variables

Copy `.env.example` to `.env.local` for local development.

```bash
SPEECHIFY_API_KEY=...
MCP_ACCESS_TOKEN=...
```

`MCP_ACCESS_TOKEN` is optional but strongly recommended for any public deployment. Clients should send it as a Bearer token to the MCP endpoint.

Never put the Speechify key into a browser/client config. It belongs only on the MCP server.

## Local development

```bash
npm install
npm run dev
```

Health check:

```text
http://localhost:3000/api/health
```

MCP endpoint:

```text
http://localhost:3000/api/mcp
```

## Vercel

Deploy the project, then add `SPEECHIFY_API_KEY` and `MCP_ACCESS_TOKEN` as Vercel environment variables.

Your remote MCP URL will be:

```text
https://YOUR-DOMAIN.vercel.app/api/mcp
```

## Client configuration

For an MCP client that supports remote Streamable HTTP, use the `/api/mcp` URL. If `MCP_ACCESS_TOKEN` is configured, send:

```text
Authorization: Bearer YOUR_MCP_ACCESS_TOKEN
```

## Notes

- The MCP intentionally does not expose Speechify API credentials.
- English speech defaults to `simba-3.2`.
- Use `speechify_list_voices` first to choose a valid `voice_id`.
- Voice cloning is not included in v1 because it requires explicit verified consent and a multipart upload flow. It can be added separately if required.
