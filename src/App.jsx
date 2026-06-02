import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation';
import Grid from './components/Grid';
import ChatRoom from './components/ChatRoom';
import PrivacyCenter from './components/PrivacyCenter';
import { generateKeyPair, isLegacyKeyFormat } from './utils/crypto';
import { useToast } from './context/ToastContext';
import {
  fetchNearbyProfiles,
  isApiEnabled,
  panicLockServer,
  registerPublicKey,
  revokeKeys,
} from './api/client';

const MOCK_PROFILES = [
  {
    id: 'julian',
    username: 'Julian',
    age: 25,
    role: 'Looking for coffee & chats',
    bio: 'Enjoys cycling, web design, and digital privacy. Lets grab a coffee around the area.',
    fuzzedDistance: 'Nearby (< 500m)',
    primaryColor: '#7c3aed',
    secondaryColor: '#db2777',
    pattern: 1,
    hasSecureAlbum: true,
    tags: ['Privacy First', 'Coffee', 'Cycling', 'Tech'],
  },
  {
    id: 'alex',
    username: 'Alex',
    age: 28,
    role: 'New in the city',
    bio: 'Just moved here! Looking for cool dining spots and making good friends. Cybersecurity analyst by day.',
    fuzzedDistance: 'Within 2 km',
    primaryColor: '#0891b2',
    secondaryColor: '#0d9488',
    pattern: 2,
    hasSecureAlbum: true,
    tags: ['Cybersec', 'Foodie', 'Newbie', 'Vinyl'],
  },
  {
    id: 'marcus',
    username: 'Marcus',
    age: 31,
    role: 'Gym & Outdoors',
    bio: 'Always active. Weekends are for hiking or running. Looking for an active workout partner.',
    fuzzedDistance: 'Within 3 km',
    primaryColor: '#2563eb',
    secondaryColor: '#7c3aed',
    pattern: 3,
    hasSecureAlbum: false,
    tags: ['Fitness', 'Hiking', 'Nature', 'Dogs'],
  },
  {
    id: 'ethan',
    username: 'Ethan',
    age: 22,
    role: 'Art student at NYU',
    bio: 'Paintings, prints, and lots of museums. Let me show you around the galleries or co-work on sketchbooks.',
    fuzzedDistance: 'Within 5 km',
    primaryColor: '#db2777',
    secondaryColor: '#ea580c',
    pattern: 4,
    hasSecureAlbum: true,
    tags: ['Art', 'Museums', 'Sketching', 'NYU'],
  },
  {
    id: 'tristan',
    username: 'Tristan',
    age: 29,
    role: 'Late night conversation',
    bio: 'Gamer, software dev, and tea lover. I stream on twitch sometimes. Lets exchange game lists.',
    fuzzedDistance: 'Within 10 km',
    primaryColor: '#059669',
    secondaryColor: '#0d9488',
    pattern: 1,
    hasSecureAlbum: false,
    tags: ['Gamer', 'Coding', 'Tea', 'Twitch'],
  },
  {
    id: 'tyler',
    username: 'Tyler',
    age: 24,
    role: 'Board games & breweries',
    bio: 'Trivia night regular. Looking to host a cooperative board game crew or visit local craft breweries.',
    fuzzedDistance: 'Within 1 km',
    primaryColor: '#ea580c',
    secondaryColor: '#b45309',
    pattern: 2,
    hasSecureAlbum: true,
    tags: ['Trivia', 'Brewery', 'Catan', 'Indie Rock'],
  },
];

export default function App() {
  const { toast } = useToast();

  const [currentTab, setCurrentTab] = useState('grid');
  const [stealthMode, setStealthMode] = useState(false);
  const [albumScreenshotShield, setAlbumScreenshotShield] = useState(true);
  const [activeChatProfile, setActiveChatProfile] = useState(null);
  const [startWithAlbum, setStartWithAlbum] = useState(false);
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState({
    username: 'AnonymousUser',
    keys: null,
  });

  const syncKeysToServer = useCallback(async (keys) => {
    if (!isApiEnabled() || !keys?.publicKeyJwk) return;
    try {
      await registerPublicKey(keys.deviceId, keys.publicKeyJwk, keys.fingerprint);
    } catch (err) {
      console.warn('Key registration failed', err);
    }
  }, []);

  const setupNewKeys = useCallback(async () => {
    const keys = await generateKeyPair();
    localStorage.setItem('aether_user_keys', JSON.stringify(keys));
    setCurrentUser({ username: 'AnonymousUser', keys });
    await syncKeysToServer(keys);
  }, [syncKeysToServer]);

  useEffect(() => {
    const init = async () => {
      const cachedKeys = localStorage.getItem('aether_user_keys');
      if (cachedKeys) {
        try {
          const keysObj = JSON.parse(cachedKeys);
          if (isLegacyKeyFormat(keysObj)) {
            await setupNewKeys();
            return;
          }
          setCurrentUser({ username: 'AnonymousUser', keys: keysObj });
          await syncKeysToServer(keysObj);
        } catch {
          await setupNewKeys();
        }
      } else {
        await setupNewKeys();
      }
    };
    init();
  }, [setupNewKeys, syncKeysToServer]);

  const loadProfiles = useCallback(async () => {
    if (!isApiEnabled()) {
      setProfiles(MOCK_PROFILES);
      return;
    }
    setProfilesLoading(true);
    try {
      const remote = await fetchNearbyProfiles();
      if (remote?.length) setProfiles(remote);
      else setProfiles(MOCK_PROFILES);
    } catch (err) {
      console.warn('Profiles API unavailable, using mocks', err);
      setProfiles(MOCK_PROFILES);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadProfiles();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfiles]);

  const handleRotateKeys = async () => {
    if (isApiEnabled() && currentUser.keys?.deviceId) {
      try {
        await revokeKeys(currentUser.keys.deviceId);
      } catch (err) {
        console.warn('Revoke failed', err);
      }
    }
    await setupNewKeys();
    toast('Key ring rotated successfully.', { type: 'success' });
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

    localStorage.removeItem('aether_user_keys');
    localStorage.removeItem('aether_deletion_scheduled');

    setStealthMode(true);
    setActiveChatProfile(null);
    setStartWithAlbum(false);

    await setupNewKeys();
    setCurrentTab('grid');

    toast('Panic wipe complete: all message threads, images and data deleted.', {
      type: 'success',
      duration: 6000,
    });
  };

  const handleSelectChat = (profile, openAlbum = false) => {
    setActiveChatProfile(profile);
    setStartWithAlbum(openAlbum);
    setCurrentTab('chat');
  };

  if (!currentUser.keys) {
    return <div className="app-container">Initializing secure keys…</div>;
  }

  return (
    <div className="app-container">
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        stealthMode={stealthMode}
        setStealthMode={setStealthMode}
        onPanicTrigger={handlePanicTrigger}
      />

      <main className="main-content" data-tab={currentTab}>
        {currentTab === 'grid' && (
          <Grid
            stealthMode={stealthMode}
            onSelectChat={handleSelectChat}
            profiles={profiles}
            profilesLoading={profilesLoading}
            onRefreshProfiles={loadProfiles}
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
          onClick={() => {
            setCurrentTab('privacy');
          }}
          className={`nav-link ${currentTab === 'privacy' ? 'nav-link-active' : ''}`}
        >
          <svg className="bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Security</span>
        </button>
      </nav>
    </div>
  );
}
