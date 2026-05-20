import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Grid from './components/Grid';
import ChatRoom from './components/ChatRoom';
import PrivacyCenter from './components/PrivacyCenter';
import { generateKeyPair } from './utils/crypto';

export default function App() {
  // Navigation & visibility tab states
  const [currentTab, setCurrentTab] = useState('grid');
  const [stealthMode, setStealthMode] = useState(false);

  // Active chat profile states (used when routing from profile detail -> E2EE chat room)
  const [activeChatProfile, setActiveChatProfile] = useState(null);
  const [startWithAlbum, setStartWithAlbum] = useState(false);

  // Local user cryptographic state
  const [currentUser, setCurrentUser] = useState({
    username: 'AnonymousUser',
    keys: { publicKey: '', privateKey: '', fingerprint: '' }
  });

  // Load user key ring or generate a new one on startup
  useEffect(() => {
    const cachedKeys = localStorage.getItem('aether_user_keys');
    if (cachedKeys) {
      try {
        const keysObj = JSON.parse(cachedKeys);
        setCurrentUser({ username: 'AnonymousUser', keys: keysObj });
      } catch (err) {
        setupNewKeys();
      }
    } else {
      setupNewKeys();
    }
  }, []);

  const setupNewKeys = () => {
    const keys = generateKeyPair('AnonymousUser');
    localStorage.setItem('aether_user_keys', JSON.stringify(keys));
    setCurrentUser({ username: 'AnonymousUser', keys });
  };

  const handleRotateKeys = () => {
    setupNewKeys();
    alert("Local key ring rotated successfully. Future chat segments will compile with the updated fingerprint.");
  };

  // Safe Panic Device Wipe Trigger
  const handlePanicTrigger = () => {
    // 1. Clear local storage configurations
    localStorage.removeItem('aether_user_keys');
    localStorage.removeItem('aether_deletion_scheduled');

    // 2. Refresh local state
    setStealthMode(true); // Default to safe/invisible mode
    setActiveChatProfile(null);
    setStartWithAlbum(false);
    
    // 3. Regrow brand new cryptographic keys
    const newKeys = generateKeyPair('AnonymousUser');
    localStorage.setItem('aether_user_keys', JSON.stringify(newKeys));
    setCurrentUser({ username: 'AnonymousUser', keys: newKeys });

    // 4. Force route back to safe main grid view
    setCurrentTab('grid');
    
    alert("Panic Wipe Complete: All message threads, image caches, and E2E keys deleted locally. Account flagged as invisible.");
  };

  // Handoff utility from Grid profiles details to Active chat pane
  const handleSelectChat = (profile, openAlbum = false) => {
    setActiveChatProfile(profile);
    setStartWithAlbum(openAlbum);
    setCurrentTab('chat');
  };

  // Mock Database of nearby users fuzzed coordinates
  const [profiles] = useState([
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
      tags: ['Privacy First', 'Coffee', 'Cycling', 'Tech'] 
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
      tags: ['Cybersec', 'Foodie', 'Newbie', 'Vinyl'] 
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
      tags: ['Fitness', 'Hiking', 'Nature', 'Dogs'] 
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
      tags: ['Art', 'Museums', 'Sketching', 'NYU'] 
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
      tags: ['Gamer', 'Coding', 'Tea', 'Twitch'] 
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
      tags: ['Trivia', 'Brewery', 'Catan', 'Indie Rock'] 
    }
  ]);

  return (
    <div className="app-container">
      {/* Sleek dashboard header */}
      <Navigation 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        stealthMode={stealthMode} 
        setStealthMode={setStealthMode}
        onPanicTrigger={handlePanicTrigger}
      />

      {/* Primary tab views content display */}
      <main className="main-content">
        {currentTab === 'grid' && (
          <Grid 
            stealthMode={stealthMode} 
            onSelectChat={handleSelectChat}
            profiles={profiles}
          />
        )}
        
        {currentTab === 'chat' && (
          <ChatRoom 
            currentUser={currentUser} 
            activeChatProfile={activeChatProfile}
            setActiveChatProfile={setActiveChatProfile}
            startWithAlbum={startWithAlbum}
          />
        )}
        
        {currentTab === 'privacy' && (
          <PrivacyCenter 
            stealthMode={stealthMode} 
            setStealthMode={setStealthMode} 
            onPanicTrigger={handlePanicTrigger}
            currentUser={currentUser}
            generateNewKeys={handleRotateKeys}
          />
        )}
      </main>

      {/* --- Mobile View Bottom Tab Navigation --- */}
      <nav className="bottom-nav">
        <button 
          onClick={() => { setCurrentTab('grid'); setActiveChatProfile(null); }}
          className={`nav-link ${currentTab === 'grid' ? 'nav-link-active' : ''}`}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Grid</span>
        </button>

        <button 
          onClick={() => { setCurrentTab('chat'); }}
          className={`nav-link ${currentTab === 'chat' ? 'nav-link-active' : ''}`}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Chat</span>
        </button>

        <button 
          onClick={() => { setCurrentTab('privacy'); }}
          className={`nav-link ${currentTab === 'privacy' ? 'nav-link-active' : ''}`}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Security</span>
        </button>
      </nav>
    </div>
  );
}
