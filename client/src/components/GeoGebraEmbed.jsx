import React from 'react';

export default function GeoGebraEmbed({ materialId }) {
  if (!materialId) return null;

  // Xử lý tự động bóc tách ID nếu người dùng dán toàn bộ đường link (VD: https://www.geogebra.org/m/m7v2wz8x)
  const cleanId = materialId.includes('/m/') 
    ? materialId.split('/m/')[1].split('/')[0] 
    : materialId.trim();

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-2 shadow-lg">
      <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-800 rounded-lg">
        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Mô hình Hình học Động (GeoGebra 3D/2D)
        </span>
        <a 
          href={`https://www.geogebra.org/m/${cleanId}`} 
          target="_blank" 
          rel="noreferrer"
          className="text-xs text-slate-400 hover:text-white underline transition"
        >
          Mở toàn màn hình ↗
        </a>
      </div>
      <div className="relative w-full overflow-hidden pt-[56.25%] rounded-lg bg-black">
        <iframe
          title={`GeoGebra Material ${cleanId}`}
          src={`https://www.geogebra.org/material/iframe/id/${cleanId}/width/800/height/450/border/888888/sfsb/true/smb/false/stb/false/stbh/false/ai/false/asb/false/sri/true/rc/false/ld/false/sdz/true/ctl/false`}
          className="absolute top-0 left-0 w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}