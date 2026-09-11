import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Text, Group, Line, Transformer } from 'react-konva';
import useImage from 'use-image';
import { Layer } from '@/hooks/useSmartEditor';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { ZoomIn, ZoomOut, Maximize, MousePointer, Type, Sparkles, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Blurhash } from 'react-blurhash';

import { denormalizeBBox } from '@/utils/coordinateUtils';

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // 0..1280 coordinate space
  y: number; // 0..720 coordinate space
  fontSize: number;
  colorPreset?: 'yellow' | 'white' | 'pink' | 'cyan' | 'green' | 'orange' | 'purple' | 'custom';
  textColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  isBold?: boolean;
  isItalic?: boolean;
  opacity?: number;
  rotation?: number;
}

import { TEXT_PRESET_COLORS } from '@/utils/editorConstants';
export { TEXT_PRESET_COLORS };

interface EditorCanvasProps {
  currentImageUrl: string;
  originalImageUrl: string;
  layers: Layer[];
  selectedLayerId: string | null;
  onLayerClick: (layerId: string) => void;
  isReplacing: boolean;
  isDetecting: boolean;
  showAllBoxes?: boolean;
  textOverlays?: TextOverlay[];
  selectedTextId?: string | null;
  personOverlay?: {
    previewUrl: string;
    coords: { x: number; y: number; w: number; h: number };
    onMove: (coords: { x: number; y: number; w: number; h: number }) => void;
  } | null;
  onSelectText?: (id: string | null) => void;
  onTextOverlayMove?: (id: string, x: number, y: number) => void;
  onUpdateTextOverlay?: (id: string, updates: Partial<TextOverlay>) => void;
  onDeleteTextOverlay?: (id: string) => void;
  onUpdateLayerText?: (layerId: string, text: string) => void;
  stageRef?: React.RefObject<Konva.Stage>;
}

