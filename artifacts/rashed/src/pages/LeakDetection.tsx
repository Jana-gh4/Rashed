import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Droplets, ShieldAlert, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

// Synthetic demo flow data (Section 3.5)
const DEMO_FLOW = [
  { time: '07:00', flow: 0, label: 'Normal' },
  { time: '07:10', flow: 10, label: 'Active use' },
  { time: '07:20', flow: 8, label: 'Active use' },
  { time: '07:30', flow: 0, label: 'Normal' },
  { time: '02:00', flow: 0.3, label: 'Potential leak' },
  { time: '02:10', flow: 0.3, label: 'Potential leak' },
  { time: '02:20', flow: 0.3, label: 'Potential leak' },
];

export default function LeakDetection() {
  const { t, isRtl } = useI18n();
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.get });

  const alert = dashboard?.activeAlert;
  const riskLevel = alert?.riskLevel ?? 'low';
  const probability = alert?.probability;
  const isDemo = alert?.isDemo ?? false;

  const riskColors: Record<string, string> = {
    high: 'bg-red-600',
    medium: 'bg-amber-500',
    low: 'bg-green-500',
    critical: 'bg-red-800',
  };
  const riskBg: Record<string, string> = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-amber-50 border-amber-200',
    low: 'bg-green-50 border-green-200',
    critical: 'bg-red-50 border-red-200',
  };
  const riskText: Record<string, string> = {
    high: 'text-red-700',
    medium: 'text-amber-700',
    low: 'text-green-700',
    critical: 'text-red-700',
  };
  const levelLabel = riskLevel === 'high' ? t('leak_risk_high') : riskLevel === 'medium' ? t('leak_risk_medium') : t('leak_risk_low');

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('leak_title')}</h1>
          {isDemo && <DemoBadge />}
        </div>

        {/* Alert banner */}
        {alert && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${riskBg[riskLevel]}`}>
            <AlertTriangle size={22} className={riskText[riskLevel]} />
            <div className="flex-1">
              <p className={`font-semibold text-sm ${riskText[riskLevel]}`}>{t('leak_alert_banner')}</p>
              {alert.reason && <p className={`text-xs mt-0.5 ${riskText[riskLevel]} opacity-80`}>{alert.reason}</p>}
            </div>
          </div>
        )}

        {/* Risk level */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">{t('leak_risk_level')}</p>
              <p className={`text-xl font-bold ${riskText[riskLevel]}`}>{levelLabel}</p>
            </div>
            <div className={`w-14 h-14 rounded-full ${riskColors[riskLevel]} flex items-center justify-center shadow-md`}>
              <ShieldAlert size={24} className="text-white" />
            </div>
          </div>
          {probability != null && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{t('leak_probability')}</p>
                <span className={`text-sm font-bold ${riskText[riskLevel]}`}>{(probability * 100).toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${riskColors[riskLevel]} rounded-full transition-all`} style={{ width: `${(probability * 100).toFixed(0)}%` }} />
              </div>
              {isDemo && <p className="text-xs text-gray-400 mt-1">⚠️ {t('leak_demo_disclaimer')}</p>}
            </div>
          )}
        </div>

        {/* Flow chart */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-3">{t('leak_chart_title')}</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={DEMO_FLOW}>
              <defs>
                <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} L/min`, '']} contentStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="flow" stroke="#ef4444" strokeWidth={2} fill="url(#flowGrad)" dot={{ r: 3, fill: '#ef4444' }} />
            </AreaChart>
          </ResponsiveContainer>
          {isDemo && <p className="text-xs text-gray-400 text-center mt-2">⚠️ {t('demo_disclaimer')}</p>}
        </div>

        {/* NWC reference */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">{t('leak_nwc_reference')}</p>
        </div>
      </div>
    </PageShell>
  );
}
