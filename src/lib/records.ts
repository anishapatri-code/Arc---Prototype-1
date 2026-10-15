export type Habit = { id: string; name: string; detail: string; pillar: number; createdOn?: string };
export type Data = { habits: Habit[]; checks: Record<string, string[]>; notes: Record<string, string>; moods: Record<string, number>; water: Record<string, number> };
export const moodNames = ["Low", "A little off", "Okay", "Good", "Radiant"];
export function hasRecord(data: Data, date: string) {
  return Boolean(data.checks[date]?.length || data.notes[date]?.trim() || data.moods[date] !== undefined || data.water[date] !== undefined);
}
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function validateData(value: unknown): value is Data {
  if (!isObject(value) || !Array.isArray(value.habits)) return false;
  if (!value.habits.every(h => isObject(h) && typeof h.id === "string" && h.id.length > 0 && typeof h.name === "string" && typeof h.detail === "string" && Number.isInteger(h.pillar) && Number(h.pillar) >= 0 && Number(h.pillar) <= 2 && (h.createdOn === undefined || (typeof h.createdOn === "string" && validDate(h.createdOn))))) return false;
  if (new Set(value.habits.map(h => h.id)).size !== value.habits.length) return false;
  const fields = ["checks", "notes", "moods", "water"] as const;
  if (!fields.every(field => isObject(value[field]) && Object.keys(value[field]).every(validDate))) return false;
  const checks = value.checks as Record<string, unknown>;
  const ids = new Set(value.habits.map(h => h.id));
  return Object.values(checks).every(v => Array.isArray(v) && v.every(id => typeof id === "string" && ids.has(id)) && new Set(v).size === v.length)
    && Object.values(value.notes as Record<string, unknown>).every(v => typeof v === "string")
    && Object.values(value.moods as Record<string, unknown>).every(v => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 4)
    && Object.values(value.water as Record<string, unknown>).every(v => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 8);
}
// Restore missing entries while retaining the current device's entries on conflicting dates.
export function mergeRecords(current: Data, imported: Data): Data {
  const checks: Data["checks"] = { ...imported.checks, ...current.checks };
  for (const date of Object.keys(imported.checks)) checks[date] = [...new Set([...(current.checks[date] || []), ...imported.checks[date]])];
  return {
    habits: [...current.habits, ...imported.habits.filter(h => !current.habits.some(existing => existing.id === h.id))],
    checks, notes: { ...imported.notes, ...current.notes }, moods: { ...imported.moods, ...current.moods }, water: { ...imported.water, ...current.water },
  };
}
export function journalMarkdown(data: Data) {
  const dates = [...new Set([...Object.keys(data.checks), ...Object.keys(data.notes), ...Object.keys(data.moods), ...Object.keys(data.water)])].sort();
  return "# My Winter Arc · 2026\n\n" + dates.filter(date => hasRecord(data, date)).map(date => {
    const completed = data.checks[date] || [];
    return `## ${date}\n\n` + data.habits.map(h => `- [${completed.includes(h.id) ? "x" : " "}] ${h.name}`).join("\n")
      + `\n\nMood: ${data.moods[date] === undefined ? "Not logged" : moodNames[data.moods[date]]}\n\nWater: ${data.water[date] === undefined ? "Not logged" : `${data.water[date]} / 8 glasses`}\n\nReflection:\n\n${data.notes[date] || "No reflection recorded."}\n`;
  }).join("\n---\n\n");
}

export type LogField = "checks" | "notes" | "moods" | "water";
export type DeletedLog = { date: string; values: Partial<Pick<Data, LogField>> };
export function removeLogs(data: Data, date: string, fields: LogField[]) {
  const next = { ...data };
  const values: DeletedLog["values"] = {};
  for (const field of fields) {
    Object.assign(values, { [field]: { [date]: data[field][date] } });
    Object.assign(next, { [field]: { ...data[field] } });
    delete next[field][date];
  }
  return { next, deleted: { date, values } };
}
export function restoreLog(data: Data, deleted: DeletedLog): Data {
  const next = { ...data };
  const date = deleted.date;
  for (const field of Object.keys(deleted.values) as LogField[]) {
    const previous = deleted.values[field]?.[date];
    if (previous === undefined) continue;
    const restored = field === "checks" ? [...new Set([...(data.checks[date] || []), ...(previous as string[])])] : data[field][date] ?? previous;
    Object.assign(next, { [field]: { ...data[field], [date]: restored } });
  }
  return next;
}

export function removeHabits(data: Data, ids: string[]): Data {
  const removed = new Set(ids);
  const checks = Object.fromEntries(Object.entries(data.checks).map(([date, completed]) => [date, completed.filter(id => !removed.has(id))]));
  return { ...data, habits: data.habits.filter(habit => !removed.has(habit.id)), checks };
}
