import React, { StrictMode, useEffect, useRef } from 'react';
// import { IframeAgent } from 'iframe-agent';
import { IframeAgent } from './IframeAgent';
import { createRoot } from 'react-dom/client';

export function Demo() {
  const agentRef = useRef<IframeAgent | null>(null);

  useEffect(() => {
    // Initialize with Popper.js positioning
    agentRef.current = new IframeAgent({
      iframeUrl: `http://${window.location.hostname}:5173`,
      width: 350,
      height: 500,
      robotIconUrl: '/robot-icon.png' // Custom icon path
    });

    return () => {
      agentRef.current?.destroy();
    };
  }, []);

  const handleToggle = () => {
    agentRef.current?.toggleIframe(); // Updated method name
  };

  const changePlacement = (placement: 'top' | 'bottom' | 'left' | 'right') => {
    agentRef.current?.destroy();
    agentRef.current = new IframeAgent({
      iframeUrl: `http://${window.location.hostname}:5173`,
      placement,
      width: 400,
      height: 600
    });
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ marginBottom: '24px' }}>IframeAgent with Popper.js Demo</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => changePlacement('top')}
          style={buttonStyle}
        >
          Position: Top
        </button>
        <button
          onClick={() => changePlacement('bottom')}
          style={buttonStyle}
        >
          Position: Bottom
        </button>
        <button
          onClick={() => changePlacement('left')}
          style={buttonStyle}
        >
          Position: Left
        </button>
        <button
          onClick={() => changePlacement('right')}
          style={buttonStyle}
        >
          Position: Right
        </button>
      </div>

      <button
        onClick={handleToggle}
        style={{
          ...buttonStyle,
          backgroundColor: '#007bff',
          color: 'white',
          padding: '12px 24px',
          fontSize: '16px'
        }}
      >
        Toggle Iframe Visibility
      </button>

      <div style={{
        marginTop: '32px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '12px' }}>Testing Notes:</h3>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Use the position buttons to change iframe placement</li>
          <li>Click the toggle button or the robot icon</li>
          <li>Try resizing the window to see automatic repositioning</li>
        </ul>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: '8px 16px',
  backgroundColor: '#f8f9fa',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    backgroundColor: '#e9ecef'
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>
);
