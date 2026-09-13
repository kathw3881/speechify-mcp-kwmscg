export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 760, margin: "64px auto", padding: 24 }}>
      <h1>Speechify MCP</h1>
      <p>This deployment exposes a Model Context Protocol endpoint at <code>/api/mcp</code>.</p>
      <p>Configure <code>SPEECHIFY_API_KEY</code> on the server before using Speechify tools.</p>
    </main>
  );
}
