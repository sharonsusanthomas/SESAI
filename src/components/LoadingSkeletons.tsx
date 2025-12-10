import React from 'react';

/**
 * Loading skeleton components for better perceived performance
 */

export const MaterialCardSkeleton: React.FC = () => (
    <div className="bg-white border rounded-lg p-5 animate-pulse">
        <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-2 mb-4">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
        </div>
        <div className="h-9 bg-gray-200 rounded w-full"></div>
    </div>
);

export const NotesCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl shadow-sm border p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
    </div>
);

export const QuizQuestionSkeleton: React.FC = () => (
    <div className="bg-white p-8 rounded-xl shadow-lg border animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
            ))}
        </div>
    </div>
);

export const AnalyticsCardSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border animate-pulse">
        <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
);

export const TableRowSkeleton: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
    </tr>
);

interface SkeletonGridProps {
    count?: number;
    type?: 'material' | 'notes' | 'analytics';
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ count = 3, type = 'material' }) => {
    const SkeletonComponent =
        type === 'material' ? MaterialCardSkeleton :
            type === 'notes' ? NotesCardSkeleton :
                AnalyticsCardSkeleton;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonComponent key={i} />
            ))}
        </div>
    );
};
