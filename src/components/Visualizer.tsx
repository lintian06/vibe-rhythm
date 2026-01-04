import React, { useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Data buffers
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);
    const waveArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!analyser) {
        // Idle animation or blank state
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Draw a subtle "waiting" circle
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(waveArray);

      ctx.clearRect(0, 0, rect.width, rect.height);
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(centerX, centerY) * 0.4; // Base radius

      // 1. Calculate Bass (Low Frequencies) for Pulse
      // Frequencies 0-10 roughly cover the sub-bass/bass range in a 2048 FFT
      let bassSum = 0;
      const bassRange = 20; 
      for (let i = 0; i < bassRange; i++) {
        bassSum += dataArray[i];
      }
      const bassAverage = bassSum / bassRange;
      const pulseScale = 1 + (bassAverage / 255) * 0.5; // Scale 1.0 to 1.5

      // 2. Draw Center Glow/Pulse
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * pulseScale * 1.2);
      gradient.addColorStop(0, `rgba(255, 0, 128, ${bassAverage / 255})`); // Magenta core
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * pulseScale * 1.5, 0, 2 * Math.PI);
      ctx.fill();

      // 3. Draw Circular Frequency Bars
      const bars = 120; // Number of bars to draw
      const step = Math.floor(bufferLength / bars); // Skip frequencies to fit
      const angleStep = (2 * Math.PI) / bars;

      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      for (let i = 0; i < bars; i++) {
        const dataIndex = i * step;
        // Use a logarithmic scale for height or just linear for simplicity
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * (Math.min(centerX, centerY) * 0.5);
        
        // Color based on frequency/index
        const hue = (i / bars) * 360; 
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;

        const angle = i * angleStep - Math.PI / 2; // Start from top
        
        // Inner point (on the circle)
        const x1 = centerX + Math.cos(angle) * (radius * pulseScale);
        const y1 = centerY + Math.sin(angle) * (radius * pulseScale);
        
        // Outer point
        const x2 = centerX + Math.cos(angle) * (radius * pulseScale + barHeight + 10);
        const y2 = centerY + Math.sin(angle) * (radius * pulseScale + barHeight + 10);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 4. Draw Waveform Ring (Subtle inner ring)
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < bars; i++) {
          const angle = i * angleStep - Math.PI / 2;
          // Map 0-255 to -1 to 1 range roughly
          const v = waveArray[i * step] / 128.0; 
          const waveRadius = (radius * 0.8) * v; // Modulate radius
          
          const x = centerX + Math.cos(angle) * waveRadius;
          const y = centerY + Math.sin(angle) * waveRadius;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      className={cn("w-full h-full", className)}
    />
  );
};

export default Visualizer;
