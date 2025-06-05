import { Metadata } from 'next';
import { getMovieById } from '@/lib/api';

type Props = {
  params: { movieId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // 從 API 獲取電影詳情
  const movie = await getMovieById(params.movieId);
  
  if (!movie) {
    return {
      title: '電影資訊 | Time2Cinema',
      description: '查詢電影場次、劇情介紹和影評',
    };
  }

  const title = `${movie.display_title} | Time2Cinema`;
  const description = movie.synopsis || `查看 ${movie.display_title} 的場次資訊、劇情介紹和影評`;
  const imageUrl = movie.poster_url || '/time2cinema-logo-square.png';

  return {
    title,
    description,
    openGraph: {
      title: `${movie.display_title} 場次資訊 | Time2Cinema`,
      description: description,
      url: `https://www.time2cinema.com/showtimes/${encodeURIComponent(params.movieId)}`,
      siteName: 'Time2Cinema',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: `${movie.display_title} 海報`,
        },
      ],
      locale: 'zh_TW',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${movie.display_title} | Time2Cinema`,
      description: description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `https://www.time2cinema.com/showtimes/${encodeURIComponent(params.movieId)}`,
    },
  };
}

export default function MovieLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
