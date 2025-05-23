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
        className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #4ade80 0%, #22c55e 80%, #16a34a 100%)',
          boxShadow:
            '0 8px 32px rgba(34, 197, 94, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.05)',
          border: '4px solid #16a34a',
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        }}
        initial={false}
        animate={{
          rotateY: 0,
          opacity: 1,
          scale: 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 80,
          damping: 20,
        }}
      >
        {/* Matte overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.03) 100%)',
            borderRadius: '50%',
          }}
        />

        {/* Letter H or T */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative z-10"
        >
          <div
            className="text-7xl font-bold"
            style={{
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              letterSpacing: '0.05em',
            }}
          >
            {isHeads ? 'H' : 'T'}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Function to render both sides of the coin for smooth transition
  const renderCoin = number => {
    const safeSide = number >= 1 && number <= 2 ? number : 1;

    return (
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: safeSide === 1 ? 0 : 180 }}
        transition={{
          type: 'spring',
          stiffness: 50,
          damping: 20,
          mass: 1,
        }}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        }}
      >
        {/* Heads side */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {renderCoinFace(1)}
        </div>
        {/* Tails side */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {renderCoinFace(2)}
        </div>
      </motion.div>
    );
  };

  // Rolling animation variants with improved physics
  const rollingVariants = {
    rolling: {
      rotateX: [0, 180, 360, 540, 720, 900, 1080],
      scale: [1, 0.95, 1.02, 0.98, 1],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: [0.45, 0, 0.55, 1],
        repeatType: 'loop',
      },
    },
    static: {
      rotateX: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 25,
        mass: 1,
        duration: 0.5,
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
        className="relative w-48 h-48 rounded-full"
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
