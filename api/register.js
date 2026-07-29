const { kv } = require("@vercel/kv");

function generateUserId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "AMR-";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { username, password, fullname } = req.body;
    if (!username  !password  !fullname)
      return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة" });

    const existing = await kv.get(user:${username.toLowerCase()});
    if (existing) return res.status(400).json({ success: false, message: "اسم المستخدم موجود مسبقاً" });

    const userId = generateUserId();
    const userData = {
      userId,
      username: username.toLowerCase(),
      password,
      fullname,
      balance: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(user:${username.toLowerCase()}, userData);
    await kv.set(uid:${userId}, username.toLowerCase());

    return res.status(200).json({ success: true, userId, fullname });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطأ في السيرفر: " + e.message });
  }
};
