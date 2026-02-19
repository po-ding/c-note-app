
export type RecordType = '화물운송' | '수입' | '주유소' | '소모품' | '지출' | '대기' | '운행취소' | '운행회차' | '공차이동' | '운행종료';

export interface Coords {
  lat: number;
  lng: number;
}

export interface TransportRecord {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: RecordType;
  from?: string;
  to?: string;
  distance: number;
  start_gps: string;
  end_gps: string;
  cost: number; // 총 주유금액 (또는 지출액)
  income: number;
  liters: number;
  unitPrice: number;
  brand: string;
  expenseItem?: string; 
  ureaLiters: number;
  ureaUnitPrice: number;
  ureaStation: string;
  supplyItem: string;
  mileage: number;
  waitingTime: number;
  
  // App Internal Fields
  endTime?: string;
  isStarted?: boolean;
  memo?: string;
  startCoords?: Coords;
  endCoords?: Coords;

  // Fuel Specific Fields (OCR 전용)
  subsidy?: number; // 유가보조금
  actualCost?: number; // 실 결제금액
}

export interface LocationInfo {
  address: string;
  memo: string;
}

export interface FixedExpense {
  id: number;
  date: string; // YYYY-MM-DD
  name: string;
  memo: string;
  cost: number;
  isRepeat: boolean; // Monthly repeat
}

export interface SalaryRecord {
  id: number;
  date: string;
  amount: number;
  memo: string;
}

export interface MonthlySalary {
  [key: string]: number; // "YYYY-MM": amount
}
