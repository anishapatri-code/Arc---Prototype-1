"use client";
import { useState } from "react";
import { type Data, moodNames, removeLogs } from "@/lib/records";

export default function EditDayLog({ date, data, onSave, onClose }: { date: string; data: Data; onSave: (data: Data) => boolean; onClose: () => void }) {
  const [checks, setChecks] = useState(data.checks[date] || []);
  const [note, setNote] = useState(data.notes[date] || "");
  const [mood, setMood] = useState(data.moods[date] === undefined ? "" : String(data.moods[date]));
  const [water, setWater] = useState(data.water[date] === undefined ? "" : String(data.water[date]));
  return <div className="modal-overlay" onClick={onClose}><form className="modal edit-log-modal" role="dialog" aria-modal="true" aria-labelledby="edit-log-title" onClick={event => event.stopPropagation()} onSubmit={event => {
    event.preventDefault();
    const { next } = removeLogs(data, date, ["checks", "notes", "moods", "water"]);
    if (checks.length) next.checks[date] = checks;
    if (note.trim()) next.notes[date] = note;
    if (mood !== "") next.moods[date] = Number(mood);
    if (water !== "") next.water[date] = Number(water);
    if (onSave(next)) onClose();
  }}><button autoFocus type="button" className="modal-close" aria-label="Close log editor" onClick={onClose}>×</button><span className="eyebrow">YOUR DAY, YOUR RECORD</span><h2 id="edit-log-title">Edit log · {date}</h2><p className="edit-log-hint">Update this day’s entries. Your changes save when you select Save changes.</p><fieldset><legend>Completed habits</legend>{data.habits.map(habit => <label className="edit-habit-option" key={habit.id}><input type="checkbox" checked={checks.includes(habit.id)} onChange={event => setChecks(event.target.checked ? [...checks, habit.id] : checks.filter(id => id !== habit.id))}/>{habit.name}</label>)}</fieldset><div className="edit-check-ins"><div><label htmlFor="edit-mood">Mood</label><select id="edit-mood" value={mood} onChange={event => setMood(event.target.value)}><option value="">Not logged</option>{moodNames.map((name, index) => <option value={index} key={name}>{name}</option>)}</select></div><div><label htmlFor="edit-water">Water (glasses)</label><input id="edit-water" type="number" min={0} max={8} step={1} placeholder="Not logged" value={water} onChange={event => setWater(event.target.value)}/></div></div><label htmlFor="edit-note">Reflection</label><textarea id="edit-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Your reflection for this day…"/><div className="edit-log-actions"><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save changes</button></div></form></div>;
}
