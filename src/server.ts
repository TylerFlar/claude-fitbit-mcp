import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerHealthTools } from "./tools/health.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "claude-fitbit-mcp",
    version: "0.1.0",
  });

  registerAuthTools(server);
  registerHealthTools(server);

  return server;
}
