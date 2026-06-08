import React, { useState, useEffect } from 'react';
import {
  Eye,
  Trash2,
  ShieldAlert,
  Lock,
  RotateCcw,
  HelpCircle,
  MessageCircle,
  Smartphone,
  Accessibility,
  Bug,
  FileText,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  cancelAccountDeletion,
  isApiEnabled,
  patchMessagingPreferences,
  scheduleAccountDeletion,
  submitErrorReport,
} from '../api/client';
import { loadSession } from '../utils/authStorage';
import {
  getAppSecurity,
  isSensitiveUnlocked,
  revokeSensitiveUnlock,
} from '../utils/appSecurityStorage';
import AppSecuritySettings from './AppSecuritySettings';
import SensitiveUnlock from './SensitiveUnlock';
import ChangePasswordForm from './ChangePasswordForm';
import { flushQueuedErrorReports, queueErrorReportLocally } from '../utils/errorReportStorage';
import {
  isAutoErrorReportEnabled,
  setAutoErrorReportEnabled,
} from '../utils/clientErrorReporting';
import LegalLinks from './LegalLinks';
import DiscoveryTutorial from './DiscoveryTutorial';
import DiscoveryFilterControls from './DiscoveryFilterControls';
import EncryptionTipsModal from './EncryptionTipsModal';
import { isWebBrowser } from '../utils/platform';
import ChatBackupPanel from './ChatBackupPanel';
import { MSG } from '../utils/userMessages';
import { SELF_DESTRUCT_OPTIONS } from '../utils/messagingStorage';

const MSG_TIMER_LABELS = {
  0: MSG.settingsMsgTimerOff,
  10: MSG.settingsMsgTimer10s,
  60: MSG.settingsMsgTimer1m,
  3600: MSG.settingsMsgTimer1h,
};

const MESSAGING_PLANNED = [MSG.settingsMsgPlannedLinks];

const ACCOUNT_PLANNED = [
  MSG.settingsAccountPlannedExport,
  MSG.settingsAccountPlannedSessions,
  MSG.settingsAccountPlannedLinked,
  MSG.settingsAccountPlannedEmail,
];

const SETTINGS_SECTIONS = [
  { id: 'discovery', label: MSG.settingsNavDiscovery, icon: Eye },
  { id: 'messaging', label: MSG.settingsNavMessaging, icon: MessageCircle },
  { id: 'security', label: MSG.settingsNavSecurity, icon: Smartphone },
  { id: 'accessibility', label: MSG.settingsNavAccessibility, icon: Accessibility },
  { id: 'account', label: MSG.settingsNavAccount, icon: Trash2 },
  { id: 'legal', label: MSG.settingsNavLegal, icon: FileText },
  { id: 'diagnostics', label: MSG.settingsNavDiagnostics, icon: HelpCircle },
];

const TEXT_SIZE_STRATEGIES = [
  {
    id: 'default',
    label: MSG.settingsTextSizeDefault,
    desc: MSG.settingsTextSizeDefaultDesc,
  },
  {
    id: 'large',
    label: MSG.settingsTextSizeLarge,
    desc: MSG.settingsTextSizeLargeDesc,
  },
  {
    id: 'extra',
    label: MSG.settingsTextSizeExtra,
    desc: MSG.settingsTextSizeExtraDesc,
  },
];

const DISTANCE_STRATEGIES = [
  {
    id: 'grid_snap',
    label: MSG.settingsDistanceGrid,
    desc: MSG.settingsDistanceGridDesc,
  },
  {
    id: 'jitter',
    label: MSG.settingsDistanceJitter,
    desc: MSG.settingsDistanceJitterDesc,
  },
  {
    id: 'distance_only',
    label: MSG.settingsDistanceBands,
    desc: MSG.settingsDistanceBandsDesc,
  },
];

/**
 * Settings / privacy centre with one section visible at a time.
 */
