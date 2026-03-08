export default function LoadingSpinner() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0f0f1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      zIndex: 9999,
    }}>

      {/* Background orbs */}
      <div style={{
        position: 'absolute', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        top: '-100px', left: '-100px', borderRadius: '50%',
        animation: 'lsFloat1 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        bottom: '-80px', right: '-80px', borderRadius: '50%',
        animation: 'lsFloat2 10s ease-in-out infinite',
      }} />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Spinner content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

        {/* Logo with pulse ring */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer pulse ring */}
          <div style={{
            position: 'absolute',
            width: 80, height: 80, borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.4)',
            animation: 'lsPulse 1.8s ease-out infinite',
          }} />
          {/* Middle ring */}
          <div style={{
            position: 'absolute',
            width: 64, height: 64, borderRadius: '50%',
            border: '1.5px solid rgba(99,102,241,0.25)',
            animation: 'lsPulse 1.8s ease-out infinite 0.3s',
          }} />
          {/* Spinning arc */}
          <div style={{
            position: 'absolute',
            width: 70, height: 70, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#6366f1',
            borderRightColor: 'rgba(99,102,241,0.3)',
            animation: 'lsSpin 1s cubic-bezier(0.4,0,0.2,1) infinite',
          }} />
          {/* Logo box */}
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
            animation: 'lsBreathe 2s ease-in-out infinite',
          }}>⚡</div>
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.3px', marginBottom: 6,
          }}>
            One Net Solution
          </div>
          {/* Animated dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#6366f1',
                animation: `lsDot 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lsSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes lsPulse {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes lsBreathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
        @keyframes lsFloat1 {
          0%, 100% { transform: translate(0,0); }
          50%       { transform: translate(30px,-40px); }
        }
        @keyframes lsFloat2 {
          0%, 100% { transform: translate(0,0); }
          50%       { transform: translate(-20px,30px); }
        }
        @keyframes lsDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}