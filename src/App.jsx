import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation';
import Grid from './components/Grid';
import ChatRoom from './components/ChatRoom';
import PrivacyCenter from './components/PrivacyCenter';
import UserProfile from './components/UserProfile';
import AuthPage from './components/AuthPage';
import DemoModeBanner from './components/DemoModeBanner';
import { generateKeyPair, isLegacyKeyFormat } from './utils/crypto';
import { MSG, friendlyKeySetupError } from './utils/userMessages';
import { useToast } from './context/ToastContext';
import {
  clearSession,
  isLoggedIn,
  loadSession,
  saveSession,
} from './utils/authStorage';
import {
  fetchMessagingPreferences,
  fetchMyProfile,
  fetchNearbyProfiles,
  isApiEnabled,
  panicLockServer,
  registerPublicKey,
  revokeKeys,
  setSessionExpiredHandler,
  blockUser,
  reportUser,
  updateMyProfile,
} from './api/client';
import {
  clearDeviceKeys,
  loadDeviceKeys,
  migrateLegacyKeysFromLocalStorage,
  saveDeviceKeys,
} from './utils/keyStorage';
import { flushQueuedErrorReports } from './utils/errorReportStorage';
import ProfileCompletionWizard from './components/ProfileCompletionWizard';
import LegalPage from './components/LegalPage';
import AgeGate from './components/AgeGate';
import { isAgeConfirmed } from './utils/ageGateStorage';
import { loadLocalProfile, saveLocalProfile } from './utils/profileStorage';
import {
  applyAccessibilitySettings,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
} from './utils/accessibilityStorage';
import {
  loadMessagingPrefs,
  saveMessagingPrefs,
} from './utils/messagingStorage';


// this is the mock profiles for the app
const MOCK_PROFILES = [
  {
    id: 'julian',
    username: 'Julian',
    age: 25,
    gender: 'male',
    role: 'Looking for coffee & chats',
    bio: 'Enjoys cycling, web design, and digital privacy. Lets grab a coffee around the area.',
    fuzzedDistance: 'Nearby (< 500m)',
    primaryColor: '#7c3aed',
    secondaryColor: '#db2777',
    pattern: 1,
    hasSecureAlbum: true,
    tags: ['Privacy First', 'Coffee', 'Cycling', 'Tech'],
    lookingFor: ['Coffee', 'Chats', 'Friends'],
  },
  {
    id: 'alex',
    username: 'Alex',
    age: 28,
    gender: 'non-binary',
    role: 'New in the city',
    bio: 'Just moved here! Looking for cool dining spots and making good friends. Cybersecurity analyst by day.',
    fuzzedDistance: 'Within 2 km',
    primaryColor: '#0891b2',
    secondaryColor: '#0d9488',
    pattern: 2,
    hasSecureAlbum: true,
    tags: ['Cybersec', 'Foodie', 'Newbie', 'Vinyl'],
    lookingFor: ['Friends', 'Coffee', 'Events'],
  },
  {
    id: 'marcus',
    username: 'Marcus',
    age: 31,
    gender: 'male',
    role: 'Gym & Outdoors',
    bio: 'Always active. Weekends are for hiking or running. Looking for an active workout partner.',
    fuzzedDistance: 'Within 3 km',
    primaryColor: '#2563eb',
    secondaryColor: '#7c3aed',
    pattern: 3,
    hasSecureAlbum: false,
    tags: ['Fitness', 'Hiking', 'Nature', 'Dogs'],
    lookingFor: ['Workout buddy', 'Friends'],
  },
  {
    id: 'ethan',
    username: 'Ethan',
    age: 22,
    gender: 'male',
    role: 'Art student at NYU',
    bio: 'Paintings, prints, and lots of museums. Let me show you around the galleries or co-work on sketchbooks.',
    fuzzedDistance: 'Within 5 km',
    primaryColor: '#db2777',
    secondaryColor: '#ea580c',
    pattern: 4,
    hasSecureAlbum: true,
    tags: ['Art', 'Museums', 'Sketching', 'NYU'],
    lookingFor: ['Friends', 'Chats'],
  },
  {
    id: 'tristan',
    username: 'Tristan',
    age: 29,
    gender: 'male',
    role: 'Late night conversation',
    bio: 'Gamer, software dev, and tea lover. I stream on twitch sometimes. Lets exchange game lists.',
    fuzzedDistance: 'Within 10 km',
    primaryColor: '#059669',
    secondaryColor: '#0d9488',
    pattern: 1,
    hasSecureAlbum: false,
    tags: ['Gamer', 'Coding', 'Tea', 'Twitch'],
    lookingFor: ['Chats', 'Friends'],
  },
  {
    id: 'tyler',
    username: 'Tyler',
    age: 24,
    gender: 'male',
    role: 'Board games & breweries',
    bio: 'Trivia night regular. Looking to host a cooperative board game crew or visit local craft breweries.',
    fuzzedDistance: 'Within 1 km',
    primaryColor: '#ea580c',
    secondaryColor: '#b45309',
    pattern: 2,
    hasSecureAlbum: true,
    tags: ['Trivia', 'Brewery', 'Catan', 'Indie Rock'],
    lookingFor: ['Friends', 'Events', 'Coffee'],
  },
];

