// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "lib/contractsv2/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "lib/contractsv2/src/v0.8/VRFConsumerBaseV2.sol";

/**
 * @title IERC20
 * @dev ERC20 interface for token interactions
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function mint(address account, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function getRemainingMintable() external view returns (uint256);
}

/**
 * @title Game State Structure
 * @dev Tracks current game status with storage-optimized data types
 */
struct GameState {
    bool isActive;
    bool completed;
    uint8 chosenSide;
    uint8 result;
    uint256 amount;
    uint256 payout;
}

/**
 * @title Bet History Structure
 * @dev Records individual bet data with optimized storage
 */
struct BetHistory {
    uint8 chosenSide;
    uint8 flippedResult;
    uint32 timestamp;
    uint256 amount;
    uint256 payout;
}

/**
 * @title User Data Structure
 * @dev Maintains game state and bet history for each player
 */
struct UserData {
    GameState currentGame;
    uint256 currentRequestId;
    BetHistory[] recentBets;
    uint32 lastPlayedTimestamp;
    uint256 lastPlayedBlock;
    uint8 historyIndex;
    bool requestFulfilled;
    // Two-phase resolution fields:
    // Set by fulfillRandomWords, consumed by resolveGame.
    bool pendingResolution;
    uint256 pendingRandomWord;
}

/**
 * @title Flip
 * @dev Provably fair flip game using VRF for randomness.
 *
 *      Gas optimisation - two-phase resolution:
 *        Phase 1  flipCoin()           - burns tokens, requests VRF
 *        Phase 2  fulfillRandomWords() - stores random word, sets flag (~25k gas)
 *        Phase 3  resolveGame()        - computes result, mints payout, updates history
 *
 *      fulfillRandomWords is kept deliberately minimal so it always fits
 *      inside the VRF callback gas limit regardless of bet history depth.
 *      resolveGame can be called by the player, a keeper, or any address.
 */
