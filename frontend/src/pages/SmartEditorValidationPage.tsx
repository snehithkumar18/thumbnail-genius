import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Play, CheckCircle2, XCircle, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface TestFixture {
  id: string;
  name: string;
  thumbnailUrl: string;
  originalText: string;
  replaceInstruction: string;
  bbox: [number, number, number, number];
}

const TEST_FIXTURES: TestFixture[] = [
  {
    id: 'air-india',
    name: 'Air India Case Study',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1280&auto=format&fit=crop&q=80',
    originalText: 'AIR INDIA',
    replaceInstruction: 'AIR US',
    bbox: [0.128, 0.095, 0.252, 0.09],
  },
  {
    id: 'price-badge',
    name: '₹50K Salary Badge',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1280&auto=format&fit=crop&q=80',
    originalText: '₹50K',
    replaceInstruction: '₹60K',
    bbox: [0.075, 0.215, 0.335, 0.15],
  },
  {
    id: 'wfh-headline',
    name: 'WFH Job Headline',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1280&auto=format&fit=crop&q=80',
    originalText: 'WFH JOB',
    replaceInstruction: 'REMOTE 2026',
    bbox: [0.09, 0.36, 0.385, 0.145],
  },
  {
    id: 'face-swap-presenter',
    name: 'Presenter Host Replacement',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1280&auto=format&fit=crop&q=80',
    originalText: 'Presenter Host',
    replaceInstruction: 'Tech Reviewer in futuristic studio with neon lighting',
    bbox: [0.48, 0.18, 0.41, 0.74],
  }
];

export default function SmartEditorValidationPage() {
  const [selectedFixture, setSelectedFixture] = useState<TestFixture>(TEST_FIXTURES[0]);
  const [customUrl, setCustomUrl] = useState(TEST_FIXTURES[0].thumbnailUrl);
  const [customText, setCustomText] = useState(TEST_FIXTURES[0].originalText);
  const [customInstruction, setCustomInstruction] = useState(TEST_FIXTURES[0].replaceInstruction);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    gemini?: { url: string | null; latency_ms: number; cost_usd: number; status: string; error?: string };
    flux_kontext?: { url: string | null; latency_ms: number; cost_usd: number; status: string; error?: string };
  } | null>(null);

  const handleSelectFixture = (f: TestFixture) => {
    setSelectedFixture(f);
    setCustomUrl(f.thumbnailUrl);
    setCustomText(f.originalText);
    setCustomInstruction(f.replaceInstruction);
  };

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    setResults(null);
    try {
      const resp = await fetch('http://localhost:3001/smart-editor/test-harness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thumbnail_url: customUrl,
          original_content: customText,
          instruction: customInstruction,
          bbox: selectedFixture.bbox,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Test harness failed: ${resp.statusText}`);
      }

      const data = await resp.json();
      setResults(data);
      toast.success('Side-by-side evaluation complete!');
    } catch (err: any) {
      toast.error(err.message || 'Evaluation failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/smart-editor">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Smart Editor — Model Quality Validation Sandbox (Task 5)
            </h1>
            <p className="text-xs text-muted-foreground">
              Evaluate Gemini "Nano Banana Pro" vs. FLUX.1 Kontext [pro] side-by-side on challenging thumbnail cases.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Fixtures Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TEST_FIXTURES.map(f => (
          <div
            key={f.id}
            onClick={() => handleSelectFixture(f)}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedFixture.id === f.id ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20' : 'border-border bg-card hover:bg-muted/50'}`}
          >
            <p className="text-xs font-bold">{f.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{f.originalText} → {f.replaceInstruction}</p>
          </div>
        ))}
      </div>

      {/* Evaluation Input Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Evaluation Setup</CardTitle>
          <CardDescription className="text-xs">Configure the prompt and target image to test both models simultaneously.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold">Thumbnail URL</label>
              <Input className="text-xs" value={customUrl} onChange={e => setCustomUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold">Original Text / Element</label>
              <Input className="text-xs" value={customText} onChange={e => setCustomText(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold">Replacement Target</label>
              <Input className="text-xs" value={customInstruction} onChange={e => setCustomInstruction(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleRunEvaluation} disabled={isRunning} className="w-full h-11 bg-primary text-sm font-semibold">
            {isRunning ? (
              <span className="flex items-center gap-2">Running Dual Evaluation...</span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-current" /> Run Side-by-Side Model Comparison
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Side-by-Side Results Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Original */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Original Source Image</CardTitle>
            <CardDescription className="text-xs">Baseline thumbnail</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center relative">
              <img src={customUrl} alt="Original" className="w-full h-full object-contain" />
            </div>
          </CardContent>
        </Card>

        {/* Gemini Nano Banana Pro */}
        <Card className="flex flex-col border-primary/40 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Gemini "Nano Banana Pro"
              </CardTitle>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Primary Default</span>
            </div>
            <CardDescription className="text-xs">Direct instruction multimodal transformation</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-4 space-y-3">
            <div className="w-full aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center relative">
              {results?.gemini?.url ? (
                <img src={results.gemini.url} alt="Gemini Output" className="w-full h-full object-contain" />
              ) : results?.gemini?.error ? (
                <div className="p-4 text-center text-red-500 text-xs flex flex-col items-center gap-1">
                  <XCircle className="h-6 w-6" />
                  <span>{results.gemini.error}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{isRunning ? 'Generating...' : 'Awaiting test'}</span>
              )}
            </div>

            {results?.gemini && (
              <div className="w-full flex items-center justify-between text-xs pt-2 border-t text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {results.gemini.latency_ms} ms</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> ~${results.gemini.cost_usd}</span>
                <span className="text-green-500 font-semibold">{results.gemini.status}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FLUX.1 Kontext [pro] */}
        <Card className="flex flex-col border-border shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> FLUX.1 Kontext [pro]
              </CardTitle>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded-full">Secondary Fallback</span>
            </div>
            <CardDescription className="text-xs">Context-aware diffusion edit via FAL.ai</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-4 space-y-3">
            <div className="w-full aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center relative">
              {results?.flux_kontext?.url ? (
                <img src={results.flux_kontext.url} alt="FLUX Kontext Output" className="w-full h-full object-contain" />
              ) : results?.flux_kontext?.error ? (
                <div className="p-4 text-center text-red-500 text-xs flex flex-col items-center gap-1">
                  <XCircle className="h-6 w-6" />
                  <span>{results.flux_kontext.error}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{isRunning ? 'Generating...' : 'Awaiting test'}</span>
              )}
            </div>

            {results?.flux_kontext && (
              <div className="w-full flex items-center justify-between text-xs pt-2 border-t text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {results.flux_kontext.latency_ms} ms</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> ~${results.flux_kontext.cost_usd}</span>
                <span className="text-green-500 font-semibold">{results.flux_kontext.status}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
