# Teams SDK Bot Example

This example shows how to build a Microsoft Teams bot that uses the
Toast MCP Server as its backend via the Teams SDK's `McpClientPlugin`.

## Architecture

```
[Teams User] <> [Teams SDK Bot] <> [Toast MCP Server] <> [Toast API]
                     |
              McpClientPlugin
              (MCP client)
```

The Teams bot acts as an MCP client, calling tools on the Toast MCP Server.
The MCP server handles Toast authentication and data fetching. The bot handles
Teams specific concerns: Adaptive Cards, proactive messaging, and user interaction.

## Prerequisites

1. Node.js 18+
2. Microsoft 365 Agents Toolkit (VS Code extension)
3. A deployed Toast MCP Server in HTTP mode (see docs/deployment.md)
4. An Azure Bot registration (single tenant)

## Key Concepts

### McpClientPlugin

The Teams SDK includes a built in MCP client plugin. It connects to any
MCP server that supports Streamable HTTP and makes the server's tools
available to the bot's AI layer.

```typescript
import { McpClientPlugin } from "@anthropic-ai/teams-sdk/mcp";

const mcpPlugin = new McpClientPlugin({
  serverUrl: "https://your-toast-mcp-server.com/mcp",
  auth: {
    type: "api-key",
    apiKey: process.env.MCP_API_KEY,
  },
});
```

### Proactive Messaging

For operational alerts (order threshold, health check failures), the bot
sends proactive messages to a Teams channel:

```typescript
import { TurnContext } from "botbuilder";

// Store conversation reference when bot is installed
const conversationRef = TurnContext.getConversationReference(activity);

// Later, send proactive alert
await adapter.continueConversation(conversationRef, async (context) => {
  await context.sendActivity({
    attachments: [adaptiveCard],
  });
});
```

### Adaptive Card Responses

The bot formats Toast data as Adaptive Cards for rich display in Teams:

```typescript
// Example: Menu search results as an Adaptive Card
const card = {
  type: "AdaptiveCard",
  version: "1.5",
  body: [
    { type: "TextBlock", text: "Menu Search Results", weight: "Bolder" },
    {
      type: "FactSet",
      facts: results.map(r => ({
        title: r.item.name,
        value: `$${r.item.price?.toFixed(2) ?? "N/A"}`,
      })),
    },
  ],
};
```

## Getting Started

1. Install the Microsoft 365 Agents Toolkit in VS Code
2. Create a new project: "New Agent" > "Custom Engine Agent"
3. Add the McpClientPlugin pointing at your deployed Toast MCP Server
4. Configure bot registration in Azure (single tenant)
5. Deploy and test in Teams

## Example Conversations

**User**: What menus do we have?
**Bot**: [calls toast_get_menu_metadata via MCP] Here are your 3 menus: Breakfast, Lunch, Dinner...

**User**: Search for espresso
**Bot**: [calls toast_search_menu_items via MCP] Found 4 items matching "espresso"... [Adaptive Card with results]

**User**: How many orders today?
**Bot**: [calls toast_list_orders via MCP] There are 47 orders for today's business date... [summary card]

## Related Resources

- [Teams SDK MCP Client docs](https://learn.microsoft.com/en-us/microsoftteams/platform/teams-sdk/in-depth-guides/ai/mcp/mcp-client)
- [Microsoft 365 Agents Toolkit](https://learn.microsoft.com/en-us/microsoft-365/developer/overview-m365-agents-toolkit)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
