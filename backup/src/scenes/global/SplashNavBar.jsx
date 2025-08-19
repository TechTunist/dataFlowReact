import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Container, Button } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = ({ colors }) => {
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
          <img
            src="/assets/cryptological-original-logo.png"
            alt="Cryptological Logo"
            style={{ height: '60px' }}
          />
          <Button
            component={Link}
            to="/login-signup?mode=signin"
            sx={{
              color: colors.grey[100], // White text
              fontWeight: 'bold',
              fontSize: '1.2rem',
              '&:hover': {
                color: colors.greenAccent[500], // Green text on hover
              },
            }}
          >
            Login
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;