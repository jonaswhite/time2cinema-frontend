"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BoxOfficeSection from "@/components/home/BoxOfficeSection";
import NowShowingSection from "@/components/home/NowShowingSection";
import { SearchBar } from '@/components/ui/search-bar';
import API_URL from '@/lib/api/api';
import { useBoxOfficeData } from '@/hooks/useBoxOfficeData';
import { useNowShowingData } from '@/hooks/useNowShowingData';
import { DisplayMovie } from '@/lib/types/movie';
import MovieCard from "@/components/home/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

// 電影小知識陣列
const movieFacts = [
  "《鐵達尼號》的拍攝預算比真正建造鐵達尼號的成本還高。",
  "《星際大戰》中，達斯·維達的經典台詞「我是你父親」其實是「No, I am your father」。",
  "《駭客任務》中的綠色代碼雨其實是壽司食譜，經過數位化處理。",
  "《玩具總動員》是史上第一部完全電腦動畫製作的長片。",
  "《回到未來》中的 DeLorean 車在拍攝時實際上有三輛。",
  "《神鬼奇航》中傑克船長搖晃的走路方式是強尼戴普即興創作的。",
  "《魔戒》三部曲的拍攝時間總共達到了 438 天。",
  "《復仇者聯盟》中的紐約大戰場景，約 80% 是電腦特效製作的。",
  "《黑魔女：沉睡魔咒》中安潔莉娜裘莉的角色造型嚇哭了許多來探班的兒童，包括她自己的孩子。",
  "《鐵達尼號》中傑克畫蘿絲的素描其實是導演詹姆斯卡麥隆畫的。",
  "《星際大戰》系列中的尤達大師原本考慮由一隻猴子戴上面具並拿著拐杖來扮演。",
  "《侏羅紀公園》中恐龍的叫聲很多是由各種動物聲音混合而成，包括海豚、象、鱷魚和天鵝。",
  "《回到未來》中，主角馬蒂的女友角色在第一集和續集由不同演員飾演。",
  "《E.T.外星人》中 E.T. 的臉部模型部分參考了詩人卡爾·桑德堡、愛因斯坦和一隻巴哥犬。",
  "《教父》電影開頭馬龍白蘭度撫摸的貓其實是一隻誤闖片場的流浪貓。",
  "《綠野仙蹤》中飾演錫樵夫的演員原本因為鋁粉化妝導致嚴重過敏而換角。",
  "《駭客任務》中著名的「子彈時間」效果是透過圍繞演員設置大量相機並依序觸發拍攝而成的。",
  "《阿甘正傳》中，阿甘跑步橫越美國的場景，其實很多時候是湯姆漢克斯的弟弟吉姆漢克斯擔任替身。",
  "《神鬼奇航》系列中傑克船長的許多古怪舉止是強尼戴普參考了滾石樂團吉他手基思理查茲的形象。",
  "《沉默的羔羊》中安東尼霍普金斯飾演的漢尼拔萊克特博士在整部電影中只出現了約16分鐘，卻贏得了奧斯卡最佳男主角。",
  "《魔鬼終結者2》中液態金屬機器人 T-1000 的特效是當時電腦動畫技術的一大突破。",
  "《玩具總動員》是影史上第一部完全由電腦動畫製作的長片電影。",
  "《獅子王》中辛巴、木法沙和刀疤的名字在斯瓦希里語中分別意指「獅子」、「國王」和「疤痕」。",
  "《北非諜影》經典台詞「Play it again, Sam」其實從未在電影中完整出現過，最接近的是「Play it, Sam. Play 'As Time Goes By.'」。",
  "《驚魂記》中浴室謀殺場景雖然只有約45秒，但拍攝卻花費了7天，包含78個鏡位。",
  "《大白鯊》電影中那隻機械鯊魚經常故障，導演史蒂芬史匹柏被迫減少鯊魚露臉的鏡頭，反而增加了電影的懸疑感。",
  "《刺激1995》在最初上映時票房並不理想，但後來透過錄影帶出租和口碑傳播才成為經典。",
  "《瓦力》中的機器人瓦力的聲音，很多是由音效設計師班·貝爾特用各種機械和電子聲音實驗創造出來的。"
];

