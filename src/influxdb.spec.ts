import 'mocha';
import { assert } from 'chai';
import { toInfluxLine, sendInfluxLines } from './influxdb';

describe('influxdb', () => {
  describe('toInfluxLine()', () => {
    it('works for simple cases', () => {
      assert.equal(
        toInfluxLine('weather', { location: 'us-midwest' }, { temperature: 82, bug_concentration: 98 }, 1465839830100),
        'weather,location=us-midwest temperature=82,bug_concentration=98 1465839830100000000',
      );
    });

    it('works without tags', () => {
      assert.equal(
        toInfluxLine('weather', {}, { temperature: 82, bug_concentration: 98 }, 1465839830100),
        'weather temperature=82,bug_concentration=98 1465839830100000000',
      );
    });

    it('works without a timestamp', () => {
      assert.equal(
        toInfluxLine('weather', { location: 'us-midwest' }, { temperature: 82, bug_concentration: 98 }),
        'weather,location=us-midwest temperature=82,bug_concentration=98',
      );
    });

    it('escapes things correctly', () => {
      assert.equal(
        toInfluxLine(
          'wea,th er',
          { 'loca,tion': 'us-mi,dwest' },
          { 'tem per,ature': 82, 'bug_conce,ntration': 'too,"much' },
        ),
        'wea\\,th\\ er,loca\\,tion=us-mi\\,dwest tem\\ per\\,ature=82,bug_conce\\,ntration="too,\\"much"',
      );
    });

    it('works with booleans', () => {
      assert.equal(
        toInfluxLine('weather', { location: 'us-midwest' }, { temperature: 82, bug_concentration: true }),
        'weather,location=us-midwest temperature=82,bug_concentration=true',
      );
    });
  });

  describe('sendInfluxLines()', () => {
    it('handles successes', () => {
      return Promise.resolve()
        .then(() =>
          sendInfluxLines(
            'https://my-influxdb.example.com/',
            'my_metrics_db',
            ['weather temperature=82'],
            'user:pass',
            {
              post(...args: any[]) {
                assert.deepEqual(args, [
                  'https://my-influxdb.example.com/write?db=my_metrics_db',
                  'weather temperature=82',
                  { auth: { username: 'user', password: 'pass' } },
                ]);
                return Promise.resolve({});
              },
            } as any,
          ),
        )
        .then(res => assert.equal(res, 'weather temperature=82'));
    });

    it('handles failures', () => {
      return Promise.resolve()
        .then(() =>
          sendInfluxLines('https://my-influxdb.example.com/', 'my_metrics_db', 'weather temperature=82', 'user:pass', {
            post() {
              return Promise.reject(new Error('nope'));
            },
          } as any),
        )
        .then(
          () => assert.fail('Not supposed to happen'),
          err => {
            assert.match(err.message, /could not send 1 lines/i);
            assert.match(err.message, /error was "nope"/i);
            assert.equal(err.influxLinesFailedToSend, 'weather temperature=82');
          },
        );
    });
  });
});
