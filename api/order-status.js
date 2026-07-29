const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { orderId, userId } = req.query;
    if (!orderId || !userId) return res.status(400).json({ success: false });

    const order = await kv.get(order:${orderId});
    if (!order || order.userId !== userId)
      return res.status(404).json({ success: false, message: "الطلب غير موجود" });

    return res.status(200).json({
      success: true,
      status: order.status,
      deliveredCode: order.deliveredCode || null,
      serviceName: order.serviceName,
    });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
};
