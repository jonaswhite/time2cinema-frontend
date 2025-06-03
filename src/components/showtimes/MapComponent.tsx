"use client";

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from './utils';
import { Cinema, FormattedShowtime } from '@/components/showtimes/types';
// 引入 React Icons 中的電影院圖標
import { MdLocalMovies, MdMovie } from 'react-icons/md';

interface MapComponentProps {
  cinemas: Cinema[];
  selectedCinemas: string[];
  setSelectedCinemas: React.Dispatch<React.SetStateAction<string[]>>;
  // 新增 showtimesByCinema 參數，用於判斷哪些電影院有場次
  showtimesByCinema?: Record<string, FormattedShowtime[]>; // Use specific type
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

  // 過濾出有有效座標的電影院（不再要求必須有場次）
  const cinemasWithShowtimes = React.useMemo(() => {
    if (!cinemas || cinemas.length === 0) {
      return [];
    }
    
    // 輸出調試信息
    console.log(`總共有 ${cinemas.length} 間電影院`);
    if (showtimesByCinema) {
      console.log(`showtimesByCinema 包含 ${Object.keys(showtimesByCinema).length} 個電影院的場次`);
    } else {
      console.log('showtimesByCinema 為空或未定義');
    }
    
    // 只顯示有場次的電影院
    return cinemas.filter(cinema => {
      // 檢查該電影院是否有有效座標
      const hasValidCoords = (cinema.lat !== undefined && cinema.lng !== undefined) || 
                           (cinema.latitude !== undefined && cinema.longitude !== undefined);
      
      // 檢查是否有場次
      const hasShowtimes = showtimesByCinema && 
                         showtimesByCinema[cinema.id] && 
                         showtimesByCinema[cinema.id].length > 0;
      
      if (hasValidCoords && !hasShowtimes) {
        console.log(`電影院 ${cinema.name}(ID:${cinema.id}) 有有效座標但沒有場次，已過濾`);
        return false; // 沒有場次就不顯示
      }
      
      return hasValidCoords && hasShowtimes; // 必須同時有有效座標和場次才顯示
    });
  }, [cinemas, showtimesByCinema]);

  // 計算電影院的中心點作為地圖初始位置
  const center = React.useMemo(() => {
    // 如果有用戶位置，優先使用用戶位置作為中心點
    if (userLocation) {
      return { lat: userLocation.lat, lng: userLocation.lng };
    }
    
    if (!cinemasWithShowtimes || cinemasWithShowtimes.length === 0) {
      console.log('沒有有效的電影院座標，使用台北市中心作為預設位置');
      return { lat: 25.0330, lng: 121.5654 }; // 台北市中心
    }
    
    console.log(`計算 ${cinemasWithShowtimes.length} 間電影院的中心點`);
    
    // 使用 lat/lng 或 latitude/longitude
    const validCinemas = cinemasWithShowtimes.filter(cinema => {
      const lat = cinema.lat ?? cinema.latitude;
      const lng = cinema.lng ?? cinema.longitude;
      return typeof lat === 'number' && typeof lng === 'number';
    });
    
    if (validCinemas.length === 0) {
      console.log('過濾後沒有有效的電影院座標，使用台北市中心作為預設位置');
      return { lat: 25.0330, lng: 121.5654 }; // 台北市中心
    }
    
    console.log(`使用 ${validCinemas.length} 間電影院計算中心點`);
    
    let sumLat = 0;
    let sumLng = 0;
    
    validCinemas.forEach(cinema => {
      const lat = cinema.lat ?? cinema.latitude ?? 0;
      const lng = cinema.lng ?? cinema.longitude ?? 0;
      sumLat += lat;
      sumLng += lng;
      console.log(`電影院 ${cinema.name} 座標: (${lat}, ${lng})`);
    });
    
    const centerPoint = {
      lat: sumLat / validCinemas.length,
      lng: sumLng / validCinemas.length
    };
    
    console.log(`計算出的中心點: (${centerPoint.lat}, ${centerPoint.lng})`);
    return centerPoint;
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
    <div className="w-full h-[250px] sm:h-[300px] rounded-xl overflow-hidden border border-neutral-800">
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
        {cinemasWithShowtimes.map(cinema => {
          const lng = cinema.lng ?? cinema.longitude ?? 0;
          const lat = cinema.lat ?? cinema.latitude ?? 0;
          
          // 檢查是否有場次（用於決定顯示顏色）
          const hasShowtimes = showtimesByCinema && 
                           showtimesByCinema[cinema.id] && 
                           showtimesByCinema[cinema.id].length > 0;
          
          return (
            <Marker
              key={cinema.id}
              longitude={lng}
              latitude={lat}
              onClick={() => {
                console.log(`點擊電影院: ${cinema.name} (ID:${cinema.id})`);
                setSelectedCinemas(prev =>
                  prev.includes(cinema.id)
                    ? prev.filter(id => id !== cinema.id)
                    : [...prev, cinema.id]
                );
              }}
              onMouseEnter={() => {
                if (lng !== undefined && lat !== undefined) {
                  setHoverCinemaId(cinema.id);
                  setHoverCinemaLngLat([lng, lat]);
                }
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
                  <MdLocalMovies className="text-gray-400" size={20} />
                )}
              </div>
            </div>
          </Marker>
          );
        })}
      </Map>
      {/* 電影院懸停提示已移至每個標記內部 */}
    </div>
  );
};

export default MapComponent;
