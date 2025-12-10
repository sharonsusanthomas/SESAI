import React from 'react';
import { Loader2, CheckCircle, XCircle, X } from 'lucide-react';

export interface ProgressNotificationProps {
    taskName: string;
    progress: number;
    isRunning: boolean;
    error: Error | null;
    result: any | null;
    onDismiss: () => void;
}

/**
 * Floating progress notification component
 * Shows in bottom-right corner during background tasks
 */
export const ProgressNotification: React.FC<ProgressNotificationProps> = ({
    taskName,
    progress,
    isRunning,
    error,
    result,
    onDismiss
}) => {
    if (!isRunning && !result && !error) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[320px] max-w-md">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {isRunning && <Loader2 className="animate-spin text-blue-600" size={20} />}
                        {result && <CheckCircle className="text-green-600" size={20} />}
                        {error && <XCircle className="text-red-600" size={20} />}
                        <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{taskName}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {isRunning && 'Processing...'}
                                {result && 'Completed successfully'}
                                {error && 'Failed'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {isRunning && (
                    <div className="space-y-2">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-600 text-right">{Math.round(progress)}%</p>
                    </div>
                )}

                {error && (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-700">{error.message}</p>
                    </div>
                )}

                {result && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-700">Task completed! You can now view the results.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Add animation to index.css
export const progressNotificationStyles = `
@keyframes slide-up {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
`;
