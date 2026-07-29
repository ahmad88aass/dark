const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ success: false, message: "بيانات ناقصة" });

    const voucherData = await kv.get(voucher:${code.toUpperCase()});
    if (!voucherData) return res.status(400).json({ success: false, message: "كود الشحن غير صحيح أو منتهي" });
    if (voucherData.used) return res.status(400).json({ success: false, message: "هذا الكود تم استخدامه مسبقاً" });
    if (voucherData.targetUserId && voucherData.targetUserId !== userId)
      return res.status(400).json({ success: false, message: "هذا الكود ليس لحسابك" });

    const username = await kv.get(uid:${userId});
    if (!username) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    const userData = await kv.get(user:${username});

    const newBalance = (userData.balance || 0) + voucherData.amount;
    userData.balance = newBalance;
    await kv.set(user:${username}, userData);

    voucherData.used = true;
    voucherData.usedBy = userId;
    voucherData.usedAt = new Date().toISOString();
    await kv.set(voucher:${code.toUpperCase()}, voucherData);

    return res.status(200).json({
      success: true,
      amount: voucherData.amount,
      newBalance,
      message: تم شحن $${voucherData.amount} بنجاح!,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطأ في السيرفر" });
  }
};
