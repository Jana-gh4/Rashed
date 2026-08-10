import { Link, useLocation } from 'wouter';
import { Home, Upload, BarChart3, Leaf, Settings, Bot } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const NAV = [
  { path: '/', icon: Home, labelKey: 'nav_home' as const },
  { path: '/upload', icon: Upload, labelKey: 'nav_upload' as const },
  { path: '/reports', icon: BarChart3, labelKey: 'nav_reports' as const },
  { path: '/plan', icon: Leaf, labelKey: 'nav_plan' as const },
  { path: '/assistant', icon: Bot, labelKey: 'nav_assistant' as const },
  { path: '/settings', icon: Settings, labelKey: 'nav_settings' as const },
];

export function BottomNav() {
  const [location] = useLocation();
  const { t, isRtl } = useI18n();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom"
      style={{ direction: isRtl ? 'rtl' : 'ltr' }}
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
        {NAV.map(({ path, icon: Icon, labelKey }) => {
          const active = location === path || (path !== '/' && location.startsWith(path));
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-0 ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}>
                <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
                <span className="text-[10px] font-medium truncate">{t(labelKey)}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
