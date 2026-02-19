
import React, { useMemo } from 'react';
import { TransportRecord } from '../types';
import { calculateDuration, getTodayString } from '../utils';

interface Props {
  records: TransportRecord[];
  selectedYear: number;
  selectedMonth: number;
  onViewDetail: (date: string) => void;
}

const DailyTableView: React.FC<Props> = ({ 
  records, 
  selectedYear, 
  selectedMonth, 
  onViewDetail 
}) => {
  
  const dailyData = useMemo(() => {
    const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const todayStr = getTodayString();
    const data = [];

    const safeRecords = Array.isArray(records) ? records : [];

    for (let day = daysInMonth; day >= 1; day--) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      if (dateStr > todayStr) continue;

      const dayRecords = safeRecords.filter(r => r?.date === dateStr);
      
      let income = 0;
      let expense = 0;
      let fuel = 0;
      let distance = 0;
      let movements = 0;
      
      let firstStart = "";
      let lastEnd = "";

      dayRecords.forEach(r => {
        if (!r) return;
        if (r.type === '수입') income += (r.income || 0);
        else if (r.type === '지출') expense += (r.cost || 0);
        else if (r.type === '주유소') fuel += (r.cost || 0);
        else if (['화물운송', '공차이동', '운행종료', '운송종료', '운행취소', '운행회차', '대기'].includes(r.type)) {
          income += (r.income || 0);
          expense += (r.cost || 0);
          distance += (r.distance || 0);
          
          const isCompleted = !!(r.endTime || (r.distance && r.distance > 0) || r.type === '대기' || r.type === '운행취소' || r.type === '운행회차');
          if (isCompleted && r.type !== '공차이동') movements++;

          if (r.time) {
            if (!firstStart || r.time < firstStart) firstStart = r.time;
          }
          if (r.endTime) {
            if (!lastEnd || r.endTime > lastEnd) lastEnd = r.endTime;
          }
        }
      });

      const duration = (firstStart && lastEnd) ? calculateDuration(firstStart, lastEnd) : "-";
      const net = (income - (expense + fuel)) / 10000;

      data.push({
        date: dateStr,
        day: `${day}일`,
        income: income / 10000,
        expense: expense / 10000,
        fuel: fuel / 10000,
        net: net,
        distance: distance.toFixed(1),
        movements,
        duration
      });
    }
    return data;
  }, [records, selectedYear, selectedMonth]);

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">일</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">수입</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">지출</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">주유</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200 text-blue-600">정산</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">거리</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">이동</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">소요</th>
            <th className="py-3 px-1 font-bold text-slate-700">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {dailyData.length > 0 ? (
            dailyData.map((row) => (
              <tr key={row.date} className="text-center active:bg-slate-50 transition-colors">
                <td className="py-4 font-bold text-slate-600 border-r border-slate-100">{row.day}</td>
                <td className="py-4 text-emerald-600 font-bold border-r border-slate-100">{row.income === 0 ? '0' : row.income.toFixed(1)}</td>
                <td className="py-4 text-red-500 border-r border-slate-100">{row.expense === 0 ? '0' : row.expense.toFixed(1)}</td>
                <td className="py-4 text-red-500 border-r border-slate-100">{row.fuel === 0 ? '0' : row.fuel.toFixed(1)}</td>
                <td className="py-4 font-black text-slate-900 border-r border-slate-100">{row.net === 0 ? '0' : row.net.toFixed(1)}</td>
                <td className="py-4 text-slate-600 border-r border-slate-100">{row.distance}</td>
                <td className="py-4 text-slate-600 border-r border-slate-100">{row.movements}</td>
                <td className="py-4 text-slate-500 text-[9px] leading-tight border-r border-slate-100">
                  {row.duration.replace('시간 ', 'h\n').replace('분', 'm')}
                </td>
                <td className="py-2 px-1">
                  <button 
                    onClick={() => onViewDetail(row.date)}
                    className="w-full py-2 bg-orange-500 text-white rounded font-bold text-[10px] active:scale-95 transition-all leading-tight"
                  >
                    상<br/>세
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="py-10 text-center text-slate-300 italic">데이터가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DailyTableView;
