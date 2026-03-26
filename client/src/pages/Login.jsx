import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Eye, EyeOff, Lock, Mail } from 'lucide-react';
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
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-float" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }} />
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center mx-auto mb-4 shadow-2xl border border-white/20">
            <Users size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Employee Management</h1>
          <p className="text-purple-200 mt-2">Sign in to your account</p>
        </div>

        {/* Glass card form */}
        <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-2.5 text-purple-300" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                placeholder="admin@company.com" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-2.5 text-purple-300" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                placeholder="Enter password" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-purple-300 hover:text-white">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-200 mb-2">Demo Credentials</p>
          <div className="space-y-1 text-xs text-purple-300">
            <p><span className="font-medium text-white">Admin:</span> admin@company.com / admin123</p>
            <p><span className="font-medium text-white">Employee:</span> rahul@company.com / emp123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
