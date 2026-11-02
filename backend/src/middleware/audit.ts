import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export interface AuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}

export const recordAuditLog = async (params: AuditParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details || undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err: any) {
    logger.error('Failed to write audit log:', err.message);
  }
};
