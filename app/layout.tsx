import type { ReactNode } from "react";

export const metadata = {
  title: "Speechify MCP",
  description: "MCP server for Speechify text-to-speech"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
