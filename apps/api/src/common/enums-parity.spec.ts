import * as shared from '@faixa-certa/shared';
import { describe, expect, it } from 'vitest';
import * as prisma from '../generated/prisma/enums.js';

/** O app e o painel usam os enums do `shared`; eles não podem divergir do banco. */
describe('enums do shared = enums do Prisma', () => {
  const pairs = [
    ['Role', shared.Role, prisma.Role],
    ['AuthProviderType', shared.AuthProviderType, prisma.AuthProviderType],
    ['PublicationStatus', shared.PublicationStatus, prisma.PublicationStatus],
    ['EntitlementType', shared.EntitlementType, prisma.EntitlementType],
    ['EntitlementSource', shared.EntitlementSource, prisma.EntitlementSource],
    ['PlanCode', shared.PlanCode, prisma.PlanCode],
    ['ProgressStatus', shared.ProgressStatus, prisma.ProgressStatus],
    ['TimelineEventType', shared.TimelineEventType, prisma.TimelineEventType],
  ] as const;

  it.each(pairs)('%s', (_name, a, b) => {
    expect(Object.values(a).toSorted()).toEqual(Object.values(b).toSorted());
  });
});
