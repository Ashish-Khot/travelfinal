import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  TextField,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  LinearProgress,
  Stack,
  Autocomplete
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { requestVirtualGuideAnswer } from '../../services/virtualGuideService';

const destinationPresets = [
  'Goa',
  'Jaipur',
  'Kerala',
  'Leh',
  'Varanasi',
  'Rishikesh',
  'Udaipur',
  'Delhi',
  'Mumbai',
  'Hampi',
  'Andaman',
  'Darjeeling'
];

const destinationProfiles = {
  Goa: {
    summary: 'Beach towns, Portuguese heritage, and easygoing nightlife.',
    bestTime: 'November to February for cooler evenings and clear skies.',
    highlights: ['Candolim beach sunset', 'Old Goa churches', 'Assagao cafes'],
    stayAreas: 'North Goa for energy, South Goa for quieter stays.',
    tips: ['Pre-book scooters in peak season.', 'Carry cash for beach shacks.']
  },
  Jaipur: {
    summary: 'Royal forts, pink city markets, and heritage hotels.',
    bestTime: 'October to March for comfortable sightseeing.',
    highlights: ['Amber Fort', 'Hawa Mahal sunrise', 'City Palace'],
    stayAreas: 'C Scheme for hotels, old city for close access.',
    tips: ['Start early to avoid crowds.', 'Plan one market evening.']
  },
  Kerala: {
    summary: 'Backwaters, spice plantations, and wellness retreats.',
    bestTime: 'October to March for drier weather.',
    highlights: ['Alleppey houseboat', 'Munnar tea estates', 'Kochi heritage walk'],
    stayAreas: 'Kochi for culture, Alleppey for backwaters, Munnar for hills.',
    tips: ['Book houseboats one day ahead.', 'Pack light rain layers.']
  },
  Leh: {
    summary: 'High-altitude passes, monasteries, and dramatic landscapes.',
    bestTime: 'June to September for open roads.',
    highlights: ['Khardung La', 'Pangong Lake', 'Thiksey Monastery'],
    stayAreas: 'Leh town for convenience, Nubra for desert views.',
    tips: ['Take a rest day to acclimatize.', 'Carry layers for night chill.']
  },
  Varanasi: {
    summary: 'Sacred ghats, morning rituals, and timeless lanes.',
    bestTime: 'October to March for mild mornings.',
    highlights: ['Sunrise boat ride', 'Dashashwamedh aarti', 'Sarnath day trip'],
    stayAreas: 'Near the ghats for walking access.',
    tips: ['Morning boats need early booking.', 'Keep valuables secure in crowds.']
  },
  Rishikesh: {
    summary: 'Yoga retreats, river rafting, and mountain air.',
    bestTime: 'September to November or February to April.',
    highlights: ['Laxman Jhula area', 'Ganga aarti', 'Rafting stretches'],
    stayAreas: 'Tapovan for cafes, near Ram Jhula for calm stays.',
    tips: ['Check rafting seasons in advance.', 'Avoid late-night riverside walks.']
  }
};

const sanitizePdfText = (text) =>
  text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const wrapText = (text, maxLen = 84) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxLen) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
};