const Home = () => {
  const [activeTab, setActiveTab] = useState<"box-office" | "now-showing">("box-office");
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isColdStartWaiting, setIsColdStartWaiting] = useState<boolean>(false);
  const [isBackendReady, setIsBackendReady] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [randomMovieFact, setRandomMovieFact] = useState<string>(movieFacts[0]);

  const { boxOffice, loading: loadingBoxOffice, error: errorBoxOffice, refetch: refetchBoxOffice } = useBoxOfficeData({ isBackendReady });
  const { nowShowing, loading: loadingNowShowing, error: errorNowShowing, refetch: refetchNowShowing } = useNowShowingData({ isBackendReady });

  const unifiedSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const combined = [...boxOffice, ...nowShowing];
    const uniqueMovies = new Map<string, DisplayMovie>();
    
    // 票房電影優先
    boxOffice.forEach(movie => {
        if (movie.id && !uniqueMovies.has(movie.id)) {
            uniqueMovies.set(movie.id, movie);
        }
    });
    nowShowing.forEach(movie => {
        if (movie.id && !uniqueMovies.has(movie.id)) {
            uniqueMovies.set(movie.id, movie);
        }
    });

    const searchTermLower = searchTerm.toLowerCase();
    return Array.from(uniqueMovies.values()).filter(movie => {
      return (
        movie.display_title?.toLowerCase().includes(searchTermLower) ||
        movie.full_title?.toLowerCase().includes(searchTermLower) ||
        (movie.english_title && movie.english_title.toLowerCase().includes(searchTermLower)) ||
        (movie.chinese_title && movie.chinese_title.toLowerCase().includes(searchTermLower))
      );
    });
  }, [searchTerm, boxOffice, nowShowing]);

  const isSearching = searchTerm.trim().length > 0;
  const isLoadingGlobal = loadingBoxOffice || loadingNowShowing;

  useEffect(() => {
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date().getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (!lastVisit || (now - parseInt(lastVisit, 10)) > thirtyMinutes) {
      setIsColdStartWaiting(true);
      const pingBackend = async () => {
        try {
          await fetch(`${API_URL}/api/ping`);
          setIsBackendReady(true);
          setTimeout(() => {
            setIsColdStartWaiting(false);
            localStorage.setItem('lastVisit', now.toString());
          }, 1500);
        } catch (error) {
          console.error("Backend ping failed:", error);
          setIsColdStartWaiting(false);
        }
      };
      pingBackend();
    } else {
      setIsBackendReady(true);
    }
  }, []);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    let factInterval: NodeJS.Timeout | null = null;
    if (isColdStartWaiting) {
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95 && !isBackendReady) {
            if (progressInterval) clearInterval(progressInterval);
            return 95;
          }
          if (isBackendReady) {
            if (progressInterval) clearInterval(progressInterval);
            return 100;
          }
          const increment = prev < 60 ? 5 : (prev < 85 ? 2 : 1);
          return Math.min(prev + increment, 95);
        });
      }, 1000);

      factInterval = setInterval(() => {
        setRandomMovieFact(movieFacts[Math.floor(Math.random() * movieFacts.length)]);
      }, 8000);
    }
    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (factInterval) clearInterval(factInterval);
    };
  }, [isColdStartWaiting, isBackendReady]);

  if (isColdStartWaiting) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 text-foreground">
        <div className="max-w-md text-center">
          <img src="/time2cinema-logo.svg" alt="Time2Cinema Logo" className="w-32 h-auto mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-bold text-primary mb-4">播放準備中...</h2>
          <div className="w-full bg-muted rounded-full h-3 mb-2 overflow-hidden">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-1000 ease-linear" 
              style={{width: `${loadingProgress}%`}}
            ></div>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            {loadingProgress < 80 ? "正在為您呼叫服務生...呃...是伺服器啦！" : "伺服器即將啟動完成！"}
          </p>
          <p className="text-muted-foreground mb-6 text-sm">
            您是今天第一位貴賓，請稍待片刻......
          </p>
          <div className="bg-card p-4 rounded-lg mb-6 shadow-lg">
            <h3 className="text-primary text-lg mb-2 font-semibold">電影冷知識放送</h3>
            <p className="text-muted-foreground text-sm italic">"{randomMovieFact}"</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Time2Cinema 目前使用免費方案部署，感謝您的耐心！
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center py-6 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Time2Cinema</h1>
        <div className="w-full mx-auto mb-6">
          <SearchBar 
            placeholder="搜尋電影..." 
            value={searchTerm}
            onChange={(value: string) => setSearchTerm(value)}
            className="w-full mb-4"
          />
          
          {isSearching ? (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">搜尋結果</h2>
              {isLoadingGlobal && unifiedSearchResults.length === 0 ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-card/80 rounded-md overflow-hidden shadow-sm flex flex-row h-[120px] w-full border border-border/20">
                      <div className="relative w-[80px] flex-shrink-0"><Skeleton className="h-full w-full" /></div>
                      <div className="py-3 px-4 flex flex-col justify-between flex-1">
                        <div><Skeleton className="h-5 w-3/4 mb-1" /><Skeleton className="h-3 w-1/2" /></div>
                        <div><Skeleton className="h-3 w-1/3" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : unifiedSearchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  沒有符合「{searchTerm}」的電影
                </div>
              ) : (
                <div className="space-y-2">
                  {unifiedSearchResults.map((movie, index) => (
                    <MovieCard key={`${movie.id || 'search-result'}-${index}`} movie={movie} showRank={!!movie.rank} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Tabs 
              value={activeTab}
              className="w-full mb-4"
              onValueChange={(value) => setActiveTab(value as "box-office" | "now-showing")}
            >
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger value="box-office">本週票房</TabsTrigger>
                <TabsTrigger value="now-showing">上映中</TabsTrigger>
              </TabsList>
              <TabsContent value="box-office" className="mt-4">
                <BoxOfficeSection 
                  movies={boxOffice}
                  loading={loadingBoxOffice}
                  error={errorBoxOffice}
                  refetch={refetchBoxOffice}
                  isBackendReady={isBackendReady}
                />
              </TabsContent>
              <TabsContent value="now-showing" className="mt-4">
                <NowShowingSection 
                  movies={nowShowing}
                  loading={loadingNowShowing}
                  error={errorNowShowing}
                  refetch={refetchNowShowing}
                  isBackendReady={isBackendReady}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </main>
  );
};

export default Home;

