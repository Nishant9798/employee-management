import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, token } = useAuth();
  const nav = useNavigate();

  if (token) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      nav('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 -left-10 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-float" />
          <div className="absolute top-10 -right-10 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        </div>
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        {/* Radial spotlight */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-indigo-500/30 animate-bounce-in border border-white/10">
            <Users size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Employee Management</h1>
          <p className="text-indigo-300/70 mt-2 text-sm font-medium">Sign in to your account</p>
        </div>

        {/* Glass card form */}
        <form onSubmit={handleSubmit} className="backdrop-blur-2xl bg-white/[0.07] border border-white/[0.12] rounded-3xl p-8 space-y-6 shadow-2xl">
          <div>
            <label className="block text-sm font-semibold text-indigo-200/80 mb-2">Email Address</label>
            <div className="relative group">
              <Mail size={18} className="absolute left-3.5 top-3 text-indigo-300/50 group-focus-within:text-indigo-400 transition-colors" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 focus:bg-white/[0.08] transition-all text-sm"
                placeholder="Enter your email" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-indigo-200/80 mb-2">Password</label>
            <div className="relative group">
              <Lock size={18} className="absolute left-3.5 top-3 text-indigo-300/50 group-focus-within:text-indigo-400 transition-colors" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 focus:bg-white/[0.08] transition-all text-sm"
                placeholder="Enter password" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-3 text-indigo-300/50 hover:text-white transition-colors">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 group text-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-indigo-300/30 text-xs mt-8 font-medium">Employee Management System v2.0</p>
      </div>
    </div>
  );
}
