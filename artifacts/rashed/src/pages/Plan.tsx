import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Leaf, CheckSquare, Square, Info, Loader2, Sparkles, Target } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { DemoBadge } from '@/components/DemoBadge';
import { useI18n } from '@/lib/i18n';
import { api, type PlanAction } from '@/lib/api';

// ── Static fallback actions ─────────────────────────────────────────────────
const FALLBACK_ACTIONS: PlanAction[] = [
  { id: 1, icon: '🔧', title_ar: 'تحقق من التسربات الداخلية', title_en: 'Check for internal leaks', description_ar: 'افحص الأنابيب تحت المغاسل وصمامات المراحيض', description_en: 'Inspect pipes under sinks and toilet valves', saving_m3: 3.5, category: 'leak', priority: 1 },
  { id: 2, icon: '🌿', title_ar: 'قلل ري الحديقة 20%', title_en: 'Reduce garden irrigation by 20%', description_ar: 'ري الصباح الباكر يقلل التبخر بشكل كبير', description_en: 'Early morning watering significantly reduces evaporation', saving_m3: 2.0, category: 'irrigation', priority: 2 },
  { id: 3, icon: '🚿', title_ar: 'راجع مدة الاستحمام', title_en: 'Review shower duration', description_ar: 'تقليل دقيقتين يوفر 20 لتراً لكل مرة', description_en: 'Reducing by 2 minutes saves 20L each time', saving_m3: 1.5, category: 'behavior', priority: 3 },
  { id: 4, icon: '🏠', title_ar: 'اضبط مستوى خزان المرحاض', title_en: 'Adjust toilet tank level', description_ar: 'تقليل حجم التفريغ بـ 0.5 لتر يوفر 50%', description_en: 'Reducing flush volume by 0.5L saves 50%', saving_m3: 1.0, category: 'appliance', priority: 4 },
  { id: 5, icon: '🔩', title_ar: 'افحص الحنفيات والخلاطات', title_en: 'Check taps and mixers', description_ar: 'أي تقطير بطيء قد يضيع مئات اللترات شهرياً', description_en: 'Even a slow drip can waste hundreds of liters monthly', saving_m3: 0.8, category: 'leak', priority: 5 },
];

const GOAL_OPTIONS = [10, 15, 20, 25, 30];
const CATEGORY_ICONS: Record<string, string> = {
  leak: '🔧', irrigation: '🌿', behavior: '🚿', appliance: '🏠', general: '💡',
};

