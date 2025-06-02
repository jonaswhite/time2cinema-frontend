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
  FormattedShowtime,
  Showtime // Added Showtime import
} from '@/components/showtimes/types';
import { formatDateKey, createDateTabs, findCinemasWithShowtimes, getDateLabel } from '@/components/showtimes/utils';
import MapComponent from '@/components/showtimes/MapComponent';
import CinemaSelector from '@/components/showtimes/CinemaSelector';
import ShowtimesList from '@/components/showtimes/ShowtimesList';

// Define RawTheaterData for normalizing theater data from various possible structures
interface RawTheaterData {
  theaterId?: string;       // Potential camelCase ID from some sources
  theaterName?: string;     // Potential camelCase name
  theater_id?: string;      // Potential snake_case ID from backend
  id?: string;              // Potential generic ID (e.g., from a Cinema object if mixed in)
  name?: string;            // Potential generic name (e.g., from a Cinema object if mixed in)
  showtimes?: Showtime[];   // Potential old structure for showtimes directly under theater
  showtimes_by_date?: { date: string; showtimes: Showtime[] }[]; // Correct new structure
  // any other properties that might be encountered before normalization
  [key: string]: any; // Allow other properties to avoid type errors if unexpected fields exist
}

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
  
  // 正規化電影名稱，處理不同變體
  const normalizeMovieName = (name: string | null | undefined): string => {
    // 確保 name 是字符串
    if (!name || typeof name !== 'string') return '';
    
    try {
      // 移除所有空格、標點符號和特殊字元
      const normalized = name
        .replace(/\s+/g, '') // 移除空格
        .replace(/[\u3000\u00A0]/g, '') // 移除全形空格
        .replace(/[\-\[\]\(\)「」【】《》""'']/g, '') // 移除括號
        .toLowerCase(); // 轉為小寫
      
      return normalized;
    } catch (error) {
      console.error('Error normalizing movie name:', error, 'Name:', name);
      return '';
    }
  };
  
  // 檢查兩個電影名稱是否匹配
  const isMovieNameMatch = (name1: string, name2: string): boolean => {
    const normalized1 = normalizeMovieName(name1);
    const normalized2 = normalizeMovieName(name2);
    
    // 直接匹配
    if (normalized1 === normalized2) return true;
    
    // 檢查數字表示法差異 (例如 "會計師 2" vs "會計師2")
    const digitRegex1 = normalized1.match(/(\D+)(\d+)/);
    const digitRegex2 = normalized2.match(/(\D+)(\d+)/);
    
    if (digitRegex1 && digitRegex2 && 
        digitRegex1[1] === digitRegex2[1] && 
        digitRegex1[2] === digitRegex2[2]) {
      return true;
    }
    
    // 包含關係
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      const longerName = normalized1.length > normalized2.length ? normalized1 : normalized2;
      const shorterName = normalized1.length <= normalized2.length ? normalized1 : normalized2;
      
      // 如果短名稱至少佔長名稱的80%，視為匹配
      if (shorterName.length / longerName.length >= 0.8) {
        return true;
      }
    }
    
    return false;
  };

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
        
        // 尋找對應的電影 - 使用智能匹配
        const movieData = data.find((movie: { title: string; posterUrl?: string; releaseDate?: string }) => 
          isMovieNameMatch(movie.title, decodedMovieId)
        );
        
        if (movieData) {
          console.log(`從快取找到電影: ${movieData.title} (原始查詢: ${decodedMovieId})`);
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
      try {
        setShowtimesLoading(true);
        
        // 使用 URL 參數中的電影 ID，而非 movie.id
        // 因為 movie.id 可能在載入場次時尚未載入完成
        const movieIdToUse = decodedMovieId;
        
        if (!movieIdToUse) {
          console.error('無效的電影 ID');
          setShowtimes([]);
          return;
        }
        
        // 格式化今天的日期為 YYYY-MM-DD
        const today = new Date();
        const todayStr = formatDateKey(today);
        
        // 記錄完整的 API 請求 URL
        const apiUrl = `${API_URL}/api/showtimes/movie/${encodeURIComponent(movieIdToUse)}`;
        console.log(`正在獲取場次資料... API URL: ${apiUrl}`);
        
        // 發送 API 請求
        const response = await fetch(apiUrl);
        
        // 詳細記錄回應狀態
        console.log('API 回應狀態:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (!response.ok) {
          throw new Error(`場次 API 請求失敗: ${response.status} ${response.statusText}`);
        }
        
        // 記錄原始回應內容
        const responseText = await response.text();
        console.log(`API 回應原始內容 (前 100 字符): ${responseText.substring(0, 100)}...`);
        
        // 嘗試解析 JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON 解析錯誤:', parseError);
          throw new Error('無法解析 API 回應為 JSON');
        }
        
        // 詳細記錄返回的數據類型
        console.log('API 返回數據類型:', {
          isArray: Array.isArray(data),
          type: typeof data,
          dataKeys: typeof data === 'object' ? Object.keys(data) : 'N/A',
          length: Array.isArray(data) ? data.length : (data && data.theaters ? data.theaters.length : 'N/A')
        });
        
        // 適應不同的數據格式
        let theatersData = [];
        
        // 檢查數據格式
        if (Array.isArray(data)) {
          // 直接使用數組
          theatersData = data;
        } else if (data && typeof data === 'object') {
          // 如果是對象，嘗試找到電影院數組
          if (Array.isArray(data.theaters)) {
            theatersData = data.theaters;
          } else if (Array.isArray(data.showtimes)) {
            theatersData = data.showtimes;
          } else if (data.data && Array.isArray(data.data)) {
            theatersData = data.data;
          }
        }
        
        // 如果沒有找到有效的電影院數組
        if (theatersData.length === 0) {
          console.log(`電影 ${movieIdToUse} 沒有場次資料`);
          setShowtimes([]);
          return;
        }
        
        console.log(`成功獲取 ${theatersData.length} 個電影院的場次資料`);
        
        // 詳細記錄第一個電影院的場次資料
        if (theatersData.length > 0) {
          const firstTheater = theatersData[0];
          console.log('第一個電影院場次資料:', firstTheater);
          
          // 嘗試檢測數據格式並適應
          if (firstTheater.theaterId && firstTheater.theaterName) {
            // 如果使用駐峰式命名，轉換為蛋式命名
            theatersData = theatersData.map((theater: RawTheaterData) => ({
              theater_id: theater.theaterId,
              theater_name: theater.theaterName,
              showtimes_by_date: Array.isArray(theater.showtimes) ? [{
                date: todayStr,
                showtimes: theater.showtimes // Restored showtimes
              }] : [] // Restored empty array fallback
            }));
          } else if (!firstTheater.theater_id || !firstTheater.theater_name) {
            // If essential snake_case properties are missing, try to construct them
            // This is the start of the restored else-if block and the second map call
            theatersData = theatersData.map((theater: RawTheaterData) => ({
              theater_id: theater.theater_id || theater.id || theater.theaterId || `theater-${Math.random().toString(36).substring(2, 9)}`,
              theater_name: theater.theater_name || theater.name || theater.theaterName || '未命名電影院',
              showtimes_by_date: theater.showtimes_by_date || (
                Array.isArray(theater.showtimes) ? [{
                  date: todayStr,
                  showtimes: theater.showtimes
                }] : []
              )
            }));
          }
          // This closing brace was for the 'if (theatersData.length > 0)' block
        }
        
        setShowtimes(theatersData);
      } catch (error) {
        console.error('獲取場次資料失敗:', error);
        setShowtimes([]);
      } finally {
        setShowtimesLoading(false);
      }
    };
    
    fetchShowtimes();
  }, [movie, loading, decodedMovieId, movieId]);
  
  // 有場次的電影院列表
  const filteredCinemas = React.useMemo(() => {
    try {
      console.log('filteredCinemas 計算開始...');
      console.log('cinemas 狀態:', {
        cinemasLoading,
        cinemasLength: Array.isArray(cinemas) ? cinemas.length : 'not array',
        showtimesLength: Array.isArray(showtimes) ? showtimes.length : 'not array',
        showtimesLoading
      });
      
      // 確保電影院數據已經載入
      if (cinemasLoading || !Array.isArray(cinemas) || cinemas.length === 0) {
        console.log('電影院數據尚未載入完成，返回空陣列');
        return [];
      }
      
      // 確保場次數據已經載入
      if (showtimesLoading) {
        console.log('場次數據尚未載入完成，返回空陣列');
        return [];
      }
      
      // 檢查場次數據的格式
      if (!Array.isArray(showtimes)) {
        console.error('場次數據不是陣列格式:', typeof showtimes);
        return [];
      }
      
      // 檢查場次數據是否為空
      if (showtimes.length === 0) {
        console.log('沒有找到任何場次數據，返回空陣列');
        return [];
      }
      
      console.log('場次數據結構的第一個項目:', JSON.stringify(showtimes[0]).substring(0, 200) + '...');
      
      // 找出有場次的電影院ID
      const cinemasWithShowtimes = findCinemasWithShowtimes(showtimes, cinemaQuery);
      console.log(`找到 ${cinemasWithShowtimes.length} 個有場次的電影院`);
      
      // 過濾出有場次的電影院，確保 ID 比較時都是字串類型
      const filtered = cinemas.filter(cinema => {
        const cinemaId = String(cinema.id);
        return cinemasWithShowtimes.some(id => String(id) === cinemaId);
      });
      console.log(`過濾後剩下 ${filtered.length} 個電影院`);
      
      // 如果過濾後沒有電影院，但有場次資料，則直接從場次資料建立電影院列表
      if (filtered.length === 0 && showtimes.length > 0) {
        console.log('從場次資料中直接建立電影院列表');
        
        // 建立一個 Map 來去除重複的電影院
        const cinemaMap = new Map();
        
        showtimes.forEach(theater => {
          if (theater && theater.theaterId && theater.theaterName) {
            cinemaMap.set(theater.theaterId, {
              id: theater.theaterId,
              name: theater.theaterName,
              address: '',
              latitude: 25.0330, // 預設台北市座標
              longitude: 121.5654
            });
          }
        });
        
        const cinemasFromShowtimes = Array.from(cinemaMap.values());
        console.log(`從場次資料中建立了 ${cinemasFromShowtimes.length} 個電影院`);
        return cinemasFromShowtimes;
      }
      
      return filtered;
    } catch (error) {
      console.error('filteredCinemas 計算錯誤:', error);
      return [];
    }
  }, [cinemas, cinemasLoading, cinemaQuery, showtimes, showtimesLoading]);
  
  // 根據選擇的日期和電影院篩選場次，並將其分組
  const allShowtimesByCinema = React.useMemo<Record<string, FormattedShowtime[]>>(() => {
    const groups: Record<string, FormattedShowtime[]> = {};
    if (showtimesLoading || !showtimes || !dateTabs || dateTabs.length === 0) {
      return groups;
    }

    const selectedDateObject = dateTabs[selectedDateIdx]?.date;
    if (!selectedDateObject) {
        return groups; 
    }
    const selectedDateString = formatDateKey(selectedDateObject);

    showtimes.forEach(theaterData => {
      if (!theaterData || !theaterData.theater_id || !theaterData.showtimes_by_date) {
        return;
      }

      const theaterId = String(theaterData.theater_id); // Ensure theaterId is string for key usage
      const theaterName = theaterData.theater_name || `電影院 ${theaterId}`;

      theaterData.showtimes_by_date.forEach(dateGroup => {
        if (dateGroup.date === selectedDateString) {
          if (!groups[theaterId]) {
            groups[theaterId] = [];
          }
          if (dateGroup.showtimes && Array.isArray(dateGroup.showtimes)) {
            dateGroup.showtimes.forEach((st, st_idx) => { // Added st_idx for unique ID generation
              // Basic validation for a showtime object - st.id might be optional in Showtime
              if (!st || !st.time) { 
                // console.warn('allShowtimesByCinema: Invalid showtime object (missing time):', st, 'in theater:', theaterId, 'date:', dateGroup.date);
                return;
              }

              let ft = st.time; // st.time is string as per Showtime type
              if (typeof ft === 'string' && ft.length === 8 && ft.charAt(2) === ':' && ft.charAt(5) === ':') {
                ft = ft.substring(0, 5); 
              }

              const formattedShowtime: FormattedShowtime = {
                ...st, 
                id: st.id ? String(st.id) : `${theaterId}-${selectedDateString}-${st.time}-${st_idx}`, // Ensure id is string and unique
                movie_id: String(st.movie_id || decodedMovieId), // Ensure movie_id is string
                movie_name: st.movie_name || movie?.name || "未知電影", 
                theater_id: theaterId, 
                theater_name: theaterName, 
                date: selectedDateString, // Correct: use selectedDateString (which is dateGroup.date)
                time: st.time, 
                type: st.type || "", // Default for type if undefined from st.type
                link: st.booking_link || st.link || "", // Default for link, prioritizing booking_link
                formattedTime: ft, // ft is string
                isAvailable: true, 
                formattedPrice: st.ticket_price ? `$${st.ticket_price}` : "洽詢影城",
                lang: st.lang || "",
                // booking_link is already part of ...st if st.booking_link exists, 
                // or it will be st.link if st.booking_link is undefined but st.link exists.
                // If FormattedShowtime's booking_link is optional, this is fine.
                // Let's re-check FormattedShowtime: booking_link?: string. So this is fine.
                // The explicit booking_link: st.booking_link || st.link line was actually redundant if we handle 'link' correctly.
                // Let's ensure the main 'link' field gets the priority booking_link if available.
              };
              groups[theaterId].push(formattedShowtime);
            });
          } else {
            // console.warn('allShowtimesByCinema: dateGroup.showtimes is not an array or undefined for theater:', theaterId, 'date:', dateGroup.date);
          }
        }
      });
    });

    return groups;
  }, [showtimes, showtimesLoading, selectedDateIdx, dateTabs, movie, decodedMovieId]);

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
    <main className="flex min-h-screen flex-col items-center px-4 md:px-8 py-6 bg-black text-white">
      <div className="w-full max-w-lg mx-auto flex items-center mb-6 md:mb-8">
        <Button variant="outline" onClick={() => router.push('/')} className="mr-4 text-sm py-1 px-3">
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold truncate">{movie.name}</h1>
        </div>
        <div className="w-16 md:w-20 h-24 md:h-30 overflow-hidden rounded-md shadow-lg">
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
      
      <div className="w-full max-w-lg mx-auto space-y-6 md:space-y-8">
        {/* 地圖組件 - 傳送場次資訊，只顯示有場次的電影院 */}
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
      </div>
    </main>
  );
}
