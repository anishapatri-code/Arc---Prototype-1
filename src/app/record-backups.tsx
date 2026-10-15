"use client";
import { useRef, useState } from "react";
import { type Data, journalMarkdown, mergeRecords, validateData } from "@/lib/records";

function download(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function RecordBackups({ data, onRestore }: { data: Data; onRestore: (data: Data) => boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Data | null>(null);
  const [message, setMessage] = useState("");
  const stamp = () => new Date().toISOString().slice(0, 10);
  return <section className="record-backups" aria-label="Your saved records">
    <div><span className="eyebrow">YOUR RECORDS, WITH YOU</span><h2>Keep a copy of your journey.</h2><p>Changes save automatically in this browser. Download a backup to restore your records later, or a readable journal to keep your reflections.</p><p className="storage-scope">Records belong to this website in this browser. Localhost and the live website have separate records; use a backup to move them. Clearing browser data removes the local copy.</p></div>
    <div className="backup-actions"><button className="outline-button" onClick={() => { download(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2), `arc-backup-${stamp()}.json`, "application/json"); setMessage("Backup downloaded."); }}>↓ Download backup</button><button className="outline-button" onClick={() => { download(journalMarkdown(data), `arc-journal-${stamp()}.md`, "text/markdown"); setMessage("Journal downloaded."); }}>↓ Download journal</button><button className="text-button" onClick={() => input.current?.click()}>Restore a backup ↗</button></div>
    <input ref={input} className="backup-file" type="file" accept=".json,application/json" aria-label="Choose Arc backup" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
      try { const backup: unknown = JSON.parse(await file.text()); if (!backup || typeof backup !== "object" || !("version" in backup) || backup.version !== 1 || !("data" in backup) || !validateData(backup.data)) throw new Error(); setPending(backup.data); setMessage(""); }
      catch { setMessage("This file is not a valid Arc backup. Your existing records have not changed."); }
    }}/>
    {pending && <div className="restore-review"><p>Restore {pending.habits.length} habits and the saved day entries from this backup? Completed habits are combined. Your current reflections, moods, and water logs take priority if the same day exists in both.</p><button className="primary-button" onClick={() => { if (onRestore(mergeRecords(data, pending))) { setMessage("Backup restored and saved on this device."); setPending(null); } else setMessage("Restore could not be saved. Download a backup before leaving this page."); }}>Restore records</button><button className="text-button" onClick={() => setPending(null)}>Cancel</button></div>}
    <p className="backup-message" role="status">{message}</p>
  </section>;
}
