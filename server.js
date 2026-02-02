import fs from "fs";
import path from "path";
import express from "express";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "config.json");
const configFile = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const config = {
  webAppUrl: process.env.WEBAPP_URL || configFile.webAppUrl,
  orderEmailTo: process.env.ORDER_EMAIL_TO || configFile.orderEmailTo,
  orderEmailFrom: process.env.ORDER_EMAIL_FROM || configFile.orderEmailFrom,
  privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || configFile.privacyPolicyUrl,
  operatorName: process.env.OPERATOR_NAME || configFile.operatorName,
  smtp: {
    host: process.env.SMTP_HOST || configFile.smtp.host,
    port: Number(process.env.SMTP_PORT || configFile.smtp.port),
    secure: String(process.env.SMTP_SECURE || configFile.smtp.secure) === "true",
    user: process.env.SMTP_USER || configFile.smtp.user,
    pass: process.env.SMTP_PASS || configFile.smtp.pass
  }
};

const dataDir = path.join(__dirname, "data");
const categories = JSON.parse(fs.readFileSync(path.join(dataDir, "categories.json"), "utf-8"));
const products = JSON.parse(fs.readFileSync(path.join(dataDir, "products.json"), "utf-8"));

const storagePath = path.join(__dirname, "storage.json");
const defaultStorage = { users: {}, favorites: {}, orders: {} };

function readStorage() {
  if (!fs.existsSync(storagePath)) {
    fs.writeFileSync(storagePath, JSON.stringify(defaultStorage, null, 2));
  }
  try {
    const raw = fs.readFileSync(storagePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { ...defaultStorage };
  }
}

function writeStorage(storage) {
  fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2));
}

function getUserId(req) {
  return req.header("x-telegram-user-id") || "guest";
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (req, res) => {
  res.json({
    privacyPolicyUrl: config.privacyPolicyUrl,
    operatorName: config.operatorName,
    orderEmailTo: config.orderEmailTo
  });
});

app.get("/api/categories", (req, res) => {
  res.json(categories);
});

app.get("/api/products", (req, res) => {
  const { categoryId } = req.query;
  if (!categoryId) {
    return res.json(products);
  }
  res.json(products.filter((p) => p.categoryId === categoryId));
});

app.get("/api/product/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Not found" });
  }
  res.json(product);
});

app.get("/api/user", (req, res) => {
  const userId = getUserId(req);
  const storage = readStorage();
  res.json(storage.users[userId] || null);
});

app.post("/api/user", (req, res) => {
  const userId = getUserId(req);
  const storage = readStorage();
  storage.users[userId] = {
    fullName: req.body.fullName || "",
    phone: req.body.phone || "",
    email: req.body.email || ""
  };
  writeStorage(storage);
  res.json({ ok: true });
});

app.get("/api/favorites", (req, res) => {
  const userId = getUserId(req);
  const storage = readStorage();
  res.json(storage.favorites[userId] || []);
});

app.post("/api/favorites", (req, res) => {
  const userId = getUserId(req);
  const storage = readStorage();
  const list = new Set(storage.favorites[userId] || []);
  if (req.body.productId) {
    list.add(req.body.productId);
  }
  storage.favorites[userId] = Array.from(list);
  writeStorage(storage);
  res.json({ ok: true });
});

app.delete("/api/favorites/:id", (req, res) => {
  const userId = getUserId(req);
  const storage = readStorage();
  const list = (storage.favorites[userId] || []).filter((id) => id !== req.params.id);
  storage.favorites[userId] = list;
  writeStorage(storage);
  res.json({ ok: true });
});

app.get("/api/orders", (req, res) => {
  const userId = getUserId(req);
  const storage = readStorage();
  res.json(storage.orders[userId] || []);
});

async function sendOrderEmail(order, customer) {
  const { host, port, secure, user, pass } = config.smtp;
  if (!host || !user || !pass || !config.orderEmailTo) {
    return { sent: false, reason: "SMTP not configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const lines = [];
  lines.push(`Новая заявка от ${customer.fullName || "—"}`);
  lines.push(`Телефон: ${customer.phone || "—"}`);
  lines.push(`Email: ${customer.email || "—"}`);
  lines.push(`Telegram user id: ${order.telegramUserId}`);
  lines.push(`Дата: ${new Date(order.createdAt).toLocaleString("ru-RU")}`);
  lines.push("");
  lines.push("Товары:");
  order.items.forEach((item) => {
    lines.push(`- ${item.title} (${item.sku}) x${item.qty} = ${item.sum} ₽`);
  });
  lines.push("");
  lines.push(`Итого: ${order.total} ₽`);

  await transporter.sendMail({
    from: config.orderEmailFrom,
    to: config.orderEmailTo,
    subject: `Заявка Lambriz #${order.id}`,
    text: lines.join("\n")
  });

  return { sent: true };
}

app.post("/api/orders", async (req, res) => {
  const userId = getUserId(req);
  const { items = [], customer = {} } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Empty order" });
  }

  const normalized = items
    .map((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) return null;
      const qty = Number(item.qty) || 1;
      const sum = product.price * qty;
      return {
        id: product.id,
        title: product.title,
        sku: product.sku,
        price: product.price,
        qty,
        sum
      };
    })
    .filter(Boolean);

  const total = normalized.reduce((acc, item) => acc + item.sum, 0);
  const order = {
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    telegramUserId: userId,
    items: normalized,
    total
  };

  const storage = readStorage();
  storage.orders[userId] = storage.orders[userId] || [];
  storage.orders[userId].unshift(order);
  writeStorage(storage);

  let emailStatus = { sent: false };
  try {
    emailStatus = await sendOrderEmail(order, customer);
  } catch (error) {
    emailStatus = { sent: false, reason: error.message };
  }

  res.json({ ok: true, order, emailStatus });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Lambriz mini app server running on http://localhost:${port}`);
});
