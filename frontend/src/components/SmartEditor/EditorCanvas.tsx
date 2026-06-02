import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Text, Group, Line } from 'react-konva';
import useImage from 'use-image';
import { Layer } from '@/hooks/useSmartEditor';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Blurhash } from 'react-blurhash';

interface EditorCanvasProps {
  currentImageUrl: string;
  originalImageUrl: string;
  layers: Layer[];
  selectedLayerId: string | null;
  onLayerClick: (layerId: string) => void;
  isReplacing: boolean;
  isDetecting: boolean;
}

export function EditorCanvas({
  currentImageUrl,
  originalImageUrl,
  layers,
  selectedLayerId,
  onLayerClick,
  isReplacing,
  isDetecting
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // States
  const [scale, setScale] = useState(1);
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(450);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [dashOffset, setDashOffset] = useState(0);
  const [scanY, setScanY] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number, text: string } | null>(null);

  // Comparison slider (0 to 1, where 1 = full edited, 0 = full original)
  const [comparePos, setComparePos] = useState(0.5);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const hasEdits = originalImageUrl !== currentImageUrl;
  
  // Images
  const [currentImage] = useImage(currentImageUrl || '', 'anonymous');
  const [originalImage] = useImage(originalImageUrl || '', 'anonymous');

  // Measure space
  const measureStage = useCallback(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;

    const paddingX = 40;
    const paddingY = 80;
    let targetW = Math.max(280, parent.clientWidth - paddingX);
    let targetH = targetW * (9 / 16);
    const maxH = Math.max(220, parent.clientHeight - paddingY);
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * (16 / 9);
    }
    setStageWidth(targetW);
    setStageHeight(targetH);
  }, []);

  useEffect(() => {
    measureStage();
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(() => measureStage());
    resizeObserver.observe(parent);
    window.addEventListener('resize', measureStage);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureStage);
    };
  }, [measureStage, currentImageUrl]);

  // Animations
  useEffect(() => {
    let animFrame: number;
    let scanDirection = 1;
    const animateLoop = () => {
      setDashOffset(prev => prev + 0.3);
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

  // Comparison slider drag handlers
  const sliderX = comparePos * stageWidth;

  const handleSliderDragStart = () => {
    setIsDraggingSlider(true);
  };

  const handleSliderDragMove = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newX = Math.max(0, Math.min(stageWidth, node.x()));
    node.y(0); // Lock vertical
    node.x(newX);
    setComparePos(newX / stageWidth);
  };

  const handleSliderDragEnd = () => {
    setIsDraggingSlider(false);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isDraggingSlider) return;
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
      const showPreview = selectedLayerId === null;
      const isHighlighted = isSelected || isHovered || showPreview;

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
                 fill={isSelected ? 'rgba(139, 71, 255, 0.05)' : (isHovered || showPreview ? 'rgba(139, 71, 255, 0.1)' : 'transparent')}
                 stroke={isHighlighted ? '#8B47FF' : 'transparent'}
                 strokeWidth={isSelected ? 2 : (isHighlighted ? 1 : 0)}
                 dash={isSelected ? [8, 4] : []}
                 dashOffset={dashOffset}
                 listening={false}
             />
             {isHighlighted && (
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
        {/* Blurhash placeholder */}
        {!currentImage && (
            <div className="absolute inset-0">
                <Blurhash hash="LKO2?V%2Tw=w]~RBVZOfof9~%7VZ" width="100%" height="100%" resolutionX={32} resolutionY={32} punch={1} />
            </div>
        )}

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

        <div ref={containerRef} className="w-full max-w-[960px] aspect-video relative shadow-2xl mx-auto">
            <Stage 
                ref={stageRef} width={stageWidth} height={stageHeight}
                onMouseMove={handleMouseMove} onMouseLeave={handleMouseOut} onClick={handleClick}
                className="bg-card cursor-crosshair rounded-xl overflow-hidden"
            >
                {/* Base layer: Edited image (full width) */}
                <KonvaLayer perfectDrawEnabled={false}>
                    <Rect width={stageWidth} height={stageHeight} fill="#F0F0F0" />
                    {currentImage && <KonvaImage image={currentImage} width={stageWidth} height={stageHeight} />}
                </KonvaLayer>

                {/* Original image clipped from left edge to slider position */}
                {hasEdits && originalImage && comparePos < 1 && (
                    <KonvaLayer>
                        <Group
                            clipFunc={(ctx: any) => {
                                ctx.rect(0, 0, sliderX, stageHeight);
                            }}
                        >
                            <KonvaImage image={originalImage} width={stageWidth} height={stageHeight} listening={false} />
                        </Group>
                    </KonvaLayer>
                )}

                {/* Comparison slider handle */}
                {hasEdits && (
                    <KonvaLayer>
                        {/* Vertical divider line */}
                        <Line
                            points={[sliderX, 0, sliderX, stageHeight]}
                            stroke="white"
                            strokeWidth={3}
                            shadowColor="rgba(0,0,0,0.5)"
                            shadowBlur={6}
                            shadowOffsetX={0}
                            shadowOffsetY={0}
                            listening={false}
                        />
                        {/* Draggable handle circle */}
                        <Group
                            x={sliderX}
                            y={stageHeight / 2}
                            draggable
                            onDragStart={handleSliderDragStart}
                            onDragMove={handleSliderDragMove}
                            onDragEnd={handleSliderDragEnd}
                            dragBoundFunc={(pos) => ({
                                x: Math.max(0, Math.min(stageWidth, pos.x)),
                                y: stageHeight / 2,
                            })}
                        >
                            {/* Handle background circle */}
                            <Rect
                                x={-16} y={-20} width={32} height={40}
                                fill="white"
                                cornerRadius={16}
                                shadowColor="rgba(0,0,0,0.3)"
                                shadowBlur={8}
                                shadowOffsetY={2}
                            />
                            {/* Left arrow */}
                            <Text x={-13} y={-12} text="◀" fontSize={11} fill="#8B47FF" listening={false} />
                            {/* Right arrow */}
                            <Text x={2} y={-12} text="▶" fontSize={11} fill="#8B47FF" listening={false} />
                        </Group>
                        {/* Labels */}
                        {comparePos > 0.05 && comparePos < 0.95 && (
                            <>
                                <Text x={8} y={stageHeight - 24} text="Original" fontSize={11} fontStyle="bold" fill="white" shadowColor="rgba(0,0,0,0.7)" shadowBlur={4} listening={false} />
                                <Text x={stageWidth - 52} y={stageHeight - 24} text="Edited" fontSize={11} fontStyle="bold" fill="white" shadowColor="rgba(0,0,0,0.7)" shadowBlur={4} listening={false} />
                            </>
                        )}
                    </KonvaLayer>
                )}

                {/* Layer highlights */}
                <KonvaLayer listening={false}>
                   {drawHighlights}
                </KonvaLayer>

                {/* Detection scan animation */}
                {isDetecting && (
                    <KonvaLayer listening={false}>
                         <Rect width={stageWidth} height={stageHeight} fill="rgba(255,255,255,0.2)" />
                         <Rect x={0} y={scanY} width={stageWidth} height={2} fill="#8B47FF" opacity={0.6} />
                    </KonvaLayer>
                )}
            </Stage>
        </div>

        <div className="mt-6 flex items-center bg-background/80 backdrop-blur border border-border rounded-full shadow-sm px-1 py-0.5 shrink-0 z-10">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleFit}>
                <Maximize className="h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}
