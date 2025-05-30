"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import API_URL from '@/config/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// 票房資料介面 - 符合後端 API 回傳格式
interface BoxOfficeMovie {
  id: number; // 電影 ID
  title: string; // 電影標題
  original_title: string | null; // 原始標題
  rank: number; // 排名
  tickets: number; // 票數
  totalsales: number | null; // 累計票數
  release_date: string | null; // 上映日
  week_start_date: string; // 週開始日期
  poster_url: string | null; // 海報 URL (與後端 API 一致)
  runtime: number | null; // 片長（分鐘）
  tmdb_id: number | null; // TMDB ID
}

// 上映中電影介面 - 與票房資料介面統一
interface NowShowingMovie {
  id: number; // 電影 ID
  title: string; // 電影標題
  original_title: string | null; // 原始標題
  release_date: string | null; // 上映日期
  poster_url: string | null; // 海報 URL (與後端 API 一致)
  runtime: number | null; // 片長（分鐘）
  tmdb_id: number | null; // TMDB ID
}

// 前端顯示用的電影資料介面
interface DisplayMovie {
  rank?: number; // 只有票房榜有排名
  title: string;
  original_title?: string | null; // 原始標題
  weeklySales?: string; // 只有票房榜有週票數
  releaseDate: string;
  poster: string | null;
  runtime?: number | null; // 片長（分鐘）
  id?: string;
  isLoadingPoster?: boolean; // 是否正在加載海報
  tmdb_id?: number | null; // TMDB ID
}

// 電影海報映射表（中英文片名都支援）
const posterMap: Record<string, string> = {
  "沙丘：第二部": "https://image.tmdb.org/t/p/w500/8uUU2pxm6IYZw8UgnKJyx7Dqwu9.jpg",
  "Dune: Part Two": "https://image.tmdb.org/t/p/w500/8uUU2pxm6IYZw8UgnKJyx7Dqwu9.jpg",
  "鬼殺人小丸": "https://image.tmdb.org/t/p/w500/2EewmxXe72ogD0EaWM8gqa0ccIw.jpg",
  "龍貓特工隊": "https://image.tmdb.org/t/p/w500/1m1r3wPz65Dy7W5dDzrQJqZy6lT.jpg",
  "從前有座山": "https://image.tmdb.org/t/p/w500/7Zr0y5lXW9XyQ5bHq6QyJ1Q0A0t.jpg",
  "死侵": "https://image.tmdb.org/t/p/w500/9v2rU5FzzeU9yM54oVwWQzD1g0g.jpg",
  "黑貓偵探": "https://image.tmdb.org/t/p/w500/8uUU2pxm6IYZw8UgnKJyx7Dqwu9.jpg",
  "小小兵": "https://image.tmdb.org/t/p/w500/2EewmxXe72ogD0EaWM8gqa0ccIw.jpg",
  "天才少女": "https://image.tmdb.org/t/p/w500/1m1r3wPz65Dy7W5dDzrQJqZy6lT.jpg",
  "時空旅人": "https://image.tmdb.org/t/p/w500/7Zr0y5lXW9XyQ5bHq6QyJ1Q0A0t.jpg",
  "超能力家族": "https://image.tmdb.org/t/p/w500/9v2rU5FzzeU9yM54oVwWQzD1g0g.jpg",
  // 添加「獵金遊戲」的所有可能變體
  "獵金遊戲": "https://image.tmdb.org/t/p/w500/bZCn9RaWvNhFXXrjEEvLDHtvOJy.jpg",
  "獵金遊戲：無路可逃": "https://image.tmdb.org/t/p/w500/bZCn9RaWvNhFXXrjEEvLDHtvOJy.jpg",
  "The Roundup: No Way Out": "https://image.tmdb.org/t/p/w500/bZCn9RaWvNhFXXrjEEvLDHtvOJy.jpg",
  "The Roundup": "https://image.tmdb.org/t/p/w500/bZCn9RaWvNhFXXrjEEvLDHtvOJy.jpg",
};

