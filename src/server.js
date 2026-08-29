import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/* =========================================================
   AC FASHION IMAGE STUDIO
   ========================================================= */

const WIDGET_URI =
  "ui://ac-fashion-studio/ac-fashion-studio.html";

const widgetHtml = readFileSync(
  path.join(__dirname, "..", "public", "widget.html"),
  "utf8"
);


const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_BYTES =
  20 * 1024 * 1024;


/* =========================================================
   CREATE MCP SERVER
   ========================================================= */

function createServer() {

  const server = new McpServer({
    name: "AC Fashion Image Studio",
    version: "1.1.0",
  });


  /* =======================================================
     REGISTER THE INTERACTIVE AC FASHION STUDIO UI
     ======================================================= */

  registerAppResource(
    server,
    "AC Fashion Image Studio",
    WIDGET_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,

      description:
        "Interactive AC Fashion Image Studio form for configuring a garment-first commercial fashion image.",
    },

    async () => ({

      contents: [
        {
          uri: WIDGET_URI,

          mimeType: RESOURCE_MIME_TYPE,

          text: widgetHtml,

          _meta: {

            /*
             * Modern MCP Apps UI configuration
             */

            ui: {

              prefersBorder: true,

              csp: {
                connectDomains: [],
                resourceDomains: [],
              },
            },


            /*
             * ChatGPT Apps SDK compatibility metadata
             */

            "openai/widgetDescription":
              "AC Fashion Image Studio form. The uploaded garment is the HERO product.",

            "openai/widgetPrefersBorder": true,

            "openai/widgetCSP": {
              connect_domains: [],
              resource_domains: [],
            },
          },
        },
      ],
    })
  );


  /* =======================================================
     TOOL 1
     OPEN AC FASHION IMAGE STUDIO
     ======================================================= */

  registerAppTool(
    server,

    "open_fashion_studio",

    {

      title:
        "Open AC Fashion Image Studio",

      description:
        "Open the interactive AC Fashion Image Studio form. Use this when the user wants to create a fashion image.",


      inputSchema: {},


      annotations: {

        readOnlyHint: true,

        destructiveHint: false,

        openWorldHint: false,
      },


      _meta: {

        /*
         * This is the important connection between
         * the MCP tool and widget.html
         */

        ui: {
          resourceUri: WIDGET_URI,
        },


        /*
         * ChatGPT compatibility
         */

        "openai/outputTemplate":
          WIDGET_URI,

        "openai/widgetAccessible":
          true,

        "openai/toolInvocation/invoking":
          "Opening AC Fashion Image Studio…",

        "openai/toolInvocation/invoked":
          "AC Fashion Image Studio is ready.",
      },
    },


    async () => ({

      structuredContent: {

        app:
          "AC Fashion Image Studio",

        garment_required:
          true,

        garment_priority:
          "HERO — highest priority",


        defaults: {

          model_age:
            35,

          european_size:
            "38/40",

          occasion:
            "Elegant luxury interior",

          weaving:
            "None",

          accessory:
            "None",

          aspect_ratio:
            "2:3 portrait",
        },
      },


      content: [
        {

          type:
            "text",

          text:
            "The AC Fashion Image Studio interactive form is open. Upload the garment reference and choose the campaign settings in the form.",
        },
      ],
    })
  );


  /* =======================================================
     GARMENT REFERENCE SCHEMA
     ======================================================= */

  const garmentReferenceSchema =
    z.object({

      file_id:
        z.string().min(1),

      download_url:
        z.string().min(1),

      file_name:
        z.string().optional().default("garment-reference"),

      mime_type:
        z.string().optional().default("image/jpeg"),
    });


  /* =======================================================
     TOOL 2
     SUBMIT AC FASHION IMAGE REQUEST
     ======================================================= */

  registerAppTool(
    server,

    "submit_fashion_request",

    {

      title:
        "Submit AC fashion image request",


      description:
        "Submit the garment reference and selected AC fashion parameters. The Workspace Agent should use its Image Generation capability immediately after this request.",


      inputSchema: {

        garment_reference:
          garmentReferenceSchema,


        occasion:
          z.enum([
            "Elegant luxury interior",
            "City-chic",
            "Bistro environment",
            "Outdoor / free time",
            "Festivity",
          ]),


        european_size:
          z
            .enum([
              "38/40",
              "42/44",
            ])
            .default("38/40"),


        garment_family:
          z.string().min(1),


        material:
          z.string().min(1),


        weaving:
          z.string().default("None"),


        model_age:
          z
            .number()
            .int()
            .min(18)
            .max(90)
            .default(35),


        accessory:
          z.string().default("None"),


        extra_details:
          z.string().default("None"),
      },


      annotations: {

        readOnlyHint:
          false,

        destructiveHint:
          false,

        openWorldHint:
          false,
      },


      _meta: {

        /*
         * This tool can be called from widget.html
         */

        ui: {
          visibility: ["app"],
        },


        "openai/widgetAccessible":
          true,


        /*
         * Garment file input
         */

        "openai/fileParams": [
          "garment_reference",
        ],


        "openai/toolInvocation/invoking":
          "Preparing the fashion image request…",


        "openai/toolInvocation/invoked":
          "Fashion image request prepared.",
      },
    },


    async (input) => {


      /* ===================================================
         MODEL AGE
         =================================================== */

      const age =
        Number.isFinite(input.model_age) &&
        input.model_age >= 18

          ? input.model_age

          : 35;


      /* ===================================================
         BUILD STRUCTURED AC REQUEST
         =================================================== */

      const request = {

        garment_priority:
          "HERO — highest priority",


        garment_reference: {

          file_id:
            input.garment_reference.file_id,

          file_name:
            input.garment_reference.file_name ||
            "garment-reference",

          mime_type:
            input.garment_reference.mime_type ||
            "image/jpeg",
        },


        occasion:
          input.occasion,


        european_size:
          input.european_size || "38/40",


        garment_family:
          input.garment_family,


        material:
          input.material,


        weaving:
          input.weaving || "None",


        model_age:
          age,


        accessory:
          input.accessory || "None",


        extra_details:
          input.extra_details || "None",


        fixed_rules: {

          aspect_ratio:
            "2:3 portrait",


          expression:
            "natural smile",


          background:
            "sufficiently light and softly blurred",


          garment_fidelity:
            "preserve the uploaded garment as faithfully as possible",


          commercial_priority:
            "the uploaded garment is the product being advertised; the model, styling and environment remain secondary",


          ac_logo:
            "official gold AC crown logo from the Agent files, upper-right area, slightly inward toward centre",


          christmas_elements:
            "absolutely prohibited",
        },


        next_action:
          "Use Image Generation now and return the finished fashion image, not only a prompt.",
      };


      /* ===================================================
         TEXT RESULT FOR THE WORKSPACE AGENT
         =================================================== */

      const content = [

        {

          type:
            "text",

          text: [

            "AC FASHION IMAGE REQUEST",

            "",

            `Garment: ${request.garment_reference.file_name} — HERO / highest priority`,

            `Model age: ${request.model_age}`,

            `European size: ${request.european_size}`,

            `Family: ${request.garment_family}`,

            `Material: ${request.material}`,

            `Weaving: ${request.weaving}`,

            `Occasion: ${request.occasion}`,

            `Accessory: ${request.accessory}`,

            `Extra details: ${request.extra_details}`,

            "",

            "The garment is the primary commercial subject.",

            "Preserve its colour, silhouette, construction, print, texture, length, neckline, sleeves and visible design details.",

            "Keep the background secondary and sufficiently light.",

            "",

            "NEXT ACTION: Use Image Generation now and return the finished 2:3 fashion image.",

          ].join("\n"),
        },
      ];


      /* ===================================================
         RETRIEVE GARMENT IMAGE
         =================================================== */

      const url =
        input.garment_reference.download_url || "";


      if (url) {

        try {

          const controller =
            new AbortController();


          const timer =
            setTimeout(
              () => controller.abort(),
              15000
            );


          const response =
            await fetch(
              url,
              {
                signal:
                  controller.signal,

                redirect:
                  "follow",
              }
            );


          clearTimeout(timer);


          if (!response.ok) {

            throw new Error(
              `download returned ${response.status}`
            );
          }


          const mimeType =
            (
              response.headers.get(
                "content-type"
              ) ||

              input.garment_reference.mime_type ||

              ""
            )
              .split(";")[0]
              .trim();


          if (
            !IMAGE_TYPES.has(
              mimeType
            )
          ) {

            throw new Error(
              `unsupported image type: ${mimeType}`
            );
          }


          const arrayBuffer =
            await response.arrayBuffer();


          if (
            arrayBuffer.byteLength >
            MAX_IMAGE_BYTES
          ) {

            throw new Error(
              "image is larger than 20 MB"
            );
          }


          /*
           * Add actual garment image
           * to MCP tool result.
           */

          content.push({

            type:
              "image",

            data:
              Buffer
                .from(arrayBuffer)
                .toString("base64"),

            mimeType,
          });

        }

        catch (error) {

          content.push({

            type:
              "text",

            text:
              "Garment image transfer warning: " +

              (
                error?.message ||

                "could not retrieve the ChatGPT-managed garment image"
              ) +

              ". The structured fashion request was still submitted.",
          });
        }
      }

      else {

        content.push({

          type:
            "text",

          text:
            "Garment image transfer warning: no temporary download URL was supplied. If the Agent cannot see the image, attach the garment directly in the ChatGPT conversation; do not redo the form selections.",
        });
      }


      /* ===================================================
         RETURN TO WORKSPACE AGENT
         =================================================== */

      return {

        structuredContent:
          request,

        content,
      };
    }
  );


  return server;
}


