import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { BarChart3, TrendingUp, AlertTriangle, Droplets, DollarSign, ChevronRight, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Reports() {
  const { t, isRtl } = useI18n();
  const ChevronDir = isRtl ? ChevronLeft : ChevronRight;
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.get });
  const { data: analysis } = useQuery({ queryKey: ['analysis-latest'], queryFn: api.dashboard.getLatestAnalysis });
  const { data: savings } = useQuery({ queryKey: ['savings'], queryFn: api.savings.list });

  const chartData = (dashboard?.recentConsumption ?? []).map((r, i) => ({
    name: `M${i - (dashboard?.recentConsumption?.length ?? 0) + 1}`,
    m3: r.consumptionM3,
    isDemo: r.dataClassification === 'synthetic_demo_data',
  }));

  const isDemo = analysis?.dataClassification === 'synthetic_demo_data';

  const LINKS = [
    { href: '/analysis', icon: TrendingUp, label: t('analysis_title'), color: 'text-blue-600 bg-blue-50' },
    { href: '/baseline', icon: BarChart3, label: t('baseline_title'), color: 'text-purple-600 bg-purple-50' },
    { href: '/leak-detection', icon: AlertTriangle, label: t('leak_title'), color: 'text-red-600 bg-red-50' },
    { href: '/forecast', icon: Droplets, label: t('forecast_title'), color: 'text-teal-600 bg-teal-50' },
    { href: '/why-increase', icon: TrendingUp, label: t('why_title'), color: 'text-amber-600 bg-amber-50' },
    { href: '/savings', icon: DollarSign, label: t('savings_title'), color: 'text-green-600 bg-green-50' },
    { href: '/what-if', icon: BarChart3, label: t('whatif_title'), color: 'text-indigo-600 bg-indigo-50' },
    { href: '/meters', icon: BarChart3, label: t('meters_title'), color: 'text-gray-600 bg-gray-100' },
  ];

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('nav_reports')}</h1>
          {isDemo && <DemoBadge />}
        </div>

        {/* Consumption history chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">{isRtl ? 'تاريخ الاستهلاك' : 'Consumption History'}</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} ${t('home_unit_m3')}`, '']} contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="m3" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isDemo ? '#f59e0b' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {isDemo && <p className="text-xs text-center text-amber-500 mt-1">⚠️ {t('demo_disclaimer')}</p>}
          </div>
        )}

        {/* Latest savings summary */}
        {savings && savings[0] && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-xs text-green-600 font-medium mb-2">{t('savings_monthly')} *</p>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-green-700">{savings[0].savingSar.toFixed(1)}</span>
                <span className="text-sm text-green-600"> {t('savings_sar')}</span>
              </div>
              <div>
                <span className="text-xl font-bold text-green-700">{savings[0].savingM3.toFixed(1)}</span>
                <span className="text-sm text-green-600"> {t('savings_m3')}</span>
              </div>
            </div>
            <p className="text-xs text-green-500 mt-2">* {t('savings_estimate_note')}</p>
          </div>
        )}

        {/* Navigation grid */}
        <div className="grid grid-cols-2 gap-3">
          {LINKS.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer hover:border-blue-200 transition-colors">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
                  <Icon size={18} />
                </div>
                <p className="text-xs font-semibold text-gray-700 leading-tight">{label}</p>
                <ChevronDir size={14} className="text-gray-400 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
