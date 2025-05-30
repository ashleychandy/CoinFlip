// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract GamaToken is ERC20, AccessControl, Pausable, ERC20Burnable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SUB_ADMIN_ROLE = keccak256("SUB_ADMIN_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    mapping(address => bool) public isBlacklisted;
    mapping(address => uint256) public subAdminMinted;
    mapping(address => uint256) public subAdminMintLimit;

    // Max mintable tokens and tracking for total minted
    uint256 private _maxMintable;
    uint256 private _totalMinted;

    event Blacklisted(address indexed account, bool value);
    event SubAdminLimitUpdated(address indexed subAdmin, uint256 newLimit);
    event Airdrop(address indexed recipient, uint256 amount);

    /**
     * @notice Contract constructor
     * @param maxMintable_ Maximum mintable tokens in raw units (consider 18 decimal places)
     * For example, to set 1 billion tokens, pass 1000000000 * 10^18
     */
    constructor(uint256 maxMintable_) ERC20("Gama Token", "GAMA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        
        // Set initial max mintable from parameter
        _maxMintable = maxMintable_;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) public whenNotPaused {
        require(!isBlacklisted[to], "Recipient is blacklisted");
        require(!isBlacklisted[msg.sender], "Sender is blacklisted");

        if (hasRole(SUB_ADMIN_ROLE, msg.sender)) {
            uint256 newMintedAmount = subAdminMinted[msg.sender] + amount;
            require(newMintedAmount <= subAdminMintLimit[msg.sender], "Sub-admin mint limit exceeded");
            subAdminMinted[msg.sender] = newMintedAmount;
        } else {
            require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter or sub-admin");
        }

        // Check against max mintable limit
        require(_totalMinted + amount <= _maxMintable, "Max mintable limit exceeded");
        
        // Update total minted amount
        _totalMinted += amount;
        
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20) {
        require(!paused(), "Token transfer while paused");
        require(!isBlacklisted[from], "Sender is blacklisted");
        require(!isBlacklisted[to], "Recipient is blacklisted");
        super._update(from, to, value);
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        require(!paused(), "Approve while paused");
        require(!isBlacklisted[msg.sender], "Approver is blacklisted");
        require(!isBlacklisted[spender], "Spender is blacklisted");
        return super.approve(spender, amount);
    }

    function burn(uint256 amount) public override whenNotPaused onlyRole(BURNER_ROLE) {
        require(!isBlacklisted[msg.sender], "Caller is blacklisted");
        super.burn(amount);
    }

    function burnFrom(address account, uint256 amount) public override whenNotPaused onlyRole(BURNER_ROLE) {
        require(!isBlacklisted[msg.sender], "Caller is blacklisted");
        require(!isBlacklisted[account], "Account is blacklisted");
        super.burnFrom(account, amount);
    }

    function setBlacklist(address account, bool value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isBlacklisted[account] = value;
        emit Blacklisted(account, value);
    }

    function setSubAdminLimit(address subAdmin, uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        subAdminMintLimit[subAdmin] = limit;
        emit SubAdminLimitUpdated(subAdmin, limit);
    }

    function airdrop(address[] memory recipients, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            require(!isBlacklisted[recipient], "Recipient is blacklisted");
            _mint(recipient, amount);
            emit Airdrop(recipient, amount);
        }
    }
    
    /**
     * @notice Sets the maximum mintable token amount
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param newMaxMintable The new maximum mintable amount (in raw units with 18 decimals)
     */
    function setMaxMintable(uint256 newMaxMintable) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMaxMintable >= _totalMinted, "New limit cannot be less than already minted");
        _maxMintable = newMaxMintable;
    }
    
    /**
     * @notice Gets the maximum mintable token amount
     * @dev Only callable by addresses with MINTER_ROLE
     * @return The maximum mintable amount
     */
    function getMaxMintable() external view onlyRole(MINTER_ROLE) returns (uint256) {
        return _maxMintable;
    }
    
    /**
     * @notice Gets the total amount of tokens minted so far
     * @dev Only callable by addresses with MINTER_ROLE
     * @return The total minted amount
     */
    function getTotalMinted() external view onlyRole(MINTER_ROLE) returns (uint256) {
        return _totalMinted;
    }
    
    /**
     * @notice Gets the remaining mintable token amount
     * @dev Only callable by addresses with MINTER_ROLE
     * @return The remaining mintable amount
     */
    function getRemainingMintable() external view onlyRole(MINTER_ROLE) returns (uint256) {
        return _maxMintable - _totalMinted;
    }
}