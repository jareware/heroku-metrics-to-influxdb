import { isNotNull } from './types';
import { flatMap, groupBy, map, last, sortBy, isNumber, keys } from 'lodash';
import { toInfluxLine } from './influxdb';
import { withRetries } from './promise';
import axios from 'axios';

type MetricsLine = {
  timestamp: string;
  appName: string;
  dynoType: string;
  dynoName: string;
  dynoUuid: string;
  samples: MetricsSample[];
};

type MetricsSample = {
  sampleName: string;
  sampleValue: number;
  sampleUnit: string;
};

type Flattened = MetricsLine & MetricsSample;

const MEASUREMENT_NAME = 'heroku_runtime_metrics';
const RUNTIME_METRICS_LOG_LINE = /^(.+?) heroku\[(.+?)\]: source=(.+?)\.\d+ dyno=(.+?) (sample#.+)$/;

// @see https://devcenter.heroku.com/articles/log-runtime-metrics#log-format
// @example "2018-07-20T14:39:33.237725+00:00 heroku[worker.1]: source=worker.1 dyno=heroku.56333511.0c1abc57-d574-4f93-ba53-765133c0ef3a sample#load_avg_1m=0.00 sample#load_avg_5m=0.00 sample#load_avg_15m=0.00"
export function parseRuntimeMetricsLogLine(appName: string, line: string): MetricsLine | null {
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
  return { timestamp, appName, dynoName, dynoUuid, dynoType, samples };
}

// TODO: This session could be cached for up to 45 min it seems!
export function getRuntimeMetricsForApp(
  apiToken: string,
  appName: string,
  dynoType: string, // e.g. "web" or "worker"
  lines = 64, // consider raising this if there's a LOT of dynos, or logs are noisy
): Promise<MetricsLine[]> {
  return Promise.resolve()
    .then(
      withRetries('logplex create', 3, 1000, () =>
        axios({
          method: 'POST',
          url: `https://api.heroku.com/apps/${appName}/log-sessions`,
          headers: {
            Authorization: `Bearer ${apiToken}`,
            Accept: 'application/vnd.heroku+json; version=3',
          },
          data: {
            dyno: dynoType,
            lines,
            source: 'heroku',
            tail: false,
          },
        })
          .then(res => res.data.logplex_url as string)
          .then(withRetries('logplex fetch', 3, 1000, url => axios.get(url)))
          .then(res =>
            (res.data as string)
              .split('\n')
              .map(line => parseRuntimeMetricsLogLine(appName, line))
              .filter(isNotNull),
          ),
      ),
    )
    .catch(err => {
      console.log(
        `Error: Could not get runtime metrics for app "${appName}" and dyno type "${dynoType}", caused by ${err}`,
      );
      return [];
    });
}

export function flattenAndSelectSamples(lines: MetricsLine[], calculateMemoryUsed = true): Flattened[] {
  const flattened = flatMap(lines, line => line.samples.map(sample => ({ ...sample, ...line })));
  const grouped = groupBy(flattened, line => `${line.dynoUuid}-${line.sampleName}`); // group by sample name per each distinct dyno
  const latests = map(grouped, lines => last(sortBy(lines, 'timestamp'))).filter(isNotNull);
  const isNumeric = (x: any): x is number => isNumber(x) && isFinite(x);
  if (calculateMemoryUsed) {
    // See https://github.com/influxdata/influxdb/issues/3552 for why this is annoying to calculate after-the-fact
    const memoryUsedSamples: typeof latests = keys(groupBy(latests, 'dynoUuid'))
      .map(dynoUuid => {
        const latestRss = latests.find(x => x.dynoUuid === dynoUuid && x.sampleName === 'memory_rss');
        const latestQuota = latests.find(x => x.dynoUuid === dynoUuid && x.sampleName === 'memory_quota');
        if (!latestRss || !latestQuota) return null; // no samples found from which to calculate used percentage
        const memoryUsed = (latestRss.sampleValue * 100) / latestQuota.sampleValue;
        if (!isNumeric(memoryUsed)) return null; // most likely got a NaN -> don't have good values
        const sampleValue = Math.round(memoryUsed);
        return { ...latestRss, samples: [], sampleName: 'memory_used', sampleValue, sampleUnit: '%' };
      })
      .filter(isNotNull);
    return latests.concat(memoryUsedSamples);
  } else {
    return latests;
  }
}

export function metricsLinesToInfluxLines(lines: Flattened[]): string[] {
  return lines.map(line => {
    const { timestamp, appName, dynoType, dynoName, dynoUuid, sampleName, sampleValue, sampleUnit } = line;
    return toInfluxLine(
      MEASUREMENT_NAME,
      { appName, dynoType, sampleName, dynoName, dynoUuid },
      { sampleValue, sampleUnit },
      new Date(timestamp).getTime(),
    );
  });
}
