import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isNativeHistogramExplicitlyDisabled } from '../lib/dashboard/fetch-event-volume-histograms';

describe('isNativeHistogramExplicitlyDisabled', () => {
  const prev = process.env.HYRELOG_NATIVE_EVENT_HISTOGRAM;

  afterEach(() => {
    if (prev === undefined) delete process.env.HYRELOG_NATIVE_EVENT_HISTOGRAM;
    else process.env.HYRELOG_NATIVE_EVENT_HISTOGRAM = prev;
  });

  it('is true only when env is exactly the string false', () => {
    delete process.env.HYRELOG_NATIVE_EVENT_HISTOGRAM;
    assert.equal(isNativeHistogramExplicitlyDisabled(), false);
    process.env.HYRELOG_NATIVE_EVENT_HISTOGRAM = 'false';
    assert.equal(isNativeHistogramExplicitlyDisabled(), true);
    process.env.HYRELOG_NATIVE_EVENT_HISTOGRAM = '0';
    assert.equal(isNativeHistogramExplicitlyDisabled(), false);
  });
});
