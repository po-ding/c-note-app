
import { Geolocation } from 'https://esm.sh/@capacitor/geolocation';
import { Capacitor } from 'https://esm.sh/@capacitor/core';
import { ForegroundService, Importance } from 'https://esm.sh/@capawesome-team/capacitor-android-foreground-service';
import { Filesystem, Directory, Encoding } from 'https://esm.sh/@capacitor/filesystem';
import { Preferences } from 'https://esm.sh/@capacitor/preferences';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  PlusCircle, 
  History, 
  Settings, 
  BarChart3, 
  Truck, 
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  TransportRecord, 
  LocationInfo, 
  FixedExpense, 
  SalaryRecord, 
  Coords,
  RecordType
} from './types';
import { 
  getTodayString, 
  calculateDistance,
  getCurrentTimeString
} from './utils';

// Components
import RecordForm from './components/RecordForm';
import RecordList from './components/RecordList';
import Statistics from './components/Statistics';
import SettingsPage2 from './components/SettingsPage2';
import SMSParser from './components/SMSParser';
import DailyTableView from './components/DailyTableView';
import WeeklyTableView from './components/WeeklyTableView';
import MonthlyTableView from './components/MonthlyTableView';
import ReportModal from './components/ReportModal';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [records, setRecords] = useState<TransportRecord[]>([]);
  const [locations, setLocations] = useState<Record<string, LocationInfo>>({});
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TransportRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'stats' | 'settings'>('daily');
  const [viewType, setViewType] = useState<'today' | 'daily' | 'weekly' | 'monthly'>('today');
  const [viewDate, setViewDate] = useState(getTodayString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // GPS 트래킹 전용 레퍼런스
  const watchIdRef = useRef<string | null>(null);
  const lastCoordsRef = useRef<Coords | null>(null);

  // 파일 중복 체크 및 유니크한 경로 생성
  const getUniquePath = async (dir: string, baseName: string): Promise<string> => {
    let counter = 0;
    while (true) {
      const fileName = counter === 0 ? `${baseName}.json` : `${baseName}(${counter}).json`;
      const fullPath = `${dir}/${fileName}`;
      try {
        await Filesystem.stat({ path: fullPath, directory: Directory.Documents });
        counter++; 
      } catch (e) {
        return fullPath; 
      }
    }
  };

  // 통합 백업 함수
  const performBackup = useCallback(async (isAuto = true) => {
    const currentData = { records, locations, fixedExpenses, salaryRecords };
    if (Capacitor.getPlatform() === 'web') {
      if (!isAuto) {
        const blob = new Blob([JSON.stringify({ data: currentData }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CNote_ManualBackup_${getTodayString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      return;
    }
    try {
      const baseDir = 'CNote_Backup';
      const today = getTodayString().replace(/-/g, '');
      const prefix = isAuto ? 'Auto' : 'Manual';
      const baseName = `CNote_${prefix}_${today}`;
      try {
        await Filesystem.mkdir({ path: baseDir, directory: Directory.Documents, recursive: true });
      } catch (e) {}
      const uniquePath = await getUniquePath(baseDir, baseName);
      await Filesystem.writeFile({
        path: uniquePath,
        data: JSON.stringify({ timestamp: new Date().toISOString(), data: currentData }, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      if (!isAuto) alert(`백업 완료: Documents/${uniquePath}`);
    } catch (error) {
      if (!isAuto) alert('백업 저장 중 오류가 발생했습니다.');
    }
  }, [records, locations, fixedExpenses, salaryRecords]);

  useEffect(() => {
    if (isLoaded) performBackup(true);
  }, [isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) performBackup(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [performBackup]);

  useEffect(() => {
    const initGpsService = async () => {
      try {
        if (Capacitor.getPlatform() !== 'android') return;
        await Geolocation.requestPermissions();
        if (typeof Filesystem.requestPermissions === 'function') await Filesystem.requestPermissions();
        await ForegroundService.createNotificationChannel({
          id: 'gps-channel',
          name: 'C-Note GPS Service',
          description: '정확한 운행 기록을 위한 위치 서비스',
          importance: Importance.Default,
        });
      } catch (err) {}
    };
    initGpsService();
  }, []);

  useEffect(() => {
    try {
      const savedRecordsRaw = localStorage.getItem('records');
      const savedLocsRaw = localStorage.getItem('saved_locations');
      const savedFixedRaw = localStorage.getItem('saved_fixed_expenses');
      const savedSalariesRaw = localStorage.getItem('salary_records');
      setRecords(savedRecordsRaw ? JSON.parse(savedRecordsRaw) : []);
      setLocations(savedLocsRaw ? JSON.parse(savedLocsRaw) : {});
      setFixedExpenses(savedFixedRaw ? JSON.parse(savedFixedRaw) : []);
      setSalaryRecords(savedSalariesRaw ? JSON.parse(savedSalariesRaw) : []);
    } catch (e) { console.error('데이터 로딩 에러:', e); }
    setIsLoaded(true);
  }, []);

  useEffect(() => { if (isLoaded) localStorage.setItem('records', JSON.stringify(records || [])); }, [records, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('saved_locations', JSON.stringify(locations || {})); }, [locations, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('saved_fixed_expenses', JSON.stringify(fixedExpenses || [])); }, [fixedExpenses, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('salary_records', JSON.stringify(salaryRecords || [])); }, [salaryRecords, isLoaded]);

  // GPS 실시간 누적 거리 트래킹
  const startGpsTracking = useCallback(async () => {
    if (watchIdRef.current) return;
    try {
      if (Capacitor.getPlatform() === 'android') {
        await ForegroundService.startForegroundService({
          id: 1001,
          title: 'C-Note 실시간 운행 추적 중',
          body: '이동 거리를 정밀하게 계산하고 있습니다.',
          notificationChannelId: 'gps-channel',
        });
      }

      watchIdRef.current = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 5000 },
        (position) => {
          if (!position) return;
          const current = { lat: position.coords.latitude, lng: position.coords.longitude };
          
          if (lastCoordsRef.current) {
            const dist = calculateDistance(
              lastCoordsRef.current.lat, lastCoordsRef.current.lng,
              current.lat, current.lng
            );
            
            if (dist >= 0.01) { // 10m 이상 이동 시 합산
              setRecords(prev => prev.map(r => r.isStarted ? { ...r, distance: (r.distance || 0) + dist } : r));
              lastCoordsRef.current = current;
            }
          } else {
            lastCoordsRef.current = current;
          }
        }
      );
    } catch (err) { console.error("GPS Watch Error:", err); }
  }, []);

  const stopGpsTracking = useCallback(async () => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    lastCoordsRef.current = null;
    if (Capacitor.getPlatform() === 'android') {
      await ForegroundService.stopForegroundService();
    }
  }, []);

  const handleQuickUpdate = async (id: number, status: RecordType) => {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 }).catch(() => null);
    const coords = position ? { lat: position.coords.latitude, lng: position.coords.longitude } : null;
    const nowTime = getCurrentTimeString();
    const today = getTodayString();

    setRecords(prev => {
      const newRecords = [...prev];
      const targetIdx = newRecords.findIndex(r => r.id === id);
      if (targetIdx === -1) return prev;
      const target = { ...newRecords[targetIdx] };
      target.type = status;
      
      if (status === '화물운송') {
        target.isStarted = true;
        target.startCoords = coords || undefined;
        target.time = nowTime;
        target.date = today;
        target.distance = 0; // 초기화
        startGpsTracking();
      } else if (['운행종료', '운행회차', '운행취소'].includes(status)) {
        target.isStarted = false;
        target.endTime = nowTime;
        target.endCoords = coords || undefined;
        const stillRunning = newRecords.some(r => r.id !== id && r.isStarted);
        if (!stillRunning) stopGpsTracking();
      }
      newRecords[targetIdx] = target;
      return newRecords;
    });
  };

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const changeDay = (delta: number) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + delta);
    setViewDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto shadow-xl relative pb-20 overflow-x-hidden">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Truck className="text-white w-5 h-5" /></div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">C-<span className="text-blue-600">Note</span></h1>
        </div>
        <button onClick={() => { setEditingRecord(null); setIsFormOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-full active:scale-90 transition-transform"><PlusCircle className="w-6 h-6" /></button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'daily' && (
          <div className="space-y-6 flex flex-col">
            {viewType === 'today' && <SMSParser locations={locations} setLocations={setLocations} onParsed={(recs) => setRecords(prev => [...prev, ...recs])} />}
            {viewType === 'today' ? (
              <RecordList 
                records={records || []} 
                locations={locations || {}} 
                viewDate={viewDate} 
                onEdit={(r) => { setEditingRecord(r); setIsFormOpen(true); }} 
                onDelete={(id) => confirm('삭제하시겠습니까?') && setRecords(prev => prev.filter(r => r.id !== id))} 
                onQuickUpdate={handleQuickUpdate}
                onQuickStart={() => {
                   const r: TransportRecord = { id: Date.now(), date: getTodayString(), time: getCurrentTimeString(), type: '화물운송', from: '현위치', to: '미정', distance: 0, cost:0, income:0, liters:0, unitPrice:0, brand:'기타', ureaLiters:0, ureaUnitPrice:0, ureaStation:'', supplyItem:'', mileage:0, waitingTime:0, start_gps: '', end_gps: '', isStarted: true };
                   setRecords(prev => [...prev, r]);
                   startGpsTracking();
                }}
                onQuickEnd={() => {
                   setRecords(prev => prev.map(r => r.isStarted ? {...r, isStarted: false, endTime: getCurrentTimeString()} : r));
                   stopGpsTracking();
                }}
              />
            ) : (
              <div className="space-y-4">
                {viewType === 'daily' && <DailyTableView records={records || []} selectedYear={selectedYear} selectedMonth={selectedMonth} onViewDetail={(d) => { setViewDate(d); setViewType('today'); }} />}
                {viewType === 'weekly' && <WeeklyTableView records={records || []} selectedYear={selectedYear} selectedMonth={selectedMonth} />}
                {viewType === 'monthly' && <MonthlyTableView records={records || []} selectedYear={selectedYear} />}
              </div>
            )}
            <div className="bg-slate-200/50 p-1 rounded-xl shadow-inner flex mt-4 border border-slate-200">
              {(['today', 'daily', 'weekly', 'monthly'] as const).map(t => (
                <button key={t} onClick={() => setViewType(t)} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${viewType === t ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-white/50'}`}>{t === 'today' ? '오늘' : t === 'daily' ? '일별' : t === 'weekly' ? '주별' : '월별'}</button>
              ))}
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <button onClick={() => viewType === 'today' ? changeDay(-1) : changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronLeft size={24} className="text-slate-400" /></button>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 font-black text-slate-800 text-base min-w-0">
                    <CalendarIcon size={18} className="text-blue-600 flex-shrink-0" />
                    {viewType === 'today' ? (
                      <div className="flex items-center">
                        <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-center font-black outline-none w-full min-w-[150px] appearance-none text-lg" />
                      </div>
                    ) : (
                      <span className="whitespace-nowrap text-lg">{selectedYear}. {String(selectedMonth).padStart(2, '0')}.</span>
                    )}
                  </div>
                </div>
                <button onClick={() => viewType === 'today' ? changeDay(1) : changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"><ChevronRight size={24} className="text-slate-400" /></button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && <Statistics records={records || []} salaryRecords={salaryRecords || []} fixedExpenses={fixedExpenses || []} />}
        {activeTab === 'settings' && (
          <SettingsPage2 
            records={records || []} setRecords={setRecords}
            locations={locations || {}} setLocations={setLocations} 
            fixedExpenses={fixedExpenses || []} setFixedExpenses={setFixedExpenses}
            salaryRecords={salaryRecords || []} setSalaryRecords={setSalaryRecords}
            onOpenReport={() => setIsReportOpen(true)}
            onManualBackup={() => performBackup(false)}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 max-w-lg mx-auto z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <button onClick={() => setActiveTab('daily')} className={`flex flex-col items-center gap-1 w-20 transition-all ${activeTab === 'daily' ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}><History size={24}/><span className="text-[10px] font-black">일지</span></button>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 w-20 transition-all ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}><BarChart3 size={24}/><span className="text-[10px] font-black">통계</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 w-20 transition-all ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}><Settings size={24}/><span className="text-[10px] font-black">관리</span></button>
      </nav>

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} records={records || []} salaryRecords={salaryRecords || []} fixedExpenses={fixedExpenses || []} initialYear={selectedYear} initialMonth={selectedMonth} />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-0">
          <div className="bg-white w-full max-w-lg rounded-t-[32px] h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg">{editingRecord ? '기록 수정' : '새 기록 추가'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 bg-white rounded-full border shadow-sm active:scale-90 transition-transform"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <RecordForm initialData={editingRecord} onSubmit={(r) => { setRecords(prev => { const idx = prev.findIndex(old => old.id === r.id); if (idx > -1) return prev.map(old => old.id === r.id ? r : old); return [...prev, r]; }); setIsFormOpen(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
