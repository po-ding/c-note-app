
import React, { useState, useMemo, useEffect } from 'react';
import { TransportRecord, LocationInfo, RecordType } from '../types';
import { 
  Truck, 
  Fuel, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  Play,
  Square,
  RotateCcw,
  XCircle,
  Activity,
  Clock,
  Info,
  Wind,
  CornerUpLeft,
  Ban,
  Copy,
  Navigation
} from 'lucide-react';
import { formatToManwon } from '../utils';

interface Props {
  records: TransportRecord[];
  locations: Record<string, LocationInfo>;
  viewDate: string;
  onEdit: (record: TransportRecord) => void;
  onDelete: (id: number) => void;
  onQuickUpdate: (id: number, status: RecordType) => void;
  onQuickStart?: () => void;
  onQuickEnd?: () => void;
}

const RecordList: React.FC<Props> = ({ records, locations, viewDate, onEdit, onDelete, onQuickUpdate, onQuickStart, onQuickEnd }) => {
  const [isWaitExpanded, setIsWaitExpanded] = useState(true);
  const [isDoneExpanded, setIsDoneExpanded] = useState(false);
  const [isEmptyExpanded, setIsEmptyExpanded] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const processedRecords = useMemo(() => {
    if (!Array.isArray(records)) return [];
    return records
      .filter(r => r && (r.date === viewDate || r.isStarted))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "").localeCompare(b.time || "");
      });
  }, [records, viewDate]);

  const runningRecords = processedRecords.filter(r => r && r.isStarted);
  
  const waitingRecords = processedRecords.filter(r => 
    r && !r.isStarted && 
    r.date === viewDate && 
    !r.endTime && 
    ((r.income || 0) === 0 && (r.cost || 0) === 0 && (r.distance || 0) === 0) &&
    ['대기', '화물운송'].includes(r.type)
  );

  const completedRecords = processedRecords.filter(r => 
    r && !r.isStarted && 
    r.date === viewDate && 
    ['화물운송', '수입', '지출', '운행종료', '운행취소', '운행회차', '소모품'].includes(r.type) &&
    (r.endTime || (r.income || 0) > 0 || (r.cost || 0) > 0 || (r.distance || 0) > 0)
  );

  const emptyAndFuelRecords = processedRecords.filter(r => 
    r && !r.isStarted && 
    r.date === viewDate && 
    (r.type === '공차이동' || r.type === '주유소')
  );

  const copyAddress = (name: string) => {
    const info = locations[name];
    if (info && info.address) {
      navigator.clipboard.writeText(info.address);
      alert(`${name} 주소가 복사되었습니다.`);
    }
  };

  const renderCard = (record: TransportRecord, isActive: boolean = false) => {
    if (!record) return null;
    const isActuallyCompleted = !isActive && (
      record.endTime || 
      (record.income || 0) > 0 || 
      (record.cost || 0) > 0 || 
      (record.distance || 0) > 0
    );
    const hasLocationData = !!(record.from || record.to);
    let displayType: string = record.type || "기타";
    if (isActive) displayType = '운행 중';
    const isOverhead = record.type === '공차이동' || record.type === '주유소';

    // 타이머 계산
    let durationStr = "";
    if (isActive && record.time) {
      const [sh, sm] = record.time.split(':').map(Number);
      const start = new Date(currentTime);
      start.setHours(sh, sm, 0, 0);
      const diff = Math.max(0, currentTime.getTime() - start.getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      durationStr = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    return (
      <div key={record.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${isActive ? 'border-blue-500 ring-2 ring-blue-100 scale-[1.02]' : isOverhead ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'} flex flex-col gap-3 transition-all relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300`}>
        {isActive && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden">
            <div className="h-full bg-blue-500 animate-[loading_2s_infinite] w-1/3"></div>
          </div>
        )}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${isActive ? 'bg-blue-600 text-white' : record.type === '공차이동' ? 'bg-orange-100 text-orange-600' : record.type === '주유소' ? 'bg-orange-50 text-orange-600' : isActuallyCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {isActive ? <Activity size={20} className="animate-pulse" /> : record.type === '공차이동' ? <Wind size={20} /> : record.type === '주유소' ? <Fuel size={20} /> : <Truck size={20} />}
            </span>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5"><Clock size={10} /> {record.time || '--:--'}</span>
                {record.endTime && <><span className="text-[10px] text-slate-300">~</span><span className="text-[10px] font-bold text-slate-400">{record.endTime}</span></>}
                {isActive && <span className="ml-2 text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 rounded-full">{durationStr}</span>}
              </div>
              <div className={`font-bold leading-tight flex items-center gap-1 ${isOverhead ? 'text-orange-600' : 'text-slate-800'}`}>{displayType}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(record)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
            <button onClick={() => onDelete(record.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
          </div>
        </div>
        {hasLocationData && (
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 space-y-3">
            {record.from && (
              <button onClick={() => copyAddress(record.from!)} className="w-full flex items-center gap-2 hover:bg-white p-1 rounded-lg transition-colors group">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <div className="font-bold text-base text-slate-800 flex-1 text-left">{record.from}</div>
                <Copy size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
              </button>
            )}
            {record.to && (
              <button onClick={() => copyAddress(record.to!)} className="w-full flex items-center gap-2 hover:bg-white p-1 rounded-lg transition-colors group">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <div className="font-bold text-base text-slate-800 flex-1 text-left">{record.to}</div>
                <Copy size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
        )}
        {record.memo && <div className="px-1 flex items-start gap-1.5"><Info size={12} className="text-slate-400 mt-0.5 shrink-0" /><p className="text-[11px] text-slate-500 leading-relaxed italic">{record.memo}</p></div>}
        
        <div className="flex justify-between items-center px-1">
          <div className="flex gap-4">
             {(record.distance || 0) > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-300">거리</span>
                <span className={`text-sm font-bold ${isOverhead ? 'text-orange-600' : 'text-slate-600'}`}>
                  {record.distance.toFixed(1)}km
                  {isActive && <Navigation size={10} className="inline ml-1 text-blue-500 animate-bounce" />}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {(record.income || 0) > 0 && <div className="text-lg font-black text-blue-600">+{formatToManwon(record.income)}만</div>}
            {(record.cost || 0) > 0 && <div className="text-lg font-black text-red-600">-{record.type === '주유소' ? record.cost.toLocaleString() + '원' : formatToManwon(record.cost) + '만'}</div>}
          </div>
        </div>

        {isActive && (
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
            <button 
              onClick={() => onQuickUpdate(record.id, '운행종료')} 
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              <Square size={18} fill="white" /> 운행 종료
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => confirm('운행을 회차 처리하시겠습니까?') && onQuickUpdate(record.id, '운행회차')} 
                className="flex items-center justify-center gap-2 py-3 bg-orange-100 text-orange-700 rounded-xl font-bold text-xs active:scale-95 transition-all"
              >
                <CornerUpLeft size={16} /> 운행 회차
              </button>
              <button 
                onClick={() => confirm('운행을 취소 처리하시겠습니까?') && onQuickUpdate(record.id, '운행취소')} 
                className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs active:scale-95 transition-all border border-red-100"
              >
                <Ban size={16} /> 운행 취소
              </button>
            </div>
          </div>
        )}

        {!isActive && !isActuallyCompleted && (
          <button onClick={() => onQuickUpdate(record.id, '화물운송')} className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl shadow-md active:scale-95 transition-all font-bold text-sm"><Play size={18} fill="white" /> 운행 시작</button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-4">
      {/* 실시간 운행 섹션 헤더 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest">
            <Activity size={14} /> 
            실시간 운행 중 
            {runningRecords.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-50 rounded text-blue-500 animate-pulse">
                {runningRecords.reduce((acc, r) => acc + (r.distance || 0), 0).toFixed(1)}km
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onQuickStart} className="px-2 py-1 bg-blue-50 text-blue-600 rounded font-bold text-[9px] border border-blue-100 active:scale-95">시작</button>
            <button onClick={onQuickEnd} className="px-2 py-1 bg-slate-50 text-slate-500 rounded font-bold text-[9px] border border-slate-100 active:scale-95">종료</button>
          </div>
        </div>
        <div className="space-y-4">
          {runningRecords.length > 0 ? runningRecords.map(r => renderCard(r, true)) : <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl py-6 text-center text-xs text-slate-400">운행 중인 내역이 없습니다.</div>}
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={() => setIsWaitExpanded(!isWaitExpanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100/50 rounded-xl">
          <div className="flex items-center gap-2"><Truck size={14} /> 운행 대기 ({waitingRecords.length})</div>
          {isWaitExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        {isWaitExpanded && <div className="space-y-3">{waitingRecords.map(r => renderCard(r, false))}</div>}
      </div>

      <div className="space-y-3">
        <button onClick={() => setIsDoneExpanded(!isDoneExpanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-400 bg-slate-100/30 rounded-xl">
          <div className="flex items-center gap-2"><CheckCircle2 size={14} /> 운행 완료 기록 ({completedRecords.length})</div>
          {isDoneExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        {isDoneExpanded && <div className="space-y-3">{completedRecords.map(r => renderCard(r, false))}</div>}
      </div>

      <div className="space-y-3">
        <button onClick={() => setIsEmptyExpanded(!isEmptyExpanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-orange-500 bg-orange-50/50 rounded-xl border border-orange-200 shadow-sm">
          <div className="flex items-center gap-2"><Wind size={14} /> 공차이동 및 주유 기록 ({emptyAndFuelRecords.length})</div>
          {isEmptyExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        {isEmptyExpanded && <div className="space-y-3">{emptyAndFuelRecords.map(r => renderCard(r, false))}</div>}
      </div>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
};

export default RecordList;
