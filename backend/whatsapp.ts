import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import OpenAI from 'openai';

// Store clients by companyId (we'll just use 'default' for this simple version)
const clients = new Map<string, typeof Client>();
// Store QR codes
const qrCodes = new Map<string, string>();
// Store connection status
const statuses = new Map<string, string>();

// Store OpenAI Threads by phone number
const userThreads = new Map<string, string>();

export const getWhatsAppStatus = (companyId: string) => {
  return {
    status: statuses.get(companyId) || 'DISCONNECTED',
    qrCode: qrCodes.get(companyId) || null,
  };
};

export const startWhatsAppClient = async (companyId: string) => {
  if (clients.has(companyId)) {
    const existingClient = clients.get(companyId)!;
    try {
      await existingClient.destroy();
    } catch (e) {}
    clients.delete(companyId);
  }

  statuses.set(companyId, 'INITIALIZING');
  qrCodes.delete(companyId);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: companyId }),
    puppeteer: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
      ],
    }
  });

  client.on('qr', async (qr: string) => {
    console.log(`[${companyId}] QR Code received`);
    statuses.set(companyId, 'QR_READY');
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      qrCodes.set(companyId, qrDataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  });

  client.on('ready', () => {
    console.log(`[${companyId}] WhatsApp is ready!`);
    statuses.set(companyId, 'CONNECTED');
    qrCodes.delete(companyId);
  });

  client.on('authenticated', () => {
    console.log(`[${companyId}] Authenticated`);
  });

  client.on('auth_failure', (msg: any) => {
    console.error(`[${companyId}] Authentication failure`, msg);
    statuses.set(companyId, 'AUTH_FAILED');
  });

  client.on('disconnected', (reason: any) => {
    console.log(`[${companyId}] Disconnected:`, reason);
    statuses.set(companyId, 'DISCONNECTED');
    clients.delete(companyId);
  });

  client.on('message', async (msg: any) => {
    if (msg.from === 'status@broadcast') return;
    try {
      await handleIncomingMessage(msg, client);
    } catch (error) {
      console.error(`[${companyId}] Error handling message:`, error);
    }
  });

  clients.set(companyId, client);
  
  try {
    await client.initialize();
  } catch (err) {
    console.error(`[${companyId}] Failed to initialize client:`, err);
    statuses.set(companyId, 'ERROR');
  }
};

export const logoutWhatsAppClient = async (companyId: string) => {
  const client = clients.get(companyId);
  if (client) {
    try {
      await client.logout();
    } catch (e) {
      console.error('Error logging out:', e);
    }
    try {
      await client.destroy();
    } catch (e) {}
    clients.delete(companyId);
  }
  statuses.set(companyId, 'DISCONNECTED');
  qrCodes.delete(companyId);
};

async function handleIncomingMessage(msg: any, client: any) {
  const from = msg.from.replace('@c.us', '');
  let msgText = msg.body;

  if (msg.hasMedia) {
    console.log("Ignorando mídia/áudio.");
    return;
  }

  if (!msgText) return;

  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    console.error("Faltam as chaves OPENAI_API_KEY ou OPENAI_ASSISTANT_ID no Render.");
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });

    let threadId = userThreads.get(from);
    
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      userThreads.set(from, threadId);
      console.log(`Nova Thread criada para ${from}: ${threadId}`);
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: msgText
    });

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data
        .filter(m => m.role === 'assistant')
        .shift();

      if (lastMessage && lastMessage.content[0].type === 'text') {
        const aiResponseText = lastMessage.content[0].text.value;
        await client.sendMessage(msg.from, aiResponseText);
      }
    } else {
      console.error("Run failed or requires action:", run.status);
    }
  } catch (error) {
    console.error("Error processing AI response:", error);
  }
}
