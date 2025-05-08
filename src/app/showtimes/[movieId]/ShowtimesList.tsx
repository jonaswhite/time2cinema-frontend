"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cinema, FormattedShowtime } from './types';
import { formatDateKey } from './utils';

interface ShowtimesListProps {
  cinemas: Cinema[];
  showtimes: Record<string, FormattedShowtime[]>;
  selectedCinemas: string[];
  dateTabs: { label: string; date: Date }[];
  selectedDateIdx: number;
  setSelectedDateIdx: React.Dispatch<React.SetStateAction<number>>;
}

const ShowtimesList: React.FC<ShowtimesListProps> = ({
  cinemas,
  showtimes,
  selectedCinemas,
  dateTabs,
  selectedDateIdx,
  setSelectedDateIdx
}) => {
  return (
    <div className="w-full max-w-lg flex flex-col gap-2">
      {/* 日期 tabs */}
      <div className="w-full flex flex-row gap-2 mb-4">
        {dateTabs.map((tab, idx) => (
          <Button
            key={tab.label}
            variant={selectedDateIdx === idx ? "default" : "outline"}
            className="flex-1 text-sm"
            onClick={() => setSelectedDateIdx(idx)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      
      {/* 場次內容 */}
      {selectedCinemas.length === 0 ? (
        <div className="text-neutral-500 text-center py-8">請先選擇電影院</div>
      ) : Object.keys(showtimes).length === 0 ? (
        <div className="text-neutral-500 text-center py-8">查無場次</div>
      ) : (
        <>
          {/* 場次列表 */}
          {Object.entries(showtimes).map(([cid, showtimesList]) => {
            const cinema = cinemas.find(c => c.id === cid);
            // 取得電影院名稱，如果有場次資訊中包含電影院名稱，則使用場次資訊中的名稱
            const cinemaName = cinema?.name || (showtimesList.length > 0 ? showtimesList[0].cinemaName : `電影院`);
            
            return (
              <div key={cid} className="mb-2 bg-neutral-900/50 rounded-lg p-2 border border-neutral-800">
                <div className="text-white text-sm font-semibold mb-2 pb-1 border-b border-neutral-800/50">
                  {cinemaName}
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {showtimesList.map((s, idx) => (
                    <button key={idx} className="bg-neutral-800 border border-neutral-700 rounded text-sm text-white px-2.5 py-1 hover:bg-neutral-700 transition-colors cursor-pointer">
                      {s.time.replace(/:\d{2}$/, '')}
                      {s.lang && <span className="text-neutral-400 text-xs ml-1">{s.lang}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default ShowtimesList;
