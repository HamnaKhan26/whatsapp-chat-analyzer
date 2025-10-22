import fs from "fs";
import dayjs from "dayjs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const width = 800, height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export async function generateTopicTimeline(messages) {
  const topicTimeline = {};
  messages.forEach(m => {
    const day = dayjs(m.date, "MM/DD/YYYY").format("YYYY-MM-DD");
    const topics = m.topics.split(", ").filter(t => t);
    if (!topicTimeline[day]) topicTimeline[day] = {};
    topics.forEach(t => {
      topicTimeline[day][t] = (topicTimeline[day][t] || 0) + 1;
    });
  });

  const topicCount = {};
  messages.forEach(m =>
    m.topics.split(", ").forEach(t => {
      if (t) topicCount[t] = (topicCount[t] || 0) + 1;
    })
  );

  const topTopics = Object.entries(topicCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(x => x[0]);

  const labels = Object.keys(topicTimeline).sort();
  const datasets = topTopics.map((topic, idx) => ({
    label: topic,
    data: labels.map(day => topicTimeline[day][topic] || 0),
    backgroundColor: `rgba(${(idx + 1) * 50},${150 - idx * 20},${100 + idx * 30},0.7)`,
  }));

  const config = {
    type: "bar",
    data: { labels, datasets },
    options: {
      plugins: { title: { display: true, text: "Top Topics Timeline" } },
      scales: { y: { beginAtZero: true } },
      responsive: true,
      interaction: { mode: "index", intersect: false },
      stacked: true,
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(config);
  fs.writeFileSync("./topic-timeline.png", image);
  console.log("✅ Topic timeline graph generated!");
}
