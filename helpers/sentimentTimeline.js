import fs from "fs";
import dayjs from "dayjs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const width = 800, height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export async function generateSentimentTimeline(messages) {
  const sentimentTimeline = {};
  messages.forEach(m => {
    const day = dayjs(m.date, "MM/DD/YYYY").format("YYYY-MM-DD");
    if (!sentimentTimeline[day]) sentimentTimeline[day] = [];
    sentimentTimeline[day].push(m.sentimentScore);
  });

  const labels = Object.keys(sentimentTimeline).sort();
  const data = labels.map(d =>
    sentimentTimeline[d].reduce((a, b) => a + b, 0) / sentimentTimeline[d].length
  );

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Average Sentiment",
          data,
          fill: false,
          borderColor: "rgba(75,192,192,1)",
          tension: 0.1,
        },
      ],
    },
    options: {
      plugins: { title: { display: true, text: "Sentiment Timeline" } },
      scales: { y: { beginAtZero: true } },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(config);
  fs.writeFileSync("./sentiment-timeline.png", image);
  console.log("✅ Sentiment timeline graph generated!");
}
