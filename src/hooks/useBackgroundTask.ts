import { useState, useEffect, useRef } from 'react';

export interface BackgroundTaskOptions {
    onProgress?: (progress: number) => void;
    onComplete?: (result: any) => void;
    onError?: (error: Error) => void;
}

export interface BackgroundTaskState {
    isRunning: boolean;
    progress: number;
    result: any | null;
    error: Error | null;
}

/**
 * Hook for managing background tasks with progress tracking
 * Allows tasks to continue even when user navigates away
 */
export const useBackgroundTask = (taskName: string, options: BackgroundTaskOptions = {}) => {
    const [state, setState] = useState<BackgroundTaskState>({
        isRunning: false,
        progress: 0,
        result: null,
        error: null
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    // Load saved state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem(`bg_task_${taskName}`);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                setState(parsed);
                if (parsed.result && options.onComplete) {
                    options.onComplete(parsed.result);
                }
            } catch (e) {
                console.error('Failed to load saved task state:', e);
            }
        }
    }, [taskName]);

    // Save state to localStorage when it changes
    useEffect(() => {
        if (state.result || state.error) {
            localStorage.setItem(`bg_task_${taskName}`, JSON.stringify(state));
        }
    }, [state, taskName]);

    const startTask = async <T,>(taskFn: (signal: AbortSignal) => Promise<T>) => {
        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setState({
            isRunning: true,
            progress: 0,
            result: null,
            error: null
        });

        try {
            const result = await taskFn(abortControllerRef.current.signal);

            setState({
                isRunning: false,
                progress: 100,
                result,
                error: null
            });

            if (options.onComplete) {
                options.onComplete(result);
            }

            return result;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Task was cancelled, don't update state
                return null;
            }

            const err = error instanceof Error ? error : new Error(String(error));
            setState({
                isRunning: false,
                progress: 0,
                result: null,
                error: err
            });

            if (options.onError) {
                options.onError(err);
            }

            throw error;
        }
    };

    const updateProgress = (progress: number) => {
        setState(prev => ({ ...prev, progress }));
        if (options.onProgress) {
            options.onProgress(progress);
        }
    };

    const cancelTask = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setState({
                isRunning: false,
                progress: 0,
                result: null,
                error: null
            });
        }
    };

    const clearTask = () => {
        localStorage.removeItem(`bg_task_${taskName}`);
        setState({
            isRunning: false,
            progress: 0,
            result: null,
            error: null
        });
    };

    return {
        ...state,
        startTask,
        updateProgress,
        cancelTask,
        clearTask
    };
};
