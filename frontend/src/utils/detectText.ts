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
  let result: Tesseract.RecognizeResult;
  if (worker) {
    result = await worker.recognize(imageUrl);
  } else {
    result = await Tesseract.recognize(imageUrl, 'eng+hin', {
      // Support English + Hindi
      logger: () => {} // suppress logs
    });
  }

  const textLayers: TextLayer[] = [];

  const rawWords = result?.data?.words;
  if (!Array.isArray(rawWords) || rawWords.length === 0) {
    return [];
  }

  // Filter by confidence, minimum word length, and minimum size
  const words = rawWords.filter((word) => {
    if (word.confidence <= 60) return false;
    if (word.text.trim().length <= 1) return false;

    const width = Math.abs(word.bbox.x1 - word.bbox.x0);
    const height = Math.abs(word.bbox.y1 - word.bbox.y0);
    const minDim = 6;
    return width >= minDim && height >= minDim;
  });

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

type TextBlock = {
  text: string;
  bbox: Tesseract.BoundingBox;
  confidence: number;
  words: Tesseract.Word[];
};

function groupWordsIntoBlocks(words: Tesseract.Word[]): TextBlock[] {
  if (words.length === 0) return [];
  
  const blocks: TextBlock[] = [];
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
