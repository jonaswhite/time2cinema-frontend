import React from 'react';
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MovieCard from "./MovieCard";
import { DisplayMovie } from '@/lib/types/movie';
import { useNowShowingData } from '@/hooks/useNowShowingData';
import { cn } from '@/lib/utils';

interface NowShowingSectionProps {
  searchTerm: string;
}

const NowShowingSection: React.FC<NowShowingSectionProps> = ({ searchTerm = '' }) => {
  const { nowShowing, loading, error, refetch } = useNowShowingData();

  // 過濾電影
  const filteredMovies = nowShowing.filter(movie =>
    movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (movie.original_title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // 處理重新整理
  const handleRefresh = () => {
    refetch();
  };

  // 載入中的骨架屏
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, index) => (
          <Skeleton key={index} className="w-full h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  // 錯誤處理
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 載入中狀態 */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card/80 rounded-md overflow-hidden shadow-sm flex flex-row h-[120px] w-full border border-border/20">
              <div className="relative w-[80px] flex-shrink-0">
                <Skeleton className="h-full w-full" />
              </div>
              <div className="py-3 px-4 flex flex-col justify-between flex-1">
                <div>
                  <Skeleton className="h-5 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div>
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* 錯誤狀態 */
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">載入失敗: {error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重試
          </button>
        </div>
      ) : filteredMovies.length === 0 ? (
        /* 無資料狀態 */
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? '沒有符合搜尋條件的電影' : '暫無上映中'}
        </div>
      ) : (
        /* 電影列表 */
        <div className="space-y-2">
          {filteredMovies.map((movie: DisplayMovie, index: number) => (
            <MovieCard key={`${movie.id || 'unknown'}-${index}`} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NowShowingSection;
