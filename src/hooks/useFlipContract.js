import { useEffect, useState } from 'react';
import { useWallet } from '../components/wallet/WalletProvider';
import { ethers } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import FlipABI from '../contracts/abi/Flip.json';
import TokenABI from '../contracts/abi/GamaToken.json';

export const useFlipContract = () => {
  const { provider, account } = useWallet();
  const { currentNetwork } = useNetwork();
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initContracts = async () => {
      try {
        if (!provider || !account || !currentNetwork) {
          setContract(null);
          setTokenContract(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Handle both address structures
        const FlipAddress =
          currentNetwork.contracts?.Flip || currentNetwork.FlipAddress;
        const tokenAddress =
          currentNetwork.contracts?.token || currentNetwork.tokenAddress;

        if (!FlipAddress) {
          setError(
            new Error(
              `Flip contract address not configured for network: ${currentNetwork.name}`
            )
          );
          setContract(null);
          setIsLoading(false);
          return;
        }

        if (!TokenABI?.abi) {
          setError(new Error('Token ABI not available'));
          setIsLoading(false);
          return;
        }

        const signer = provider.getSigner
          ? await provider.getSigner()
          : provider;

        // Initialize Flip contract
        try {
          const FlipContract = new ethers.Contract(
            FlipAddress,
            FlipABI.abi,
            signer
          );
          setContract(FlipContract);
        } catch (FlipError) {
          setError(
            new Error(
              `Flip contract initialization failed: ${FlipError.message}`
            )
          );
          setContract(null);
        }

        // Initialize token contract if address is available
        if (tokenAddress) {
          try {
            const token = new ethers.Contract(
              tokenAddress,
              TokenABI.abi,
              signer
            );
            setTokenContract(token);
          } catch (tokenError) {
            setTokenContract(null);
          }
        }
      } catch (err) {
        setError(err);
        setContract(null);
        setTokenContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContracts();
  }, [provider, account, currentNetwork]);

  return {
    contract,
    tokenContract,
    isLoading,
    error,
  };
};
