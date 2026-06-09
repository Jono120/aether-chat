import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Shield, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  fetchAuthConfig,
  forgotPassword,
  isApiEnabled,
  loginAccount,
  loginWithApple,
  loginWithGoogle,
  mockOAuthLogin,
  registerAccount,
  resetPassword,
} from '../api/client';
import { useTranslation } from '../i18n/index.js';
import { createOfflineSession } from '../utils/authStorage';
import LegalLinks from './LegalLinks';

export default function AuthPage({ onAuthenticated }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const googleBtnRef = useRef(null);
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('reset') ? 'reset' : 'login';
  });
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('reset') ?? '';
  });
  const [forgotSent, setForgotSent] = useState(false);
  const [devResetToken, setDevResetToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authConfig, setAuthConfig] = useState(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const completeAuth = useCallback(
    (session, successMessage) => {
      onAuthenticated(session);
      toast(successMessage, { type: 'success' });
    },
    [onAuthenticated, toast],
  );

  const handleAuthError = useCallback(
    (err) => {
      toast(err?.message ?? t('authFailed'), { type: 'error' });
    },
    [toast],
  );

  useEffect(() => {
    fetchAuthConfig()
      .then(setAuthConfig)
      .catch(() =>
        setAuthConfig({
          google: 'mock',
          apple: 'mock',
          googleClientId: null,
          appleClientId: null,
          appleRedirectUri: window.location.origin,
        }),
      );
  }, []);

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setSubmitting(true);
      try {
        const session = await loginWithGoogle(credential);
        completeAuth(session, t('authWelcomeBack'));
      } catch (err) {
        handleAuthError(err);
      } finally {
        setSubmitting(false);
      }
    },
    [completeAuth, handleAuthError],
  );

  useEffect(() => {
    if (authConfig?.google !== 'enabled' || !authConfig.googleClientId || !googleBtnRef.current) {
      return undefined;
    }

    const mountGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: authConfig.googleClientId,
        callback: (response) => {
          if (response.credential) handleGoogleCredential(response.credential);
        },
      });
      googleBtnRef.current.innerHTML = '';
      const slotWidth = Math.max(
        140,
        Math.floor((googleBtnRef.current.parentElement?.clientWidth ?? 280) / 2) - 4,
      );
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width: slotWidth,
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
      });
    };

    if (window.google?.accounts?.id) {
      mountGoogle();
      return undefined;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = mountGoogle;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [authConfig, mode, handleGoogleCredential]);

  useEffect(() => {
    if (authConfig?.apple !== 'enabled' || !authConfig.appleClientId) return undefined;

    const initApple = () => {
      if (!window.AppleID?.auth) return;
      window.AppleID.auth.init({
        clientId: authConfig.appleClientId,
        scope: 'name email',
        redirectURI: authConfig.appleRedirectUri || window.location.origin,
        usePopup: true,
      });
    };

    if (window.AppleID?.auth) {
      initApple();
      return undefined;
    }

    const script = document.createElement('script');
    script.src =
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = initApple;
    document.body.appendChild(script);
    return () => script.remove();
  }, [authConfig]);

  const openForgot = () => {
    if (!isApiEnabled()) {
      toast(t('authForgotOffline'), { type: 'info', duration: 6000 });
      return;
    }
    setMode('forgot');
    setForgotSent(false);
    setDevResetToken('');
  };

  const openReset = (token = '') => {
    if (!isApiEnabled()) {
      toast(t('authForgotOffline'), { type: 'info', duration: 6000 });
      return;
    }
    setMode('reset');
    if (token) {
      setResetToken(token);
      const url = new URL(window.location.href);
      url.searchParams.set('reset', token);
      window.history.replaceState({}, '', url);
    }
    setPassword('');
    setConfirmPassword('');
  };

  const copyDevResetToken = async () => {
    if (!devResetToken) return;
    try {
      await navigator.clipboard.writeText(devResetToken);
      toast(t('authForgotCopied'), { type: 'success' });
    } catch {
      toast(devResetToken, { type: 'info', duration: 8000 });
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast('Enter your email address.', { type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await forgotPassword(email.trim());
      setForgotSent(true);
      if (result?.devResetToken) setDevResetToken(result.devResetToken);
      toast(t('authForgotSent'), { type: 'info', duration: 6000 });
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast(t('authPasswordMismatch'), { type: 'error' });
      return;
    }
    if (password.length < 8) {
      toast(t('authPasswordShort'), { type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(resetToken, password);
      toast(t('authResetSuccess'), { type: 'success' });
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'signup' && !acceptedLegal) {
      toast(t('authLegalRequired'), { type: 'error' });
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      toast(t('authPasswordMismatch'), { type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      let session;
      if (isApiEnabled()) {
        session =
          mode === 'login'
            ? await loginAccount(email, password)
            : await registerAccount(email, password, displayName);
      } else {
        if (password.length < 8) {
          toast(t('authPasswordShort'), { type: 'error' });
          return;
        }
        session = createOfflineSession(email, displayName || email.split('@')[0]);
      }
      completeAuth(session, mode === 'login' ? t('authWelcomeBack') : t('authWelcome'));
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setSubmitting(true);
    try {
      if (authConfig?.apple === 'mock') {
        const session = await mockOAuthLogin('apple');
        completeAuth(session, t('authWelcomeBack'));
        return;
      }
      const response = await window.AppleID.auth.signIn();
      const idToken = response?.authorization?.id_token;
      if (!idToken) throw new Error(t('authFailed'));
      const appleUser = response.user?.name;
      const name = appleUser
        ? `${appleUser.firstName ?? ''} ${appleUser.lastName ?? ''}`.trim()
        : undefined;
      const session = await loginWithApple(idToken, name);
      completeAuth(session, t('authWelcomeBack'));
    } catch (err) {
      if (err?.error !== 'popup_closed_by_user') handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockOAuth = async (provider) => {
    setSubmitting(true);
    try {
      let session;
      if (isApiEnabled()) {
        session = await mockOAuthLogin(provider);
      } else {
        session = createOfflineSession(
          `demo.${provider}@aether.local`,
          provider === 'google' ? 'Google Demo' : 'Apple Demo',
        );
      }
      completeAuth(session, t('authWelcomeBack'));
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const showGoogle = authConfig?.google === 'enabled' || authConfig?.google === 'mock';
  const showApple = authConfig?.apple === 'enabled' || authConfig?.apple === 'mock';

  if (mode === 'forgot') {
    return (
      <div className="auth-page">
        <div className="auth-card glass-panel">
          <div className="auth-brand">
            <h1 className="auth-title">{t('authForgotTitle')}</h1>
            <p className="auth-subtitle">{t('authForgotDesc')}</p>
          </div>

          {forgotSent && (
            <div className="auth-forgot-success" role="status">
              {t('authForgotSent')}
            </div>
          )}

          <form className="auth-form" onSubmit={handleForgotSubmit}>
            <label className="auth-field">
              <span className="auth-label">{t('authEmail')}</span>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
              />
            </label>
            {forgotSent && devResetToken && (
              <div className="auth-dev-token">
                <p>{t('authForgotDevToken')}</p>
                <code>{devResetToken}</code>
                <div className="auth-forgot-actions">
                  <button type="button" className="btn btn-secondary" onClick={copyDevResetToken}>
                    {t('authForgotCopyCode')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openReset(devResetToken)}
                  >
                    {t('authForgotUseCode')}
                  </button>
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-secure auth-submit" disabled={submitting}>
              {submitting
                ? t('authPleaseWait')
                : forgotSent
                  ? t('authForgotResend')
                  : t('authForgotSubmit')}
            </button>
          </form>

          <div className="auth-forgot-actions">
            {forgotSent && !devResetToken && (
              <button type="button" className="auth-link-btn" onClick={() => openReset()}>
                {t('authForgotUseCode')}
              </button>
            )}
            <button type="button" className="auth-link-btn" onClick={() => setMode('login')}>
              {t('authBackToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="auth-page">
        <div className="auth-card glass-panel">
          <div className="auth-brand">
            <h1 className="auth-title">{t('authResetTitle')}</h1>
            <p className="auth-subtitle">{t('authResetDesc')}</p>
          </div>
          <form className="auth-form" onSubmit={handleResetSubmit}>
            <label className="auth-field">
              <span className="auth-label">{t('authResetToken')}</span>
              <input
                className="auth-input"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                autoComplete="one-time-code"
                spellCheck={false}
                required
                disabled={submitting}
              />
            </label>
            <label className="auth-field">
              <span className="auth-label">{t('authPassword')}</span>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="auth-field">
              <span className="auth-label">{t('authConfirmPassword')}</span>
              <input
                className="auth-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <button type="submit" className="btn btn-secure auth-submit" disabled={submitting}>
              {submitting ? t('authPleaseWait') : t('authResetSubmit')}
            </button>
          </form>
          <button type="button" className="auth-link-btn" onClick={() => setMode('login')}>
            {t('authBackToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass-panel">
        <div className="auth-brand">
          <div className="logo-icon auth-logo-icon">
            <Shield className="icon-md icon-white" />
          </div>
          <h1 className="auth-title">Aether</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? t('authLoginSubtitle') : t('authSignupSubtitle')}
          </p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => setMode('login')}
          >
            <LogIn className="icon-sm" />
            {t('authLoginTab')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('signup');
              setAcceptedLegal(false);
            }}
          >
            <UserPlus className="icon-sm" />
            {t('authSignupTab')}
          </button>
        </div>

        <div className="auth-divider">
          <span>Email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="auth-field">
              <span className="auth-label">{t('authDisplayName')}</span>
              <input
                className="auth-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                maxLength={64}
              />
            </label>
          )}

          <label className="auth-field">
            <span className="auth-label">{t('authEmail')}</span>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            {mode === 'login' ? (
              <div className="auth-password-header">
                <span className="auth-label">{t('authPassword')}</span>
                <button
                  type="button"
                  className="auth-link-btn auth-forgot-link"
                  onClick={openForgot}
                >
                  {t('authForgotPassword')}
                </button>
              </div>
            ) : (
              <span className="auth-label">{t('authPassword')}</span>
            )}
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>

          {mode === 'signup' && (
            <label className="auth-field">
              <span className="auth-label">{t('authConfirmPassword')}</span>
              <input
                className="auth-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          )}

          {mode === 'signup' && (
            <div className="auth-legal-consent">
              <label className="auth-legal-consent__check">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  disabled={submitting}
                />
                <span>{t('authLegalConsentPrefix')}</span>
              </label>
              <LegalLinks className="legal-links legal-links--inline" />
            </div>
          )}

          {mode === 'login' && (
            <div className="auth-login-recovery">
              <button type="button" className="auth-link-btn" onClick={() => openReset()}>
                {t('authHaveResetCode')}
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-secure auth-submit" disabled={submitting}>
            {submitting
              ? t('authPleaseWait')
              : mode === 'login'
                ? t('authLoginButton')
                : t('authSignupButton')}
          </button>
        </form>

        {(showGoogle || showApple) && (
          <div className="auth-oauth">
            <p className="auth-oauth-legal">{t('authOAuthLegal')}</p>
            <p className="auth-oauth-label">{t('authOrContinue')}</p>
            <div className="auth-oauth-row">
              {showGoogle && (
                <>
                  {authConfig?.google === 'enabled' && (
                    <div ref={googleBtnRef} className="auth-oauth-google" />
                  )}
                  {authConfig?.google === 'mock' && (
                    <button
                      type="button"
                      className="btn btn-secondary auth-oauth-btn"
                      disabled={submitting}
                      onClick={() => handleMockOAuth('google')}
                    >
                      {t('authGoogleDemo')}
                    </button>
                  )}
                </>
              )}
              {showApple && (
                <button
                  type="button"
                  className="btn btn-secondary auth-oauth-btn auth-oauth-btn--apple"
                  disabled={submitting}
                  onClick={handleAppleSignIn}
                >
                  {authConfig?.apple === 'mock' ? t('authAppleDemo') : t('authApple')}
                </button>
              )}
            </div>
          </div>
        )}

        {isApiEnabled() && (
          <p className="auth-admin-hint">{t('authAdminHint')}</p>
        )}

        {!isApiEnabled() && <p className="auth-offline-note">{t('authOfflineNote')}</p>}

        <LegalLinks className="auth-legal-links" />
      </div>
    </div>
  );
}
