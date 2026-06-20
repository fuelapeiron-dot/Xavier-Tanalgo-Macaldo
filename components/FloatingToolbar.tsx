
import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { TextLayer, COLORS, FONTS, FONT_FAMILY_MAP } from '../types';
import { Trash2, X, Type, Palette, PaintBucket, Ban, AlignLeft, AlignCenter, AlignRight, RotateCw, Layers, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface FloatingToolbarProps {
  layer: TextLayer;
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdate: (id: string, updates: Partial<TextLayer>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  layer,
  containerRef,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [style, setStyle] = useState({ top: -9999, left: -9999, opacity: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'font' | 'style' | 'effects'>('font');
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Detect mobile view based on window width
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update position to follow the text layer on desktop only
  useLayoutEffect(() => {
    if (isMobile) {
      setStyle(s => ({ ...s, opacity: 1 }));
      return;
    }

    const updatePosition = () => {
      if (!containerRef.current || !toolbarRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const toolbarRect = toolbarRef.current.getBoundingClientRect();

      // Calculate the center position of the text layer in viewport coordinates
      const layerCenterX = containerRect.left + (layer.x * containerRect.width);
      const layerCenterY = containerRect.top + (layer.y * containerRect.height);

      // Estimate half-height of the text layer to position menu above it
      const approxTextHeight = (containerRect.width / 20) * layer.fontSize;
      
      // Target position: Centered horizontally, positioned above the text
      let left = layerCenterX - (toolbarRect.width / 2);
      let top = layerCenterY - (approxTextHeight / 2) - toolbarRect.height - 24; 

      // Viewport collision detection
      const padding = 16;

      // If top is off-screen, flip to bottom
      if (top < padding) {
        top = layerCenterY + (approxTextHeight / 2) + 24;
      }
      
      // Clamp Horizontal
      if (left < padding) left = padding;
      if (left + toolbarRect.width > window.innerWidth - padding) {
        left = window.innerWidth - toolbarRect.width - padding;
      }

      setStyle({ top, left, opacity: 1 });
    };

    updatePosition();
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [layer.x, layer.y, layer.fontSize, layer.rotation, layer.content, containerRef, activeTab, isMobile, isMinimized]);

  const getFontName = (font: string) => {
    if(font.includes('anton')) return 'Impact';
    if(font.includes('bebas')) return 'Tall';
    if(font.includes('lobster')) return 'Cursive';
    if(font.includes('oswald')) return 'Modern';
    if(font.includes('poppins')) return 'Bold';
    if(font.includes('serif')) return 'Classic';
    if(font.includes('mono')) return 'Code';
    return 'Simple';
  };

  return (
    <div
      ref={toolbarRef}
      className={`fixed z-50 flex flex-col gap-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl transition-all duration-300 ${
        isMobile 
          ? "bottom-0 left-0 right-0 w-full rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-4 pb-6" 
          : "rounded-2xl p-3"
      }`}
      style={isMobile ? {
        bottom: 0,
        left: 0,
        right: 0,
        opacity: style.opacity,
        width: '100vw',
      } : { 
        top: style.top, 
        left: style.left,
        opacity: style.opacity,
        maxWidth: '90vw',
        width: '340px'
      }}
      onPointerDown={(e) => e.stopPropagation()} 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Row: Input & Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
            <input
            type="text"
            value={layer.content}
            onChange={(e) => onUpdate(layer.id, { content: e.target.value })}
            className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-sm font-medium focus:ring-1 focus:ring-blue-500/50"
            placeholder="Type text here..."
            autoFocus
            />
        </div>

        {/* Collapsible toggle */}
        <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center"
            title={isMinimized ? "Expand Styling Controls" : "Collapse Styling Controls"}
        >
            {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <button 
            onClick={() => onDelete(layer.id)}
            className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg transition-colors"
            title="Delete Layer"
        >
            <Trash2 size={18} />
        </button>

        <button 
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
            title="Close Editor"
        >
            <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      {!isMinimized && (
        <div className="flex p-1 bg-slate-800 rounded-lg">
            <button 
              onClick={() => setActiveTab('font')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'font' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
            >
              <Type size={14} />
              Font
            </button>
            <button 
              onClick={() => setActiveTab('style')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'style' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
            >
              <Palette size={14} />
              Style
            </button>
            <button 
              onClick={() => setActiveTab('effects')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'effects' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
            >
              <Sparkles size={14} />
              Effects
            </button>
        </div>
      )}

      {/* Tab Content Area */}
      {!isMinimized && (
        <div className="mt-1 flex flex-col gap-3">
        {activeTab === 'font' && (
            <>
                {/* Font Family Grid */}
                <div className="grid grid-cols-4 gap-2 w-full">
                    {FONTS.map(font => (
                    <button
                        key={font}
                        className={`px-1 py-2 rounded-md border text-[10px] text-center transition-all truncate ${layer.fontFamily === font ? 'bg-white text-black border-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                        style={{ fontFamily: FONT_FAMILY_MAP[font].split(',')[0] }}
                        onClick={() => onUpdate(layer.id, { fontFamily: font })}
                        title={getFontName(font)}
                    >
                        {getFontName(font)}
                    </button>
                    ))}
                </div>

                <div className="h-[1px] bg-slate-700/50 w-full"></div>

                {/* Alignment & Size */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button 
                            onClick={() => onUpdate(layer.id, { textAlign: 'left' })}
                            className={`p-1.5 rounded ${layer.textAlign === 'left' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <AlignLeft size={16} />
                        </button>
                        <button 
                            onClick={() => onUpdate(layer.id, { textAlign: 'center' })}
                            className={`p-1.5 rounded ${!layer.textAlign || layer.textAlign === 'center' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <AlignCenter size={16} />
                        </button>
                        <button 
                            onClick={() => onUpdate(layer.id, { textAlign: 'right' })}
                            className={`p-1.5 rounded ${layer.textAlign === 'right' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <AlignRight size={16} />
                        </button>
                    </div>
                    
                    <div className="flex-1 flex items-center gap-2">
                        <Type size={14} className="text-slate-400" />
                        <input 
                            type="range" 
                            min="0.5" 
                            max="5" 
                            step="0.1" 
                            value={layer.fontSize} 
                            onChange={(e) => onUpdate(layer.id, { fontSize: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>

                {/* Text Color */}
                <div className="grid grid-cols-8 gap-2 w-full justify-items-center mt-1">
                    {COLORS.map(color => (
                    <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${layer.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => onUpdate(layer.id, { color })}
                    />
                    ))}
                </div>
            </>
        )}

        {activeTab === 'style' && (
             <>
                {/* Background Color */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
                        <PaintBucket size={12} /> Background
                    </span>
                    <div className="grid grid-cols-8 gap-2 w-full justify-items-center">
                        <button
                            className={`w-6 h-6 rounded-full border-2 transition-transform flex items-center justify-center bg-slate-800 ${layer.backgroundColor === 'transparent' ? 'border-white scale-110 text-white' : 'border-slate-600 text-slate-400 hover:scale-105'}`}
                            onClick={() => onUpdate(layer.id, { backgroundColor: 'transparent' })}
                            title="No Background"
                        >
                            <Ban size={12} />
                        </button>
                        {COLORS.map(color => (
                            <button
                            key={color}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${layer.backgroundColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => onUpdate(layer.id, { backgroundColor: color })}
                            />
                        ))}
                    </div>
                </div>

                <div className="h-[1px] bg-slate-700/50 w-full"></div>

                {/* Opacity */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400 w-16">Opacity</span>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={layer.opacity ?? 1} 
                        onChange={(e) => onUpdate(layer.id, { opacity: parseFloat(e.target.value) })}
                        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-xs text-slate-400 w-8 text-right">{Math.round((layer.opacity ?? 1) * 100)}%</span>
                </div>

                {/* Rotation */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400 w-16 flex items-center gap-1"><RotateCw size={10} /> Rotate</span>
                    <input 
                        type="range" 
                        min="-180" 
                        max="180" 
                        step="1" 
                        value={layer.rotation} 
                        onChange={(e) => onUpdate(layer.id, { rotation: parseInt(e.target.value) })}
                        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <input 
                        type="number" 
                        value={layer.rotation}
                        onChange={(e) => onUpdate(layer.id, { rotation: parseInt(e.target.value) || 0 })}
                        className="w-10 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-center text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
             </>
        )}

        {activeTab === 'effects' && (
            <>
                {/* Outline Color */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
                        <Layers size={12} /> Outline Color
                    </span>
                    <div className="grid grid-cols-8 gap-2 w-full justify-items-center">
                        <button
                            className={`w-6 h-6 rounded-full border-2 transition-transform flex items-center justify-center bg-slate-800 ${!layer.outlineColor || layer.outlineColor === 'transparent' ? 'border-white scale-110 text-white' : 'border-slate-600 text-slate-400 hover:scale-105'}`}
                            onClick={() => onUpdate(layer.id, { outlineColor: 'transparent', outlineWidth: 0 })}
                            title="No Outline"
                        >
                            <Ban size={12} />
                        </button>
                        {COLORS.map(color => (
                            <button
                            key={color}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${layer.outlineColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => onUpdate(layer.id, { outlineColor: color, outlineWidth: layer.outlineWidth || 2 })}
                            />
                        ))}
                    </div>
                </div>

                <div className="h-[1px] bg-slate-700/50 w-full"></div>

                {/* Outline Width */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400 w-16">Thickness</span>
                    <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="0.5" 
                        value={layer.outlineWidth || 0} 
                        onChange={(e) => onUpdate(layer.id, { outlineWidth: parseFloat(e.target.value) })}
                        disabled={!layer.outlineColor || layer.outlineColor === 'transparent'}
                        className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-blue-500 ${!layer.outlineColor || layer.outlineColor === 'transparent' ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-700'}`}
                    />
                    <span className="text-xs text-slate-400 w-8 text-right">{layer.outlineWidth || 0}px</span>
                </div>
            </>
        )}
      </div>
      )}
    </div>
  );
};