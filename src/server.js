import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WIDGET_URI = "ui://widget/ac-fashion-studio.html";
const widgetHtml = readFileSync(path.join(__dirname, "..", "public", "widget.html"), "utf8");

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function createServer() {
  const server = new McpServer({
    name: "AC Fashion Image Studio",
    version: "1.0.0",
  });

  server.registerResource(
    "ac-fashion-studio-widget",
    WIDGET_URI,
    {},
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: "text/html+skybridge",
          text: widgetHtml,
          _meta: {
            "openai/widgetDescription": "AC Fashion Image Studio form for configuring a garment-first commercial fashion image.",
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: [],
              resource_domains: [],
            },
          },
        },
      ],
    }),
  );

  server.registerTool(
    "open_fashion_studio",
    {
      title: "Open AC Fashion Image Studio",
      description: "Open the structured AC Fashion Image Studio form. Use this when the user wants to create a fashion image.",
      inputSchema: {},
      _meta: {
        "openai/outputTemplate": WIDGET_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Opening AC Fashion Image Studio…",
        "openai/toolInvocation/invoked": "AC Fashion Image Studio is ready.",
      },
    },
    async () => ({
      structuredContent: {
        defaults: {
          model_age: 35,
          european_size: "38/40",
          occasion: "Elegant luxury interior",
          weaving: "None",
          accessory: "None",
          aspect_ratio: "2:3 portrait",
        },
        garment_priority: "HERO — highest priority",
      },
      content: [
        {
          type: "text",
          text: "AC Fashion Image Studio is ready. The garment is required and will be treated as the HERO product. Default model age is 35.",
        },
      ],
    }),
  );

  const garmentReferenceSchema = z.object({
    file_id: z.string().min(1),
    download_url: z.string().url().or(z.literal("")),
    filename: z.string().min(1),
    mime_type: z.string().min(1),
  });

  server.registerTool(
    "submit_fashion_request",
    {
      title: "Submit AC fashion image request",
      description: "Submit the garment reference and structured fashion parameters. After this tool returns, the Workspace Agent should immediately use its Image Generation tool.",
      inputSchema: {
        garment_reference: garmentReferenceSchema,
        occasion: z.enum(["Elegant luxury interior", "City-chic", "Bistro environment", "Outdoor / free time", "Festivity"]),
        european_size: z.enum(["38/40", "42/44"]).default("38/40"),
        garment_family: z.string().min(1),
        material: z.string().min(1),
        weaving: z.string().default("None"),
        model_age: z.number().int().min(18).max(90).default(35),
        accessory: z.string().default("None"),
        extra_details: z.string().default("None"),
      },
      _meta: {
        "openai/widgetAccessible": true,
        "openai/fileParams": ["garment_reference"],
        "openai/toolInvocation/invoking": "Preparing the fashion image request…",
        "openai/toolInvocation/invoked": "Fashion image request prepared.",
      },
    },
    async (input) => {
      const age = Number.isFinite(input.model_age) ? input.model_age : 35;
      const request = {
        garment_priority: "HERO — highest priority",
        garment_reference: {
          file_id: input.garment_reference.file_id,
          filename: input.garment_reference.filename,
          mime_type: input.garment_reference.mime_type,
        },
        occasion: input.occasion,
        european_size: input.european_size || "38/40",
        garment_family: input.garment_family,
        material: input.material,
        weaving: input.weaving || "None",
        model_age: age || 35,
        accessory: input.accessory || "None",
        extra_details: input.extra_details || "None",
        fixed_rules: {
          aspect_ratio: "2:3 portrait",
          expression: "natural smile",
          background: "sufficiently light and softly blurred",
          garment_fidelity: "preserve uploaded garment as faithfully as possible",
          commercial_priority: "garment is the product being advertised; model and environment remain secondary",
          ac_logo: "official gold AC crown logo from the Agent files, upper-right area, slightly inward toward centre",
          christmas_elements: "absolutely prohibited",
        },
        next_action: "Use the Workspace Agent Image Generation tool now. Return the finished image, not only a prompt.",
      };

      const content = [
        {
          type: "text",
          text: [
            "AC FASHION IMAGE REQUEST",
            "",
            `Garment: ${request.garment_reference.filename} — HERO / highest priority`,
            `Model age: ${request.model_age}`,
            `European size: ${request.european_size}`,
            `Family: ${request.garment_family}`,
            `Material: ${request.material}`,
            `Weaving: ${request.weaving}`,
            `Occasion: ${request.occasion}`,
            `Accessory: ${request.accessory}`,
            `Extra details: ${request.extra_details}`,
            "",
            "The garment image supplied with this tool result is the primary visual reference. Preserve its colour, silhouette, construction, print, texture, length, neckline, sleeves and important details. Keep the background secondary and sufficiently light.",
            "",
            "NEXT ACTION: Use Image Generation now and return the finished 2:3 fashion image.",
          ].join("\n"),
        },
      ];

      const url = input.garment_reference.download_url;
      if (url) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
          clearTimeout(timer);

          if (!response.ok) throw new Error(`download returned ${response.status}`);
          const mimeType = (response.headers.get("content-type") || input.garment_reference.mime_type || "").split(";")[0].trim();
          if (!IMAGE_TYPES.has(mimeType)) throw new Error(`unsupported image type: ${mimeType}`);

          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) throw new Error("image is larger than 20 MB");

          content.push({
            type: "image",
            data: Buffer.from(arrayBuffer).toString("base64"),
            mimeType,
          });
        } catch (error) {
          content.push({
            type: "text",
            text: `Garment image transfer warning: ${error?.message || "could not retrieve the host-managed image"}. The request metadata is still available.`,
          });
        }
      } else {
        content.push({
          type: "text",
          text: "Garment image transfer warning: no host download URL was supplied. If the image is not visible to the agent, attach it directly in the ChatGPT conversation and resubmit.",
        });
      }

      return {
        structuredContent: request,
        content,
      };
    },
  );

  return server;
}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, app: "AC Fashion Image Studio" });
});

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed:", error);
    if (!res.headersSent) res.status(500).json({ error: "MCP request failed" });
  }
});

app.get("/mcp", (_req, res) => res.status(405).send("Use POST /mcp"));
app.delete("/mcp", (_req, res) => res.status(405).send("Stateless MCP server"));

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log(`AC Fashion Image Studio listening on port ${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
});
