// src/components/FeatureGate.tsx
import React from 'react';
import { Lock } from 'lucide-react';

export type SubscriptionPlan = 'free' | 'silver' | 'gold' | 'premium';

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  free: 1,
  silver: 2,
  gold: 3,
  premium: 4,
};

interface FeatureGateProps {
  currentPlan: SubscriptionPlan;
  planExpiresAt: string | null;
  requiredPlan: SubscriptionPlan;
  children: React.ReactNode;
  moduleName: string;
}

export default function FeatureGate({ currentPlan, planExpiresAt, requiredPlan, children, moduleName }: FeatureGateProps) {
  // Check if membership window has expired
  const isExpired = planExpiresAt ? new Date(planExpiresAt) < new Date() : false;
  const hasAccess = !isExpired && PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative border border-dashed border-slate-800 bg-[#131A2E]/60 rounded-xl p-6 text-center flex flex-col items-center justify-center min-h-[200px] overflow-hidden">
      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-3 text-amber-500">
        <Lock size={18} />
      </div>
      <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
        {moduleName} Locked
      </h4>
      <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
        This resource is reserved for {requiredPlan.toUpperCase()} subscribers. Upgrade your current plan to unlock instantly.
      </p>
      <button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:opacity-90 transition-all">
        Unlock Now
      </button>
    </div>
  );
}