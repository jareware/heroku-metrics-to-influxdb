import axios from 'axios';
import { assert } from 'console';
import { ObjMap, assertExhausted } from './types';

// @see https://docs.influxdata.com/influxdb/v1.6/write_protocols/line_protocol_reference/
// @example "weather,location=us-midwest temperature=82,bug_concentration=98 1465839830100000000"
export function toInfluxLine(
  measurement: string,
  tags: ObjMap<string>,
  fields: ObjMap<string | number | boolean>,
  timestampInMs?: number,
): string {
  assert(measurement, `Measurement name required, "${measurement}" given`);
  assert(Object.keys(fields).length, 'At least 1 field required, 0 given');
  const tagString: string = Object.keys(tags)
    .map(tag => `${escape(tag, 'TAG_KEY')}=${escape(tags[tag], 'TAG_VALUE')}`)
    .join(',');
  const tagSeparator = Object.keys(tags).length ? ',' : '';
  const fieldString: string = Object.keys(fields)
    .map(field => `${escape(field, 'FIELD_KEY')}=${escape(fields[field], 'FIELD_VALUE')}`)
    .join(',');
  const timeString: string = timestampInMs ? ` ${timestampInMs * 1e6}` : ''; // convert from milliseconds to nanoseconds
  return `${escape(measurement, 'MEASUREMENT')}${tagSeparator}${tagString} ${fieldString}${timeString}`;
}

// @see https://docs.influxdata.com/influxdb/v1.6/write_protocols/line_protocol_tutorial/#special-characters-and-keywords
function escape(
  input: string | number | boolean,
  context: 'TAG_KEY' | 'TAG_VALUE' | 'FIELD_KEY' | 'MEASUREMENT' | 'FIELD_VALUE',
): string {
  switch (context) {
    case 'MEASUREMENT':
      return (input + '').replace(/,/g, '\\,').replace(/ /g, '\\ ');
    case 'TAG_KEY':
    case 'TAG_VALUE':
    case 'FIELD_KEY':
      return (input + '')
        .replace(/,/g, '\\,')
        .replace(/=/g, '\\=')
        .replace(/ /g, '\\ ');
    case 'FIELD_VALUE':
      return typeof input === 'number' || typeof input === 'boolean'
        ? input + ''
        : input
            .replace(/"/g, '\\"')
            .replace(/^/, '"')
            .replace(/$/, '"');
    default:
      return assertExhausted(context);
  }
}

export function sendInfluxLines(
  dbUrl: string, // e.g. "https://my-influxdb.example.com/"
  dbName: string, // e.g. "my_metrics_db"
  lines: string | string[], // see toInfluxLine()
  dbCredentials: string = '', // e.g. "user:pass"
  axiosImplementation = axios, // only useful in testing
) {
  const url = (dbUrl + '').replace(/\/*$/, '/write?db=' + dbName);
  const [username, password] = dbCredentials ? dbCredentials.split(':') : [null, null];
  const auth = username && password ? { username, password } : undefined;
  const data = typeof lines === 'string' ? lines : lines.join('\n');
  return axiosImplementation.post(url, data, { auth }).then(
    () => data,
    err => {
      const count = typeof lines === 'string' ? 1 : lines.length;
      const error = new Error(`Could not send ${count} lines to InfluxDB (error was "${err.message}")`);
      (error as any).influxLinesFailedToSend = data; // attach the failed payload to the error, in case the caller wants to e.g. implement a retry
      throw error;
    },
  );
}
