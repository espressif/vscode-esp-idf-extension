function getActivationsStats(points) {
  let activations = points.length / 2;
  if (!!(points.length & 1)) {
    activations = (points.length - 1) / 2;
  }
  return activations;
}

function getTotalRunTime(points) {
  let totalRunTime = 0;
  for (let i = 0; i < points.length; i += 2) {
    if (!points[i + 1]) {
      break;
    }
    totalRunTime += points[i + 1] - points[i];
  }
  return totalRunTime;
}

function getLastRunTime(points): number {
  return points[points.length - 1];
}

function getTotalTracingTimePerCore(plotData): { [core_id: number]: number } {
  let core0TotalTracingTime, core1TotalTracingTime;

  plotData.forEach((data) => {
    if (data && data.name && data.name !== "context-switch") {
      const maxData = data.x[data.x.length - 1];
      if (!!maxData) {
        if (data.yaxis === "y2") {
          core1TotalTracingTime = maxData;
        } else {
          core0TotalTracingTime = maxData;
        }
      }
    }
  });

  return { 0: core0TotalTracingTime, 1: core1TotalTracingTime };
}

export function fillStatsTable(plotData): string[][] {
  const rows = [];
  const totalTracingTime = getTotalTracingTimePerCore(plotData);
  plotData.forEach((data) => {
    if (data && data.name && data.name !== "context-switch") {
      let x_points = data.x.filter((x) => x);
      const duplicates = x_points.filter(
        (x, index) => x_points.indexOf(x) !== index
      );
      x_points = new Set(x_points);
      duplicates.forEach((element) => {
        x_points.delete(element);
      });
      x_points = Array.from(x_points);

      const activations = getActivationsStats(x_points);
      const totalRunTime = getTotalRunTime(x_points);
      const lastRunTime = getLastRunTime(x_points);
      const timeInterrupted =
        data.yaxis === "y2"
          ? totalTracingTime[1] - totalRunTime
          : totalTracingTime[0] - totalRunTime;
      let cpuLoad: any =
        data.yaxis === "y2"
          ? totalRunTime / totalTracingTime[1]
          : totalRunTime / totalTracingTime[0];
      cpuLoad = `${cpuLoad * 100}`;
      cpuLoad = parseFloat(cpuLoad).toFixed(2);
      cpuLoad = `${cpuLoad} %`;

      rows.push([
        data.yaxis === "y2" ? "1" : "0",
        data.name,
        `${activations}`,
        parseFloat(`${totalRunTime}`).toFixed(4),
        parseFloat(`${timeInterrupted}`).toFixed(4),
        `${cpuLoad}`,
        parseFloat(`${lastRunTime}`).toFixed(4),
      ]);
    }
  });
  return rows;
}
