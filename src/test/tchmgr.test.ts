import * as assert from 'assert';
import { parseInform, parseRecords } from '../tchmgr';

suite('parseInform', () => {
  test('Splits each line at the first colon', () => {
    const info = parseInform('path: /tmp/a.tch\nrecord number: 5\n');
    assert.deepStrictEqual(info, { path: '/tmp/a.tch', 'record number': '5' });
  });
});

suite('parseRecords', () => {
  test('Reads hex keys and values', () => {
    const records = parseRecords('66 6F 6F\t62 61 72\n');
    assert.deepStrictEqual(records, [{ key: '666F6F', value: '626172' }]);
  });

  test('Allows an empty value', () => {
    const records = parseRecords('65\t\n');
    assert.deepStrictEqual(records, [{ key: '65', value: '' }]);
  });

  test('Allows a line without a tab', () => {
    const records = parseRecords('66 6F 6F\n');
    assert.deepStrictEqual(records, [{ key: '666F6F', value: '' }]);
  });
});
