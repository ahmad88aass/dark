const { kv } = require("@vercel/kv");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

async function sendTelegram(text) {
  const url = https://api.telegram.org/bot${BOT_TOKEN}/sendMessage;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: "HTML" }),
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, amount, paymentMethod } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, message: "بيانات ناقصة" });

    const username = await kv.get(uid:${userId});
    if (!username) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    const userData = await kv.get(user:${username});

    const msg = 🔔 <b>طلب شحن رصيد جديد</b>\n\n👤 <b>الاسم:</b> ${userData.fullname}\n🆔 <b>الأيدي:</b> <code>${userId}</code>\n💰 <b>المبلغ:</b> $${amount}\n💳 <b>طريقة الدفع:</b> ${paymentMethod || "غير محدد"}\n📅 <b>الوقت:</b> ${new Date().toLocaleString("ar-SY")}\n\n✅ بعد التأكيد أرسل كود الشحن:\n<code>/addbalance ${userId} ${amount}</code>;

    await sendTelegram(msg);
    return res.status(200).json({ success: true, message: "تم إرسال طلب الشحن للإدارة بنجاح!" });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطأ في الإرسال: " + e.message });
  }
};
