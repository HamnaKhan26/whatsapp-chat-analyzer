import fs from "fs";
import readline from "readline";
import { format as csvFormat } from "fast-csv";
import Sentiment from "sentiment";
import emojiRegex from "emoji-regex";
import nlp from "compromise";

// ---------- Config ----------
const inputFile = "./sample-chat.txt";
const outputFile = "./chat.csv";

// Regex for standard WhatsApp message lines
const messageRegex =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}\s?[APap][Mm]) - ([^:]+): (.*)$/;

// ---------- Setup Streams ----------
const readStream = fs.createReadStream(inputFile, { encoding: "utf8" });
const rl = readline.createInterface({ input: readStream });

const csvStream = csvFormat({ headers: true });
const writable = fs.createWriteStream(outputFile);
csvStream.pipe(writable);

// ---------- Helpers ----------
const sentiment = new Sentiment();
const emojiPattern = emojiRegex();

/**
 * Analyze sentiment of a message.
 */
function analyzeSentiment(text) {
  const { score } = sentiment.analyze(text);
  const label = score > 0 ? "Positive" : score < 0 ? "Negative" : "Neutral";
  return { sentimentScore: score, sentimentLabel: label };
}

/**
 * Extract emojis from a message.
 */
function extractEmojis(text) {
  return [...text.matchAll(emojiPattern)].map(e => e[0]).join(" ");
}

/**
 * Extract topic keywords (nouns).
 */
function extractTopics(text) {
  const doc = nlp(text);
  return doc.nouns().out("array").join(", ");
}

/**
 * Build enriched message object.
 */
function buildMessage({ date, time, sender, message }) {
  const { sentimentLabel, sentimentScore } = analyzeSentiment(message);
  const emojis = extractEmojis(message);
  const topics = extractTopics(message);

  return { date, time, sender, message, sentimentLabel, sentimentScore, emojis, topics };
}

// ---------- Main Logic ----------
let currentMessage = null;
let messageCount = 0;

rl.on("line", line => {
  const match = line.match(messageRegex);

  if (match) {
    // Save previous message if any
    if (currentMessage) {
      csvStream.write(currentMessage);
      messageCount++;
    }

    // Parse message
    const [, date, time, sender, message] = match;
    currentMessage = buildMessage({ date, time, sender, message });
  } else if (currentMessage) {
    // Continuation of previous message
    currentMessage.message += "\n" + line.trim();
    Object.assign(currentMessage, buildMessage(currentMessage));
  }
});

rl.on("close", () => {
  if (currentMessage) {
    csvStream.write(currentMessage);
    messageCount++;
  }

  csvStream.end();
  console.log(`✅ Parsed ${messageCount} messages into ${outputFile}`);
});