export default function PrivacyCenter({
  stealthMode,
  setStealthMode,
  onPanicTrigger,
  currentUser,
  generateNewKeys,
  albumScreenshotShield,
  setAlbumScreenshotShield,
  accessibility,
  onAccessibilityChange,
  messagingPrefs,
  onMessagingPrefsChange,
  discoveryPrefs,
  onDiscoveryPrefsChange,
  onNavigateTab,
  onChatBackupRestore,
}) {
  const { toast, confirm } = useToast();
  const [activeSection, setActiveSection] = useState('discovery');
  const [fuzzingStrategy, setFuzzingStrategy] = useState('grid_snap');
  const [sensitiveUnlocked, setSensitiveUnlocked] = useState(() => isSensitiveUnlocked());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionTimer, setDeletionTimer] = useState(null);
  const [errorReportText, setErrorReportText] = useState('');
  const [errorReportIncludeContext, setErrorReportIncludeContext] = useState(true);
  const [errorReportSubmitting, setErrorReportSubmitting] = useState(false);
  const [autoErrorReport, setAutoErrorReport] = useState(() => isAutoErrorReportEnabled());
  const [encryptionTipsOpen, setEncryptionTipsOpen] = useState(false);

  useEffect(() => {
    const deletionTimestamp = localStorage.getItem('aether_deletion_scheduled');
    if (deletionTimestamp) {
      setIsDeleting(true);
      calculateTimeRemaining(deletionTimestamp);
    }
    if (isApiEnabled()) {
      flushQueuedErrorReports().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (activeSection !== 'diagnostics') {
      revokeSensitiveUnlock();
      setSensitiveUnlocked(false);
    } else {
      setSensitiveUnlocked(isSensitiveUnlocked());
    }
  }, [activeSection]);

  useEffect(() => () => revokeSensitiveUnlock(), []);

  useEffect(() => {
    let interval = null;
    if (isDeleting) {
      interval = setInterval(() => {
        const scheduledTime = localStorage.getItem('aether_deletion_scheduled');
        if (scheduledTime) {
          calculateTimeRemaining(scheduledTime);
        } else {
          setIsDeleting(false);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDeleting]);

  const calculateTimeRemaining = (targetTimeStr) => {
    const target = new Date(targetTimeStr);
    const diff = target - new Date();

    if (diff <= 0) {
      setDeletionTimer('EXPIRED - ACCOUNT PURGED');
      onPanicTrigger();
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDeletionTimer(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }
  };

  const requestAccountDeletion = async () => {
    const approved = await confirm(MSG.settingsDeleteConfirm, {
      confirmLabel: MSG.settingsDeleteConfirmBtn,
      cancelLabel: MSG.settingsDeleteCancelBtn,
    });
    if (!approved) return;

    setStealthMode(true);

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    if (isApiEnabled()) {
      try {
        const result = await scheduleAccountDeletion();
        if (result?.scheduledPurgeAt) {
          localStorage.setItem('aether_deletion_scheduled', result.scheduledPurgeAt);
          setIsDeleting(true);
          calculateTimeRemaining(result.scheduledPurgeAt);
        }
      } catch (err) {
        console.warn('Server deletion schedule failed', err);
        localStorage.setItem('aether_deletion_scheduled', scheduledDate.toISOString());
        setIsDeleting(true);
        calculateTimeRemaining(scheduledDate.toISOString());
      }
    } else {
      localStorage.setItem('aether_deletion_scheduled', scheduledDate.toISOString());
      setIsDeleting(true);
      calculateTimeRemaining(scheduledDate.toISOString());
    }

    toast(MSG.accountDeletionScheduled, { type: 'info' });
  };

  const cancelAccountDeletionLocal = async () => {
    if (isApiEnabled()) {
      try {
        await cancelAccountDeletion();
      } catch (err) {
        console.warn('Server deletion cancel failed', err);
      }
    }
    localStorage.removeItem('aether_deletion_scheduled');
    setIsDeleting(false);
    setDeletionTimer(null);
    setStealthMode(false);
    toast(MSG.accountDeletionCancelled, { type: 'success' });
  };

  const handleDeviceWipe = async () => {
    const approved = await confirm(MSG.settingsWipeConfirm, {
      confirmLabel: MSG.settingsWipeConfirmBtn,
      cancelLabel: MSG.cancel,
    });
    if (approved) onPanicTrigger();
  };

  const renderPlannedRoadmap = (title, items) => (
    <div className="settings-roadmap">
      <span className="section-label">{title}</span>
      <p className="settings-roadmap-note">{MSG.settingsPlannedNote}</p>
      <ul className="settings-roadmap-list">
        {items.map((text) => (
          <li key={text} className="settings-roadmap-item">
            <span>{text}</span>
            <span className="metadata-badge settings-planned-badge">{MSG.settingsPlannedBadge}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderSectionHeader = (Icon, title, desc, iconClass = 'text-violet') => (
    <>
      <div className="privacy-card-header">
        <Icon className={`icon-md ${iconClass}`} />
        <h3 className="privacy-card-title">{title}</h3>
      </div>
      {desc && <p className="settings-section-desc">{desc}</p>}
    </>
  );

  const renderDiscovery = () => (
    <div className="settings-panel-inner">
      {renderSectionHeader(Eye, MSG.settingsDiscoveryTitle, MSG.settingsDiscoveryDesc, 'text-violet')}
      <DiscoveryTutorial onNavigateTab={onNavigateTab} disabled={isDeleting} />
      <div className="settings-stack">
        <div className="settings-row">
          <div>
            <h4 className="settings-row-label">{MSG.settingsShowOnGrid}</h4>
            <p className="settings-row-desc">{MSG.settingsShowOnGridDesc}</p>
          </div>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={!stealthMode}
              onChange={() => setStealthMode(!stealthMode)}
              disabled={isDeleting}
            />
            <span className="form-toggle-slider" />
          </label>
        </div>

        <div className="u-flex-col u-gap-sm">
          <span className="section-label">{MSG.settingsDistanceLabel}</span>
          <div className="strategy-list">
            {DISTANCE_STRATEGIES.map((strategy) => (
              <div
                key={strategy.id}
                onClick={() => !isDeleting && setFuzzingStrategy(strategy.id)}
                className={`strategy-option ${fuzzingStrategy === strategy.id ? 'strategy-option-active' : ''}`}
              >
                <input
                  type="radio"
                  checked={fuzzingStrategy === strategy.id}
                  onChange={() => {}}
                  className="strategy-radio"
                  disabled={isDeleting}
                />
                <div>
                  <h5 className="strategy-option-title">{strategy.label}</h5>
                  <p className="strategy-option-desc">{strategy.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {discoveryPrefs && onDiscoveryPrefsChange && (
          <DiscoveryFilterControls
            discoveryFilters={discoveryPrefs.discoveryFilters}
            profileViewPrefs={discoveryPrefs.profileViewPrefs}
            onFiltersChange={(discoveryFilters) =>
              onDiscoveryPrefsChange({ ...discoveryPrefs, discoveryFilters })
            }
            onViewPrefsChange={(profileViewPrefs) =>
              onDiscoveryPrefsChange({ ...discoveryPrefs, profileViewPrefs })
            }
            disabled={isDeleting}
          />
        )}
      </div>
    </div>
  );

  const patchMessaging = async (updates) => {
    const next = { ...messagingPrefs, ...updates };
    onMessagingPrefsChange(next);
    if (isApiEnabled() && typeof updates.readReceiptsEnabled === 'boolean') {
      try {
        await patchMessagingPreferences(updates.readReceiptsEnabled);
      } catch (err) {
        console.warn('Messaging preferences sync failed', err);
      }
    }
  };

  const renderMessaging = () => (
    <div className="settings-panel-inner">
      {renderSectionHeader(Lock, MSG.settingsMessagingTitle, MSG.settingsMessagingDesc, 'text-cyan')}
      <div className="settings-stack">
        <div className="settings-info-box settings-info-box--row">
          <div>
            <h4 className="settings-info-box-title">{MSG.settingsMsgEncryptionTitle}</h4>
            <p className="settings-info-box-text">{MSG.settingsMsgEncryptionBody}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setEncryptionTipsOpen(true)}
            disabled={isDeleting}
          >
            <Lock className="icon-sm" />
            {MSG.settingsMsgEncryptionModalBtn}
          </button>
        </div>

        <div className="u-flex-col u-gap-sm">
          <span className="section-label">{MSG.settingsMsgDefaultTimer}</span>
          <p className="settings-row-desc settings-row-desc--flush">
            {MSG.settingsMsgDefaultTimerDesc}
          </p>
          <div className="destruct-timing-bar destruct-timing-bar--settings">
            {SELF_DESTRUCT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => patchMessaging({ defaultSelfDestructSeconds: opt.value })}
                className={`destruct-timing-btn ${
                  messagingPrefs.defaultSelfDestructSeconds === opt.value
                    ? 'destruct-timing-btn-active'
                    : ''
                }`}
                disabled={isDeleting}
              >
                {MSG_TIMER_LABELS[opt.value]}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row settings-row--compact">
          <div>
            <h4 className="settings-row-label">{MSG.settingsReadReceipts}</h4>
            <p className="settings-row-desc">{MSG.settingsReadReceiptsDesc}</p>
          </div>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={messagingPrefs.readReceiptsEnabled}
              onChange={() =>
                patchMessaging({ readReceiptsEnabled: !messagingPrefs.readReceiptsEnabled })
              }
              disabled={isDeleting}
            />
            <span className="form-toggle-slider" />
          </label>
        </div>

        <ChatBackupPanel disabled={isDeleting} onRestore={onChatBackupRestore} />

        {renderPlannedRoadmap(MSG.settingsPlannedTitle, MESSAGING_PLANNED)}
      </div>
      <EncryptionTipsModal open={encryptionTipsOpen} onClose={() => setEncryptionTipsOpen(false)} />
    </div>
  );

  const session = loadSession();
  const hasLocalPassword = Boolean(session?.user?.id?.startsWith('local:'));

  const renderSecurity = () => (
    <div className="settings-panel-inner">
      {renderSectionHeader(Smartphone, MSG.settingsSecurityTitle, MSG.settingsSecurityDesc, 'text-emerald')}
      <div className="settings-stack settings-stack--tight">
        <AppSecuritySettings disabled={isDeleting} hasLocalPassword={hasLocalPassword} />

        <div className="settings-row settings-row--flush">
          <div>
            <h4 className="settings-row-label">{MSG.settingsAlbumShield}</h4>
            <p className="settings-row-desc">
              {isWebBrowser() ? MSG.settingsAlbumShieldWebNote : MSG.settingsAlbumShieldDesc}
            </p>
          </div>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={albumScreenshotShield}
              onChange={() => setAlbumScreenshotShield(!albumScreenshotShield)}
              disabled={isDeleting || isWebBrowser()}
            />
            <span className="form-toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  );

  const patchAccessibility = (updates) => {
    onAccessibilityChange({ ...accessibility, ...updates });
  };

  const renderAccessibilityToggle = (key, label, desc) => (
    <div className="settings-row settings-row--compact">
      <div>
        <h4 className="settings-row-label">{label}</h4>
        <p className="settings-row-desc">{desc}</p>
      </div>
      <label className="form-toggle">
        <input
          type="checkbox"
          checked={Boolean(accessibility[key])}
          onChange={() => patchAccessibility({ [key]: !accessibility[key] })}
          disabled={isDeleting}
        />
        <span className="form-toggle-slider" />
      </label>
    </div>
  );

  const renderAccessibility = () => (
    <div className="settings-panel-inner">
      {renderSectionHeader(
        Accessibility,
        MSG.settingsAccessibilityTitle,
        MSG.settingsAccessibilityDesc,
        'text-amber',
      )}
      <div className="settings-stack settings-stack--tight">
        {renderAccessibilityToggle(
          'lightMode',
          MSG.settingsLightMode,
          MSG.settingsLightModeDesc,
        )}
        {renderAccessibilityToggle(
          'reduceMotion',
          MSG.settingsReduceMotion,
          MSG.settingsReduceMotionDesc,
        )}
        {renderAccessibilityToggle(
          'highContrast',
          MSG.settingsHighContrast,
          MSG.settingsHighContrastDesc,
        )}
        {renderAccessibilityToggle(
          'reduceTransparency',
          MSG.settingsReduceTransparency,
          MSG.settingsReduceTransparencyDesc,
        )}
        {renderAccessibilityToggle(
          'strongFocus',
          MSG.settingsStrongFocus,
          MSG.settingsStrongFocusDesc,
        )}
        {renderAccessibilityToggle(
          'underlineLinks',
          MSG.settingsUnderlineLinks,
          MSG.settingsUnderlineLinksDesc,
        )}

        <div className="settings-row settings-row--compact">
          <div>
            <h4 className="settings-row-label">{MSG.settingsDyslexicFont}</h4>
            <p className="settings-row-desc">{MSG.settingsDyslexicFontDesc}</p>
            <div className="a11y-font-preview" aria-hidden="true">
              <p>{MSG.settingsDyslexicFontPreview1}</p>
              <p>{MSG.settingsDyslexicFontPreview2}</p>
            </div>
          </div>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={Boolean(accessibility.dyslexicFont)}
              onChange={() => patchAccessibility({ dyslexicFont: !accessibility.dyslexicFont })}
              disabled={isDeleting}
            />
            <span className="form-toggle-slider" />
          </label>
        </div>

        <div className="u-flex-col u-gap-sm">
          <span className="section-label">{MSG.settingsTextSizeLabel}</span>
          <div className="strategy-list" role="radiogroup" aria-label={MSG.settingsTextSizeLabel}>
            {TEXT_SIZE_STRATEGIES.map((option) => (
              <div
                key={option.id}
                onClick={() => !isDeleting && patchAccessibility({ textSize: option.id })}
                className={`strategy-option ${accessibility.textSize === option.id ? 'strategy-option-active' : ''}`}
              >
                <input
                  type="radio"
                  name="a11y-text-size"
                  checked={accessibility.textSize === option.id}
                  onChange={() => patchAccessibility({ textSize: option.id })}
                  className="strategy-radio"
                  disabled={isDeleting}
                />
                <div>
                  <h5 className="strategy-option-title">{option.label}</h5>
                  <p className="strategy-option-desc">{option.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLegal = () => (
    <div className="settings-panel-inner">
      {renderSectionHeader(FileText, MSG.settingsLegalTitle, MSG.settingsLegalDesc, 'text-violet')}
      <div className="settings-info-box">
        <p className="settings-info-box-text">{MSG.settingsLegalBody}</p>
        <LegalLinks className="auth-legal-links auth-legal-links--stacked" />
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="settings-panel-inner settings-panel-inner--danger">
      {renderSectionHeader(Trash2, MSG.settingsAccountTitle, MSG.settingsAccountDesc, 'text-rose')}
      <div className="settings-stack">
        <div className="settings-info-box">
          <h4 className="settings-info-box-title">{MSG.settingsAccountDataTitle}</h4>
          <p className="settings-info-box-text">{MSG.settingsAccountDataDesc}</p>
        </div>

        <ChangePasswordForm userId={session?.user?.id} />

        {renderPlannedRoadmap(MSG.settingsPlannedAccountTitle, ACCOUNT_PLANNED)}

        <span className="section-label">{MSG.settingsAccountTitle}</span>
      </div>
      <div className="destructive-actions">
        <button
          type="button"
          onClick={handleDeviceWipe}
          className="btn btn-secondary btn-wipe-outline"
        >
          {MSG.settingsWipeDevice}
        </button>
        <button
          type="button"
          onClick={requestAccountDeletion}
          disabled={isDeleting}
          className="btn btn-danger btn-sm"
        >
          {MSG.settingsDeleteAccount}
        </button>
      </div>
    </div>
  );

  const buildErrorReportContext = () => {
    if (!errorReportIncludeContext) return {};
    const { pathname, hash } = window.location;
    return {
      deviceId: currentUser?.keys?.deviceId ?? null,
      fingerprint: currentUser?.keys?.fingerprint ?? null,
      userAgent: navigator.userAgent,
      urlPath: `${pathname}${hash}`,
      theme: document.documentElement.getAttribute('data-a11y-theme') ?? 'dark',
      accessibility: {
        lightMode: Boolean(accessibility?.lightMode),
        reduceMotion: Boolean(accessibility?.reduceMotion),
        textSize: accessibility?.textSize ?? 'default',
        dyslexicFont: Boolean(accessibility?.dyslexicFont),
      },
      apiEnabled: isApiEnabled(),
    };
  };

  const handleSubmitErrorReport = async (e) => {
    e.preventDefault();
    const description = errorReportText.trim();
    if (description.length < 10) {
      toast(MSG.diagnosticsErrorReportTooShort, { type: 'error' });
      return;
    }

    setErrorReportSubmitting(true);
    const context = buildErrorReportContext();
    try {
      if (isApiEnabled()) {
        await submitErrorReport(description, context);
        toast(MSG.diagnosticsErrorReportSuccess, { type: 'success' });
      } else {
        queueErrorReportLocally({ description, context });
        toast(MSG.diagnosticsErrorReportSavedLocally, { type: 'info' });
      }
      setErrorReportText('');
    } catch {
      queueErrorReportLocally({ description, context });
      toast(MSG.diagnosticsErrorReportSavedLocally, { type: 'info' });
      setErrorReportText('');
    } finally {
      setErrorReportSubmitting(false);
    }
  };

  const renderDiagnostics = () => (
    <div className="settings-panel-inner">
      {renderSectionHeader(HelpCircle, MSG.settingsDiagnosticsTitle, MSG.diagnosticsIntro, 'text-cyan')}

      <form className="diagnostics-error-form" onSubmit={handleSubmitErrorReport}>
        <div className="settings-info-box diagnostics-error-form-intro">
          <h4 className="settings-info-box-title">{MSG.diagnosticsErrorReportTitle}</h4>
          <p className="settings-info-box-text">{MSG.diagnosticsErrorReportDesc}</p>
        </div>

        <label className="profile-field">
          <span className="visually-hidden">{MSG.diagnosticsErrorReportTitle}</span>
          <textarea
            className="profile-input profile-textarea diagnostics-error-textarea"
            value={errorReportText}
            onChange={(e) => setErrorReportText(e.target.value)}
            placeholder={MSG.diagnosticsErrorReportPlaceholder}
            rows={4}
            maxLength={4000}
            disabled={isDeleting || errorReportSubmitting}
            required
            minLength={10}
          />
        </label>

        <div className="settings-row settings-row--compact">
          <div>
            <h4 className="settings-row-label">{MSG.diagnosticsErrorReportIncludeContext}</h4>
            <p className="settings-row-desc">{MSG.diagnosticsErrorReportIncludeContextDesc}</p>
          </div>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={errorReportIncludeContext}
              onChange={() => setErrorReportIncludeContext(!errorReportIncludeContext)}
              disabled={isDeleting || errorReportSubmitting}
            />
            <span className="form-toggle-slider" />
          </label>
        </div>

        <div className="settings-row settings-row--compact">
          <div>
            <h4 className="settings-row-label">{MSG.diagnosticsAutoErrorReportLabel}</h4>
            <p className="settings-row-desc">{MSG.diagnosticsAutoErrorReportDesc}</p>
          </div>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={autoErrorReport}
              onChange={() => {
                const next = !autoErrorReport;
                setAutoErrorReport(next);
                setAutoErrorReportEnabled(next);
              }}
              disabled={isDeleting || errorReportSubmitting}
            />
            <span className="form-toggle-slider" />
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary diagnostics-error-submit"
          disabled={isDeleting || errorReportSubmitting || errorReportText.trim().length < 10}
        >
          <Bug className="icon-sm" />
          {errorReportSubmitting
            ? MSG.diagnosticsErrorReportSubmitting
            : MSG.diagnosticsErrorReportSubmit}
        </button>
      </form>

      {getAppSecurity().lockEnabled && !sensitiveUnlocked ? (
        <SensitiveUnlock onUnlocked={() => setSensitiveUnlocked(true)} />
      ) : (
        currentUser?.keys && (
          <div className="key-ring-box">
            <div className="u-flex-col u-gap-sm">
              <span className="key-ring-label">{MSG.privacyDeviceIdLabel}</span>
              <pre className="key-ring-pre">{currentUser.keys.deviceId}</pre>
            </div>
            <div className="u-flex-col u-gap-sm">
              <span className="key-ring-label">{MSG.privacyPublicKeyLabel}</span>
              <pre className="key-ring-pre">{currentUser.keys.publicKey}</pre>
            </div>
            <div className="u-flex-col u-gap-sm">
              <div className="key-ring-label-row">
                <span className="key-ring-label">{MSG.privacyPrivateKeyLabel}</span>
                <span className="metadata-badge badge-warning badge-sm">
                  {MSG.privacyPrivateKeyBadge}
                </span>
              </div>
              <pre className="key-ring-pre key-ring-pre-private">{currentUser.keys.privateKey}</pre>
            </div>
            <div className="key-fingerprint-row">
              <div>
                <span className="key-ring-label key-fingerprint-text">
                  {MSG.privacyFingerprintLabel}
                </span>
                <span className="key-fingerprint-val">{currentUser.keys.fingerprint}</span>
              </div>
              <button
                type="button"
                onClick={generateNewKeys}
                disabled={isDeleting}
                className="btn btn-secondary btn-sm"
              >
                {MSG.rotateKeys}
              </button>
            </div>
            <div className="warning-banner warning-banner--cyan">
              <p className="warning-banner-text">{MSG.privacyKeyRingNote}</p>
            </div>
          </div>
        )
      )}
    </div>
  );

  const sectionContent = {
    discovery: renderDiscovery,
    messaging: renderMessaging,
    security: renderSecurity,
    accessibility: renderAccessibility,
    account: renderAccount,
    legal: renderLegal,
    diagnostics: renderDiagnostics,
  };

  return (
    <div className="page-stack">
      <div className="grid-section-header">
        <div>
          <h2 className="grid-section-title">{MSG.settingsPageTitle}</h2>
          <p className="grid-section-desc">{MSG.privacyPageDesc}</p>
        </div>
      </div>

      {isDeleting && (
        <div className="countdown-alert">
          <div className="countdown-header">
            <div className="banner-icon-wrap banner-icon-wrap--sm">
              <ShieldAlert className="icon-md" />
            </div>
            <div>
              <h4 className="countdown-title">{MSG.settingsDeletionBannerTitle}</h4>
              <p className="countdown-desc">{MSG.settingsDeletionBannerDesc}</p>
            </div>
          </div>
          <div className="countdown-timer-box">
            <div className="countdown-timer-wrap">
              <span className="countdown-label">{MSG.settingsDeletionTimerLabel}</span>
              <span className="countdown-timer-val">{deletionTimer}</span>
            </div>
            <button type="button" onClick={cancelAccountDeletionLocal} className="btn btn-restore">
              <RotateCcw className="icon-sm" /> {MSG.settingsRestoreAccount}
            </button>
          </div>
        </div>
      )}

      <div className="settings-layout">
        <nav className="settings-nav glass-panel" aria-label="Settings sections">
          {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`settings-nav-btn ${activeSection === id ? 'settings-nav-btn--active' : ''}`}
              onClick={() => {
                if (id !== 'diagnostics') {
                  revokeSensitiveUnlock();
                  setSensitiveUnlocked(false);
                }
                setActiveSection(id);
              }}
              aria-current={activeSection === id ? 'page' : undefined}
            >
              <Icon className="icon-sm" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <section className="settings-panel privacy-card" aria-labelledby="settings-panel-title">
          <h3 id="settings-panel-title" className="visually-hidden">
            {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label}
          </h3>
          {sectionContent[activeSection]?.()}
        </section>
      </div>
    </div>
  );
}
