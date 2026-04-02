import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { getWhatsAppStatus, startWhatsAppClient, logoutWhatsAppClient } from "./backend/whatsapp.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- HEALTH / PING ENDPOINT ---
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- WHATSAPP QR CODE ---
app.get("/api/whatsapp/status/:companyId", (req, res) => {
  const { companyId } = req.params;
  const status = getWhatsAppStatus(companyId);
  res.json(status);
});

app.post("/api/whatsapp/start/:companyId", async (req, res) => {
  const { companyId } = req.params;
  try {
    await startWhatsAppClient(companyId);
    res.json({ success: true, message: "Client starting" });
  } catch (error) {
    console.error("Error starting WhatsApp client:", error);
    res.status(500).json({ success: false, error: "Failed to start client" });
  }
});

app.post("/api/whatsapp/logout/:companyId", async (req, res) => {
  const { companyId } = req.params;
  try {
    await logoutWhatsAppClient(companyId);
    res.json({ success: true, message: "Client logged out" });
  } catch (error) {
    console.error("Error logging out WhatsApp client:", error);
    res.status(500).json({ success: false, error: "Failed to logout client" });
  }
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
