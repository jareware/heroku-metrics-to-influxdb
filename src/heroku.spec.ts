import 'mocha';
import { assert } from 'chai';
import { parseRuntimeMetricsLogLine } from './heroku';

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
});
