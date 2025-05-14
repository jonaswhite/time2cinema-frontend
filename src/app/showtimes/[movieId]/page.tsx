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
  
  // 正規化電影名稱，處理不同變體
  const normalizeMovieName = (name: string): string => {
    if (!name) return '';
    
    // 移除所有空格、標點符號和特殊字元
    const normalized = name
      .replace(/\s+/g, '') // 移除空格
      .replace(/[\u3000\u00A0]/g, '') // 移除全形空格
      .replace(/[\-\[\]\(\)「」【】《》“”‘’]/g, '') // 移除括號
      .toLowerCase(); // 轉為小寫
      
    return normalized;
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
      // 確保電影資訊已經載入完成
      if (loading || !movie || !movie.id) {
        console.log('電影資訊尚未載入完成:', { loading, movie: movie ? movie.id : 'null' });
        return;
      }
      
      try {
        setShowtimesLoading(true);
        
        // 格式化今天的日期為 YYYY-MM-DD
        const today = new Date();
        const todayStr = formatDateKey(today);
        
        // 詳細記錄電影資訊
        console.log('電影資訊:', {
          id: movie.id,
          name: movie.name,
          originalId: decodedMovieId,
          urlParam: movieId
        });
        
        // 使用電影資訊中的 ID，而非 URL 參數
        const movieIdToUse = movie.id;
        
        // 記錄完整的 API 請求 URL
        const apiUrl = `${API_URL}/api/showtimes/movie/${encodeURIComponent(movieIdToUse)}?date=${todayStr}`;
        console.log(`正在獲取場次資料... API URL: ${apiUrl}`);
        
        // 發送 API 請求
        const response = await fetch(apiUrl);
        
        // 詳細記錄回應狀態
        console.log('API 回應狀態:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
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
          length: Array.isArray(data) ? data.length : 'N/A'
        });
        
        // 如果數組為空，顯示提示
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`電影 ${movieIdToUse} 沒有場次資料`);
          setShowtimes([]);
          return;
        }
        
        console.log(`成功獲取 ${data.length} 個電影院的場次資料`);
        
        // 詳細記錄第一個電影院的場次資料
        if (data.length > 0) {
          const firstTheater = data[0];
          console.log('第一個電影院場次資料:', {
            theater_id: firstTheater.theater_id,
            theater_name: firstTheater.theater_name,
            showtimes_by_date_count: Array.isArray(firstTheater.showtimes_by_date) ? firstTheater.showtimes_by_date.length : 'N/A'
          });
        }
        
        setShowtimes(data);
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
          if (theater && theater.theater_id && theater.theater_name) {
            cinemaMap.set(String(theater.theater_id), {
              id: String(theater.theater_id),
              name: theater.theater_name,
              address: '',
              lat: 25.0330, // 預設台北市座標
              lng: 121.5654
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
        // 先嘗試精確匹配電影院 ID
        let theaterData = showtimes.find(theater => {
          return theater && theater.theater_id && theater.theater_id.toString() === cinema.id.toString();
        });
        
        // 如果沒有找到，嘗試名稱匹配
        if (!theaterData) {
          theaterData = showtimes.find(theater => {
            if (!theater || !theater.theater_name) return false;
            const matchScore = calculateMatchScore(cinema.name, theater.theater_name);
            // 降低匹配門檻
            return matchScore >= 30;
          });
        }
        
        // 如果還是沒有找到，嘗試更寬魅的匹配
        if (!theaterData) {
          theaterData = showtimes.find(theater => {
            if (!theater || !theater.theater_name) return false;
            // 簡單字符串包含匹配
            const cinemaNameLower = cinema.name.toLowerCase();
            const theaterNameLower = theater.theater_name.toLowerCase();
            return cinemaNameLower.includes(theaterNameLower) || theaterNameLower.includes(cinemaNameLower);
          });
        }
        
        if (!theaterData || !Array.isArray(theaterData.showtimes_by_date)) return;
        
        // 尋找符合選擇日期的場次
        // 先嘗試精確匹配日期
        let dateData = theaterData.showtimes_by_date.find(d => {
          if (!d || !d.date) return false;
          
          // 擴展日期比對選擇，同時處理絕對日期和相對日期標籤
          return formattedDate === d.date || 
                 (formattedDate === todayStr && (d.date === '今天' || d.label === '今天')) ||
                 (formattedDate === tomorrowStr && (d.date === '明天' || d.label === '明天')) ||
                 (formattedDate === dayAfterTomorrowStr && (d.date === '後天' || d.label === '後天'));
        });
        
        // 如果沒有找到精確匹配的日期，則使用第一個日期的場次
        if (!dateData && theaterData.showtimes_by_date.length > 0) {
          console.log(`找不到日期 ${formattedDate} 的場次，使用第一個日期的場次`);
          dateData = theaterData.showtimes_by_date[0];
        }
        
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
