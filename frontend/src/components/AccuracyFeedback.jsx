import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckIcon, XMarkIcon, BookmarkIcon } from '@heroicons/react/24/outline';

export function AccuracyFeedback({ 
  userMessage, 
  assistantMessage, 
  onSaveToLibrary,
  onMarkInaccurate,
  isLoading = false,
  isSaved = false 
}) {
  const [feedback, setFeedback] = useState(null); // null, 'accurate', 'inaccurate'

  const handleAccurate = async () => {
    setFeedback('accurate');
    try {
      await onSaveToLibrary(userMessage, assistantMessage);
    } catch (error) {
      console.error('Error saving to library:', error);
      setFeedback(null); // Reset on error
    }
  };

  const handleInaccurate = () => {
    setFeedback('inaccurate');
    onMarkInaccurate?.(userMessage, assistantMessage);
  };

  // If already saved, show saved status but don't show feedback buttons
  if (isSaved) {
    return (
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <BookmarkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Saved to Library</span>
        </div>
      </div>
    );
  }

  if (feedback === 'accurate') {
    return (
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <CheckIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isLoading ? 'Saving to library...' : 'Saved to library successfully!'}
          </span>
        </div>
      </div>
    );
  }

  if (feedback === 'inaccurate') {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <XMarkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Thank you for the feedback!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-600">Was this information accurate and helpful?</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAccurate}
            disabled={isLoading}
            className="flex items-center gap-1 text-green-700 border-green-300 hover:bg-green-50"
          >
            <CheckIcon className="w-3 h-3" />
            Yes, save to library
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleInaccurate}
            disabled={isLoading}
            className="flex items-center gap-1 text-red-700 border-red-300 hover:bg-red-50"
          >
            <XMarkIcon className="w-3 h-3" />
            No, inaccurate
          </Button>
        </div>
      </div>
    </div>
  );
}