contract Flip is ReentrancyGuard, Pausable, VRFConsumerBaseV2, Ownable {

    // ============ Events ============
    event BetPlaced(address indexed player, uint256 requestId, uint8 chosenSide, uint256 amount);
    event GameCompleted(address indexed player, uint256 requestId, uint8 result, uint256 payout);
    event GameRecovered(address indexed player, uint256 requestId, uint256 refundAmount);
    // VRF configuration change events
    event VRFSubscriptionIdUpdated(uint64 oldId, uint64 newId);
    event VRFKeyHashUpdated(bytes32 oldKeyHash, bytes32 newKeyHash);
    event VRFCallbackGasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event VRFRequestConfirmationsUpdated(uint16 oldConfirmations, uint16 newConfirmations);
    event VRFNumWordsUpdated(uint8 oldNumWords, uint8 newNumWords);

    // ============ Custom Errors ============
    error InvalidBetParameters(string reason);
    error InsufficientUserBalance(uint256 required, uint256 available);
    error TransferFailed(address from, address to, uint256 amount);
    error BurnFailed(address account, uint256 amount);
    error MintFailed(address account, uint256 amount);
    error PayoutCalculationError(string message);
    error InsufficientAllowance(uint256 required, uint256 allowed);
    error GameError(string reason);
    error VRFError(string reason);
    error MaxPayoutExceeded(uint256 potentialPayout, uint256 maxAllowed);

    // ============ Constants ============
    uint8 public constant HEADS = 1;
    uint8 public constant TAILS = 2;
    uint8 private constant MAX_SIDES = 2;
    uint8 public constant MAX_HISTORY_SIZE = 10;
    uint256 public constant MAX_BET_AMOUNT = 10_000_000 * 10**18;
    uint256 public constant MAX_POSSIBLE_PAYOUT = 20_000_000 * 10**18; // 10M * 2
    uint32 private constant GAME_TIMEOUT = 1 hours;
    uint256 private constant BLOCK_THRESHOLD = 300;

    // Special result values
    uint8 public constant RESULT_FORCE_STOPPED = 254;
    uint8 public constant RESULT_RECOVERED = 255;

    // ============ State Variables ============
    IERC20 public immutable gamaToken;
    mapping(address => UserData) private userData;

    // Active players tracking for Chainlink Automation pagination
    address[] public activePlayers;
    mapping(address => uint256) public activePlayerIndex; // 1-based index into activePlayers
    mapping(address => bool) public isActivePlayer;

    // Game Statistics
    uint256 public totalGamesPlayed;
    uint256 public totalPayoutAmount;
    uint256 public totalWageredAmount;

    // VRF Variables (admin-updatable)
    // Note: the VRFConsumerBaseV2 stores the coordinator address immutably
    // in its own constructor; changing the coordinator address post-deploy
    // would prevent VRF callbacks from being accepted. Therefore the
    // `COORDINATOR` reference is initialized in the constructor but
    // is NOT exposed with a setter. Other VRF parameters below are
    // updateable by the contract owner.
    VRFCoordinatorV2Interface private COORDINATOR;
    uint64 private s_subscriptionId;
    bytes32 private s_keyHash;
    uint32 private callbackGasLimit;
    uint16 private requestConfirmations;
    uint8 private numWords;

    // Request tracking
    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => address) private requestToPlayer;
    mapping(uint256 => bool) private activeRequestIds;

    // ============ Constructor ============
    /**
     * @notice Contract constructor
     * @param _gamaTokenAddress  Address of the GAMA token contract
     * @param vrfCoordinator     Address of the VRF coordinator
     * @param subscriptionId     VRF subscription ID
     * @param keyHash            VRF key hash for the network
    * @param _callbackGasLimit  Gas limit for the VRF callback (kept low - callback is now minimal)
     * @param _requestConfirmations Number of block confirmations required by VRF
     * @param _numWords          Number of random words to request (must be 1)
     */
    constructor(
        address _gamaTokenAddress,
        address vrfCoordinator,
        uint64 subscriptionId,
        bytes32 keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint8 _numWords
    ) VRFConsumerBaseV2(vrfCoordinator) Ownable(msg.sender) {
        require(_gamaTokenAddress != address(0), "Token address cannot be zero");
        require(vrfCoordinator != address(0), "VRF coordinator cannot be zero");
        require(_callbackGasLimit > 0, "Callback gas limit cannot be zero");
        require(_numWords > 0, "Number of words cannot be zero");

        gamaToken = IERC20(_gamaTokenAddress);
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    // ============ Owner (admin) VRF setters/getters ============

    /**
     * @notice Update VRF subscription id (owner only)
     */
    function setVrfSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        emit VRFSubscriptionIdUpdated(s_subscriptionId, _subscriptionId);
        s_subscriptionId = _subscriptionId;
    }

    /**
     * @notice Update VRF key hash (owner only)
     */
    function setVrfKeyHash(bytes32 _keyHash) external onlyOwner {
        emit VRFKeyHashUpdated(s_keyHash, _keyHash);
        s_keyHash = _keyHash;
    }

    /**
     * @notice Update callback gas limit for VRF (owner only)
     */
    function setVrfCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        require(_callbackGasLimit > 0, "Callback gas limit must be > 0");
        emit VRFCallbackGasLimitUpdated(callbackGasLimit, _callbackGasLimit);
        callbackGasLimit = _callbackGasLimit;
    }

    /**
     * @notice Update VRF request confirmations (owner only)
     */
    function setVrfRequestConfirmations(uint16 _requestConfirmations) external onlyOwner {
        require(_requestConfirmations > 0, "Request confirmations must be > 0");
        emit VRFRequestConfirmationsUpdated(requestConfirmations, _requestConfirmations);
        requestConfirmations = _requestConfirmations;
    }

    /**
     * @notice Update number of random words requested from VRF (owner only)
     */
    function setVrfNumWords(uint8 _numWords) external onlyOwner {
        require(_numWords > 0, "numWords must be > 0");
        emit VRFNumWordsUpdated(numWords, _numWords);
        numWords = _numWords;
    }

    /**
     * @notice Get current VRF configuration
     */
    function getVrfConfig()
        external
        view
        returns (
            address coordinator,
            uint64 subscriptionId,
            bytes32 keyHash,
            uint32 gasLimit,
            uint16 confirmations,
            uint8 words
        )
    {
        coordinator = address(COORDINATOR);
        subscriptionId = s_subscriptionId;
        keyHash = s_keyHash;
        gasLimit = callbackGasLimit;
        confirmations = requestConfirmations;
        words = numWords;
    }

    // ============ External Functions ============

    /**
     * @notice Place a bet on a flip (heads or tails).
     * @param chosenSide  Side to bet on (1 = HEADS, 2 = TAILS)
     * @param amount      Token amount to bet (burned immediately)
     * @return requestId  VRF request identifier
     */
    function flipCoin(
        uint8 chosenSide,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 requestId) {

        // ===== CHECKS =====
        if (amount == 0) revert InvalidBetParameters("Bet amount cannot be zero");
        if (amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Bet amount too large");
        if (chosenSide != HEADS && chosenSide != TAILS)
            revert InvalidBetParameters("Invalid chosen side (must be 1 for HEADS or 2 for TAILS)");

        UserData storage user = userData[msg.sender];
        if (user.currentGame.isActive) revert GameError("User has an active game");
        if (user.currentRequestId != 0) revert GameError("User has a pending request");
        if (user.pendingResolution) revert GameError("Previous game awaiting resolveGame()");

        _checkBalancesAndAllowances(msg.sender, amount);

        uint256 potentialPayout = amount * 2;
        if (potentialPayout / 2 != amount) revert PayoutCalculationError("Payout calculation overflow");
        if (potentialPayout > MAX_POSSIBLE_PAYOUT)
            revert MaxPayoutExceeded(potentialPayout, MAX_POSSIBLE_PAYOUT);

        uint256 remainingMintable = gamaToken.getRemainingMintable();
        if (potentialPayout > remainingMintable)
            revert MaxPayoutExceeded(potentialPayout, remainingMintable);

        // ===== EFFECTS =====
        gamaToken.burnFrom(msg.sender, amount);
        totalWageredAmount += amount;

        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });

        requestToPlayer[requestId] = msg.sender;
        activeRequestIds[requestId] = true;

        user.lastPlayedTimestamp = uint32(block.timestamp);
        user.lastPlayedBlock = block.number;
        user.requestFulfilled = false;
        user.pendingResolution = false;
        user.pendingRandomWord = 0;

        user.currentGame = GameState({
            isActive: true,
            completed: false,
            chosenSide: chosenSide,
            result: 0,
            amount: amount,
            payout: 0
        });

        user.currentRequestId = requestId;
        // Register active player for pagination if not already present
        if (!isActivePlayer[msg.sender]) {
            activePlayers.push(msg.sender);
            activePlayerIndex[msg.sender] = activePlayers.length; // 1-based
            isActivePlayer[msg.sender] = true;
        }

        emit BetPlaced(msg.sender, requestId, chosenSide, amount);
        return requestId;
    }

    /**
    * @notice VRF coordinator callback - intentionally minimal to stay well
     *         within the callbackGasLimit regardless of history depth.
     *
     *         Stores the random word in UserData and sets pendingResolution.
     *         All game logic (result calculation, minting, history) is deferred
     *         to resolveGame().
     *
     * @param requestId   VRF request identifier
     * @param randomWords Array of random values returned by the coordinator
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override nonReentrant {

        // ===== CHECKS =====
        RequestStatus storage request = s_requests[requestId];
        if (!request.exists) revert VRFError("Request not found");
        if (request.fulfilled) revert VRFError("Request already fulfilled");
        if (randomWords.length != numWords) revert VRFError("Invalid random words length");

        address player = requestToPlayer[requestId];
        if (player == address(0)) revert VRFError("Invalid player address");

        UserData storage user = userData[player];
        if (user.currentRequestId != requestId) revert GameError("Request ID mismatch");

        // Mark the VRF-level request as fulfilled
        request.fulfilled = true;
        request.randomWords = randomWords;
        user.requestFulfilled = true;

        // If the game was already force-stopped or self-recovered while we
        // waited for VRF, clean up and return - nothing to resolve.
        if (!user.currentGame.isActive) {
            delete s_requests[requestId];
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            user.currentRequestId = 0;
            user.requestFulfilled = false;
            return;
        }

        // ===== EFFECTS (minimal) =====
        // Persist the random word and signal that resolveGame() can now run.
        // Deliberately no minting, no history writes, no payout logic here.
        user.pendingRandomWord = randomWords[0];
        user.pendingResolution = true;
        // Note: currentRequestId is intentionally kept set so that
        // recoverOwnStuckGame / forceStopGame can still reference it.
    }

    /**
     * @notice Finalise a game after the VRF callback has responded.
     *
     *         This function performs all the work that previously lived in
     *         fulfillRandomWords: result calculation, payout minting, history
     *         update, and counter increments. The gas cost is borne by the
     *         caller (player, keeper, or any address) rather than the VRF
     *         subscription.
     *
     *         Anyone may call this on behalf of any player, enabling a keeper
     *         pattern without requiring the player to be online.
     *
     * @param player  Address of the player whose pending game should be resolved
     */
    function resolveGame(address player) external nonReentrant whenNotPaused {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");

        UserData storage user = userData[player];

        // ===== CHECKS =====
        if (!user.pendingResolution)
            revert GameError("No result pending for this player");
        if (!user.currentGame.isActive)
            revert GameError("Game is not active");

        // Cache values before any state mutation
        uint256 requestId  = user.currentRequestId;
        uint256 randomWord = user.pendingRandomWord;
        uint8 chosenSide   = user.currentGame.chosenSide;
        uint256 betAmount  = user.currentGame.amount;

        // ===== EFFECTS =====
        // 1. Compute result
        uint8 result = uint8((randomWord % MAX_SIDES) + 1);

        // 2. Compute payout
        uint256 payout = 0;
        if (chosenSide == result) {
            if (betAmount > type(uint256).max / 2)
                revert PayoutCalculationError("Bet amount too large for payout calculation");
            payout = betAmount * 2;
        }

        // 3. Update game state
        user.currentGame.result    = result;
        user.currentGame.isActive  = false;
        user.currentGame.completed = true;
        user.currentGame.payout    = payout;

        // 4. Update history
        _updateUserHistory(user, chosenSide, result, betAmount, payout);

        // 5. Update global counters
        if (payout > 0) totalPayoutAmount += payout;
        unchecked { ++totalGamesPlayed; }

        // 6. Clear all pending / active state
        user.pendingResolution  = false;
        user.pendingRandomWord  = 0;
        user.currentRequestId   = 0;
        user.requestFulfilled   = false;

        delete s_requests[requestId];
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];
        _removeActivePlayer(player);

        // ===== INTERACTIONS =====
        if (payout > 0) {
            gamaToken.mint(player, payout);
        }

        emit GameCompleted(player, requestId, result, payout);
    }

    /**
     * @notice Recover from a stuck game (VRF never responded) and receive a refund.
     *         Requires both the block threshold and the time timeout to have passed,
     *         and that the VRF request still exists (i.e. was never fulfilled).
     */
    function recoverOwnStuckGame() external nonReentrant whenNotPaused {
        UserData storage user = userData[msg.sender];

        // ===== CHECKS =====
        if (!user.currentGame.isActive) revert GameError("No active game");

        uint256 requestId = user.currentRequestId;
        if (requestId == 0) revert GameError("No pending request to recover");

        // Guard against racing with a freshly-fulfilled callback
        if (s_requests[requestId].fulfilled &&
            (block.number <= user.lastPlayedBlock + 10)) {
            revert GameError("Request just fulfilled, let VRF complete");
        }

        // If VRF has already responded, the player should call resolveGame instead
        if (user.pendingResolution)
            revert GameError("VRF responded - call resolveGame() instead");

        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed        = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        bool hasVrfRequest           = requestId != 0 && s_requests[requestId].exists;

        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest)
            revert GameError("Game not eligible for recovery yet");

        // ===== EFFECTS =====
        uint256 refundAmount = user.currentGame.amount;
        if (refundAmount == 0) revert GameError("Nothing to refund");

        delete s_requests[requestId];
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];

        user.currentGame.completed = true;
        user.currentGame.isActive  = false;
        user.currentGame.result    = RESULT_RECOVERED;
        user.currentGame.payout    = refundAmount;
        _removeActivePlayer(msg.sender);

        user.currentRequestId  = 0;
        user.requestFulfilled  = false;
        user.pendingResolution = false;
        user.pendingRandomWord = 0;

        // ===== INTERACTIONS =====
        gamaToken.mint(msg.sender, refundAmount);

        _updateUserHistory(
            user,
            user.currentGame.chosenSide,
            RESULT_RECOVERED,
            refundAmount,
            refundAmount
        );

        emit GameRecovered(msg.sender, requestId, refundAmount);
    }

    /**
     * @notice Owner-only: force-stop a stuck game and refund the player.
     * @param player  Player address
     */
    function forceStopGame(address player) external onlyOwner nonReentrant {
        UserData storage user = userData[player];

        // ===== CHECKS =====
        if (!user.currentGame.isActive) revert GameError("No active game");

        uint256 requestId = user.currentRequestId;

        if (requestId != 0 && s_requests[requestId].fulfilled &&
            (block.number <= user.lastPlayedBlock + 10)) {
            revert GameError("Request just fulfilled, let VRF complete");
        }

        // If VRF responded, resolveGame should be called first
        if (user.pendingResolution)
            revert GameError("VRF responded - call resolveGame() instead");

        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed        = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        bool hasVrfRequest           = requestId != 0 && s_requests[requestId].exists;

        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest)
            revert GameError("Game not eligible for force stop yet");

        uint256 refundAmount = user.currentGame.amount;
        if (refundAmount == 0) revert GameError("Nothing to refund");

        // ===== EFFECTS =====
        if (requestId != 0) {
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            delete s_requests[requestId];
        }

        user.currentGame.completed = true;
        user.currentGame.isActive  = false;
        user.currentGame.result    = RESULT_FORCE_STOPPED;
        user.currentGame.payout    = refundAmount;
        _removeActivePlayer(player);

        user.currentRequestId  = 0;
        user.requestFulfilled  = false;
        user.pendingResolution = false;
        user.pendingRandomWord = 0;

        // ===== INTERACTIONS =====
        gamaToken.mint(player, refundAmount);

        _updateUserHistory(
            user,
            user.currentGame.chosenSide,
            RESULT_FORCE_STOPPED,
            refundAmount,
            refundAmount
        );

        emit GameRecovered(player, requestId, refundAmount);
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner nonReentrant {
        _pause();
    }

    /**
     * @notice Resume contract operations
     */
    function unpause() external onlyOwner nonReentrant {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get a player's current game state and last-played timestamp.
     * @param player  Player address
     */
    function getUserData(address player) external view returns (
        GameState memory gameState,
        uint256 lastPlayed
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        UserData storage user = userData[player];
        return (user.currentGame, user.lastPlayedTimestamp);
    }

    /**
     * @notice Get a player's bet history (newest first, up to MAX_HISTORY_SIZE).
     * @param player  Player address
     */
    function getBetHistory(address player) external view returns (BetHistory[] memory) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");

        UserData storage user = userData[player];
        uint256 length = user.recentBets.length;

        if (length == 0) return new BetHistory[](0);

        uint256 resultLength = length > MAX_HISTORY_SIZE ? MAX_HISTORY_SIZE : length;
        BetHistory[] memory orderedBets = new BetHistory[](resultLength);

        if (length < MAX_HISTORY_SIZE) {
            for (uint256 i = 0; i < length; i++) {
                orderedBets[i] = user.recentBets[length - 1 - i];
            }
        } else {
            uint256 newestIndex = user.historyIndex == 0
                ? MAX_HISTORY_SIZE - 1
                : user.historyIndex - 1;
            for (uint256 i = 0; i < MAX_HISTORY_SIZE; i++) {
                orderedBets[i] = user.recentBets[(newestIndex + MAX_HISTORY_SIZE - i) % MAX_HISTORY_SIZE];
            }
        }

        return orderedBets;
    }

    /**
     * @notice Get a paginated list of active players for automation/keepers.
     */
    function getActivePlayers(uint256 offset, uint256 limit) 
        external view returns (address[] memory players, uint256 total) 
    {
        total = activePlayers.length;
        if (offset >= total) return (new address[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        players = new address[](end - offset);
        for (uint256 i = 0; i < players.length; i++) {
            players[i] = activePlayers[offset + i];
        }
    }


    /**
     * @notice Get the player address associated with a VRF request ID.
     * @param requestId  VRF request ID
     */
    function getPlayerForRequest(uint256 requestId) external view returns (address) {
        return requestToPlayer[requestId];
    }

    /**
     * @notice Return true if the player has an active game with a pending VRF request,
     *         OR if VRF has responded and resolveGame() hasn't been called yet.
     * @param player  Player address
     */
    function hasPendingRequest(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return user.currentGame.isActive &&
               (user.currentRequestId != 0 || user.pendingResolution);
    }

    /**
     * @notice Return true if the player can start a new game.
     * @param player  Player address
     */
    function canStartNewGame(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return !user.currentGame.isActive &&
               user.currentRequestId == 0 &&
               !user.pendingResolution;
    }

    /**
     * @notice Return true if a player has a result ready and is waiting for resolveGame().
     * @param player  Player address
     */
    function hasPendingResolution(address player) external view returns (bool) {
        return userData[player].pendingResolution;
    }

    /**
     * @notice Comprehensive game status for a player.
     * @param player  Player address
     */
    function getGameStatus(address player) external view returns (
        bool isActive,
        bool isWin,
        bool isCompleted,
        uint8 chosenSide,
        uint256 amount,
        uint8 result,
        uint256 payout,
        uint256 requestId,
        bool requestExists,
        bool requestProcessed,
        bool recoveryEligible,
        uint256 lastPlayTimestamp,
        bool pendingResolution
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");

        UserData storage user = userData[player];

        isActive          = user.currentGame.isActive;
        isCompleted       = user.currentGame.completed;
        chosenSide        = user.currentGame.chosenSide;
        amount            = user.currentGame.amount;
        result            = user.currentGame.result;
        payout            = user.currentGame.payout;
        requestId         = user.currentRequestId;
        lastPlayTimestamp = user.lastPlayedTimestamp;
        pendingResolution = user.pendingResolution;

        isWin = payout > 0 && (result == HEADS || result == TAILS);

        requestExists    = false;
        requestProcessed = false;

        if (requestId != 0) {
            RequestStatus storage request = s_requests[requestId];
            requestExists    = request.exists;
            requestProcessed = request.fulfilled;
        }

        recoveryEligible = false;
        if (isActive && !pendingResolution) {
            bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
            bool hasTimeoutPassed        = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
            bool hasVrfRequest           = requestId != 0 && requestExists;
            recoveryEligible = hasBlockThresholdPassed && hasTimeoutPassed && hasVrfRequest;
        }
    }

    // ============ Private Functions ============

    /**
     * @dev Revert if the player does not have sufficient balance or allowance.
     */
    function _checkBalancesAndAllowances(address player, uint256 amount) private view {
        uint256 bal = gamaToken.balanceOf(player);
        if (bal < amount) revert InsufficientUserBalance(amount, bal);

        uint256 allowance = gamaToken.allowance(player, address(this));
        if (allowance < amount) revert InsufficientAllowance(amount, allowance);
    }

    /**
     * @dev Append a bet to the player's circular history buffer.
     */
    function _updateUserHistory(
        UserData storage user,
        uint8 chosenSide,
        uint8 result,
        uint256 amount,
        uint256 payout
    ) private {
        BetHistory memory newBet = BetHistory({
            chosenSide:    chosenSide,
            flippedResult: result,
            amount:        amount,
            timestamp:     uint32(block.timestamp),
            payout:        payout
        });

        if (user.recentBets.length < MAX_HISTORY_SIZE) {
            user.recentBets.push(newBet);
            user.historyIndex = uint8(user.recentBets.length % MAX_HISTORY_SIZE);
        } else {
            user.recentBets[user.historyIndex] = newBet;
            user.historyIndex = (user.historyIndex + 1) % MAX_HISTORY_SIZE;
        }
    }

    /**
     * @dev Remove a player from the activePlayers list (swap-pop).
     */
    function _removeActivePlayer(address player) private {
        if (!isActivePlayer[player]) return;
        uint256 idx = activePlayerIndex[player] - 1; // convert to 0-based
        uint256 last = activePlayers.length - 1;
        if (idx != last) {
            address lastPlayer = activePlayers[last];
            activePlayers[idx] = lastPlayer;
            activePlayerIndex[lastPlayer] = idx + 1;
        }
        activePlayers.pop();
        delete activePlayerIndex[player];
        isActivePlayer[player] = false;
    }
}
