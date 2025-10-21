import fs from "fs";
import dayjs from "dayjs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import emojiRegex from "emoji-regex";

const width = 800, height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
const regexEmoji = emojiRegex();

export async function generateEmojiTimeline(messages) {
  const emojiTimeline = {};
  messages.forEach(m => {
    const day = dayjs(m.date, "MM/DD/YYYY").format("YYYY-MM-DD");
    if (!emojiTimeline[day]) emojiTimeline[day] = 0;
    emojiTimeline[day] += [...m.emojis.matchAll(regexEmoji)].length;
  });

  const labels = Object.keys(emojiTimeline).sort();
  const data = labels.map(d => emojiTimeline[d]);

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Emoji Usage", data, backgroundColor: "rgba(255,159,64,0.7)" },
      ],
    },
    options: {
      plugins: { title: { display: true, text: "Emoji Timeline" } },
      scales: { y: { beginAtZero: true } },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(config);
  fs.writeFileSync("./emoji-timeline.png", image);
  console.log("✅ Emoji timeline graph generated!");
}
