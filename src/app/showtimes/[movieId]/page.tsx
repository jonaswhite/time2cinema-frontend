"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import API_URL from "@/config/api";

// 導入拆分出的組件和類型
import { 
  Cinema, 
  TheaterShowtimes, 
  MovieInfo, 
  DEFAULT_MOVIE,
  FormattedShowtime
} from './types';
import { formatDateKey, createDateTabs, findCinemasWithShowtimes, getDateLabel } from './utils';
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
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  
  // 日期標籤
  const dateTabs = React.useMemo(() => createDateTabs(), []);
  
  // 獲取用戶位置
  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            console.log(`獲取到用戶位置: 緯度 ${latitude}, 經度 ${longitude}`);
            setLocationLoading(false);
          },
          (error) => {
            console.error('獲取位置失敗:', error);
            // 如果獲取失敗，使用台北市中心作為預設位置
            setUserLocation({ lat: 25.0330, lng: 121.5654 });
            setLocationLoading(false);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        console.log('瀏覽器不支援地理位置');
        // 使用台北市中心作為預設位置
        setUserLocation({ lat: 25.0330, lng: 121.5654 });
        setLocationLoading(false);
      }
    };
    
    getUserLocation();
  }, []);
  
  // 獲取電影資訊
  useEffect(() => {
    const fetchMovieInfo = async () => {
      if (!decodedMovieId) return;
      
      try {
        setLoading(true);
        // 從 boxoffice-with-posters API 獲取電影海報
        const response = await fetch(`${API_URL}/api/tmdb/boxoffice-with-posters`);
        
        if (!response.ok) {
          throw new Error(`API 請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 尋找對應的電影
        const movieData = data.find((movie: { title: string; posterUrl?: string; releaseDate?: string }) => movie.title === decodedMovieId);
        
        if (movieData) {
          console.log(`從快取找到電影: ${movieData.title}`);
          setMovie({
            id: movieData.title,
            name: movieData.title,
            release: movieData.releaseDate || '2025-05-01',
            poster: movieData.posterUrl || "https://placehold.co/500x750/222/white?text=No+Poster"
          });
        } else {
          console.log(`快取中找不到電影: ${decodedMovieId}`);
          // 如果快取中找不到，使用預設值
          setMovie({
            id: decodedMovieId,
            name: decodedMovieId,
            release: "2025-05-01",
            poster: "https://placehold.co/500x750/222/white?text=No+Poster"
          });
        }
      } catch (error) {
        console.error('獲取電影資訊失敗:', error);
        setMovie({
          id: decodedMovieId,
          name: decodedMovieId,
          release: "2025-05-01",
          poster: "https://placehold.co/500x750/222/white?text=No+Poster"
        });
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
        const response = await fetch(`${API_URL}/api/cinemas`);
        
        if (!response.ok) {
          throw new Error(`API 請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`成功獲取 ${data.length} 間電影院資料`);
        setCinemas(data);
      } catch (error) {
        console.error('獲取電影院資料失敗:', error);
        setCinemas([]);
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
        
        // 格式化今天的日期為 YYYY-MM-DD
        const today = new Date();
        const todayStr = formatDateKey(today);
        
        console.log(`正在獲取電影 ${decodedMovieId} 在 ${todayStr} 的場次資料...`);
        
        // 發送 API 請求
        const response = await fetch(`${API_URL}/api/showtimes/movie/${encodeURIComponent(decodedMovieId)}?date=${todayStr}`);
        
        if (!response.ok) {
          throw new Error(`場次 API 請求失敗: ${response.status}`);
        }
        
        // 嘗試解析 JSON
        let data;
        try {
          data = await response.json();
        } catch (error) {
          console.error('JSON 解析錯誤:', error);
          throw new Error('獲取場次數據失敗: 無效的 JSON 格式');
        }
        
        // 檢查返回的數據是否為數組
        if (!Array.isArray(data)) {
          console.error('API 返回的數據不是數組:', data);
          throw new Error('獲取場次數據失敗: 返回的數據格式不正確');
        }
        
        // 如果數組為空，顯示提示
        if (data.length === 0) {
          console.log(`電影 ${decodedMovieId} 在 ${todayStr} 沒有場次資料`);
          setShowtimes([]);
          setShowtimesLoading(false);
          return;
        }
        
        console.log(`成功獲取 ${data.length} 個電影院的場次資料`);
        setShowtimes(data);
      } catch (error) {
        console.error('獲取場次資料失敗:', error);
        setShowtimes([]);
      } finally {
        setShowtimesLoading(false);
      }
    };
    
    fetchShowtimes();
  }, [decodedMovieId]);
  
  // 有場次的電影院列表
  const filteredCinemas = React.useMemo(() => {
    if (cinemasLoading || !Array.isArray(cinemas) || cinemas.length === 0) {
      return [];
    }
    
    // 找出有場次的電影院ID
    const cinemasWithShowtimes = findCinemasWithShowtimes(showtimes, cinemaQuery);
    
    // 過濾出有場次的電影院
    return cinemas.filter(cinema => cinemasWithShowtimes.includes(cinema.id));
  }, [cinemas, cinemasLoading, cinemaQuery, showtimes]);
  
  // 所有有場次的電影院數據 (用於地圖顯示)
  const allShowtimesByCinema = React.useMemo<Record<string, FormattedShowtime[]>>(() => {
    try {
      const groups: Record<string, FormattedShowtime[]> = {};
      
      if (showtimesLoading || !Array.isArray(showtimes) || showtimes.length === 0 || 
          !Array.isArray(cinemas) || cinemas.length === 0) {
        return groups;
      }
      
      // 取得選擇的日期
      const selectedDate = dateTabs[selectedDateIdx]?.date || '';
      const formattedDate = formatDateKey(selectedDate);
      
      // 計算日期字符串，用於比較
      const today = new Date();
      const todayStr = formatDateKey(today);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = formatDateKey(tomorrow);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      const dayAfterTomorrowStr = formatDateKey(dayAfterTomorrow);
      
      // 清理電影院名稱的輔助函數
      const cleanName = (name: string) => {
        const commonSuffixes = /影城$|大戲院$|影院$|劇場$|戲院$|數位影城$|數位劇院$|數位戲院$|電影城$|電影館$|藝術館$|藝文館$|國際影城$|巨幕影城$/;
        const commonPrefixes = /^喜滿客|^美麗華|^國賓|^威秀|^新光|^秀泰|^華納|^in89|^IN89|^atmovies|^ATmovies/;
        
        return name
          .replace(commonSuffixes, "")
          .replace(commonPrefixes, "")
          .replace(/\s+/g, "")
          .replace(/[^\w\s\u4e00-\u9fff]/g, "") // 移除特殊字元
          .toLowerCase()
          .trim();
      };
      
      // 計算匹配分數的輔助函數
      const calculateMatchScore = (name1: string, name2: string) => {
        const clean1 = cleanName(name1);
        const clean2 = cleanName(name2);
        
        // 完全匹配
        if (clean1 === clean2) return 100;
        
        // 包含關係匹配
        if (clean1.includes(clean2) || clean2.includes(clean1)) {
          const longerName = clean1.length > clean2.length ? clean1 : clean2;
          const shorterName = clean1.length <= clean2.length ? clean1 : clean2;
          return (shorterName.length / longerName.length) * 80; // 最高 80 分
        }
        
        // 部分匹配 (匹配前三個字)
        if (clean1.startsWith(clean2.substring(0, 3)) || clean2.startsWith(clean1.substring(0, 3))) {
          return 50;
        }
        
        return 0;
      };
      
      // 遍歷所有電影院，尋找匹配的場次
      cinemas.forEach(cinema => {
        if (!cinema || !cinema.name || !cinema.id) return;
        
        // 尋找電影院對應的場次資料
        const theaterData = showtimes.find(theater => {
          if (!theater || !theater.theater_name) return false;
          const matchScore = calculateMatchScore(cinema.name, theater.theater_name);
          return matchScore >= 50;
        });
        
        if (!theaterData || !Array.isArray(theaterData.showtimes_by_date)) return;
        
        // 尋找符合選擇日期的場次
        const dateData = theaterData.showtimes_by_date.find(d => {
          if (!d || !d.date) return false;
          
          // 擴展日期比對選擇，同時處理絕對日期和相對日期標籤
          return formattedDate === d.date || 
                 (formattedDate === todayStr && (d.date === '今天' || d.label === '今天')) ||
                 (formattedDate === tomorrowStr && (d.date === '明天' || d.label === '明天')) ||
                 (formattedDate === dayAfterTomorrowStr && (d.date === '後天' || d.label === '後天'));
        });
        
        // 如果有場次，則添加到結果中
        if (dateData && Array.isArray(dateData.showtimes) && dateData.showtimes.length > 0) {
          // 將場次轉換為需要的格式
          const formattedShowtimes = dateData.showtimes.map(s => {
            let time = s.time || '';
            
            // 嘗試從時間中提取純時間部分，如果有括號內容
            const timeMatch = time.match(/([0-9:]+)\s*\((.+?)\)/);
            if (timeMatch) time = timeMatch[1];
            
            return {
              time,
              lang: "", // ATMovies 沒有提供語言信息
              cinemaName: cinema.name,
              date: dateData.date
            };
          });
          
          // 將場次添加到對應的電影院組中
          groups[cinema.id] = formattedShowtimes;
        }
      });
      
      return groups;
    } catch (error) {
      console.error('處理場次資料時出錯:', error);
      return {};
    }
  }, [showtimes, showtimesLoading, cinemas, cinemasLoading, selectedDateIdx, dateTabs]);

  // 僅選中電影院的場次 group by 電影院，依照選擇的日期
  const showtimesByCinema = React.useMemo<Record<string, FormattedShowtime[]>>(() => {
    try {
      const groups: Record<string, FormattedShowtime[]> = {};
      
      // 如果沒有選擇電影院或資料載入中，返回空結果
      if (!Array.isArray(selectedCinemas) || selectedCinemas.length === 0 ||
          !allShowtimesByCinema || Object.keys(allShowtimesByCinema).length === 0) {
        return groups;
      }
      
      // 從 allShowtimesByCinema 中篩選出選中的電影院場次
      selectedCinemas.forEach(cinemaId => {
        if (allShowtimesByCinema[cinemaId]) {
          groups[cinemaId] = allShowtimesByCinema[cinemaId];
        }
      });
      
      return groups;
    } catch (error) {
      console.error('處理場次資料時出錯:', error);
      return {};
    }
  }, [allShowtimesByCinema, selectedCinemas]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-black text-white">
      <div className="w-full max-w-lg flex items-center mb-8">
        <Button variant="outline" onClick={() => router.push('/')} className="mr-4">
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{movie.name}</h1>
        </div>
        <div className="w-20 h-30 overflow-hidden rounded-md shadow-lg">
          <img 
            src={movie.poster || 'https://image.tmdb.org/t/p/w500/pWJW4c8jHRw0X0FMiRfvOUXKGgf.jpg'} 
            alt={movie.name} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              // 如果圖片載入失敗，使用預設圖片
              e.currentTarget.src = 'https://image.tmdb.org/t/p/w500/pWJW4c8jHRw0X0FMiRfvOUXKGgf.jpg';
            }}
          />
        </div>
      </div>
      
      {/* 地圖組件 - 傳遞場次資訊，只顯示有場次的電影院 */}
      <MapComponent 
        cinemas={filteredCinemas} 
        selectedCinemas={selectedCinemas} 
        setSelectedCinemas={setSelectedCinemas} 
        showtimesByCinema={allShowtimesByCinema}
        userLocation={userLocation}
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
        userLocation={userLocation}
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