// 格式化票房數字
const formatTickets = (tickets: number | null): string => {
  if (tickets === null || !tickets || isNaN(tickets)) return '-';
  if (tickets >= 10000) {
    return `${(tickets / 10000).toFixed(1)}萬張`;
  }
  return `${tickets.toLocaleString()}張`;
};

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("box-office"); // 預設顯示「本週票房」標籤
  const [query, setQuery] = useState("");
  const [boxOfficeData, setBoxOfficeData] = useState<DisplayMovie[]>([]);
  const [nowShowingData, setNowShowingData] = useState<DisplayMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowShowingLoading, setNowShowingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowShowingError, setNowShowingError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 創建一個幫助函數，檢查標題是否相似（忽略空格和大小寫）
  const isSimilarTitle = (title1: string | null | undefined, title2: string | null | undefined): boolean => {
    // 確保兩個標題都是字符串且非空
    if (typeof title1 !== 'string' || typeof title2 !== 'string' || !title1 || !title2) return false;
    
    try {
      const normalized1 = title1.toLowerCase().replace(/\s+/g, '');
      const normalized2 = title2.toLowerCase().replace(/\s+/g, '');
      return normalized1 === normalized2;
    } catch (error) {
      console.error('Error comparing titles:', error);
      return false;
    }
  };

  // 獲取海報 URL 的輔助函數
  const getPosterUrl = (movieTitle: string | null | undefined, defaultPoster?: string | null): string | null => {
    // 確保 movieTitle 是字符串且非空
    if (typeof movieTitle !== 'string' || !movieTitle) {
      return defaultPoster || null;
    }
    
    try {
      // 如果有直接匹配的海報，則使用它
      if (defaultPoster) return defaultPoster;
      
      // 如果在 posterMap 中有完全匹配的條目，則使用它
      if (posterMap[movieTitle]) return posterMap[movieTitle];
      
      // 嘗試在 posterMap 中查找相似的電影標題
      for (const [title, url] of Object.entries(posterMap)) {
        if (isSimilarTitle(title, movieTitle)) {
          console.log(`找到相似電影標題匹配: ${movieTitle} ≈ ${title}`);
          return url;
        }
      }
    } catch (error) {
      console.error('Error getting poster URL:', error);
      return defaultPoster || null;
    }
    
    // 如果沒有找到匹配，返回 null
    return null;
  };

  // 從後端 API 獲取票房資料
  const fetchBoxOffice = async (forceRefresh = false) => {
    try {
      // 如果不是強制刷新且有快取資料，則使用快取資料
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('boxOfficeData');
        const cachedTimestamp = localStorage.getItem('boxOfficeTimestamp');
        
        if (cachedData && cachedTimestamp) {
          const parsedData = JSON.parse(cachedData);
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // 如果快取時間在 30 分鐘內，直接使用快取資料
          if (now - timestamp < 30 * 60 * 1000 && parsedData.length > 0) {
            console.log('使用本地快取的票房資料');
            setBoxOfficeData(parsedData);
            setError(null);
            setLoading(false);
            return;
          }
        }
      }
      
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // 直接使用 boxoffice API 來獲取票房資料
      const url = forceRefresh 
        ? `${API_URL}/api/boxoffice?refresh=true`
        : `${API_URL}/api/boxoffice`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const data = await response.json();

      // 將後端資料轉換為前端顯示格式，直接使用後端返回的 poster_url
      const displayData: DisplayMovie[] = data.map((movie: BoxOfficeMovie) => ({
        rank: movie.rank,
        title: movie.title,
        weeklySales: formatTickets(movie.tickets),
        releaseDate: movie.release_date || "未知",
        poster: movie.poster_url, // 使用後端返回的 poster_url
        runtime: movie.runtime || null,
        id: movie.id ? movie.id.toString() : `unknown-${Math.random().toString(36).substring(2, 9)}`, // 增加空值檢查，避免 TypeError
        isLoadingPoster: !movie.poster_url // 如果沒有 poster_url 則需要加載
      }));
      
      // 設置票房資料
      setBoxOfficeData(displayData);
      
      // 不再需要單獨獲取海報

      // 保存到本地快取
      localStorage.setItem('boxOfficeData', JSON.stringify(displayData));
      localStorage.setItem('boxOfficeTimestamp', Date.now().toString());

      setError(null);
    } catch (err) {
      console.error('獲取票房資料失敗:', err);
      setError('獲取票房資料失敗，請稍後再試');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 從後端 API 獲取上映中電影資料
  const fetchNowShowingMovies = async (forceRefresh = false) => {
    setNowShowingLoading(true);
    
    try {
      // 如果不是強制刷新且有快取資料，則使用快取資料
      if (!forceRefresh) {
        const cachedData = localStorage.getItem('nowShowingData');
        const cachedTimestamp = localStorage.getItem('nowShowingTimestamp');
        
        if (cachedData && cachedTimestamp) {
          const parsedData = JSON.parse(cachedData);
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // 如果快取時間在 30 分鐘內，直接使用快取資料
          if (now - timestamp < 30 * 60 * 1000 && parsedData.length > 0) {
            console.log('使用本地快取的上映中電影資料');
            setNowShowingData(parsedData);
            setNowShowingError(null);
            setNowShowingLoading(false);
            return;
          }
        }
      }
      
      // 發送 API 請求
      const response = await fetch(`${API_URL}/api/movies/now-showing`);
      
      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 轉換為 DisplayMovie 格式
      const formattedMovies: DisplayMovie[] = data.map((movie: NowShowingMovie) => ({
        id: movie.id?.toString() || '',
        title: movie.title || '未知電影',
        original_title: movie.original_title,
        releaseDate: movie.release_date || '未知',
        poster: movie.poster_url,  // 使用 poster_url 欄位
        runtime: movie.runtime,
        tmdb_id: movie.tmdb_id,
        isLoadingPoster: !movie.poster_url // 如果沒有海報，則標記為需要加載
      }));
      
      setNowShowingData(formattedMovies);
      
      // 儲存到本地快取
      localStorage.setItem('nowShowingData', JSON.stringify(formattedMovies));
      localStorage.setItem('nowShowingTimestamp', Date.now().toString());
      
      // 不再需要單獨獲取海報
      
      setNowShowingError(null);
    } catch (error) {
      console.error('獲取上映中電影時出錯:', error);
      setNowShowingError('獲取上映中電影失敗，請稍後再試');
      
      // 如果 API 請求失敗，嘗試從本地儲存載入
      const cachedData = localStorage.getItem('nowShowingData');
      if (cachedData) {
        setNowShowingData(JSON.parse(cachedData));
      }
    } finally {
      setNowShowingLoading(false);
    }
  };

  // 不再需要單獨的海報獲取函數，直接使用後端 API 返回的 poster_url

  // 格式化日期為 YYYY-MM-DD 格式
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      // 檢查日期是否有效
      if (isNaN(date.getTime())) return '未知';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('日期格式化錯誤:', error);
      return '未知';
    }
  };

  // 創建一個可重用的電影卡片元件
  const MovieCard = ({ movie }: { movie: DisplayMovie }) => {
    // 格式化日期為 YYYY-MM-DD 格式
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return '未知';
      try {
        const date = new Date(dateString);
        // 檢查日期是否有效
        if (isNaN(date.getTime())) return '未知';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('日期格式化錯誤:', error);
        return '未知';
      }
    };

    // 檢查 URL 是否為有效的圖片網址
    const isValidImageUrl = (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string' || url.trim() === '') {
        return false;
      }
      
      // 檢查是否為有效的圖片網址（支援 http/https 開頭或 / 開頭的路徑）
      const trimmedUrl = url.trim();
      return (
        trimmedUrl.startsWith('http://') || 
        trimmedUrl.startsWith('https://') ||
        trimmedUrl.startsWith('/')
      );
    };

    // 嘗試從本地映射表獲取海報，如果 movie.poster 為 null
    const getPosterFromLocalMap = (title: string | null | undefined) => {
      // 確保 title 是字符串且非空
      if (typeof title !== 'string' || !title) return null;
      
      try {
        // 先在本地映射表中尋找完全匹配
        if (posterMap[title]) {
          return posterMap[title];
        }
        
        // 再尋找相似的標題
        for (const [mapTitle, url] of Object.entries(posterMap)) {
          if (isSimilarTitle(mapTitle, title)) {
            return url;
          }
        }
      } catch (error) {
        console.error('Error getting poster from local map:', error);
      }
      
      return null;
    };
    
    // 確保無論如何都有一個預設圖片
    const DEFAULT_POSTER = "https://placehold.co/400x600/222/444?text=No+Poster";
    
    // 直接使用 API 返回的 poster_url，如果沒有則使用預設圖片
    const posterUrl = movie.poster || DEFAULT_POSTER;
    
    // 生成唯一的 key，結合多個屬性來確保唯一性
    const uniqueKey = `movie-${movie.id || ''}-${movie.title}-${movie.releaseDate || ''}`.replace(/\s+/g, '-')
    
    return (
    <Card
      key={uniqueKey}
      className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2 cursor-pointer hover:bg-neutral-800 transition-colors"
      onClick={() => router.push(`/showtimes/${encodeURIComponent(movie.title)}`)}
    >
      <div className="relative w-16 h-24 bg-gray-200 rounded-lg overflow-hidden mr-4 flex-shrink-0">
        {posterUrl ? (
          <img 
            src={posterUrl}
            alt={movie.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.warn(`電影 ${movie.title} 圖片載入失敗: ${posterUrl}`);
              e.currentTarget.onerror = null; // 防止無限循環
              e.currentTarget.src = "https://placehold.co/400x600/222/444?text=No+Poster";
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {movie.isLoadingPoster ? (
              <div className="animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            )}
          </div>
        )}
      </div>
      <CardContent className="flex flex-col justify-between h-24 items-start flex-1 p-0 py-0.5">
        <div>
          <h2 className="text-white text-base font-medium tracking-wide mb-1 line-clamp-1">
            {movie.title}
          </h2>
          <div className="text-neutral-400 text-xs">上映日：{formatDate(movie.releaseDate)}</div>
        </div>
        <div className="text-neutral-400 text-xs">
          {movie.runtime ? `片長：${movie.runtime} 分鐘` : ''}
        </div>
      </CardContent>
    </Card>
  );
};

  // 初始載入資料
  useEffect(() => {
    // 添加客戶端檢查
    const isClient = typeof window !== 'undefined';
    
    if (isClient) {
      fetchBoxOffice();
      fetchNowShowingMovies();
    }
  }, []);

  // 根據搜尋關鍵字過濾電影
  const filteredBoxOffice = boxOfficeData.filter((movie) => {
    // 確保 title 是字符串且非空
    if (typeof movie.title !== 'string' || !movie.title) return false;
    try {
      return movie.title.toLowerCase().includes(query.toLowerCase());
    } catch (error) {
      console.error('Error filtering box office movie:', error);
      return false;
    }
  });

  const filteredNowShowing = nowShowingData.filter((movie) => {
    // 確保 title 是字符串且非空
    if (typeof movie.title !== 'string' || !movie.title) return false;
    try {
      return movie.title.toLowerCase().includes(query.toLowerCase());
    } catch (error) {
      console.error('Error filtering now showing movie:', error);
      return false;
    }
  });

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-2 bg-black">
      <div className="flex items-center justify-between w-full max-w-lg mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Time2Cinema</h1>
      </div>

      <Input
        type="text"
        placeholder="搜尋電影名稱..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="max-w-xs mb-4 mx-auto bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-primary"
      />

      {!query && (
        <Tabs 
          defaultValue="box-office" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full max-w-lg mb-6"
        >
          <TabsList className="grid w-full grid-cols-2 bg-neutral-900 border border-neutral-800">
            <TabsTrigger 
              value="box-office" 
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white data-[state=inactive]:text-neutral-500 font-medium"
            >
              本週票房
            </TabsTrigger>
            <TabsTrigger 
              value="now-showing" 
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white data-[state=inactive]:text-neutral-500 font-medium"
            >
              上映中
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="w-full max-w-lg flex flex-col gap-4 mx-auto">
        {query ? (
          // 搜尋模式：合併顯示所有符合搜尋條件的電影
          <>
            {loading || nowShowingLoading ? (
              // 骨架屏代替簡單的載入中文字
              Array(3).fill(0).map((_, index) => (
                <Card key={index} className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2">
                  <Skeleton className="w-16 h-24 rounded-lg bg-neutral-800" />
                  <div className="flex flex-col justify-between h-24 items-start flex-1 p-0 py-0.5 ml-4">
                    <div className="w-full">
                      <Skeleton className="h-5 w-3/4 bg-neutral-800 mb-1" />
                      <Skeleton className="h-3 w-1/2 bg-neutral-800" />
                    </div>
                    <Skeleton className="h-3 w-1/3 bg-neutral-800" />
                  </div>
                </Card>
              ))
            ) : error || nowShowingError ? (
              <div className="text-red-400 text-center py-4">{error || nowShowingError}</div>
            ) : filteredBoxOffice.length === 0 && filteredNowShowing.length === 0 ? (
              <div className="text-neutral-500 text-center py-8">查無電影</div>
            ) : (
              // 合併兩個列表並去除重複電影
              (() => {
                const movieTitles = new Set<string>();
                const combinedMovies: DisplayMovie[] = [];
                
                // 先加入票房榜電影
                filteredBoxOffice.forEach(movie => {
                  if (!movieTitles.has(movie.title)) {
                    movieTitles.add(movie.title);
                    combinedMovies.push(movie);
                  }
                });
                
                // 再加入上映中電影
                filteredNowShowing.forEach(movie => {
                  if (!movieTitles.has(movie.title)) {
                    movieTitles.add(movie.title);
                    combinedMovies.push(movie);
                  }
                });
                
                return combinedMovies.map((movie) => (
                  <Card
                    key={`${movie.id || ''}-${movie.title}`}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2 cursor-pointer hover:bg-neutral-800 transition-colors"
                    onClick={() => router.push(`/showtimes/${encodeURIComponent(movie.title)}`)}
                  >
                    <div className="relative w-16 h-24 bg-gray-200 rounded-lg overflow-hidden mr-4 flex-shrink-0">
                      {movie.poster ? (
                        <img 
                          src={movie.poster}
                          alt={movie.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn(`電影 ${movie.title} 圖片載入失敗: ${movie.poster}`);
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://placehold.co/400x600/222/444?text=No+Poster";
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-between h-24 items-start flex-1 p-0 py-0.5">
                      <div>
                        <h2 className="text-white text-base font-medium tracking-wide mb-1 line-clamp-1">
                          {movie.title}
                        </h2>
                        <div className="text-neutral-400 text-xs">上映日：{formatDate(movie.releaseDate)}</div>
                      </div>
                      <div className="text-neutral-400 text-xs">
                        {movie.runtime ? `片長：${movie.runtime} 分鐘` : ''}
                      </div>
                    </div>
                  </Card>
                ));
              })()
            )}
』          </>
        ) : activeTab === "box-office" ? (
          // 本週票房內容
          loading ? (
            // 骨架屏代替簡單的載入中文字
            Array(5).fill(0).map((_, index) => (
              <Card key={index} className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2">
                <Skeleton className="w-16 h-24 rounded-lg bg-neutral-800" />
                <CardContent className="flex flex-col justify-between h-24 items-start flex-1 p-0 py-0.5 ml-4">
                  <div className="w-full">
                    <Skeleton className="h-5 w-3/4 bg-neutral-800 mb-1" />
                    <Skeleton className="h-3 w-1/2 bg-neutral-800" />
                  </div>
                  <Skeleton className="h-3 w-1/3 bg-neutral-800" />
                </CardContent>
              </Card>
            ))
          ) : error ? (
            <div className="text-red-400 text-center py-8">{error}</div>
          ) : filteredBoxOffice.length === 0 ? (
            <div className="text-neutral-500 text-center py-8">查無電影</div>
          ) : (
            filteredBoxOffice.map((movie) => (
              <MovieCard key={`boxoffice-${movie.rank}-${movie.title}`} movie={movie} />
            ))
          )
        ) : (
          // 上映中內容
          nowShowingLoading ? (
            // 骨架屏代替簡單的載入中文字
            Array(5).fill(0).map((_, index) => (
              <Card key={index} className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2">
                <Skeleton className="w-16 h-24 rounded-lg bg-neutral-800" />
                <CardContent className="flex flex-col justify-between h-24 items-start flex-1 p-0 py-0.5 ml-4">
                  <div className="w-full">
                    <Skeleton className="h-5 w-3/4 bg-neutral-800 mb-1" />
                    <Skeleton className="h-3 w-1/2 bg-neutral-800" />
                  </div>
                  <Skeleton className="h-3 w-1/3 bg-neutral-800" />
                </CardContent>
              </Card>
            ))
          ) : nowShowingError ? (
            <div className="text-red-400 text-center py-8">{nowShowingError}</div>
          ) : filteredNowShowing.length === 0 ? (
            <div className="text-neutral-500 text-center py-8">查無電影</div>
          ) : (
            filteredNowShowing.map((movie) => (
              <MovieCard key={movie.title} movie={movie} />
            ))
          )
        )}
      </div>
      <p className="mt-6 text-neutral-600 text-xs tracking-wide">資料來源：Time2Cinema API</p>
    </main>
  );
}
