// 票房資料介面 - 符合後端 API 回傳格式
export interface BoxOfficeMovie {
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

// 上映中介面 - 與票房資料介面統一
export interface NowShowingMovie {
  id: number; // 電影 ID
  title: string; // 電影標題
  original_title: string | null; // 原始標題
  release_date: string | null; // 上映日期
  poster_url: string | null; // 海報 URL (與後端 API 一致)
  runtime: number | null; // 片長（分鐘）
  tmdb_id: number | null; // TMDB ID
  genres?: string[]; // 電影類型
}

// 前端顯示用的電影資料介面
export interface DisplayMovie {
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
  genres?: string[]; // 電影類型
}
