const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: "أدخل اسم المستخدم وكلمة المرور" });

    const userData = await kv.get(user:${username.toLowerCase()});
    if (!userData) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    if (userData.password !== password)
      return res.status(401).json({ success: false, message: "كلمة المرور غلط" });

    return res.status(200).json({
      success: true,
      userId: userData.userId,
      fullname: userData.fullname,
      balance: userData.balance,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطأ في السيرفر" });
  }
};
