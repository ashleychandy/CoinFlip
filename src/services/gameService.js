class GameService {
  constructor() {
    this.CoinFlipContract = null;
  }

  // Initialize game service with contracts
  init(contracts) {
    if (!contracts) {
      throw new Error('Contracts object not provided');
    }

    // Handle different contract formats
    if (contracts.CoinFlip) {
      this.CoinFlipContract = contracts.CoinFlip;
    } else if (contracts.CoinFlipContract) {
      this.CoinFlipContract = contracts.CoinFlipContract;
    } else {
      throw new Error('CoinFlip contract not provided');
    }

    // Validate that the contract has the necessary methods
    if (
      !this.CoinFlipContract.playCoinFlip ||
      typeof this.CoinFlipContract.playCoinFlip !== 'function'
    ) {
      throw new Error('Invalid CoinFlip contract: missing playCoinFlip method');
    }

    // Add placeBet method to the CoinFlip contract for compatibility with the frontend
    // This adapts the playCoinFlip method of the contract to the placeBet method expected by the frontend
    if (!this.CoinFlipContract.placeBet) {
      this.CoinFlipContract.placeBet = function (
        chosenNumber,
        amount,
        options
      ) {
        return this.playCoinFlip(chosenNumber, amount, options);
      };
    }

    return this;
  }

  // Place a bet on the CoinFlip game
  async placeBet(chosenNumber, amount) {
    if (!this.CoinFlipContract) {
      throw new Error('CoinFlip contract not initialized');
    }

    if (!chosenNumber || chosenNumber < 1 || chosenNumber > 6) {
      throw new Error(
        'Invalid number selected. Choose a number between 1 and 6.'
      );
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid bet amount');
    }

    try {
      const tx = await this.CoinFlipContract.playCoinFlip(chosenNumber, amount);
      const receipt = await tx.wait();

      return {
        success: true,
        transaction: receipt,
      };
    } catch (error) {
      throw this.parseContractError(error);
    }
  }

  // Recovery and status logic is now handled by hooks (useGameStatus, useGameRecovery)
  // async recoverStuckGame() {
  //   ...
  // }

  // Parse contract errors
  parseContractError(error) {
    // Check for known error patterns
    const errorString = error.toString();

    if (errorString.includes('insufficient funds')) {
      return new Error('Insufficient funds to place this bet');
    }

    if (errorString.includes('user rejected')) {
      return new Error('Transaction rejected by user');
    }

    if (errorString.includes('Invalid chosen number')) {
      return new Error('Please choose a number between 1 and 6');
    }

    if (errorString.includes('Bet amount cannot be zero')) {
      return new Error('Bet amount cannot be zero');
    }

    if (errorString.includes('Bet amount too large')) {
      return new Error('Bet amount exceeds the maximum allowed');
    }

    if (errorString.includes('Token burn failed')) {
      return new Error('Failed to place bet. Token transfer issue.');
    }

    if (errorString.includes('InsufficientUserBalance')) {
      return new Error('Insufficient token balance');
    }

    if (errorString.includes('InsufficientAllowance')) {
      return new Error(
        'Insufficient token allowance. Please approve tokens first.'
      );
    }

    if (errorString.includes('execution reverted')) {
      return new Error('Transaction failed. Please try again.');
    }

    // Default error
    return new Error(
      'Failed to place bet: ' + (error.message || 'Unknown error')
    );
  }

  // Calculate potential payout
  calculatePotentialPayout(amount) {
    if (!amount) return BigInt(0);
    return amount * BigInt(2);
  }

  // Force stop game (admin only)
  async forceStopGame(playerAddress) {
    if (!this.CoinFlipContract) {
      throw new Error('CoinFlip contract not initialized');
    }

    try {
      const tx = await this.CoinFlipContract.forceStopGame(playerAddress);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      throw this.parseContractError(error);
    }
  }
}

export default new GameService();
