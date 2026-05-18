const express = require('express');
const moment = require('moment');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const HotelBooking = require('../models/HotelBooking');
const User = require('../models/User');
const Tourist = require('../models/Tourist');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

// Check if user is part of booking
async function validateChatAccess(user, bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) return { allowed: false, reason: 'Booking not found' };

    if (
        ![booking.touristId.toString(), booking.guideId.toString()].includes(
            user.userId
        )
    ) {
        return { allowed: false, reason: 'Access denied' };
    }

    return { allowed: true, booking };
}

// Determine chat status
function getChatStatus(booking, chat) {
    const now = moment();

    if (booking.status === 'disputed') return 'LOCKED';
    if (booking.status === 'cancelled') return 'CLOSED';
    if (['confirmed', 'ongoing'].includes(booking.status)) return 'ACTIVE';

    if (
        booking.status === 'completed' &&
        chat.postTourExpiry &&
        now.isBefore(chat.postTourExpiry)
    ) {
        return 'POST_TOUR';
    }

    return 'CLOSED';
}

// Content filter (no emails, phones, links)
function containsPersonalInfo(content) {
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const phoneRegex = /\b\d{10,}\b/;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    return (
        emailRegex.test(content) ||
        phoneRegex.test(content) ||
        urlRegex.test(content)
    );
}

/* =========================================================
   FILE UPLOADS
========================================================= */
const chatUploadDir = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
];

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, chatUploadDir);
        },
        filename: function (req, file, cb) {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('File type not allowed'), false);
        }
        cb(null, true);
    }
});

