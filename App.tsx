
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Download, Type, Trash2, RefreshCw, Pen, Circle, Highlighter, Undo2, Redo2 } from 'lucide-react';
import { Editor } from './components/Editor';
import { TextLayer, Stroke, FONT_FAMILY_MAP, COLORS } from './types';

import { FloatingToolbar } from './components/FloatingToolbar';

interface HistoryState {
  layers: TextLayer[];
  strokes: Stroke[];
}

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  
  // History State
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTool, setDrawingTool] = useState<'pen' | 'highlighter'>('pen');
  const [drawingColor, setDrawingColor] = useState('#EF4444');
  const [drawingSize, setDrawingSize] = useState(5);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Movable Drawing Toolbar State (No longer used for position, but keeping refs if needed or removing)
  const [toolbarPos, setToolbarPos] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- History Management ---

  const pushToHistory = useCallback((newLayers: TextLayer[], newStrokes: Stroke[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      const nextState = { layers: JSON.parse(JSON.stringify(newLayers)), strokes: JSON.parse(JSON.stringify(newStrokes)) };
      
      if (newHistory.length > 0) {
        const last = newHistory[newHistory.length - 1];
        if (JSON.stringify(last) === JSON.stringify(nextState)) return prev;
      }
      
      const updated = [...newHistory, nextState];
      if (updated.length > 50) updated.shift();
      return updated;
    });
    setHistoryIndex(prev => {
      const newIdx = prev + 1;
      return Math.min(newIdx, 49);
    });
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const state = history[prevIdx];
      setLayers(state.layers);
      setStrokes(state.strokes);
      setHistoryIndex(prevIdx);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const state = history[nextIdx];
      setLayers(state.layers);
      setStrokes(state.strokes);
      setHistoryIndex(nextIdx);
      setSelectedId(null);
    }
  };

  useEffect(() => {
    if (images.length > 0 && history.length === 0) {
      setHistory([{ layers: [], strokes: [] }]);
      setHistoryIndex(0);
    }
  }, [images, history.length]);

  // --- Drawing Toolbar Dragging Logic ---
  const handleToolbarDragStart = (e: React.PointerEvent) => {
    if (!toolbarRef.current) return;
    e.stopPropagation();
    
    const rect = toolbarRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setIsDraggingToolbar(true);
    // Use setPointerCapture to ensure move events are captured even if cursor leaves handle
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!isDraggingToolbar) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !toolbarRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const toolbarWidth = toolbarRef.current.offsetWidth;
      const toolbarHeight = toolbarRef.current.offsetHeight;

      // Calculate desired position relative to container
      let newX = e.clientX - containerRect.left - dragOffset.current.x;
      let newY = e.clientY - containerRect.top - dragOffset.current.y;
      
      // Strict clamping to container boundaries
      newX = Math.max(0, Math.min(newX, containerRect.width - toolbarWidth));
      newY = Math.max(0, Math.min(newY, containerRect.height - toolbarHeight));
      
      setToolbarPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      setIsDraggingToolbar(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingToolbar]);

  // --- Actions ---

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const readPromises = fileArray.map(file => {
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
        });
    });

    const newImages = await Promise.all(readPromises);
    
    setImages(prev => {
        if (prev.length === 0) {
             setLayers([]);
             setStrokes([]);
             setHistory([{ layers: [], strokes: [] }]);
             setHistoryIndex(0);
             setToolbarPos({ x: null, y: null });
             return newImages;
        }
        return [...prev, ...newImages];
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleReset = () => {
    setImages([]);
    setLayers([]);
    setStrokes([]);
    setSelectedId(null);
    setIsDrawing(false);
    setHistory([]);
    setHistoryIndex(-1);
    setToolbarPos({ x: null, y: null });
  };

  const addTextLayer = (initialText = "Tap to edit") => {
    if (isDrawing) setIsDrawing(false);

    const newLayer: TextLayer = {
      id: crypto.randomUUID(),
      content: initialText,
      x: 0.5,
      y: 0.5,
      color: '#FFFFFF',
      backgroundColor: 'transparent',
      fontSize: 1.0,
      fontFamily: 'font-anton',
      rotation: 0,
      textAlign: 'center',
      opacity: 1,
      outlineColor: 'transparent',
      outlineWidth: 0,
    };
    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setSelectedId(newLayer.id);
    pushToHistory(nextLayers, strokes);
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>, skipHistory = false) => {
    const nextLayers = layers.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer));
    setLayers(nextLayers);
    if (!skipHistory) {
      pushToHistory(nextLayers, strokes);
    }
  };

  const deleteLayer = (id: string) => {
    const nextLayers = layers.filter((l) => l.id !== id);
    setLayers(nextLayers);
    if (selectedId === id) setSelectedId(null);
    pushToHistory(nextLayers, strokes);
  };

  const handleAddStroke = (stroke: Stroke) => {
    const nextStrokes = [...strokes, stroke];
    setStrokes(nextStrokes);
    pushToHistory(layers, nextStrokes);
  };



  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

  const handleExport = async () => {
    if (images.length === 0) return;

    try {
        const loadedImages = await Promise.all(images.map(src => loadImage(src)));
        if (loadedImages.length === 0) return;

        // Find the maximum height to preserve quality of the highest resolution image
        const maxHeight = Math.max(...loadedImages.map(img => img.naturalHeight));
        
        // Calculate dimensions based on the max height
        let totalWidth = 0;
        const imageSpecs = loadedImages.map(img => {
            const scale = maxHeight / img.naturalHeight;
            const width = img.naturalWidth * scale;
            const x = totalWidth;
            totalWidth += width;
            return { img, width, height: maxHeight, x };
        });

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Enable high quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw images
        imageSpecs.forEach(spec => {
            ctx.drawImage(spec.img, spec.x, 0, spec.width, spec.height);
        });

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        strokes.forEach(stroke => {
            if (stroke.points.length === 0) return;
            
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.globalAlpha = stroke.opacity;
            const strokeScale = totalWidth / (containerRef.current?.clientWidth || totalWidth);
            ctx.lineWidth = stroke.size * strokeScale;
            
            const points = stroke.points;
            
            if (points.length < 3) {
                ctx.moveTo(points[0].x * totalWidth, points[0].y * maxHeight);
                for(let i=1; i<points.length; i++) {
                    ctx.lineTo(points[i].x * totalWidth, points[i].y * maxHeight);
                }
            } else {
                ctx.moveTo(points[0].x * totalWidth, points[0].y * maxHeight);
                let i;
                for (i = 1; i < points.length - 2; i++) {
                    const xc = (points[i].x + points[i + 1].x) / 2;
                    const yc = (points[i].y + points[i + 1].y) / 2;
                    ctx.quadraticCurveTo(
                        points[i].x * totalWidth, 
                        points[i].y * maxHeight, 
                        xc * totalWidth, 
                        yc * maxHeight
                    );
                }
                ctx.quadraticCurveTo(
                    points[i].x * totalWidth, 
                    points[i].y * maxHeight, 
                    points[i+1].x * totalWidth, 
                    points[i+1].y * maxHeight
                );
            }
            
            ctx.stroke();
            ctx.restore();
        });

        layers.forEach((layer) => {
            const fontSizePx = (totalWidth / 20) * layer.fontSize;
            
            ctx.save();
            const x = layer.x * totalWidth;
            const y = layer.y * maxHeight;
            
            ctx.translate(x, y);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            
            let fontFamily = FONT_FAMILY_MAP[layer.fontFamily] || 'sans-serif';
            fontFamily = fontFamily.replace(/"/g, ''); 
            
            ctx.font = `bold ${fontSizePx}px ${fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let lines = layer.content.split('\n');
            if (layer.maxWidth) {
                const maxPx = layer.maxWidth * totalWidth;
                const wrappedLines: string[] = [];
                lines.forEach(paragraph => {
                    const words = paragraph.split(' ');
                    let currentLine = words[0];
                    for (let i = 1; i < words.length; i++) {
                        const word = words[i];
                        const width = ctx.measureText(currentLine + " " + word).width;
                        if (width < maxPx) {
                            currentLine += " " + word;
                        } else {
                            wrappedLines.push(currentLine);
                            currentLine = word;
                        }
                    }
                    wrappedLines.push(currentLine);
                });
                lines = wrappedLines;
            }

            const lineHeight = fontSizePx * 1.2;
            const totalHeight = lines.length * lineHeight;
            
            let maxLineWidth = 0;
            lines.forEach(line => {
                const metrics = ctx.measureText(line);
                if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;
            });

            // Determine effective width for alignment
            const effectiveWidth = layer.maxWidth ? (layer.maxWidth * totalWidth) : maxLineWidth;

            if (layer.backgroundColor !== 'transparent') {
                const paddingX = fontSizePx * 0.4;
                const paddingY = fontSizePx * 0.2;
                // Background should cover the widest line or the max width
                const bgWidth = (layer.maxWidth ? effectiveWidth : maxLineWidth) + (paddingX * 2);
                const bgHeight = totalHeight + (paddingY * 2);
                
                ctx.fillStyle = layer.backgroundColor;
                // Background is always centered on the anchor point
                roundRect(
                    ctx, 
                    -bgWidth / 2, 
                    -bgHeight / 2, 
                    bgWidth, 
                    bgHeight, 
                    fontSizePx * 0.2
                );
            } else {
                // Only apply shadow if no outline is present
                if (!layer.outlineWidth || !layer.outlineColor || layer.outlineColor === 'transparent') {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetY = 2;
                }
            }

            ctx.fillStyle = layer.color;
            ctx.globalAlpha = layer.opacity ?? 1;
            
            if (layer.backgroundColor !== 'transparent' || (layer.outlineWidth && layer.outlineColor && layer.outlineColor !== 'transparent')) {
                 ctx.shadowColor = 'transparent';
            }

            // Outline settings
            if (layer.outlineWidth && layer.outlineColor && layer.outlineColor !== 'transparent') {
                ctx.lineWidth = layer.outlineWidth * (totalWidth / (containerRef.current?.clientWidth || totalWidth)); // Scale outline
                ctx.strokeStyle = layer.outlineColor;
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
            }

            // Alignment settings
            const align = layer.textAlign || 'center';
            ctx.textAlign = align;
            
            let xOffset = 0;
            if (align === 'left') xOffset = -effectiveWidth / 2;
            if (align === 'right') xOffset = effectiveWidth / 2;

            let startY = -(totalHeight / 2) + (lineHeight / 2);
            lines.forEach((line, i) => {
                const y = startY + (i * lineHeight);
                
                // Draw outline first if enabled
                if (layer.outlineWidth && layer.outlineColor && layer.outlineColor !== 'transparent') {
                    ctx.strokeText(line, xOffset, y);
                }
                
                ctx.fillText(line, xOffset, y);
            });
            
            ctx.restore();
        });

        canvas.toBlob((blob) => {
            if (!blob) {
                alert("Failed to generate image.");
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `snaptext-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/png');

    } catch (e) {
        console.error("Export failed", e);
        alert("Failed to export image.");
    }
  };

  const currentOpacity = drawingTool === 'highlighter' ? 0.45 : 1.0;
  const displayDrawingSize = drawingTool === 'highlighter' ? drawingSize * 3 : drawingSize;

  const selectedLayer = layers.find(l => l.id === selectedId);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-white overflow-hidden relative">
      {/* Top Bar for Undo/Redo only */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-slate-900/50 backdrop-blur-md rounded-full p-1 border border-white/10">
          <button 
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Undo"
          >
            <Undo2 size={20} />
          </button>
          <div className="w-[1px] h-4 bg-white/10"></div>
          <button 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Redo"
          >
            <Redo2 size={20} />
          </button>
      </div>

      <Editor
        images={images}
        layers={layers}
        selectedId={selectedId}
        strokes={strokes}
        isDrawing={isDrawing}
        drawingColor={drawingColor}
        drawingSize={displayDrawingSize}
        drawingOpacity={currentOpacity}
        onSelectLayer={setSelectedId}
        onUpdateLayer={updateLayer}
        onDeleteLayer={deleteLayer}
        onAddStroke={handleAddStroke}
        onUpload={processFiles}
        containerRef={containerRef}
      >
      </Editor>

      {isDrawing && !selectedId && (
            <div 
                className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 bg-slate-900/95 backdrop-blur-md rounded-full border border-white/10 z-[60] shadow-2xl select-none animate-in slide-in-from-bottom-10 fade-in duration-300"
            >
                 <div className="flex gap-1 px-1 flex-shrink-0">
                    <button 
                        onClick={() => setDrawingTool('pen')}
                        className={`p-2 rounded-full transition-all ${drawingTool === 'pen' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                        title="Pen"
                    >
                        <Pen size={16} />
                    </button>
                    <button 
                        onClick={() => setDrawingTool('highlighter')}
                        className={`p-2 rounded-full transition-all ${drawingTool === 'highlighter' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                        title="Highlighter"
                    >
                        <Highlighter size={16} />
                    </button>
                 </div>
                 
                 <div className="w-[1px] h-6 bg-white/20 mx-1 flex-shrink-0"></div>
                 
                 {/* Color Picker Dropdown */}
                 <div className="relative flex items-center justify-center px-2">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-6 h-6 rounded-full border-2 border-white/50 hover:border-white transition-colors shadow-sm"
                        style={{ backgroundColor: drawingColor }}
                        title="Choose Color"
                    />
                    
                    {showColorPicker && (
                        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl p-3 rounded-2xl grid grid-cols-5 gap-2 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 origin-bottom z-[70] w-max">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${drawingColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        setDrawingColor(color);
                                        setShowColorPicker(false);
                                    }}
                                />
                            ))}
                            {/* Triangle pointer */}
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900/95 border-r border-b border-white/10 rotate-45 transform"></div>
                        </div>
                    )}
                 </div>
                 
                 <div className="w-[1px] h-6 bg-white/20 mx-1 flex-shrink-0"></div>
                 
                 <div className="flex gap-2 px-2 items-center flex-shrink-0">
                    <button onClick={() => setDrawingSize(Math.max(2, drawingSize - 2))} className="p-1 hover:text-blue-400 transition-colors"><Circle size={6} fill="currentColor" /></button>
                    <span className="text-[10px] w-4 text-center tabular-nums font-bold">{drawingSize}</span>
                    <button onClick={() => setDrawingSize(Math.min(20, drawingSize + 2))} className="p-1 hover:text-blue-400 transition-colors"><Circle size={12} fill="currentColor" /></button>
                 </div>
                 
                 <div className="w-[1px] h-6 bg-white/20 mx-1 flex-shrink-0"></div>
                 
                 <button 
                    onClick={() => {
                        setStrokes([]);
                        pushToHistory(layers, []);
                    }}
                    className="p-1.5 text-white/70 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Clear Drawing"
                >
                     <Trash2 size={16} />
                 </button>
            </div>
        )}

      {/* Bottom Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center justify-between gap-2 pointer-events-auto overflow-x-auto custom-scrollbar">
            
            {/* Left Group: Add & Save */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <label className="flex flex-col items-center justify-center w-14 h-14 rounded-xl hover:bg-white/10 transition-colors cursor-pointer gap-1 group">
                    <div className="bg-slate-800 p-2 rounded-full group-hover:bg-slate-700 transition-colors">
                        <Plus size={20} className="text-blue-400" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-300">Add</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>

                <button 
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-xl hover:bg-white/10 transition-colors gap-1 group"
                >
                    <div className="bg-slate-800 p-2 rounded-full group-hover:bg-slate-700 transition-colors">
                        <Download size={20} className="text-green-400" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-300">Save</span>
                </button>
            </div>

            <div className="w-[1px] h-8 bg-white/10 flex-shrink-0"></div>

            {/* Center Group: Tools */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                    onClick={() => addTextLayer()}
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all gap-1 ${!isDrawing ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                >
                    <Type size={22} />
                    <span className="text-[10px] font-medium">Text</span>
                </button>

                <button 
                    onClick={() => {
                        setIsDrawing(true);
                        setSelectedId(null);
                    }}
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all gap-1 ${isDrawing ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                >
                    {drawingTool === 'pen' ? <Pen size={22} /> : <Highlighter size={22} />}
                    <span className="text-[10px] font-medium">Draw</span>
                </button>


            </div>

            <div className="w-[1px] h-8 bg-white/10 flex-shrink-0"></div>

            {/* Right Group: Reset */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                    onClick={handleReset}
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors gap-1 text-slate-400"
                >
                    <RefreshCw size={20} />
                    <span className="text-[10px] font-medium">Reset</span>
                </button>
            </div>

        </div>
      </div>

      {selectedId && selectedLayer && (
        <FloatingToolbar
          layer={selectedLayer}
          containerRef={containerRef}
          onUpdate={updateLayer}
          onDelete={deleteLayer}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
