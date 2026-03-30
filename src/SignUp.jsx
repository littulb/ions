import React, { useState } from "react";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, TextField, CircularProgress } from "@mui/material";

const colors = {
  primary: '#90d792',
  primaryContainer: '#4bb477',
  onPrimary: '#004b18',
  surfaceVariant: '#262626',
  onSurfaceVariant: '#a6acb2',
  outlineVariant: '#484847',
  error: '#ff716c',
};

const fontHeadline = '"Space Grotesk", "Manrope", sans-serif';

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Automatically logs in and navigates to Dashboard
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: { xs: 'center', md: 'flex-start' }, // Float to the left for Sign Up
      px: { xs: 2, md: 8 }
    }}>
      {/* Sign Up Canvas / Glass Card */}
      <Box sx={{
        width: '100%',
        maxWidth: 550,
        bgcolor: 'rgba(19, 19, 19, 0.75)',
        backdropFilter: 'blur(40px)',
        p: { xs: 4, md: 6 },
        borderRadius: { xs: '24px', md: '48px' },
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>

        {/* Branding Context */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: colors.primary,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.95)', boxShadow: `0 0 0 0 ${colors.primary}B0` },
                '70%': { transform: 'scale(1)', boxShadow: `0 0 0 10px rgba(0,0,0,0)` },
                '100%': { transform: 'scale(0.95)', boxShadow: `0 0 0 0 rgba(0,0,0,0)` }
              }
            }} />
            <Typography sx={{
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: colors.primary,
              fontWeight: 700,
              fontFamily: fontHeadline
            }}>
              Identity Provisioning
            </Typography>
          </Box>
          <Typography variant="h3" sx={{
            fontFamily: fontHeadline,
            fontWeight: 300,
            color: '#fff',
            mb: 1,
            letterSpacing: '-0.02em',
            fontSize: { xs: '2.5rem', md: '3rem' }
          }}>
            Establish Identity.
          </Typography>
          <Typography sx={{ color: colors.onSurfaceVariant, fontSize: '0.875rem', fontWeight: 300, letterSpacing: '0.05em' }}>
            Mint a new identifier to access the Sanctuary.
          </Typography>
        </Box>

        {/* Transactional Form */}
        <Box component="form" onSubmit={handleSignUp} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

          <Box>
            <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.onSurfaceVariant, fontWeight: 600, px: 1, mb: 1 }}>
              Login ID (New)
            </Typography>
            <TextField
              variant="standard"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: '#fff',
                  fontSize: '1.125rem',
                  py: 1.5,
                  px: 1,
                  bgcolor: 'transparent',
                  borderBottom: `1px solid ${colors.outlineVariant}`,
                  transition: 'all 0.3s',
                  '&.Mui-focused': { borderBottom: `1px solid ${colors.primary}` }
                }
              }}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, mb: 1 }}>
              <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.onSurfaceVariant, fontWeight: 600 }}>
                Password
              </Typography>
              <Typography
                component={RouterLink}
                to="/login"
                sx={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: colors.primary,
                  textDecoration: 'none',
                  '&:hover': { color: colors.primaryContainer }
                }}>
                <u>Return to Login</u>
              </Typography>
            </Box>
            <TextField
              variant="standard"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: '#fff',
                  fontSize: '1.125rem',
                  py: 1.5,
                  px: 1,
                  bgcolor: 'transparent',
                  borderBottom: `1px solid ${colors.outlineVariant}`,
                  transition: 'all 0.3s',
                  '&.Mui-focused': { borderBottom: `1px solid ${colors.primary}` }
                }
              }}
            />
          </Box>

          {error && (
            <Typography sx={{ color: colors.error, fontSize: '0.875rem', textAlign: 'center', mt: -2 }}>
              {error}
            </Typography>
          )}

          <Box sx={{ pt: 2 }}>
            <Button
              type="submit"
              disabled={loading}
              fullWidth
              sx={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryContainer} 100%)`,
                color: colors.onPrimary,
                py: 2.5,
                borderRadius: '50px',
                fontFamily: fontHeadline,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                boxShadow: `0 10px 20px -5px ${colors.primary}40`,
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'scale(1.02)'
                },
                '&:active': {
                  transform: 'scale(0.98)'
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
            </Button>
          </Box>
        </Box>

        {/* Technical Metadata */}
        <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="material-symbols-outlined" style={{ color: colors.primary, fontSize: 16 }}>verified_user</span>
            <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>
              Your presence is protected.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>
            Secured via Quiet Vigilance Intelligence. v.4.0.2 Sanctuary.
          </Typography>
        </Box>

      </Box>
    </Box>
  );
};

export default SignUp;
