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
        // 發生錯誤時使用預設值
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
        // 獲取今天的日期，格式為 YYYY-MM-DD
        const today = new Date();
        const todayStr = formatDateKey(today);
        console.log(`今天日期: ${todayStr}，查詢電影: ${decodedMovieId}`);
        
        // 使用正確的 API 路徑，將日期作為查詢參數
        const response = await fetch(`${API_URL}/api/showtimes/movie/${encodeURIComponent(decodedMovieId)}?date=${todayStr}`, {
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
            const today = new Date(); // 使用當前日期
            const todayStr = formatDateKey(today);
            console.log(`今天日期字串: ${todayStr}`);
            
            // 尋找有今天場次的電影院
            const cinemasWithTodayShowtimes = [];
            for (const theater of data) {
              const cinema = cinemas.find(c => {
                // 常見的電影院名稱後綴和前綴
                const commonSuffixes = /影城$|大戲院$|影院$|劇場$|戲院$|數位影城$|數位劇院$|數位戲院$|電影城$|電影館$|藝術館$|藝文館$|國際影城$|巨幕影城$/;
                const commonPrefixes = /^喜滿客|^美麗華|^國賓|^威秀|^新光|^秀泰|^華納|^in89|^IN89|^atmovies|^ATmovies/;
                
                // 清理電影院名稱
                const cleanCinemaName = c.name
                  .replace(commonSuffixes, "")
                  .replace(commonPrefixes, "")
                  .replace(/\s+/g, "")
                  .replace(/[^\w\s\u4e00-\u9fff]/g, "") // 移除特殊字元，保留中文和英文數字
                  .toLowerCase()
                  .trim();
                  
                const cleanTheaterName = theater.theater_name
                  .replace(commonSuffixes, "")
                  .replace(commonPrefixes, "")
                  .replace(/\s+/g, "")
                  .replace(/[^\w\s\u4e00-\u9fff]/g, "") // 移除特殊字元，保留中文和英文數字
                  .toLowerCase()
                  .trim();
                  
                // 計算匹配分數
                let matchScore = 0;
                
                // 完全匹配
                if (cleanCinemaName === cleanTheaterName) {
                  matchScore = 100;
                }
                // 包含關係匹配
                else if (cleanCinemaName.includes(cleanTheaterName) || cleanTheaterName.includes(cleanCinemaName)) {
                  // 計算包含字元的比例
                  const longerName = cleanCinemaName.length > cleanTheaterName.length ? cleanCinemaName : cleanTheaterName;
                  const shorterName = cleanCinemaName.length <= cleanTheaterName.length ? cleanCinemaName : cleanTheaterName;
                  matchScore = (shorterName.length / longerName.length) * 80; // 最高 80 分
                }
                // 部分匹配 (匹配前三個字)
                else if (cleanCinemaName.startsWith(cleanTheaterName.substring(0, 3)) || 
                         cleanTheaterName.startsWith(cleanCinemaName.substring(0, 3))) {
                  matchScore = 50;
                }
                
                const isMatch = matchScore >= 50;
                
                if (isMatch) {
                  console.log(`電影院匹配: ${c.name} <==> ${theater.theater_name} (分數: ${matchScore})`);
                }
                
                return isMatch;
              });
              
              if (cinema) {
                // 尋找今天的場次，使用日期比對
                const hasTodayShowtimes = theater.showtimes_by_date.some((d: { date: string; showtimes: any[] }) => {
                  if (!d || !Array.isArray(d.showtimes)) return false;
                  
                  // 檢查日期是否為今天
                  const showDate = d.date;
                  const isTodayShowtime = showDate === todayStr;
                  
                  const hasShowtimes = d.showtimes.length > 0;
                  console.log(`電影院 ${cinema.name} 日期 ${d.date} 是今天: ${isTodayShowtime}, 有場次: ${hasShowtimes}`);
                  
                  // 只返回今天且有場次的情況
                  return isTodayShowtime && hasShowtimes;
                });
                
                if (hasTodayShowtimes) {
                  cinemasWithTodayShowtimes.push(cinema.id);
                  console.log(`電影院 ${cinema.name} 有今天的場次，添加到預設選擇`);
                }
              }
            }
            
            console.log(`有今天場次的電影院數量: ${cinemasWithTodayShowtimes.length}`);
            
            // 如果有今天場次的電影院，則預設選擇這些電影院
            if (cinemasWithTodayShowtimes.length > 0) {
              console.log(`預設選擇有今天場次的電影院`);
              setSelectedCinemas(cinemasWithTodayShowtimes);
              // 預設選擇今天的日期標簽
              setSelectedDateIdx(0); // 今天在第一個位置 (index 0)
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
  
  // 所有有場次的電影院數據 (用於地圖顯示)
  const allShowtimesByCinema = React.useMemo<Record<string, FormattedShowtime[]>>(() => {
    try {
      const groups: Record<string, FormattedShowtime[]> = {};
      
      if (showtimesLoading || !Array.isArray(showtimes) || showtimes.length === 0 || 
          !Array.isArray(cinemas) || cinemas.length === 0) {
        console.log('資料載入中或空值，返回空場次組');
        return groups;
      }
      
      // 取得選擇的日期
      const selectedDate = dateTabs[selectedDateIdx].date;
      const formattedDate = formatDateKey(selectedDate);
      
      // 遍歷每個電影院
      cinemas.forEach(cinema => {
        console.log(`處理電影院: ${cinema.name} (ID: ${cinema.id})`);
        // 尋找電影院對應的場次資料
        const theaterData = showtimes.find(theater => {
          // 常見的電影院名稱後綴和前綴
          const commonSuffixes = /影城$|大戲院$|影院$|劇場$|戲院$|數位影城$|數位劇院$|數位戲院$|電影城$|電影館$|藝術館$|藝文館$|國際影城$|巨幕影城$/;
          const commonPrefixes = /^喜滿客|^美麗華|^國賓|^威秀|^新光|^秀泰|^華納|^in89|^IN89|^atmovies|^ATmovies/;
          
          // 清理電影院名稱
          const cleanCinemaName = cinema.name
            .replace(commonSuffixes, "")
            .replace(commonPrefixes, "")
            .replace(/\s+/g, "")
            .replace(/[^\w\s\u4e00-\u9fff]/g, "") // 移除特殊字元，保留中文和英文數字
            .toLowerCase()
            .trim();
            
          const cleanTheaterName = theater.theater_name
            .replace(commonSuffixes, "")
            .replace(commonPrefixes, "")
            .replace(/\s+/g, "")
            .replace(/[^\w\s\u4e00-\u9fff]/g, "") // 移除特殊字元，保留中文和英文數字
            .toLowerCase()
            .trim();
            
          // 計算匹配分數
          let matchScore = 0;
          
          // 完全匹配
          if (cleanCinemaName === cleanTheaterName) {
            matchScore = 100;
          }
          // 包含關係匹配
          else if (cleanCinemaName.includes(cleanTheaterName) || cleanTheaterName.includes(cleanCinemaName)) {
            // 計算包含字元的比例
            const longerName = cleanCinemaName.length > cleanTheaterName.length ? cleanCinemaName : cleanTheaterName;
            const shorterName = cleanCinemaName.length <= cleanTheaterName.length ? cleanCinemaName : cleanTheaterName;
            matchScore = (shorterName.length / longerName.length) * 80; // 最高 80 分
          }
          // 部分匹配 (匹配前三個字)
          else if (cleanCinemaName.startsWith(cleanTheaterName.substring(0, 3)) || 
                   cleanTheaterName.startsWith(cleanCinemaName.substring(0, 3))) {
            matchScore = 50;
          }
          
          const isMatch = matchScore >= 50;
          
          if (isMatch) {
            console.log(`電影院匹配: ${cinema.name} <==> ${theater.theater_name} (分數: ${matchScore})`);
          }
          
          return isMatch;
        });
        
        if (theaterData && Array.isArray(theaterData.showtimes_by_date)) {
          // 尋找符合選擇日期的場次
          const dateData = theaterData.showtimes_by_date.find(d => {
            if (!d || !d.date) return false;
            
            // 取得所有日期格式
            const formattedDateStr = formattedDate;
            const todayStr = formatDateKey(new Date());
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = formatDateKey(tomorrow);
            const dayAfterTomorrow = new Date();
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            const dayAfterTomorrowStr = formatDateKey(dayAfterTomorrow);
            
            // 擴展日期比對邏輯，同時處理絕對日期和相對日期標籤
            const isMatch = 
              // 直接比對日期字串
              d.date === formattedDateStr || 
              // 處理相對日期標籤
              (formattedDateStr === todayStr && (d.date === '今天' || d.label === '今天')) ||
              (formattedDateStr === tomorrowStr && (d.date === '明天' || d.label === '明天')) ||
              (formattedDateStr === dayAfterTomorrowStr && (d.date === '後天' || d.label === '後天'));
            
            console.log(`電影院 ${cinema.name} 日期比對詳情: 
              場次日期: ${d.date} (標籤: ${d.label || '無標籤'})
              對比日期: ${formattedDateStr}
              今天: ${todayStr} | 明天: ${tomorrowStr} | 後天: ${dayAfterTomorrowStr}
              比對結果: ${isMatch}`);
            
            return isMatch;
          });
          
          // 如果有場次，則添加到結果中
          if (dateData && Array.isArray(dateData.showtimes) && dateData.showtimes.length > 0) {
            console.log(`電影院 ${cinema.name} 在日期 ${dateData.date} 有 ${dateData.showtimes.length} 個場次`);
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
          }
        }
      });
      
      return groups;
    } catch (error) {
      console.error('處理所有場次資料時出錯:', error);
      return {};
    }
  }, [showtimes, showtimesLoading, cinemas, cinemasLoading, selectedDateIdx, dateTabs]);

  // 僅選中電影院的場次 group by 電影院，依照選擇的日期
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
          // 常見的電影院名稱後綴和前綴
          const commonSuffixes = /影城$|大戲院$|影院$|劇場$|戲院$|數位影城$|數位劇院$|數位戲院$|電影城$|電影館$|藝術館$|藝文館$|國際影城$|巨幕影城$/;
          const commonPrefixes = /^喜滿客|^美麗華|^國賓|^威秀|^新光|^秀泰|^華納|^in89|^IN89|^atmovies|^ATmovies/;
          
          // 清理電影院名稱
          const cleanCinemaName = cinema.name
            .replace(commonSuffixes, "")
            .replace(commonPrefixes, "")
            .replace(/\s+/g, "")
            .replace(/[^\w\s\u4e00-\u9fff]/g, "") // 移除特殊字元，保留中文和英文數字
            .toLowerCase()
            .trim();
            
          const cleanTheaterName = theater.theater_name
            .replace(commonSuffixes, "")
            .replace(commonPrefixes, "")
            .replace(/\s+/g, "")
            .replace(/[^\w\s\u4e00-\u9fff]/g, "") // 移除特殊字元，保留中文和英文數字
            .toLowerCase()
            .trim();
            
          // 計算匹配分數
          let matchScore = 0;
          
          // 完全匹配
          if (cleanCinemaName === cleanTheaterName) {
            matchScore = 100;
          }
          // 包含關係匹配
          else if (cleanCinemaName.includes(cleanTheaterName) || cleanTheaterName.includes(cleanCinemaName)) {
            // 計算包含字元的比例
            const longerName = cleanCinemaName.length > cleanTheaterName.length ? cleanCinemaName : cleanTheaterName;
            const shorterName = cleanCinemaName.length <= cleanTheaterName.length ? cleanCinemaName : cleanTheaterName;
            matchScore = (shorterName.length / longerName.length) * 80; // 最高 80 分
          }
          // 部分匹配 (匹配前三個字)
          else if (cleanCinemaName.startsWith(cleanTheaterName.substring(0, 3)) || 
                   cleanTheaterName.startsWith(cleanCinemaName.substring(0, 3))) {
            matchScore = 50;
          }
          
          const isMatch = matchScore >= 50;
          
          if (isMatch) {
            console.log(`電影院匹配: ${cinema.name} <==> ${theater.theater_name} (分數: ${matchScore})`);
          }
          
          return isMatch;
        });
        
        if (theaterData && Array.isArray(theaterData.showtimes_by_date)) {
          console.log(`電影院 ${cinema.name} 有 ${theaterData.showtimes_by_date.length} 個日期的場次資料`);
          
          // 尋找符合選擇日期的場次
          const dateData = theaterData.showtimes_by_date.find(d => {
            if (!d || !d.date) return false;
            
            // 取得所有日期格式
            const formattedDateStr = formattedDate;
            const todayStr = formatDateKey(new Date());
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = formatDateKey(tomorrow);
            const dayAfterTomorrow = new Date();
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            const dayAfterTomorrowStr = formatDateKey(dayAfterTomorrow);
            
            // 擴展日期比對邏輯，同時處理絕對日期和相對日期標籤
            const isMatch = 
              // 直接比對日期字串
              d.date === formattedDateStr || 
              // 處理相對日期標籤
              (formattedDateStr === todayStr && (d.date === '今天' || d.label === '今天')) ||
              (formattedDateStr === tomorrowStr && (d.date === '明天' || d.label === '明天')) ||
              (formattedDateStr === dayAfterTomorrowStr && (d.date === '後天' || d.label === '後天'));
            
            console.log(`電影院 ${cinema.name} 日期比對詳情: 
              場次日期: ${d.date} (標籤: ${d.label || '無標籤'})
              對比日期: ${formattedDateStr}
              今天: ${todayStr} | 明天: ${tomorrowStr} | 後天: ${dayAfterTomorrowStr}
              比對結果: ${isMatch}`);
            
            return isMatch;
          });
          
          // 如果選擇的日期沒有場次，則不添加場次
          if (!dateData) {
            console.log(`電影院 ${cinema.name} 在選擇的日期 ${formattedDate} 沒有場次`);
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
        cinemas={cinemas} 
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