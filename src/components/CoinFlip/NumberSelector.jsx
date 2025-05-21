import React from 'react';
import { motion } from 'framer-motion';

const CoinOption = ({ coinType, selected, onClick, disabled }) => {
  // Colors for different coin types
  const coinColors = {
    green: {
      bg: 'from-green-500 to-green-700',
      border: 'border-green-300',
      shadow: 'shadow-green-500/30',
      hoverBorder: 'hover:border-green-400',
      bgLight: 'bg-green-50',
      text: 'text-green-700',
    },
    white: {
      bg: 'from-gray-400 to-gray-600',
      border: 'border-gray-300',
      shadow: 'shadow-gray-400/30',
      hoverBorder: 'hover:border-gray-400',
      bgLight: 'bg-gray-50',
      text: 'text-gray-700',
    },
  };

  const colors = coinType === 'green' ? coinColors.green : coinColors.white;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={!disabled && { scale: 1.05, y: -3 }}
      whileTap={!disabled && { scale: 0.95 }}
      animate={selected ? { y: -4 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={() => onClick(coinType)}
      className={`
        relative w-full aspect-square rounded-xl
        flex items-center justify-center
        font-bold text-lg
        transition-all duration-300
        border-2
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${
          selected
            ? `bg-gradient-to-br ${colors.bg} text-white border-white shadow-lg ${colors.shadow}`
            : `${colors.bgLight} ${colors.text} border-gray-200 ${colors.hoverBorder}`
        }
      `}
    >
      {/* Coin display */}
      <span className="relative z-10">
        {coinType === 'green' ? 'Green Coin' : 'White Coin'}
      </span>

      {/* Glow effect when selected */}
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-white opacity-20"
          animate={{ opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
};

const NumberSelector = ({ value, onChange, disabled = false }) => {
  const coinOptions = ['green', 'white'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-secondary-700 text-sm font-medium">
          Choose Your Coin:
        </label>
        {value && (
          <div className="text-sm font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-600 border border-green-500/30">
            Selected: {value === 'green' ? 'Green Coin' : 'White Coin'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {coinOptions.map(coinType => (
          <CoinOption
            key={coinType}
            coinType={coinType}
            selected={value === coinType}
            onClick={onChange}
            disabled={disabled}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xs text-secondary-600"
      >
        Select either Green or White coin. If the coin flip matches your
        selection, you win!
      </motion.div>
    </div>
  );
};

export default NumberSelector;
