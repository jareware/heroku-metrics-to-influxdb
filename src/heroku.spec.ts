import 'mocha';
import { assert } from 'chai';
import { parseRuntimeMetricsLogLine, flattenLatestSamples } from './heroku';

describe('heroku', () => {
  describe('parseRuntimeMetricsLogLine()', () => {
    it('works', () => {
      assert.deepEqual(
        parseRuntimeMetricsLogLine(
          '2018-07-20T14:39:33.237725+00:00 heroku[worker.1]: source=worker.1 dyno=heroku.56333511.0c1abc57-d574-4f93-ba53-765133c0ef3a sample#load_avg_1m=1.23 sample#memory_rss=126.20MB',
        ),
        {
          timestamp: '2018-07-20T14:39:33.237725+00:00',
          dynoType: 'worker',
          dynoName: 'worker.1',
          dynoUuid: 'heroku.56333511.0c1abc57-d574-4f93-ba53-765133c0ef3a',
          samples: [
            {
              sampleName: 'load_avg_1m',
              sampleValue: 1.23,
              sampleUnit: '',
            },
            {
              sampleName: 'memory_rss',
              sampleValue: 126.2,
              sampleUnit: 'MB',
            },
          ],
        },
      );
    });
  });

  describe('flattenLatestSamples()', () => {
    const getLine = () => ({
      timestamp: '2018-07-20T14:39:33.237725+00:00',
      dynoType: 'worker',
      dynoName: 'worker.1',
      dynoUuid: 'heroku.56333511.0c1abc57-d574-4f93-ba53-765133c0ef3a',
      samples: [
        {
          sampleName: 'load_avg_1m',
          sampleValue: 1.23,
          sampleUnit: '',
        },
        {
          sampleName: 'memory_rss',
          sampleValue: 126.2,
          sampleUnit: 'MB',
        },
      ],
    });

    it('gets the latest metrics per each dyno', () => {
      assert.deepEqual(
        flattenLatestSamples([
          { ...getLine() },
          {
            ...getLine(),
            timestamp: '2018-07-20T14:39:32+00:00', // this is an OLDER line for the same dyno
          },
          { ...getLine(), dynoUuid: 'heroku.56333511.00000000-XYZZ-4f93-ba53-765133c0ef3a', dynoName: 'worker.2' },
          {
            ...getLine(),
            dynoUuid: 'heroku.56333511.00000000-XYZZ-4f93-ba53-765133c0ef3a',
            dynoName: 'worker.2',
            timestamp: '2018-07-20T14:39:32+00:00', // this is an OLDER line for the same dyno
          },
        ]).map(x => [x.timestamp, x.dynoName, x.sampleName, x.sampleValue]), // only pick some interesting values, not all
        [
          ['2018-07-20T14:39:33.237725+00:00', 'worker.1', 'load_avg_1m', 1.23],
          ['2018-07-20T14:39:33.237725+00:00', 'worker.1', 'memory_rss', 126.2],
          ['2018-07-20T14:39:33.237725+00:00', 'worker.2', 'load_avg_1m', 1.23],
          ['2018-07-20T14:39:33.237725+00:00', 'worker.2', 'memory_rss', 126.2],
        ],
      );
    });
  });
});
