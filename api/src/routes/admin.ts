import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  getErrorReportById,
  listErrorReports,
  updateErrorReportStatus,
  type ErrorReportSource,
  type ErrorReportStatus,
} from '../services/support.js';
import { logger } from '../utils/logger.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

const VALID_STATUS = new Set<ErrorReportStatus>(['new', 'triaged', 'resolved']);
const VALID_SOURCE = new Set<ErrorReportSource>(['user', 'auto']);

adminRouter.get('/error-reports', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;

    if (status && !VALID_STATUS.has(status as ErrorReportStatus)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }
    if (source && !VALID_SOURCE.has(source as ErrorReportSource)) {
      return res.status(400).json({ error: 'Invalid source filter' });
    }

    const result = await listErrorReports({
      status: status as ErrorReportStatus | undefined,
      source: source as ErrorReportSource | undefined,
      since,
      limit: Number.isFinite(limitRaw) ? limitRaw : 50,
      cursor,
    });
    res.json(result);
  } catch (err) {
    logger.error('Admin list error reports failed', {
      requestId: req.requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Could not list error reports' });
  }
});

adminRouter.get('/error-reports/:id', async (req, res) => {
  try {
    const report = await getErrorReportById(req.params.id!);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ report });
  } catch (err) {
    logger.error('Admin get error report failed', {
      requestId: req.requestId,
      reportId: req.params.id,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Could not load error report' });
  }
});

adminRouter.patch('/error-reports/:id', async (req, res) => {
  try {
    const status = req.body?.status;
    if (typeof status !== 'string' || !VALID_STATUS.has(status as ErrorReportStatus)) {
      return res.status(400).json({ error: 'status must be new, triaged, or resolved' });
    }
    const report = await updateErrorReportStatus(req.params.id!, status as ErrorReportStatus);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ report });
  } catch (err) {
    logger.error('Admin patch error report failed', {
      requestId: req.requestId,
      reportId: req.params.id,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Could not update error report' });
  }
});
