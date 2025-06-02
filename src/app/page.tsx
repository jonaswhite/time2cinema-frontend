"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BoxOfficeSection from "@/components/home/BoxOfficeSection";
import NowShowingSection from "@/components/home/NowShowingSection";
import { SearchBar } from '@/components/ui/search-bar';

// 頁面主組件
const Home = () => {
  const [activeTab, setActiveTab] = useState<"box-office" | "now-showing">("box-office");
  const [searchTerm, setSearchTerm] = useState('');

  // 判斷是否正在搜尋
  const isSearching = searchTerm.trim().length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center py-6 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Time2Cinema</h1>
        <div className="w-full mx-auto mb-6">
          {/* 搜尋欄放在最上方 */}
          <SearchBar 
            placeholder="搜尋電影..." 
            value={searchTerm}
            onChange={(value: string) => setSearchTerm(value)}
            className="w-full mb-4"
          />
          
          {/* 只在非搜尋狀態顯示標籤頁 */}
          {!isSearching && (
            <Tabs 
              defaultValue="box-office" 
              className="w-full mb-4"
              onValueChange={(value) => setActiveTab(value as "box-office" | "now-showing")}
            >
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger value="box-office">本週票房</TabsTrigger>
                <TabsTrigger value="now-showing">上映中</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          
          {isSearching ? (
            // 搜尋狀態顯示結果
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">搜尋結果</h2>
              <div>
                {/* 顯示所有符合搜尋條件的電影 */}
                {activeTab === "box-office" ? (
                  <BoxOfficeSection searchTerm={searchTerm} />
                ) : (
                  <NowShowingSection searchTerm={searchTerm} />
                )}
              </div>
            </div>
          ) : (
            // 非搜尋狀態顯示分頁內容
            <div>
              {activeTab === "box-office" ? (
                <BoxOfficeSection searchTerm={searchTerm} />
              ) : (
                <NowShowingSection searchTerm={searchTerm} />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Home;
