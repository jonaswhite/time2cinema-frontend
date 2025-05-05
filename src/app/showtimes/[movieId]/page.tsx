"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from "next/link";

// 電影資料介面
interface MovieInfo {
  id: string;
  name: string;
  release: string;
  poster: string;
}

// 電影院資料介面
interface Cinema {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  type: string;
  special: string;
  lat: number;
  lng: number;
}

// 預設電影資料
const DEFAULT_MOVIE: MovieInfo = {
  id: "default",
  name: "電影資訊載入中...",
  release: "-",
  poster: "https://placehold.co/500x750/222/white?text=Loading"
};

// 電影院數據將從 API 獲取

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

const MAPBOX_TOKEN = "pk.eyJ1Ijoiam9uYXN3aGl0ZSIsImEiOiJjbWEydDFwcWswMTdwMm1vaDFuNzcwa21qIn0.yYklARsM9Thk2vuygcDzXg";

export default function ShowtimesPage() {
  const router = useRouter();
  const params = useParams();
  const movieId = params?.movieId as string;
  const decodedMovieId = movieId ? decodeURIComponent(movieId) : "";
  
  const [movie, setMovie] = useState<MovieInfo>(DEFAULT_MOVIE);
  const [loading, setLoading] = useState(true);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [cinemasLoading, setCinemasLoading] = useState(true);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedCinemas, setSelectedCinemas] = useState<string[]>([]);
  const [cinemaQuery, setCinemaQuery] = useState("");
  const [hoverCinemaId, setHoverCinemaId] = useState<string | null>(null);
  const [hoverCinemaLngLat, setHoverCinemaLngLat] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);
  
  // 獲取電影資訊
  useEffect(() => {
    const fetchMovieInfo = async () => {
      if (!decodedMovieId) return;
      
      try {
        setLoading(true);
        // 從票房 API 獲取電影資訊
        const response = await fetch(`http://localhost:4000/api/tmdb/boxoffice-with-posters`);
        
        if (!response.ok) {
          throw new Error(`API 請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 尋找符合電影名稱的電影
        const movieData = data.find((m: any) => m.title === decodedMovieId);
        
        if (movieData) {
          setMovie({
            id: encodeURIComponent(movieData.title),
            name: movieData.title,
            release: movieData.releaseDate,
            poster: movieData.posterUrl || "https://placehold.co/500x750/222/white?text=No+Poster"
          });
        }
      } catch (err) {
        console.error('獲取電影資訊失敗:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovieInfo();
  }, [decodedMovieId]);
  
  // 獲取電影院資訊
  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        setCinemasLoading(true);
        const response = await fetch(`http://localhost:4000/api/cinemas`);
        
        if (!response.ok) {
          throw new Error(`獲取電影院數據失敗: ${response.status}`);
        }
        
        const data = await response.json();
        setCinemas(data);
      } catch (err) {
        console.error('獲取電影院數據失敗:', err);
      } finally {
        setCinemasLoading(false);
      }
    };
    
    fetchCinemas();
  }, []);
  const selectedDate = dateTabs[selectedDateIdx].date;
  const selectedDateKey = formatDateKey(selectedDate);

  // 電影院搜尋過濾（名稱、縣市、行政區）
  const filteredCinemas = cinemas.filter(c => {
    const q = cinemaQuery.trim();
    if (!q) return true;
    return (
      c.name.includes(q) ||
      c.city.includes(q) ||
      c.district.includes(q)
    );
  });

  // 場次 group by 電影院，依照選擇的日期
  const showtimesByCinema = React.useMemo(() => {
    const groups: Record<string, Array<{ time: string; hall: string; lang: string }>> = {};
    // 如果有選擇多個電影院，只顯示這些
    const selectedCinemasData = selectedCinemas.length > 0
      ? filteredCinemas.filter(c => selectedCinemas.includes(c.id))
      : [];
    selectedCinemasData.forEach(c => {
      const times = SHOWTIMES[c.id]?.[selectedDateKey] || [];
      if (times.length > 0) groups[c.id] = times;
    });
    return groups;
  }, [selectedCinemas, filteredCinemas, selectedDateKey]);


  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-2 bg-black">
      <div className="w-full max-w-lg flex mb-4">
        <Link href="/" className="text-neutral-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          返回票房榜
        </Link>
      </div>
      <div className="w-full max-w-lg flex flex-row gap-4 mb-8 items-start">
        <img
          src={movie.poster}
          alt={movie.name}
          className="w-24 h-36 object-cover rounded-lg border border-neutral-800 shadow-md"
          style={{ background: "#222" }}
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{movie.name}</h1>
          <div className="text-neutral-400 text-sm mb-4">上映：{movie.release}</div>
          <div className="text-sm text-neutral-300">
            選擇電影院和日期來查看場次
          </div>
        </div>
      </div>
      {/* Mapbox 地圖區塊 */}
      <div className="w-full max-w-lg mb-4" style={{ height: 320, position: 'relative' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: 121.564468,
            latitude: 25.033964,
            zoom: 11
          }}
          style={{ width: '100%', height: 320, borderRadius: 16 }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        >
          {cinemasLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
              載入電影院資料中...
            </div>
          ) : cinemas.map(cinema => (
            <Marker
              key={cinema.id}
              longitude={cinema.lng}
              latitude={cinema.lat}
              anchor="bottom"
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                setSelectedCinemas(prev =>
                  prev.includes(cinema.id)
                    ? prev.filter(id => id !== cinema.id)
                    : [...prev, cinema.id]
                );
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  background: selectedCinemas.includes(cinema.id)
                    ? '#FFD600'
                    : 'linear-gradient(135deg, #fff 60%, #FFD600 100%)',
                  border: selectedCinemas.includes(cinema.id)
                    ? '3px solid #FFD600'
                    : '2px solid #111',
                  boxShadow: selectedCinemas.includes(cinema.id)
                    ? '0 0 10px 2px #FFD60099, 0 2px 12px #000b'
                    : '0 2px 10px #000b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedCinemas.includes(cinema.id) ? '#111' : '#222',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: 20,
                  position: 'relative',
                  transition: 'all 0.15s',
                  zIndex: hoverCinemaId === cinema.id ? 2 : 1
                }}
                onMouseEnter={() => {
                  setHoverCinemaId(cinema.id);
                  setHoverCinemaLngLat([cinema.lng, cinema.lat]);
                }}
                onMouseLeave={() => {
                  setHoverCinemaId(null);
                  setHoverCinemaLngLat(null);
                }}
              >
                <span style={{
                  filter: selectedCinemas.includes(cinema.id) ? '' : 'drop-shadow(0 0 2px #fff)',
                  fontSize: 22
                }}>🎞️</span>
              </div>
            </Marker>
          ))}
        </Map>
        {/* Portal tooltip */}
        {hoverCinemaId && hoverCinemaLngLat && mapRef.current && (() => {
          const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
          const container = map && map.getContainer ? map.getContainer() : (map && (map as { _container?: HTMLElement })._container ? (map as { _container: HTMLElement })._container : null);
          if (!container) return null;
          const rect = container.getBoundingClientRect();
          const pt = map.project(hoverCinemaLngLat);
          return createPortal(
            <div
              style={{
                position: 'fixed',
                left: pt.x + rect.left,
                top: pt.y + rect.top - 40,
                background: 'rgba(30,30,30,0.97)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 12px #000c',
                pointerEvents: 'none',
                zIndex: 2000,
                transform: 'translate(-50%, -100%)',
                border: 'none'
              }}
            >
              {cinemas.find(c => c.id === hoverCinemaId)?.name}
            </div>,
            document.body
          );
        })()}
      </div>
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
          ) : filteredCinemas.map(c => (
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
        {selectedCinemas.length === 0 ? (
          <div className="text-neutral-500 text-center py-8">請先選擇電影院</div>
        ) : Object.keys(showtimesByCinema).length === 0 ? (
          <div className="text-neutral-500 text-center py-8">查無場次</div>
        ) : (
          Object.entries(showtimesByCinema).map(([cid, showtimes]) => {
            const cinema = cinemas.find(c => c.id === cid);
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
