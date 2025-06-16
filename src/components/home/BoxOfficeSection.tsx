import React from 'react';
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MovieCard from "./MovieCard";
import { DisplayMovie } from '@/lib/types/movie';

interface BoxOfficeSectionProps {
  movies: DisplayMovie[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isBackendReady: boolean;
}

const BoxOfficeSection: React.FC<BoxOfficeSectionProps> = ({ movies, loading, error, refetch, isBackendReady }) => {
  const handleRefresh = () => {
    if (isBackendReady) {
      refetch();
    } else {
      console.warn("Backend not ready, refresh is ignored.");
    }
  };

  const renderSkeletons = () => (
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
  );

  if (loading) {
    return renderSkeletons();
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">載入失敗: {error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重試
        </button>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暫無票房資料
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {movies.map((movie: DisplayMovie, index: number) => (
        <MovieCard key={`${movie.id || 'unknown'}-${index}`} movie={movie} showRank={true} />
      ))}
    </div>
  );
};

export default BoxOfficeSection;
