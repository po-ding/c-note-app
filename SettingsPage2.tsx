
import React, { useState, useMemo, useEffect } from 'react';
import { 
  TransportRecord, 
  LocationInfo, 
  FixedExpense, 
  SalaryRecord 
} from '../types';
import { 
  MapPin, 
  Trash2, 
  Edit2,
  Download, 
  Upload, 
  FileText,
  ChevronDown, 
  ChevronUp,
  Database,
  DollarSign,
  Key,
  CheckCircle,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import { getTodayString, formatToManwon } from '../utils';

// --- 외부 컴포넌트 선언 (리렌더링 시 포커스 잃음 방지) ---

const StatCard = ({ label, value, unit, color = "text-slate-800", highlight = false }: any) => (
  <div className={`bg-white p-2 rounded-xl border flex flex-col items-center justify-center shadow-sm min-h-[72px] transition-all ${highlight ? 'border-blue-400 ring-2 ring-blue-50 bg-blue-50/10' : 'border-slate-100'}`}>
    <span className="text-[9px] font-bold text-slate-400 mb-1">{label}</span>
    <div className="flex items-baseline gap-0.5">
      <span className={`text-[13px] font-black ${color}`}>{value}</span>
      <span className="text-[9px] font-bold text-slate-400">{unit}</span>
    </div>
  </div>
);

const StatGrid = ({ title, stats }: { title: string, stats: any }) => (
  <div className="space-y-3">
    <h3 className="text-center text-[11px] font-black text-slate-600 uppercase tracking-widest">{title}</h3>
    <div className="grid grid-cols-4 gap-2">
      <StatCard label="운행일수" value={stats.workDays} unit="일" />
      <StatCard label="운행건수" value={stats.trips} unit="건" />
      <StatCard label="총 운행거리" value={Math.round(stats.distance).toLocaleString()} unit="km" />
      <StatCard label="총수입" value={formatToManwon(stats.income)} unit="만원" color="text-emerald-600" />
      <StatCard label="총지출" value={formatToManwon(stats.expense)} unit="만원" color="text-red-500" />
      <StatCard label="정산 금액" value={formatToManwon(stats.net)} unit="만원" highlight color={stats.net >= 0 ? "text-blue-600" : "text-red-500"} />
      <StatCard label="평균 연비" value={stats.avgEfficiency} unit="km/L" />
      <StatCard label="공차 거리" value={stats.emptyDistance.toFixed(1)} unit="km" color="text-orange-600" />
    </div>
  </div>
);

const Section = ({ id, title, icon: Icon, activeSection, setActiveSection, children }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
    <button 
      onClick={() => setActiveSection(activeSection === id ? null : id)}
      className={`w-full p-4 flex justify-between items-center transition-all ${activeSection === id ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={activeSection === id ? 'text-blue-600' : 'text-slate-400'} />
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      </div>
      {activeSection === id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
    {activeSection === id && <div className="p-4 border-t border-slate-100 space-y-4">{children}</div>}
  </div>
);

const SettingsPage2: React.FC<any> = ({ 
  records, setRecords,
  locations, setLocations, 
  fixedExpenses, setFixedExpenses,
  salaryRecords, setSalaryRecords,
  onOpenReport,
  onManualBackup
}) => {
  const [activeSection, setActiveSection] = useState<string | null>('finance');
  const [financeTab, setFinanceTab] = useState<'salary' | 'fixed' | 'general'>('salary');

  // Form States
  const [salDate, setSalDate] = useState(getTodayString());
  const [salAmount, setSalAmount] = useState('');
  const [salMemo, setSalMemo] = useState('');
  const [editingSalId, setEditingSalId] = useState<number | null>(null);

  const [expDate, setExpDate] = useState(getTodayString());
  const [expName, setExpName] = useState('');
  const [expCost, setExpCost] = useState('');
  const [expRepeat, setExpRepeat] = useState(true);
  const [editingExpId, setEditingExpId] = useState<number | null>(null);

  const [genDate, setGenDate] = useState(getTodayString());
  const [genMemo, setGenMemo] = useState('');
  const [genCost, setGenCost] = useState('');
  const [editingGenId, setEditingGenId] = useState<number | null>(null);

  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locMemo, setLocMemo] = useState('');
  const [editingLocName, setEditingLocName] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySaved(true);
    } else {
      setApiKey("AIzaSyAKhoH8Pf6XXMbacOny5_thESwiexMv4Ys");
    }
  }, []);

  const calculateStats = (filteredRecords: TransportRecord[] = [], filteredSalaries: SalaryRecord[] = [], filteredFixed: FixedExpense[] = []) => {
    const safeRecords = (filteredRecords || []).filter(r => r && r.date);
    const safeSalaries = (filteredSalaries || []).filter(s => s && s.date);
    const safeFixed = (filteredFixed || []).filter(f => f && (f.isRepeat || f.date));

    let income = safeRecords.reduce((acc, r) => acc + (r.income || 0), 0);
    income += safeSalaries.reduce((acc, s) => acc + (s.amount || 0), 0);

    let fuelCost = safeRecords.filter(r => r.type === '주유소').reduce((acc, r) => acc + (r.cost || 0), 0);
    let generalCost = safeRecords.filter(r => r.type === '지출').reduce((acc, r) => acc + (r.cost || 0), 0);
    let fixedCostSum = safeFixed.reduce((acc, f) => acc + (f.cost || 0), 0);
    
    const totalExpense = fuelCost + generalCost + fixedCostSum;
    const distance = safeRecords.filter(r => r.type !== '공차이동').reduce((acc, r) => acc + (r.distance || 0), 0);
    const emptyDistance = safeRecords.filter(r => r.type === '공차이동').reduce((acc, r) => acc + (r.distance || 0), 0);
    
    const trips = safeRecords.filter(r => 
      ['화물운송', '운송종료', '운행종료', '운행취소', '운행회차', '대기'].includes(r.type) && 
      (r.distance > 0 || r.endTime || r.type === '대기' || r.type === '운행취소' || r.type === '운행회차')
    ).length;
    
    const workDays = new Set(safeRecords.filter(r => (r.distance > 0 || r.type === '화물운송') && r.type !== '공차이동').map(r => r.date)).size;
    const totalLiters = safeRecords.reduce((acc, r) => acc + (r.liters || 0), 0);
    const avgEfficiency = totalLiters > 0 ? (distance / totalLiters).toFixed(2) : "0.00";

    return { workDays, trips, distance, emptyDistance, income, expense: totalExpense, net: income - totalExpense, avgEfficiency };
  };

  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthName = (new Date().getMonth() + 1) + "월";

  const monthlyStats = useMemo(() => {
    const r = (records || []).filter(r => r && r.date && r.date.startsWith(currentMonth));
    const s = (salaryRecords || []).filter(s => s && s.date && s.date.startsWith(currentMonth));
    const f = (fixedExpenses || []).filter(f => f && (f.isRepeat || (f.date && f.date.startsWith(currentMonth))));
    return calculateStats(r, s, f);
  }, [records, salaryRecords, fixedExpenses, currentMonth]);

  const cumulativeStats = useMemo(() => {
    return calculateStats(records, salaryRecords, fixedExpenses);
  }, [records, salaryRecords, fixedExpenses]);

  // Handlers
  const addSalary = () => {
    if (!salAmount) return;
    const amountVal = Math.round(parseFloat(salAmount) * 10000);
    if (editingSalId) {
      setSalaryRecords((prev: SalaryRecord[]) => prev.map(s => s.id === editingSalId ? { ...s, date: salDate, amount: amountVal, memo: salMemo } : s));
      setEditingSalId(null);
    } else {
      setSalaryRecords((prev: SalaryRecord[]) => [{ id: Date.now(), date: salDate, amount: amountVal, memo: salMemo }, ...prev]);
    }
    setSalAmount(''); setSalMemo(''); setSalDate(getTodayString());
  };

  const addExpense = () => {
    if (!expName || !expCost) return;
    const costVal = Math.round(parseFloat(expCost) * 10000);
    if (editingExpId) {
      setFixedExpenses((prev: FixedExpense[]) => prev.map(f => f.id === editingExpId ? { ...f, date: expDate, name: expName, cost: costVal, isRepeat: expRepeat } : f));
      setEditingExpId(null);
    } else {
      setFixedExpenses((prev: FixedExpense[]) => [{ id: Date.now(), date: expDate, name: expName, cost: costVal, isRepeat: expRepeat, memo: '' }, ...prev]);
    }
    setExpName(''); setExpCost(''); setExpDate(getTodayString());
  };

  const saveGeneralEdit = () => {
    if (!genCost || !editingGenId) return;
    const costVal = Math.round(parseFloat(genCost) * 10000);
    setRecords((prev: TransportRecord[]) => prev.map(r => r.id === editingGenId ? { ...r, date: genDate, memo: genMemo, cost: costVal } : r));
    setEditingGenId(null);
    setGenCost(''); setGenMemo(''); setGenDate(getTodayString());
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        if (confirm('데이터를 복원하시겠습니까? 기존 데이터는 모두 삭제됩니다.')) {
          const data = raw.data || raw;
          setRecords(Array.isArray(data.records) ? data.records : []);
          setFixedExpenses(Array.isArray(data.fixedExpenses) ? data.fixedExpenses : []);
          setSalaryRecords(Array.isArray(data.salaryRecords) ? data.salaryRecords : []);
          setLocations(data.locations || {});
          alert('데이터 복원이 완료되었습니다.');
        }
      } catch (err) { alert('유효한 백업 파일이 아닙니다.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLocationSave = () => {
    if(!locName) return;
    if (editingLocName && editingLocName !== locName) {
      setLocations((p:any) => {
        const n={...p};
        delete n[editingLocName];
        n[locName] = { address: locAddress, memo: locMemo };
        return n;
      });
    } else {
      setLocations((p:any) => ({...p, [locName]: {address: locAddress, memo: locMemo}}));
    }
    setLocName(''); setLocAddress(''); setLocMemo(''); setEditingLocName(null);
  };

  return (
    <div className="space-y-10 pb-24 pt-4 px-2">
      <StatGrid title={`${currentMonthName} 실시간 요약`} stats={monthlyStats} />
      <StatGrid title="누적 데이터" stats={cumulativeStats} />

      <button onClick={onOpenReport} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
        <FileText size={18}/> 상세 내역 출력 리포트
      </button>

      <Section id="finance" title="금융 관리 (급여/지출)" icon={DollarSign} activeSection={activeSection} setActiveSection={setActiveSection}>
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          {(['salary', 'fixed', 'general'] as const).map(tab => (
            <button key={tab} onClick={() => setFinanceTab(tab)} className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${financeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{tab === 'salary' ? '급여' : tab === 'fixed' ? '고정지출' : '일반지출'}</button>
          ))}
        </div>

        {financeTab === 'salary' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border space-y-3 ${editingSalId ? 'bg-blue-50 border-blue-200' : 'bg-blue-50/50 border-blue-100'}`}>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={salDate} onChange={e => setSalDate(e.target.value)} className="p-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-200" />
                <input type="number" placeholder="금액(만원)" value={salAmount} onChange={e => setSalAmount(e.target.value)} className="p-2 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="급여 메모" value={salMemo} onChange={e => setSalMemo(e.target.value)} className="flex-1 p-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-200" />
                <button onClick={addSalary} className={`px-4 py-2 text-white rounded-lg text-xs font-bold shrink-0 ${editingSalId ? 'bg-orange-500' : 'bg-blue-600'}`}>{editingSalId ? '수정 완료' : '등록'}</button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y border rounded-xl bg-white shadow-inner">
              {salaryRecords.map(s => (
                <div key={s.id} className="p-3 flex justify-between items-center text-[11px]">
                  <div className="flex flex-col"><span className="text-slate-400">{s.date}</span><span className="font-bold text-blue-600">{s.memo || '급여 입금'}</span></div>
                  <div className="flex items-center gap-1">
                    <span className="font-black">{(s.amount / 10000).toLocaleString()}만</span>
                    <button onClick={() => { setSalDate(s.date); setSalAmount((s.amount/10000).toString()); setSalMemo(s.memo); setEditingSalId(s.id); }} className="p-2 text-slate-300 hover:text-blue-500"><Edit2 size={14}/></button>
                    <button onClick={() => confirm('삭제?') && setSalaryRecords((p: SalaryRecord[]) => p.filter(x => x.id !== s.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {financeTab === 'fixed' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border space-y-3 ${editingExpId ? 'bg-red-50 border-red-200' : 'bg-red-50/50 border-red-100'}`}>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="w-full p-2.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-200 bg-white" />
                <input type="text" placeholder="예: 보험료 (항목명)" value={expName} onChange={e => setExpName(e.target.value)} className="w-full p-2.5 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-red-200 bg-white" />
              </div>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="금액(만원)" value={expCost} onChange={e => setExpCost(e.target.value)} className="flex-1 min-w-0 p-2.5 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-red-200 bg-white" />
                <div className="bg-white border rounded-lg w-12 h-[38px] flex items-center justify-center shrink-0">
                  <input type="checkbox" id="fixed-repeat" checked={expRepeat} onChange={e => setExpRepeat(e.target.checked)} className="w-5 h-5 rounded cursor-pointer accent-red-500" />
                </div>
                <button onClick={addExpense} className={`px-5 h-[38px] text-white rounded-lg text-xs font-black shadow-sm shrink-0 ${editingExpId ? 'bg-orange-500' : 'bg-red-500'}`}>{editingExpId ? '수정' : '등록'}</button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y border rounded-xl bg-white shadow-inner">
              {fixedExpenses.map(f => (
                <div key={f.id} className="p-3 flex justify-between items-center text-[11px]">
                  <div className="flex flex-col"><span className="text-slate-400">{f.date}</span><span className="font-bold text-red-500">{f.name} {f.isRepeat && '[매월]'}</span></div>
                  <div className="flex items-center gap-1">
                    <span className="font-black">{(f.cost / 10000).toLocaleString()}만</span>
                    <button onClick={() => { setExpDate(f.date); setExpName(f.name); setExpCost((f.cost/10000).toString()); setExpRepeat(f.isRepeat); setEditingExpId(f.id); }} className="p-2 text-slate-300 hover:text-blue-500"><Edit2 size={14}/></button>
                    <button onClick={() => confirm('삭제?') && setFixedExpenses((p: FixedExpense[]) => p.filter(x => x.id !== f.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {financeTab === 'general' && (
          <div className="space-y-4">
            {editingGenId && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={genDate} onChange={e => setGenDate(e.target.value)} className="p-2.5 border rounded-lg text-xs outline-none bg-white" />
                  <input type="number" placeholder="금액(만원)" value={genCost} onChange={e => setGenCost(e.target.value)} className="p-2.5 border rounded-lg text-xs font-bold outline-none bg-white" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="내용" value={genMemo} onChange={e => setGenMemo(e.target.value)} className="flex-1 p-2.5 border rounded-lg text-xs outline-none bg-white" />
                  <button onClick={saveGeneralEdit} className="px-4 py-2.5 bg-orange-500 text-white rounded-lg text-xs font-black shrink-0">수정 완료</button>
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto divide-y border rounded-xl bg-white shadow-inner">
              {(records || []).filter(r => r && r.type === '지출').sort((a,b) => b.id - a.id).map(r => (
                <div key={r.id} className="p-3 flex justify-between items-center text-[11px]">
                  <div className="flex flex-col"><span className="text-slate-400">{r.date}</span><span className="font-bold text-slate-700">{r.memo || '지출'}</span></div>
                  <div className="flex items-center gap-1">
                    <span className="font-black">{(r.cost / 10000).toLocaleString()}만</span>
                    <button onClick={() => { setGenDate(r.date); setGenMemo(r.memo || ''); setGenCost((r.cost/10000).toString()); setEditingGenId(r.id); }} className="p-2 text-slate-300 hover:text-blue-500"><Edit2 size={14}/></button>
                    <button onClick={() => confirm('삭제?') && setRecords((p: TransportRecord[]) => p.filter(x => x.id !== r.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section id="location" title="운송 지역 관리" icon={MapPin} activeSection={activeSection} setActiveSection={setActiveSection}>
        <div className="space-y-3">
          <div className={`p-4 rounded-xl border space-y-3 ${editingLocName ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingLocName ? '지역 정보 수정' : '새 지역 추가'}</span>
              {editingLocName && <button onClick={() => { setEditingLocName(null); setLocName(''); setLocAddress(''); setLocMemo(''); }} className="p-1 text-slate-400"><X size={14}/></button>}
            </div>
            <input type="text" placeholder="지역 이름 (예: 안산 쿠팡)" value={locName} onChange={e => setLocName(e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
            <input type="text" placeholder="정확한 주소 입력" value={locAddress} onChange={e => setLocAddress(e.target.value)} className="w-full p-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
            <div className="flex gap-2">
              <input type="text" placeholder="참조 메모" value={locMemo} onChange={e => setLocMemo(e.target.value)} className="flex-1 p-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
              <button onClick={handleLocationSave} className={`px-6 py-2 text-white rounded-lg text-xs font-bold shrink-0 active:scale-95 flex items-center gap-1 ${editingLocName ? 'bg-blue-600' : 'bg-slate-800'}`}>
                {editingLocName ? <Save size={14} /> : null} {editingLocName ? '수정' : '지역 추가'}
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y border rounded-xl bg-white shadow-inner">
            {Object.entries(locations || {}).map(([name, info]: [string, any]) => (
              <div key={name} className="p-3 flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-sm font-bold text-slate-800">{name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{info.address}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingLocName(name); setLocName(name); setLocAddress(info.address); setLocMemo(info.memo); }} className="text-slate-300 hover:text-blue-500 p-1"><Edit2 size={14}/></button>
                  <button onClick={() => confirm('삭제?') && setLocations((p:any) => { const n={...p}; delete n[name]; return n; })} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
            {Object.keys(locations || {}).length === 0 && <div className="p-8 text-center text-slate-300 text-xs italic">등록된 지역이 없습니다.</div>}
          </div>
        </div>
      </Section>

      <Section id="ai-settings" title="AI 서비스 설정" icon={Key} activeSection={activeSection} setActiveSection={setActiveSection}>
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border transition-all ${isKeySaved ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              {isKeySaved ? <CheckCircle className="text-emerald-500" size={18} /> : <AlertCircle className="text-amber-500" size={18} />}
              <h4 className="font-black text-slate-800 text-sm">Gemini AI 영수증 분석</h4>
            </div>
            <input type="password" placeholder="API 키 입력" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full p-3 border rounded-xl text-xs bg-white mb-2 outline-none focus:ring-2 focus:ring-amber-200" />
            <button onClick={() => { localStorage.setItem('GEMINI_API_KEY', apiKey); setIsKeySaved(true); alert('AI API 키가 저장되었습니다.'); }} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-xs active:scale-95">키 저장하기</button>
          </div>
        </div>
      </Section>

      <Section id="data" title="데이터 관리" icon={Database} activeSection={activeSection} setActiveSection={setActiveSection}>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onManualBackup} className="p-5 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center gap-2 border border-blue-100 active:scale-95 transition-all shadow-sm"><Download size={24}/><span className="text-[11px] font-black uppercase">전체 백업</span></button>
          <div className="relative p-5 bg-emerald-50 text-emerald-600 rounded-2xl flex flex-col items-center gap-2 border border-emerald-100 active:scale-95 transition-all shadow-sm">
            <Upload size={24}/><span className="text-[11px] font-black uppercase">백업 복원</span>
            <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center font-bold">기기 변경이나 데이터 유실을 대비해 정기적으로 백업을 수행하세요.</p>
      </Section>
    </div>
  );
};

export default SettingsPage2;
