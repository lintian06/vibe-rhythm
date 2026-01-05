import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { autoCorrelate, getNoteDetails, NOTE_STRINGS } from '../lib/audioUtils';

interface NoteVisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0 to 1
  color: string;
}

interface FlyingNote {
  id: number;
  noteName: string;
  octave: number;
  x: number; // Base x position
  y: number; // Current y position
  initialX: number;
  startTime: number;
  color: string;
  popped: boolean;
}

const NoteVisualizer: React.FC<NoteVisualizerProps> = ({ analyser, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const flyingNotesRef = useRef<FlyingNote[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const lastNoteTimeRef = useRef<number>(0);
  const lastNoteRef = useRef<string>("");

  // Violin Range roughly G3 (196Hz) to E7 (2637Hz)
  const MIN_NOTE = 55; // G3
  const MAX_NOTE = 96; // C7
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = 2048;
    const buffer = new Float32Array(bufferLength);

    const render = (time: number) => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      const now = Date.now();

      if (analyser) {
        analyser.getFloatTimeDomainData(buffer);
        const frequency = autoCorrelate(buffer, analyser.context.sampleRate);

        if (frequency !== -1) {
          const { noteName, octave, noteNum } = getNoteDetails(frequency);
          const fullNote = `${noteName}${octave}`;

          if (noteNum >= MIN_NOTE && noteNum <= MAX_NOTE) {
             if (fullNote !== lastNoteRef.current || now - lastNoteTimeRef.current > 200) {
                 const range = MAX_NOTE - MIN_NOTE;
                 const normalizedPos = (noteNum - MIN_NOTE) / range;
                 const hue = (noteNum % 12) * 30; 
                 const startX = normalizedPos * rect.width;

                 flyingNotesRef.current.push({
                     id: Math.random(),
                     noteName,
                     octave,
                     x: startX,
                     initialX: startX,
                     y: rect.height,
                     color: `hsl(${hue}, 90%, 60%)`,
                     startTime: now,
                     popped: false
                 });
                 
                 lastNoteRef.current = fullNote;
                 lastNoteTimeRef.current = now;
             }
          }
        }
      }

      // Update and Draw Notes
      flyingNotesRef.current = flyingNotesRef.current.filter(note => {
        const age = now - note.startTime;
        
        // Pop after 1 seconds (1000ms)
        if (age > 1000 && !note.popped) {
          note.popped = true;
          // Create sparks
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 2 + Math.random() * 2;
            sparksRef.current.push({
              x: note.x,
              y: note.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              color: note.color
            });
          }
          return false; // Remove note
        }
        return !note.popped && note.y > -50;
      });

      flyingNotesRef.current.forEach(note => {
          const age = now - note.startTime;
          
          // Upward movement
          note.y -= 1.5; 

          // Swing motion (Sine wave)
          // Amplitude increases slightly as it goes up? Or constant.
          // Frequency depends on time.
          const swing = Math.sin(age * 0.003) * 10; 
          note.x = note.initialX + swing;

          // Draw Bubble Note
          ctx.beginPath();
          ctx.arc(note.x, note.y, 20, 0, 2 * Math.PI);
          ctx.fillStyle = note.color;
          ctx.fill();
          
          // Bubble Highlight (Shiny spot)
          ctx.beginPath();
          ctx.arc(note.x - 6, note.y - 6, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.fill();

          // Glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = note.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Text
          ctx.fillStyle = "white";
          ctx.font = "bold 12px Inter";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${note.noteName}${note.octave}`, note.x, note.y);
      });

      // Update and Draw Sparks
      sparksRef.current = sparksRef.current.filter(spark => spark.life > 0);
      sparksRef.current.forEach(spark => {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.life -= 0.02; // Fade out

        ctx.globalAlpha = spark.life;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Draw "Strings" / Lanes at the bottom
      const laneHeight = 10;
      const range = MAX_NOTE - MIN_NOTE;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, rect.height - laneHeight, rect.width, laneHeight);

      for (let n = MIN_NOTE; n <= MAX_NOTE; n++) {
          if (n % 12 === 0) { // C notes
             const x = ((n - MIN_NOTE) / range) * rect.width;
             ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
             ctx.fillRect(x - 1, rect.height - 20, 2, 20);
             ctx.fillText(`C${Math.floor(n/12)-1}`, x, rect.height - 30);
          }
      }

      requestRef.current = requestAnimationFrame(() => render(performance.now()));
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      className={cn("w-full h-full pointer-events-none", className)}
    />
  );
};

export default NoteVisualizer;
