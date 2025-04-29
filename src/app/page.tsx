"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const mockBoxOffice = [
  {
    rank: 1,
    name: "沙丘：第二部",
    gross: "$2,500,000",
    release: "2025-03-01",
    poster: "https://image.tmdb.org/t/p/w500/8uUU2pxm6IYZw8UgnKJyx7Dqwu9.jpg"
  },
  {
    rank: 2,
    name: "功夫熊貓4",
    gross: "$1,900,000",
    release: "2025-03-15",
    poster: "https://image.tmdb.org/t/p/w500/2EewmxXe72ogD0EaWM8gqa0ccIw.jpg"
  },
  {
    rank: 3,
    name: "哥吉拉與金剛：新帝國",
    gross: "$1,500,000",
    release: "2025-03-22",
    poster: "https://image.tmdb.org/t/p/w500/1m1r3wPz65Dy7W5dDzrQJqZy6lT.jpg"
  },
  {
    rank: 4,
    name: "灌籃高手 THE FIRST SLAM DUNK",
    gross: "$1,200,000",
    release: "2025-02-28",
    poster: "https://image.tmdb.org/t/p/w500/7Zr0y5lXW9XyQ5bHq6QyJ1Q0A0t.jpg"
  },
  {
    rank: 5,
    name: "名偵探柯南：黑鐵的魚影",
    gross: "$950,000",
    release: "2025-04-05",
    poster: "https://image.tmdb.org/t/p/w500/9v2rU5FzzeU9yM54oVwWQzD1g0g.jpg"
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const filtered = mockBoxOffice.filter((movie) =>
    movie.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-2 bg-black">
      <h1 className="text-2xl font-bold mb-4 tracking-tight text-white">本週台灣電影票房榜</h1>
      <Input
        type="text"
        placeholder="搜尋電影名稱..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="max-w-xs mb-6 mx-auto bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-primary"
      />
      <div className="w-full max-w-lg flex flex-col gap-4 mx-auto">
        {filtered.length === 0 ? (
          <div className="text-neutral-500 text-center py-8">查無電影</div>
        ) : (
          filtered.map((movie) => (
            <Card
              key={movie.rank}
              className="bg-neutral-900 border border-neutral-800 rounded-xl shadow flex flex-row items-center relative overflow-hidden min-h-[96px] px-3 py-2"
            >
              <Badge
                className="absolute left-3 top-3 bg-white/10 text-white font-light px-2 py-0.5 text-[11px] rounded-full backdrop-blur"
                variant="secondary"
              >
                NO.{movie.rank}
              </Badge>
              <img
                src={movie.poster}
                alt={movie.name}
                className="w-16 h-24 object-cover rounded-lg border border-neutral-800 shadow-sm mr-4"
                style={{ background: "#222" }}
              />
              <CardContent className="flex flex-col justify-center items-start flex-1 p-0">
                <h2 className="text-white text-base font-medium tracking-wide mb-1 line-clamp-1">
                  {movie.name}
                </h2>
                <div className="text-neutral-400 text-xs mb-0.5">上映：{movie.release}</div>
                <div className="text-primary text-lg font-bold">{movie.gross}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <p className="mt-6 text-neutral-600 text-xs tracking-wide">資料來源：台灣電影票房統計（僅為範例顯示）</p>
    </main>
  );
}
