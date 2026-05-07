import { useCredits, useProfile } from "@/hooks/useSupabaseData";
import type { PlanType } from "@/lib/credits";

export const usePlanAccess = () => {
  const { data: credits } = useCredits();
  const { data: profile } = useProfile();

  type CreditsMeta = {
    plan_status?: string;
    subscription_credits?: number;
    topup_credits?: number;
  };

  const creditMeta = credits as (typeof credits & CreditsMeta) | null | undefined;

  const plan = (credits?.plan_type ?? profile?.plan_type ?? 'none') as PlanType;
  const planStatus = creditMeta?.plan_status ?? 'none';
  const subscriptionCredits = creditMeta?.subscription_credits ?? 0;
  const topupCredits = creditMeta?.topup_credits ?? 0;
  const rolloverCredits = credits?.rollover_credits ?? 0;
  const totalCredits = subscriptionCredits + topupCredits + rolloverCredits;

  return {
    plan,
    planStatus,
    subscriptionCredits,
    topupCredits,
    rolloverCredits,
    totalCredits,
    hasSubscription: plan !== 'none' && planStatus === 'active',
    canUseFaceSwap: plan !== 'none',
    canRemoveWatermark: plan !== 'none',
    canUseBatch: ['creator', 'pro', 'studio'].includes(plan),
    canUseABTest: ['creator', 'pro', 'studio'].includes(plan),
    canUseScorer: ['creator', 'pro', 'studio'].includes(plan),
    canUsePriorityQueue: ['pro', 'studio'].includes(plan),
    canUseSmartEditor: plan !== 'none',
    canUseAPI: plan === 'studio',
    maxBrandKits: ({ none: 0, basic: 1, creator: 3, pro: 5, studio: 10 } as Record<string, number>)[plan] ?? 0,
    maxSavedFaces: ({ none: 0, basic: 1, creator: 3, pro: 5, studio: 10 } as Record<string, number>)[plan] ?? 0,
    maxBatchSize: ({ none: 0, basic: 0, creator: 5, pro: 10, studio: 20 } as Record<string, number>)[plan] ?? 0,
    availableModels: plan === 'none'
      ? ['schnell']
      : plan === 'basic'
        ? ['schnell', 'flux2', 'ideogram']
        : ['schnell', 'flux2', 'ideogram', 'kontext'],
  };
};
