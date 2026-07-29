const { kv } = require("@vercel/kv");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

async function sendTelegram(chatId, text) {
  const url = https://api.telegram.org/bot${BOT_TOKEN}/sendMessage;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, serviceName, price, details } = req.body;
    if (!userId  !serviceName  !price)
      return res.status(400).json({ success: false, message: "بيانات ناقصة" });

    const username = await kv.get(uid:${userId});
    if (!username) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    const userData = await kv.get(user:${username});

    if ((userData.balance || 0) < price)
      return res.status(400).json({ success: false, message: "رصيدك غير كافٍ، يرجى شحن حسابك أولاً" });

    userData.balance = (userData.balance || 0) - price;

    const orderId = ORD-${Date.now()};
    const order = {
      orderId, userId, username,
      fullname: userData.fullname,
      serviceName, price,
      details: details || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await kv.set(order:${orderId}, order);
    await kv.set(user:${username}, userData);

    const isTelegram = serviceName.includes("تلغرام بريميوم");
    let adminMsg = 🛒 <b>طلب شراء جديد</b>\n\n;
    adminMsg += 🆔 <b>رقم الطلب:</b> <code>${orderId}</code>\n;
    adminMsg += 👤 <b>العميل:</b> ${userData.fullname}\n;
    adminMsg += 🔑 <b>أيدي العميل:</b> <code>${userId}</code>\n;
    adminMsg += 📦 <b>الخدمة:</b> ${serviceName}\n;
    adminMsg += 💰 <b>السعر:</b> $${price}\n;
    if (details) adminMsg += 📝 <b>التفاصيل:</b> ${details}\n;

    if (isTelegram) {
      adminMsg += \n⏳ سيتم التنفيذ خلال 3 ساعات\nبعد التنفيذ أرسل:\n<code>/done ${orderId}</code>;
    } else {
      adminMsg += \n✅ لإرسال الكود للعميل:\n<code>/sendcode ${orderId} الكود_هنا</code>;
    }

    await sendTelegram(ADMIN_CHAT_ID, adminMsg);

    const responseMsg = isTelegram
      ? "✅ تم استلام طلبك! سيتم تنفيذه خلال 3 ساعات."
      : "✅ تم استلام طلبك! ستصلك تفاصيل الخدمة قريباً عبر البوت.";

    return res.status(200).json({
      success: true,
      orderId,
      newBalance: userData.balance,
      message: responseMsg,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطأ في السيرفر: " + e.message });
  }
};
