import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const CUET_DOMAINS = [
  'Accountancy/Book-Keeping',
  'Agriculture',
  'Anthropology',
  'Biology/Biological Science/Biotechnology/Biochemistry',
  'Business Studies',
  'Chemistry',
  'Environmental Science',
  'Computer Science/Information Practices',
  'Economics/Business Economics',
  'Fine/Visual/Commercial Arts',
  'Geography/Geology',
  'History',
  'Home Science',
  'Knowledge Traditions–Practices in India',
  'Mass Media/Mass Communication',
  'Mathematics/Applied Mathematics',
  'Performing Arts (Dance/Drama/Music)',
  'Physical Education (Yoga, Sports)',
  'Physics',
  'Political Science',
  'Psychology',
  'Sanskrit',
  'Sociology'
];

const CUETSyllabus: React.FC = () => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [year, setYear] = useState('2025');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>('Ready. Select subjects and click "Fetch & Store".');
  const [lastResult, setLastResult] = useState<{ success: boolean; count: number; message: string } | null>(null);

  const appendLog = (s: string) => setLog(prev => `${prev}\n${s}`);
  const setResult = (success: boolean, count: number, message: string) => setLastResult({ success, count, message });

  const toggle = (s: string, on: boolean) => {
    setSubjects(prev => on ? Array.from(new Set([...prev, s])) : prev.filter(x => x !== s));
  };

  const selectAll = () => { setSubjects([...CUET_DOMAINS]); setResult(null, 0, ''); };
  const clearAll = () => { setSubjects([]); setResult(null, 0, ''); };

  const fetchAndStore = async () => {
    if (subjects.length === 0) { setResult(false, 0, 'Please select at least one subject'); return; }
    setLoading(true);
    setLog('');
    setResult(null, 0, '');
    try {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL not set');
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      appendLog(`Calling cuet-syllabus-fetch for ${subjects.length} subjects (${year})…`);
      const res = await fetch(`${supabaseUrl}/functions/v1/cuet-syllabus-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ subjects, year })
      });
      const text = await res.text();
      appendLog(`Edge response ${res.status}: ${text.slice(0, 500)}…`);
      if (!res.ok) throw new Error(text);
      const json = JSON.parse(text);
      const items: any[] = Array.isArray(json?.items) ? json.items : [];
      appendLog(`Received ${items.length} syllabus items. Storing to cuet_syllabi…`);

      let saved = 0;
      for (const it of items) {
        const row = {
          subject: it.subject || 'Unknown',
          year: String(it.year || year),
          topics: it.topics || [],
          sources: it.sources || [],
        } as any;
        const { error } = await supabase.from('cuet_syllabi').upsert(row, { onConflict: 'subject,year' });
        if (error) { appendLog(`⚠️ Failed: ${row.subject} — ${error.message}`); continue; }
        saved++;
        appendLog(`✅ Saved: ${row.subject} (${row.year})`);
      }
      appendLog(`Done. ${saved}/${items.length} saved.`);
      setResult(true, saved, `${saved} syllabus records stored for ${year}`);
    } catch (e: any) {
      appendLog(`❌ Error: ${e?.message || e}`);
      setResult(false, 0, e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">CUET SYLLABUS</h1>
            <p className="text-black/60 font-bold uppercase tracking-widest text-sm mt-1">Fetch & store official CUET domain syllabi via AI</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">v1.0</span>
          </div>
        </div>

        <div className="neo-card bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-base font-black uppercase tracking-tighter text-black">SELECT CUET DOMAINS</label>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} disabled={loading} className="px-3 py-1.5 rounded bg-neo-secondary border-2 border-black font-black uppercase text-[10px] tracking-widest hover:bg-yellow-300 active:scale-95 transition-all">
                    Select All
                  </button>
                  <button type="button" onClick={clearAll} disabled={loading} className="px-3 py-1.5 rounded bg-neo-muted border-2 border-black font-black uppercase text-[10px] tracking-widest hover:bg-purple-300 active:scale-95 transition-all">
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-auto p-4 rounded border-2 border-black bg-neo-bg">
                {CUET_DOMAINS.map(d => {
                  const checked = subjects.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-2 text-black cursor-pointer group">
                      <input type="checkbox" checked={checked} onChange={(e) => toggle(d, e.target.checked)} className="w-4 h-4 accent-neo-accent border-2 border-black rounded" />
                      <span className="text-sm font-medium group-hover:underline">{d}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block mb-2 text-base font-black uppercase tracking-tighter text-black">YEAR</label>
              <input className="w-full px-4 py-3 bg-white border-4 border-black font-mono text-lg text-black focus:outline-none focus:ring-2 focus:ring-neo-accent" value={year} onChange={e => setYear(e.target.value)} disabled={loading} />
            </div>
            <div className="flex items-end gap-2">
              <button className="w-full bg-neo-accent text-black px-6 py-4 font-black uppercase text-lg border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[8px_8px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-0" disabled={loading} onClick={fetchAndStore}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-6 h-6 animate-spin" /> WORKING…</span>
                ) : (
                  <span className="flex items-center justify-center gap-2"><Download className="w-5 h-5" /> FETCH & STORE</span>
                )}
              </button>
            </div>
          </div>

          {lastResult && (
            <div className={`mt-4 p-4 rounded border-4 ${lastResult.success ? 'bg-green-50 border-green-700' : 'bg-red-50 border-red-700'}`}>
              <div className="flex items-center gap-3">
                {lastResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-700" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-700" />
                )}
                <div>
                  <p className="font-black uppercase tracking-tight text-black">{lastResult.message}</p>
                  {lastResult.success && lastResult.count > 0 && (
                    <p className="text-sm text-black/60">{lastResult.count} records processed</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs font-mono whitespace-pre-wrap text-black/70 max-h-96 overflow-auto border-2 border-black rounded p-3 bg-neo-bg font-[JetBrains_Mono]">
            {log}
          </div>
        </div>

        <div className="neo-card bg-white text-center">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-3 text-black">HOW IT WORKS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-black/80">
            <div className="p-3 bg-neo-bg border-2 border-black rounded">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 text-neo-accent" />
              <p className="font-bold uppercase tracking-tight">1. SELECT</p>
              <p>Choose CUET domains & year</p>
            </div>
            <div className="p-3 bg-neo-bg border-2 border-black rounded">
              <Download className="w-6 h-6 mx-auto mb-2 text-neo-accent" />
              <p className="font-bold uppercase tracking-tight">2. FETCH</p>
              <p>Edge Function calls Tavily + OpenAI</p>
            </div>
            <div className="p-3 bg-neo-bg border-2 border-black rounded">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-neo-accent" />
              <p className="font-bold uppercase tracking-tight">3. STORE</p>
              <p>Saves to <code>cuet_syllabi</code> table</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CUETSyllabus;