import type { Data, Habit } from "./records";

const start = "2026-10-03";
const end = "2026-12-31";
export function shiftDate(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10);
}
export function eligible(habit: Habit, date: string) { return !habit.createdOn || habit.createdOn <= date; }
export function consistency(data: Data, today: string, period: 7 | 30 | 90) {
  const through = today < end ? today : end;
  const from = period === 90 ? start : [start, shiftDate(through, -(period - 1))].sort().at(-1)!;
  const dates: string[] = [];
  if (through >= start) for (let date = from; date <= through; date = shiftDate(date, 1)) dates.push(date);
  const days = dates.map(date => {
    const habits = data.habits.filter(h => eligible(h, date));
    const completed = new Set(data.checks[date] || []);
    const count = habits.filter(h => completed.has(h.id)).length;
    return { date, count, possible: habits.length, rate: habits.length ? count / habits.length * 100 : 0,
      pillars: [0, 1, 2].map(pillar => habits.filter(h => h.pillar === pillar && completed.has(h.id)).length) };
  });
  const habits = data.habits.map(habit => {
    const possible = dates.filter(date => eligible(habit, date)).length;
    const count = dates.filter(date => eligible(habit, date) && data.checks[date]?.includes(habit.id)).length;
    return { ...habit, possible, count, rate: possible ? count / possible * 100 : 0 };
  });
  const pillars = [0, 1, 2].map(pillar => {
    const grouped = habits.filter(h => h.pillar === pillar);
    const possible = grouped.reduce((sum, h) => sum + h.possible, 0);
    const count = grouped.reduce((sum, h) => sum + h.count, 0);
    return { pillar, possible, count, rate: possible ? count / possible * 100 : 0, habitCount: grouped.length };
  });
  const count = days.reduce((sum, d) => sum + d.count, 0);
  const possible = days.reduce((sum, d) => sum + d.possible, 0);
  const activeDays = days.filter(d => d.count > 0).length;
  const fullDays = days.filter(d => d.possible > 0 && d.count === d.possible).length;
  const ranked = pillars.filter(p => p.possible > 0).sort((a, b) => a.rate - b.rate);
  const lowest = count ? ranked.filter(p => p.rate === ranked[0]?.rate) : [];
  const highest = count ? ranked.filter(p => p.rate === ranked.at(-1)?.rate) : [];
  return { from, through, days, habits, pillars, count, possible, activeDays, fullDays, lowest, highest, rate: possible ? count / possible * 100 : 0 };
}
