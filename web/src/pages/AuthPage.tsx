import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StarfieldBackground } from '../components/StarfieldBackground';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          throw new Error('Please fill in all fields');
        }
        await login(email);
      } else {
        if (!email || !password || !username) {
          throw new Error('Please fill in all fields');
        }
        await signup({ email, username, password });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-space-900 text-white font-sans">
      <StarfieldBackground />
      
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo/Header Area */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-['Press_Start_2P'] text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan mb-4 drop-shadow-[0_0_10px_rgba(255,0,110,0.5)]">
            VARSITY<br/>ARCADE
          </h1>
          <p className="text-blue-300 text-sm md:text-base font-['Press_Start_2P'] opacity-80">
            {isLogin ? 'INSERT COIN TO CONTINUE' : 'NEW CHALLENGER APPROACHING'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-900/80 backdrop-blur-md border-2 border-neon-cyan/50 rounded-xl p-6 shadow-[0_0_50px_rgba(0,255,255,0.2)] transform transition-all duration-300">
          
          {/* Tabs */}
          <div className="flex mb-6 border-b-2 border-gray-700">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-sm font-['Press_Start_2P'] transition-colors ${
                isLogin 
                  ? 'text-neon-cyan border-b-2 border-neon-cyan -mb-[2px]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-sm font-['Press_Start_2P'] transition-colors ${
                !isLogin 
                  ? 'text-neon-pink border-b-2 border-neon-pink -mb-[2px]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs font-['Press_Start_2P'] text-center">
                {error}
              </div>
            )}

            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-['Press_Start_2P'] text-neon-pink uppercase">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:border-neon-pink focus:outline-none focus:shadow-[0_0_15px_rgba(255,0,110,0.3)] transition-all font-mono"
                    placeholder="Player1"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-['Press_Start_2P'] text-neon-cyan uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all font-mono"
                placeholder="player@arcade.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-['Press_Start_2P'] text-neon-purple uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none focus:shadow-[0_0_15px_rgba(180,0,255,0.3)] transition-all font-mono"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-6 rounded-lg font-['Press_Start_2P'] text-sm uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                isLogin 
                  ? 'bg-gradient-to-r from-neon-cyan to-blue-600 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]' 
                  : 'bg-gradient-to-r from-neon-pink to-red-600 hover:shadow-[0_0_20px_rgba(255,0,110,0.5)]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Processing...' : (isLogin ? 'Start Game' : 'Join the Corps')}
            </button>
          </form>

          {/* Footer / Toggle */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={toggleMode}
                className={`ml-2 hover:underline ${isLogin ? 'text-neon-pink' : 'text-neon-cyan'}`}
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

