import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisplayMovie } from '@/lib/types/movie';
import { formatDate } from '@/lib/utils/format';

interface MovieCardProps {
  movie: DisplayMovie;
  showRank?: boolean;
  showSales?: boolean;
}

// Base64 encoded SVG placeholder as a data URL
const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzAwIiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojMjIyOyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gUG9zdGVyIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';

const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  showRank = false, 
  showSales = false 
}) => {
  const posterUrl = movie.poster || placeholderImage;
  
  return (
    <Link href={`/showtimes/${encodeURIComponent(movie.title)}`} className="block w-full">
      <div className="bg-card/80 hover:bg-card/100 transition-colors rounded-md overflow-hidden shadow-sm flex flex-row h-[120px] w-full border border-border/20 cursor-pointer">
      {/* 電影海報 */}
      <div className="relative w-[80px] flex-shrink-0">
        {/* 排名標籤 - 只顯示前10名 */}
        {showRank && movie.rank && movie.rank <= 10 && (
          <div className="absolute top-0 left-0 bg-black/70 text-white px-1.5 py-0.5 rounded-br text-xs font-medium z-10">
            {movie.rank}
          </div>
        )}
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = placeholderImage;
          }}
        />
      </div>
      
      {/* 電影資訊 */}
      <div className="py-3 px-4 flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-base font-medium mb-1 line-clamp-1">{movie.title}</h3>
          <p className="text-xs text-muted-foreground">上映日：{formatDate(movie.releaseDate) || '未定'}</p>
        </div>
        
        <div>
          {movie.runtime && (
            <p className="text-xs text-muted-foreground">片長：{movie.runtime} 分鐘</p>
          )}
          
          {/* 票房資訊 */}
          {showSales && movie.weeklySales && (
            <div className="mt-1">
              <Badge variant="outline" className="text-xs py-0 px-1.5 h-5">
                週票房: {movie.weeklySales}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
    </Link>
  );
};

export default MovieCard;