const buildPdfBlob = (title, body) => {
  const safeTitle = sanitizePdfText(title);
  const bodyLines = wrapText(body).map(sanitizePdfText);
  const contentLines = [
    'BT',
    '/F1 18 Tf',
    '1 0 0 1 72 740 Tm',
    '24 TL',
    `(${safeTitle}) Tj`,
    'T*',
    '/F1 12 Tf',
  ];
  bodyLines.forEach((line) => {
    contentLines.push(`(${line}) Tj`);
    contentLines.push('T*');
  });
  contentLines.push('ET');
  const content = contentLines.join('\n');

  const objects = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n');
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n');
  objects.push(`4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`);
  objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n');

  const header = '%PDF-1.4\n';
  let offset = header.length;
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(offset);
    offset += obj.length;
  });
  const xrefOffset = offset;
  const xrefEntries = offsets
    .slice(1)
    .map((off) => `${off.toString().padStart(10, '0')} 00000 n `)
    .join('\n');
  const xref = `xref\n0 6\n0000000000 65535 f \n${xrefEntries}\n`;
  const trailer = `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const pdf = header + objects.join('') + xref + trailer;
  return new Blob([pdf], { type: 'application/pdf' });
};

const buildDestinationBriefText = (destination) => {
  const profile = destinationProfiles[destination] || {
    summary: `${destination} is a strong choice for a balanced mix of culture, scenery, and local experiences.`,
    bestTime: 'Look for shoulder seasons to avoid crowds and get better rates.',
    highlights: ['Signature viewpoint', 'Local market visit', 'Day trip to nearby town'],
    stayAreas: 'Stay near the center for convenience and easy transit.',
    tips: ['Book key tickets ahead.', 'Plan one slow morning to reset.']
  };

  const sections = [
    `Overview: ${profile.summary}`,
    `Best time to visit: ${profile.bestTime}`,
    `Top experiences: ${profile.highlights.join(', ')}.`,
    `Where to stay: ${profile.stayAreas}`,
    `Local tips: ${profile.tips.join(' ')}`
  ];

  return sections.join('\n\n');
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function VirtualGuide() {
  const [destination, setDestination] = useState(destinationPresets[0]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Welcome. Pick a destination and ask your question.'
    }
  ]);
  const [statusMessage, setStatusMessage] = useState('');
  const [modeBadge, setModeBadge] = useState('preview');
  const [isStreaming, setIsStreaming] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const speechRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const streamTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const modelOptions = useMemo(() => {
    const raw = import.meta.env.VITE_VIRTUAL_GUIDE_MODELS || '';
    const list = raw.split(',').map((item) => item.trim()).filter(Boolean);
    return list.length ? list : ['demo'];
  }, []);

  const initialModel = useMemo(() => {
    const envDefault = import.meta.env.VITE_VIRTUAL_GUIDE_DEFAULT_MODEL;
    if (envDefault && modelOptions.includes(envDefault)) return envDefault;
    return modelOptions[0] || 'demo';
  }, [modelOptions]);

  const [selectedModel] = useState(initialModel);
  const isDemoModel = selectedModel === 'demo';

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setStatusMessage('Microphone error. Check browser permissions.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      if (speechRef.current) speechRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!audioEnabled) {
      if (speechRef.current) speechRef.current.cancel();
    }
  }, [audioEnabled]);

  const handleDocUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadedDocs((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeDoc = (index) => {
    setUploadedDocs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const speakText = (text) => {
    if (!audioEnabled || !speechRef.current) return;
    if (!text) return;
    speechRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    speechRef.current.speak(utterance);
  };

  const stopAudio = () => {
    if (speechRef.current) speechRef.current.cancel();
  };

  const startStreaming = (messageId, fullText, meta = {}) => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    const words = fullText.split(' ');
    let idx = 0;
    setIsStreaming(true);
    streamTimerRef.current = setInterval(() => {
      idx += 1;
      const chunk = words.slice(0, idx).join(' ');
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, text: chunk, meta: { ...msg.meta, ...meta } }
            : msg
        )
      );
      if (idx >= words.length) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setIsStreaming(false);
        speakText(fullText);
      }
    }, 28);
  };

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      text: 'Preparing response...'
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setQuestion('');
    setStatusMessage('');

    if (isDemoModel) {
      setStatusMessage('Preview mode is active. Add API keys later for live answers.');
      setModeBadge('preview');
    }

    const startTime = Date.now();
    const response = await requestVirtualGuideAnswer({
      question: trimmed,
      destination,
      model: isDemoModel ? '' : selectedModel,
      attachments: uploadedDocs.map((file) => ({ name: file.name, size: file.size }))
    });

    if (!response || !response.answer) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, text: 'Response unavailable right now. Please try again.' }
            : msg
        )
      );
      setStatusMessage('No response yet. Check backend status and API keys.');
      setModeBadge('issue');
      return;
    }

    const latency = Date.now() - startTime;
    const resolvedMode = response.mode === 'preview' ? 'preview' : 'live';
    setModeBadge(resolvedMode);
    if (resolvedMode === 'preview') {
      setStatusMessage('Preview answer shown because a live model is not connected yet.');
    } else {
      setStatusMessage('');
    }
    const sourceLabel = response.mode === 'preview' ? 'Preview' : (response.mode || 'Live');
    startStreaming(assistantId, response.answer, { latency, sourceLabel });
  };

  const handleQuickPrompt = (prompt) => {
    setQuestion(prompt);
  };

  const handleCopyLatest = () => {
    const latest = [...messages].reverse().find((msg) => msg.role === 'assistant');
    if (!latest?.text) return;
    navigator.clipboard.writeText(latest.text);
    setStatusMessage('Answer copied to clipboard.');
  };

  const handleDownloadLatest = () => {
    const latest = [...messages].reverse().find((msg) => msg.role === 'assistant');
    if (!latest?.text) return;
    const safeDestination = destination || 'destination';
    const blob = buildPdfBlob(`${safeDestination} answer brief`, latest.text);
    downloadBlob(blob, `${safeDestination.toLowerCase().replace(/\s+/g, '-')}-answer-brief.pdf`);
  };

  const handleDownloadDestinationBrief = () => {
    const safeDestination = destination || 'destination';
    const body = buildDestinationBriefText(safeDestination);
    const blob = buildPdfBlob(`${safeDestination} destination brief`, body);
    downloadBlob(blob, `${safeDestination.toLowerCase().replace(/\s+/g, '-')}-destination-brief.pdf`);
  };

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      setStatusMessage('Voice input is not supported in this browser.');
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      if (statusMessage === 'Listening...') {
        setStatusMessage('');
      }
    } else {
      recognitionRef.current.start();
      setListening(true);
      setStatusMessage('Listening...');
    }
  };

  const promptDestination = destination || 'your destination';
  const quickPrompts = [
    `Build a 3 day itinerary for ${promptDestination}.`,
    `Where should I stay in ${promptDestination} for first timers?`,
    `Top local experiences and dining in ${promptDestination}.`
  ];

  const modeBadgeLabel =
    modeBadge === 'live' ? 'Live' : modeBadge === 'issue' ? 'Check setup' : 'Preview';
  const modeBadgeColor =
    modeBadge === 'live' ? 'success' : modeBadge === 'issue' ? 'warning' : 'default';

  const destinationProfile = destinationProfiles[destination];
  const destinationSummary = destinationProfile?.summary
    || `${promptDestination} blends culture, food, and local experiences in one easy trip.`;
  const destinationBestTime = destinationProfile?.bestTime
    || 'Plan around shoulder seasons for comfortable weather and value.';
  const destinationHighlights = destinationProfile?.highlights || [
    'Signature landmark',
    'Local market walk',
    'Sunset viewpoint'
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: { xs: 'auto', md: 'calc(100vh - 220px)' },
        minHeight: 0,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -40,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,116,144,0.16), transparent 65%)',
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -60,
          left: -40,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,118,110,0.14), transparent 65%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '26px',
          p: { xs: 2.5, md: 3.5 },
          bgcolor: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(148,163,184,0.2)',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
          backdropFilter: 'blur(14px)'
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: '0.18em', color: '#0f766e' }}>
              Virtual Guide
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.4px', mb: 1 }}>
              Plan India like a local.
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
              Instant answers, destination briefs, and voice responses for every trip style.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Chip label={`Destination: ${destination || 'Choose one'}`} size="small" />
              <Chip label={modeBadgeLabel} size="small" color={modeBadgeColor} />
            </Stack>
          </Box>
          <Box
            sx={{
              minWidth: 220,
              borderRadius: '18px',
              p: 2,
              bgcolor: 'rgba(15,118,110,0.08)',
              border: '1px solid rgba(15,118,110,0.2)'
            }}
          >
            <Typography variant="caption" sx={{ display: 'block', color: '#0f766e', fontWeight: 700 }}>
              Travel Snapshot
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: '#0f172a' }}>
              {destinationSummary}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '360px minmax(0, 1fr)' },
          gap: 2,
          flex: 1,
          minHeight: 0
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: '24px',
            p: 2.5,
            bgcolor: '#ffffff',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 16px 35px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minHeight: 0
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Trip setup
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set the destination and what you need from the guide.
            </Typography>
          </Box>

          <Autocomplete
            freeSolo
            options={destinationPresets}
            value={destination}
            onInputChange={(_, newValue) => setDestination(newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Destination"
                placeholder="Type a destination"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <PlaceIcon sx={{ mr: 1, color: '#0f766e' }} />
                      {params.InputProps.startAdornment}
                    </>
                  )
                }}
                sx={{ minWidth: 220 }}
              />
            )}
          />

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <FormControlLabel
              control={<Switch checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} />}
              label="Audio answers"
            />
            <Chip label={audioEnabled ? 'Audio on' : 'Audio off'} size="small" variant="outlined" />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadDestinationBrief}
              sx={{ textTransform: 'none' }}
            >
              Destination brief
            </Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              sx={{ textTransform: 'none' }}
            >
              Attach PDFs
              <input type="file" hidden accept="application/pdf" multiple onChange={handleDocUpload} />
            </Button>
          </Stack>

          {uploadedDocs.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {uploadedDocs.map((doc, idx) => (
                <Chip
                  key={`${doc.name}-${idx}`}
                  label={doc.name}
                  onDelete={() => removeDoc(idx)}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          )}

          <Divider />

          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: 'rgba(15,118,110,0.08)',
              border: '1px solid rgba(15,118,110,0.16)'
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Destination snapshot
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {destinationSummary}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600 }}>
              Best time
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {destinationBestTime}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
              {destinationHighlights.map((item) => (
                <Chip key={item} label={item} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: '24px',
            p: 2.5,
            bgcolor: '#ffffff',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 16px 35px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minHeight: 0
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Guide chat
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ask anything and get a tailored answer with optional audio.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={modeBadgeLabel} size="small" color={modeBadgeColor} />
              <Chip label={audioEnabled ? 'Audio on' : 'Audio off'} size="small" variant="outlined" />
            </Stack>
          </Stack>

          {statusMessage && (
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: '12px',
                bgcolor: 'rgba(14, 116, 144, 0.08)',
                color: '#0f172a',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              {statusMessage}
            </Box>
          )}

          <Box
            sx={{
              flex: 1,
              minHeight: { xs: 220, md: 260 },
              overflowY: 'auto',
              pr: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%'
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: msg.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #0f766e, #1f9d8b)'
                      : '#f8fafc',
                    color: msg.role === 'user' ? '#ffffff' : '#0f172a',
                    border:
                      msg.role === 'user'
                        ? '1px solid rgba(15,118,110,0.4)'
                        : '1px solid rgba(148,163,184,0.2)',
                    whiteSpace: 'pre-wrap',
                    boxShadow:
                      msg.role === 'user'
                        ? '0 10px 22px rgba(15, 118, 110, 0.25)'
                        : '0 8px 18px rgba(15, 23, 42, 0.06)'
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      opacity: 0.8,
                      mb: 0.5
                    }}
                  >
                    {msg.role === 'user' ? 'You' : 'Guide'}
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '0.95rem' }}>
                    {msg.text}
                  </Typography>
                  {msg.meta?.latency != null && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        color: msg.role === 'user' ? '#d1fae5' : '#64748b'
                      }}
                    >
                      Response time: {msg.meta.latency} ms | {msg.meta.sourceLabel || 'Model'}
                    </Typography>
                  )}
                </Paper>
              </Box>
            ))}
            <Box ref={messagesEndRef} />
            {isStreaming && <LinearProgress sx={{ mt: 1 }} />}
          </Box>

          <Divider />

          <Stack spacing={1.5}>
            <TextField
              placeholder={`Ask about ${promptDestination}`}
              multiline
              minRows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleAsk}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Send
              </Button>
              <Button
                variant="outlined"
                startIcon={listening ? <MicOffIcon /> : <MicIcon />}
                onClick={handleMicToggle}
                sx={{ textTransform: 'none' }}
              >
                {listening ? 'Stop voice' : 'Voice input'}
              </Button>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Copy latest answer">
                <IconButton onClick={handleCopyLatest}>
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download latest answer as PDF">
                <IconButton onClick={handleDownloadLatest}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              {audioEnabled && (
                <>
                  <Tooltip title="Replay audio">
                    <IconButton onClick={() => speakText(messages[messages.length - 1]?.text || '')}>
                      <VolumeUpIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Stop audio">
                    <IconButton onClick={stopAudio}>
                      <StopCircleIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                pb: 0.5
              }}
            >
              {quickPrompts.map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
