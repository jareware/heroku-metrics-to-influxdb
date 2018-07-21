import 'mocha';
import { assert } from 'chai';
import { toInfluxLine } from './influxdb';

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
});
