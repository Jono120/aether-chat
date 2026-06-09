/**
 * @deprecated Import useTranslation() / t() from ../i18n/index.js instead.
 * Kept temporarily for any straggling imports during migration.
 */
import i18n from '../i18n/instance.js';

export { friendlyKeySetupError } from '../i18n/errors.js';

export const MSG = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return i18n.t(prop);
    },
  },
);
