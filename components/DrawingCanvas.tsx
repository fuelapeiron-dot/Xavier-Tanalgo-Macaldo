
import React, { useRef, useState } from 'react';
import { Stroke, Point } from '../types';

interface DrawingCanvasProps {
  width: number;
  height: number;
  scale?: number; // Kept for compatibility but unused by SVG
  isDrawingMode: boolean;
  currentColor: string;
  currentSize: number;
  currentOpacity: number;
  strokes: Stroke[];
  onAddStroke: (stroke: Stroke) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  isDrawingMode,
  currentColor,
  currentSize,
  currentOpacity,
  strokes,
  onAddStroke,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Helper to convert points to SVG path data
  const getSvgPathFromStroke = (points: Point[]) => {
    if (points.length === 0) return '';

    const p0 = points[0];
    let d = `M ${p0.x * width} ${p0.y * height}`;

    if (points.length < 3) {
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x * width} ${points[i].y * height}`;
      }
    } else {
      let i;
      for (i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        d += ` Q ${points[i].x * width} ${points[i].y * height} ${xc * width} ${yc * height}`;
      }
      d += ` Q ${points[i].x * width} ${points[i].y * height} ${points[i + 1].x * width} ${points[i + 1].y * height}`;
    }
    return d;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setCurrentPoints([{ x, y }]);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !isDrawingMode) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Add point directly to state for immediate feedback
    setCurrentPoints(prev => {
        const lastPoint = prev[prev.length - 1];
        const dx = (x - lastPoint.x) * width;
        const dy = (y - lastPoint.y) * height;
        // Optimization: only add point if moved enough distance
        if (dx * dx + dy * dy < 4) return prev; 
        return [...prev, { x, y }];
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    (e.target as Element).releasePointerCapture(e.pointerId);

    if (currentPoints.length > 0) {
      onAddStroke({
        points: currentPoints,
        color: currentColor,
        size: currentSize,
        opacity: currentOpacity
      });
    }
    setCurrentPoints([]);
  };

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`absolute inset-0 z-0 ${isDrawingMode ? 'cursor-crosshair touch-none' : 'pointer-events-none'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ overflow: 'visible' }}
    >
      {/* Render existing strokes */}
      {strokes.map((stroke, index) => (
        <path
          key={index}
          d={getSvgPathFromStroke(stroke.points)}
          stroke={stroke.color}
          strokeWidth={stroke.size}
          strokeOpacity={stroke.opacity}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Render current stroke being drawn */}
      {currentPoints.length > 0 && (
        <path
          d={getSvgPathFromStroke(currentPoints)}
          stroke={currentColor}
          strokeWidth={currentSize}
          strokeOpacity={currentOpacity}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};
