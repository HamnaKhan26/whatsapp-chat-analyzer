# 💬 WhatsApp Chat Parser

A Node.js tool that converts exported WhatsApp chats from `.txt` files into structured `.csv` files — using streams for efficiency and memory safety.

---

## 🚀 Features

- Stream-based file reading (no memory overload)
- Handles multi-line messages
- Converts WhatsApp chat exports into CSV format
- Uses regex to extract date, time, sender, and message
- Sentiment analysis over time
- Emoji frequency detection
- Calendar event generation — detects date/time mentions in chats and automatically generates .ics calendar files.
- Topic discussion analysis — identifies and visualizes key discussion themes within the conversation.

---

## 🛠️ Setup

```bash
git clone https://github.com/HamnaKhan26/whatsapp-chat-parser.git
cd whatsapp-chat-parser
npm install
