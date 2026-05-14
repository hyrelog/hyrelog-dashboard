import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveExportTemplateFromJobInputSchema } from '@/schemas/exports';

test('saveExportTemplateFromJobInputSchema validates', () => {
  const r = saveExportTemplateFromJobInputSchema.safeParse({
    sourceJobId: '11111111-1111-4111-8111-111111111111',
    name: 'Weekly auth slice',
  });
  assert.ok(r.success);
});

test('saveExportTemplateFromJobInputSchema rejects long name', () => {
  const r = saveExportTemplateFromJobInputSchema.safeParse({
    sourceJobId: '11111111-1111-4111-8111-111111111111',
    name: 'x'.repeat(200),
  });
  assert.ok(!r.success);
});
