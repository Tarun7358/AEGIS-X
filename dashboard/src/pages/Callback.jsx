import React, { useEffect } from 'react';
import useStore from '../store/useStore';

const Callback = () => {
  const setToken = useStore((state) => state.setToken);
  const setUser = useStore((state) => state.setUser);
  const initSocket = useStore((state) => state.initSocket);

  const hasExchanged = React.useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code && !hasExchanged.current) {
      hasExchanged.current = true;
      console.log('🔑 Received OAuth code:', code);
      fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
        .then((res) => {
          if (!res.ok) throw new Error('Authorization failed');
          return res.json();
        })
        .then((data) => {
          if (data.token) {
            console.log('✅ OAuth Login Success, setting session.');
            setToken(data.token);
            setUser(data.user);
            initSocket(data.token);
            // Redirect to homepage cleanly to trigger state sync and full app load
            window.location.href = '/';
          }
        })
        .catch((err) => {
          console.error('OAuth Exchange Error:', err);
          window.location.href = '/';
        });
    } else if (!code) {
      window.location.href = '/';
    }
  }, [setToken, setUser, initSocket]);

  return (
    <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyber-green/5 blur-3xl" />
      
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="w-12 h-12 border-4 border-cyber-green border-t-transparent rounded-full animate-spin shadow-glow" />
        <h3 className="text-lg font-bold text-white tracking-widest uppercase font-mono mt-2 m-0 animate-pulse">
          Exchanging Security Handshake
        </h3>
        <p className="text-xs text-gray-500 font-mono tracking-wider">
          Decrypting Discord Identity Tokens...
        </p>
      </div>
    </div>
  );
};

export default Callback;
