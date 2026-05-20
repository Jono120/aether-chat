import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Shield, Lock, Trash2, ShieldAlert, ShieldCheck, 
  Image, Info, ArrowLeft, Clock, Eye, EyeOff, Camera, Sliders 
} from 'lucide-react';
import { 
  encryptMessage, decryptMessage, 
  generateKeyPair, generateGroupKey, 
  encryptGroupMessage, decryptGroupMessage 
} from '../utils/crypto';
import { inspectImageMetadata, stripImageMetadata } from '../utils/exif';

/**
 * ChatRoom Component
 * 
 * Uses custom semantic classes defined in index.css:
 * - chat-layout / chat-sidebar / contact-list / contact-btn
 * - chat-main / chat-header / chat-pane / chat-messages-container
 * - chat-bubble / bubble-sent / bubble-received / chat-bubble-footer
 * - chat-input-form / chat-input-field / chat-send-btn
 * - album-header / album-viewport / album-shield-cover / album-photo-card
 * - wire-inspector / wire-packet-box
 * - exif-panel / exif-meta-fields / custom-range
 */
export default function ChatRoom({ 
  currentUser, 
  activeChatProfile, 
  setActiveChatProfile, 
  startWithAlbum = false 
}) {
  // Navigation / View states
  const [selectedChat, setSelectedChat] = useState(null);
  const [showAlbum, setShowAlbum] = useState(false);
  const [showWireInspector, setShowWireInspector] = useState(false);

  // Message and timing states
  const [inputText, setInputText] = useState('');
  const [selfDestructSeconds, setSelfDestructSeconds] = useState(0);
  const [lastTransmittedPacket, setLastTransmittedPacket] = useState(null);

  // EXIF Inspector states
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileAnalysis, setFileAnalysis] = useState(null);
  const [compressionQuality, setCompressionQuality] = useState(90);
  const [isStripping, setIsStripping] = useState(false);

  // Screen shield defocus simulator state
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [forceShield, setForceShield] = useState(false);

  // Local Chat Database (Simulated client device database)
  const [conversations, setConversations] = useState({
    julian: [
      { id: 1, sender: 'julian', text: "Hey! Are you nearby?", timestamp: '09:05 AM', isE2EE: true },
      { id: 2, sender: 'me', text: "Yeah, around the lower east side. Your profile says within 1km.", timestamp: '09:06 AM', isE2EE: true },
      { id: 3, sender: 'julian', text: "Cool, I snapped my grid fuzzing to 1km too. Keep things private until we meet.", timestamp: '09:07 AM', isE2EE: true }
    ],
    alex: [
      { id: 1, sender: 'alex', text: "Did you check out that security panel?", timestamp: 'Yesterday', isE2EE: true },
      { id: 2, sender: 'me', text: "Yes! The EXIF stripper works perfectly.", timestamp: 'Yesterday', isE2EE: true }
    ],
    group_city: [
      { id: 1, sender: 'alex', text: "Welcome to the City Safe Haven Chat.", timestamp: '08:45 AM', isGroup: true, keyId: 'GRP-KID-105' },
      { id: 2, sender: 'julian', text: "Encrypting with rotated keys. All clear.", timestamp: '08:48 AM', isGroup: true, keyId: 'GRP-KID-105' }
    ]
  });

  // Secure Album Photos Database
  const [albumPhotos, setAlbumPhotos] = useState([
    { id: 'p1', sender: 'julian', url: 'svg-mock-1', title: 'Sunset Silhouette', timeRemaining: null, totalTime: 10, viewed: false },
    { id: 'p2', sender: 'me', url: 'svg-mock-2', title: 'Coffee Art (EXIF Stripped)', timeRemaining: null, totalTime: 30, viewed: false }
  ]);

  const messagesEndRef = useRef(null);

  // Select defaults or link profile from discovery grid
  useEffect(() => {
    if (activeChatProfile) {
      const isGroup = activeChatProfile.id === 'group_city';
      setSelectedChat({
        id: activeChatProfile.id,
        name: activeChatProfile.username || activeChatProfile.name,
        publicKey: activeChatProfile.publicKey || 'AETH-PUB-MOCK-KEY-F9812A',
        isGroup: isGroup
      });
      if (startWithAlbum) {
        setShowAlbum(true);
      }
    } else {
      setSelectedChat({
        id: 'julian',
        name: 'Julian',
        publicKey: 'AETH-PUB-JUL-8F3AC4D962E1B48A',
        isGroup: false
      });
    }
  }, [activeChatProfile, startWithAlbum]);

  // Screen shield browser defocus listeners
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedChat]);

  // Timed actions loop (disappearing messages & ephemeral photos)
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Message self destruction check
      let changed = false;
      const updatedConvs = { ...conversations };
      
      Object.keys(updatedConvs).forEach(convId => {
        const filtered = updatedConvs[convId].filter(msg => {
          if (msg.expiresAt) {
            const timeDiff = new Date(msg.expiresAt) - new Date();
            if (timeDiff <= 0) {
              changed = true;
              return false;
            }
          }
          return true;
        });
        if (filtered.length !== updatedConvs[convId].length) {
          updatedConvs[convId] = filtered;
          changed = true;
        }
      });

      if (changed) {
        setConversations(updatedConvs);
      }

      // 2. Photo timer countdown
      setAlbumPhotos(prev => {
        let albumChanged = false;
        const nextPhotos = prev.map(p => {
          if (p.timeRemaining !== null) {
            albumChanged = true;
            if (p.timeRemaining <= 1) {
              return { ...p, timeRemaining: 0, viewed: true };
            }
            return { ...p, timeRemaining: p.timeRemaining - 1 };
          }
          return p;
        });
        return albumChanged ? nextPhotos : prev;
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [conversations]);

  const getKeysForPartner = (partnerId) => {
    if (partnerId === 'julian') return { publicKey: 'AETH-PUB-JUL-8F3AC4D962E1B48A', name: 'Julian' };
    if (partnerId === 'alex') return { publicKey: 'AETH-PUB-ALE-092EF11AA93BC12D', name: 'Alex' };
    return { publicKey: 'AETH-PUB-MOCK-389A9FF2E', name: 'User' };
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const chatKey = selectedChat.id;

    let newMsg = {
      id: Date.now(),
      sender: 'me',
      text: inputText,
      timestamp,
      isE2EE: !selectedChat.isGroup,
      isGroup: selectedChat.isGroup
    };

    if (selfDestructSeconds > 0) {
      newMsg.expiresAt = new Date(Date.now() + selfDestructSeconds * 1000).toISOString();
      newMsg.totalDuration = selfDestructSeconds;
    }

    if (selectedChat.isGroup) {
      const groupKey = generateGroupKey('group_city');
      const packet = encryptGroupMessage(inputText, groupKey);
      
      newMsg.keyId = groupKey.keyId;
      newMsg.keyVersion = groupKey.version;
      
      setLastTransmittedPacket({
        header: {
          version: "Aether-Group-E2EE-1.0",
          timestamp: new Date().toISOString(),
          algorithm: "AES-256-GCM"
        },
        payload: packet
      });
    } else {
      const partner = getKeysForPartner(selectedChat.id);
      const packet = encryptMessage(inputText, currentUser.keys.privateKey, partner.publicKey);
      
      setLastTransmittedPacket({
        header: {
          version: "Aether-Direct-E2EE-1.0",
          timestamp: new Date().toISOString(),
          algorithm: "ECDH-X25519-AES-256-GCM"
        },
        payload: packet
      });
    }

    setConversations(prev => ({
      ...prev,
      [chatKey]: [...prev[chatKey], newMsg]
    }));

    setInputText('');

    if (!selectedChat.isGroup) {
      setTimeout(() => {
        simulatePartnerResponse(chatKey);
      }, 2500);
    }
  };

  const simulatePartnerResponse = (chatKey) => {
    const partner = getKeysForPartner(chatKey);
    const messages = [
      "Message received securely. Key fingerprint matches.",
      "My client stripped the JPEG headers on that portrait as well.",
      "Sounds good! Talk soon.",
      "Got it. Self-destructing text works nicely."
    ];
    const text = messages[Math.floor(Math.random() * messages.length)];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const packet = encryptMessage(text, 'AETH-PRV-PARTNER-MOCK-38910AB821', currentUser.keys.publicKey);

    setLastTransmittedPacket({
      header: {
        version: "Aether-Direct-E2EE-1.0",
        timestamp: new Date().toISOString(),
        algorithm: "ECDH-X25519-AES-256-GCM"
      },
      payload: packet
    });

    setConversations(prev => ({
      ...prev,
      [chatKey]: [
        ...prev[chatKey],
        { 
          id: Date.now() + 1, 
          sender: chatKey, 
          text: text, 
          timestamp, 
          isE2EE: true 
        }
      ]
    }));
  };

  // Safe file loader
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    const analysis = await inspectImageMetadata(file);
    setFileAnalysis(analysis);
  };

  // EXIF Metadata strip and send logic
  const handleStripAndSendImage = async () => {
    if (!selectedFile) return;
    setIsStripping(true);

    setTimeout(async () => {
      const stripResult = await stripImageMetadata(selectedFile);
      
      const newPhotoId = 'p-' + Date.now();
      const newPhoto = {
        id: newPhotoId,
        sender: 'me',
        url: 'svg-mock-stripped',
        title: `${selectedFile.name.split('.')[0]} (Stripped)`,
        timeRemaining: null,
        totalTime: 10,
        viewed: false,
        originalSize: stripResult.originalSize,
        strippedSize: Math.round(stripResult.strippedSize * (compressionQuality / 100)),
        bytesRemoved: stripResult.bytesRemoved + Math.round(stripResult.strippedSize * (1 - compressionQuality / 100))
      };

      setAlbumPhotos(prev => [newPhoto, ...prev]);
      
      const chatKey = selectedChat.id;
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const packetText = `[SECURE ALBUM ATTACHMENT ID ${newPhotoId}. EXIF stripped. Quality: ${compressionQuality}%]`;
      const packet = encryptMessage(packetText, currentUser.keys.privateKey, getKeysForPartner(chatKey).publicKey);
      
      setLastTransmittedPacket({
        header: {
          version: "Aether-Direct-E2EE-1.0",
          timestamp: new Date().toISOString(),
          algorithm: "ECDH-X25519-AES-256-GCM"
        },
        payload: packet
      });

      setConversations(prev => ({
        ...prev,
        [chatKey]: [
          ...prev[chatKey],
          {
            id: Date.now(),
            sender: 'me',
            text: `📷 Shared a high-quality secure photo to Album. (EXIF metadata stripped. Quality slider: ${compressionQuality}%)`,
            timestamp,
            isE2EE: true
          }
        ]
      }));

      setSelectedFile(null);
      setFileAnalysis(null);
      setIsStripping(false);
      setShowAlbum(true);
    }, 1500);
  };

  const handleViewImage = (photoId) => {
    setAlbumPhotos(prev => prev.map(p => {
      if (p.id === photoId && p.timeRemaining === null && !p.viewed) {
        return { ...p, timeRemaining: p.totalTime };
      }
      return p;
    }));
  };

  // Generative graphic SVG to substitute files securely
  const renderAlbumSVG = (title, id) => {
    return (
      <svg style={{ width: '100%', height: '100%', display: 'block' }} viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`grad-album-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <rect width="200" height="150" fill={`url(#grad-album-${id})`} />
        <circle cx="100" cy="70" r="24" fill="rgba(0,0,0,0.4)" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
        <text x="100" y="74" textAnchor="middle" fill="#06b6d4" fontSize="8" fontWeight="bold" fontFamily="monospace">E2E ENCRYPT</text>
        
        <polygon points="40,120 100,55 160,120" fill="rgba(255,255,255,0.05)" />
        <polygon points="70,120 120,70 170,120" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        
        <rect x="8" y="8" width="36" height="14" rx="3" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" strokeWidth="0.5" />
        <text x="26" y="17" textAnchor="middle" fill="#10b981" fontSize="6" fontWeight="bold">NO EXIF</text>
        
        <text x="10" y="142" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="sans-serif">{title}</text>
      </svg>
    );
  };

  const activeMessages = conversations[selectedChat?.id] || [];
  const isShieldActive = !isWindowFocused || forceShield;

  return (
    <div className="chat-layout">
      
      {/* Sidebar - Contacts List */}
      <div className={`chat-sidebar glass-panel ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">Active Contacts</h3>
          <p className="sidebar-desc">Local key exchange established</p>
        </div>
        
        <div className="contact-list custom-scrollbar">
          {/* Contact 1 */}
          <button
            onClick={() => { setSelectedChat({ id: 'julian', name: 'Julian', isGroup: false }); setShowAlbum(false); }}
            className={`contact-btn ${selectedChat?.id === 'julian' ? 'contact-btn-active' : ''}`}
          >
            <div className="contact-avatar" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' }}>
              JU
            </div>
            <div className="contact-info">
              <div className="contact-name-row">
                <span className="status-indicator status-online" />
                <span className="contact-name">Julian</span>
              </div>
              <p className="contact-sub">E2E Session Active</p>
            </div>
          </button>

          {/* Contact 2 */}
          <button
            onClick={() => { setSelectedChat({ id: 'alex', name: 'Alex', isGroup: false }); setShowAlbum(false); }}
            className={`contact-btn ${selectedChat?.id === 'alex' ? 'contact-btn-active' : ''}`}
          >
            <div className="contact-avatar" style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0d9488 100%)' }}>
              AL
            </div>
            <div className="contact-info">
              <div className="contact-name-row">
                <span className="status-indicator status-online" />
                <span className="contact-name">Alex</span>
              </div>
              <p className="contact-sub">E2E Session Active</p>
            </div>
          </button>

          {/* Group Session */}
          <button
            onClick={() => { setSelectedChat({ id: 'group_city', name: 'City Safe Haven Group', isGroup: true }); setShowAlbum(false); }}
            className={`contact-btn ${selectedChat?.id === 'group_city' ? 'contact-btn-active' : ''}`}
          >
            <div className="contact-avatar" style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}>
              GP
            </div>
            <div className="contact-info">
              <div className="contact-name-row">
                <span className="status-indicator status-online animate-pulse" />
                <span className="contact-name">City Safe Haven</span>
              </div>
              <p className="contact-sub">Rotating keys active</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Conversation Space */}
      <div className={`chat-main ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Active Chat Header */}
        <div className="chat-header glass-panel">
          <div className="chat-header-user">
            <button 
              onClick={() => setSelectedChat(null)}
              className="chat-header-back-btn"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            
            <div>
              <h3 className="chat-header-name">
                {selectedChat?.name}
                <span className="metadata-badge badge-success" style={{ fontSize: '0.55rem' }}>
                  <Lock style={{ width: '0.6rem', height: '0.6rem' }} /> E2EE
                </span>
              </h3>
              <p className="chat-header-fingerprint">
                {selectedChat?.isGroup 
                  ? 'Key Ring ID: GRP-KID-105 · Rotates dynamically' 
                  : `Peer Key fingerprint: ${getKeysForPartner(selectedChat?.id).publicKey.slice(9, 23)}...`}
              </p>
            </div>
          </div>

          <div className="chat-header-actions">
            {!selectedChat?.isGroup && (
              <button
                onClick={() => setShowAlbum(!showAlbum)}
                className={`chat-header-action-btn ${showAlbum ? 'chat-header-action-btn-active' : ''}`}
              >
                <Image className="h-3.5 w-3.5" />
                {showAlbum ? 'View Messages' : 'Private Album'}
              </button>
            )}
            
            <button
              onClick={() => setShowWireInspector(!showWireInspector)}
              className={`chat-header-action-btn ${showWireInspector ? 'chat-header-action-btn-active' : ''}`}
            >
              <Info className="h-3.5 w-3.5" />
              Wire View
            </button>
          </div>
        </div>

        {/* Inner Grid splits into Chat Room and Wire Debugger side-by-side */}
        <div className={`chat-grid ${showWireInspector ? 'chat-grid-split' : ''}`}>
          
          {/* Left Panel: Chats Thread or Album photos list */}
          <div className="chat-pane glass-panel">
            {!showAlbum ? (
              // --- Chat Pane View ---
              <>
                <div className="chat-messages-container custom-scrollbar">
                  {activeMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`message-wrapper ${
                        msg.sender === 'me' ? 'message-wrapper-sent' : 'message-wrapper-received'
                      }`}
                    >
                      <div className={`chat-bubble ${msg.sender === 'me' ? 'bubble-sent' : 'bubble-received'}`}>
                        {msg.text}
                      </div>
                      
                      <div className="chat-bubble-footer">
                        <span className="chat-bubble-time">{msg.timestamp}</span>
                        {msg.expiresAt && (
                          <span className="chat-bubble-destruct">
                            <Clock style={{ width: '0.6rem', height: '0.6rem' }} /> Expiring
                          </span>
                        )}
                        {msg.isE2EE && (
                          <span className="chat-bubble-security">
                            <Lock style={{ width: '0.6rem', height: '0.6rem' }} /> Secure E2E
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input triggers */}
                <form onSubmit={handleSendMessage} className="chat-input-form">
                  
                  {/* Self destruct timer options */}
                  <div className="destruct-timing-bar">
                    <span className="destruct-timing-label">
                      <Clock style={{ width: '0.7rem', height: '0.7rem', color: 'var(--color-rose)' }} /> Ephemeral Timer:
                    </span>
                    {[
                      { val: 0, label: 'Off' },
                      { val: 10, label: '10s' },
                      { val: 60, label: '1m' },
                      { val: 3600, label: '1h' }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setSelfDestructSeconds(opt.val)}
                        className={`destruct-timing-btn ${selfDestructSeconds === opt.val ? 'destruct-timing-btn-active' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="chat-input-row">
                    <label className="chat-media-btn" title="Upload Secure Photo">
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png" 
                        onChange={handleFileChange}
                        style={{ display: 'none' }} 
                      />
                      <Camera className="h-4.5 w-4.5" />
                    </label>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={selectedChat?.isGroup ? "Send secure broadcast to group..." : "Write end-to-end encrypted message..."}
                      className="chat-input-field"
                    />
                    
                    <button type="submit" className="chat-send-btn">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              // --- Album Photos View ---
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div className="album-header">
                  <div>
                    <h4 className="album-title">Private Ephemeral Album</h4>
                    <p className="album-desc">Blurs instantly when browser viewport loses focus to prevent screenshots.</p>
                  </div>
                  
                  <button 
                    onClick={() => setForceShield(!forceShield)}
                    className="chat-header-action-btn"
                    style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}
                  >
                    {forceShield ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {forceShield ? 'Unlock Shield' : 'Test Blur Shield'}
                  </button>
                </div>

                <div className="album-viewport custom-scrollbar">
                  
                  {/* Defocus Security Cover */}
                  {isShieldActive && (
                    <div className="album-shield-cover">
                      <ShieldAlert className="h-8 w-8 text-[#f43f5e] mb-1.5 animate-pulse" />
                      <h5 className="shield-cover-title">SCREEN SHIELD ACTIVE</h5>
                      <p className="shield-cover-desc">
                        Secure album is hidden because application focus was lost. Return focus to view.
                      </p>
                    </div>
                  )}

                  {/* Album Grid list */}
                  <div className={`album-grid ${isShieldActive ? 'album-blur-effect' : ''}`}>
                    {albumPhotos.map((photo) => (
                      <div 
                        key={photo.id} 
                        className="album-photo-card"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {photo.viewed ? (
                          <div className="album-photo-placeholder" style={{ color: 'var(--text-muted)' }}>
                            <Trash2 className="h-7 w-7 text-rose-500/20" />
                            <span style={{ fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase' }}>Expired</span>
                          </div>
                        ) : photo.timeRemaining !== null ? (
                          <div style={{ position: 'relative', height: '9rem', overflow: 'hidden', borderRadius: '6px' }}>
                            {renderAlbumSVG(photo.title, photo.id)}
                            <div className="album-photo-timer-overlay">
                              {photo.timeRemaining}s Left
                            </div>
                          </div>
                        ) : (
                          <div className="album-photo-placeholder">
                            <Lock className="h-5 w-5 text-[#06b6d4] animate-pulse" />
                            <button
                              onClick={() => handleViewImage(photo.id)}
                              className="btn btn-secure"
                              style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}
                            >
                              Unlock Ephemeral ({photo.totalTime}s)
                            </button>
                          </div>
                        )}

                        <div className="album-photo-info">
                          <span className="album-photo-title">{photo.title}</span>
                          <span className="album-photo-sender">{photo.sender === 'me' ? 'me' : 'partner'}</span>
                        </div>

                        {photo.strippedSize && (
                          <div className="album-stripped-note">
                            <span>EXIF: Stripped</span>
                            <span>Scrubbed {Math.round(photo.bytesRemoved/1024)}KB</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Wire Inspector / EXIF Tool */}
          {showWireInspector && (
            <div className="wire-inspector glass-panel">
              
              {/* E2EE packet log */}
              <div className="wire-header">
                <Shield className="h-4.5 w-4.5 text-[#06b6d4]" />
                <h4 className="wire-title">E2EE Wire Inspector</h4>
              </div>
              
              {lastTransmittedPacket ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Transmission:</span>
                    <span className="metadata-badge badge-success">{lastTransmittedPacket.header.algorithm}</span>
                  </div>
                  
                  <pre className="wire-packet-box">
                    {JSON.stringify(lastTransmittedPacket, null, 2)}
                  </pre>
                  
                  <div className="warning-banner" style={{ background: 'rgba(16,185,129,0.03)', borderColor: 'rgba(16,185,129,0.1)', padding: '0.5rem', marginBottom: 0 }}>
                    <p className="warning-banner-text" style={{ fontSize: '0.6rem' }}>
                      The network router only sees this fuzzed ciphertext structure. Private key keys are never broadcast.
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                  Send a message to view the E2EE network packet.
                </p>
              )}

              {/* JPEG metadata Inspector */}
              {fileAnalysis && (
                <div className="exif-panel" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div className="wire-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <Camera className="h-4.5 w-4.5 text-[#f43f5e]" />
                    <h4 className="wire-title" style={{ color: 'var(--color-rose)' }}>EXIF Metadata Inspector</h4>
                  </div>

                  <div className="exif-meta-fields">
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">File name:</span>
                      <span className="exif-meta-value" style={{ fontWeight: '700' }}>{fileAnalysis.filename.slice(0, 15)}...</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Camera:</span>
                      <span className="exif-meta-value">{fileAnalysis.exif.cameraBrand} {fileAnalysis.exif.cameraModel}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Timestamp:</span>
                      <span className="exif-meta-value">{fileAnalysis.exif.captureTime.split(',')[0]}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">GPS Lat:</span>
                      <span className="exif-meta-value-warning">{fileAnalysis.exif.gpsLatitude}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">GPS Lng:</span>
                      <span className="exif-meta-value-warning">{fileAnalysis.exif.gpsLongitude}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Coordinates:</span>
                      <span className="exif-meta-value">{fileAnalysis.exif.locationEst}</span>
                    </div>
                  </div>

                  <div className="warning-banner" style={{ padding: '0.4rem', margin: 0 }}>
                    <p className="warning-banner-text" style={{ fontSize: '0.55rem', lineHeight: '1.3' }}>
                      ⚠️ **Risk Profile**: Image contains EXIF GPS tags. Sending this raw exposes your precise home coordinates.
                    </p>
                  </div>

                  <div className="exif-compress-bar">
                    <div className="exif-compress-label">
                      <span>Image Quality:</span>
                      <span style={{ color: 'var(--color-cyan)' }}>{compressionQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={compressionQuality}
                      onChange={(e) => setCompressionQuality(Number(e.target.value))}
                      className="custom-range"
                    />
                  </div>

                  <button
                    onClick={handleStripAndSendImage}
                    disabled={isStripping}
                    className="btn btn-secure"
                    style={{ width: '100%', fontSize: '0.7rem' }}
                  >
                    {isStripping ? 'Scrubbing APP1 segments...' : 'Strip EXIF & Send Secure'}
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
