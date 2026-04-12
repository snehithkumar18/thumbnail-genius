import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';
import { Layer } from '@/hooks/useSmartEditor';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { ZoomIn, ZoomOut, Maximize, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Blurhash } from 'react-blurhash';

interface EditorCanvasProps {
  currentImageUrl: string;
  originalImageUrl: string;
  layers: Layer[];
  selectedLayerId: string | null;
  onLayerClick: (layerId: string) => void;
  viewMode: 'original' | 'edited';
  isReplacing: boolean;
  isDetecting: boolean;
}

export function EditorCanvas({
  currentImageUrl,
  originalImageUrl,
  layers,
  selectedLayerId,
  onLayerClick,
  viewMode,
  isReplacing,
  isDetecting
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const originalImageRef = useRef<Konva.Image>(null);
  const currentImageRef = useRef<Konva.Image>(null);

  // States
  const [scale, setScale] = useState(1);
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(450);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [dashOffset, setDashOffset] = useState(0);
  const [scanY, setScanY] = useState(0);
  const [shimmerOffset, setShimmerOffset] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number, text: string } | null>(null);
  
  // Images
  const [currentImage] = useImage(currentImageUrl || '', 'anonymous');
  const [originalImage] = useImage(originalImageUrl || '', 'anonymous');

  // Measure space
  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;

    let targetW = parent.clientWidth - 32;
    let targetH = targetW * (9 / 16);
    const maxH = parent.clientHeight - 80;
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * (16 / 9);
    }
    setStageWidth(targetW);
    setStageHeight(targetH);
  }, []);

  // Crossfade
  useEffect(() => {
    if (originalImageRef.current && currentImageRef.current) {
       const duration = 0.3;
       if (viewMode === 'original') {
         currentImageRef.current.to({ opacity: 0, duration });
         originalImageRef.current.to({ opacity: 1, duration });
       } else {
         originalImageRef.current.to({ opacity: 0, duration });
         currentImageRef.current.to({ opacity: 1, duration });
       }
    }
  }, [viewMode]);

  // Animations
  useEffect(() => {
    let animFrame: number;
    let scanDirection = 1;
    const animateLoop = () => {
      setDashOffset(prev => prev + 0.3);
      setShimmerOffset(prev => (prev > 200 ? -50 : prev + 2));
      if (isDetecting) {
         setScanY(prev => {
            let next = prev + (4 * scanDirection);
            if (next > stageHeight) { scanDirection = -1; next = stageHeight; }
            if (next < 0) { scanDirection = 1; next = 0; }
            return next;
         });
      }
      animFrame = requestAnimationFrame(animateLoop);
    };
    animFrame = requestAnimationFrame(animateLoop);
    return () => cancelAnimationFrame(animFrame);
  }, [stageHeight, isDetecting]);

  const handleZoomIn = () => setScale(prev => Math.min(3, prev + 0.1));
  const handleZoomOut = () => setScale(prev => Math.max(0.5, prev - 0.1));
  const handleFit = () => {
    setScale(1);
    if (stageRef.current) stageRef.current.to({ scaleX: 1, scaleY: 1, position: { x: 0, y: 0 }, duration: 0.3 });
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!currentImage) return;
    const sX = stageWidth / currentImage.width;
    const sY = stageHeight / currentImage.height;
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const transform = stage?.getAbsoluteTransform().copy().invert();
    const pos = transform?.point(pointer);
    if (!pos) return;

    let foundLayerId: string | null = null;
    let foundLabel = "";
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (l.boundingBox) {
         const bx = l.boundingBox.x * sX;
         const by = l.boundingBox.y * sY;
         const bw = l.boundingBox.w * sX;
         const bh = l.boundingBox.h * sY;
         if (pos.x >= bx && pos.x <= bx + bw && pos.y >= by && pos.y <= by + bh) {
            foundLayerId = l.id;
            foundLabel = l.label;
            break;
         }
      }
    }
    setHoveredLayerId(foundLayerId);
    if (stage) stage.container().style.cursor = foundLayerId ? 'pointer' : 'crosshair';
    if (foundLayerId) setTooltipPos({ x: pointer.x + 15, y: pointer.y + 15, text: foundLabel });
    else setTooltipPos(null);
  };

  const handleMouseOut = () => {
     setHoveredLayerId(null);
     setTooltipPos(null);
     if (stageRef.current) stageRef.current.container().style.cursor = 'default';
  };

    const handleClick = () => {
      if (!hoveredLayerId) return;
      onLayerClick(hoveredLayerId);
    };

  const drawHighlights = useMemo(() => {
    if (!currentImage) return null;
    const sX = stageWidth / currentImage.width;
    const sY = stageHeight / currentImage.height;

    return layers.map(layer => {
      if (!layer.boundingBox && layer.type !== 'background') return null;
      const isSelected = selectedLayerId === layer.id;
      const isHovered = hoveredLayerId === layer.id;
      let bx = 0, by = 0, bw = stageWidth, bh = stageHeight;
      if (layer.boundingBox) {
         bx = layer.boundingBox.x * sX;
         by = layer.boundingBox.y * sY;
         bw = layer.boundingBox.w * sX;
         bh = layer.boundingBox.h * sY;
      }
      return (
         <React.Fragment key={layer.id}>
             <Rect
                 x={bx} y={by} width={bw} height={bh}
                 fill={isSelected ? 'rgba(139, 71, 255, 0.05)' : (isHovered ? 'rgba(139, 71, 255, 0.1)' : 'transparent')}
                 stroke={isSelected || isHovered ? '#8B47FF' : 'transparent'}
                 strokeWidth={isSelected ? 2 : (isHovered ? 1 : 0)}
                 dash={isSelected ? [8, 4] : []}
                 dashOffset={dashOffset}
                 listening={false}
             />
             {(isSelected || isHovered) && (
                 <React.Fragment>
                     <Rect x={bx} y={Math.max(0, by - 18)} width={Math.min(bw, 100)} height={18} fill="#8B47FF" cornerRadius={2} listening={false} />
                     <Text x={bx + 4} y={Math.max(4, by - 14)} text={layer.label} fontSize={10} fill="white" listening={false} />
                 </React.Fragment>
             )}
         </React.Fragment>
      )
    });
  }, [layers, currentImage, stageWidth, stageHeight, selectedLayerId, hoveredLayerId, dashOffset]);

  return (
    <div className="flex-1 w-full h-full relative flex flex-col items-center justify-center bg-transparent overflow-hidden">
        {/* Step 10: Performance & Blurhash */}
        {!currentImage && (
            <div className="absolute inset-0">
                <Blurhash hash="LKO2?V%2Tw=w]~RBVZOfof9~%7VZ" width="100%" height="100%" resolutionX={32} resolutionY={32} punch={1} />
            </div>
        )}

        <div className="absolute top-4 right-4 z-10 flex items-center bg-background/80 backdrop-blur border border-border rounded-lg shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFit}>
                <Maximize className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
            </Button>
        </div>

        {tooltipPos && !isDetecting && (
            <div className="pointer-events-none absolute z-50 bg-white border border-[#8B47FF] shadow-sm rounded px-2 py-1 text-xs font-medium" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
               {tooltipPos.text}
            </div>
        )}

        {isReplacing && (
            <div className="absolute inset-0 z-40 bg-black/5 flex items-center justify-center">
                 <div className="w-8 h-8 border-4 border-[#8B47FF] border-t-transparent rounded-full animate-spin" />
            </div>
        )}

        <div ref={containerRef} className="w-full max-w-[800px] aspect-video relative shadow-2xl">
            <Stage 
                ref={stageRef} width={stageWidth} height={stageHeight}
                onMouseMove={handleMouseMove} onMouseLeave={handleMouseOut} onClick={handleClick}
                className="bg-card cursor-crosshair rounded-xl overflow-hidden"
            >
                <KonvaLayer perfectDrawEnabled={false}>
                    <Rect width={stageWidth} height={stageHeight} fill="#F0F0F0" />
                    {originalImage && <KonvaImage ref={originalImageRef} image={originalImage} width={stageWidth} height={stageHeight} opacity={viewMode === 'original' ? 1 : 0} />}
                    {currentImage && <KonvaImage ref={currentImageRef} image={currentImage} width={stageWidth} height={stageHeight} opacity={viewMode === 'edited' ? 1 : 0} />}
                </KonvaLayer>
                <KonvaLayer listening={false}>
                   {drawHighlights}
                </KonvaLayer>
                {isDetecting && (
                    <KonvaLayer listening={false}>
                         <Rect width={stageWidth} height={stageHeight} fill="rgba(255,255,255,0.2)" />
                         <Rect x={0} y={scanY} width={stageWidth} height={2} fill="#8B47FF" opacity={0.6} />
                    </KonvaLayer>
                )}
            </Stage>
        </div>
    </div>
  );
}
