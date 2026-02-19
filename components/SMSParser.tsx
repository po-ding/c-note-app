
import React, { useState } from 'react';
import { Sparkles, Clipboard, X, ArrowRight, Save, Copy, FileText, MapPin, Info } from 'lucide-react';
import { TransportRecord, LocationInfo } from '../types';
import { getTodayString, getCurrentTimeString } from '../utils';

interface Props {
  locations: Record<string, LocationInfo>;
  setLocations: React.Dispatch<React.SetStateAction<Record<string, LocationInfo>>>;
  onParsed: (records: TransportRecord[]) => void;
}

interface DraftRecord {
  id: string;
  from: { name: string; address: string; memo: string };
  to: { name: string; address: string; memo: string };
  time: string;
}

const SMSParser: React.FC<Props> = ({ locations, setLocations, onParsed }) => {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);

  const getFuzzyLocation = (rawName: string): { name: string; address: string; memo: string } => {
    const trimmed = rawName.trim();
    const result = { name: trimmed, address: '', memo: '' };
    if (trimmed.length < 1) return result;

    const storedNames = Object.keys(locations);
    const getNum = (s: string) => s.match(/\d+/)?.[0] || "";

    for (const stored of storedNames) {
      const storedNum = getNum(stored);
      const trimmedNum = getNum(trimmed);
      if (stored === trimmed) {
        return { name: stored, address: locations[stored].address, memo: locations[stored].memo };
      }
      const hasNumber = storedNum !== "" || trimmedNum !== "";
      const isNumMatch = hasNumber ? (storedNum === trimmedNum) : true;
      const isStringMatch = stored.includes(trimmed) || trimmed.includes(stored);
      if (isNumMatch && isStringMatch) {
        return { name: stored, address: locations[stored].address, memo: locations[stored].memo };
      }
    }
    return result;
  };

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const lines = text.split('\n');
    const newDrafts: DraftRecord[] = [];
    
    lines.forEach(line => {
      if (line.includes('[Web발신]') || line.includes('배차표') || line.includes('<--인식금지') || line.trim().length < 2) return;
      const parts = line.split(/\s*(?:->|~|➜|\s+)\s*/).filter(p => p.trim().length > 0);
      if (parts.length >= 2) {
        const cleanParts = parts.filter(p => 
          !p.startsWith('[') && !p.match(/^\d+호$/) && !p.includes('월') && !p.includes('일') && !p.match(/^\d{1,2}:\d{2}$/)
        );
        if (cleanParts.length >= 2) {
          newDrafts.push({
            id: Math.random().toString(36).substr(2, 9),
            from: getFuzzyLocation(cleanParts[0]),
            to: getFuzzyLocation(cleanParts[1]),
            time: '00:00'
          });
        }
      }
    });

    if (newDrafts.length > 0) setDrafts(newDrafts);
    else alert('분석 가능한 배차 내역을 찾지 못했습니다.');
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
      }
    } catch (err) {
      alert('클립보드 읽기 권한이 필요합니다.');
    }
  };

  const saveOne = (draft: DraftRecord) => {
    const locationUpdates: Record<string, LocationInfo> = {};
    if (draft.from.name.trim()) locationUpdates[draft.from.name.trim()] = { address: draft.from.address.trim(), memo: draft.from.memo.trim() };
    if (draft.to.name.trim()) locationUpdates[draft.to.name.trim()] = { address: draft.to.address.trim(), memo: draft.to.memo.trim() };
    if (Object.keys(locationUpdates).length > 0) setLocations(prev => ({ ...prev, ...locationUpdates }));

    const record: TransportRecord = {
      id: Date.now() + Math.random(),
      date: getTodayString(),
      time: '00:00',
      type: '화물운송',
      from: draft.from.name,
      to: draft.to.name,
      distance: 0, 
      income: 0, 
      cost: 0,
      liters: 0, 
      unitPrice: 0,
      memo: `[문자분석] ${draft.from.memo || ''} ${draft.to.memo || ''}`.trim(),
      start_gps: "", end_gps: "", brand: "기타",
      ureaLiters: 0, ureaUnitPrice: 0, ureaStation: "", supplyItem: "", mileage: 0, waitingTime: 0,
      isStarted: false 
    };
    onParsed([record]);
    setDrafts(prev => prev.filter(d => d.id !== draft.id));
  };

  const updateDraft = (id: string, field: 'from' | 'to', key: 'name' | 'address' | 'memo', value: string) => {
    setDrafts(prev => prev.map(d => {
      if (d.id === id) {
        let updated = { ...d[field], [key]: value };
        if (key === 'name') {
          const match = getFuzzyLocation(value);
          if (match.address || match.memo) {
            updated = { ...updated, address: match.address, memo: match.memo };
          }
        }
        return { ...d, [field]: updated };
      }
      return d;
    }));
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="w-full py-3 px-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-700 hover:bg-amber-100 shadow-sm transition-all">
        <div className="flex items-center gap-2 font-bold text-sm"><Sparkles size={16} className="text-amber-500" /> 배차 자동 등록</div>
        <Clipboard size={16} />
      </button>
    );
  }

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-4 shadow-md animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
           <button onClick={handlePaste} className="bg-white border border-amber-300 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 active:scale-95"><Copy size={10}/> 붙여넣기</button>
        </div>
        <button onClick={() => { setIsOpen(false); setDrafts([]); }} className="text-amber-400 p-1 hover:text-amber-600 transition-colors"><X size={20} /></button>
      </div>
      <textarea 
        className="w-full h-32 p-3 rounded-xl border-amber-200 border bg-white text-sm outline-none font-sans leading-relaxed focus:ring-2 focus:ring-amber-300 transition-all" 
        placeholder="배차 문자를 여기에 붙여넣으세요..." 
        value={text} 
        onChange={e => setText(e.target.value)} 
      />
      <button onClick={handleAnalyze} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold shadow-sm active:scale-95 transition-all">분석 실행</button>
      
      {drafts.length > 0 && (
        <div className="mt-4 space-y-6 max-h-[400px] overflow-y-auto pr-1">
          {drafts.map((draft) => (
            <div key={draft.id} className="bg-white border-t-4 border-amber-400 rounded-xl p-4 shadow-sm relative space-y-4">
              <button onClick={() => setDrafts(p => p.filter(d => d.id !== draft.id))} className="absolute -top-3 -right-2 bg-white border rounded-full p-1 text-slate-400 shadow-sm active:scale-90"><X size={14} /></button>
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 border-b pb-1">
                    <MapPin size={12} className="text-blue-500" />
                    <input className="w-full text-sm font-bold border-none p-0 focus:ring-0 text-blue-600 outline-none" value={draft.from.name} onChange={e => updateDraft(draft.id, 'from', 'name', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded">
                    <FileText size={10} className="text-slate-400" />
                    <input placeholder="주소" className="w-full text-[10px] bg-transparent outline-none" value={draft.from.address} onChange={e => updateDraft(draft.id, 'from', 'address', e.target.value)} />
                  </div>
                </div>
                <div className="pt-10"><ArrowRight size={16} className="text-slate-300" /></div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 border-b pb-1">
                    <MapPin size={12} className="text-emerald-500" />
                    <input className="w-full text-sm font-bold border-none p-0 focus:ring-0 text-emerald-600 outline-none" value={draft.to.name} onChange={e => updateDraft(draft.id, 'to', 'name', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded">
                    <FileText size={10} className="text-slate-400" />
                    <input placeholder="주소" className="w-full text-[10px] bg-transparent outline-none" value={draft.to.address} onChange={e => updateDraft(draft.id, 'to', 'address', e.target.value)} />
                  </div>
                </div>
              </div>
              <button onClick={() => saveOne(draft)} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black text-sm shadow-md active:scale-95 flex items-center justify-center gap-2"><Save size={16} /> 등록</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SMSParser;
