const { kv } = require("@vercel/kv");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

async function sendTelegram(chatId, text) {
  await fetch(https://api.telegram.org/bot${BOT_TOKEN}/sendMessage, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).end();

  const { message } = req.body;
  if (!message || !message.text) return res.status(200).end();

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  // أوامر الإدارة فقط
  if (chatId !== ADMIN_CHAT_ID) {
    await sendTelegram(chatId, "⛔ غير مصرح لك باستخدام هذا البوت.");
    return res.status(200).end();
  }

  // /addbalance AMR-XXXXXXXX 10
  if (text.startsWith("/addbalance")) {
    const parts = text.split(" ");
    const uid = parts[1];
    const amount = parseFloat(parts[2]);
    if (!uid || isNaN(amount)) {
      await sendTelegram(chatId, "❌ استخدام: /addbalance AMR-XXXXXXXX 10");
      return res.status(200).end();
    }
    const username = await kv.get(uid:${uid});
    if (!username) {
      await sendTelegram(chatId, "❌ المستخدم غير موجود");
      return res.status(200).end();
    }
    const userData = await kv.get(user:${username});
    userData.balance = (userData.balance || 0) + amount;
    await kv.set(user:${username}, userData);
    await sendTelegram(chatId, ✅ تم شحن $${amount} للمستخدم ${userData.fullname} (${uid})\n💰 الرصيد الجديد: $${userData.balance});
    return res.status(200).end();
  }

  // /sendcode ORD-xxx الكود
  if (text.startsWith("/sendcode")) {
    const parts = text.split(" ");
    const orderId = parts[1];
    const code = parts.slice(2).join(" ");
    if (!orderId || !code) {
      await sendTelegram(chatId, "❌ استخدام: /sendcode ORD-xxx الكود_هنا");
      return res.status(200).end();
    }
    const order = await kv.get(order:${orderId});
    if (!order) {
      await sendTelegram(chatId, "❌ الطلب غير موجود");
      return res.status(200).end();
    }
    // حفظ الكود في الطلب
    order.deliveredCode = code;
    order.status = "delivered";
    await kv.set(order:${orderId}, order);
    await sendTelegram(chatId, ✅ تم حفظ الكود للطلب ${orderId}\n📱 العميل سيشوف الكود على الموقع.);
    return res.status(200).end();
  }

  // /done ORD-xxx (تأكيد تنفيذ تلغرام بريميوم)
  if (text.startsWith("/done")) {
    const parts = text.split(" ");
    const orderId = parts[1];
    if (!orderId) {
      await sendTelegram(chatId, "❌ استخدام: /done ORD-xxx");
      return res.status(200).end();
    }
    const order = await kv.get(order:${orderId});
    if (!order) {
      await sendTelegram(chatId, "❌ الطلب غير موجود");
      return res.status(200).end();
    }
    order.status = "delivered";
    await kv.set(order:${orderId}, order);
    await sendTelegram(chatId, ✅ تم تأكيد تنفيذ الطلب ${orderId});
    return res.status(200).end();
  }

  await sendTelegram(chatId, الأوامر المتاحة:\n/addbalance AMR-xxx 10\n/sendcode ORD-xxx الكود\n/done ORD-xxx);
  return res.status(200).end();
};
