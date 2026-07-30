const express = require("express");
const redis = require("redis");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const client = redis.createClient({ url: process.env.REDIS_URL });
client.on("error", (e) => console.error("Redis Error:", e));
client.connect();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

async function sendTelegram(chatId, text) {
  try {
    const url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "HTML" }),
    });
  } catch (e) { console.error("Telegram error:", e); }
}

function generateUserId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "AMR-";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

app.post("/api/register", async (req, res) => {
  try {
    const { username, password, fullname } = req.body;
    if (!username  !password  !fullname)
      return res.json({ success: false, message: "جميع الحقول مطلوبة" });
    const existing = await client.get("user:" + username.toLowerCase());
    if (existing) return res.json({ success: false, message: "اسم المستخدم موجود مسبقاً" });
    const userId = generateUserId();
    const userData = { userId, username: username.toLowerCase(), password, fullname, balance: 0, createdAt: new Date().toISOString() };
    await client.set("user:" + username.toLowerCase(), JSON.stringify(userData));
    await client.set("uid:" + userId, username.toLowerCase());
    res.json({ success: true, userId, fullname });
  } catch (e) { res.json({ success: false, message: "خطأ في السيرفر" }); }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const raw = await client.get("user:" + username.toLowerCase());
    if (!raw) return res.json({ success: false, message: "المستخدم غير موجود" });
    const userData = JSON.parse(raw);
    if (userData.password !== password) return res.json({ success: false, message: "كلمة المرور غلط" });
    res.json({ success: true, userId: userData.userId, fullname: userData.fullname, balance: userData.balance });
  } catch (e) { res.json({ success: false, message: "خطأ في السيرفر" }); }
});

app.get("/api/balance", async (req, res) => {
  try {
    const { userId } = req.query;
    const username = await client.get("uid:" + userId);
    if (!username) return res.json({ success: false, message: "المستخدم غير موجود" });
    const userData = JSON.parse(await client.get("user:" + username));
    res.json({ success: true, balance: userData.balance || 0 });
  } catch (e) { res.json({ success: false, message: "خطأ في السيرفر" }); }
});

app.post("/api/request-charge", async (req, res) => {
  try {
    const { userId, amount, paymentMethod } = req.body;
    const username = await client.get("uid:" + userId);
    if (!username) return res.json({ success: false, message: "المستخدم غير موجود" });
    const userData = JSON.parse(await client.get("user:" + username));
    const msg = "🔔 طلب شحن جديد\n👤 " + userData.fullname + "\n🆔 " + userId + "\n💰 $" + amount + "\n💳 " + (paymentMethod || "غير محدد") + "\n\nارسل: /addbalance " + userId + " " + amount;
    await sendTelegram(ADMIN_CHAT_ID, msg);
    res.json({ success: true, message: "تم إرسال طلب الشحن!" });
  } catch (e) { res.json({ success: false, message: "خطأ في الإرسال" }); }
});

app.post("/api/redeem", async (req, res) => {
  try {
    const { userId, code } = req.body;
    const vRaw = await client.get("voucher:" + code.toUpperCase());if (!vRaw) return res.json({ success: false, message: "كود الشحن غير صحيح" });
    const voucher = JSON.parse(vRaw);
    if (voucher.used) return res.json({ success: false, message: "الكود تم استخدامه مسبقاً" });
    if (voucher.targetUserId && voucher.targetUserId !== userId)
      return res.json({ success: false, message: "هذا الكود ليس لحسابك" });
    const username = await client.get("uid:" + userId);
    const userData = JSON.parse(await client.get("user:" + username));
    userData.balance = (userData.balance || 0) + voucher.amount;
    await client.set("user:" + username, JSON.stringify(userData));
    voucher.used = true;
    voucher.usedBy = userId;
    await client.set("voucher:" + code.toUpperCase(), JSON.stringify(voucher));
    res.json({ success: true, amount: voucher.amount, newBalance: userData.balance, message: "تم شحن $" + voucher.amount + " بنجاح!" });
  } catch (e) { res.json({ success: false, message: "خطأ في السيرفر" }); }
});

