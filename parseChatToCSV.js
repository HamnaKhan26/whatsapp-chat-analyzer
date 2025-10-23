import fs from "fs";
import readline from "readline";
import { format as csvFormat } from "fast-csv";
import Sentiment from "sentiment";
import emojiRegex from "emoji-regex";
import nlp from "compromise";
import * as chrono from "chrono-node";
import { createEvents } from "ics";
import { generateSentimentTimeline } from "./helpers/sentimentTimeline.js";
import { generateEmojiTimeline } from "./helpers/emojiTimeline.js";
import { generateTopicTimeline } from "./helpers/topicTimeline.js";

// ---------- Input/Output ----------
const inputFile = "./sample-chat.txt";
const outputFile = "./chat.csv";
const calendarFile = "./events.ics";

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
let messages = [];
let calendarEvents = [];

rl.on("line", line => {
  const match = line.match(messageRegex);

  if (match) {
    // Save previous message if any
    if (currentMessage) {
      csvStream.write(currentMessage);
      messages.push(currentMessage);
      messageCount++;
    }

    // Parse message
    const [, date, time, sender, message] = match;

    // Detect dates/times in message
    const results = chrono.parse(message);
    results.forEach(r => {
      const start = r.start.date();
      calendarEvents.push({
        title: message,
        start: [
          start.getFullYear(),
          start.getMonth() + 1,
          start.getDate(),
          start.getHours(),
          start.getMinutes()
        ]
      });
    });

    currentMessage = buildMessage({ date, time, sender, message });
  } else if (currentMessage) {
    // Continuation of previous message
    currentMessage.message += "\n" + line.trim();
    Object.assign(currentMessage, buildMessage(currentMessage));
  }
});

rl.on("close", async () => {
  if (currentMessage) {
    csvStream.write(currentMessage);
    messages.push(currentMessage);
    messageCount++;
  }

  csvStream.end();
  console.log(`✅ Parsed ${messageCount} messages into ${outputFile}`);

  await generateSentimentTimeline(messages);
  await generateEmojiTimeline(messages);
  await generateTopicTimeline(messages);

  // ---- GENERATE CALENDAR ----
  if (calendarEvents.length) {
    createEvents (calendarEvents, (error, value) => {
      if (error) {
        console.log(error);
        return;
      }
      fs.writeFileSync(calendarFile, value);
      console.log(`✅ Calendar events saved to ${calendarFile}`);
    });
  } else {
    console.log("No date/time mentions found for calendar events.");
  }
});
