import { useState, useCallback } from 'react';
import { BoxOfficeMovie, DisplayMovie } from '@/lib/types/movie';
import { formatTickets } from '@/lib/utils/format';
import API_URL from '@/config/api';

export const useBoxOfficeData = () => {
  const [boxOffice, setBoxOffice] = useState<DisplayMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoxOffice = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/boxoffice`);
      if (!response.ok) {
        throw new Error('獲取票房數據失敗');
      }
      const data: BoxOfficeMovie[] = await response.json();
      
      // 轉換數據格式
      const formattedData: DisplayMovie[] = data.map((movie: BoxOfficeMovie) => ({
        id: movie.id?.toString() || '',
        title: movie.title || '未知電影',
        original_title: movie.original_title,
        rank: movie.rank,
        weeklySales: formatTickets(movie.tickets),
        releaseDate: movie.release_date || '未定',
        poster: movie.poster_url,
        runtime: movie.runtime,
        tmdb_id: movie.tmdb_id
      }));
      
      setBoxOffice(formattedData);
      setError(null);
      return formattedData;
    } catch (err) {
      console.error('Error fetching box office data:', err);
      const errorMessage = err instanceof Error ? err.message : '獲取票房數據失敗，請稍後再試';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加載數據
  useState(() => {
    fetchBoxOffice().catch(console.error);
  });

  // 提供手動刷新函數
  const refetch = async () => {
    try {
      return await fetchBoxOffice();
    } catch (err) {
      console.error('Error refetching box office data:', err);
      throw err;
    }
  };

  return { boxOffice, loading, error, refetch };
};