/* =========================================================
   EXPRESS
   ========================================================= */

const app =
  express();


app.use(
  express.json({
    limit: "2mb",
  })
);


/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get(
  "/health",

  (_req, res) => {

    res
      .status(200)
      .json({

        ok:
          true,

        app:
          "AC Fashion Image Studio",

        version:
          "1.1.0",
      });
  }
);


/* =========================================================
   MCP ENDPOINT
   ========================================================= */

app.post(
  "/mcp",

  async (req, res) => {

    const server =
      createServer();


    const transport =
      new StreamableHTTPServerTransport({

        sessionIdGenerator:
          undefined,
      });


    res.on(
      "close",

      () => {

        transport
          .close()
          .catch(() => {});


        server
          .close()
          .catch(() => {});
      }
    );


    try {

      await server.connect(
        transport
      );


      await transport.handleRequest(
        req,
        res,
        req.body
      );
    }

    catch (error) {

      console.error(
        "MCP request failed:",
        error
      );


      if (!res.headersSent) {

        res
          .status(500)
          .json({

            error:
              "MCP request failed",
          });
      }
    }
  }
);


/* =========================================================
   INVALID MCP GET / DELETE
   ========================================================= */

app.get(
  "/mcp",

  (_req, res) => {

    res
      .status(405)
      .send(
        "Use POST /mcp"
      );
  }
);


app.delete(
  "/mcp",

  (_req, res) => {

    res
      .status(405)
      .send(
        "Stateless MCP server"
      );
  }
);


/* =========================================================
   START SERVER
   ========================================================= */

const port =
  Number(
    process.env.PORT ||
    3000
  );


app.listen(
  port,
  "0.0.0.0",

  () => {

    console.log(
      `AC Fashion Image Studio listening on port ${port}`
    );

    console.log(
      `MCP endpoint: http://localhost:${port}/mcp`
    );
  }
);
