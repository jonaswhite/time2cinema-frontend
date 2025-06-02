import { useState, useCallback, useEffect } from 'react';
import { NowShowingMovie, DisplayMovie } from '@/lib/types/movie';
import { formatDate } from '@/lib/utils/format';
import API_URL from '@/config/api';

export const useNowShowingData = () => {
  const [nowShowing, setNowShowing] = useState<DisplayMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      
      // 轉換數據格式
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

  // 初始化加載數據
  useEffect(() => {
    fetchNowShowing().catch(console.error);
  }, [fetchNowShowing]);

  // 提供手動刷新函數
  const refetch = async () => {
    try {
      return await fetchNowShowing();
    } catch (err) {
      console.error('Error refetching now showing movies:', err);
      throw err;
    }
  };

  return { nowShowing, loading, error, refetch };
};
