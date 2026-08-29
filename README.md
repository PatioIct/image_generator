# AC Fashion Image Studio — ChatGPT Business App

This project is a **ChatGPT Apps SDK / MCP interface** for your AC Fashion Image Studio Workspace Agent.

It does **not** call the OpenAI API and it contains **no OpenAI API key**.

The flow is:

1. User opens the AC Fashion Image Studio form inside ChatGPT.
2. User uploads the garment and chooses the fashion parameters.
3. The widget uses ChatGPT's host file bridge to upload the garment.
4. The widget calls the MCP tool `submit_fashion_request`.
5. The MCP server returns the structured request **plus the garment image** to the Workspace Agent.
6. The widget sends a follow-up instruction into the Agent conversation.
7. Your Workspace Agent uses its built-in **Image Generation** tool.
8. The finished image appears in ChatGPT.

## Important

This app does not independently generate images. Image generation must be enabled as a tool on the **Workspace Agent**.

The official AC crown logo should be uploaded as a permanent file on the Workspace Agent, not uploaded every time through this form.

## Requirements

- ChatGPT Business workspace
- Admin/Owner access for Developer Mode and publishing a custom app
- Workspace Agent with **Image Generation** enabled
- Node.js 20+ for local testing / hosting
- A public HTTPS URL for the MCP endpoint, or OpenAI Secure MCP Tunnel for development

No OpenAI API key is required.

---

## 1. Agent setup

Open your existing **AC Fashion Image Studio** Workspace Agent.

Make sure its existing instructions include your garment-fidelity / garment-is-the-HERO rules.

Append the contents of:

`AGENT-INSTRUCTIONS-ADDON.txt`

Also upload your official AC crown logo as a permanent Agent file.

In the Agent's Tools section, enable **Image Generation**.

Do not publish the Agent yet if you are still testing.

---

## 2. Run the app locally

In a terminal:

```bash
npm install
npm start
```

The local health check will be:

```text
http://localhost:3000/health
```

The MCP endpoint is:

```text
http://localhost:3000/mcp
```

ChatGPT cannot directly connect to localhost. For local development, use OpenAI Secure MCP Tunnel if available to your workspace, or deploy the app to a public HTTPS host.

---

## 3. Easiest hosting option: Render

### Option A — GitHub + Render

1. Create a new GitHub repository.
2. Upload this entire project folder to the repository.
3. In Render, create a new **Web Service** from the repository.
4. Render should detect the included `render.yaml`, or configure manually:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
5. Deploy.
6. Open the Render URL followed by `/health` and confirm it returns JSON with `"ok": true`.
7. Your MCP endpoint will be:

```text
https://YOUR-RENDER-SERVICE.onrender.com/mcp
```

There are no OpenAI credentials to configure.

---

## 4. Add the custom app to ChatGPT Business

As a Business workspace Admin/Owner:

1. Open **Workspace Settings**.
2. Go to **Apps → Create**.
3. Enable Developer Mode for yourself if prompted.
4. Enter your MCP endpoint, for example:

```text
https://YOUR-RENDER-SERVICE.onrender.com/mcp
```

5. Use no authentication for the first internal test if your workspace and risk policy allow it. For production, add authentication / access controls appropriate for your company.
6. Click **Scan Tools**.
7. ChatGPT should find:
   - `open_fashion_studio`
   - `submit_fashion_request`
8. Click **Create**.
9. The app should appear as a Dev/Draft custom app.

Do not publish workspace-wide until testing is complete.

---

## 5. Attach the app to the Workspace Agent

Open:

**Agents → AC Fashion Image Studio → Edit**

Then:

1. Under **Tools**, choose **+ Add tool**.
2. Add the **AC Fashion Image Studio** custom app.
3. Make sure the app actions are available to the Agent:
   - `open_fashion_studio`
   - `submit_fashion_request`
4. Make sure **Image Generation** is also enabled.
5. Append `AGENT-INSTRUCTIONS-ADDON.txt` to the Agent instructions.
6. Save / Update the Agent draft.

Your Agent should now effectively have:

```text
Image Generation
AC Fashion Image Studio
  - open_fashion_studio
  - submit_fashion_request
```

---

## 6. Test the complete workflow

Open **Test this agent**.

Ask:

```text
Create a fashion image.
```

The Agent should open the AC Fashion Image Studio form.

In the form:

- Upload a garment image
- Occasion: City-chic
- Size: 38/40
- Family: Dress / Jurk
- Material: Viscose
- Weaving: Jacquard
- Age: leave at 35
- Accessory: None
- Extra details: Parisian luxury hotel entrance

Press:

**Generate Fashion Image**

Expected flow:

```text
Widget uploads garment through ChatGPT
        ↓
submit_fashion_request
        ↓
MCP returns structured settings + garment image
        ↓
Widget sends follow-up to Workspace Agent
        ↓
Agent invokes Image Generation
        ↓
Finished image appears in ChatGPT
```

---

## 7. Test the age default

Do not touch the age field.

The tool result should use:

```text
Model age: 35
```

Then test 25, 45, and Custom.

Custom age is constrained to 18–90 in the interface and server validation.

---

## 8. Test garment fidelity

Use a garment with obvious details, for example:

- distinctive buttons
- patterned fabric
- unusual neckline
- visible pockets
- specific sleeve shape

Check that the final generated image keeps those details and that the garment remains the dominant visual subject.

If the model or environment visually dominates the garment, strengthen the Agent's `GARMENT IS THE HERO` instructions before publishing.

---

## 9. Publish

After testing:

1. Publish the custom app in **Workspace Settings → Apps**.
2. Publish / Update the Workspace Agent.
3. Choose the desired Agent access level (private, link, or workspace directory).

On ChatGPT Business, custom app publishing and update behavior can change while MCP / Apps SDK support remains in beta. Test the draft thoroughly before publishing.

---

## Security note

The server fetches a temporary ChatGPT-hosted download URL for the garment so it can return the garment image as MCP image content to the Agent. It only accepts JPEG, PNG, or WEBP and limits downloads to 20 MB.

For production, you should also add company authentication or restrict network access to the MCP endpoint.

---

## Troubleshooting

### The form appears but Generate says it must run inside ChatGPT
The widget is being opened outside the ChatGPT Apps SDK host, or the ChatGPT file/tool bridge is unavailable.

### The app scans but the form does not render
Refresh/recreate the Dev app after changing the widget template. ChatGPT may cache app templates during development.

### The structured request works but the garment image is missing
The host-managed download URL may not have been available. Attach the garment directly to the ChatGPT Agent conversation; the Agent instructions tell it to reuse the already-submitted form settings.

### The Agent returns a prompt instead of an image
Confirm **Image Generation** is enabled on the Workspace Agent and that `AGENT-INSTRUCTIONS-ADDON.txt` was appended to its instructions.

### The Agent does not open the form automatically
Add a starter prompt such as `Create a fashion image` and make sure the instructions say to use `open_fashion_studio` as the preferred experience.
