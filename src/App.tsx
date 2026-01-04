import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Activity, Music, AlertCircle } from 'lucide-react';
import { useAudio } from './hooks/useAudio';
import Visualizer from './components/Visualizer';

function App() {
  const { isListening, error, startListening, stopListening, analyser } = useAudio();
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = async () => {
    await startListening();
    setHasStarted(true);
  };

  const handleStop = () => {
    stopListening();
    setHasStarted(false);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-white overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Main Visualizer Layer */}
      <div className="absolute inset-0 z-0">
        <Visualizer analyser={analyser} />
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full p-8 pointer-events-none">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-2 mt-8"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
              <Music className="w-6 h-6 text-pink-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              Vibe Rhythm
            </h1>
          </div>
          <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">
            Real-time Audio Visualization
          </p>
        </motion.header>

        {/* Center Action Area (Only visible when not started) */}
        <AnimatePresence>
          {!hasStarted && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6 pointer-events-auto"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(236, 72, 153, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="group relative flex items-center justify-center w-32 h-32 rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl cursor-pointer overflow-hidden transition-colors hover:border-pink-500/50"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Mic className="w-10 h-10 text-zinc-300 group-hover:text-pink-400 transition-colors" />
                
                {/* Ripple Effect Rings */}
                <div className="absolute inset-0 rounded-full border border-pink-500/30 scale-110 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
              </motion.button>
              
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-white">Start Listening</h2>
                <p className="text-zinc-500 max-w-xs">
                  Allow microphone access to visualize the rhythm and tune of your environment.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Controls (Only visible when started) */}
        <AnimatePresence>
          {hasStarted && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="mb-8 pointer-events-auto"
            >
              <div className="flex items-center gap-4 p-2 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                <div className="flex items-center gap-3 px-4 py-2 border-r border-white/10">
                  <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-xs font-mono text-zinc-400">LIVE INPUT</span>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleStop}
                  className="p-3 rounded-full text-zinc-400 hover:text-red-400 transition-colors"
                  title="Stop Listening"
                >
                  <MicOff className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default App;
