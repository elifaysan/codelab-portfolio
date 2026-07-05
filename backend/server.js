import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import helmet from "helmet";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const isProd = process.env.NODE_ENV === "production";
const staticDir = isProd ? path.join(rootDir, "dist") : rootDir;

if (isProd && !fs.existsSync(path.join(staticDir, "index.html"))) {
  console.error("dist/ bulunamadı. Kök dizinde npm run build çalıştırın.");
  process.exit(1);
}

dotenv.config({ path: path.join(__dirname, ".env"), override: true });

const {
  PORT = 3001,
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_USER,
  SMTP_PASS,
  MAIL_TO,
  RESEND_API_KEY,
  MAIL_FROM = "codeLab Portföy <onboarding@resend.dev>",
  ALLOWED_ORIGINS = "http://localhost:3001",
} = process.env;

const ALLOWED_SERVICES = new Set([
  "QR Menü",
  "Mobil Uygulama",
  "Web Sitesi",
  "Özel Yazılım",
  "Dijital Deneyim",
  "Yapay Zeka Çözümü",
]);

const app = express();
app.disable("x-powered-by");
if (isProd) app.set("trust proxy", 1);

const origins = ALLOWED_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        ...(isProd ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: isProd
      ? { maxAge: 63_072_000, includeSubDomains: true, preload: true }
      : false,
  }),
);

app.use(
  cors({
    origin(origin, cb) {
      // Doğrudan sayfa açılışı / aynı origin isteklerinde Origin header olmayabilir
      if (!origin) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      cb(new Error("CORS blocked"));
    },
  }),
);

app.use(express.json({ limit: "16kb" }));

app.use((req, res, next) => {
  const blocked =
    /^\/(backend|node_modules|\.git|scripts)(\/|$)/i.test(req.path) ||
    (!isProd && /^\/dist(\/|$)/i.test(req.path)) ||
    req.path.includes("..") ||
    /\.env/i.test(req.path);
  if (blocked) return res.status(404).end();
  if (isProd && /^\/(js\/main\.js|css\/style\.css)$/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
});

app.use("/api/contact", limiter);

let transporter = null;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP ayarları eksik");
  }
  if (!transporter) {
    const pass = (SMTP_PASS ?? "").replace(/\s/g, "");
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: false,
      requireTLS: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: { user: SMTP_USER, pass },
    });
  }
  return transporter;
}

async function sendContactMail({ mailTo, cleanEmail, cleanName, cleanService, cleanMessage, subject }) {
  const text = [
    `Ad: ${cleanName}`,
    `E-posta: ${cleanEmail}`,
    `Hizmet: ${cleanService || "—"}`,
    "",
    cleanMessage,
  ].join("\n");

  const html = `
    <p><strong>Ad:</strong> ${escapeHtml(cleanName)}</p>
    <p><strong>E-posta:</strong> ${escapeHtml(cleanEmail)}</p>
    <p><strong>Hizmet:</strong> ${escapeHtml(cleanService || "—")}</p>
    <hr>
    <p>${escapeHtml(cleanMessage).replace(/\n/g, "<br>")}</p>
  `;

  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [mailTo],
        reply_to: cleanEmail,
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Resend hatası (${res.status})`);
    }
    return;
  }

  await getTransporter().sendMail({
    from: `"codeLab Portföy" <${SMTP_USER}>`,
    to: mailTo,
    replyTo: cleanEmail,
    subject,
    text,
    html,
  });
}

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

const hasInjection = (v) => /[\r\n\u0000]/.test(v);

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, service, message, _gotcha } = req.body ?? {};

    if (_gotcha) {
      return res.json({ ok: true });
    }

    const cleanName = String(name ?? "").trim().slice(0, 120);
    const cleanEmail = String(email ?? "").trim().slice(0, 254);
    const cleanService = String(service ?? "").trim().slice(0, 120);
    const cleanMessage = String(message ?? "").trim().slice(0, 5000);

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return res.status(400).json({ error: "Ad, e-posta ve mesaj zorunludur." });
    }
    if (!isEmail(cleanEmail)) {
      return res.status(400).json({ error: "Geçerli bir e-posta girin." });
    }
    if ([cleanName, cleanEmail, cleanService, cleanMessage].some(hasInjection)) {
      return res.status(400).json({ error: "Geçersiz karakter." });
    }
    if (cleanService && !ALLOWED_SERVICES.has(cleanService)) {
      return res.status(400).json({ error: "Geçersiz hizmet seçimi." });
    }

    const mailTo = MAIL_TO || SMTP_USER;
    const subject = `Proje talebi — ${cleanService || "Genel"}`;

    if (!RESEND_API_KEY && (!SMTP_HOST || !SMTP_USER || !SMTP_PASS)) {
      return res.status(503).json({ error: "Mail servisi yapılandırılmamış." });
    }

    await sendContactMail({
      mailTo,
      cleanEmail,
      cleanName,
      cleanService,
      cleanMessage,
      subject,
    });

    res.json({ ok: true });
  } catch (err) {
    if (!isProd) console.error("[contact]", err.message);
    res.status(500).json({ error: "Mail gönderilemedi." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(
  express.static(staticDir, {
    dotfiles: "deny",
    index: "index.html",
    maxAge: isProd ? "7d" : 0,
  }),
);

app.use((_req, res) => {
  res.status(404).end();
});

app.listen(PORT, () => {
  console.log(`Portföy sunucusu → http://localhost:${PORT}`);
  if (!isProd) {
    console.log(
      RESEND_API_KEY ? "Mail → Resend API" : `SMTP → ${SMTP_HOST} (${SMTP_USER})`,
    );
  }
  if (isProd && !RESEND_API_KEY) {
    console.warn(
      "Uyarı: Render Free SMTP engeller. RESEND_API_KEY ekleyin veya Starter plana geçin.",
    );
  }
  if (isProd && origins.some((o) => o.includes("localhost"))) {
    console.warn("Uyarı: ALLOWED_ORIGINS içinde localhost var.");
  }
});

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
