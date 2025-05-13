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
  movie_id: string; // 電影名稱
  rank: number; // 排名
  tickets: number; // 票數
  totalsales: number | null; // 累計票數
  release_date?: string; // 上映日
  week_start_date?: string; // 週開始日期
  poster_path?: string | null; // 海報路徑
  runtime?: number | null; // 片長（分鐘）
}

// 上映中電影介面
interface NowShowingMovie {
  title: string; // 電影名稱
  releaseDate: string | null; // 上映日期
  posterUrl: string | null; // 海報 URL
  runtime: number | null; // 片長（分鐘）
}

// 前端顯示用的電影資料介面
interface DisplayMovie {
  rank?: number; // 只有票房榜有排名
  title: string;
  weeklySales?: string; // 只有票房榜有週票數
  releaseDate: string;
  poster: string;
  runtime?: number | null; // 片長（分鐘）
  // 用於路由導航的 ID
  id?: string;
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

      // 將後端資料轉換為前端顯示格式
      const displayData: DisplayMovie[] = data.map((movie: BoxOfficeMovie) => ({
        rank: movie.rank,
        title: movie.movie_id,
        weeklySales: formatTickets(movie.tickets),
        releaseDate: movie.release_date || "未知",
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : (posterMap[movie.movie_id] || "https://placehold.co/400x600/222/444?text=No+Poster"),
        runtime: movie.runtime || null,
        id: movie.movie_id
      }));

      // 設置票房資料
      setBoxOfficeData(displayData);
      
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
      
      setNowShowingLoading(true);
      
      // 確保使用正確的 API 路徑
      const url = forceRefresh 
        ? `${API_URL}/api/movies/now-showing?refresh=true`
        : `${API_URL}/api/movies/now-showing`;
        
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const data = await response.json();

      // 將後端資料轉換為前端顯示格式
      const displayData: DisplayMovie[] = data.map((movie: NowShowingMovie) => ({
        title: movie.title,
        releaseDate: movie.releaseDate || "未知",
        poster: movie.posterUrl || posterMap[movie.title] || "https://placehold.co/400x600/222/444?text=No+Poster",
        runtime: movie.runtime,
        id: movie.title
      }));

      // 設置上映中電影資料
      setNowShowingData(displayData);
      
      // 保存到本地快取
      localStorage.setItem('nowShowingData', JSON.stringify(displayData));
      localStorage.setItem('nowShowingTimestamp', Date.now().toString());
      
      setNowShowingError(null);
    } catch (err) {
      console.error('獲取上映中電影失敗:', err);
      setNowShowingError('獲取上映中電影失敗，請稍後再試');
    } finally {
      setNowShowingLoading(false);
    }
  };

  // 創建一個可重用的電影卡片元件
  const MovieCard = ({ movie }: { movie: DisplayMovie }) => (
    <Card
      className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2 cursor-pointer hover:bg-neutral-800 transition-colors"
      onClick={() => router.push(`/showtimes/${encodeURIComponent(movie.title)}`)}
    >
      {movie.rank && movie.rank <= 10 && (
        <Badge
          className="absolute left-3 top-3 bg-white/10 text-white font-light px-2 py-0.5 text-[11px] rounded-full backdrop-blur"
          variant="secondary"
        >
          NO.{movie.rank}
        </Badge>
      )}
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-16 h-24 object-cover rounded-lg border border-neutral-800 shadow-sm mr-4"
        style={{ background: "#222" }}
      />
      <CardContent className="flex flex-col justify-between h-24 items-start flex-1 p-0 py-0.5">
        <div>
          <h2 className="text-white text-base font-medium tracking-wide mb-1 line-clamp-1">
            {movie.title}
          </h2>
          <div className="text-neutral-400 text-xs">上映日：{movie.releaseDate}</div>
        </div>
        <div className="text-neutral-400 text-xs">
          {movie.runtime ? `片長：${movie.runtime} 分鐘` : ''}
        </div>
      </CardContent>
    </Card>
  );

  // 強制更新快取
  const handleRefresh = () => {
    fetchBoxOffice(true);
    fetchNowShowingMovies(true);
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
  const filteredBoxOffice = boxOfficeData.filter((movie) =>
    movie.title.toLowerCase().includes(query.toLowerCase())
  );

  const filteredNowShowing = nowShowingData.filter((movie) =>
    movie.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-2 bg-black">
      <div className="flex items-center justify-between w-full max-w-lg mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Time2Cinema</h1>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing || loading || nowShowingLoading}
          className="text-xs h-8 px-3 bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 hover:text-white"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '更新中' : '更新資料'}
        </Button>
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
            {(loading || nowShowingLoading) ? (
              // 骨架屏代替簡單的載入中文字
              Array(3).fill(0).map((_, index) => (
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
            ) : (error || nowShowingError) ? (
              <div className="text-red-400 text-center py-4">{error || nowShowingError}</div>
            ) : (filteredBoxOffice.length > 0 || filteredNowShowing.length > 0) ? (
              // 合併兩個列表並去除重複電影
              <>
                {/* 創建一個電影標題的集合來追蹤重複項 */}
                {(() => {
                  const movieTitles = new Set<string>();
                  const combinedMovies: DisplayMovie[] = [];
                  
                  // 創建一個幫助函數，檢查標題是否相似（忽略空格和大小寫）
                  const isSimilarTitle = (title1: string, title2: string): boolean => {
                    const normalized1 = title1.toLowerCase().replace(/\s+/g, '');
                    const normalized2 = title2.toLowerCase().replace(/\s+/g, '');
                    return normalized1 === normalized2;
                  };
                  
                  // 先加入票房榜電影
                  filteredBoxOffice.forEach(movie => {
                    // 檢查是否已經有相似標題的電影
                    const hasSimilarTitle = Array.from(movieTitles).some(title => 
                      isSimilarTitle(title, movie.title)
                    );
                    
                    if (!hasSimilarTitle) {
                      movieTitles.add(movie.title);
                      combinedMovies.push(movie);
                    }
                  });
                  
                  // 再加入上映中電影（如果不重複）
                  filteredNowShowing.forEach(movie => {
                    // 檢查是否已經有相似標題的電影
                    const hasSimilarTitle = Array.from(movieTitles).some(title => 
                      isSimilarTitle(title, movie.title)
                    );
                    
                    if (!hasSimilarTitle) {
                      movieTitles.add(movie.title);
                      combinedMovies.push(movie);
                    }
                  });
                  
                  return combinedMovies.map(movie => (
                    <MovieCard key={movie.title} movie={movie} />
                  ));
                })()} 
              </>
            ) : (
              <div className="text-neutral-500 text-center py-8">查無電影</div>
            )}
          </>
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
              <MovieCard key={movie.rank} movie={movie} />
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
