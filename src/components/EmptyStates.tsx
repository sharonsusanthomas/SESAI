import React from 'react';
import { Upload, FileText, BookOpen, GraduationCap, Sparkles } from 'lucide-react';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    illustration?: 'upload' | 'notes' | 'quiz' | 'analytics' | 'generic';
}

const illustrations = {
    upload: '📚',
    notes: '📝',
    quiz: '🎯',
    analytics: '📊',
    generic: '✨'
};

/**
 * Improved empty state component with helpful CTAs
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    illustration = 'generic'
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            {/* Illustration */}
            <div className="text-7xl mb-6 animate-bounce-slow">
                {illustrations[illustration]}
            </div>

            {/* Icon */}
            {icon && (
                <div className="mb-4 p-4 bg-blue-50 rounded-full text-blue-600">
                    {icon}
                </div>
            )}

            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {title}
            </h3>

            {/* Description */}
            <p className="text-gray-500 max-w-md mb-8">
                {description}
            </p>

            {/* Action Button */}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                    <Sparkles size={18} />
                    {action.label}
                </button>
            )}

            {/* Helper Text */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md">
                <p className="text-xs text-gray-600">
                    💡 <strong>Tip:</strong> You can drag and drop files to upload them quickly!
                </p>
            </div>
        </div>
    );
};

/**
 * Specific empty state variants for common scenarios
 */
export const NoMaterialsEmptyState: React.FC<{ onUpload: () => void }> = ({ onUpload }) => (
    <EmptyState
        illustration="upload"
        icon={<Upload size={24} />}
        title="No Materials Yet"
        description="Upload your first study material to unlock AI-powered notes, quizzes, and personalized tutoring."
        action={{
            label: "Upload Your First Material",
            onClick: onUpload
        }}
    />
);

export const NoNotesEmptyState: React.FC<{ onGenerate: () => void }> = ({ onGenerate }) => (
    <EmptyState
        illustration="notes"
        icon={<FileText size={24} />}
        title="No Smart Notes Yet"
        description="Generate AI-powered structured notes from your study materials with summaries, key points, and mind maps."
        action={{
            label: "Generate Smart Notes",
            onClick: onGenerate
        }}
    />
);

export const NoQuizzesEmptyState: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <EmptyState
        illustration="quiz"
        icon={<GraduationCap size={24} />}
        title="No Quizzes Taken Yet"
        description="Test your knowledge with AI-generated quizzes tailored to your study materials and difficulty level."
        action={{
            label: "Start Your First Quiz",
            onClick: onStart
        }}
    />
);

export const NoAnalyticsEmptyState: React.FC = () => (
    <EmptyState
        illustration="analytics"
        title="No Data Yet"
        description="Complete some quizzes and study sessions to see your progress and analytics here."
    />
);

export const SearchEmptyState: React.FC<{ query: string }> = ({ query }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No results for "{query}"
        </h3>
        <p className="text-gray-500 max-w-md">
            Try adjusting your search terms or browse all materials below.
        </p>
    </div>
);
