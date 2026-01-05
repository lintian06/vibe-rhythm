import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { autoCorrelate, getNoteDetails, NOTE_STRINGS } from '../lib/audioUtils';

interface NoteVisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
}

interface FlyingNote {
  id: number;
  noteName: string;
  octave: number;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage (starts at 100, moves to 0)
  color: string;
  timestamp: number;
}

const NoteVisualizer: React.FC<NoteVisualizerProps> = ({ analyser, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const flyingNotesRef = useRef<FlyingNote[]>([]);
  const lastNoteTimeRef = useRef<number>(0);
  const lastNoteRef = useRef<string>("");

  // Violin Range roughly G3 (196Hz) to E7 (2637Hz)
  // We'll map G3 to left, E7 to right? Or just a standard range.
  // Let's do a chromatic mapping from G3 (MIDI 55) to C7 (MIDI 96)
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

      if (analyser) {
        analyser.getFloatTimeDomainData(buffer);
        const frequency = autoCorrelate(buffer, analyser.context.sampleRate);

        if (frequency !== -1) {
          const { noteName, octave, noteNum } = getNoteDetails(frequency);
          const fullNote = `${noteName}${octave}`;

          // Debounce and threshold
          // Only spawn if it's been a little bit or note changed
          // And if note is within our visual range
          if (noteNum >= MIN_NOTE && noteNum <= MAX_NOTE) {
             const now = Date.now();
             if (fullNote !== lastNoteRef.current || now - lastNoteTimeRef.current > 200) {
                 // Spawn new note
                 const range = MAX_NOTE - MIN_NOTE;
                 const normalizedPos = (noteNum - MIN_NOTE) / range;
                 
                 // Color based on note name (12 colors)
                 const hue = (noteNum % 12) * 30; 
                 
                 flyingNotesRef.current.push({
                     id: Math.random(),
                     noteName,
                     octave,
                     x: normalizedPos * rect.width,
                     y: rect.height,
                     color: `hsl(${hue}, 90%, 60%)`,
                     timestamp: now
                 });
                 
                 lastNoteRef.current = fullNote;
                 lastNoteTimeRef.current = now;
             }
          }
        }
      }

      // Update and Draw Notes
      // Remove notes that are off screen
      flyingNotesRef.current = flyingNotesRef.current.filter(n => n.y > -50);

      flyingNotesRef.current.forEach(note => {
          note.y -= 2; // Speed of ascent

          ctx.beginPath();
          ctx.arc(note.x, note.y, 20, 0, 2 * Math.PI);
          ctx.fillStyle = note.color;
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

      // Draw "Strings" / Lanes at the bottom
      const laneHeight = 10;
      const range = MAX_NOTE - MIN_NOTE;
      
      // Draw a line for the "fretboard" or base
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, rect.height - laneHeight, rect.width, laneHeight);

      // Draw markers for C notes to help orient
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
