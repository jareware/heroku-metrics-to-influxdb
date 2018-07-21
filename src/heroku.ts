type MetricsSample = {
  sampleName: string;
  sampleValue: number;
  sampleUnit: string;
};

type MetricsLine = {
  timestamp: string;
  dynoType: string;
  dynoName: string;
  dynoUuid: string;
  samples: MetricsSample[];
};

const RUNTIME_METRICS_LOG_LINE = /^(.+?) heroku\[(.+?)\]: source=(.+?)\.\d+ dyno=(.+?) (sample#.+)$/;

// @see https://devcenter.heroku.com/articles/log-runtime-metrics#log-format
// @example "2018-07-20T14:39:33.237725+00:00 heroku[worker.1]: source=worker.1 dyno=heroku.56333511.0c1abc57-d574-4f93-ba53-765133c0ef3a sample#load_avg_1m=0.00 sample#load_avg_5m=0.00 sample#load_avg_15m=0.00"
export function parseRuntimeMetricsLogLine(line: string): MetricsLine | null {
  const match = line.match(RUNTIME_METRICS_LOG_LINE);
  if (!match) return null; // doesn't match the pattern we're looking for
  const [, timestamp, dynoName, dynoType, dynoUuid, rawSamples] = match;
  const samples = rawSamples
    .split(' ')
    .map(part => part.match(/^sample#(\w+)=([\d.]+)(.*)$/) || [])
    .map(part => {
      const [, sampleName, rawValue, sampleUnit] = part;
      const sampleValue = parseFloat(rawValue);
      return { sampleName, sampleValue, sampleUnit };
    });
  return { timestamp, dynoName, dynoUuid, dynoType, samples };
}
