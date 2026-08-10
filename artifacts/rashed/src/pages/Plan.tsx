import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Leaf, CheckSquare, Square, AlertCircle, Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Plan() {
  const { t, isRtl, lang } = useI18n();
  const { data: savings } = useQuery({ queryKey: ['savings'], queryFn: api.savings.list });
  const { data: analysis } = useQuery({ queryKey: ['analysis-latest'], queryFn: api.dashboard.getLatestAnalysis });

  const [completed, setCompleted] = useState<number[]>([]);

  const causes = analysis?.possibleCauses as { reason: string; confidence: number }[] | null;
  const isDemo = analysis?.dataClassification === 'synthetic_demo_data';

  // Build plan actions from causes + fixed list
  const actions = [
    { id: 1, icon: '🔧', titleAr: 'تحقق من التسربات الداخلية', titleEn: 'Check for internal leaks', descAr: 'افحص الأنابيب تحت المغاسل وصمامات المراحيض', descEn: 'Inspect pipes under sinks and toilet valves', savingM3: 3.5 },
    { id: 2, icon: '🌿', titleAr: 'قلل ري الحديقة 20%', titleEn: 'Reduce garden irrigation by 20%', descAr: 'ري الصباح الباكر يقلل التبخر بشكل كبير', descEn: 'Early morning watering significantly reduces evaporation', savingM3: 2.0 },
    { id: 3, icon: '🚿', titleAr: 'راجع مدة الاستحمام', titleEn: 'Review shower duration', descAr: 'تقليل دقيقتين يوفر 20 لتراً لكل مرة', descEn: 'Reducing by 2 minutes saves 20L each time', savingM3: 1.5 },
    { id: 4, icon: '🏠', titleAr: 'اضبط مستوى خزان المرحاض', titleEn: 'Adjust toilet tank level', descAr: 'تقليل حجم التفريغ بـ 0.5 لتر يوفر 50%', descEn: 'Reducing flush volume by 0.5L saves 50%', savingM3: 1.0 },
  ];

  const totalSavingM3 = actions.filter((a) => completed.includes(a.id)).reduce((s, a) => s + a.savingM3, 0);

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('plan_title')}</h1>
          {isDemo && <DemoBadge />}
        </div>

        {/* Goal card */}
        <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Leaf size={20} />
            <p className="font-semibold">{t('plan_goal')}</p>
          </div>
          <p className="text-2xl font-bold">{isRtl ? 'خفض الاستهلاك 15%' : 'Reduce consumption by 15%'}</p>
          {completed.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-500">
              <p className="text-green-200 text-sm">{t('plan_water_saving')}: {totalSavingM3.toFixed(1)} {t('home_unit_m3')}</p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">{isRtl ? 'التقدم' : 'Progress'}</p>
            <p className="text-sm font-semibold text-gray-700">{completed.length}/{actions.length}</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completed.length / actions.length) * 100}%` }} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {actions.map((action) => {
            const done = completed.includes(action.id);
            const title = lang === 'ar' ? action.titleAr : action.titleEn;
            const desc = lang === 'ar' ? action.descAr : action.descEn;
            return (
              <div key={action.id} className={`bg-white rounded-2xl p-4 border transition-colors ${done ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => setCompleted((c) => done ? c.filter((x) => x !== action.id) : [...c, action.id])} className="mt-0.5 flex-shrink-0">
                    {done ? <CheckSquare size={22} className="text-green-600" /> : <Square size={22} className="text-gray-300" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{action.icon}</span>
                      <p className={`text-sm font-semibold ${done ? 'text-green-700 line-through' : 'text-gray-800'}`}>{title}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ms-7">{desc}</p>
                    <div className="flex items-center gap-1 mt-2 ms-7">
                      <span className="text-xs text-green-600 font-medium">💧 {action.savingM3} {t('home_unit_m3')}</span>
                      <span className="text-xs text-gray-400">• {t('plan_estimate_note')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <Info size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">{t('plan_estimate_note')}</p>
        </div>

        {isDemo && <p className="text-xs text-center text-amber-600">⚠️ {t('demo_disclaimer')}</p>}
      </div>
    </PageShell>
  );
}
