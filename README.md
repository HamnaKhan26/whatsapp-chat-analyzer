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

---

## 📊 Sample Output

### Sentiment Timeline
This graph shows how the average sentiment of messages changes over time.

![Sentiment Timeline](![alt text](image.png))

### Emoji Usage
![Emoji Frequency](![alt text](image-1.png))

---

## 🛠️ Setup

```bash
git clone https://github.com/HamnaKhan26/whatsapp-chat-parser.git
cd whatsapp-chat-parser
npm install
