
import React, { useRef, useState } from 'react';
import { TextLayer } from '../types';
import { Trash2, Scaling } from 'lucide-react';

interface TextOverlayProps {
  layer: TextLayer;
  isSelected: boolean;
  containerSize: { width: number; height: number };
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TextLayer>, skipHistory?: boolean) => void;
  onDelete: (id: string) => void;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  layer,
  isSelected,
  containerSize,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingFont, setIsResizingFont] = useState(false);
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const initialFontSize = useRef(1);
  const initialWidth = useRef(0);
  const initialDist = useRef(0);

  // --- Move Logic ---
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault(); 
    
    onSelect(layer.id);
    
    setIsDragging(true);
    setHasMoved(false); 
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { x: layer.x, y: layer.y };
    
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isResizingFont || isResizingWidth) return;
    e.preventDefault();

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (!hasMoved && Math.hypot(dx, dy) < 5) return; 
    if (!hasMoved) setHasMoved(true);

    const dPctX = dx / containerSize.width;
    const dPctY = dy / containerSize.height;

    // Use skipHistory = true while dragging to prevent flooding history
    onUpdate(layer.id, {
      x: initialPos.current.x + dPctX,
      y: initialPos.current.y + dPctY,
    }, true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      if (hasMoved) {
        // Finally commit to history when interaction ends
        onUpdate(layer.id, {}); 
      }
      setHasMoved(false);
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  // --- Font Resize Logic (Corner) ---
  const handleFontResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault(); 
    setIsResizingFont(true);
    
    const rect = (e.currentTarget.closest('.group') as HTMLElement)?.getBoundingClientRect();
    if(rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        initialDist.current = Math.hypot(e.clientX - cx, e.clientY - cy);
        initialFontSize.current = layer.fontSize;
    }
    
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleFontResizeMove = (e: React.PointerEvent) => {
    if (!isResizingFont) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    if(rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const currentDist = Math.hypot(e.clientX - cx, e.clientY - cy);
        
        const scale = currentDist / initialDist.current;
        let newFontSize = initialFontSize.current * scale;
        
        if (newFontSize < 0.2) newFontSize = 0.2;
        if (newFontSize > 10) newFontSize = 10;
        
        onUpdate(layer.id, { fontSize: newFontSize }, true);
    }
  };

  const handleFontResizeEnd = (e: React.PointerEvent) => {
    if (isResizingFont) {
        setIsResizingFont(false);
        // Commit to history
        onUpdate(layer.id, {}); 
        (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  // --- Box Width Resize Logic (Side) ---
  const handleWidthResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingWidth(true);
    
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialWidth.current = layer.maxWidth || 0; 

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleWidthResizeMove = (e: React.PointerEvent) => {
    if (!isResizingWidth) return;
    e.stopPropagation();
    
    const rect = (e.currentTarget.closest('.group') as HTMLElement)?.getBoundingClientRect();
    if (rect) {
        const cx = rect.left + rect.width / 2;
        const distFromCenter = Math.abs(e.clientX - cx);
        const newWidthPx = distFromCenter * 2;
        
        let newWidthPct = newWidthPx / containerSize.width;
        if (newWidthPct < 0.1) newWidthPct = 0.1; 
        if (newWidthPct > 1.0) newWidthPct = 1.0; 
        
        onUpdate(layer.id, { maxWidth: newWidthPct }, true);
    }
  };

  const handleWidthResizeEnd = (e: React.PointerEvent) => {
    if (isResizingWidth) {
        setIsResizingWidth(false);
        // Commit to history
        onUpdate(layer.id, {}); 
        (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  const pixelFontSize = (containerSize.width / 20) * layer.fontSize;

  const getFontClass = (font: string) => {
    switch(font) {
        case 'font-anton': return 'font-[Anton]';
        case 'font-bebas': return 'font-["Bebas_Neue"]';
        case 'font-lobster': return 'font-[Lobster]';
        case 'font-oswald': return 'font-[Oswald]';
        case 'font-poppins': return 'font-[Poppins]';
        default: return font;
    }
  };

  return (
    <div
      className={`absolute select-none group touch-none flex items-center justify-center`}
      style={{
        left: `${layer.x * 100}%`,
        top: `${layer.y * 100}%`,
        width: layer.maxWidth ? `${layer.maxWidth * 100}%` : 'auto',
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
        zIndex: isSelected ? 50 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => e.stopPropagation()} 
    >
      {isSelected && (
        <div className="absolute inset-[-8px] border-2 border-white/50 border-dashed rounded-lg pointer-events-none">
           <button
            className="absolute -top-5 -right-5 bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 pointer-events-auto transform hover:scale-110 transition-transform active:scale-95"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      
      {isSelected && (
          <div 
            className="absolute -bottom-6 -right-6 w-10 h-10 pointer-events-auto cursor-nwse-resize flex items-center justify-center z-50 group-hover:scale-110 transition-transform touch-none"
            onPointerDown={handleFontResizeStart}
            onPointerMove={handleFontResizeMove}
            onPointerUp={handleFontResizeEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-6 h-6 bg-blue-500 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
               <Scaling size={12} className="text-white" />
            </div>
          </div>
      )}

      {isSelected && (
        <div 
          className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-6 h-12 pointer-events-auto cursor-ew-resize flex items-center justify-center z-50 group-hover:scale-110 transition-transform touch-none"
          onPointerDown={handleWidthResizeStart}
          onPointerMove={handleWidthResizeMove}
          onPointerUp={handleWidthResizeEnd}
          onClick={(e) => e.stopPropagation()}
        >
           <div className="w-1.5 h-8 bg-white rounded-full shadow-lg border border-slate-400"></div>
        </div>
      )}
      
      {isSelected && (
        <div 
          className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-6 h-12 pointer-events-auto cursor-ew-resize flex items-center justify-center z-50 group-hover:scale-110 transition-transform touch-none"
          onPointerDown={handleWidthResizeStart}
          onPointerMove={handleWidthResizeMove}
          onPointerUp={handleWidthResizeEnd}
          onClick={(e) => e.stopPropagation()}
        >
           <div className="w-1.5 h-8 bg-white rounded-full shadow-lg border border-slate-400"></div>
        </div>
      )}

      <div
        className={`whitespace-pre-wrap leading-tight ${getFontClass(layer.fontFamily)}`}
        style={{
          color: layer.color,
          fontSize: `${pixelFontSize}px`,
          backgroundColor: layer.backgroundColor === 'transparent' ? 'transparent' : layer.backgroundColor,
          padding: layer.backgroundColor !== 'transparent' ? '0.2em 0.4em' : '0',
          borderRadius: '0.2em',
          textShadow: layer.outlineWidth && layer.outlineColor 
            ? 'none' 
            : (layer.backgroundColor === 'transparent' ? '0px 2px 4px rgba(0,0,0,0.5)' : 'none'),
          minWidth: '20px',
          width: '100%',
          textAlign: layer.textAlign || 'center',
          opacity: layer.opacity ?? 1,
          WebkitTextStroke: layer.outlineWidth && layer.outlineColor ? `${layer.outlineWidth}px ${layer.outlineColor}` : 'none',
        }}
      >
        {layer.content}
      </div>
    </div>
  );
};
