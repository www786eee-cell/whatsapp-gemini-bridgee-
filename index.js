const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

const WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbz1KR2h1-MePwi3oB-4om6NqtzultB6AuSD5EnLZnoojVwyj_kisNH-ENWVYbakIi-iQw/exec";

// Har sender ko dobara jaldi reply na jaye iske liye cooldown (milliseconds mein)
// Yahan 10 minute (600,000 ms) rakha gaya hai
const COOLDOWN_MS = 10 * 60 * 1000;
const lastRepliedAt = new Map();

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", (qr) => {
  console.log("WhatsApp Linked Devices se yeh QR code scan karein:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp Bridge tayyar hai!");
});

client.on("message", async (msg) => {
  try {
    // Apne bheje hue messages, status, aur groups ignore karein
    if (msg.fromMe || msg.isStatus || msg.from.endsWith("@g.us")) {
      return;
    }

    const text = (msg.body || "").trim();
    if (!text) return;

    const now = Date.now();
    const prevTime = lastRepliedAt.get(msg.from) || 0;
    if (now - prevTime < COOLDOWN_MS) {
      return;
    }

    const contact = await msg.getContact();
    const senderName = contact.pushname || contact.name || msg.from;

    const res = await axios.post(
      WEBHOOK_URL,
      {
        sender: senderName,
        message: text
      },
      { timeout: 25000 }
    );

    const replyText = res?.data?.reply;
    if (replyText && typeof replyText === "string" && replyText.trim()) {
      await msg.reply(replyText.trim());
      lastRepliedAt.set(msg.from, now);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
});

client.initialize();
    
