import React from 'react';

// Spinning loader component
export const Spinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

// Full-screen loading overlay
export const LoadingOverlay: React.FC<{ 
  message?: string;
  transparent?: boolean;
}> = ({ message = 'Loading...', transparent = false }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${
    transparent ? 'bg-black bg-opacity-30' : 'bg-white'
  }`}>
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  </div>
);

// Inline loading state
export const InlineLoading: React.FC<{ 
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ message = 'Loading...', size = 'md' }) => (
  <div className="flex items-center justify-center py-8">
    <Spinner size={size} className="mr-3" />
    <span className="text-gray-600">{message}</span>
  </div>
);

// Button loading state
export const ButtonLoading: React.FC<{ 
  size?: 'sm' | 'md';
}> = ({ size = 'sm' }) => (
  <Spinner 
    size={size} 
    className="border-white border-t-transparent"
  />
);

// Skeleton loading components
export const SkeletonLine: React.FC<{
  width?: string;
  height?: string;
  className?: string;
}> = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${width} ${height} ${className}`}></div>
);

export const SkeletonCircle: React.FC<{
  size?: string;
  className?: string;
}> = ({ size = 'h-10 w-10', className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-full ${size} ${className}`}></div>
);

export const SkeletonCard: React.FC = () => (
  <div className="p-4 border border-gray-200 rounded-lg">
    <div className="animate-pulse">
      <div className="flex items-center mb-4">
        <SkeletonCircle className="mr-3" />
        <div className="flex-1">
          <SkeletonLine width="w-1/3" className="mb-2" />
          <SkeletonLine width="w-1/2" height="h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonLine />
        <SkeletonLine width="w-5/6" />
        <SkeletonLine width="w-3/4" />
      </div>
    </div>
  </div>
);

// Table skeleton
export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonLine key={i} height="h-6" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonLine key={colIndex} />
        ))}
      </div>
    ))}
  </div>
);

// List skeleton
export const SkeletonList: React.FC<{
  items?: number;
}> = ({ items = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <SkeletonCircle size="h-8 w-8" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-1/3" />
          <SkeletonLine width="w-2/3" height="h-3" />
        </div>
      </div>
    ))}
  </div>
);

// Dashboard skeleton
export const SkeletonDashboard: React.FC = () => (
  <div className="space-y-6">
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg">
          <div className="animate-pulse">
            <SkeletonLine width="w-1/2" height="h-6" className="mb-2" />
            <SkeletonLine width="w-1/3" height="h-8" />
          </div>
        </div>
      ))}
    </div>

    {/* Main content area */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonCard />
      </div>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonList items={3} />
      </div>
    </div>
  </div>
);

// Loading wrapper component that shows skeleton while loading
export const LoadingWrapper: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
}> = ({ loading, children, skeleton, error, onRetry }) => {
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return skeleton ? <>{skeleton}</> : <InlineLoading />;
  }

  return <>{children}</>;
};