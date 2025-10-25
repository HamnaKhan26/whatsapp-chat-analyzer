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

// ---------- Configuration ----------
const inputFile = "./sample-chat.txt";
const outputFile = "./chat.csv";
const calendarFile = "./events.ics";

// ---------- Regex ----------
const messageRegex =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}\s?[APap][Mm]) - ([^:]+): (.*)$/;

// ---------- Utilities ----------
const sentiment = new Sentiment();
const emojiPattern = emojiRegex();

/**
 * Analyze the sentiment of a message.
 */
const analyzeSentiment = (text) => {
  const { score } = sentiment.analyze(text);
  const label = score > 0 ? "Positive" : score < 0 ? "Negative" : "Neutral";
  return { sentimentScore: score, sentimentLabel: label };
};

/**
 * Extract emojis from a message.
 */
const extractEmojis = (text) =>
  [...text.matchAll(emojiPattern)].map((e) => e[0]).join(" ");

/**
 * Extract topics (nouns) using NLP.
 */
const extractTopics = (text) => {
  const doc = nlp(text);
  return doc.nouns().out("array").join(", ");
};

/**
 * Build a structured message object.
 */
const buildMessage = ({ date, time, sender, message }) => {
  const { sentimentLabel, sentimentScore } = analyzeSentiment(message);
  const emojis = extractEmojis(message);
  const topics = extractTopics(message);
  return { date, time, sender, message, sentimentLabel, sentimentScore, emojis, topics };
};

/**
 * Detect and convert any date/time mentions in message into calendar events.
 */
const extractCalendarEvents = (message) => {
  const results = chrono.parse(message);
  return results.map((r) => {
    const start = r.start.date();
    return {
      title: message,
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
      ],
    };
  });
};

const readStream = fs.createReadStream(inputFile, { encoding: "utf8" });
const rl = readline.createInterface({ input: readStream });

const csvStream = csvFormat({ headers: true });
const writable = fs.createWriteStream(outputFile);
csvStream.pipe(writable);

let currentMessage = null;
let messages = [];
let calendarEvents = [];
let messageCount = 0;

// ---------- Main Logic ----------
rl.on("line", (line) => {
  const match = line.match(messageRegex);

  if (match) {
    if (currentMessage) {
      csvStream.write(currentMessage);
      messages.push(currentMessage);
      messageCount++;
    }

    const [, date, time, sender, messageText] = match;

    calendarEvents.push(...extractCalendarEvents(messageText));

    currentMessage = buildMessage({ date, time, sender, message: messageText });
  } else if (currentMessage) {
    // Handle multi-line message continuation
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
  console.log(`Parsed ${messageCount} messages → ${outputFile}`);

  // Generate insights
  await generateSentimentTimeline(messages);
  await generateEmojiTimeline(messages);
  await generateTopicTimeline(messages);

  // Generate .ics calendar file if any events found
  if (calendarEvents.length > 0) {
    createEvents(calendarEvents, (error, value) => {
      if (error) {
        console.error("Calendar generation failed:", error);
        return;
      }
      fs.writeFileSync(calendarFile, value);
      console.log(`Calendar events saved → ${calendarFile}`);
    });
  } else {
    console.log("No date/time mentions found for calendar events.");
  }
});
