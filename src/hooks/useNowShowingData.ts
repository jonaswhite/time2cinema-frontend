import { useState, useCallback, useEffect } from 'react';
import { NowShowingMovie, DisplayMovie } from '@/lib/types/movie';
import { formatDate } from '@/lib/utils/format';
import API_URL from '@/config/api';

interface UseNowShowingDataProps { // 新增 Props 接口
  isBackendReady: boolean;
}

export const useNowShowingData = ({ isBackendReady }: UseNowShowingDataProps) => { // 接收 isBackendReady
  const [nowShowing, setNowShowing] = useState<DisplayMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // 初始設為 true
  const [error, setError] = useState<string | null>(null);

  const fetchNowShowing = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching now showing movies from:', `${API_URL}/api/movies/now-showing`);
      const response = await fetch(`${API_URL}/api/movies/now-showing`);
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`獲取上映中數據失敗: ${response.status} ${response.statusText}`);
      }
      
      const data: NowShowingMovie[] = await response.json();
      console.log('API Response data:', data);
      
      const formattedData: DisplayMovie[] = data.map((movie: NowShowingMovie) => {
        const formattedMovie = {
          id: movie.id?.toString() || '',
          title: movie.title || '未知電影',
          original_title: movie.original_title,
          releaseDate: formatDate(movie.release_date) || '未定',
          poster: movie.poster_url,
          runtime: movie.runtime,
          tmdb_id: movie.tmdb_id,
          genres: movie.genres || []
        };
        console.log('Formatted movie:', formattedMovie);
        return formattedMovie;
      });
      
      console.log('Setting now showing movies:', formattedData);
      setNowShowing(formattedData);
      setError(null);
      return formattedData;
    } catch (err) {
      console.error('Error fetching now showing movies:', err);
      const errorMessage = err instanceof Error ? err.message : '獲取上映中數據失敗，請稍後再試';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isBackendReady) { // 只有當後端準備好時才獲取數據
      fetchNowShowing().catch(console.error);
    } else {
      // 如果後端未準備好，保持 loading 狀態
      // setLoading(true); // 確保在 isBackendReady 變為 true 之前，loading 狀態為 true
    }
  }, [fetchNowShowing, isBackendReady]); // 加入 isBackendReady 到依賴項

  const refetch = async () => {
    if (!isBackendReady) { // 如果後端未準備好，refetch 不執行
      console.warn("Backend is not ready, refetch is ignored.");
      return;
    }
    try {
      return await fetchNowShowing();
    } catch (err) {
      console.error('Error refetching now showing movies:', err);
      throw err;
    }
  };

  return { nowShowing, loading, error, refetch };
};
