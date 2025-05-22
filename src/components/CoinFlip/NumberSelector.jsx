import React from 'react';
import { motion } from 'framer-motion';

const CoinOption = ({ coinSide, selected, onClick, disabled }) => {
  // Colors for different coin sides
  const coinColors = {
    heads: {
      bg: 'from-green-500 to-green-700',
      border: 'border-green-300',
      shadow: 'shadow-green-500/30',
      hoverBorder: 'hover:border-green-400',
      bgLight: 'bg-green-50',
      text: 'text-green-700',
    },
    tails: {
      bg: 'from-gray-400 to-gray-600',
      border: 'border-gray-300',
      shadow: 'shadow-gray-400/30',
      hoverBorder: 'hover:border-gray-400',
      bgLight: 'bg-gray-50',
      text: 'text-gray-700',
    },
  };

  const colors = coinSide === 'heads' ? coinColors.heads : coinColors.tails;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={!disabled && { scale: 1.05, y: -3 }}
      whileTap={!disabled && { scale: 0.95 }}
      animate={selected ? { y: -4 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={() => onClick(coinSide)}
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
        {coinSide === 'heads' ? 'Heads (1)' : 'Tails (2)'}
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
  const coinOptions = ['heads', 'tails'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-secondary-700 text-sm font-medium">
          Choose Coin Side:
        </label>
        {value && (
          <div className="text-sm font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-600 border border-green-500/30">
            Selected: {value === 'heads' ? 'Heads (1)' : 'Tails (2)'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {coinOptions.map(coinSide => (
          <CoinOption
            key={coinSide}
            coinSide={coinSide}
            selected={value === coinSide}
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
        Select either Heads (1) or Tails (2). If the coin flip matches your
        selection, you win!
      </motion.div>
    </div>
  );
};

export default NumberSelector;
