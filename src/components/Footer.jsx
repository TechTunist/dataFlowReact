import React from 'react';

const Footer = () => {
    
    const currentYear = new Date().getFullYear();
 
    return (
        <footer style={{ 
            padding: '20px', 
            marginTop: 'auto', 
            backgroundColor: '#f0f0f0', 
            textAlign: 'center',
            borderTop: '1px solid #ddd' // Add visual separation from content
          }}>
          <p style={{ margin: 0 }}>
            © {currentYear} Your Name. All rights reserved.
          </p>
          <p style={{ margin: '5px 0 0' }}>
            Contact: <a href="mailto:your.email@example.com">your.email@example.com</a>
          </p>
          <p style={{ margin: '5px 0 0' }}>
            Built with <a href="https://reactjs.org/" target="_blank" rel="noopener noreferrer">React</a>
          </p>
        </footer>
      );
    };
    
    export default Footer;