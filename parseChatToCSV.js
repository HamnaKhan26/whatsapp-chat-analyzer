import fs from "fs";
import readline from "readline";
import { format as csvFormat } from "fast-csv";
import Sentiment from "sentiment";
import emojiRegex from "emoji-regex";

const inputFile = "./sample-chat.txt";
const outputFile = "./chat.csv";

const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}\s?[APap][Mm]) - ([^:]+): (.*)$/;

const readStream = fs.createReadStream(inputFile, { encoding: "utf8" });
const rl = readline.createInterface({ input: readStream });

const csvStream = csvFormat({ headers: true });
const writable = fs.createWriteStream(outputFile);
csvStream.pipe(writable);

let currentMessage = null;
let count = 0;

rl.on("line", (line) => {
  const match = line.match(messageRegex);
  const sentiment = new Sentiment();

  if (match) {
    if (currentMessage) {
      csvStream.write(currentMessage);
      count++;
    }

    const [_, date, time, sender, message] = match;

    // Sentiment analysis
    const result = sentiment.analyze(message);
    const sentimentScore = result.score;
    let sentimentLabel = "Neutral";
    if (sentimentScore > 0) sentimentLabel = "Positive";
    else if (sentimentScore < 0) sentimentLabel = "Negative";

    // Emoji extraction
    const regex = emojiRegex();
    const emojis = [...message.matchAll(regex)].map(e => e[0]).join(" ");

    currentMessage = { date, time, sender, message, sentimentLabel, sentimentScore, emojis };
  } else if (currentMessage) {
    currentMessage.message += "\n" + line.trim();

    // Update sentiment & emoji for appended text
    const result = sentiment.analyze(currentMessage.message);
    const sentimentScore = result.score;
    let sentimentLabel = "Neutral";
    if (sentimentScore > 0) sentimentLabel = "Positive";
    else if (sentimentScore < 0) sentimentLabel = "Negative";

    const regex = emojiRegex();
    const emojis = [...currentMessage.message.matchAll(regex)].map(e => e[0]).join(" ");

    currentMessage.sentimentLabel = sentimentLabel;
    currentMessage.sentimentScore = sentimentScore;
    currentMessage.emojis = emojis;
  }
});

rl.on("close", () => {
  if (currentMessage) {
    csvStream.write(currentMessage);
    count++;
  }

  csvStream.end();
  console.log(`✅ Parsed ${count} messages into ${outputFile}`);
});
