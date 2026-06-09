import { Router } from 'express';
import { getMobileLinksConfig } from '../services/appConfig.js';
import { detectLocaleFromRequest } from '../services/localeDetection.js';

export const configRouter = Router();

configRouter.get('/mobile-links', (_req, res) => {
  res.json(getMobileLinksConfig());
});

configRouter.get('/locale', (req, res) => {
  res.json(detectLocaleFromRequest(req));
});
