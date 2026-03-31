/** Watch-time badges (unlocked when totalMinutes >= minMinutes). */
export const WATCH_BADGES = [
  { id: "first-frame", minMinutes: 0, title: "First Frame", blurb: "The projector hums. You showed up." },
  { id: "snack-tier", minMinutes: 120, title: "Snack-Tier Stamina", blurb: "Two hours in — commitment without the commitment." },
  { id: "gravity-well", minMinutes: 600, title: "Weekend Gravity Well", blurb: "Ten+ hours. The couch has filed for joint custody." },
  { id: "solar-day", minMinutes: 1440, title: "Solar Reel Day", blurb: "A full day of screen time. The sun is jealous." },
  { id: "century-sit", minMinutes: 6000, title: "Century Sit", blurb: "100+ hours. You could’ve learned the accordion. You chose wisely." },
  { id: "marathon-cortex", minMinutes: 30000, title: "Marathon Cortex", blurb: "500+ hours. Your brain is mostly aspect ratios now." },
  { id: "screen-legend", minMinutes: 60000, title: "Screen Legend", blurb: "1,000+ hours. Letterboxd whispers your name in corridors." },
];

/**
 * @param {number} totalMinutes
 * @returns {{ badge: typeof WATCH_BADGES[0], unlocked: boolean }[]}
 */
export function badgesWithUnlockState(totalMinutes) {
  const m = Math.max(0, Number(totalMinutes) || 0);
  return WATCH_BADGES.map((badge) => ({
    badge,
    unlocked: m >= badge.minMinutes,
  }));
}

export function unlockedBadgeCount(totalMinutes) {
  return badgesWithUnlockState(totalMinutes).filter((x) => x.unlocked).length;
}
