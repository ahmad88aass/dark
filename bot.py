import telebot
import json
import os

BOT_TOKEN = "8062958069:AAHMn-CK9-UN0f2pmsu4H3POi-9I9kPNvo8"
ADMIN_ID = 963984335910

bot = telebot.TeleBot(BOT_TOKEN)

DB_FILE = "db.json"

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            return json.load(f)
    return {"users": {}, "orders": {}, "vouchers": {}}

def save_db(db):
    with open(DB_FILE, "w") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

@bot.message_handler(commands=["start"])
def start(msg):
    if msg.chat.id == ADMIN_ID:
        bot.reply_to(msg, "مرحباً أدمن!\n\nالأوامر:\n/addbalance AMR-XXXX 10\n/sendcode ORD-xxx الكود\n/done ORD-xxx\n/stats")

@bot.message_handler(commands=["addbalance"])
def add_balance(msg):
    if msg.chat.id != ADMIN_ID:
        return
    parts = msg.text.split()
    if len(parts) < 3:
        bot.reply_to(msg, "استخدام: /addbalance AMR-XXXX 10")
        return
    uid = parts[1]
    amount = float(parts[2])
    db = load_db()
    username = db.get("uid_map", {}).get(uid)
    if not username:
        bot.reply_to(msg, "المستخدم غير موجود")
        return
    db["users"][username]["balance"] = db["users"][username].get("balance", 0) + amount
    save_db(db)
    bot.reply_to(msg, f"✅ تم شحن ${amount} للمستخدم {db['users'][username]['fullname']}\nالرصيد الجديد: ${db['users'][username]['balance']}")

@bot.message_handler(commands=["sendcode"])
def send_code(msg):
    if msg.chat.id != ADMIN_ID:
        return
    parts = msg.text.split(None, 2)
    if len(parts) < 3:
        bot.reply_to(msg, "استخدام: /sendcode ORD-xxx الكود")
        return
    order_id = parts[1]
    code = parts[2]
    db = load_db()
    if order_id not in db.get("orders", {}):
        bot.reply_to(msg, "الطلب غير موجود")
        return
    db["orders"][order_id]["deliveredCode"] = code
    db["orders"][order_id]["status"] = "delivered"
    save_db(db)
    bot.reply_to(msg, f"✅ تم حفظ الكود للطلب {order_id}")

@bot.message_handler(commands=["done"])
def done_order(msg):
    if msg.chat.id != ADMIN_ID:
        return
    parts = msg.text.split()
    if len(parts) < 2:
        bot.reply_to(msg, "استخدام: /done ORD-xxx")
        return
    order_id = parts[1]
    db = load_db()
    if order_id not in db.get("orders", {}):
        bot.reply_to(msg, "الطلب غير موجود")
        return
    db["orders"][order_id]["status"] = "delivered"
    save_db(db)
    bot.reply_to(msg, f"✅ تم تأكيد تنفيذ الطلب {order_id}")

@bot.message_handler(commands=["stats"])
def stats(msg):
    if msg.chat.id != ADMIN_ID:
        return
    db = load_db()
    users = len(db.get("users", {}))
    orders = len(db.get("orders", {}))
    bot.reply_to(msg, f"📊 الإحصائيات:\n👥 المستخدمين: {users}\n🛒 الطلبات: {orders}")

print("البوت شغال...")
bot.infinity_polling()
