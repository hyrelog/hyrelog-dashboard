-- Saved explorer view dashboard audit evidence (mirrors HyreLog API audit strings).
ALTER TYPE "AuditAction" ADD VALUE 'SAVED_VIEW_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SAVED_VIEW_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SAVED_VIEW_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'SAVED_VIEW_RUN';
