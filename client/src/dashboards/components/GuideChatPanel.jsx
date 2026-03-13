import React, { useEffect, useMemo, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import io from 'socket.io-client';
import api from '../../api';
import PremiumAvatar from '../../components/PremiumAvatar';

const SOCKET_URL = 'http://localhost:3001';
const DELETE_WINDOW_MS = 60 * 60 * 1000;

const getDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateDivider = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
};

const resolveId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const candidate = value._id || value.id || value.userId;
    if (!candidate) return '';
    return typeof candidate === 'string' ? candidate : String(candidate);
  }
  return String(value);
};

export default function GuideChatPanel({ guideId }) {
  const [tourists, setTourists] = useState([]);
  const [filteredTourists, setFilteredTourists] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(null);
  const [chatStatus, setChatStatus] = useState('ACTIVE');
  const [chatNotice, setChatNotice] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selectedMessages = useMemo(() => {
    if (!selectedMessageIds.length) return [];
    const idSet = new Set(selectedMessageIds);
    return messages.filter((msg) => idSet.has(msg?._id || msg?.id));
  }, [messages, selectedMessageIds]);
  const messageRows = useMemo(() => {
    const rows = [];
    let previousDateKey = '';
    messages.forEach((msg, idx) => {
      const dateKey = getDateKey(msg.createdAt);
      if (dateKey && dateKey !== previousDateKey) {
        rows.push({
          type: 'divider',
          id: `date-${dateKey}-${idx}`,
          label: formatDateDivider(msg.createdAt),
        });
        previousDateKey = dateKey;
      }
      rows.push({
        type: 'message',
        id: msg._id || `msg-${idx}`,
        message: msg,
      });
    });
    return rows;
  }, [messages]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch tourists who have bookings with this guide
  useEffect(() => {
    if (!guideId) return;
    setLoading(true);
    api.get(`/booking/guide/${guideId}`).then(res => {
      const touristsList = (res.data.bookings || [])
        .map(b => b.touristId)
        .filter((v, i, a) => v && a.findIndex(t => t._id === v._id) === i);
      setTourists(touristsList);
      setFilteredTourists(touristsList);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      setError('Failed to load tourists.');
    });
  }, [guideId]);

  // Filter tourists by search
  useEffect(() => {
    if (!search) {
      setFilteredTourists(tourists);
    } else {
      setFilteredTourists(
        tourists.filter(t =>
          t.name?.toLowerCase().includes(search.toLowerCase()) ||
          t.email?.toLowerCase().includes(search.toLowerCase()) ||
          t.country?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, tourists]);

  // Fetch or create chat and messages when tourist is selected
  useEffect(() => {
    if (!selectedTourist || !guideId) return;
    setLoading(true);
    setError('');
    setMessages([]);
    setChatId(null);
    api.get(`/chat/direct/${selectedTourist._id}/${guideId}`)
      .then(res => {
        setChatId(res.data.chatId);
        setMessages(res.data.messages || []);
        setChatStatus(res.data.status || 'ACTIVE');
        setLoading(false);
      })
      .catch((err) => {
        // Only show error if it's a real API/server error, not just no chat yet
        setLoading(false);
        setError('Failed to load chat.');
      });
  }, [selectedTourist, guideId]);

  // Socket.io setup for chat
  useEffect(() => {
    if (!chatId || !guideId) return;
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
    }
    socketRef.current.emit('joinRoom', { chatId, userId: guideId });
    socketRef.current.off('newMessage');
    socketRef.current.on('newMessage', (msg) => {
      setMessages(prev => {
        if (msg?._id && prev.some(item => item._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });
    socketRef.current.off('messageDeleted');
    socketRef.current.on('messageDeleted', ({ messageId }) => {
      setMessages(prev =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                isDeleted: true,
                content: '',
                attachmentUrl: '',
                attachmentName: '',
                attachmentType: '',
                attachmentSize: 0,
                messageType: 'TEXT',
              }
            : msg
        )
      );
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.off('newMessage');
        socketRef.current.off('messageDeleted');
      }
    };
  }, [chatId, guideId]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chat status and input control
  useEffect(() => {
    let notice = '';
    let disabled = false;
    if (chatStatus === 'POST_TOUR') {
      notice = 'Chat is in post-tour mode.';
    }
    if (chatStatus === 'LOCKED') {
      notice = 'Chat is locked due to a dispute.';
      disabled = true;
    }
    if (chatStatus === 'CLOSED') {
      notice = 'Chat is closed. You can view previous messages.';
      disabled = true;
    }
    setChatNotice(notice);
    setIsInputDisabled(disabled);
  }, [chatStatus]);

  // Prevent double send by debouncing handleSend
  const sendingRef = useRef(false);
  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!input.trim() || isInputDisabled || !chatId) return;
    sendingRef.current = true;
    setLoading(true);
    try {
      let resp;
      // If this is a direct chat (bookingId is null), use the direct message endpoint
      if (selectedTourist && chatId && tourists.find(t => t._id === selectedTourist._id)) {
        resp = await api.post(`/chat/direct/${selectedTourist._id}/${guideId}/message`, {
          content: input,
          messageType: 'TEXT'
        });
        // If chatId was just created, update it
        if (resp.data.chatId && resp.data.chatId !== chatId) {
          setChatId(resp.data.chatId);
        }
      } else {
        // fallback for booking-based chat (should not happen in this panel)
        resp = await api.post(`/chat/${chatId}/message`, {
          content: input,
          messageType: 'TEXT'
        });
      }
      // Do not update messages here; rely on socket event only
      setInput('');
    } catch (err) {
      alert(err.response?.data?.error || 'Message failed');
    }
    setLoading(false);
    setTimeout(() => { sendingRef.current = false; }, 250); // allow next send after short delay
  };

  const isWithinDeleteWindow = (value) => {
    if (!value) return false;
    const createdAt = new Date(value).getTime();
    if (Number.isNaN(createdAt)) return false;
    return Date.now() - createdAt <= DELETE_WINDOW_MS;
  };

  const toggleMessageSelection = (messageId) => {
    if (!messageId) return;
    setSelectedMessageIds((prev) => (
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    ));
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const openBulkDeleteDialog = () => {
    if (!selectedMessageIds.length) return;
    setBulkDeleteOpen(true);
  };

  const closeBulkDeleteDialog = () => {
    setBulkDeleteOpen(false);
  };

  const applyDeleteForEveryone = (ids) => {
    const idSet = new Set(ids);
    setMessages((prev) =>
      prev.map((msg) => {
        const msgId = msg?._id || msg?.id;
        if (!idSet.has(msgId)) return msg;
        return {
          ...msg,
          isDeleted: true,
          content: '',
          attachmentUrl: '',
          attachmentName: '',
          attachmentType: '',
          attachmentSize: 0,
          messageType: 'TEXT',
        };
      })
    );
  };

  const applyDeleteForMe = (ids) => {
    const idSet = new Set(ids);
    setMessages((prev) => prev.filter((msg) => !idSet.has(msg?._id || msg?.id)));
  };

  const handleBulkDelete = async (mode) => {
    const ids = selectedMessageIds.filter(Boolean);
    if (!ids.length) return;
    const successIds = [];
    for (const id of ids) {
      try {
        if (mode === 'everyone') {
          await api.delete(`/chat/message/${id}`);
        } else {
          await api.delete(`/chat/message/${id}/for-me`);
        }
        successIds.push(id);
      } catch (err) {
        // ignore individual failure
      }
    }
    if (successIds.length) {
      if (mode === 'everyone') {
        applyDeleteForEveryone(successIds);
      } else {
        applyDeleteForMe(successIds);
      }
    }
    if (successIds.length !== ids.length) {
      alert('Some messages could not be deleted.');
    }
    clearSelection();
    closeBulkDeleteDialog();
  };

  const guideIdValue = guideId ? String(guideId) : '';
  const canBulkDeleteForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every(
      (message) =>
        !message.isDeleted &&
        resolveId(message?.senderId) === guideIdValue &&
        isWithinDeleteWindow(message.createdAt)
    );

  return (
    <Paper elevation={4} sx={{ display: 'flex', height: '70vh', bgcolor: '#f8fdf7', borderRadius: 4, boxShadow: 3, overflow: 'hidden' }}>
      {/* Tourist List */}
      <Box sx={{ width: 320, bgcolor: '#fff', borderRight: '1.5px solid #e0e0e0', p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 3, pb: 1 }}>
          <Typography variant="h4" fontWeight={800} mb={0.5} sx={{ fontFamily: 'serif' }}>Messages</Typography>
          <Typography variant="subtitle2" color="text.secondary" mb={2}>
            Chat with your tourists in real-time
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search tourists..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 2 }}>
          {filteredTourists.map((tourist) => (
            <Box
              key={tourist._id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.2,
                mb: 1,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedTourist?._id === tourist._id ? '#eafbe7' : 'transparent',
                transition: 'background 0.2s',
                '&:hover': { bgcolor: '#f0f7f4' }
              }}
              onClick={() => setSelectedTourist(tourist)}
            >
              <PremiumAvatar
                src={tourist.avatar}
                name={tourist.name}
                size={44}
                sx={{ border: selectedTourist?._id === tourist._id ? '2px solid #388e3c' : '2px solid #fff' }}
              />
              <Box>
                <Typography fontWeight={700} fontSize={17}>{tourist.name || 'No Name'}</Typography>
                <Typography fontSize={13} color="text.secondary">{tourist.country || ''}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      {/* Chat Window */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f8fdf7', borderRadius: 0, p: 0 }}>
        {selectedTourist && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, bgcolor: '#f4fbf6', borderBottom: '1.5px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PremiumAvatar
                src={selectedTourist.avatar}
                name={selectedTourist.name}
                size={44}
                sx={{ mr: 2 }}
              />
              <Box>
                <Typography fontWeight={700} fontSize={18}>{selectedTourist.name}</Typography>
                <Typography fontSize={13} color="text.secondary">{selectedTourist.country}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectionMode ? (
                <>
                  <Chip
                    label={`${selectedMessageIds.length} selected`}
                    size="small"
                    sx={{ bgcolor: 'rgba(15,23,42,0.08)', fontWeight: 600 }}
                  />
                  <Tooltip title="Delete selected" arrow>
                    <span>
                      <IconButton
                        onClick={openBulkDeleteDialog}
                        disabled={!selectedMessageIds.length}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button size="small" variant="outlined" onClick={clearSelection}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="small" variant="outlined" onClick={() => setSelectionMode(true)}>
                  Select
                </Button>
              )}
            </Box>
          </Box>
        )}
        {/* Chat status banner */}
        {chatNotice && (
          <Box sx={{ px: 3, py: 1, bgcolor: chatStatus === 'LOCKED' ? '#ffe0e0' : chatStatus === 'POST_TOUR' ? '#fffbe6' : chatStatus === 'CLOSED' ? '#f0f0f0' : '#eafbe7', borderBottom: '1.5px solid #e0e0e0' }}>
            <Chip label={chatNotice} color={chatStatus === 'LOCKED' ? 'error' : chatStatus === 'POST_TOUR' ? 'warning' : chatStatus === 'CLOSED' ? 'default' : 'success'} />
          </Box>
        )}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 0, py: 0, bgcolor: '#ece5dd', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : error && !chatId ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
              <Button onClick={() => setSelectedTourist(null)} color="primary" variant="outlined">Back</Button>
            </Box>
          ) : (
            <Box sx={{ flex: 1, px: 3, py: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {messages.length === 0 && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>
                  No messages yet. Start the conversation!
                </Typography>
              )}
              {messageRows.map((row, idx) => {
                if (row.type === 'divider') {
                  return (
                    <Box key={row.id} sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                      <Chip
                        label={row.label}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(15, 23, 42, 0.08)',
                          color: '#36574c',
                          fontWeight: 700,
                          borderRadius: '10px',
                          height: 26,
                          '& .MuiChip-label': { px: 1.5 },
                        }}
                      />
                    </Box>
                  );
                }

                const msg = row.message;
                const senderId = resolveId(msg?.senderId);
                const senderRole = msg?.senderRole || '';
                let isMe = false;
                if (senderRole) {
                  isMe = senderRole === 'guide';
                } else {
                  isMe = senderId && guideIdValue ? senderId === guideIdValue : false;
                }
                const messageId = msg?._id || msg?.id;
                const isSelected = selectionMode && messageId
                  ? selectedMessageIds.includes(messageId)
                  : false;
                const canSelect = selectionMode && messageId && !msg.isDeleted;
                // Get guide avatar from localStorage user
                let guideAvatar = '';
                let guideName = 'Guide';
                try {
                  const user = JSON.parse(localStorage.getItem('user'));
                  guideAvatar = user?.avatar || '';
                  guideName = user?.name || guideName;
                } catch {}
                const senderAvatar = msg?.senderAvatar || msg?.senderId?.avatar || '';
                const incomingAvatar = senderAvatar || selectedTourist?.avatar;
                const outgoingAvatar = guideAvatar || senderAvatar;
                return (
                  <Box key={row.id || idx} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', mb: 1 }}>
                    {!isMe && (
                      <PremiumAvatar
                        src={incomingAvatar}
                        name={selectedTourist?.name}
                        size={32}
                        sx={{ mr: 1 }}
                      />
                    )}
                    <Box sx={{
                      bgcolor: isMe ? '#dcf8c6' : '#fff',
                      color: 'text.primary',
                      px: selectionMode ? 2.5 : 2,
                      py: selectionMode ? 2 : 1.2,
                      pl: selectionMode ? 4 : 2,
                      pt: selectionMode ? 2.2 : 1.2,
                      borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                      maxWidth: 380,
                      boxShadow: 1,
                      position: 'relative',
                      outline: isSelected ? '2px solid #0ea67f' : 'none',
                      cursor: canSelect ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (canSelect) toggleMessageSelection(messageId);
                    }}>
                      {canSelect && (
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMessageSelection(messageId);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            color: '#4b5563',
                            '&.Mui-checked': {
                              color: '#0f172a',
                            },
                          }}
                        />
                      )}
                      <Typography
                        fontSize={15}
                        sx={{
                          wordBreak: 'break-word',
                          fontStyle: msg.isDeleted ? 'italic' : 'normal',
                          color: msg.isDeleted ? '#64748b' : '#222',
                        }}
                      >
                        {msg.isDeleted ? 'This message was deleted' : msg.content}
                      </Typography>
                      <Typography fontSize={11} sx={{ mt: 0.5, textAlign: 'right', opacity: 0.7 }}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                      </Typography>
                    </Box>
                    {isMe && (
                      <PremiumAvatar
                        src={outgoingAvatar}
                        name={guideName}
                        size={32}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#fafafa',
            p: 2,
            borderTop: '1.5px solid #e0e0e0',
            boxShadow: '0 1px 4px 0 rgba(76,175,80,0.04)',
            mt: 'auto',
          }}
        >
          <TextField
            fullWidth
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            variant="outlined"
            size="medium"
            sx={{ bgcolor: '#fff', borderRadius: 3, mr: 2, fontSize: 16 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isInputDisabled || loading || !!error || !chatId}
            inputProps={{ style: { fontSize: 16, padding: '12px' } }}
          />
          <Button
            variant="contained"
            color="success"
            sx={{ minWidth: 48, minHeight: 48, borderRadius: 2, fontWeight: 700, fontSize: 16, boxShadow: 'none', textTransform: 'none' }}
            onClick={e => {
              e.preventDefault();
              handleSend();
            }}
            disabled={!input.trim() || isInputDisabled || loading || !!error || !chatId}
          >
            Send
          </Button>
        </Box>
      </Box>
      <Dialog open={bulkDeleteOpen} onClose={closeBulkDeleteDialog}>
        <DialogTitle>Delete selected messages?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            You have selected {selectedMessageIds.length} message(s). Delete for me removes them only from your view.
          </Typography>
          {!canBulkDeleteForEveryone && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
              Delete for everyone is only available for your messages sent within the last hour.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeBulkDeleteDialog} variant="outlined">
            Cancel
          </Button>
          <Button onClick={() => handleBulkDelete('me')} variant="contained">
            Delete for me
          </Button>
          <Button
            onClick={() => handleBulkDelete('everyone')}
            variant="contained"
            color="error"
            disabled={!canBulkDeleteForEveryone}
          >
            Delete for everyone
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