export default function Plan() {
  const { t, isRtl, lang } = useI18n();
  const { data: analysis } = useQuery({ queryKey: ['analysis-latest'], queryFn: api.dashboard.getLatestAnalysis });
  const { data: dbRecs } = useQuery({ queryKey: ['plan-recommendations'], queryFn: api.plan.getRecommendations });

  const [goalPercent, setGoalPercent] = useState(15);
  const [completed, setCompleted] = useState<number[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<{ actions: PlanAction[]; summaryAr: string; summaryEn: string; savings: { savingM3: number; savingSar: number } | null } | null>(null);

  const isDemo = analysis?.dataClassification === 'synthetic_demo_data';

  const generatePlan = useMutation({
    mutationFn: () => api.plan.generate({ goalPercent, language: lang }),
    onSuccess: (data) => {
      setGeneratedPlan(data);
      setCompleted([]);
    },
  });

  // Build action list: prefer generated plan > DB recs > fallback
  const actions: PlanAction[] = generatedPlan?.actions.length
    ? generatedPlan.actions
    : dbRecs && dbRecs.length > 0
      ? dbRecs.map((r, i) => ({
          id: r.id,
          icon: CATEGORY_ICONS[r.category] ?? '💡',
          title_ar: r.titleAr,
          title_en: r.titleEn,
          description_ar: r.descriptionAr ?? '',
          description_en: r.descriptionEn ?? '',
          saving_m3: r.estimatedWaterSavingM3 ?? 1.0,
          category: r.category,
          priority: r.priority,
        }))
      : FALLBACK_ACTIONS;

  const totalSavingM3 = actions
    .filter((a) => completed.includes(a.id))
    .reduce((s, a) => s + (a.saving_m3 ?? 0), 0);

  const plannedSavingM3 = generatedPlan?.savings?.savingM3 ?? null;
  const plannedSavingSar = generatedPlan?.savings?.savingSar ?? null;

  const goalLabel = isRtl ? `خفض الاستهلاك ${goalPercent}%` : `Reduce consumption by ${goalPercent}%`;

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{t('plan_title')}</h1>
          {isDemo && <DemoBadge />}
        </div>

        {/* Goal selector */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Target size={18} className="text-blue-600" />
            <p className="font-semibold text-gray-800 text-sm">{isRtl ? 'اختر هدف التوفير' : 'Select Your Savings Goal'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => { setGoalPercent(g); setGeneratedPlan(null); setCompleted([]); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${goalPercent === g ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
              >
                {g}%
              </button>
            ))}
          </div>

          <button
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending || !analysis?.currentConsumptionM3}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {generatePlan.isPending
              ? <><Loader2 size={18} className="animate-spin" /> {isRtl ? 'جارٍ إنشاء الخطة...' : 'Generating plan...'}</>
              : <><Sparkles size={18} /> {isRtl ? 'إنشاء خطة بالذكاء الاصطناعي' : 'Generate AI Plan'}</>
            }
          </button>
          {generatePlan.isError && (
            <p className="text-xs text-red-500 text-center">
              {isRtl ? 'حدث خطأ. حاول مرة أخرى.' : 'Generation failed. Please try again.'}
            </p>
          )}
        </div>

        {/* Goal card */}
        <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Leaf size={20} />
            <p className="font-semibold">{t('plan_goal')}</p>
          </div>
          <p className="text-2xl font-bold">{goalLabel}</p>
          {generatedPlan?.summaryAr && (
            <p className="text-green-200 text-sm mt-2 leading-relaxed">
              {lang === 'ar' ? generatedPlan.summaryAr : generatedPlan.summaryEn}
            </p>
          )}
          {(plannedSavingM3 != null || completed.length > 0) && (
            <div className="mt-3 pt-3 border-t border-green-500 grid grid-cols-2 gap-3">
              {plannedSavingM3 != null && (
                <div>
                  <p className="text-green-300 text-xs">{isRtl ? 'التوفير المتوقع' : 'Expected saving'}</p>
                  <p className="text-white font-bold">{plannedSavingM3.toFixed(1)} {t('savings_m3')}</p>
                </div>
              )}
              {plannedSavingSar != null && (
                <div>
                  <p className="text-green-300 text-xs">{isRtl ? 'تكلفة مُوفَّرة*' : 'Cost saved*'}</p>
                  <p className="text-white font-bold">{plannedSavingSar.toFixed(1)} {t('savings_sar')}</p>
                </div>
              )}
              {completed.length > 0 && (
                <div className="col-span-2">
                  <p className="text-green-200 text-sm">{t('plan_water_saving')}: {totalSavingM3.toFixed(1)} {t('home_unit_m3')}</p>
                </div>
              )}
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
            const title = lang === 'ar' ? action.title_ar : action.title_en;
            const desc = lang === 'ar' ? action.description_ar : action.description_en;
            const icon = action.icon || CATEGORY_ICONS[action.category] || '💡';
            return (
              <div key={action.id} className={`bg-white rounded-2xl p-4 border transition-colors ${done ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setCompleted((c) => done ? c.filter((x) => x !== action.id) : [...c, action.id])}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {done ? <CheckSquare size={22} className="text-green-600" /> : <Square size={22} className="text-gray-300" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{icon}</span>
                      <p className={`text-sm font-semibold ${done ? 'text-green-700 line-through' : 'text-gray-800'}`}>{title}</p>
                    </div>
                    {desc && <p className="text-xs text-gray-500 mt-1 ms-7">{desc}</p>}
                    <div className="flex items-center gap-1 mt-2 ms-7">
                      <span className="text-xs text-green-600 font-medium">💧 {action.saving_m3?.toFixed(1) ?? '?'} {t('home_unit_m3')}</span>
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
