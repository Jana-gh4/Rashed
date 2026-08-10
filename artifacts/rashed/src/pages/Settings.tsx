import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Home, Bell, Globe, Shield, HelpCircle, Info, LogOut, ChevronRight, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';

export default function Settings() {
  const { t, isRtl, lang, setLang } = useI18n();
  const { user, logout, refresh } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const ChevronDir = isRtl ? ChevronLeft : ChevronRight;

  const [section, setSection] = useState<string | null>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const { data: household } = useQuery({ queryKey: ['household'], queryFn: api.household.get, retry: false });

  const [hhName, setHhName] = useState('');
  const [memberCount, setMemberCount] = useState(4);
  const [propertyType, setPropertyType] = useState<'villa' | 'apartment' | 'townhouse' | 'other'>('villa');
  const [bathrooms, setBathrooms] = useState(2);
  const [hasGarden, setHasGarden] = useState(false);
  const [hasPool, setHasPool] = useState(false);

  const [hhLoaded, setHhLoaded] = useState(false);
  if (household && !hhLoaded) {
    setHhName(household.name);
    setMemberCount(household.memberCount);
    setPropertyType(household.propertyType);
    setBathrooms(household.bathroomCount);
    setHasGarden(household.hasGarden);
    setHasPool(household.hasPool);
    setHhLoaded(true);
  }

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.auth.updateMe({ name, preferredLanguage: lang });
      await refresh();
    } finally { setSaving(false); }
  };

  const saveHousehold = async () => {
    setSaving(true);
    try {
      await api.household.upsert({ name: hhName, memberCount, propertyType, bathroomCount: bathrooms, hasGarden, hasPool });
      qc.invalidateQueries({ queryKey: ['household'] });
      setSection(null);
    } finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SECTIONS = [
    { key: 'account', icon: User, label: t('settings_account') },
    { key: 'household', icon: Home, label: t('settings_household') },
    { key: 'language', icon: Globe, label: t('settings_language') },
    { key: 'about', icon: Info, label: t('settings_about') },
  ];

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        {section === null && (
          <>
            <h1 className="text-xl font-bold text-gray-900">{t('settings_title')}</h1>

            {/* User card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">{(user?.name ?? 'U')[0].toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>

            {/* Settings list */}
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {SECTIONS.map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setSection(key)} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                  <Icon size={20} className="text-gray-500" />
                  <span className="flex-1 text-start text-sm font-medium text-gray-700">{label}</span>
                  <ChevronDir size={16} className="text-gray-400" />
                </button>
              ))}
            </div>

            {/* Logout */}
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl border border-red-100 text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={20} />
              <span className="flex-1 text-start text-sm font-medium">{t('settings_logout')}</span>
            </button>

            {/* Disclaimer */}
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <p className="text-xs font-semibold text-amber-800 mb-1">{t('settings_disclaimer')}</p>
              <p className="text-xs text-amber-700">{t('settings_disclaimer_text')}</p>
            </div>
          </>
        )}

        {/* Account section */}
        {section === 'account' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSection(null)} className="p-2 rounded-xl hover:bg-gray-100">
                {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <h2 className="text-lg font-bold text-gray-900">{t('settings_account')}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings_name')}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings_email')}</label>
                <input value={user?.email ?? ''} disabled className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400" />
              </div>
              <button onClick={saveProfile} disabled={saving} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('settings_save_profile')}
              </button>
            </div>
          </div>
        )}

        {/* Household section */}
        {section === 'household' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSection(null)} className="p-2 rounded-xl hover:bg-gray-100">
                {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <h2 className="text-lg font-bold text-gray-900">{t('settings_household')}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings_household_name')}</label>
                <input value={hhName} onChange={(e) => setHhName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings_members')}</label>
                <input type="number" min={1} max={20} value={memberCount} onChange={(e) => setMemberCount(Number(e.target.value))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">{t('settings_property_type')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['villa', 'apartment', 'townhouse', 'other'] as const).map((pt) => (
                    <button key={pt} onClick={() => setPropertyType(pt)} className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${propertyType === pt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {t(`settings_${pt}` as any)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings_bathrooms')}</label>
                <input type="number" min={1} max={10} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="garden" checked={hasGarden} onChange={(e) => setHasGarden(e.target.checked)} className="w-5 h-5 accent-blue-600" />
                <label htmlFor="garden" className="text-sm text-gray-700">{t('settings_garden')}</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="pool" checked={hasPool} onChange={(e) => setHasPool(e.target.checked)} className="w-5 h-5 accent-blue-600" />
                <label htmlFor="pool" className="text-sm text-gray-700">{t('settings_pool')}</label>
              </div>
              <button onClick={saveHousehold} disabled={saving} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('settings_save_profile')}
              </button>
            </div>
          </div>
        )}

        {/* Language section */}
        {section === 'language' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSection(null)} className="p-2 rounded-xl hover:bg-gray-100">
                {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <h2 className="text-lg font-bold text-gray-900">{t('settings_language')}</h2>
            </div>
            <div className="space-y-3">
              {[{ code: 'ar', label: t('settings_arabic'), flag: '🇸🇦' }, { code: 'en', label: t('settings_english'), flag: '🇺🇸' }].map((l) => (
                <button key={l.code} onClick={() => { setLang(l.code as 'ar' | 'en'); setSection(null); }} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-colors ${lang === l.code ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}>
                  <span className="text-2xl">{l.flag}</span>
                  <span className="text-sm font-medium">{l.label}</span>
                  {lang === l.code && <span className="ms-auto text-blue-600">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* About section */}
        {section === 'about' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSection(null)} className="p-2 rounded-xl hover:bg-gray-100">
                {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <h2 className="text-lg font-bold text-gray-900">{t('about_title')}</h2>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">{t('about_description')}</p>
              <div className="pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 font-medium mb-1">{t('about_hackathon')}</p>
              </div>
              <div className="pt-3 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-600 mb-2">{t('about_limitations')}</p>
                <p className="text-xs text-gray-500">{t('about_limitations_text')}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">{t('settings_version')}</span>
                <span className="text-xs font-medium text-gray-600">0.1.0 — AI Champion 2026</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
