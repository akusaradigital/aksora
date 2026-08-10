"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Warning, 
  CaretLeft, 
  CaretRight, 
  Play, 
  X, 
  Timer,
  ArrowsIn,
  ArrowsOut,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type TestCase = {
  id: string | number;
  code: string;
  caseName: string;
  preCondition: string;
  testStep: string;
  expectedResult: string;
  actualResult: string;
  status: string;
};

export function PlayModeView({
  executionGroup,
  cases,
  onClose
}: {
  executionGroup: any;
  cases: TestCase[];
  onClose: (updatedCases: TestCase[]) => void;
}) {
  const [items, setItems] = useState<TestCase[]>(cases);
  const [index, setIndex] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const currentCase = items[index];

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateStatus = (status: string) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, status } : it));
    if (index < items.length - 1) {
      setTimeout(() => setIndex(index + 1), 200);
    }
  };

  const updateActual = (val: string) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, actualResult: val } : it));
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'p') updateStatus('Passed');
      if (e.key === 'f') updateStatus('Failed');
      if (e.key === 'b') updateStatus('Blocked');
      if (e.key === 'ArrowRight' || e.key === 'j') setIndex(i => Math.min(items.length - 1, i + 1));
      if (e.key === 'ArrowLeft' || e.key === 'k') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'Escape') onClose(items);
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [index, items]);

  const progress = Math.round(((items.filter(i => i.status).length) / items.length) * 100);

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex flex-col bg-gray-900 text-white transition-all duration-150",
      fullScreen ? "p-0" : "p-4 md:p-8"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center  bg-blue-600 shadow-lg shadow-blue-500/20">
            <Play size={20} weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-none">{executionGroup.title}</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mt-1">Execution Mode · {index + 1} of {items.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-gray-400">
            <Timer size={16} />
            <span className="text-sm font-mono font-bold">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFullScreen(!fullScreen)} className="h-10 w-10 flex items-center justify-center  hover:bg-white/10 transition">
              {fullScreen ? <ArrowsIn size={20} /> : <ArrowsOut size={20} />}
            </button>
            <button onClick={() => onClose(items)} className="h-10 w-10 flex items-center justify-center  bg-white/5 hover:bg-rose-500 transition text-rose-400 hover:text-white">
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full gap-6">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/5  overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>

        {/* Card */}
        <div className="flex-1 rounded-3xl bg-white/5 border border-white/10 p-8 flex flex-col gap-8 shadow-md overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-widest border border-blue-500/30">
                {currentCase.code}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mt-4 leading-tight">{currentCase.caseName}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto pr-2 scrollbar-thin">
            <div className="space-y-8">
              <section>
                <h5 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
                  <div className="h-1.5 w-1.5  bg-blue-500" /> Steps to Reproduce
                </h5>
                <div className="text-lg font-medium leading-relaxed text-gray-200 whitespace-pre-line">
                  {currentCase.testStep}
                </div>
              </section>
              {currentCase.preCondition && (
                <section>
                  <h5 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Pre-Condition</h5>
                  <p className="text-sm text-gray-400 italic">{currentCase.preCondition}</p>
                </section>
              )}
            </div>

            <div className="space-y-8">
              <section>
                <h5 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500 mb-3 flex items-center gap-2">
                  <div className="h-1.5 w-1.5  bg-emerald-500" /> Expected Result
                </h5>
                <div className="text-lg font-bold text-emerald-400/90 leading-relaxed">
                  {currentCase.expectedResult}
                </div>
              </section>

              <section className={cn("transition-all duration-150", showNotes ? "opacity-100" : "opacity-40 hover:opacity-100")}>
                <h5 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3 flex items-center justify-between">
                  Actual Result / Notes
                  <button onClick={() => setShowNotes(!showNotes)} className="text-[10px] hover:text-white transition">
                    {showNotes ? "Minimize" : "Expand"}
                  </button>
                </h5>
                <textarea
                  value={currentCase.actualResult || ""}
                  onChange={(e) => updateActual(e.target.value)}
                  placeholder="Type findings here..."
                  className="w-full h-24  bg-white/5 border border-white/10 p-4 text-sm outline-none focus:border-blue-500/50 transition resize-none"
                />
              </section>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 pb-8">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              className="h-14 w-14 flex items-center justify-center  bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-20"
            >
              <CaretLeft size={24} />
            </button>
            <button 
              onClick={() => setIndex(Math.min(items.length - 1, index + 1))}
              disabled={index === items.length - 1}
              className="h-14 w-14 flex items-center justify-center  bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-20"
            >
              <CaretRight size={24} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center gap-3">
            <button 
              onClick={() => updateStatus('Passed')}
              className={cn(
                "flex-1 h-16  flex items-center justify-center gap-3 text-lg font-bold transition-all ",
                currentCase.status === 'Passed' ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
              )}
            >
              <CheckCircle size={24} weight="bold" /> PASS
            </button>
            <button 
              onClick={() => updateStatus('Failed')}
              className={cn(
                "flex-1 h-16  flex items-center justify-center gap-3 text-lg font-bold transition-all ",
                currentCase.status === 'Failed' ? "bg-rose-500 text-white" : "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
              )}
            >
              <XCircle size={24} weight="bold" /> FAIL
            </button>
            <button 
              onClick={() => updateStatus('Blocked')}
              className={cn(
                "flex-1 h-16  flex items-center justify-center gap-3 text-lg font-bold transition-all ",
                currentCase.status === 'Blocked' ? "bg-amber-500 text-white" : "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
              )}
            >
              <Warning size={24} weight="bold" /> BLOCK
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-gray-500 text-[11px] font-bold">
            <div className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10">P</kbd> Pass</div>
            <div className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10">F</kbd> Fail</div>
            <div className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10">B</kbd> Block</div>
          </div>
        </div>
      </div>
    </div>
  );
}
