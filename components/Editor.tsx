
import React, { useState, useEffect, useRef } from 'react';
import { TextLayer, Stroke } from '../types';
import { TextOverlay } from './TextOverlay';
import { DrawingCanvas } from './DrawingCanvas';
import { ZoomIn, ZoomOut, RotateCcw, ImagePlus } from 'lucide-react';

interface EditorProps {
  images: string[];
  layers: TextLayer[];
  selectedId: string | null;
  strokes: Stroke[];
  isDrawing: boolean;
  drawingColor: string;
  drawingSize: number;
  drawingOpacity: number;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<TextLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onAddStroke: (stroke: Stroke) => void;
  onUpload: (files: FileList | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
}

export const Editor: React.FC<EditorProps> = ({
  images,
  layers,
  selectedId,
  strokes,
  isDrawing,
  drawingColor,
  drawingSize,
  drawingOpacity,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onAddStroke,
  onUpload,
  containerRef,
  children
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pinchDist = useRef<number | null>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handlePlaceholderClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // We need the unscaled dimensions. Since the container is scaled by CSS transform,
        // getBoundingClientRect returns the scaled size. We must divide by zoom.
        // However, containerRef is the INNER div. The transform is on the OUTER div.
        // So containerRef.getBoundingClientRect() should be unscaled?
        // No, the outer div scales everything inside.
        // But wait, containerRef is the inner div.
        // If parent is scaled, child rect is scaled.
        // So we should use offsetWidth/offsetHeight for unscaled size, or divide rect by zoom.
        // Let's stick to offsetWidth/Height but use a ref to track it precisely?
        // Actually, clientWidth is integer.
        // Let's use the images natural size if possible?
        // No, images are scaled to fit 60vh.
        
        // Best approach: Use offsetWidth/Height as the base truth for the container's layout size.
        // The browser lays out the container at integer pixels usually.
        setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    updateSize();

    return () => resizeObserver.disconnect();
  }, [containerRef, images]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [images]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleFactor = e.ctrlKey ? 0.01 : 0.001; // Faster zoom with ctrl (trackpad pinch)
        setZoom(z => Math.min(5, Math.max(0.1, z + delta * scaleFactor)));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handleBackgroundClick = () => {
    if (!hasDragged.current) {
        onSelectLayer(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDrawing || e.button !== 0) return;
    
    isPanning.current = true;
    hasDragged.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning.current) return;
    if (pinchDist.current !== null) return; // Don't pan if pinching

    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasDragged.current = true;
    }

    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isPanning.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDist.current = d;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDist.current !== null) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = d / pinchDist.current;
      setZoom(z => Math.min(5, Math.max(0.1, z * factor)));
      pinchDist.current = d;
    }
  };

  const handleTouchEnd = () => {
    pinchDist.current = null;
  };

  const isMultiImage = images.length > 1;

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 relative overflow-hidden flex items-center bg-black/90 p-4 md:p-8 custom-scrollbar touch-none cursor-grab active:cursor-grabbing"
      onClick={handleBackgroundClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="relative mx-auto duration-75 ease-out origin-center"
        style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: 'fit-content',
            height: 'fit-content'
        }}
      >
        <div 
            ref={containerRef}
            className="relative shadow-2xl inline-flex justify-center bg-black"
            style={{ 
            maxHeight: '80vh',
            }}
        >
            {images.length === 0 && (
                <div 
                    className={`flex flex-col items-center justify-center w-[300px] h-[400px] border-2 border-dashed rounded-3xl select-none cursor-pointer transition-all duration-200 ${isDraggingFile ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'}`}
                    onClick={handlePlaceholderClick}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className={`mb-4 p-4 rounded-full transition-colors ${isDraggingFile ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                        <ImagePlus size={48} className={isDraggingFile ? 'text-blue-400' : 'text-white/30'} />
                    </div>
                    <p className={`text-lg font-medium transition-colors ${isDraggingFile ? 'text-blue-400' : 'text-white/70'}`}>
                        {isDraggingFile ? 'Drop image here' : 'No Image Selected'}
                    </p>
                    <p className="text-sm text-white/40 mt-1">
                        {isDraggingFile ? 'Release to upload' : 'Click or drag photo to start'}
                    </p>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*" 
                        multiple 
                        onChange={handleFileInputChange}
                    />
                </div>
            )}
            {images.map((src, index) => (
            <img
                key={index}
                src={src}
                alt={`Editable layer ${index + 1}`}
                className="object-contain block select-none pointer-events-none"
                style={{
                height: isMultiImage ? '60vh' : 'auto',
                maxHeight: isMultiImage ? 'none' : '80vh',
                maxWidth: isMultiImage ? 'none' : '100%',
                width: 'auto'
                }}
            />
            ))}

            {/* Drawing Layer - sits between image and text */}
            <DrawingCanvas
                key={zoom} // Force re-render on zoom to prevent drift
                width={containerSize.width}
                height={containerSize.height}
                scale={zoom}
                isDrawingMode={isDrawing}
                currentColor={drawingColor}
                currentSize={drawingSize}
                currentOpacity={drawingOpacity}
                strokes={strokes}
                onAddStroke={onAddStroke}
            />

            {/* Text Layers */}
            <div className={isDrawing ? 'pointer-events-none opacity-50 transition-opacity' : 'pointer-events-auto transition-opacity'}>
                {layers.map(layer => (
                <TextOverlay
                    key={layer.id}
                    layer={layer}
                    isSelected={selectedId === layer.id}
                    containerSize={containerSize}
                    onSelect={onSelectLayer}
                    onUpdate={onUpdateLayer}
                    onDelete={onDeleteLayer}
                />
                ))}
            </div>

            {children}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
        <button 
            onClick={() => setZoom(z => Math.min(5, z + 0.1))}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
            <ZoomIn size={14} />
        </button>
        
        <div className="h-24 w-3 flex items-center justify-center">
            <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.05" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-24 h-0.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 -rotate-90"
            />
        </div>
        
        <button 
            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
            <ZoomOut size={14} />
        </button>

        <div className="h-[1px] w-3 bg-white/20 my-0.5"></div>

        <button 
            onClick={() => setZoom(1)}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Reset Zoom"
        >
            <RotateCcw size={12} />
        </button>
      </div>
    </div>
  );
};
