import React, { useState, useEffect } from "react";
import { CheckCircle, X } from "lucide-react";

const SuccessToast = ({ isVisible, message, onClose, duration = 5000 }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
                max-w-md w-full bg-green-50 border-2 border-green-200 rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out
                ${
                  isAnimating
                    ? "transform translate-x-0 opacity-100"
                    : "transform translate-x-full opacity-0"
                }
            `}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>

          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-green-800">{message}</p>
          </div>

          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-green-400 hover:text-green-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessToast;
