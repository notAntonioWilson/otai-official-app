"use client";

import {
  Rocket, Trophy, Target, Star, Flame, Shield, Crown, Users,
  ChevronRight, Zap,
} from "lucide-react";

const TIERS = [
  {
    title: "Starting Point",
    subtitle: "Where every champion begins",
    color: "#1E3A5F",
    border: "#2563EB",
    icon: Rocket,
    stats: [
      { label: "Commission Rate", value: "20%" },
      { label: "Monthly Retaining", value: "3%" },
    ],
    body: null,
  },
  {
    title: "Monthly Winner Bonus",
    subtitle: "Compete to be #1",
    color: "#4C1D95",
    border: "#7C3AED",
    icon: Trophy,
    stats: [
      { label: "Reward", value: "+0.5%" },
      { label: "Type", value: "Permanent" },
    ],
    body: "The person with the most bookings at the end of each month gets a permanent 0.5% commission increase. Keep grinding!",
  },
  {
    title: "Level 1: The Consistent Performer",
    subtitle: "150 bookings per month",
    color: "#14532D",
    border: "#22C55E",
    icon: Target,
    stats: [
      { label: "Monthly Goal", value: "150" },
      { label: "Daily Target", value: "5 bookings" },
      { label: "Commission Increase", value: "+5%" },
    ],
    body: "That's just 5 bookings per day (assuming 30 days). You make 5 good calls, and you're hitting this target. This is achievable with focus and consistency.",
  },
  {
    title: "Level 2: Career Milestone",
    subtitle: "500 total bookings (lifetime)",
    color: "#7C2D12",
    border: "#F97316",
    icon: Star,
    stats: [
      { label: "Total Bookings", value: "500" },
      { label: "Commission Increase", value: "+5%" },
    ],
    body: null,
    unlocks: [
      "Permanent +5% commission increase on all future bookings",
      "Start hopping on sales calls and Zoom meetings",
      "Begin learning advanced closing techniques",
      "Access to exclusive closing training materials",
    ],
  },
  {
    title: "Level 3: Elite Status",
    subtitle: "500 bookings in a single month",
    color: "#7F1D1D",
    border: "#EF4444",
    icon: Flame,
    stats: [
      { label: "Monthly Goal", value: "500" },
      { label: "Daily Target", value: "~17 bookings" },
      { label: "Commission Increase", value: "+10%" },
    ],
    body: "Yes, this seems massive. That's about 17 bookings per day. But here's the truth: with the right systems, scripts, and hustle, this is absolutely possible. You just aren't good enough YET — emphasizing YET. You can be, and very quickly.",
  },
  {
    title: "Level 4: Closer Training",
    subtitle: "Owner approval required",
    color: "#134E4A",
    border: "#14B8A6",
    icon: Shield,
    stats: [
      { label: "New Commission", value: "+15%" },
      { label: "Monthly Retaining", value: "5%" },
    ],
    body: null,
    steps: [
      "After hitting your booking milestones, the owner will assess when you're ready",
      "You'll start as the main person on closing calls with supervision",
      "Once deemed ready, you can close calls independently",
      "+15% commission increase and 5% total recurring monthly commission",
    ],
  },
  {
    title: "Level 5: Master Closer",
    subtitle: "15 successful closes",
    color: "#713F12",
    border: "#EAB308",
    icon: Crown,
    stats: [
      { label: "Close Commission", value: "40%" },
      { label: "Recurring Commission", value: "10%" },
    ],
    body: "After closing 15 deals independently, you hit the highest individual commission tier. You're now earning 40% on closes and 10% recurring monthly. You're officially a master closer.",
  },
  {
    title: "Level 6: Team Leader",
    subtitle: "Build and lead your own sales team",
    color: "#6B1A1A",
    border: "#DC2626",
    icon: Users,
    stats: [],
    body: null,
    teamInfo: {
      intro: "At this level, you and the owner will work together to build and train your own team.",
      bullets: [
        "Every booking your team gets, you earn a percentage",
        "Every close your team gets, you earn a percentage",
        "You participate in all training and strategy sessions",
      ],
      example: "Your team of 10 people each books 10 people in a month = 100 bookings. They each close 10 deals = 100 closes. You earn a percentage of all 100 bookings AND all 100 closes every single month. This is where real wealth is built.",
    },
  },
];

function TierCard({ tier, index }: { tier: typeof TIERS[0]; index: number }) {
  const Icon = tier.icon;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${tier.border}30` }}>
      {/* Header */}
      <div className="p-5 flex items-center gap-4" style={{ backgroundColor: `${tier.color}40` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tier.border}20`, border: `1px solid ${tier.border}40` }}>
          <Icon size={22} style={{ color: tier.border }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {index > 0 && index < 7 && <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tier.border}20`, color: tier.border }}>{index <= 1 ? "Bonus" : `Level ${index - 1}`}</span>}
            <h3 className="text-white font-bold text-sm">{tier.title}</h3>
          </div>
          <p className="text-xs mt-0.5" style={{ color: `${tier.border}CC` }}>{tier.subtitle}</p>
        </div>
        <ChevronRight size={16} className="text-white/20 shrink-0" />
      </div>

      {/* Stats */}
      {tier.stats.length > 0 && (
        <div className="flex flex-wrap gap-4 px-5 py-4 border-b" style={{ borderColor: `${tier.border}15`, backgroundColor: `${tier.color}20` }}>
          {tier.stats.map((s, i) => (
            <div key={i}>
              <p className="text-[10px] text-otai-text-muted uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold" style={{ color: tier.border }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4 space-y-3" style={{ backgroundColor: `${tier.color}10` }}>
        {tier.body && <p className="text-sm text-otai-text-secondary leading-relaxed">{tier.body}</p>}

        {/* Unlocks list (Level 2) */}
        {"unlocks" in tier && tier.unlocks && (
          <div>
            <p className="text-xs font-semibold text-white mb-2">What this unlocks:</p>
            <div className="space-y-1.5">
              {tier.unlocks.map((u, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Zap size={12} style={{ color: tier.border }} className="shrink-0 mt-0.5" />
                  <span className="text-xs text-otai-text-secondary">{u}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps (Level 4) */}
        {"steps" in tier && tier.steps && (
          <div>
            <p className="text-xs font-semibold text-white mb-2">The path to closer:</p>
            <div className="space-y-1.5">
              {tier.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${tier.border}20`, color: tier.border }}>{i + 1}</span>
                  <span className="text-xs text-otai-text-secondary">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team info (Level 6) */}
        {"teamInfo" in tier && tier.teamInfo && (
          <div className="space-y-3">
            <p className="text-sm text-otai-text-secondary">{tier.teamInfo.intro}</p>
            <div>
              <p className="text-xs font-semibold text-white mb-2">How team commissions work:</p>
              <div className="space-y-1.5">
                {tier.teamInfo.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Zap size={12} style={{ color: tier.border }} className="shrink-0 mt-0.5" />
                    <span className="text-xs text-otai-text-secondary">{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4 mt-2" style={{ backgroundColor: `${tier.border}10`, border: `1px solid ${tier.border}20` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: tier.border }}>Example scenario:</p>
              <p className="text-xs text-otai-text-secondary leading-relaxed">{tier.teamInfo.example}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalesCommission() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy size={24} className="text-otai-gold" /> Commission & Ranking System
        </h1>
        <p className="text-otai-text-secondary text-sm mt-1">Your path from beginner to team leader</p>
      </div>

      <div className="space-y-4">
        {TIERS.map((tier, i) => (
          <TierCard key={i} tier={tier} index={i} />
        ))}
      </div>
    </div>
  );
}
