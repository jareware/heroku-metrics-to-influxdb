import { collectMetrics } from './src/main';
import { LambdaHandlers } from './src/lambda';

declare var lambda: LambdaHandlers;

const {
  HEROKU_API_TOKEN,
  HEROKU_APP_NAMES,
  HEROKU_DYNO_TYPES,
  INFLUXDB_URL,
  INFLUXDB_DB,
  INFLUXDB_CREDENTIALS,
} = process.env;

if (typeof lambda !== 'undefined') {
  // Running as Lambda function
  lambda.handler = (_, __, callback) => {
    main()
      .then(() => null)
      .then(callback);
  };
} else {
  // Running as CLI process
  main();
}

function main() {
  const then = Date.now();
  return collectMetrics(
    HEROKU_API_TOKEN || '',
    (HEROKU_APP_NAMES || '').split(' '),
    (HEROKU_DYNO_TYPES || '').split(' '),
    INFLUXDB_URL || '',
    INFLUXDB_DB || '',
    INFLUXDB_CREDENTIALS || '',
  ).then(
    out => console.log(`Collected ${out.split('\n').length} lines in ${((Date.now() - then) / 1000).toFixed(1)} sec`),
    err => console.log('ERROR:', err),
  );
}
