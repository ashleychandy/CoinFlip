import { motion } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';
import { useCoinFlipNumber } from '../../hooks/useCoinFlipNumber';
import { usePollingService } from '../../services/pollingService.jsx';

/**
 * Simplified CoinFlip Visualizer Component focused only on CoinFlip display
 */
const CoinFlipVisualizer = ({
  chosenNumber,
  isRolling = false,
  result = null,
}) => {
  const timeoutRefs = useRef([]);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const prevResultRef = useRef(null);
  const vrfStartTimeRef = useRef(null);
  const prevNumberRef = useRef(null);

  // Manage CoinFlip rolling state directly
  const [shouldRollCoinFlip, setShouldRollCoinFlip] = useState(false);

  // We now manage processing state internally rather than from the hook
  const [processingVrf, setProcessingVrf] = useState(false);

  // Use polling service to get current game status
  const { gameStatus } = usePollingService();

  // Use the custom hook to handle CoinFlip number state with error handling
  // Only using displayNumber from the hook now
  const { displayNumber } = useCoinFlipNumber(result, chosenNumber, isRolling);

  // Track number changes to trigger dot animations
  const [animationKey, setAnimationKey] = useState(0);

  // Reset animation key when display number changes
  useEffect(() => {
    if (displayNumber !== prevNumberRef.current && !shouldRollCoinFlip) {
      prevNumberRef.current = displayNumber;
      setAnimationKey(prevKey => prevKey + 1);
    }
  }, [displayNumber, shouldRollCoinFlip]);

  // Direct control of CoinFlip rolling
  useEffect(() => {
    // Start rolling
    if (isRolling && !result) {
      setShouldRollCoinFlip(true);
      setProcessingVrf(true);
    }

    // Stop rolling only when we have a conclusive result
    if (
      result &&
      ((result.rolledNumber >= 1 && result.rolledNumber <= 6) ||
        result.requestFulfilled === true ||
        result.vrfComplete === true)
    ) {
      setShouldRollCoinFlip(false);
      setProcessingVrf(false);
    }
    // For pending VRF results, keep processing state active
    else if (result && result.vrfPending) {
      setShouldRollCoinFlip(true);
      setProcessingVrf(true);
    }

    // Stop rolling when blockchain says request is processed
    if (gameStatus?.requestProcessed) {
      setShouldRollCoinFlip(false);
      setProcessingVrf(false);
    }
  }, [isRolling, processingVrf, result, gameStatus]);

  // Maximum animation duration of 10 seconds
  useEffect(() => {
    let maxDurationTimer;
    if (shouldRollCoinFlip) {
      // Force stop the CoinFlip roll after 10 seconds maximum
      maxDurationTimer = setTimeout(() => {
        setShouldRollCoinFlip(false);
        setProcessingVrf(false);
      }, 10000);
    }

    return () => {
      if (maxDurationTimer) {
        clearTimeout(maxDurationTimer);
      }
    };
  }, [shouldRollCoinFlip]);

  // Check contract state on component load to maintain VRF status
  useEffect(() => {
    // If there's an active game with a pending request, show VRF processing
    if (
      gameStatus?.isActive &&
      gameStatus?.requestExists &&
      !gameStatus?.requestProcessed
    ) {
      setProcessingVrf(true);
      setShouldRollCoinFlip(true);

      // Set the start time to the game's timestamp if available, or current time
      if (!vrfStartTimeRef.current && gameStatus?.lastPlayTimestamp) {
        const startTime = gameStatus.lastPlayTimestamp * 1000;
        vrfStartTimeRef.current = startTime;
      }
    } else if (gameStatus?.requestProcessed) {
      // If blockchain says request is processed, stop processing and rolling
      setProcessingVrf(false);
      setShouldRollCoinFlip(false);
    }
  }, [gameStatus]);

  // Keep track of last result to avoid re-rendering issues
  useEffect(() => {
    if (
      result &&
      JSON.stringify(result) !== JSON.stringify(prevResultRef.current)
    ) {
      prevResultRef.current = result;
      // When we get a new result, stop rolling
      setShouldRollCoinFlip(false);
    }
  }, [result]);

  // Cleanup on unmount
  useEffect(() => {
    // Clear all timeouts
    const clearAllTimeouts = () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };

    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Error handling for any potential rendering issues
  useEffect(() => {
    try {
      // Validate displayNumber is either 1 (HEADS) or 2 (TAILS)
      if (
        displayNumber &&
        (displayNumber < 1 || displayNumber > 2 || isNaN(displayNumber))
      ) {
        setHasError(true);
        setErrorMessage(`Invalid Coin side: ${displayNumber}`);
      } else {
        // Reset error state if everything is valid
        setHasError(false);
        setErrorMessage('');
      }
    } catch (error) {
      setHasError(true);
      setErrorMessage(error.message || 'Error rendering Coin');
    }
  }, [displayNumber]);

  // Function to render a coin face with appropriate styling
  const renderCoinFace = side => {
    const isHeads = side === 1;

    return (
      <motion.div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: isHeads ? '#22AD74' : '#f0f0f0',
          boxShadow: `0 0 10px ${isHeads ? 'rgba(34, 173, 116, 0.4)' : 'rgba(0,0,0,0.2)'}`,
          border: `4px solid ${isHeads ? '#1a8e5e' : '#dedede'}`,
        }}
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{
          rotateY: 0,
          opacity: 1,
          scale: [0.8, 1.05, 1],
        }}
        transition={{
          type: 'spring',
          stiffness: 150,
          damping: 15,
        }}
      >
        <div className="text-center">
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: isHeads ? 'white' : '#555' }}
          >
            {isHeads ? 'HEADS' : 'TAILS'}
          </div>
          <div
            className="text-sm"
            style={{ color: isHeads ? 'rgba(255,255,255,0.8)' : '#777' }}
          >
            {isHeads ? '(1)' : '(2)'}
          </div>
        </div>
      </motion.div>
    );
  };

  // Function to render the coin based on current state
  const renderCoin = number => {
    // Default to 1 for invalid numbers to prevent UI errors
    const safeSide = number >= 1 && number <= 2 ? number : 1;

    return renderCoinFace(safeSide);
  };

  // Rolling animation variants
  const rollingVariants = {
    rolling: {
      rotateX: [0, 180, 360, 540, 720, 900, 1080],
      scale: [1, 0.9, 1.05, 0.95, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
        repeatType: 'loop',
      },
    },
    static: {
      rotateX: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.3,
      },
    },
  };

  // Fallback UI for error state
  if (hasError) {
    return (
      <div className="coin-container flex items-center justify-center bg-red-100 border border-red-300 rounded-lg p-4">
        <div className="text-red-700 text-center">
          <p className="font-medium">Error displaying Coin</p>
          <p className="text-sm">{errorMessage || 'Please try again'}</p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      {/* Main Coin */}
      <motion.div
        className="relative w-40 h-40 rounded-full"
        variants={rollingVariants}
        animate={shouldRollCoinFlip ? 'rolling' : 'static'}
        data-rolling={shouldRollCoinFlip ? 'true' : 'false'}
      >
        {renderCoin(displayNumber)}
      </motion.div>

      {shouldRollCoinFlip && (
        <div className="mt-6 text-center text-sm text-secondary-600">
          Flipping coin...
        </div>
      )}
    </div>
  );
};

export default CoinFlipVisualizer;
