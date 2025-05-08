"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cinema } from './types';
import { findCinemasWithShowtimes, sortCinemasByDistance } from './utils';
import { TheaterShowtimes } from './types';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';

interface CinemaSelectorProps {
  cinemas: Cinema[];
  cinemasLoading: boolean;
  showtimes: TheaterShowtimes[];
  cinemaQuery: string;
  setCinemaQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedCinemas: string[];
  setSelectedCinemas: React.Dispatch<React.SetStateAction<string[]>>;
  filteredCinemas: Cinema[];
  userLocation?: {lat: number, lng: number} | null;
}

const CinemaSelector: React.FC<CinemaSelectorProps> = ({
  cinemas,
  cinemasLoading,
  showtimes,
  cinemaQuery,
  setCinemaQuery,
  selectedCinemas,
  setSelectedCinemas,
  filteredCinemas,
  userLocation
}) => {
  const [showAllCinemas, setShowAllCinemas] = useState(false);
  
  // 根據用戶位置對電影院進行排序
  const sortedCinemas = React.useMemo(() => {
    if (!userLocation || !filteredCinemas.length) return filteredCinemas;
    return sortCinemasByDistance(filteredCinemas, userLocation.lat, userLocation.lng);
  }, [filteredCinemas, userLocation]);
  
  // 決定顯示哪些電影院
  const displayedCinemas = React.useMemo(() => {
    if (cinemaQuery.trim() || showAllCinemas || sortedCinemas.length <= 9) {
      return sortedCinemas;
    }
    return sortedCinemas.slice(0, 9);
  }, [sortedCinemas, cinemaQuery, showAllCinemas]);
  return (
    <div className="w-full max-w-lg mb-8">
      <Input
        placeholder="搜尋電影院..."
        value={cinemaQuery}
        onChange={e => setCinemaQuery(e.target.value)}
        className="mb-2 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
      />
      <div className="flex flex-wrap gap-2">
        {cinemasLoading ? (
          <div className="w-full text-center py-4 text-neutral-400">載入電影院資料中...</div>
        ) : filteredCinemas.length === 0 ? (
          <div className="w-full text-center py-4 text-neutral-400">找不到符合條件的電影院</div>
        ) : (
          <>
            {/* 顯示電影院總數的提示 */}
            {!cinemaQuery.trim() && findCinemasWithShowtimes(showtimes, cinemas).length > 9 && (
              <div className="w-full text-center py-2 mb-2 text-neutral-400 text-sm">
                共有 {findCinemasWithShowtimes(showtimes, cinemas).length} 家電影院放映此電影
                <br />
                請搜尋市區或電影院名稱，或點擊地圖上的標記選擇電影院
              </div>
            )}
            
            {/* 電影院選項按鈕 */}
            {displayedCinemas.map(c => (
              <Button
                key={c.id}
                variant={selectedCinemas.includes(c.id) ? "default" : "outline"}
                className="text-sm"
                onClick={() => setSelectedCinemas(prev =>
                  prev.includes(c.id)
                    ? prev.filter(id => id !== c.id)
                    : [...prev, c.id]
                )}
              >
                {c.name}
              </Button>
            ))}
            
            {/* 顯示更多/收起按鈕 */}
            {!cinemaQuery.trim() && sortedCinemas.length > 9 && (
              <Button 
                variant="ghost" 
                className="text-sm flex items-center gap-1 text-neutral-400 hover:text-white"
                onClick={() => setShowAllCinemas(!showAllCinemas)}
              >
                {showAllCinemas ? (
                  <>
                    <MdExpandLess size={18} />
                    收起
                  </>
                ) : (
                  <>
                    <MdExpandMore size={18} />
                    顯示更多 ({sortedCinemas.length - 9} 家)
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CinemaSelector;