export function EditorCanvas({
  currentImageUrl,
  originalImageUrl,
  layers,
  selectedLayerId,
  onLayerClick,
  isReplacing,
  isDetecting,
  showAllBoxes = false,
  textOverlays = [],
  selectedTextId = null,
  personOverlay = null,
  onSelectText,
  onTextOverlayMove,
  onUpdateTextOverlay,
  onDeleteTextOverlay,
  onUpdateLayerText,
  stageRef: externalStageRef,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const transformerRef = useRef<Konva.Transformer>(null);
  const textNodeRefs = useRef<Map<string, Konva.Group>>(new Map());

  // Canvas Viewport States
  const [scale, setScale] = useState(1);
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(450);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);
  const [dashOffset, setDashOffset] = useState(0);
  const [scanY, setScanY] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number, text: string } | null>(null);

  // Inline Editing State (Canva Double-Click editing)
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [textareaPos, setTextareaPos] = useState<{ x: number; y: number; width: number; height: number; fontSize: number; fontFamily: string; color: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Comparison slider (0 to 1) — default to hidden so newly replaced thumbnail displays 100% full frame
  const [comparePos, setComparePos] = useState(0.5);
  const [showCompareSlider, setShowCompareSlider] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const hasEdits = originalImageUrl !== currentImageUrl && Boolean(originalImageUrl && currentImageUrl);

  // Images
  const [currentImage] = useImage(currentImageUrl || '', 'anonymous');
  const [originalImage] = useImage(originalImageUrl || '', 'anonymous');

  // Responsive stage measurement — adapts to the actual image aspect ratio
  // so the image renders 1:1 without distortion and bounding boxes align perfectly.
  const measureStage = useCallback(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;

    const paddingX = 32;
    const paddingY = 64;
    const maxW = Math.max(320, parent.clientWidth - paddingX);
    const maxH = Math.max(240, parent.clientHeight - paddingY);

    // Use the actual image aspect ratio if available, otherwise default to 16:9
    const imgAspect = currentImage
      ? currentImage.width / currentImage.height
      : 16 / 9;

    let targetW = maxW;
    let targetH = targetW / imgAspect;

    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * imgAspect;
    }

    // Ensure we don't exceed max width after height constraint
    if (targetW > maxW) {
      targetW = maxW;
      targetH = targetW / imgAspect;
    }

    setStageWidth(Math.round(targetW));
    setStageHeight(Math.round(targetH));
  }, [currentImage]);

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

  // Update Transformer attachment when selectedTextId or selectedLayerId changes
  useEffect(() => {
    if (!transformerRef.current) return;
    const activeId = selectedTextId || selectedLayerId;
    if (activeId && !editingTextId) {
      const node = textNodeRefs.current.get(activeId);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedTextId, selectedLayerId, editingTextId, textOverlays, layers]);

  // Handle keyboard shortcuts (Delete, Escape, Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return; // Don't intercept while user is typing in textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTextId) {
        e.preventDefault();
        onDeleteTextOverlay?.(selectedTextId);
        onSelectText?.(null);
      } else if (e.key === 'Escape') {
        onSelectText?.(null);
        setEditingTextId(null);
        setTextareaPos(null);
      } else if (selectedTextId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const active = textOverlays.find(t => t.id === selectedTextId);
        if (!active) return;
        const step = e.shiftKey ? 10 : 2;
        let newX = active.x;
        let newY = active.y;
        if (e.key === 'ArrowUp') newY -= step;
        if (e.key === 'ArrowDown') newY += step;
        if (e.key === 'ArrowLeft') newX -= step;
        if (e.key === 'ArrowRight') newX += step;
        onUpdateTextOverlay?.(selectedTextId, { x: newX, y: newY });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTextId, editingTextId, textOverlays, onDeleteTextOverlay, onSelectText, onUpdateTextOverlay]);

  // Scan and highlight loop
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

  // Trigger inline double-click editing
  const startInlineEditing = (overlay: TextOverlay) => {
    const stage = stageRef.current;
    if (!stage) return;
    const groupNode = textNodeRefs.current.get(overlay.id);
    if (!groupNode) return;

    const absPos = groupNode.getAbsolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    const scaledFontSize = (overlay.fontSize / 1280) * stageWidth;
    const preset = TEXT_PRESET_COLORS[overlay.colorPreset || 'yellow'] || TEXT_PRESET_COLORS.yellow;
    const textColor = overlay.textColor || preset.fill;

    setEditingTextId(overlay.id);
    setEditingTextValue(overlay.text);
    setTextareaPos({
      x: absPos.x,
      y: absPos.y,
      width: Math.max(160, groupNode.width() || 200),
      height: Math.max(48, groupNode.height() || 60),
      fontSize: scaledFontSize,
      fontFamily: overlay.fontFamily || "Impact, Arial Black, sans-serif",
      color: textColor,
    });

    onSelectText?.(overlay.id);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, 20);
  };

  const finishInlineEditing = () => {
    if (editingTextId) {
      if (editingTextValue.trim()) {
        const isVectorLayer = layers.some(l => l.id === editingTextId);
        if (isVectorLayer) {
          onUpdateLayerText?.(editingTextId, editingTextValue.trim());
        } else {
          onUpdateTextOverlay?.(editingTextId, { text: editingTextValue });
        }
      } else {
        // If empty text, delete it (for text overlays)
        onDeleteTextOverlay?.(editingTextId);
        onSelectText?.(null);
      }
    }
    setEditingTextId(null);
    setTextareaPos(null);
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(3, prev + 0.15));
  const handleZoomOut = () => setScale(prev => Math.max(0.5, prev - 0.15));
  const handleFit = () => {
    setScale(1);
    if (stageRef.current) stageRef.current.to({ scaleX: 1, scaleY: 1, position: { x: 0, y: 0 }, duration: 0.25 });
  };

  // Comparison slider handlers
  const sliderX = comparePos * stageWidth;

  const handleSliderDragMove = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newX = Math.max(0, Math.min(stageWidth, node.x()));
    node.y(0);
    node.x(newX);
    setComparePos(newX / stageWidth);
  };

  // Live stage denormalization using standardized coordinateUtils
  const getCanvasBBox = useCallback((bbox: { x: number; y: number; w: number; h: number }) => {
    const { x, y, w, h } = denormalizeBBox(bbox, stageWidth, stageHeight);
    return { bx: x, by: y, bw: w, bh: h };
  }, [stageWidth, stageHeight]);

  // Hover detection over layers
  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isDraggingSlider) return;
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const transform = stage?.getAbsoluteTransform().copy().invert();
    const pos = transform?.point(pointer);
    if (!pos) return;

    // Check layer bounding boxes
    let foundLayerId: string | null = null;
    let foundLabel = "";
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (l.boundingBox && l.type !== 'background') {
        const { bx, by, bw, bh } = getCanvasBBox(l.boundingBox);
        if (pos.x >= bx && pos.x <= bx + bw && pos.y >= by && pos.y <= by + bh) {
          foundLayerId = l.id;
          foundLabel = l.label;
          break;
        }
      }
    }
    setHoveredLayerId(foundLayerId);
    if (stage) stage.container().style.cursor = (foundLayerId || hoveredTextId) ? 'pointer' : 'default';
    if (foundLayerId && !hoveredTextId) setTooltipPos({ x: pointer.x + 15, y: pointer.y + 15, text: foundLabel });
    else setTooltipPos(null);
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    // If clicked directly on empty stage background, deselect text & layer (clean view)
    if (e.target === e.target.getStage() || e.target.name() === 'background-rect') {
      onSelectText?.(null);
      onLayerClick('');
      if (editingTextId) finishInlineEditing();
      return;
    }
    if (hoveredLayerId) {
      onLayerClick(hoveredLayerId);
    } else {
      onSelectText?.(null);
      onLayerClick('');
    }
  };

  const handleStageDblClick = (e: KonvaEventObject<MouseEvent>) => {
    if (hoveredLayerId) {
      const layer = layers.find(l => l.id === hoveredLayerId);
      if (layer && layer.type === 'text' && layer.boundingBox) {
        onLayerClick(layer.id);
        const bbox = layer.boundingBox;
        const { bx, by, bw, bh } = getCanvasBBox(bbox);
        const fontSize = Math.max(16, (layer.fontSizeNorm || (bbox.h * 0.85)) * stageHeight);
        startInlineEditing({
          id: layer.id,
          text: layer.replacementText || layer.originalContent || layer.label || '',
          x: bbox.x * 1280,
          y: bbox.y * 720,
          fontSize: fontSize * (1280 / stageWidth),
          fontFamily: layer.fontFamily || "Impact, Arial Black, sans-serif",
          textColor: layer.textColor || "#FFFFFF",
        });
      }
    }
  };

  return (
    <div 
      className="flex-1 w-full h-full relative flex flex-col items-center justify-center bg-transparent overflow-hidden select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectText?.(null);
          onLayerClick('');
        }
      }}
    >
      {/* Blurhash placeholder */}
      {!currentImage && (
        <div className="absolute inset-0">
          <Blurhash hash="LKO2?V%2Tw=w]~RBVZOfof9~%7VZ" width="100%" height="100%" resolutionX={32} resolutionY={32} punch={1} />
        </div>
      )}

      {/* Quick layer tooltip */}
      {tooltipPos && !isDetecting && (
        <div 
          className="pointer-events-none absolute z-50 bg-background/95 text-foreground backdrop-blur border border-primary/40 shadow-xl rounded-md px-2.5 py-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100" 
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {tooltipPos.text}
        </div>
      )}

      {/* Loading spinner during inpaint/replace */}
      {isReplacing && (
        <div className="absolute inset-0 z-40 bg-background/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
          <span className="text-xs font-semibold text-primary bg-background/80 px-3 py-1 rounded-full border border-border shadow-sm">Applying AI Edit...</span>
        </div>
      )}

      {/* Inline Text Editing Overlay (HTML Textarea mounted directly over text node) */}
      {textareaPos && editingTextId && (
        <textarea
          ref={textareaRef}
          value={editingTextValue}
          onChange={(e) => setEditingTextValue(e.target.value)}
          onBlur={finishInlineEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              finishInlineEditing();
            } else if (e.key === 'Escape') {
              setEditingTextId(null);
              setTextareaPos(null);
            }
          }}
          style={{
            position: 'absolute',
            left: `${textareaPos.x}px`,
            top: `${textareaPos.y}px`,
            width: `${textareaPos.width}px`,
            height: `${textareaPos.height}px`,
            fontSize: `${textareaPos.fontSize}px`,
            fontFamily: textareaPos.fontFamily,
            color: textareaPos.color,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            border: '2px dashed #8B47FF',
            borderRadius: '4px',
            padding: '4px',
            outline: 'none',
            resize: 'none',
            zIndex: 100,
            lineHeight: 1.1,
            fontWeight: 900,
          }}
        />
      )}

      {/* Main Konva Stage Box */}
      <div 
        ref={containerRef} 
        className="w-full max-w-[980px] relative shadow-2xl mx-auto rounded-xl overflow-hidden ring-1 ring-border/50 bg-muted/20"
        style={{ aspectRatio: currentImage ? `${currentImage.width} / ${currentImage.height}` : '16 / 9' }}
      >
        <Stage 
          ref={stageRef} 
          width={stageWidth} 
          height={stageHeight} 
          onMouseMove={handleStageMouseMove} 
          onMouseLeave={() => { setHoveredLayerId(null); setTooltipPos(null); }} 
          onClick={handleStageClick}
          onDblClick={handleStageDblClick}
          className="bg-card cursor-default overflow-hidden"
        >
          {/* Base Layer: Current Thumbnail */}
          <KonvaLayer perfectDrawEnabled={false}>
            <Rect name="background-rect" width={stageWidth} height={stageHeight} fill="#141419" />
            {currentImage && (
              <KonvaImage 
                image={currentImage} 
                width={stageWidth} 
                height={stageHeight} 
                listening={true}
              />
            )}
          </KonvaLayer>

          {/* Comparison Slider (Original vs Edited) */}
          {hasEdits && showCompareSlider && originalImage && comparePos < 1 && (
            <KonvaLayer>
              <Group clipFunc={(ctx: any) => ctx.rect(0, 0, sliderX, stageHeight)}>
                <KonvaImage 
                  image={originalImage} 
                  width={stageWidth} 
                  height={stageHeight} 
                  listening={false} 
                />
              </Group>
            </KonvaLayer>
          )}

          {/* Vector Text Replacements Layer (Phase 1b — Crisp Vector Rendering) */}
          <KonvaLayer>
            {layers
              .filter(l => l.type === 'text' && l.replacementText && l.boundingBox)
              .map(layer => {
                const bbox = layer.boundingBox!;
                const { bx, by, bw, bh } = getCanvasBBox(bbox);
                const fontSize = Math.max(16, (layer.fontSizeNorm || (bbox.h * 0.85)) * stageHeight);
                const isSelected = selectedLayerId === layer.id;

                return (
                  <Group
                    key={`vector-text-${layer.id}`}
                    ref={(node) => {
                      if (node) textNodeRefs.current.set(layer.id, node);
                      else textNodeRefs.current.delete(layer.id);
                    }}
                    x={bx}
                    y={by}
                    draggable
                    onClick={(e) => {
                      e.cancelBubble = true;
                      onLayerClick(layer.id);
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      startInlineEditing({
                        id: layer.id,
                        text: layer.replacementText || '',
                        x: bbox.x * 1280,
                        y: bbox.y * 720,
                        fontSize: fontSize * (1280 / stageWidth),
                        fontFamily: layer.fontFamily || "Montserrat, sans-serif",
                        textColor: layer.textColor || "#FFFFFF",
                      });
                    }}
                  >
                    <Text
                      text={layer.replacementText || ''}
                      fontSize={fontSize}
                      fontFamily={layer.fontFamily || "'Montserrat', sans-serif"}
                      fontStyle="bold"
                      fill={layer.textColor || "#FFFFFF"}
                      stroke={layer.hasStroke ? "#000000" : undefined}
                      strokeWidth={layer.hasStroke ? Math.max(2, fontSize * 0.08) : 0}
                      fillAfterStrokeEnabled={true}
                      shadowColor="rgba(0,0,0,0.8)"
                      shadowBlur={6}
                      shadowOffsetX={2}
                      shadowOffsetY={3}
                      align="left"
                      verticalAlign="middle"
                    />
                    {isSelected && (
                      <Rect
                        width={bw}
                        height={bh}
                        stroke="#8B47FF"
                        strokeWidth={2}
                        dash={[4, 4]}
                        listening={false}
                      />
                    )}
                  </Group>
                );
              })}

            {/* User-created Text Overlays (Grabbed / Custom) */}
            {textOverlays.map(overlay => {
              const ox = (overlay.x / 1280) * stageWidth;
              const oy = (overlay.y / 720) * stageHeight;
              const oFontSize = (overlay.fontSize / 1280) * stageWidth;
              const preset = TEXT_PRESET_COLORS[overlay.colorPreset || 'yellow'] || TEXT_PRESET_COLORS.yellow;
              const textColor = overlay.textColor || preset.fill;
              const strokeColor = overlay.strokeColor || preset.stroke;
              const strokeWidth = overlay.strokeWidth ?? Math.max(2, oFontSize * 0.08);

              return (
                <Group
                  key={overlay.id}
                  ref={(node) => {
                    if (node) textNodeRefs.current.set(overlay.id, node);
                    else textNodeRefs.current.delete(overlay.id);
                  }}
                  x={ox}
                  y={oy}
                  draggable
                  onDragEnd={(e) => {
                    const nx = (e.target.x() / stageWidth) * 1280;
                    const ny = (e.target.y() / stageHeight) * 720;
                    onTextOverlayMove?.(overlay.id, nx, ny);
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelectText?.(overlay.id);
                  }}
                  onDblClick={(e) => {
                    e.cancelBubble = true;
                    startInlineEditing(overlay);
                  }}
                >
                  <Text
                    text={overlay.text}
                    fontSize={oFontSize}
                    fontFamily={overlay.fontFamily || "'Impact', Arial Black, sans-serif"}
                    fontStyle={overlay.isBold ? "bold" : "normal"}
                    fill={textColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fillAfterStrokeEnabled={true}
                    shadowColor={overlay.shadowColor || "rgba(0,0,0,0.8)"}
                    shadowBlur={overlay.shadowBlur ?? 6}
                    shadowOffsetX={overlay.shadowOffsetX ?? 2}
                    shadowOffsetY={overlay.shadowOffsetY ?? 3}
                    opacity={overlay.opacity ?? 1}
                    rotation={overlay.rotation ?? 0}
                  />
                </Group>
              );
            })}

            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              keepRatio={true}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 10) return oldBox;
                return newBox;
              }}
            />
            {/* Interactive Uploaded Person Overlay */}
            {personOverlay && personOverlay.previewUrl && personOverlay.coords && (
              <PersonOverlayLayer
                previewUrl={personOverlay.previewUrl}
                coords={personOverlay.coords}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                onMove={personOverlay.onMove}
              />
            )}
          </KonvaLayer>

          {/* Draggable Slider Bar */}
          {hasEdits && showCompareSlider && (
            <KonvaLayer>
              <Line
                points={[sliderX, 0, sliderX, stageHeight]}
                stroke="white"
                strokeWidth={2.5}
                shadowColor="rgba(0,0,0,0.6)"
                shadowBlur={6}
                listening={false}
              />
              <Group
                x={sliderX}
                y={stageHeight / 2}
                draggable
                onDragStart={() => setIsDraggingSlider(true)}
                onDragMove={handleSliderDragMove}
                onDragEnd={() => setIsDraggingSlider(false)}
                dragBoundFunc={(pos) => ({ x: Math.max(0, Math.min(stageWidth, pos.x)), y: stageHeight / 2 })}
              >
                <Rect
                  x={-14} y={-18} width={28} height={36}
                  fill="white"
                  cornerRadius={14}
                  shadowColor="rgba(0,0,0,0.35)"
                  shadowBlur={8}
                />
                <Text x={-11} y={-10} text="◀" fontSize={10} fill="#8B47FF" listening={false} />
                <Text x={2} y={-10} text="▶" fontSize={10} fill="#8B47FF" listening={false} />
              </Group>
            </KonvaLayer>
          )}

          {/* AI Layer Bounding Box Highlights (Popped-up element interaction) */}
          <KonvaLayer listening={false}>
            {layers.map(layer => {
              if (!layer.boundingBox || layer.type === 'background') return null;
              const isSelected = selectedLayerId === layer.id;
              const isHovered = hoveredLayerId === layer.id;
              const shouldShow = showAllBoxes || isSelected || isHovered;

              if (!shouldShow) return null;

              const { bx, by, bw, bh } = getCanvasBBox(layer.boundingBox);

              return (
                <React.Fragment key={`box-${layer.id}`}>
                  <Rect
                    x={bx}
                    y={by}
                    width={bw}
                    height={bh}
                    stroke={isSelected ? '#8B47FF' : '#00E5FF'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    dash={isSelected ? undefined : [4, 4]}
                    fill={isSelected ? 'rgba(139, 71, 255, 0.05)' : 'rgba(0, 229, 255, 0.03)'}
                  />
                  <Group x={bx} y={Math.max(0, by - 22)}>
                    <Rect 
                      width={Math.max(60, layer.label.length * 7 + 12)} 
                      height={18} 
                      fill={isSelected ? '#8B47FF' : '#00E5FF'} 
                      cornerRadius={4} 
                    />
                    <Text 
                      x={6} 
                      y={4} 
                      text={layer.label} 
                      fontSize={10} 
                      fontStyle="bold" 
                      fill={isSelected ? '#FFFFFF' : '#0F0A1E'} 
                    />
                  </Group>
                </React.Fragment>
              );
            })}
          </KonvaLayer>

          {/* Scan line for initial detection */}
          {isDetecting && (
            <KonvaLayer listening={false}>
              <Rect width={stageWidth} height={stageHeight} fill="rgba(139, 71, 255, 0.08)" />
              <Rect x={0} y={scanY} width={stageWidth} height={3} fill="#8B47FF" opacity={0.8} />
            </KonvaLayer>
          )}
        </Stage>
      </div>

      {/* Floating Canvas View Controls */}
      <div className="mt-4 flex items-center bg-background/90 backdrop-blur-md border border-border/80 rounded-full shadow-lg px-2 py-1 shrink-0 z-10 gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[11px] font-semibold px-2 min-w-[2.75rem] text-center text-muted-foreground">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-3.5 bg-border/80 mx-0.5" />
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={handleFit} title="Reset View">
          <Maximize className="h-3.5 w-3.5" />
        </Button>
        {hasEdits && (
          <>
            <div className="w-px h-3.5 bg-border/80 mx-0.5" />
            <Button
              variant={showCompareSlider ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-[11px] rounded-full px-2.5 font-medium gap-1 text-foreground"
              onClick={() => {
                setShowCompareSlider(prev => !prev);
                if (!showCompareSlider) setComparePos(0.5);
              }}
              title="Compare original vs edited thumbnail"
            >
              <Split className="h-3.5 w-3.5" />
              <span>{showCompareSlider ? "Hide Comparison" : "Compare Original"}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function PersonOverlayLayer({
  previewUrl,
  coords,
  stageWidth,
  stageHeight,
  onMove,
}: {
  previewUrl: string;
  coords: { x: number; y: number; w: number; h: number };
  stageWidth: number;
  stageHeight: number;
  onMove: (coords: { x: number; y: number; w: number; h: number }) => void;
}) {
  const [img] = useImage(previewUrl, 'anonymous');
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const sx = (coords.x / 1280) * stageWidth;
  const sy = (coords.y / 720) * stageHeight;
  const sw = (coords.w / 1280) * stageWidth;
  const sh = (coords.h / 720) * stageHeight;

  useEffect(() => {
    if (groupRef.current && trRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [img, coords.x, coords.y, coords.w, coords.h]);

  if (!img) return null;

  return (
    <Group>
      <Group
        ref={groupRef}
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        draggable
        onDragEnd={(e) => {
          const nx = (e.target.x() / stageWidth) * 1280;
          const ny = (e.target.y() / stageHeight) * 720;
          onMove({
            x: Math.round(nx),
            y: Math.round(ny),
            w: coords.w,
            h: coords.h,
          });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);

          const newSw = Math.max(20, node.width() * scaleX);
          const newSh = Math.max(20, node.height() * scaleY);
          const nx = (node.x() / stageWidth) * 1280;
          const ny = (node.y() / stageHeight) * 720;
          const nw = (newSw / stageWidth) * 1280;
          const nh = (newSh / stageHeight) * 720;

          onMove({
            x: Math.round(nx),
            y: Math.round(ny),
            w: Math.round(nw),
            h: Math.round(nh),
          });
        }}
      >
        <KonvaImage image={img} width={sw} height={sh} opacity={0.9} />
        <Rect
          width={sw}
          height={sh}
          stroke="#8B47FF"
          strokeWidth={2.5}
          dash={[6, 4]}
          listening={false}
        />
      </Group>
      <Transformer
        ref={trRef}
        rotateEnabled={false}
        keepRatio={true}
        boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 ? oldBox : newBox)}
      />
    </Group>
  );
}

