import fs from "fs";
import readline from "readline";
import { format as csvFormat } from "fast-csv";

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

  if (match) {
    // Write the previous message (if any)
    if (currentMessage) {
      csvStream.write(currentMessage);
      count++;
    }

    const [_, date, time, sender, message] = match;
    currentMessage = { date, time, sender, message };
  } else if (currentMessage) {
    currentMessage.message += "\n" + line.trim();
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
