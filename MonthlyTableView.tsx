
import React, { useMemo } from 'react';
import { TransportRecord } from '../types';
import { getTodayString } from '../utils';

interface Props {
  records: TransportRecord[];
  selectedYear: number;
}

const MonthlyTableView: React.FC<Props> = ({ 
  records, 
  selectedYear 
}) => {
  
  const monthlyData = useMemo(() => {
    const data = [];
    const todayStr = getTodayString();
    const [tYear, tMonth] = todayStr.split('-').map(Number);

    for (let m = 12; m >= 1; m--) {
      if (selectedYear > tYear || (selectedYear === tYear && m > tMonth)) continue;

      const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
      const monthRecords = records.filter(r => r.date.startsWith(monthStr));

      let mIncome = 0;
      let mExpense = 0;
      let mFuel = 0;
      let mDist = 0;
      let mMovements = 0;
      let mTotalMinutes = 0;

      monthRecords.forEach(r => {
        if (r.type === '수입') mIncome += r.income;
        else if (r.type === '지출') mExpense += r.cost;
        else if (r.type === '주유소') mFuel += r.cost;
        else if (['화물운송', '운행종료', '공차이동', '운행취소', '운행회차', '대기'].includes(r.type)) {
          mIncome += (r.income || 0);
          mExpense += (r.cost || 0);
          mDist += (r.distance || 0);
          
          // 완료된 건만 집계 (공차이동 제외)
          if (['화물운송', '운행종료', '운행취소', '운행회차', '대기'].includes(r.type) && 
              (r.endTime || r.distance > 0 || r.type === '대기' || r.type === '운행취소' || r.type === '운행회차')) {
            mMovements++;
          }

          if (r.time && r.endTime) {
            const [sh, sm] = r.time.split(':').map(Number);
            const [eh, em] = r.endTime.split(':').map(Number);
            let diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff < 0) diff += 1440;
            mTotalMinutes += diff;
          }
        }
      });

      const h = Math.floor(mTotalMinutes / 60);
      const min = mTotalMinutes % 60;
      const durationStr = mTotalMinutes > 0 ? `${h}h\n${min}m` : "-";

      data.push({
        label: `${String(selectedYear).substring(2)}년\n${String(m).padStart(2, '0')}월`,
        income: mIncome / 10000,
        expense: mExpense / 10000,
        fuel: mFuel / 10000,
        net: (mIncome - (mExpense + mFuel)) / 10000,
        distance: mDist.toFixed(1),
        movements: mMovements,
        duration: durationStr
      });
    }
    return data;
  }, [records, selectedYear]);

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">월</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">수입</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">지출</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">주유</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">정산</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">거리</th>
            <th className="py-3 px-1 font-bold text-slate-700 border-r border-slate-200">이동</th>
            <th className="py-3 px-1 font-bold text-slate-700">소요</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {monthlyData.length > 0 ? (
            monthlyData.map((row, idx) => (
              <tr key={idx} className="text-center active:bg-slate-50 transition-colors">
                <td className="py-5 font-bold text-slate-600 border-r border-slate-100 whitespace-pre-line leading-tight">{row.label}</td>
                <td className="py-5 text-emerald-600 font-bold border-r border-slate-100">{row.income === 0 ? '0' : row.income}</td>
                <td className="py-5 text-red-500 border-r border-slate-100">{row.expense === 0 ? '0' : row.expense}</td>
                <td className="py-5 text-red-500 border-r border-slate-100">{row.fuel === 0 ? '0' : row.fuel}</td>
                <td className="py-5 font-black text-slate-900 border-r border-slate-100">{row.net === 0 ? '0' : row.net}</td>
                <td className="py-5 text-slate-600 border-r border-slate-100">{row.distance}</td>
                <td className="py-5 text-slate-600 border-r border-slate-100">{row.movements}</td>
                <td className="py-5 text-slate-500 text-[9px] font-bold leading-tight whitespace-pre-line">
                  {row.duration}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="py-10 text-center text-slate-300 italic">데이터가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MonthlyTableView;
