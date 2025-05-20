import { useState, useEffect, useCallback } from 'react';
import { useContractConstants } from './useContractConstants.js';
import { usePollingService } from '../services/pollingService.jsx';

/**
 * Simplified custom hook to manage CoinFlip number display
 *
 * @param {Object|null} result - The game result object
 * @param {Number|null} chosenNumber - The number chosen by the player
 * @param {Boolean} isRolling - Whether the CoinFlip is currently rolling
 * @returns {Object} - The CoinFlip number to display
 */
export const useCoinFlipNumber = (result, chosenNumber, isRolling) => {
  const { constants } = useContractConstants();
  const { gameStatus } = usePollingService();

  // State for CoinFlip number management
  const [randomCoinFlipNumber, setRandomCoinFlipNumber] = useState(1);
  const [rolledNumber, setRolledNumber] = useState(null);
  const [lastRolledNumber, setLastRolledNumber] = useState(null);

  // Initialize state from game status on component mount
  useEffect(() => {
    if (gameStatus && gameStatus.isActive) {
      // If we have a chosen number from contract, update state
      if (gameStatus.chosenNumber) {
        // Store the chosen number as the last rolled number if we don't have a result yet
        setLastRolledNumber(gameStatus.chosenNumber);
      }
    }
  }, [gameStatus]);

  // Get random CoinFlip number within valid range
  const getRandomCoinFlipNumber = useCallback(
    () =>
      Math.floor(
        Math.random() *
          (constants.MAX_CoinFlip_NUMBER - constants.MIN_CoinFlip_NUMBER + 1)
      ) + constants.MIN_CoinFlip_NUMBER,
    [constants]
  );

  // Update random CoinFlip number when rolling
  useEffect(() => {
    let intervalId;
    let timeoutId;

    if (isRolling && !rolledNumber) {
      // Create a rolling effect by changing the number rapidly
      intervalId = setInterval(() => {
        setRandomCoinFlipNumber(getRandomCoinFlipNumber());
      }, 150); // Change number every 150ms for a realistic rolling effect

      // Automatically stop rolling after 15 seconds
      timeoutId = setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      }, 15000); // 15 seconds maximum
    }

    // Clean up interval and timeout
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isRolling, rolledNumber, getRandomCoinFlipNumber]);

  // Handle the result when it arrives
  useEffect(() => {
    if (result) {
      // Extract the correct number from the result object
      let resultNumber = null;

      if (result.rolledNumber !== undefined) {
        resultNumber =
          typeof result.rolledNumber === 'string'
            ? parseInt(result.rolledNumber, 10)
            : Number(result.rolledNumber);
      } else if (result.number !== undefined) {
        resultNumber =
          typeof result.number === 'string'
            ? parseInt(result.number, 10)
            : Number(result.number);
      } else if (typeof result === 'number') {
        resultNumber = result;
      }

      // Validate the result number is not NaN
      if (isNaN(resultNumber)) {
        resultNumber = null;
      }

      // Only update the rolled number if we have a valid result
      if (resultNumber !== null) {
        setRolledNumber(resultNumber);
      }

      // Store the last valid rolled number (1-6)
      if (
        resultNumber >= constants.MIN_CoinFlip_NUMBER &&
        resultNumber <= constants.MAX_CoinFlip_NUMBER
      ) {
        setLastRolledNumber(resultNumber);
      }
    } else {
      // Reset state when no result, but keep lastRolledNumber
      setRolledNumber(null);
    }
  }, [result, constants]);

  // Function to get the number to display on the CoinFlip
  const getDisplayNumber = () => {
    // If we have a result, show the actual rolled number
    if (rolledNumber !== null) {
      // If special result (254 or 255), show a default face or last rolled
      if (
        rolledNumber === constants.RESULT_RECOVERED ||
        rolledNumber === constants.RESULT_FORCE_STOPPED
      ) {
        // For special results, use the last valid CoinFlip number or default to 1
        return lastRolledNumber || constants.MIN_CoinFlip_NUMBER;
      }

      // Make sure we only return valid CoinFlip numbers (1-6)
      if (
        rolledNumber >= constants.MIN_CoinFlip_NUMBER &&
        rolledNumber <= constants.MAX_CoinFlip_NUMBER
      ) {
        return rolledNumber;
      }

      // For any other invalid number, show last valid roll or chosen number
      if (
        lastRolledNumber >= constants.MIN_CoinFlip_NUMBER &&
        lastRolledNumber <= constants.MAX_CoinFlip_NUMBER
      ) {
        return lastRolledNumber;
      }

      if (
        chosenNumber >= constants.MIN_CoinFlip_NUMBER &&
        chosenNumber <= constants.MAX_CoinFlip_NUMBER
      ) {
        return chosenNumber;
      }

      // Last resort - show minimum number
      return constants.MIN_CoinFlip_NUMBER;
    }

    // If rolling but no result yet, show random number
    if (isRolling) {
      return randomCoinFlipNumber;
    }

    // If we have a previous roll, show that number if it's valid
    if (
      lastRolledNumber >= constants.MIN_CoinFlip_NUMBER &&
      lastRolledNumber <= constants.MAX_CoinFlip_NUMBER
    ) {
      return lastRolledNumber;
    }

    // If we have a chosen number, show that if it's valid
    if (
      chosenNumber >= constants.MIN_CoinFlip_NUMBER &&
      chosenNumber <= constants.MAX_CoinFlip_NUMBER
    ) {
      return chosenNumber;
    }

    // Default to minimum number
    return constants.MIN_CoinFlip_NUMBER;
  };

  return {
    // Only return the display number, everything else is now managed by the component
    displayNumber: getDisplayNumber(),
  };
};