app.post("/api/buy", async (req, res) => {
  try {
    const { userId, serviceName, price, details } = req.body;
    const username = await client.get("uid:" + userId);
    if (!username) return res.json({ success: false, message: "المستخدم غير موجود" });
    const userData = JSON.parse(await client.get("user:" + username));
    if ((userData.balance || 0) < price)
      return res.json({ success: false, message: "رصيدك غير كافٍ" });
    userData.balance = (userData.balance || 0) - price;
    const orderId = "ORD-" + Date.now();
    const order = { orderId, userId, username, fullname: userData.fullname, serviceName, price, details: details || "", status: "pending", createdAt: new Date().toISOString() };
    await client.set("order:" + orderId, JSON.stringify(order));
    await client.set("user:" + username, JSON.stringify(userData));
    const isTelegram = serviceName.includes("تلغرام بريميوم");
    let adminMsg = "🛒 طلب شراء جديد\n🆔 " + orderId + "\n👤 " + userData.fullname + "\n🔑 " + userId + "\n📦 " + serviceName + "\n💰 $" + price;
    if (details) adminMsg += "\n📝 " + details;
    adminMsg += isTelegram ? "\n\n/done " + orderId : "\n\n/sendcode " + orderId + " الكود";
    await sendTelegram(ADMIN_CHAT_ID, adminMsg);
    const responseMsg = isTelegram ? "تم استلام طلبك! سيتم تنفيذه خلال 3 ساعات." : "تم استلام طلبك! ستصلك تفاصيل الخدمة قريباً.";
    res.json({ success: true, orderId, newBalance: userData.balance, message: responseMsg });
  } catch (e) { res.json({ success: false, message: "خطأ في السيرفر" }); }
});

app.get("/api/order-status", async (req, res) => {
  try {
    const { orderId, userId } = req.query;
    const raw = await client.get("order:" + orderId);
    if (!raw) return res.json({ success: false, message: "الطلب غير موجود" });
    const order = JSON.parse(raw);
    if (order.userId !== userId) return res.json({ success: false });
    res.json({ success: true, status: order.status, deliveredCode: order.deliveredCode || null });
  } catch (e) { res.json({ success: false }); }
});

app.post("/api/bot-webhook", async (req, res) => {
  res.status(200).end();
  try {
    const { message } = req.body;
    if (!message || !message.text) return;
    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    if (chatId !== ADMIN_CHAT_ID) {
      await sendTelegram(chatId, "غير مصرح لك.");
      return;
    }
    if (text.startsWith("/addbalance")) {
      const parts = text.split(" ");
      const uid = parts[1];
      const amount = parseFloat(parts[2]);
      if (!uid || isNaN(amount)) { await sendTelegram(chatId, "استخدام: /addbalance AMR-XXXX 10"); return; }
      const username = await client.get("uid:" + uid);
      if (!username) { await sendTelegram(chatId, "المستخدم غير موجود"); return; }
      const userData = JSON.parse(await client.get("user:" + username));userData.balance = (userData.balance || 0) + amount;
      await client.set("user:" + username, JSON.stringify(userData));
      await sendTelegram(chatId, "تم شحن $" + amount + " للمستخدم " + userData.fullname + "\nالرصيد الجديد: $" + userData.balance);
      return;
    }
    if (text.startsWith("/sendcode")) {
      const parts = text.split(" ");
      const orderId = parts[1];
      const code = parts.slice(2).join(" ");
      if (!orderId || !code) { await sendTelegram(chatId, "استخدام: /sendcode ORD-xxx الكود"); return; }
      const raw = await client.get("order:" + orderId);
      if (!raw) { await sendTelegram(chatId, "الطلب غير موجود"); return; }
      const order = JSON.parse(raw);
      order.deliveredCode = code;
      order.status = "delivered";
      await client.set("order:" + orderId, JSON.stringify(order));
      await sendTelegram(chatId, "تم حفظ الكود للطلب " + orderId);
      return;
    }
    if (text.startsWith("/done")) {
      const parts = text.split(" ");
      const orderId = parts[1];
      if (!orderId) { await sendTelegram(chatId, "استخدام: /done ORD-xxx"); return; }
      const raw = await client.get("order:" + orderId);
      if (!raw) { await sendTelegram(chatId, "الطلب غير موجود"); return; }
      const order = JSON.parse(raw);
      order.status = "delivered";
      await client.set("order:" + orderId, JSON.stringify(order));
      await sendTelegram(chatId, "تم تأكيد تنفيذ الطلب " + orderId);
      return;
    }
    await sendTelegram(chatId, "الأوامر:\n/addbalance AMR-XXXX 10\n/sendcode ORD-xxx الكود\n/done ORD-xxx");
  } catch (e) { console.error(e); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
