"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// 假資料
const MOVIE = {
  id: "dune2",
  name: "沙丘：第二部",
  release: "2025-03-01",
  poster: "https://image.tmdb.org/t/p/w500/8uUU2pxm6IYZw8UgnKJyx7Dqwu9.jpg"
};

const CINEMAS = [
  { id: "cinemaA", name: "台北信義威秀影城" },
  { id: "cinemaB", name: "美麗華大直影城" },
  { id: "cinemaC", name: "國賓大戲院" },
  { id: "cinemaD", name: "板橋大遠百威秀" },
  { id: "cinemaE", name: "喜滿客京華影城" }
];

// 三天的日期
const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);
const dayAfterTomorrow = new Date();
dayAfterTomorrow.setDate(today.getDate() + 2);

const dateTabs = [
  { label: "今天", date: today },
  { label: "明天", date: tomorrow },
  { label: "後天", date: dayAfterTomorrow },
];

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10); // yyyy-mm-dd
}

// 假場次資料（每個電影院每天不一樣時間）
const SHOWTIMES: Record<string, Record<string, Array<{ time: string; hall: string; lang: string }>>> = {
  cinemaA: {
    [formatDateKey(today)]: [
      { time: "13:00", hall: "1廳", lang: "國語" },
      { time: "16:30", hall: "2廳", lang: "英語" },
    ],
    [formatDateKey(tomorrow)]: [
      { time: "10:00", hall: "1廳", lang: "國語" },
      { time: "19:00", hall: "2廳", lang: "英語" },
    ],
    [formatDateKey(dayAfterTomorrow)]: [
      { time: "15:30", hall: "1廳", lang: "國語" },
      { time: "21:00", hall: "2廳", lang: "英語" },
    ],
  },
  cinemaB: {
    [formatDateKey(today)]: [
      { time: "12:00", hall: "3廳", lang: "國語" },
      { time: "18:00", hall: "1廳", lang: "英語" },
    ],
    [formatDateKey(tomorrow)]: [
      { time: "11:00", hall: "2廳", lang: "國語" },
      { time: "20:00", hall: "3廳", lang: "英語" },
    ],
    [formatDateKey(dayAfterTomorrow)]: [
      { time: "14:30", hall: "1廳", lang: "國語" },
      { time: "22:00", hall: "2廳", lang: "英語" },
    ],
  },
  cinemaC: {
    [formatDateKey(today)]: [
      { time: "15:10", hall: "2廳", lang: "國語" },
    ],
    [formatDateKey(tomorrow)]: [
      { time: "16:30", hall: "1廳", lang: "國語" },
    ],
    [formatDateKey(dayAfterTomorrow)]: [
      { time: "18:00", hall: "2廳", lang: "英語" },
    ],
  },
  cinemaD: {
    [formatDateKey(today)]: [
      { time: "14:00", hall: "5廳", lang: "國語" },
    ],
    [formatDateKey(tomorrow)]: [
      { time: "17:00", hall: "5廳", lang: "國語" },
    ],
    [formatDateKey(dayAfterTomorrow)]: [
      { time: "20:00", hall: "5廳", lang: "國語" },
    ],
  },
  cinemaE: {
    [formatDateKey(today)]: [
      { time: "19:00", hall: "1廳", lang: "英語" },
    ],
    [formatDateKey(tomorrow)]: [
      { time: "21:00", hall: "1廳", lang: "國語" },
    ],
    [formatDateKey(dayAfterTomorrow)]: [
      { time: "23:00", hall: "1廳", lang: "英語" },
    ],
  },
};

export default function ShowtimesPage() {
  const [cinemaQuery, setCinemaQuery] = useState("");
  const [selectedCinema, setSelectedCinema] = useState<string | null>(null);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const selectedDate = dateTabs[selectedDateIdx].date;
  const selectedDateKey = formatDateKey(selectedDate);

  // 電影院搜尋過濾
  const filteredCinemas = CINEMAS.filter(c => c.name.includes(cinemaQuery));

  // 場次 group by 電影院，依照選擇的日期
  const showtimesByCinema = React.useMemo(() => {
    const groups: Record<string, Array<{ time: string; hall: string; lang: string }>> = {};
    filteredCinemas.forEach(c => {
      if (selectedCinema && c.id !== selectedCinema) return;
      const times = SHOWTIMES[c.id]?.[selectedDateKey] || [];
      if (times.length > 0) groups[c.id] = times;
    });
    return groups;
  }, [selectedCinema, filteredCinemas, selectedDateKey]);


  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-2 bg-black">
      <div className="w-full max-w-lg flex flex-row items-center mb-4">
        <Button variant="ghost" className="mr-2" onClick={() => window.location.href = "/"}>
          ← 返回
        </Button>
        <img src={MOVIE.poster} alt={MOVIE.name} className="w-14 h-20 object-cover rounded-lg border border-neutral-800 shadow-sm mr-4" />
        <div>
          <div className="text-white text-lg font-bold mb-1">{MOVIE.name}</div>
          <div className="text-neutral-400 text-xs">上映：{MOVIE.release}</div>
        </div>
      </div>
      <div className="w-full max-w-lg mb-8">
        <Input
          placeholder="搜尋電影院..."
          value={cinemaQuery}
          onChange={e => setCinemaQuery(e.target.value)}
          className="mb-2 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
        />
        <div className="flex flex-wrap gap-2">
          {filteredCinemas.map(c => (
            <Button
              key={c.id}
              variant={selectedCinema === c.id ? "default" : "outline"}
              className="text-sm"
              onClick={() => setSelectedCinema(selectedCinema === c.id ? null : c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>
      {/* 日期 tabs */}
      <div className="w-full max-w-lg flex flex-row gap-2 mb-4">
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
      <div className="w-full max-w-lg flex flex-col gap-6">
        {Object.keys(showtimesByCinema).length === 0 ? (
          <div className="text-neutral-500 text-center py-8">查無場次</div>
        ) : (
          Object.entries(showtimesByCinema).map(([cid, showtimes]) => {
            const cinema = CINEMAS.find(c => c.id === cid);
            return (
              <div key={cid}>
                <div className="text-white text-base font-semibold mb-2">{cinema?.name}</div>
                <div className="flex flex-col gap-2">
                  {showtimes.map((s, idx) => (
                    <Card key={idx} className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center px-4 py-3">
                      <div className="flex-1 flex flex-row gap-4 items-center">
                        <div className="text-white text-lg font-bold min-w-[40px]">{s.time}</div>
                        <div className="text-neutral-300 text-sm min-w-[40px]">{s.hall}</div>
                        <div className="text-neutral-400 text-sm">{s.lang}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