router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/chat/${req.file.filename}`;
        res.json({
            url: fileUrl,
            name: req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size
        });
    } catch (err) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

/* ==================================================   DIRECT CHAT (WITHOUT BOOKING)
========================================================= */

// POST /api/chat/direct/:touristId/:guideId/message
router.post('/direct/:touristId/:guideId/message', verifyToken, async (req, res) => {
    try {
        const { touristId, guideId } = req.params;
        const {
            content,
            messageType = 'TEXT',
            attachmentUrl = '',
            attachmentName = '',
            attachmentType = '',
            attachmentSize = 0
        } = req.body;

        // Access control
        if (![touristId, guideId].includes(req.user.userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let chat = await Chat.findOne({ touristId, guideId, bookingId: null });
        if (!chat) {
            chat = await Chat.create({ touristId, guideId, bookingId: null, status: 'ACTIVE' });
        }

        const safeContent = content || attachmentName || (messageType === 'IMAGE' ? 'Image' : '');
        if (!safeContent) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        if (containsPersonalInfo(safeContent)) {
            return res.status(400).json({ error: 'Personal contact info is not allowed' });
        }

        // Rate limit: 5 messages / 10 sec
        const since = moment().subtract(10, 'seconds').toDate();
        const recentCount = await Message.countDocuments({
            chatId: chat._id,
            senderId: req.user.userId,
            createdAt: { $gte: since }
        });
        if (recentCount >= 5) {
            return res.status(429).json({ error: 'Too many messages, slow down.' });
        }

        const senderRole = req.user.role === 'hotel' ? 'guide' : req.user.role;
        const msg = await Message.create({
            chatId: chat._id,
            senderId: req.user.userId,
            senderRole,
            messageType,
            content: safeContent,
            attachmentUrl,
            attachmentName,
            attachmentType,
            attachmentSize,
            isRead: false
        });

        try {
            const setupSocket = require('../socket/chat');
            const io = setupSocket.ioInstance;
            if (io) {
                io.to(`chat_${chat._id}`).emit('newMessage', msg);
            }
        } catch (e) {
            // silent
        }

        res.json({ message: msg, chatId: chat._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/chat/direct/:touristId/:guideId
router.get('/direct/:touristId/:guideId', verifyToken, async (req, res) => {
    try {
        const { touristId, guideId } = req.params;
        // Access control
        if (![touristId, guideId].includes(req.user.userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let chat = await Chat.findOne({
            touristId,
            guideId,
            bookingId: null
        });
        if (!chat) {
            chat = await Chat.create({
                touristId,
                guideId,
                bookingId: null,
                status: 'ACTIVE'
            });
        }

        const messages = await Message.find({
            chatId: chat._id,
            deletedFor: { $ne: req.user.userId }
        }).sort({
            createdAt: 1
        });
        res.json({
            chatId: chat._id,
            status: chat.status,
            messages
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* =========================================================
   BOOKING BASED CHAT
========================================================= */

// GET /api/chat/:bookingId
router.get('/:bookingId', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;

        const { allowed, booking, reason } = await validateChatAccess(
            req.user,
            bookingId
        );
        if (!allowed) return res.status(403).json({ error: reason });

        let chat = await Chat.findOne({ bookingId });

        if (!chat) {
            chat = await Chat.create({
                bookingId,
                touristId: booking.touristId,
                guideId: booking.guideId,
                status: 'ACTIVE',
                postTourExpiry: null
            });
        }

        const status = getChatStatus(booking, chat);
        if (chat.status !== status) {
            chat.status = status;
            await chat.save();
        }

        const messages = await Message.find({
            chatId: chat._id,
            deletedFor: { $ne: req.user.userId }
        }).sort({
            createdAt: 1
        });

        res.json({ chat, status, messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/chat/:bookingId/message
router.post('/:bookingId/message', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const {
            content,
            messageType = 'TEXT',
            attachmentUrl = '',
            attachmentName = '',
            attachmentType = '',
            attachmentSize = 0
        } = req.body;

        const { allowed, booking, reason } = await validateChatAccess(
            req.user,
            bookingId
        );
        if (!allowed) return res.status(403).json({ error: reason });

        const chat = await Chat.findOne({ bookingId });
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        const status = getChatStatus(booking, chat);
        if (['CLOSED', 'LOCKED'].includes(status)) {
            return res.status(403).json({ error: 'Chat is not active' });
        }

        const safeContent = content || attachmentName || (messageType === 'IMAGE' ? 'Image' : '');
        if (!safeContent) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        if (containsPersonalInfo(safeContent)) {
            return res
                .status(400)
                .json({ error: 'Personal contact info is not allowed' });
        }

        // Rate limit: 5 messages / 10 sec
        const since = moment().subtract(10, 'seconds').toDate();
        const recentCount = await Message.countDocuments({
            chatId: chat._id,
            senderId: req.user.userId,
            createdAt: { $gte: since }
        });

        if (recentCount >= 5) {
            return res
                .status(429)
                .json({ error: 'Too many messages, slow down.' });
        }

        const senderRole = req.user.role === 'hotel' ? 'guide' : req.user.role;
        const msg = await Message.create({
            chatId: chat._id,
            senderId: req.user.userId,
            senderRole,
            messageType,
            content: safeContent,
            attachmentUrl,
            attachmentName,
            attachmentType,
            attachmentSize,
            isRead: false
        });

        try {
            const setupSocket = require('../socket/chat');
            const io = setupSocket.ioInstance;
            if (io) {
                io.to(`chat_${chat._id}`).emit('newMessage', msg);
            }
        } catch (e) {
            // silent
        }

        res.json({ message: msg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/chat/:bookingId/messages (pagination)
router.get('/:bookingId/messages', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;

        const { allowed, reason } = await validateChatAccess(
            req.user,
            bookingId
        );
        if (!allowed) return res.status(403).json({ error: reason });

        const chat = await Chat.findOne({ bookingId });
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const messages = await Message.find({
            chatId: chat._id,
            deletedFor: { $ne: req.user.userId }
        })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit);

        res.json({ messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/chat/guide/:guideId/tourists
router.get('/guide/:guideId/tourists', verifyToken, async (req, res) => {
    try {
        const { guideId } = req.params;
        const includeAll = req.query.includeAll === 'true';

        if (req.user.userId !== guideId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const bookings = await Booking.find({ guideId })
            .populate('touristId', 'name email avatar country')
            .sort({ updatedAt: -1, createdAt: -1 });

        const bookedTouristIds = new Set();
        bookings.forEach((booking) => {
            const touristId = booking.touristId?._id?.toString();
            if (touristId) bookedTouristIds.add(touristId);
        });

        const chats = await Chat.find(
            includeAll
                ? { guideId }
                : { guideId, touristId: { $in: Array.from(bookedTouristIds) } }
        )
            .populate('touristId', 'name email avatar country')
            .sort({ updatedAt: -1 });

        const touristIds = new Set(bookedTouristIds);
        chats.forEach((chat) => {
            const touristId = chat.touristId?._id?.toString();
            if (touristId) touristIds.add(touristId);
        });

        const profiles = touristIds.size > 0
            ? await Tourist.find({ userId: { $in: Array.from(touristIds) } }).select('userId fullName avatar nationality')
            : [];
        const profileMap = new Map(
            profiles.map((profile) => [profile.userId.toString(), profile])
        );

        const contacts = new Map();

        const buildTouristPayload = (tourist) => {
            const id = tourist?._id?.toString();
            if (!id) return null;

            const profile = profileMap.get(id);
            return {
                _id: tourist._id,
                name: profile?.fullName || tourist.name || tourist.email || 'Tourist',
                email: tourist.email || '',
                avatar: profile?.avatar || tourist.avatar || '',
                country: tourist.country || profile?.nationality || ''
            };
        };

        const upsertContact = ({ tourist, chat = null, booking = null, lastMessage = null, unreadCount = 0 }) => {
            const touristId = tourist?._id?.toString();
            if (!touristId) return;

            const payload = buildTouristPayload(tourist);
            if (!payload) return;

            const existing = contacts.get(touristId) || {};
            contacts.set(touristId, {
                ...payload,
                chatId: chat?._id || existing.chatId || null,
                bookingId: existing.bookingId || booking?._id || chat?.bookingId || null,
                bookingStatus: existing.bookingStatus || booking?.status || '',
                lastMessage: lastMessage || existing.lastMessage || null,
                unreadCount: unreadCount || existing.unreadCount || 0
            });
        };

        bookings.forEach((booking) => {
            upsertContact({ tourist: booking.touristId, booking });
        });

        await Promise.all(
            chats.map(async (chat) => {
                const [lastMessage, unreadCount] = await Promise.all([
                    Message.findOne({
                        chatId: chat._id,
                        deletedFor: { $ne: req.user.userId }
                    }).sort({ createdAt: -1 }),
                    Message.countDocuments({
                        chatId: chat._id,
                        isRead: false,
                        senderId: { $ne: req.user.userId },
                        deletedFor: { $ne: req.user.userId }
                    })
                ]);

                upsertContact({
                    tourist: chat.touristId,
                    chat,
                    lastMessage,
                    unreadCount
                });
            })
        );

        if (includeAll) {
            const allTourists = await User.find({ role: 'tourist' }).select('name email avatar country');
            const missingIds = allTourists
                .map((tourist) => tourist._id.toString())
                .filter((id) => !touristIds.has(id));

            if (missingIds.length > 0) {
                const missingProfiles = await Tourist.find({ userId: { $in: missingIds } }).select('userId fullName avatar nationality');
                missingProfiles.forEach((profile) => {
                    profileMap.set(profile.userId.toString(), profile);
                });
            }

            allTourists.forEach((tourist) => {
                upsertContact({ tourist });
            });
        }

        const tourists = Array.from(contacts.values()).sort((a, b) => {
            const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            return (a.name || '').localeCompare(b.name || '');
        });

        res.json({ tourists });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/chat/hotel/:hotelId/tourists
router.get('/hotel/:hotelId/tourists', verifyToken, async (req, res) => {
    try {
        const { hotelId } = req.params;
        const includeAll = req.query.includeAll === 'true';

        if (req.user.userId !== hotelId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const [chats, hotelBookings] = await Promise.all([
            Chat.find({ guideId: hotelId }).populate('touristId', 'name email avatar country').sort({ updatedAt: -1 }),
            HotelBooking.find({ hotelOwnerId: hotelId, status: { $ne: 'cancelled' } })
                .populate('touristId', 'name email avatar country')
                .sort({ createdAt: -1 })
        ]);

        const touristIds = Array.from(new Set([
            ...chats.map(chat => chat.touristId?._id?.toString()).filter(Boolean),
            ...hotelBookings.map(booking => booking.touristId?._id?.toString()).filter(Boolean)
        ]));
        const touristProfiles = await Tourist.find({ userId: { $in: touristIds } })
            .select('userId fullName avatar');
        const profileMap = new Map(
            touristProfiles.map(profile => [profile.userId.toString(), profile])
        );
        const contacts = new Map();
        const existingTourists = new Set();

        const buildTouristPayload = (tourist, extra = {}) => {
            const touristId = tourist?._id?.toString();
            if (!touristId) return null;
            const profile = profileMap.get(touristId);
            const payload = {
                _id: tourist._id,
                name: profile?.fullName || tourist.name || tourist.email || '',
                email: tourist.email || '',
                avatar: profile?.avatar || tourist.avatar || '',
                country: tourist.country || '',
                ...extra
            };
            if (!payload.name && payload.email) payload.name = payload.email;
            return payload.name ? payload : null;
        };

        const upsertContact = (touristId, update) => {
            if (!touristId) return;
            existingTourists.add(touristId);
            const existing = contacts.get(touristId) || {};
            contacts.set(touristId, {
                ...existing,
                ...update,
                tourist: {
                    ...(existing.tourist || {}),
                    ...(update.tourist || {})
                },
                lastMessage: update.lastMessage || existing.lastMessage || null,
                unreadCount: update.unreadCount ?? existing.unreadCount ?? 0
            });
        };

        hotelBookings.forEach((booking) => {
            const touristId = booking.touristId?._id?.toString();
            const roomLabel = booking.roomType
                ? `${booking.roomType}${Number(booking.roomCount) > 1 ? ` (${booking.roomCount} rooms)` : ''}`
                : 'Booked room';
            const touristPayload = buildTouristPayload(booking.touristId, {
                roomNumber: roomLabel
            });
            if (!touristPayload) return;
            upsertContact(touristId, {
                tourist: touristPayload,
                hotelBookingId: booking._id,
                room: roomLabel,
                bookingStatus: booking.status,
                hotelBookingCreatedAt: booking.createdAt
            });
        });

        for (const chat of chats) {
            const lastMessage = await Message.findOne({
                chatId: chat._id,
                deletedFor: { $ne: req.user.userId }
            }).sort({ createdAt: -1 });
            const touristId = chat.touristId?._id?.toString();
            const hasBookingContact = touristId ? contacts.has(touristId) : false;
            if (!lastMessage && !includeAll && !hasBookingContact) continue;
            const touristPayload = buildTouristPayload(chat.touristId);
            if (!touristPayload) continue;

            const unreadCount = await Message.countDocuments({
                chatId: chat._id,
                isRead: false,
                senderId: { $ne: req.user.userId },
                deletedFor: { $ne: req.user.userId }
            });

            upsertContact(touristId, {
                chatId: chat._id,
                bookingId: chat.bookingId,
                tourist: touristPayload,
                lastMessage,
                unreadCount
            });
        }

        const results = Array.from(contacts.values());

        if (includeAll) {
            const tourists = await Tourist.find({}).select('userId fullName avatar');
            if (tourists.length > 0) {
                tourists.forEach((touristProfile) => {
                    const userId = touristProfile.userId?.toString();
                    if (!userId || existingTourists.has(userId)) return;
                    results.push({
                        chatId: null,
                        bookingId: null,
                        hotelBookingId: null,
                        room: '',
                        tourist: {
                            _id: touristProfile.userId,
                            name: touristProfile.fullName,
                            avatar: touristProfile.avatar
                        },
                        lastMessage: null,
                        unreadCount: 0
                    });
                });
            } else {
                const touristsFallback = await User.find({ role: 'tourist' }).select('name email avatar country');
                touristsFallback.forEach((tourist) => {
                    if (!existingTourists.has(tourist._id.toString())) {
                        results.push({
                            chatId: null,
                            bookingId: null,
                            hotelBookingId: null,
                            room: '',
                            tourist,
                            lastMessage: null,
                            unreadCount: 0
                        });
                    }
                });
            }
        }

        results.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt
                ? new Date(a.lastMessage.createdAt).getTime()
                : (a.hotelBookingCreatedAt ? new Date(a.hotelBookingCreatedAt).getTime() : 0);
            const bTime = b.lastMessage?.createdAt
                ? new Date(b.lastMessage.createdAt).getTime()
                : (b.hotelBookingCreatedAt ? new Date(b.hotelBookingCreatedAt).getTime() : 0);
            return bTime - aTime;
        });

        res.json({ tourists: results });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/chat/hotel/:hotelId/summary
router.get('/hotel/:hotelId/summary', verifyToken, async (req, res) => {
    try {
        const { hotelId } = req.params;
        if (req.user.userId !== hotelId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const chats = await Chat.find({ guideId: hotelId }).select('_id');
        const chatIds = chats.map((chat) => chat._id);
        if (chatIds.length === 0) {
            return res.json({ messagesToday: 0, latestMessage: null });
        }
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const messagesToday = await Message.countDocuments({
            chatId: { $in: chatIds },
            createdAt: { $gte: startOfDay },
            deletedFor: { $ne: req.user.userId }
        });
        const latestMessage = await Message.findOne({
            chatId: { $in: chatIds },
            deletedFor: { $ne: req.user.userId }
        })
            .sort({ createdAt: -1 })
            .populate('senderId', 'name avatar');
        res.json({ messagesToday, latestMessage });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE /api/chat/message/:messageId
router.delete('/message/:messageId', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message: 'Invalid message id.' });
        }
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        const senderId = message.senderId ? String(message.senderId) : null;
        if (!senderId) {
            return res.status(400).json({ message: 'Message sender missing.' });
        }
        if (senderId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const createdAt = message.createdAt ? new Date(message.createdAt).getTime() : 0;
        const now = Date.now();
        if (!createdAt || now - createdAt > 60 * 60 * 1000) {
            return res.status(400).json({ message: 'Message can only be deleted within 1 hour.' });
        }
        const chatId = message.chatId?.toString();
        if (!message.isDeleted) {
            const deletedBy = mongoose.Types.ObjectId.isValid(req.user.userId)
                ? req.user.userId
                : null;
            message.isDeleted = true;
            message.deletedAt = new Date();
            message.deletedBy = deletedBy;
            message.content = 'Message deleted';
            message.messageType = 'TEXT';
            message.attachmentUrl = '';
            message.attachmentName = '';
            message.attachmentType = '';
            message.attachmentSize = 0;
            await message.save();
        }
        try {
            const setupSocket = require('../socket/chat');
            const io = setupSocket.ioInstance;
            if (io && chatId) {
                io.to(`chat_${chatId}`).emit('messageDeleted', {
                    messageId,
                    chatId,
                    scope: 'everyone',
                    deletedAt: message.deletedAt
                });
            }
        } catch (e) {
            // silent
        }
        res.json({ message: 'Message deleted', deletedAt: message.deletedAt });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Server error', error: err.message });
    }
});

// DELETE /api/chat/message/:messageId/for-me
router.delete('/message/:messageId/for-me', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
            return res.status(400).json({ message: 'Invalid user.' });
        }
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const chat = await Chat.findById(message.chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const isParticipant = [chat.touristId?.toString(), chat.guideId?.toString()].includes(req.user.userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (!message.deletedFor?.some((id) => String(id) === req.user.userId)) {
            message.deletedFor = [...(message.deletedFor || []), req.user.userId];
            await message.save();
        }

        res.json({ message: 'Message deleted for me' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