export default function App() {
  const { toast } = useToast();

  const [currentTab, setCurrentTab] = useState('grid');
  const [stealthMode, setStealthMode] = useState(false);
  const [albumScreenshotShield, setAlbumScreenshotShield] = useState(true);
  const [accessibility, setAccessibility] = useState(() => loadAccessibilitySettings());
  const [messagingPrefs, setMessagingPrefs] = useState(() => loadMessagingPrefs());
  const [activeChatProfile, setActiveChatProfile] = useState(null);
  const [startWithAlbum, setStartWithAlbum] = useState(false);
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState(null);
  const [myProfile, setMyProfile] = useState(loadLocalProfile);

  const [session, setSession] = useState(() => loadSession());
  const authenticated = isLoggedIn(isApiEnabled());

  const [currentUser, setCurrentUser] = useState({
    username: session?.user?.displayName ?? 'You',
    keys: null,
  });
  const [keyInitError, setKeyInitError] = useState(null);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [legalPage, setLegalPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash === 'terms' || hash === 'privacy' ? hash : null;
  });
  const [ageOk, setAgeOk] = useState(isAgeConfirmed);

  const handleAuthenticated = (newSession) => {
    saveSession(newSession);
    setSession(newSession);
    setCurrentUser((prev) => ({
      ...prev,
      username: newSession.user?.displayName ?? prev.username,
    }));
  };

  const handleAccessibilityChange = useCallback((next) => {
    setAccessibility(next);
    saveAccessibilitySettings(next);
    applyAccessibilitySettings(next);
  }, []);

  const handleMessagingPrefsChange = useCallback((next) => {
    setMessagingPrefs(next);
    saveMessagingPrefs(next);
  }, []);

  useEffect(() => {
    applyAccessibilitySettings(accessibility);
  }, [accessibility]);

  useEffect(() => {
    setSessionExpiredHandler((message) => {
      clearSession();
      setSession(null);
      setCurrentUser({ username: 'You', keys: null });
      toast(message, { type: 'warning' });
    });
  }, [toast]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      setLegalPage(hash === 'terms' || hash === 'privacy' ? hash : null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    flushQueuedErrorReports().catch(() => {});
    return undefined;
  }, [authenticated]);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    clearDeviceKeys();
    setCurrentUser({ username: 'You', keys: null });
    setCurrentTab('grid');
    toast(MSG.authLogout, { type: 'info' });
  };

  const syncKeysToServer = useCallback(async (keys) => {
    if (!isApiEnabled() || !keys?.publicKeyJwk) return;
    try {
      await registerPublicKey(keys.deviceId, keys.publicKeyJwk, keys.fingerprint);
    } catch (err) {
      console.warn('Key registration failed', err);
    }
  }, []);

  const setupNewKeys = useCallback(async () => {
    setKeyInitError(null);
    try {
      const keys = await generateKeyPair();
      await saveDeviceKeys(keys);
      setCurrentUser((prev) => ({ ...prev, keys }));
      await syncKeysToServer(keys);
    } catch (err) {
      console.error('Key initialization failed', err);
      setKeyInitError(friendlyKeySetupError(err));
    }
  }, [syncKeysToServer]);

  useEffect(() => {
    if (!authenticated) return undefined;

    const init = async () => {
      try {
        const migrated = await migrateLegacyKeysFromLocalStorage();
        const cachedKeys = migrated ?? (await loadDeviceKeys());
        const displayName = session?.user?.displayName ?? 'You';
        if (cachedKeys) {
          if (isLegacyKeyFormat(cachedKeys)) {
            await setupNewKeys();
            return;
          }
          setCurrentUser({ username: displayName, keys: cachedKeys });
          await syncKeysToServer(cachedKeys);
        } else {
          await setupNewKeys();
        }
      } catch (err) {
        console.error('Key initialization failed', err);
        setKeyInitError(friendlyKeySetupError(err));
      }
    };
    init();
  }, [authenticated, setupNewKeys, syncKeysToServer, session?.user?.displayName]);

  const loadProfiles = useCallback(async () => {
    if (!isApiEnabled()) {
      setProfilesError(null);
      setProfiles(MOCK_PROFILES);
      return;
    }
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const remote = await fetchNearbyProfiles();
      setProfiles(Array.isArray(remote) ? remote : []);
    } catch (err) {
      console.warn('Profiles API failed', err);
      setProfiles([]);
      setProfilesError(err?.message ?? 'Could not load profiles');
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;

    let cancelled = false;
    (async () => {
      await loadProfiles();
      if (cancelled) return;
      if (isApiEnabled()) {
        try {
          const mine = await fetchMyProfile();
          if (mine && !cancelled) {
            saveLocalProfile(mine);
            setMyProfile(mine);
            setStealthMode(!mine.discoverable);
            if (!mine.username?.trim()) {
              setShowProfileWizard(true);
            }
          }
        } catch (err) {
          console.warn('My profile load failed', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, loadProfiles]);

  useEffect(() => {
    if (!authenticated || !isApiEnabled()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const prefs = await fetchMessagingPreferences();
        if (cancelled || typeof prefs?.readReceiptsEnabled !== 'boolean') return;
        const merged = { ...loadMessagingPrefs(), readReceiptsEnabled: prefs.readReceiptsEnabled };
        setMessagingPrefs(merged);
        saveMessagingPrefs(merged);
      } catch (err) {
        console.warn('Messaging preferences load failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const handleRotateKeys = async () => {
    if (isApiEnabled() && currentUser.keys?.deviceId) {
      try {
        await revokeKeys(currentUser.keys.deviceId);
      } catch (err) {
        console.warn('Revoke failed', err);
      }
    }
    await setupNewKeys();
    toast(MSG.keysRotated, { type: 'success' });
  };

  const handlePanicTrigger = async () => {
    if (isApiEnabled()) {
      try {
        await panicLockServer();
        await revokeKeys();
      } catch (err) {
        console.warn('Server panic sync failed', err);
      }
    }

    await clearDeviceKeys();
    localStorage.removeItem('aether_deletion_scheduled');

    setStealthMode(true);
    setActiveChatProfile(null);
    setStartWithAlbum(false);

    await setupNewKeys();
    setCurrentTab('grid');

    toast(MSG.panicComplete, {
      type: 'success',
      duration: 6000,
    });
  };

  const handleSelectChat = (profile, openAlbum = false) => {
    setActiveChatProfile(profile);
    setStartWithAlbum(openAlbum);
    setCurrentTab('chat');
  };

  const handleProfileSaved = (profile) => {
    if (profile) {
      setMyProfile(profile);
      saveLocalProfile(profile);
      if (profile.username) {
        setCurrentUser((prev) => ({ ...prev, username: profile.username }));
      }
      setStealthMode(!profile.discoverable);
    }
    loadProfiles();
  };

  const closeLegal = () => {
    window.location.hash = '';
    setLegalPage(null);
  };

  const legalOverlay = legalPage ? <LegalPage type={legalPage} onClose={closeLegal} /> : null;

  if (!ageOk) {
    return (
      <>
        <AgeGate onConfirmed={() => setAgeOk(true)} />
        {legalOverlay}
      </>
    );
  }

  if (!authenticated) {
    return (
      <>
        <div className="app-container app-container--auth">
          <DemoModeBanner />
          <AuthPage onAuthenticated={handleAuthenticated} />
        </div>
        {legalOverlay}
      </>
    );
  }

  if (keyInitError) {
    return (
      <div className="app-container" style={{ padding: '2rem', maxWidth: '32rem' }}>
        <p>{keyInitError}</p>
        <button
          type="button"
          onClick={() => {
            clearDeviceKeys().then(() => setupNewKeys());
          }}
        >
          {MSG.retry}
        </button>
      </div>
    );
  }

  if (!currentUser.keys) {
    return <div className="app-container">{MSG.keysSettingUp}</div>;
  }

  const handleBlockProfile = async (profile) => {
    if (!isApiEnabled()) {
      toast('Blocking is available when connected to the live API.', { type: 'info' });
      return;
    }
    try {
      await blockUser(profile.id);
      toast(`${profile.username} blocked`, { type: 'success' });
      loadProfiles();
    } catch (err) {
      toast(err?.message ?? 'Block failed', { type: 'error' });
    }
  };

  const handleReportProfile = async (profile) => {
    if (!isApiEnabled()) {
      toast('Reporting is available when connected to the live API.', { type: 'info' });
      return;
    }
    const reason = window.prompt('Reason for report (required):', 'harassment');
    if (!reason?.trim()) return;
    try {
      await reportUser(profile.id, { reason: reason.trim() });
      toast('Report submitted. Thank you.', { type: 'success' });
    } catch (err) {
      toast(err?.message ?? 'Report failed', { type: 'error' });
    }
  };

  return (
    <>
    <div className="app-container">
      <DemoModeBanner />
      {showProfileWizard && (
        <ProfileCompletionWizard
          onComplete={async (fields) => {
            try {
              if (isApiEnabled()) {
                await updateMyProfile(fields);
              }
              setMyProfile((prev) => ({ ...prev, ...fields }));
              saveLocalProfile({ ...myProfile, ...fields });
              setShowProfileWizard(false);
              toast('Profile updated', { type: 'success' });
            } catch (err) {
              toast(err?.message ?? 'Could not save profile', { type: 'error' });
            }
          }}
          onSkip={() => setShowProfileWizard(false)}
        />
      )}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        stealthMode={stealthMode}
        setStealthMode={setStealthMode}
        onPanicTrigger={handlePanicTrigger}
        onLogout={handleLogout}
        userLabel={session?.user?.displayName ?? session?.user?.email}
        sessionIsAdmin={Boolean(session?.user?.isAdmin)}
      />

      <main className="main-content" data-tab={currentTab}>
        {currentTab === 'grid' && (
          <Grid
            stealthMode={stealthMode}
            onSelectChat={handleSelectChat}
            profiles={profiles}
            profilesLoading={profilesLoading}
            profilesError={profilesError}
            onRefreshProfiles={loadProfiles}
            onBlockUser={handleBlockProfile}
            onReportUser={handleReportProfile}
          />
        )}

        {currentTab === 'chat' && (
          <ChatRoom
            key={currentUser.keys.fingerprint}
            currentUser={currentUser}
            activeChatProfile={activeChatProfile}
            setActiveChatProfile={setActiveChatProfile}
            startWithAlbum={startWithAlbum}
            albumScreenshotShield={albumScreenshotShield}
            myProfile={myProfile}
            defaultSelfDestructSeconds={messagingPrefs.defaultSelfDestructSeconds}
            readReceiptsEnabled={messagingPrefs.readReceiptsEnabled}
          />
        )}

        {currentTab === 'profile' && (
          <UserProfile
            onProfileSaved={handleProfileSaved}
            setStealthMode={setStealthMode}
          />
        )}

        {currentTab === 'privacy' && (
          <PrivacyCenter
            stealthMode={stealthMode}
            setStealthMode={setStealthMode}
            onPanicTrigger={handlePanicTrigger}
            currentUser={currentUser}
            generateNewKeys={handleRotateKeys}
            albumScreenshotShield={albumScreenshotShield}
            setAlbumScreenshotShield={setAlbumScreenshotShield}
            accessibility={accessibility}
            onAccessibilityChange={handleAccessibilityChange}
            messagingPrefs={messagingPrefs}
            onMessagingPrefsChange={handleMessagingPrefsChange}
            onNavigateTab={(tab) => {
              setCurrentTab(tab);
              setActiveChatProfile(null);
            }}
            onChatBackupRestore={() => {
              window.location.reload();
            }}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <button
          onClick={() => {
            setCurrentTab('grid');
            setActiveChatProfile(null);
          }}
          className={`nav-link ${currentTab === 'grid' ? 'nav-link-active' : ''}`}
        >
          <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Grid</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('chat');
          }}
          className={`nav-link ${currentTab === 'chat' ? 'nav-link-active' : ''}`}
        >
          <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Chat</span>
        </button>

        <button
          onClick={() => setCurrentTab('profile')}
          className={`nav-link ${currentTab === 'profile' ? 'nav-link-active' : ''}`}
        >
          <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Profile</span>
        </button>

        <button
          onClick={() => setCurrentTab('privacy')}
          className={`nav-link ${currentTab === 'privacy' ? 'nav-link-active' : ''}`}
        >
          <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>
    </div>
    {legalOverlay}
    </>
  );
}
