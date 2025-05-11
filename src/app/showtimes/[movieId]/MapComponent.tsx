"use client";

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from './utils';
import { Cinema } from './types';
// 引入 React Icons 中的電影院圖標
import { MdLocalMovies, MdMovie } from 'react-icons/md';

interface MapComponentProps {
  cinemas: Cinema[];
  selectedCinemas: string[];
  setSelectedCinemas: React.Dispatch<React.SetStateAction<string[]>>;
  // 新增 showtimesByCinema 參數，用於判斷哪些電影院有場次
  showtimesByCinema?: Record<string, any[]>;
  // 用戶位置
  userLocation?: {lat: number, lng: number} | null;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  cinemas, 
  selectedCinemas, 
  setSelectedCinemas,
  showtimesByCinema = {}, // 預設為空物件
  userLocation = null
}) => {
  const [hoverCinemaId, setHoverCinemaId] = useState<string | null>(null);
  const [hoverCinemaLngLat, setHoverCinemaLngLat] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);

  // 過濾出有場次的電影院
  const cinemasWithShowtimes = React.useMemo(() => {
    if (!cinemas || cinemas.length === 0) {
      return [];
    }
    
    // 只保留有場次的電影院
    return cinemas.filter(cinema => {
      // 檢查該電影院是否有場次資料
      // 注意：只要電影院有該電影的場次，就顯示在地圖上，不考慮使用者的選擇
      return showtimesByCinema && showtimesByCinema[cinema.id] && showtimesByCinema[cinema.id].length > 0;
    });
  }, [cinemas, showtimesByCinema]);

  // 計算有場次的電影院的中心點作為地圖初始位置
  const center = React.useMemo(() => {
    // 如果有用戶位置，優先使用用戶位置作為中心點
    if (userLocation) {
      return { lat: userLocation.lat, lng: userLocation.lng };
    }
    
    if (!cinemasWithShowtimes || cinemasWithShowtimes.length === 0) {
      return { lat: 25.0330, lng: 121.5654 }; // 台北市中心
    }
    
    const validCinemas = cinemasWithShowtimes.filter(c => c && typeof c.lat === 'number' && typeof c.lng === 'number');
    if (validCinemas.length === 0) {
      return { lat: 25.0330, lng: 121.5654 }; // 台北市中心
    }
    
    const sumLat = validCinemas.reduce((sum, c) => sum + c.lat, 0);
    const sumLng = validCinemas.reduce((sum, c) => sum + c.lng, 0);
    
    return {
      lat: sumLat / validCinemas.length,
      lng: sumLng / validCinemas.length
    };
  }, [cinemasWithShowtimes, userLocation]);

  // 當用戶位置變化時，重新定位地圖
  React.useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 13,
        duration: 2000
      });
    }
  }, [userLocation]);

  return (
    <div className="w-full max-w-lg h-[300px] mb-8 rounded-xl overflow-hidden border border-neutral-800">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: 11
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        {/* 顯示用戶位置 */}
        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
          >
            <div className="z-50">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
          </Marker>
        )}
        
        {/* 顯示電影院位置 */}
        {cinemasWithShowtimes.map(cinema => (
          <Marker
            key={cinema.id}
            longitude={cinema.lng}
            latitude={cinema.lat}
            onClick={() => {
              setSelectedCinemas(prev =>
                prev.includes(cinema.id)
                  ? prev.filter(id => id !== cinema.id)
                  : [...prev, cinema.id]
              );
            }}
            onMouseEnter={() => {
              setHoverCinemaId(cinema.id);
              setHoverCinemaLngLat([cinema.lng, cinema.lat]);
            }}
            onMouseLeave={() => {
              setHoverCinemaId(null);
              setHoverCinemaLngLat(null);
            }}
          >
            <div className="relative">
              {/* 電影院名稱小文字 */}
              <div 
                className={`absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-white text-xs font-medium z-30 whitespace-nowrap transition-opacity ${hoverCinemaId === cinema.id ? 'opacity-100' : 'opacity-70'}`}
                style={{ textShadow: '0px 0px 3px #000, 0px 0px 3px #000, 0px 0px 3px #000' }}
              >
                {cinema.name}
              </div>
              
              {/* 電影院圖標 */}
              <div 
                className="cursor-pointer transition-all transform hover:scale-110 flex items-center justify-center bg-white rounded-full p-1"
              >
                {selectedCinemas.includes(cinema.id) ? (
                  <MdMovie className="text-yellow-500" size={20} />
                ) : (
                  <MdLocalMovies className="text-gray-500" size={20} />
                )}
              </div>
            </div>
          </Marker>
        ))}
      </Map>
      {/* 電影院懸停提示已移至每個標記內部 */}
    </div>
  );
};

export default MapComponent;
