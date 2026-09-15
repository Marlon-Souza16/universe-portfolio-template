import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CoverResourceCache} from './cover-resource-cache';

test('concurrent consumers share a resource, held resources survive eviction, releases are idempotent', async () => {
  const disposed: number[] = [];
  const cache = new CoverResourceCache<number>(1, value => disposed.push(value));
  const first = cache.acquire('one', async () => 1);
  const shared = cache.acquire('one', async () => 99);
  assert.equal(await first.promise, 1);
  assert.equal(await shared.promise, 1);
  first.release(); first.release();
  const second = cache.acquire('two', async () => 2);
  await second.promise;
  assert.deepEqual(disposed, []);
  shared.release();
  assert.deepEqual(disposed, [1]);
  second.release();
});

test('abandoned queued work is skipped and failed resources can retry', async () => {
  const cache = new CoverResourceCache<number>(2, () => {}, 1);
  let finish!: (value: number) => void;
  const first = cache.acquire('first', () => new Promise<number>(resolve => {finish = resolve;}));
  let ran = false;
  const stale = cache.acquire('stale', async () => {ran = true; return 2;});
  stale.release();
  await new Promise(resolve => setTimeout(resolve, 10));
  finish(1);
  await first.promise;
  assert.equal(await stale.promise, null);
  assert.equal(ran, false);
  const failed = cache.acquire('retry', async () => {throw new Error('offline');});
  await assert.rejects(failed.promise, /offline/);
  const retry = cache.acquire('retry', async () => 3);
  failed.release();
  assert.equal(await retry.promise, 3);
  retry.release(); first.release();
});
