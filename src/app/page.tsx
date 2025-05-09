"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import API_URL from '@/config/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// 票房資料介面 - 符合後端 API 回傳格式
interface BoxOfficeMovie {
  movie_id: string; // 電影名稱
  rank: number; // 排名
  tickets: number; // 票數
  totalsales: number | null; // 累計票數
  release_date?: string; // 上映日
  week_start_date?: string; // 週開始日期
}

// 前端顯示用的電影資料介面
interface DisplayMovie {
  rank: number;
  title: string;
  weeklySales: string;
  totalSales: string;
  releaseDate: string;
  poster: string;
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
  const [query, setQuery] = useState("");
  const [boxOfficeData, setBoxOfficeData] = useState<DisplayMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // 從後端 API 獲取票房資料
  const fetchBoxOffice = async (forceRefresh = false) => {
    try {
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
        totalSales: formatTickets(movie.totalsales),
        releaseDate: movie.release_date || '-',
        poster: posterMap[movie.movie_id] || "https://placehold.co/500x750/222/white?text=No+Poster"
      }));
      setBoxOfficeData(displayData);
      setError(null);
    } catch (err) {
      console.error('獲取票房資料失敗:', err);
      setError('獲取票房資料失敗，請稍後再試');
      // 使用備用資料
      setBoxOfficeData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // 強制更新快取
  const handleRefresh = () => {
    fetchBoxOffice(true);
  };
  
  // 初始載入資料
  useEffect(() => {
    fetchBoxOffice();
  }, []);
  
  // 根據搜尋關鍵字過濾電影
  const filtered = boxOfficeData.filter((movie) =>
    movie.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-2 bg-black">
      <div className="flex items-center justify-between w-full max-w-lg mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">本週台灣電影票房榜</h1>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing || loading}
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
        className="max-w-xs mb-6 mx-auto bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-primary"
      />
      <div className="w-full max-w-lg flex flex-col gap-4 mx-auto">
        {loading ? (
          <div className="text-neutral-400 text-center py-8 animate-pulse">載入中...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-8">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-neutral-500 text-center py-8">查無電影</div>
        ) : (
          filtered.map((movie) => (
            <Card
              key={movie.rank}
              className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2 cursor-pointer hover:bg-neutral-800 transition-colors"
              onClick={() => router.push(`/showtimes/${encodeURIComponent(movie.title)}`)}
            >
              {movie.rank <= 10 && (
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
                <div className="text-neutral-400 text-xs">累計票數：{movie.totalSales}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <p className="mt-6 text-neutral-600 text-xs tracking-wide">資料來源：台灣電影票房統計 API</p>
    </main>
  );
}
