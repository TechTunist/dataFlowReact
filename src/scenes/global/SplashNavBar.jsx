import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Container, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const Navbar = ({ colors }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down and past a threshold
        setVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navButtonSx = {
    color: colors.grey[100],
    fontWeight: 'bold',
    fontSize: { xs: '0.95rem', sm: '1.05rem' },
    '&:hover': { color: colors.greenAccent[500] },
  };

  const showSignedInNav = isLoaded && isSignedIn;

  return (
    <AppBar
      position="fixed"
      sx={{
        background: colors.primary[900] + ' !important', // Force exact color
        backgroundColor: colors.primary[900], // Fallback
        boxShadow: 'none',
        top: 0,
        width: '100%',
        zIndex: 3,
        opacity: 1, // No transparency
        backdropFilter: 'none', // Prevent blending
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease-in-out', // Smooth slide
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            justifyContent: 'space-between',
            minHeight: { xs: 64, sm: 80 }, // Taller: 64px mobile, 80px desktop
            alignItems: 'center', // Ensure content is centered vertically
          }}
        >
          <Link to="/splash" style={{ display: "flex", alignItems: "center" }}>
            <img
              src="/assets/cryptological-original-logo.png"
              alt="Cryptological Logo"
              style={{ height: '60px' }}
            />
          </Link>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
            <Button
              component={Link}
              to="/bitcoin-whitepaper"
              sx={navButtonSx}
            >
              Why Bitcoin
            </Button>
            {showSignedInNav ? (
              <>
                <Button
                  component={Link}
                  to="/dashboard"
                  sx={{
                    ...navButtonSx,
                    fontSize: { xs: '0.95rem', sm: '1.2rem' },
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  component={Link}
                  to="/charts"
                  sx={{
                    ...navButtonSx,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  Charts
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/chart-gallery"
                  sx={{
                    ...navButtonSx,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  Charts
                </Button>
                <Button
                  component={Link}
                  to="/login-signup?mode=signin"
                  sx={{
                    ...navButtonSx,
                    fontSize: { xs: '0.95rem', sm: '1.2rem' },
                  }}
                >
                  Login
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;