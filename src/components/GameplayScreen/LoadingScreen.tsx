import React from 'react';
import { Loader, AlertTriangle, CheckCircle } from 'lucide-react';

interface LoadingState {
  phase: 'initializing' | 'loading-song' | 'loading-soundfont' | 'ready' | 'error';
  message: string;
  progress: number;
  error?: string;
}

interface LoadingScreenProps {
  loadingState: LoadingState;
  onBack: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ loadingState, onBack }) => {
  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-auto p-8">
        {/* Loading Icon */}
        <div className="mb-6">
          {loadingState.phase === 'error' ? (
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
          ) : loadingState.phase === 'ready' ? (
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
          ) : (
            <Loader className="animate-spin w-16 h-16 text-blue-400 mx-auto" />
          )}
        </div>

        {/* Loading Message */}
        <h2 className="text-3xl font-bold mb-4">
          {loadingState.phase === 'error' ? 'Loading Failed' : 
           loadingState.phase === 'ready' ? 'Ready to Play!' : 
           'Loading Game...'}
        </h2>
        
        <p className="text-xl mb-6">{loadingState.message}</p>

        {/* Progress Bar */}
        {loadingState.phase !== 'error' && (
          <div className="w-full bg-white/20 rounded-full h-3 mb-4">
            <div 
              className="bg-blue-400 h-3 rounded-full transition-all duration-300"
              style={{ width: `${loadingState.progress}%` }}
            ></div>
          </div>
        )}

        {/* Error Details */}
        {loadingState.phase === 'error' && (
          <div className="mt-4 p-4 bg-red-900/50 rounded-lg border border-red-500/50">
            <p className="text-red-300 font-bold">Error Details:</p>
            <p className="text-red-200 text-sm">{loadingState.error}</p>
            <button
              onClick={onBack}
              className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              Return to Song Selection
            </button>
          </div>
        )}

        {/* Loading Phase Indicator */}
        <div className="mt-4 text-sm text-white/60">
          Phase: {loadingState.phase.replace('-', ' ').toUpperCase()}
        </div>
      </div>
    </div>
  );
};