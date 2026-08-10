import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { Droplets } from 'lucide-react';

export default function Login() {
  const { t, lang, setLang, isRtl } = useI18n();
  const { login, register } = useAuth();
  const [, navigate] = useLocation();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password, lang);
      }
      navigate('/');
    } catch (err) {
      setError(mode === 'login' ? t('login_error') : t('register_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');
    try {
      await login('demo@rashed.app', 'demo1234');
      navigate('/');
    } catch {
      setError(t('login_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-6 max-w-md mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <Droplets size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-blue-900">{t('app_name')}</h1>
        <p className="text-sm text-blue-500 mt-1">{t('app_tagline')}</p>
      </div>

      {/* Language toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setLang('ar')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${lang === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>عربي</button>
        <button onClick={() => setLang('en')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>English</button>
      </div>

      {/* Form card */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-5">{mode === 'login' ? t('login_title') : t('register_title')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register_name')}</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login_email')}</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login_password')}</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {loading ? t('loading') : (mode === 'login' ? t('login_submit') : t('register_submit'))}
          </button>
        </form>

        <div className="mt-4 text-center">
          {mode === 'login' ? (
            <span className="text-sm text-gray-500">
              {t('login_no_account')}{' '}
              <button onClick={() => setMode('register')} className="text-blue-600 font-medium">{t('login_register')}</button>
            </span>
          ) : (
            <span className="text-sm text-gray-500">
              {t('register_has_account')}{' '}
              <button onClick={() => setMode('login')} className="text-blue-600 font-medium">{t('register_login')}</button>
            </span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <button onClick={handleDemo} disabled={loading} className="w-full py-3 bg-amber-50 text-amber-800 border border-amber-200 font-medium rounded-xl hover:bg-amber-100 disabled:opacity-60 transition-colors text-sm">
            🎯 {t('login_demo')}
          </button>
        </div>
      </div>
    </div>
  );
}
