"use client";

import {
  Target, Trophy, TrendingUp, Zap, Award, Crown, Users, Rocket,
} from "lucide-react";

export default function SalesCommission() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Commission &amp; Ranking System</h1>
        <p className="text-otai-text-secondary mt-1">Your path from beginner to team leader</p>
      </div>

      <div className="space-y-6">
        {/* Starting Point */}
        <LevelCard
          icon={Target} title="Starting Point" subtitle="Where every champion begins"
          gradient="from-purple-500/20 to-purple-900/10" border="border-purple-500/30" accent="text-purple-400"
          stats={[{ label: "Commission Rate", value: "20%" }, { label: "Monthly Retaining", value: "3%" }]}
        />

        {/* Monthly Winner Bonus */}
        <LevelCard
          icon={Trophy} title="Monthly Winner Bonus" subtitle="Compete to be #1"
          gradient="from-purple-600/20 to-purple-900/10" border="border-purple-500/30" accent="text-purple-400"
          stats={[{ label: "Top Performer Each Month", value: "+0.5%" }]}
          detailText="The person with the most bookings at the end of each month gets a permanent 0.5% commission increase. Keep grinding!"
          detailColor="text-purple-300"
        />

        {/* Level 1 */}
        <LevelCard
          icon={TrendingUp} title="Level 1: The Consistent Performer" subtitle="150 bookings per month"
          gradient="from-green-500/10 to-green-900/5" border="border-green-500/20" accent="text-green-400"
          stats={[{ label: "Monthly Goal", value: "150 bookings" }, { label: "Daily Target", value: "5 bookings" }, { label: "Commission Increase", value: "+5%" }]}
          detailTitle="Breaking it down:" detailColor="text-green-300"
          detailText="That's just 5 bookings per day (assuming 30 days). You make 5 good calls, and you're hitting this target. This is achievable with focus and consistency."
        />

        {/* Level 2 */}
        <LevelCard
          icon={Zap} title="Level 2: Career Milestone" subtitle="500 total bookings (lifetime)"
          gradient="from-orange-500/10 to-orange-900/5" border="border-orange-500/20" accent="text-orange-400"
          stats={[{ label: "Total Bookings Milestone", value: "500" }, { label: "Commission Increase", value: "+5%" }]}
          detailTitle="What this unlocks:" detailColor="text-orange-300"
          detailList={[
            "Permanent +5% commission increase on all future bookings",
            "You can now start hopping on sales calls and Zoom meetings",
            "Begin learning advanced closing techniques",
            "Access to exclusive closing training materials",
          ]}
        />

        {/* Level 3 */}
        <LevelCard
          icon={Award} title="Level 3: Elite Status" subtitle="500 bookings in a single month"
          gradient="from-red-500/10 to-red-900/5" border="border-red-500/20" accent="text-red-400"
          stats={[{ label: "Monthly Goal", value: "500 bookings" }, { label: "Daily Target", value: "~17 bookings" }, { label: "Commission Increase", value: "+10%" }]}
          detailTitle="This is where legends are made:" detailColor="text-red-300"
          detailText="Yes, this seems massive. That's about 17 bookings per day. But here's the truth: with the right systems, scripts, and hustle, this is absolutely possible. I could get 300+ bookings in 30 days if I had 5 hours a day to call. You just aren't good enough YET – emphasizing YET. You can be, and very quickly."
        />

        {/* Level 4 */}
        <LevelCard
          icon={Target} title="Level 4: Closer Training" subtitle="Owner approval required"
          gradient="from-cyan-500/10 to-cyan-900/5" border="border-cyan-500/20" accent="text-cyan-400"
          stats={[{ label: "New Commission Rate", value: "+15%" }, { label: "Monthly Retaining", value: "5%" }]}
          detailTitle="The path to closer:" detailColor="text-cyan-300"
          detailList={[
            "After hitting your booking milestones, I (the owner) will assess when you're ready",
            "You'll start as the main person on closing calls with my supervision",
            "Once I deem you ready, you can close calls yourself independently",
            "At this stage, you receive a +15% commission increase and 5% total recurring monthly commission",
          ]}
          numbered
        />

        {/* Level 5 */}
        <LevelCard
          icon={Crown} title="Level 5: Master Closer" subtitle="15 successful closes"
          gradient="from-yellow-500/10 to-yellow-900/5" border="border-yellow-500/20" accent="text-yellow-400"
          stats={[{ label: "Close Commission", value: "40%" }, { label: "Recurring Commission", value: "10%" }]}
          detailTitle="This is the big leagues:" detailColor="text-yellow-300"
          detailText="After closing 15 deals independently, you hit the highest individual commission tier. You're now earning 40% on closes and 10% recurring monthly. You're officially a master closer."
        />

        {/* Level 6 */}
        <div className="bg-gradient-to-br from-pink-500/10 to-pink-900/5 border border-pink-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center text-pink-400">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Level 6: Team Leader</h2>
              <p className="text-otai-text-secondary text-sm">Build and lead your own sales team</p>
            </div>
          </div>
          <div className="bg-black/20 border border-white/5 rounded-xl p-5 mb-4">
            <p className="text-white font-semibold">You&apos;re now eligible to train a sales team</p>
            <p className="text-otai-text-secondary text-sm mt-1">At this level, you and I will work together to build and train your own team.</p>
          </div>
          <div className="bg-black/20 border border-white/5 rounded-xl p-5">
            <p className="text-pink-300 font-semibold text-sm mb-2">How team commissions work:</p>
            <div className="space-y-2">
              {["Every booking your team gets, you earn a percentage", "Every close your team gets, you earn a percentage", "You participate in all training and strategy sessions"].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-otai-text-secondary">
                  <span className="text-pink-400 shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-pink-300 font-semibold text-sm mb-1">Example scenario:</p>
              <p className="text-otai-text-secondary text-sm leading-relaxed">
                Your team of 10 people each books 10 people in a month = 100 bookings. They each close 10 deals = 100 closes. You earn a percentage of all 100 bookings AND all 100 closes every single month. This is where real wealth is built.
              </p>
            </div>
          </div>
        </div>

        {/* Remember This */}
        <div className="bg-gradient-to-br from-purple-600/15 to-indigo-900/10 border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center text-purple-400">
              <Rocket size={22} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Remember This</h2>
              <p className="text-otai-text-secondary text-sm">The only difference between you and success</p>
            </div>
          </div>
          <div className="bg-black/20 border border-white/5 rounded-xl p-5">
            <p className="text-otai-text-secondary text-sm leading-relaxed">
              &ldquo;These numbers might seem big to you right now, but I could easily get 300 bookings in the next 30 days if I had 5 hours a day to call. You just{" "}
              <span className="text-white font-bold uppercase">AREN&apos;T GOOD ENOUGH YET</span>{" "}
              &ndash; emphasizing <span className="text-white font-semibold underline">YET</span>. You can be, and very quickly. The only thing standing between you and these numbers is consistency, training, and refusing to quit.&rdquo;
            </p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-otai-text-muted text-sm text-center italic">
                Every master was once a beginner. Every closer started with zero experience. The difference? They didn&apos;t stop.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LevelCard({
  icon: Icon, title, subtitle, gradient, border, accent, stats, detailTitle, detailText, detailColor, detailList, numbered,
}: {
  icon: typeof Target; title: string; subtitle: string; gradient: string; border: string; accent: string;
  stats?: { label: string; value: string }[];
  detailTitle?: string; detailText?: string; detailColor?: string;
  detailList?: string[]; numbered?: boolean;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-6`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center ${accent}`}>
          <Icon size={22} />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <p className="text-otai-text-secondary text-sm">{subtitle}</p>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className={`bg-black/20 border border-white/5 rounded-xl p-5 mb-4 grid gap-4 ${
          stats.length === 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1"
        }`}>
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-otai-text-muted text-xs mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${accent}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {(detailTitle || detailText || detailList) && (
        <div className="bg-black/20 border border-white/5 rounded-xl p-5">
          {detailTitle && <p className={`font-semibold text-sm mb-2 ${detailColor || "text-white"}`}>{detailTitle}</p>}
          {detailText && <p className="text-otai-text-secondary text-sm leading-relaxed">{detailText}</p>}
          {detailList && (
            <div className="space-y-2 mt-1">
              {detailList.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-otai-text-secondary">
                  <span className={`${accent} shrink-0 mt-0.5 text-xs`}>{numbered ? `${i + 1}.` : "•"}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
