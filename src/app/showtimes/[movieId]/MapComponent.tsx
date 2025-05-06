"use client";

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from './utils';
import { Cinema } from './types';

interface MapComponentProps {
  cinemas: Cinema[];
  selectedCinemas: string[];
  setSelectedCinemas: React.Dispatch<React.SetStateAction<string[]>>;
  // 新增 showtimesByCinema 參數，用於判斷哪些電影院有場次
  showtimesByCinema?: Record<string, any[]>;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  cinemas, 
  selectedCinemas, 
  setSelectedCinemas,
  showtimesByCinema = {} // 預設為空物件
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
  }, [cinemasWithShowtimes]);

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
            <div
              className={`w-3 h-3 rounded-full cursor-pointer transition-all ${
                selectedCinemas.includes(cinema.id)
                  ? 'bg-yellow-500 scale-125'
                  : 'bg-white'
              }`}
            />
          </Marker>
        ))}
      </Map>
      {/* 懸停提示 */}
      {hoverCinemaId && hoverCinemaLngLat && (() => {
        const cinema = cinemasWithShowtimes.find(c => c.id === hoverCinemaId);
        if (!cinema || !mapRef.current) return null;
        
        const map = mapRef.current.getMap();
        const pt = map.project(hoverCinemaLngLat);
        const rect = map.getContainer().getBoundingClientRect();
        
        return createPortal(
          <div
            style={{
              position: 'fixed',
              left: pt.x + rect.left,
              top: pt.y + rect.top - 40,
              background: 'rgba(30,30,30,0.97)',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 12px #000c',
              pointerEvents: 'none',
              zIndex: 2000,
              transform: 'translate(-50%, -100%)',
              border: 'none'
            }}
          >
            {cinema.name}
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default MapComponent;
