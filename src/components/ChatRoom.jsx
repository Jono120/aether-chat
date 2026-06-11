import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Shield, Lock, Trash2, ShieldAlert,
  Image, ArrowLeft, Clock, Camera, MoreVertical,
} from 'lucide-react';
import { 
  encryptMessage, decryptMessage, 
  encryptGroupMessage,
  generateGroupKey,
  resolvePeerPublicJwk,
} from '../utils/crypto';
import { inspectImageMetadata, stripImageMetadata } from '../utils/exif';
import {
  blockUser,
  ensureConversation,
  fetchMessages,
  fetchPublicKeys,
  isApiEnabled,
  markConversationRead,
  reportUser,
  requestUploadSas,
  sendMessage,
  unblockUser,
} from '../api/client';
import { useToast } from '../context/ToastContext';
import { loadSession } from '../utils/authStorage';
import {
  blockUserLocal,
  isBlockedLocal,
  unblockUserLocal,
} from '../utils/blockStorage';
import { devPeerKeysFor, resolvePeerApiId } from '../utils/devPeerKeys';
import { useTranslation } from '../i18n/index.js';
import { isWebBrowser } from '../utils/platform';
import WebAlbumBlockedBanner from './WebAlbumBlockedBanner';
import { useRealtimeMessages } from '../hooks/useRealtimeMessages';
import { useAlbumScreenshotGuard } from '../hooks/useAlbumScreenshotGuard';
import useAppForeground from '../hooks/useAppForeground';
import {
  loadStoredConversations,
  saveStoredConversations,
  SEED_CONVERSATIONS,
} from '../utils/chatConversationsStorage';
import {
  isOutgoingReadByPeer,
  markChatIncomingRead,
  markOutgoingReadByPeer,
} from '../utils/readReceiptStorage';

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
  startWithAlbum = false,
  albumScreenshotShield = true,
  myProfile = null,
  defaultSelfDestructSeconds = 0,
  readReceiptsEnabled = false,
}) {
  const { toast, confirm } = useToast();
  const { t } = useTranslation();
  const webBlocked = isWebBrowser();
  const albumEnabled =
    myProfile?.hasSecureAlbum !== false && myProfile?.allowAlbumMediaUpload !== false;
  const albumUiEnabled = albumEnabled && !webBlocked;
  // Navigation / View states
  const [selectedChat, setSelectedChat] = useState(null);
  const [showAlbum, setShowAlbum] = useState(false);
  const [showWebAlbumBanner, setShowWebAlbumBanner] = useState(false);
  const [showWireInspector] = useState(false);

  // Message and timing states
  const [inputText, setInputText] = useState('');
  const [selfDestructSeconds, setSelfDestructSeconds] = useState(defaultSelfDestructSeconds);
  // Re-sync to the latest default when the prop changes (adjust state during
  // render — React's recommended alternative to a setState-in-effect).
  const [prevDefaultSelfDestruct, setPrevDefaultSelfDestruct] = useState(defaultSelfDestructSeconds);
  if (prevDefaultSelfDestruct !== defaultSelfDestructSeconds) {
    setPrevDefaultSelfDestruct(defaultSelfDestructSeconds);
    setSelfDestructSeconds(defaultSelfDestructSeconds);
  }
  const [lastTransmittedPacket, setLastTransmittedPacket] = useState(null);

  // EXIF Inspector states
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileAnalysis, setFileAnalysis] = useState(null);
  const [compressionQuality, setCompressionQuality] = useState(90);
  const [isStripping, setIsStripping] = useState(false);

  // Screen shield defocus simulator state
  const [shieldReason, setShieldReason] = useState(null);

  const handleCaptureAttempt = useCallback(() => {
    setShieldReason('screenshot');
    toast(t('albumScreenshotWarning'), { type: 'warning' });
  }, [toast]);

  const { forceShield, resetForceShield } = useAlbumScreenshotGuard({
    enabled: albumScreenshotShield,
    active: showAlbum,
    onCaptureAttempt: handleCaptureAttempt,
  });

  const handleForeground = useCallback(() => {
    resetForceShield();
    setShieldReason(null);
  }, [resetForceShield]);

  const handleBackground = useCallback(() => {
    if (showAlbum && albumScreenshotShield) {
      setShieldReason('defocus');
    }
  }, [showAlbum, albumScreenshotShield]);

  const isWindowFocused = useAppForeground({
    onForeground: handleForeground,
    onBackground: handleBackground,
  });
  const [groupKey, setGroupKey] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [peerKeyCache, setPeerKeyCache] = useState({});
  const [sendError, setSendError] = useState(null);
  const [receiptTick, setReceiptTick] = useState(0);
  const [serverReadIds, setServerReadIds] = useState({});
  const [peerBlocked, setPeerBlocked] = useState(false);
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  const cachePeerKeys = (peerId, keys) => {
    setPeerKeyCache((prev) => ({ ...prev, [peerId]: keys }));
    return keys;
  };

  useEffect(() => {
    generateGroupKey('group_city').then(setGroupKey);
  }, []);

  const [conversations, setConversations] = useState(() =>
    loadStoredConversations(SEED_CONVERSATIONS),
  );

  useEffect(() => {
    saveStoredConversations(conversations);
  }, [conversations]);

  // Secure Album Photos Database
  const [albumPhotos, setAlbumPhotos] = useState([
    { id: 'p1', sender: 'julian', url: 'svg-mock-1', title: 'Sunset Silhouette', timeRemaining: null, totalTime: 10, viewed: false },
    { id: 'p2', sender: 'me', url: 'svg-mock-2', title: 'Coffee Art (EXIF Stripped)', timeRemaining: null, totalTime: 30, viewed: false }
  ]);

  const messagesEndRef = useRef(null);
  const selectedChatIdRef = useRef(null);

  const loadPeerKeys = async (peerId) => {
    const apiPeerId = resolvePeerApiId(peerId);
    if (isApiEnabled()) {
      try {
        const keys = await fetchPublicKeys(apiPeerId);
        if (resolvePeerPublicJwk(keys)) {
          return cachePeerKeys(peerId, keys);
        }
      } catch (err) {
        console.warn('fetchPublicKeys failed', err);
      }
    }
    const devKeys = devPeerKeysFor(peerId) || devPeerKeysFor(apiPeerId);
    if (devKeys.length) return cachePeerKeys(peerId, devKeys);
    return [];
  };

  const selectDirectChat = async (id, name) => {
    setSelectedChat({ id, name, isGroup: false });
    setShowAlbum(false);
    setSendError(null);
    setSafetyMenuOpen(false);
    setReportOpen(false);
    const apiPeer = resolvePeerApiId(id);
    setPeerBlocked(isBlockedLocal(apiPeer) || isBlockedLocal(id));
    if (isApiEnabled()) {
      const convId = await ensureConversation(apiPeer);
      setConversationId(convId);
      await loadPeerKeys(id);
    }
  };

  const appendIncomingMessage = async (envelope, chatKey) => {
    const devUserId = import.meta.env.VITE_DEV_USER_ID ?? 'dev-user-1';
    if (envelope.senderEntraOid === devUserId) return;

    const peerKeys = peerKeyCache[chatKey] ?? (await loadPeerKeys(chatKey));
    const senderJwk = resolvePeerPublicJwk(peerKeys);
    if (!senderJwk) return;

    const text = await decryptMessage(
      envelope,
      currentUser.keys.privateKeyJwk,
      senderJwk,
    );
    const timestamp = new Date(envelope.sentAt ?? Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setConversations((prev) => ({
      ...prev,
      [chatKey]: [
        ...(prev[chatKey] ?? []),
        {
          id: envelope.id ?? Date.now(),
          sender: chatKey,
          text,
          timestamp,
          isE2EE: true,
          expiresAt: envelope.expiresAt,
        },
      ],
    }));
  };

  useEffect(() => {
    selectedChatIdRef.current = selectedChat?.id ?? null;
  }, [selectedChat?.id]);

  const activeMessages = selectedChat ? conversations[selectedChat.id] || [] : [];

  useEffect(() => {
    if (!readReceiptsEnabled || !selectedChat?.id || selectedChat.isGroup) return undefined;

    const chatId = selectedChat.id;
    const msgs = conversations[chatId] ?? [];
    const incomingIds = msgs.filter((m) => m.sender !== 'me').map((m) => m.id);
    if (incomingIds.length) {
      markChatIncomingRead(chatId, incomingIds);
    }

    if (isApiEnabled() && conversationId) {
      const apiIncoming = incomingIds.filter((id) => typeof id === 'string' && id.includes('-'));
      if (apiIncoming.length) {
        markConversationRead(conversationId, apiIncoming).catch((err) =>
          console.warn('markConversationRead failed', err),
        );
      }
    }

    if (isApiEnabled()) {
      // Receipts live in an external mutable store; bump the tick to reflect the
      // just-marked read state. Intentional force-render (no React state to sync).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReceiptTick((t) => t + 1);
      return undefined;
    }

    const timers = msgs
      .filter((m) => m.sender === 'me')
      .map((m, index) =>
        window.setTimeout(() => {
          markOutgoingReadByPeer(chatId, m.id);
          setReceiptTick((t) => t + 1);
        }, 1200 + index * 500),
      );

    setReceiptTick((t) => t + 1);
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [
    readReceiptsEnabled,
    selectedChat?.id,
    selectedChat?.isGroup,
    activeMessages.length,
    conversationId,
  ]);

  useEffect(() => {
    if (!readReceiptsEnabled || !isApiEnabled() || !conversationId || selectedChat?.isGroup) {
      return undefined;
    }

    const myOid = loadSession()?.user?.id;
    const syncReceipts = async () => {
      try {
        const messages = await fetchMessages(conversationId);
        const readMap = {};
        for (const msg of messages) {
          if (msg.sender_entra_oid === myOid && msg.readBy?.length) {
            readMap[msg.id] = true;
            markOutgoingReadByPeer(selectedChat.id, msg.id);
          }
        }
        setServerReadIds((prev) => ({ ...prev, ...readMap }));
        setReceiptTick((t) => t + 1);

        const incomingIds = messages
          .filter((m) => m.sender_entra_oid !== myOid)
          .map((m) => m.id);
        if (incomingIds.length) {
          await markConversationRead(conversationId, incomingIds);
        }
      } catch (err) {
        console.warn('Receipt sync failed', err);
      }
    };

    syncReceipts();
    const timer = window.setInterval(syncReceipts, 4000);
    return () => window.clearInterval(timer);
  }, [readReceiptsEnabled, conversationId, selectedChat?.id, selectedChat?.isGroup]);

  useRealtimeMessages(conversationId, (envelope) => {
    const chatKey = selectedChatIdRef.current;
    if (!chatKey || selectedChat?.isGroup) return;
    appendIncomingMessage(envelope, chatKey);
  });

  // Select defaults or link profile from discovery grid
  useEffect(() => {
    const setupChat = async () => {
      if (activeChatProfile) {
        const isGroup = activeChatProfile.id === 'group_city';
        setSelectedChat({
          id: activeChatProfile.id,
          name: activeChatProfile.username || activeChatProfile.name,
          publicKey: activeChatProfile.publicKey,
          isGroup: isGroup,
        });
        if (!isGroup) {
          if (isApiEnabled()) {
            const convId = await ensureConversation(resolvePeerApiId(activeChatProfile.id));
            setConversationId(convId);
          }
          await loadPeerKeys(activeChatProfile.id);
        }
        if (startWithAlbum) {
          if (webBlocked) {
            setShowWebAlbumBanner(true);
            setShowAlbum(false);
          } else {
            setShowAlbum(true);
          }
        }
      } else {
        await selectDirectChat('julian', 'Julian');
      }
    };
    setupChat();
  }, [activeChatProfile, startWithAlbum, webBlocked]);

  // Clear the shield reason when the album closes (adjust state during render).
  const [prevShowAlbum, setPrevShowAlbum] = useState(showAlbum);
  if (prevShowAlbum !== showAlbum) {
    setPrevShowAlbum(showAlbum);
    if (!showAlbum) setShieldReason(null);
  }

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

  const peerApiId = selectedChat ? resolvePeerApiId(selectedChat.id) : null;

  const handleToggleBlock = async () => {
    if (!selectedChat || selectedChat.isGroup) return;
    const peerId = peerApiId ?? selectedChat.id;
    if (peerBlocked) {
      const approved = await confirm(t('chatUnblockConfirm'), {
        confirmLabel: t('chatUnblockConfirmBtn'),
      });
      if (!approved) return;
      if (isApiEnabled()) {
        try {
          await unblockUser(peerId);
        } catch (err) {
          toast(err?.message ?? t('authFailed'), { type: 'error' });
          return;
        }
      }
      unblockUserLocal(peerId);
      unblockUserLocal(selectedChat.id);
      setPeerBlocked(false);
      toast(t('chatUnblockConfirmBtn'), { type: 'success' });
    } else {
      const approved = await confirm(t('chatBlockConfirm'), {
        confirmLabel: t('chatBlockConfirmBtn'),
      });
      if (!approved) return;
      if (isApiEnabled()) {
        try {
          await blockUser(peerId);
        } catch (err) {
          toast(err?.message ?? t('authFailed'), { type: 'error' });
          return;
        }
      }
      blockUserLocal(peerId);
      blockUserLocal(selectedChat.id);
      setPeerBlocked(true);
      toast(t('chatBlockConfirmBtn'), { type: 'info' });
    }
    setSafetyMenuOpen(false);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedChat || selectedChat.isGroup) return;
    const peerId = peerApiId ?? selectedChat.id;
    try {
      if (isApiEnabled()) {
        await reportUser(peerId, {
          reason: reportReason.trim(),
          details: reportDetails.trim(),
          conversationId,
        });
      }
      toast(t('chatReportSuccess'), { type: 'success' });
      setReportOpen(false);
      setReportReason('');
      setReportDetails('');
      setSafetyMenuOpen(false);
    } catch (err) {
      toast(err?.message ?? t('authFailed'), { type: 'error' });
    }
  };

  const isOutgoingRead = (msgId) =>
    Boolean(serverReadIds[msgId] || isOutgoingReadByPeer(selectedChat?.id, msgId));

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedChat) return;
    if (selectedChat.isGroup && !groupKey) return;
    if (!selectedChat.isGroup && peerBlocked) {
      setSendError(t('chatBlockedSend'));
      return;
    }
    setSendError(null);

    // Event handler (not render): reading the clock here is intentional and safe.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const chatKey = selectedChat.id;
    const expiresAt =
      selfDestructSeconds > 0
        ? new Date(now + selfDestructSeconds * 1000).toISOString()
        : null;

    let newMsg = {
      id: now,
      sender: 'me',
      text: inputText,
      timestamp,
      isE2EE: !selectedChat.isGroup,
      isGroup: selectedChat.isGroup,
      expiresAt,
      totalDuration: selfDestructSeconds > 0 ? selfDestructSeconds : undefined,
    };

    if (selectedChat.isGroup) {
      const packet = await encryptGroupMessage(inputText, groupKey);
      newMsg.keyId = groupKey.keyId;
      newMsg.keyVersion = groupKey.version;
      setLastTransmittedPacket({
        header: {
          version: 'Aether-Group-E2EE-2.0',
          timestamp: new Date().toISOString(),
          algorithm: 'AES-256-GCM',
        },
        payload: packet,
      });
    } else {
      const peerKeys = peerKeyCache[chatKey] ?? (await loadPeerKeys(chatKey));
      const peerJwk = resolvePeerPublicJwk(peerKeys);
      if (!peerJwk) {
        setSendError(t('sendNoPeerKey'));
        return;
      }

      const packet = await encryptMessage(
        inputText,
        currentUser.keys.privateKeyJwk,
        peerJwk,
      );
      setLastTransmittedPacket({
        header: {
          version: 'Aether-Direct-E2EE-2.0',
          timestamp: new Date().toISOString(),
          algorithm: 'ECDH-X25519-AES-256-GCM',
        },
        payload: packet,
      });

      if (isApiEnabled() && conversationId) {
        try {
          await sendMessage(conversationId, {
            ...packet,
            keyId: currentUser.keys.deviceId,
            expiresAt,
          });
        } catch (err) {
          console.warn('Send to API failed', err);
        }
      } else if (!isApiEnabled()) {
        setTimeout(() => simulatePartnerResponse(chatKey), 2500);
      }
    }

    setConversations((prev) => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] ?? []), newMsg],
    }));
    if (readReceiptsEnabled && !selectedChat.isGroup) {
      window.setTimeout(() => {
        markOutgoingReadByPeer(chatKey, newMsg.id);
        setReceiptTick((t) => t + 1);
      }, 2200);
    }
    setInputText('');
  };

  const simulatePartnerResponse = async (chatKey) => {
    const text =
      t('simulateResponses', { returnObjects: true })[Math.floor(Math.random() * t('simulateResponses', { returnObjects: true }).length)];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setConversations((prev) => ({
      ...prev,
      [chatKey]: [
        ...(prev[chatKey] ?? []),
        { id: Date.now() + 1, sender: chatKey, text, timestamp, isE2EE: true },
      ],
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
      
      if (isApiEnabled()) {
        try {
          const sas = await requestUploadSas(selectedFile.type || 'image/jpeg', 'album');
          if (sas?.uploadUrl && stripResult.blob) {
            await fetch(sas.uploadUrl, {
              method: 'PUT',
              headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': selectedFile.type },
              body: stripResult.blob,
            });
          }
        } catch (err) {
          console.warn('Album upload failed', err);
        }
      }

      const packetText = `[SECURE ALBUM ATTACHMENT ID ${newPhotoId}. EXIF stripped. Quality: ${compressionQuality}%]`;
      const peerKeys = peerKeyCache[chatKey] ?? [];
      const peerJwk = resolvePeerPublicJwk(peerKeys);
      const packet = peerJwk
        ? await encryptMessage(packetText, currentUser.keys.privateKeyJwk, peerJwk)
        : null;
      
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
            text: t('photoShared'),
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

  const isShieldActive =
    showAlbum && albumScreenshotShield && (!isWindowFocused || forceShield);

  const shieldCoverDesc =
    shieldReason === 'screenshot' || forceShield
      ? t('albumShieldDescScreenshot')
      : !isWindowFocused
        ? t('albumShieldDescDefocus')
        : t('albumShieldDesc');

  return (
    <div className="chat-layout">
      
      {/* Sidebar - Contacts List */}
      <div className={`chat-sidebar glass-panel ${selectedChat ? 'chat-sidebar--hidden' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">Active Contacts</h3>
          <p className="sidebar-desc">{t('chatSidebarDesc')}</p>
        </div>
        
        <div className="contact-list custom-scrollbar">
          {/* Contact 1 */}
          <button
            onClick={() => selectDirectChat('julian', 'Julian')}
            className={`contact-btn ${selectedChat?.id === 'julian' ? 'contact-btn-active' : ''}`}
          >
            <div className="contact-avatar contact-avatar--violet">
              JU
            </div>
            <div className="contact-info">
              <div className="contact-name-row">
                <span className="status-indicator status-online" />
                <span className="contact-name">Julian</span>
              </div>
            </div>
          </button>

          {/* Contact 2 */}
          <button
            onClick={() => selectDirectChat('alex', 'Alex')}
            className={`contact-btn ${selectedChat?.id === 'alex' ? 'contact-btn-active' : ''}`}
          >
            <div className="contact-avatar contact-avatar--cyan">
              AL
            </div>
            <div className="contact-info">
              <div className="contact-name-row">
                <span className="status-indicator status-online" />
                <span className="contact-name">Alex</span>
              </div>
            </div>
          </button>

          {/* Group Session */}
          <button
            onClick={() => { setSelectedChat({ id: 'group_city', name: 'City Safe Haven Group', isGroup: true }); setShowAlbum(false); }}
            className={`contact-btn ${selectedChat?.id === 'group_city' ? 'contact-btn-active' : ''}`}
          >
            <div className="contact-avatar contact-avatar--emerald">
              GP
            </div>
            <div className="contact-info">
              <div className="contact-name-row">
                <span className="status-indicator status-online u-animate-pulse" />
                <span className="contact-name">City Safe Haven</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Conversation Space */}
      <div className={`chat-main ${!selectedChat ? 'chat-main--hidden' : ''}`}>
        
        {/* Active Chat Header */}
        <div className="chat-header glass-panel">
          <div className="chat-header-user">
            <button 
              onClick={() => setSelectedChat(null)}
              className="chat-header-back-btn"
            >
              <ArrowLeft className="icon-md" />
            </button>
            
            <div>
              <h3 className="chat-header-name">
                {selectedChat?.name}
                <span className="metadata-badge badge-success metadata-badge--xs">
                  <Lock className="icon-xs" /> {t('chatEncryptedBadge')}
                </span>
              </h3>
              <p className="chat-header-fingerprint">
                {selectedChat?.isGroup ? t('chatGroupSubtitle') : t('chatDirectSubtitle')}
              </p>
            </div>
          </div>

          <div className="chat-header-actions">
            {!selectedChat?.isGroup && albumUiEnabled && (
              <button
                onClick={() => setShowAlbum(!showAlbum)}
                className={`chat-header-action-btn ${showAlbum ? 'chat-header-action-btn-active' : ''}`}
              >
                <Image className="icon-sm" />
                {showAlbum ? 'View Messages' : 'Private Album'}
              </button>
            )}
            {!selectedChat?.isGroup && (
              <div className="chat-safety-menu-wrap">
                <button
                  type="button"
                  className="chat-header-action-btn chat-header-action-btn--icon"
                  aria-expanded={safetyMenuOpen}
                  aria-label={t('chatBlockUser')}
                  onClick={() => setSafetyMenuOpen((o) => !o)}
                >
                  <MoreVertical className="icon-sm" />
                </button>
                {safetyMenuOpen && (
                  <div className="chat-safety-menu glass-panel">
                    <button
                      type="button"
                      className="chat-safety-menu-item"
                      onClick={handleToggleBlock}
                    >
                      {peerBlocked ? t('chatUnblockUser') : t('chatBlockUser')}
                    </button>
                    <button
                      type="button"
                      className="chat-safety-menu-item chat-safety-menu-item--report"
                      onClick={() => {
                        setReportOpen(true);
                        setSafetyMenuOpen(false);
                      }}
                    >
                      {t('chatReportUser')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inner Grid splits into Chat Room and Wire Debugger side-by-side */}
        <div className={`chat-grid ${showWireInspector ? 'chat-grid-split' : ''}`}>
          
          {/* Left Panel: Chats Thread or Album photos list */}
          <div className="chat-pane glass-panel">
            {!showAlbum ? (
              // --- Chat Pane View ---
              <>
                {showWebAlbumBanner && <WebAlbumBlockedBanner compact />}
                <div className="chat-messages-container custom-scrollbar">
                  {activeMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`message-wrapper message-enter ${
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
                            <Clock className="icon-xs" /> Expiring {msg.expiresAt.split('T')[1].split('.')[0]}
                          </span>
                        )}
                        {msg.isE2EE && (
                          <span className="chat-bubble-security">
                            <Lock className="icon-xs" />
                          </span>
                        )}
                        {readReceiptsEnabled &&
                          msg.sender === 'me' &&
                          !selectedChat?.isGroup && (
                            <span
                              className={`chat-receipt-status ${
                                isOutgoingRead(msg.id) ? 'chat-receipt-status--read' : ''
                              }`}
                            >
                              {receiptTick >= 0 &&
                                (isOutgoingRead(msg.id)
                                  ? t('chatReceiptRead')
                                  : t('chatReceiptDelivered'))}
                            </span>
                          )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {peerBlocked && !selectedChat?.isGroup && (
                  <p className="warning-banner-text chat-inline-warning">{t('chatBlockedBanner')}</p>
                )}

                {sendError && (
                  <p className="warning-banner-text chat-inline-warning">
                    {sendError}
                  </p>
                )}

                {reportOpen && !selectedChat?.isGroup && (
                  <form className="chat-report-form glass-panel" onSubmit={handleSubmitReport}>
                    <h4 className="settings-info-box-title">{t('chatReportTitle')}</h4>
                    <label className="profile-field">
                      <span className="profile-field-label">{t('chatReportReason')}</span>
                      <input
                        className="profile-input"
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        required
                      />
                    </label>
                    <label className="profile-field">
                      <span className="profile-field-label">{t('chatReportDetails')}</span>
                      <textarea
                        className="profile-input profile-textarea"
                        rows={2}
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                      />
                    </label>
                    <div className="chat-report-form-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReportOpen(false)}>
                        {t('cancel')}
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm">
                        {t('chatReportSubmit')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Message input triggers */}
                <form onSubmit={handleSendMessage} className="chat-input-form">
                  
                  {/* Media Timer options */}
                  <div className="destruct-timing-bar">
                    <span className="destruct-timing-label">
                      <Clock className="icon-sm destruct-label-icon" />Media Timer:
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
                    {!webBlocked && (
                      <label className="chat-media-btn" title="Upload Photo">
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleFileChange}
                          className="file-input-hidden"
                        />
                        <Camera className="icon-md" />
                      </label>
                    )}

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={selectedChat?.isGroup ? "Send message to group..." : "Write message..."}
                      className="chat-input-field"
                    />
                    
                    <button type="submit" className="chat-send-btn">
                      <Send className="icon-md" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              // --- Album Photos View ---
              <div className="album-panel">
                <div className="album-header">
                  <div>
                    <h4 className="album-title">Private Album</h4>
                    <p className="album-desc">
                      {albumScreenshotShield
                        ? t('albumShieldDesc')
                        : t('settingsAlbumShieldDesc')}
                    </p>
                  </div>
                  {albumScreenshotShield && (
                    <span className="metadata-badge badge-warning badge-sm album-shield-badge">
                      <ShieldAlert className="icon-xs" />
                      {t('albumProtectionOn')}
                    </span>
                  )}
                </div>

                <div
                  className="album-viewport custom-scrollbar"
                  onDragStart={(e) => e.preventDefault()}
                >
                  {isShieldActive && (
                    <div className="album-shield-cover" role="status" aria-live="polite">
                      <ShieldAlert className="icon-xl text-rose u-animate-pulse" />
                      <h5 className="shield-cover-title">{t('albumShieldTitle')}</h5>
                      <p className="shield-cover-desc">{shieldCoverDesc}</p>
                    </div>
                  )}

                  <div
                    className={`album-grid ${isShieldActive ? 'album-blur-effect' : ''}`}
                    aria-hidden={isShieldActive}
                  >
                    {albumPhotos.map((photo) => (
                      <div 
                        key={photo.id} 
                        className="album-photo-card"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {photo.viewed ? (
                          <div className="album-photo-placeholder text-muted">
                            <Trash2 className="icon-lg icon-muted-faint" />
                            <span className="album-expired-label">Expired</span>
                          </div>
                        ) : photo.timeRemaining !== null ? (
                          <div className="album-photo-view">
                            {renderAlbumSVG(photo.title, photo.id)}
                            <div className="album-photo-timer-overlay">
                              {photo.timeRemaining}s Left
                            </div>
                          </div>
                        ) : (
                          <div className="album-photo-placeholder">
                            <Lock className="icon-md text-cyan u-animate-pulse" />
                            <button
                              onClick={() => handleViewImage(photo.id)}
                              className="btn btn-secure btn-sm"
                            >
                              Unlock ({photo.totalTime}s)
                            </button>
                          </div>
                        )}

                        <div className="album-photo-info">
                          <span className="album-photo-title">{photo.title}</span>
                          <span className="album-photo-sender">{photo.sender === 'me' ? 'me' : 'partner'}</span>
                        </div>

                        {photo.strippedSize && (
                          <div className="album-stripped-note">
                            <span>Metadata Stripped</span>
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

          {/* Right Panel: Wire Inspector / Metadata Tool */}
          {showWireInspector && (
            <div className="wire-inspector glass-panel">
              
              {/* E2EE packet log */}
              <div className="wire-header">
                <Shield className="icon-md text-cyan" />
                <h4 className="wire-title">{t('wireInspectorTitle')}</h4>
              </div>
              
              {lastTransmittedPacket ? (
                <div className="wire-stack">
                  <div className="wire-meta-row">
                    <span className="wire-meta-label">Transmission:</span>
                    <span className="metadata-badge badge-success">{lastTransmittedPacket.header.algorithm}</span>
                  </div>
                  
                  <pre className="wire-packet-box">
                    {JSON.stringify(lastTransmittedPacket, null, 2)}
                  </pre>
                  
                  <div className="warning-banner warning-banner--success">
                    <p className="warning-banner-text">{t('wireInspectorNote')}</p>
                  </div>
                </div>
              ) : (
                <p className="wire-empty">{t('wireInspectorEmpty')}</p>
              )}

              {/* Media Metadata Inspector */}
              {fileAnalysis && (
                <div className="exif-panel exif-panel--bordered">
                  <div className="wire-header wire-header--flat">
                    <Camera className="icon-md text-rose" />
                    <h4 className="wire-title wire-title--rose">{t('photoInspectorTitle')}</h4>
                  </div>

                  <div className="exif-meta-fields">
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Name:</span>
                      <span className="exif-meta-value" style={{ fontWeight: 700 }}>{fileAnalysis.filename.slice(0, 15)}...</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Device:</span>
                      <span className="exif-meta-value">{fileAnalysis.exif.cameraBrand} {fileAnalysis.exif.cameraModel}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Date:</span>
                      <span className="exif-meta-value">{fileAnalysis.exif.captureTime.split(',')[0]}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Latitude:</span>
                      <span className="exif-meta-value-warning">{fileAnalysis.exif.gpsLatitude}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Longitude:</span>
                      <span className="exif-meta-value-warning">{fileAnalysis.exif.gpsLongitude}</span>
                    </div>
                    <div className="exif-meta-field-row">
                      <span className="exif-meta-label">Location:</span>
                      <span className="exif-meta-value">{fileAnalysis.exif.locationEst}</span>
                    </div>
                  </div>

                  <div className="warning-banner warning-banner--compact">
                    <p className="warning-banner-text">{t('photoRisk')}</p>
                  </div>

                  <div className="exif-compress-bar">
                    <div className="exif-compress-label">
                      <span>Image Quality:</span>
                      <span className="text-cyan">{compressionQuality}%</span>
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
                    className="btn btn-secure btn-full btn-sm"
                  >
                    {isStripping ? t('photoStripping') : t('photoStripSend')}
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
