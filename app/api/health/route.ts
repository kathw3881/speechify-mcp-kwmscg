export async function GET() {
  return Response.json({
    ok: true,
    service: "speechify-mcp",
    speechifyConfigured: Boolean(process.env.SPEECHIFY_API_KEY),
    protected: Boolean(process.env.MCP_ACCESS_TOKEN)
  });
}
