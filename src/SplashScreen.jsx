import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const colors = {
  surface: '#0c0e10',
  surfaceContainerLow: '#111416',
  surfaceContainer: '#161a1e',
  surfaceContainerHigh: '#1b2025',
  surfaceContainerHighest: '#20262c',
  primary: '#90d792',
  primaryContainer: '#07521d',
  onPrimary: '#004b18',
  onSurface: '#e0e6ed',
  onSurfaceVariant: '#a6acb2',
  outlineVariant: '#42494e'
};

const fontHeadline = '"Space Grotesk", sans-serif';
const fontBody = '"Inter", sans-serif';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger the entrance animations on component mount
    setMounted(true);
  }, []);

  return (
    <Box sx={{
      minHeight: '75vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      px: { xs: 2, md: 8 },
      position: 'relative',
      zIndex: 10
    }}>
      <Box sx={{
        maxWidth: 750,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>

        {/* Decorative Top Line */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box sx={{ height: 2, width: 48, bgcolor: colors.primary, boxShadow: `0 0 10px ${colors.primary}80` }} />
          <Typography sx={{
            fontFamily: fontHeadline,
            color: colors.primary,
            letterSpacing: '0.25em',
            fontSize: 12,
            textTransform: 'uppercase',
            fontWeight: 700
          }}>
            IONIS System Access
          </Typography>
        </Box>

        <Typography variant="h1" sx={{
          fontFamily: fontHeadline,
          fontWeight: 700,
          color: colors.onSurface,
          fontSize: { xs: '3.5rem', md: '5.5rem' },
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          mb: 3,
          textShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          Total Authority. Total Peace.
        </Typography>

        <Typography sx={{
          fontFamily: fontBody,
          color: colors.onSurfaceVariant,
          fontSize: { xs: '1rem', md: '1.25rem' },
          lineHeight: 1.6,
          maxWidth: 550,
          mb: 6,
          fontWeight: 400
        }}>
          Move beyond tracking. IONIS provides a living connection to your vehicles, offering real-time defensive command and intelligent insights to keep your assets exactly where they belong.
        </Typography>

        {/* Frosted Obsidian Control Panel Card */}
        <Box sx={{
          p: 3,
          bgcolor: `${colors.surfaceContainerHighest}CC`,
          backdropFilter: 'blur(24px)',
          borderRadius: '12px',
          border: `1px solid ${colors.outlineVariant}60`,
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 2,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
        }}>
          <Typography sx={{
            fontFamily: fontHeadline,
            fontSize: 11,
            color: colors.onSurfaceVariant,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 600
          }}>
            Always within reach. Always within sight.
          </Typography>

          <Button
            onClick={() => navigate('/login')}
            sx={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryContainer})`,
              color: colors.onPrimary,
              fontFamily: fontHeadline,
              fontWeight: 800,
              fontSize: 14,
              px: { xs: 4, md: 6 },
              py: 2.5,
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              transition: 'all 0.3s ease',
              boxShadow: `0 8px 32px ${colors.primary}20 inset, 0 8px 24px rgba(0,0,0,0.4)`,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                transform: 'translateX(-100%)',
                transition: 'transform 0.5s ease',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 40px ${colors.primary}40 inset, 0 12px 32px rgba(0,0,0,0.5)`,
                '&::before': {
                  transform: 'translateX(100%)',
                }
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            CONNECT TO YOUR IONIS
          </Button>
        </Box>

      </Box>
    </Box>
  );
}
