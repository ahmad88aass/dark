const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId مطلوب" });

    const username = await kv.get(uid:${userId});
    if (!username) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });

    const userData = await kv.get(user:${username});
    return res.status(200).json({ success: true, balance: userData.balance || 0 });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطأ في السيرفر" });
  }
};
