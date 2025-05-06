"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// 導入拆分出的組件和類型
import { 
  Cinema, 
  TheaterShowtimes, 
  MovieInfo, 
  DEFAULT_MOVIE,
  FormattedShowtime
} from './types';
import { formatDateKey, createDateTabs, findCinemasWithShowtimes } from './utils';
import MapComponent from './MapComponent';
import CinemaSelector from './CinemaSelector';
import ShowtimesList from './ShowtimesList';

export default function ShowtimesPage() {
  const router = useRouter();
  const params = useParams();
  const movieId = params?.movieId as string;
  const decodedMovieId = movieId ? decodeURIComponent(movieId) : "";
  
  // 狀態管理
  const [movie, setMovie] = useState<MovieInfo>(DEFAULT_MOVIE);
  const [loading, setLoading] = useState(true);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [cinemasLoading, setCinemasLoading] = useState(true);
  const [showtimes, setShowtimes] = useState<TheaterShowtimes[]>([]);
  const [showtimesLoading, setShowtimesLoading] = useState(true);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedCinemas, setSelectedCinemas] = useState<string[]>([]);
  const [cinemaQuery, setCinemaQuery] = useState("");
  
  // 日期標籤
  const dateTabs = React.useMemo(() => createDateTabs(), []);
  
  // 獲取電影資訊
  useEffect(() => {
    const fetchMovieInfo = async () => {
      if (!decodedMovieId) return;
      
      try {
        setLoading(true);
        // 直接設置電影資訊，不需要從 API 查詢
        setMovie({
          id: "accountant2",
          name: decodedMovieId,
          release: "2025-05-01",
          poster: "https://image.tmdb.org/t/p/w500/pWJW4c8jHRw0X0FMiRfvOUXKGgf.jpg"
        });
      } catch (error) {
        console.error('獲取電影資訊失敗:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovieInfo();
  }, [decodedMovieId]);
  
  // 獲取電影院資料
  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        setCinemasLoading(true);
        const response = await fetch('http://localhost:4000/api/cinemas');
        
        if (!response.ok) {
          throw new Error(`API 請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        setCinemas(data);
      } catch (error) {
        console.error('獲取電影院資料失敗:', error);
      } finally {
        setCinemasLoading(false);
      }
    };
    
    fetchCinemas();
  }, []);
  
  // 獲取場次資料
  useEffect(() => {
    const fetchShowtimes = async () => {
      if (!decodedMovieId) return;
      
      try {
        setShowtimesLoading(true);
        // 使用絕對路徑避免 CORS 問題
        const response = await fetch(`http://localhost:4000/api/showtimes/movie/${encodeURIComponent(decodedMovieId)}`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API 請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`獲取到 ${data.length} 個電影院的場次資料`);
        setShowtimes(data);
        
        // 先等待電影院資料加載完成
        setTimeout(() => {
          if (Array.isArray(cinemas) && cinemas.length > 0) {
            // 將場次資料與電影院資料進行配對，找出有放映這部電影的電影院
            const cinemasWithShowtimes = findCinemasWithShowtimes(data, cinemas);
            console.log(`找到 ${cinemasWithShowtimes.length} 間電影院有放映 ${decodedMovieId}`);
            
            // 尋找有今天場次的電影院
            const today = new Date(2025, 4, 6); // 2025-05-06
            const todayStr = formatDateKey(today);
            
            // 尋找有今天場次的電影院
            const cinemasWithTodayShowtimes = [];
            for (const theater of data) {
              const cinema = cinemas.find(c => {
                const cleanCinemaName = c.name.replace(/影城$|大戲院$|影城$|影城$|影院$|劇場$|影城$|影城$/, "").trim();
                const cleanTheaterName = theater.theater_name.replace(/影城$|大戲院$|影城$|影城$|影院$|劇場$|影城$|影城$/, "").trim();
                return cleanCinemaName.includes(cleanTheaterName) || cleanTheaterName.includes(cleanCinemaName);
              });
              
              if (cinema) {
                const hasTodayShowtimes = theater.showtimes_by_date.some(d => d.date === todayStr && d.showtimes.length > 0);
                if (hasTodayShowtimes) {
                  cinemasWithTodayShowtimes.push(cinema.id);
                }
              }
            }
            
            console.log(`有今天場次的電影院數量: ${cinemasWithTodayShowtimes.length}`);
            
            // 如果有今天場次的電影院，則預設選擇這些電影院
            if (cinemasWithTodayShowtimes.length > 0) {
              console.log(`預設選擇有今天場次的電影院`);
              setSelectedCinemas(cinemasWithTodayShowtimes);
              // 預設選擇今天的日期標簽
              setSelectedDateIdx(1); // 今天在第二個位置 (index 1)
            } else {
              // 如果沒有今天場次的電影院，則預設選擇昨天有場次的電影院
              console.log(`沒有今天場次的電影院，預設選擇昨天有場次的電影院`);
              setSelectedCinemas(cinemasWithShowtimes.slice(0, 3));
              // 預設選擇昨天的日期標簽
              setSelectedDateIdx(0); // 昨天在第一個位置 (index 0)
            }
          }
        }, 1000); // 等待 1 秒確保電影院資料已經加載完成
      } catch (err) {
        console.error('獲取場次數據失敗:', err);
      } finally {
        setShowtimesLoading(false);
      }
    };
    
    fetchShowtimes();
  }, [decodedMovieId]);
  
  // 篩選出有場次的電影院
  const filteredCinemas = React.useMemo(() => {
    if (cinemasLoading || !Array.isArray(cinemas) || cinemas.length === 0) return [];
    
    // 如果有搜尋查詢，根據名稱、縣市、行政區篩選
    if (cinemaQuery.trim()) {
      return cinemas.filter(c => 
        c.name.includes(cinemaQuery.trim()) || 
        c.city.includes(cinemaQuery.trim()) || 
        c.district.includes(cinemaQuery.trim())
      );
    }
    
    // 否則返回所有有場次的電影院
    const cinemasWithShowtimes = findCinemasWithShowtimes(showtimes, cinemas);
    console.log(`有場次的電影院數量: ${cinemasWithShowtimes.length}`);
    return cinemas.filter(cinema => cinemasWithShowtimes.includes(cinema.id));
  }, [cinemas, cinemasLoading, cinemaQuery, showtimes]);
  
  // 場次 group by 電影院，依照選擇的日期
  const showtimesByCinema = React.useMemo<Record<string, FormattedShowtime[]>>(() => {
    try {
      const groups: Record<string, FormattedShowtime[]> = {};
      
      if (showtimesLoading || !Array.isArray(showtimes) || showtimes.length === 0 || 
          !Array.isArray(cinemas) || cinemas.length === 0) {
        // 移除對 selectedCinemas.length 的檢查，允許在沒有選擇電影院的情況下也返回場次資料
        console.log('資料載入中或空值，返回空場次組');
        console.log(`showtimesLoading: ${showtimesLoading}, showtimes.length: ${showtimes?.length || 0}`);
        console.log(`cinemas.length: ${cinemas?.length || 0}`);
        return groups;
      }
      
      // 取得選擇的日期
      const selectedDate = dateTabs[selectedDateIdx].date;
      const formattedDate = formatDateKey(selectedDate);
      console.log(`選擇的日期: ${formattedDate}`);
      
      // 遍歷每個電影院
      cinemas.forEach(cinema => {
        // 只處理被選中的電影院
        if (!selectedCinemas.includes(cinema.id)) return;
        
        // 尋找電影院對應的場次資料
        const theaterData = showtimes.find(theater => {
          const cleanCinemaName = cinema.name.replace(/影城$|大戲院$|影城$|影城$|影院$|劇場$|影城$|影城$/, "").trim();
          const cleanTheaterName = theater.theater_name.replace(/影城$|大戲院$|影城$|影城$|影院$|劇場$|影城$|影城$/, "").trim();
          return cleanCinemaName.includes(cleanTheaterName) || cleanTheaterName.includes(cleanCinemaName);
        });
        
        if (theaterData && Array.isArray(theaterData.showtimes_by_date)) {
          console.log(`電影院 ${cinema.name} 有 ${theaterData.showtimes_by_date.length} 個日期的場次資料`);
          
          // 尋找符合選擇日期的場次
          const dateData = theaterData.showtimes_by_date.find(d => {
            if (!d || !d.date) return false;
            
            const isMatch = d.date === formattedDate;
            console.log(`比較日期: ${d.date} vs ${formattedDate}, 匹配結果: ${isMatch}`);
            return isMatch;
          });
          
          // 如果選擇的日期沒有場次，則不添加場次
          if (!dateData) {
            console.log(`選擇的日期 ${formattedDate} 沒有場次`);
          } 
          // 如果有場次，則添加到結果中
          else if (Array.isArray(dateData.showtimes) && dateData.showtimes.length > 0) {
            console.log(`電影院 ${cinema.name} 在 ${dateData.date} 有 ${dateData.showtimes.length} 個場次`);
            
            // 將場次轉換為需要的格式
            const formattedShowtimes = dateData.showtimes.map(s => {
              let time = s.time || '';
              
              // 嘗試從時間中提取純時間部分，如果有括號內容
              const timeMatch = time.match(/([0-9:]+)\s*\((.+?)\)/);
              if (timeMatch) {
                time = timeMatch[1]; // 取出純時間部分
              }
              
              return {
                time,
                lang: "", // ATMovies 沒有提供語言信息
                cinemaName: cinema.name, // 保存電影院名稱
                date: dateData.date // 保存場次日期
              };
            });
            
            // 將場次添加到對應的電影院組中
            groups[cinema.id] = formattedShowtimes;
          } else {
            console.log(`電影院 ${cinema.name} 沒有場次或日期不匹配`);
          }
        } else {
          console.log(`找不到電影院 ${cinema.name} 的場次資料`);
        }
      });
      
      return groups;
    } catch (error) {
      console.error('處理場次資料時出錯:', error);
      return {};
    }
  }, [showtimes, showtimesLoading, cinemas, cinemasLoading, selectedCinemas, selectedDateIdx, dateTabs]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-black text-white">
      <div className="w-full max-w-lg flex items-center mb-8">
        <Button variant="outline" onClick={() => router.back()} className="mr-4">
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{movie.name}</h1>
          <p className="text-neutral-400">{movie.release}</p>
        </div>
        <div className="w-16 h-24 overflow-hidden rounded-md">
          <img src={movie.poster} alt={movie.name} className="w-full h-full object-cover" />
        </div>
      </div>
      
      {/* 地圖組件 - 傳遞場次資訊，只顯示有場次的電影院 */}
      <MapComponent 
        cinemas={cinemas} 
        selectedCinemas={selectedCinemas} 
        setSelectedCinemas={setSelectedCinemas} 
        showtimesByCinema={showtimesByCinema}
      />
      
      {/* 電影院選擇器 */}
      <CinemaSelector 
        cinemas={cinemas}
        cinemasLoading={cinemasLoading}
        showtimes={showtimes}
        cinemaQuery={cinemaQuery}
        setCinemaQuery={setCinemaQuery}
        selectedCinemas={selectedCinemas}
        setSelectedCinemas={setSelectedCinemas}
        filteredCinemas={filteredCinemas}
      />
      
      {/* 場次列表 */}
      <ShowtimesList 
        cinemas={cinemas}
        showtimes={showtimesByCinema}
        selectedCinemas={selectedCinemas}
        dateTabs={dateTabs}
        selectedDateIdx={selectedDateIdx}
        setSelectedDateIdx={setSelectedDateIdx}
      />
    </main>
  );
}