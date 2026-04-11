import Tesseract from 'tesseract.js';

export interface TextLayer {
  type: 'text';
  label: string;
  originalContent: string;
  boundingBox: { x: number; y: number; w: number; h: number };
  confidence: number;
}

export async function detectTextInImage(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number,
  worker?: Tesseract.Worker
): Promise<TextLayer[]> {
  let result;
  if (worker) {
    result = await worker.recognize(imageUrl);
  } else {
    result = await Tesseract.recognize(imageUrl, 'eng+hin', {
      // Support English + Hindi
      logger: () => {} // suppress logs
    });
  }

  const textLayers: TextLayer[] = [];

  // Filter by confidence > 60% and minimum word length
  const words = result.data.words.filter(
    word => word.confidence > 60 && word.text.trim().length > 1
  );

  // Group nearby words into text blocks
  // Words within 20px vertical distance = same text block
  const textBlocks = groupWordsIntoBlocks(words);

  textBlocks.forEach((block) => {
    // Normalize bounding box to API expected ranges if needed, but the original logic
    // we built used exact pixel coordinates because frontend scales using `ScaleX = 0.5`.
    // Wait, the user said: "Normalize bounding box to 0-1 range"
    // Let's output what they explicitly requested.
    const bbox = {
      x: block.bbox.x0 / imageWidth,
      y: block.bbox.y0 / imageHeight,
      w: (block.bbox.x1 - block.bbox.x0) / imageWidth,
      h: (block.bbox.y1 - block.bbox.y0) / imageHeight
    };

    textLayers.push({
      type: 'text',
      label: `📝 "${block.text.substring(0, 20)}${block.text.length > 20 ? '...' : ''}"`,
      originalContent: block.text,
      boundingBox: bbox,
      confidence: block.confidence
    });
  });

  return textLayers;
}

function groupWordsIntoBlocks(words: Tesseract.Word[]) {
  if (words.length === 0) return [];
  
  const blocks: any[] = [];
  let currentBlock = {
    text: words[0].text,
    bbox: { ...words[0].bbox },
    confidence: words[0].confidence,
    words: [words[0]]
  };

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const verticalGap = Math.abs(word.bbox.y0 - currentBlock.bbox.y1);
    
    if (verticalGap < 25) {
      // Same block — extend it
      currentBlock.text += ' ' + word.text;
      currentBlock.bbox.x1 = Math.max(currentBlock.bbox.x1, word.bbox.x1);
      currentBlock.bbox.y1 = Math.max(currentBlock.bbox.y1, word.bbox.y1);
      currentBlock.confidence = (currentBlock.confidence + word.confidence) / 2;
      currentBlock.words.push(word);
    } else {
      // New block
      blocks.push(currentBlock);
      currentBlock = {
        text: word.text,
        bbox: { ...word.bbox },
        confidence: word.confidence,
        words: [word]
      };
    }
  }
  blocks.push(currentBlock);
  
  return blocks;
}
