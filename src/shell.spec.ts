import 'mocha';
import { assert } from 'chai';
import { execShell } from './shell';

describe('shell', () => {
  describe('execShell()', () => {
    it('resolves with output on success', () => {
      return execShell('echo hello').then(out => assert.equal(out, 'hello\n'));
    });

    it('rejects with error on failure', () => {
      return execShell('echo fail && false').then(
        () => assert.fail('Not supposed to happen'),
        err => assert.match(err.message, /could not exec.*echo fail/i),
      );
    });

    it('rejects with error on content on stderr', () => {
      return execShell('>&2 echo fail').then(
        () => assert.fail('Not supposed to happen'),
        err => assert.match(err.message, /echo fail.*stderr.*fail/i),
      );
    });
  });
});
