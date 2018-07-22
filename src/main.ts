import { flatMap } from 'lodash';
import { sendInfluxLines } from './influxdb';
import { flattenAndSelectSamples, metricsLinesToInfluxLines, getRuntimeMetricsForApp } from './heroku';

export function collectMetrics(
  apiKey: string, // e.g. "mysecretapikey"
  appNames: string[], // e.g. [ "my-heroku-app" ]
  dynoTypes: string[], // e.g. [ "web", "worker" ]
  dbUrl: string, // e.g. "https://my-influxdb.example.com/"
  dbName: string, // e.g. "my_metrics_db"
  dbCredentials: string = '', // e.g. "user:pass"
) {
  const permutations = flatMap(appNames, appName => dynoTypes.map(dynoType => [appName, dynoType]));
  return Promise.all(permutations.map(([appName, dynoType]) => getRuntimeMetricsForApp(apiKey, appName, dynoType)))
    .then(metrics => metrics.reduce((memo, next) => memo.concat(next), []))
    .then(flattenAndSelectSamples)
    .then(metricsLinesToInfluxLines)
    .then(lines => sendInfluxLines(dbUrl, dbName, lines, dbCredentials));
}
