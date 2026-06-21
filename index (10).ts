@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import '../styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--color-background);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes noria-glow {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(245, 166, 35, 0.4)); }
  50% { filter: drop-shadow(0 0 20px rgba(0, 212, 255, 0.6)); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.shimmer-text {
  background: linear-gradient(90deg, #F5A623 0%, #00D4FF 50%, #F5A623 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s linear infinite;
}

.noria-animated { animation: noria-glow 2s ease-in-out infinite; }

.float { animation: float 3s ease-in-out infinite; }
