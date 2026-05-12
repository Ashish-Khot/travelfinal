// GuideCard.jsx - Premium professional guide card with all real data and features
import React, { useState } from 'react';
import Card from '@mui/material/Card';
import PremiumImage from '../../components/PremiumImage';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Modal from '@mui/material/Modal';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import { motion } from 'framer-motion';
import { buildMediaUrl } from '../../utils/media';

export default function GuideCard({ guide, onBook, onViewReviews, isFavorite, onFavoriteToggle }) {
  const [liked, setLiked] = React.useState(isFavorite);
  const [videoOpen, setVideoOpen] = useState(false);
  const tourMedia = Array.isArray(guide.tourMedia) ? guide.tourMedia : [];

  const handleFavorite = (e) => {
    e.stopPropagation();
    setLiked(!liked);
    if (onFavoriteToggle) onFavoriteToggle(guide);
  };

  const handleBook = (e) => {
    e.stopPropagation();
    if (guide.isAvailable === false) return;
    if (onBook) onBook(guide);
  };

  const handleViewReviews = (e) => {
    e.stopPropagation();
    if (onViewReviews) onViewReviews(guide);
  };

  const latestReview = guide.latestReview;

  const getMediaKind = (item) => {
    const explicitType = item?.mediaType;
    if (explicitType === 'video' || explicitType === 'image') return explicitType;
    const source = String(item?.url || '').toLowerCase();
    return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(source) ? 'video' : 'image';
  };

  // Format response time
  const formatResponseTime = (hours) => {
    if (hours < 1) return 'Within 1 hour';
    if (hours < 24) return `Within ${Math.floor(hours)} hours`;
    return `Within ${Math.ceil(hours / 24)} day${Math.ceil(hours / 24) > 1 ? 's' : ''}`;
  };

  // Format last booking
  const formatLastBooking = (days) => {
    if (!days && days !== 0) return 'No tours yet';
    if (days === 0) return 'Tour today';
    if (days === 1) return 'Tour yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.25 }}
      style={{ cursor: 'pointer', height: '100%' }}
    >
      <Card
        sx={{
          borderRadius: 2.5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          border: '1px solid #f0f0f0',
          '&:hover': {
            boxShadow: '0 16px 32px rgba(0,0,0,0.15)',
            borderColor: '#e5e7eb',
          },
        }}
      >
        {/* Image Container */}
        <Box
          sx={{
            position: 'relative',
            height: 220,
            overflow: 'hidden',
          background: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          '&:hover .guide-card-image': {
            transform: 'scale(1.06)',
          },
          }}
          onClick={() => guide.guideVideo && setVideoOpen(true)}
        >
          <PremiumImage
            src={guide.avatar}
            alt={guide.name}
            name={guide.name}
            height="100%"
            width="100%"
            showLabel={false}
            imgSx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transition: 'transform 0.3s ease',
            }}
            imgProps={{ className: 'guide-card-image' }}
          />

          {/* Video Play Button - if video exists */}
          {guide.guideVideo && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                p: 1.5,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  transform: 'translate(-50%, -50%) scale(1.1)',
                },
              }}
            >
              <PlayCircleIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
          )}

          {/* Availability Badge - Top Right */}
          {guide.isAvailable && (
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: guide.isAvailable ? '#10b981' : '#64748b',
                color: 'white',
                px: 1.2,
                py: 0.4,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
                zIndex: 2,
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <span>●</span> Available
            </Box>
          )}
          {guide.isAvailable === false && (
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: '#64748b',
                color: 'white',
                px: 1.2,
                py: 0.4,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
                zIndex: 2,
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <span>●</span> Unavailable
            </Box>
          )}

          {/* Favorite Button - Bottom Right */}
          <IconButton
            onClick={handleFavorite}
            sx={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              backgroundColor: 'rgba(255,255,255,0.95)',
              width: 40,
              height: 40,
              '&:hover': {
                backgroundColor: 'white',
              },
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            size="small"
          >
            {liked ? (
              <FavoriteIcon sx={{ color: '#ef4444', fontSize: 22 }} />
            ) : (
              <FavoriteBorderIcon sx={{ color: '#6B7280', fontSize: 22 }} />
            )}
          </IconButton>
        </Box>

        {/* Content Section */}
        <Box sx={{ p: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          {/* Guide Name with Verified Badge */}
          <Stack direction="row" alignItems="center" gap={0.4} spacing={0}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                fontSize: '1.05rem',
                lineHeight: 1.2,
                color: '#1F2937',
                flex: 1,
              }}
            >
              {guide.name}
            </Typography>
            {guide.verifiedID && (
              <Tooltip title="ID Verified">
                <VerifiedIcon sx={{ fontSize: 16, color: '#667eea' }} />
              </Tooltip>
            )}
          </Stack>

          {/* Location & Experience Row */}
          <Stack direction="row" alignItems="center" gap={0.5} spacing={0} sx={{ flexWrap: 'wrap' }}>
            <LocationOnIcon sx={{ fontSize: 15, color: '#9CA3AF', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.8rem', color: '#6B7280' }}>
              {guide.location}
            </Typography>
            {guide.experienceYears && guide.experienceYears > 0 && (
              <Typography sx={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                • {guide.experienceYears}y exp
              </Typography>
            )}
          </Stack>

          {/* Quick Stats Row - Rating, Reviews, Success Rate */}
          <Stack direction="row" alignItems="center" gap={0.6} spacing={0} sx={{ flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
              <Rating value={Math.round(guide.rating * 2) / 2} readOnly size="small" />
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500 }}>
                {guide.reviewCount > 0 
                  ? `${guide.rating.toFixed(1)} (${guide.reviewCount})`
                  : 'No reviews yet'
                }
              </Typography>
            </Box>
            {guide.successRate && guide.successRate > 0 && (
              <Tooltip title="Booking completion rate">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                  <Typography sx={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                    ✓ {guide.successRate}%
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Stack>

          {/* Languages as Chips with Proficiency Level */}
          {guide.languages && guide.languages.length > 0 && (
            <Stack direction="row" gap={0.4} sx={{ flexWrap: 'wrap' }} spacing={0}>
              {guide.languages.slice(0, 2).map((lang, idx) => (
                <Tooltip key={idx} title={`${typeof lang === 'string' ? 'Fluent' : (lang.level || 'Fluent')}`}>
                  <Chip
                    label={typeof lang === 'string' ? lang : lang.name}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      color: '#667eea',
                      backgroundColor: '#f3f4f6',
                      fontWeight: 600,
                      border: '1px solid #e5e7eb',
                    }}
                  />
                </Tooltip>
              ))}
              {guide.languages.length > 2 && (
                <Chip
                  label={`+${guide.languages.length - 2}`}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    color: '#667eea',
                    backgroundColor: '#f3f4f6',
                    fontWeight: 600,
                    border: '1px solid #e5e7eb',
                  }}
                />
              )}
            </Stack>
          )}

          {/* Bio/Description */}
          {guide.description && (
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.78rem',
                color: '#6B7280',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {guide.description}
            </Typography>
          )}

          {tourMedia.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, mb: 0.5 }}>
                Completed tour media
              </Typography>
              <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }} spacing={0}>
                {tourMedia.slice(0, 3).map((item, idx) => {
                  const kind = getMediaKind(item);
                  const src = buildMediaUrl(item?.url || '');
                  return (
                    <Box
                      key={`${src}-${idx}`}
                      sx={{
                        width: 58,
                        height: 48,
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: '1px solid #dbe3ef',
                        bgcolor: '#eef2ff',
                      }}
                    >
                      {kind === 'video' ? (
                        <Box
                          component="video"
                          src={src}
                          muted
                          controls
                          preload="metadata"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <Box
                          component="img"
                          src={src}
                          alt="Completed tour media"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                    </Box>
                  );
                })}
                {tourMedia.length > 3 && (
                  <Chip
                    label={`+${tourMedia.length - 3} more`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.68rem',
                      bgcolor: '#f8fafc',
                      border: '1px solid #dbe3ef',
                      color: '#334155',
                    }}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Tour Types / Expertise */}
          {guide.tourTypes && guide.tourTypes.length > 0 && (
            <Stack direction="row" gap={0.4} sx={{ flexWrap: 'wrap' }} spacing={0}>
              {guide.tourTypes.slice(0, 2).map((type, idx) => (
                <Chip
                  key={idx}
                  label={type}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    color: '#10b981',
                    borderColor: '#d1fae5',
                    backgroundColor: '#f0fdf4',
                    fontWeight: 500,
                  }}
                />
              ))}
            </Stack>
          )}

          {/* Response Time & People Guided & Last Booking */}
          <Stack direction="row" gap={0.8} spacing={0} sx={{ flexWrap: 'wrap', mt: 0.3 }}>
            <Tooltip title="Current booking availability">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                <Typography sx={{ fontSize: '0.7rem', color: guide.isAvailable ? '#10b981' : '#64748b' }}>●</Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>
                  {guide.isAvailable ? 'Open for bookings' : 'Not accepting bookings'}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip title="Average response time">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#667eea' }}>⏱️</Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>
                  {formatResponseTime(guide.averageResponseTime)}
                </Typography>
              </Box>
            </Tooltip>
            {guide.bookings > 0 && (
              <Tooltip title="Completed tours">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                  <Typography sx={{ fontSize: '0.7rem', color: '#667eea' }}>👥</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>
                    {guide.bookings} guided
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Stack>

          {/* Verification Badges */}
          {(guide.verifiedPhone || guide.verifiedPayment) && (
            <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }} spacing={0}>
              {guide.verifiedPhone && (
                <Tooltip title="Phone verified">
                  <Box sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Phone</Box>
                </Tooltip>
              )}
              {guide.verifiedPayment && (
                <Tooltip title="Payment verified">
                  <Box sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Payment</Box>
                </Tooltip>
              )}
            </Stack>
          )}

          {/* Last Booking */}
          {guide.daysSinceBooking !== null && (
            <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', fontStyle: 'italic' }}>
              Last tour: {formatLastBooking(guide.daysSinceBooking)}
            </Typography>
          )}

          {latestReview && (
            <Box
              onClick={handleViewReviews}
              sx={{
                mt: 0.4,
                p: 1,
                borderRadius: 1.5,
                bgcolor: '#f9fafb',
                border: '1px solid #edf2f7',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: '#d1d5db',
                  bgcolor: '#ffffff',
                },
              }}
            >
              <Typography sx={{ fontSize: '0.72rem', color: '#374151', fontWeight: 700, mb: 0.3 }}>
                Latest tourist review
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.74rem',
                  color: '#6B7280',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                "{latestReview.comment || 'No written comment provided.'}"
              </Typography>
            </Box>
          )}

          {/* Price Section */}
          <Box sx={{ mt: 'auto', pt: 0.9, borderTop: '1px solid #f3f4f6' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 500 }}>
                  Starting from
                </Typography>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#667eea' }}>
                  ₹{guide.price}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 500 }}>
                per {guide.rateType === 'hourly' ? 'hour' : 'day'}
              </Typography>
            </Stack>
          </Box>

          {/* Primary Actions */}
          <Stack direction="row" gap={1} sx={{ mt: 1.1 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleBook}
              disabled={guide.isAvailable === false}
              sx={{
                flex: 1.15,
                py: 0.95,
                backgroundColor: guide.isAvailable === false ? '#cbd5e1' : '#2d7a4a',
                color: 'white',
                fontSize: '0.86rem',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 1.5,
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: guide.isAvailable === false ? '#cbd5e1' : '#24663c',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 12px rgba(45, 122, 74, 0.3)',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#cbd5e1',
                  color: '#475569',
                },
              }}
            >
              {guide.isAvailable === false ? 'Unavailable' : 'Book Guide'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleViewReviews}
              sx={{
                flex: 0.9,
                py: 0.95,
                color: '#334155',
                borderColor: '#cbd5e1',
                fontSize: '0.84rem',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 1.5,
                whiteSpace: 'nowrap',
                '&:hover': {
                  borderColor: '#2d7a4a',
                  color: '#24663c',
                  bgcolor: '#f0fdf4',
                },
              }}
            >
              View Reviews
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Video Modal */}
      <Modal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)',
        }}
      >
        <Box
          sx={{
            background: 'black',
            borderRadius: 2,
            overflow: 'hidden',
            width: '90%',
            maxWidth: '600px',
          }}
        >
          <Box
            component="video"
            src={buildMediaUrl(guide.guideVideo)}
            controls
            autoPlay
            sx={{ width: '100%', display: 'block' }}
          />
        </Box>
      </Modal>
    </motion.div>
  );
}
