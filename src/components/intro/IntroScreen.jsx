import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDice,
  faCubes,
  faChartLine,
  faArrowRight,
  faCoins,
  faShield,
  faServer,
  faLock,
  faPercentage,
  faRandom,
} from '@fortawesome/free-solid-svg-icons';

const IntroScreen = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4; // Now we have 5 total steps (0-4)

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    },
    exit: { 
      opacity: 0, 
      x: -50, 
      transition: { 
        duration: 0.5,
        ease: "easeIn" 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Logo animation variants
  const logoVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      rotate: [0, 10, -10, 0],
      transition: { 
        duration: 1.5,
        ease: "easeOut",
        times: [0, 0.3, 0.6, 1]
      }
    }
  };

  // Dice dots animation
  const diceDotVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: (i) => ({
      scale: 1,
      opacity: 1,
      transition: { 
        delay: i * 0.15,
        duration: 0.5
      }
    })
  };

  // Background gradient animation
  const backgroundVariants = {
    initial: { 
      background: "linear-gradient(135deg, rgba(34,173,116,0.02) 0%, rgba(255,255,255,0.8) 100%)"
    },
    animate: { 
      background: "linear-gradient(135deg, rgba(34,173,116,0.1) 0%, rgba(255,255,255,0.9) 100%)",
      transition: { 
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0"
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
      />
      
      {/* Enhanced decorative elements - more and larger */}
      <motion.div 
        className="absolute top-10 right-10 w-96 h-96 bg-[#22AD74]/10 rounded-full blur-3xl" 
        animate={{ 
          x: [0, 40, 0],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      <motion.div 
        className="absolute bottom-10 left-10 w-64 h-64 bg-[#22AD74]/15 rounded-full blur-2xl" 
        animate={{ 
          y: [0, -30, 0],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      <motion.div 
        className="absolute top-1/3 left-40 w-40 h-40 bg-[#22AD74]/10 rounded-full blur-xl" 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-[#22AD74]/8 rounded-full blur-xl" 
        animate={{ 
          scale: [1, 1.2, 1],
          y: [0, -20, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      
      {/* Larger container - increased max-w and added more padding */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-10 md:p-16 shadow-2xl border border-[#22AD74]/20 max-w-5xl w-full mx-6 relative z-10">
        {/* Logo Animation on first step only - larger */}
        {currentStep === 0 && (
          <motion.div 
            className="flex justify-center mb-10"
            variants={logoVariants}
            initial="initial"
            animate="animate"
          >
            <div className="relative">
              {/* Dice Shape - larger */}
              <div className="w-40 h-40 bg-gradient-to-br from-[#22AD74] to-[#26c582] rounded-xl shadow-lg flex items-center justify-center transform -rotate-12">
                {/* Dice Face - showing a standard 6-face dice */}
                <div className="w-36 h-36 bg-white/90 rounded-lg shadow-inner flex items-center justify-center">
                  {/* This represents the "5" face showing */}
                  <div className="w-28 h-28 grid grid-cols-3 grid-rows-3 gap-1 relative">
                    {/* Top-Left Dot */}
                    <motion.div 
                      custom={1} 
                      variants={diceDotVariants} 
                      initial="initial" 
                      animate="animate" 
                      className="w-6 h-6 bg-[#22AD74] rounded-full col-start-1 col-end-2 row-start-1 row-end-2 place-self-center"
                    />
                    
                    {/* Top-Right Dot */}
                    <motion.div 
                      custom={2} 
                      variants={diceDotVariants} 
                      initial="initial" 
                      animate="animate" 
                      className="w-6 h-6 bg-[#22AD74] rounded-full col-start-3 col-end-4 row-start-1 row-end-2 place-self-center"
                    />
                    
                    {/* Center Dot */}
                    <motion.div 
                      custom={3} 
                      variants={diceDotVariants} 
                      initial="initial" 
                      animate="animate" 
                      className="w-6 h-6 bg-[#22AD74] rounded-full col-start-2 col-end-3 row-start-2 row-end-3 place-self-center"
                    />
                    
                    {/* Bottom-Left Dot */}
                    <motion.div 
                      custom={4} 
                      variants={diceDotVariants} 
                      initial="initial" 
                      animate="animate" 
                      className="w-6 h-6 bg-[#22AD74] rounded-full col-start-1 col-end-2 row-start-3 row-end-4 place-self-center"
                    />
                    
                    {/* Bottom-Right Dot */}
                    <motion.div 
                      custom={5} 
                      variants={diceDotVariants} 
                      initial="initial" 
                      animate="animate" 
                      className="w-6 h-6 bg-[#22AD74] rounded-full col-start-3 col-end-4 row-start-3 row-end-4 place-self-center"
                    />
                  </div>
                </div>
              </div>
              <motion.div 
                className="absolute -bottom-6 -right-3 text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                GAMA
              </motion.div>
            </div>
          </motion.div>
        )}
        
        {/* Intro Content */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-center px-4"
            >
              <motion.h1 
                className="text-5xl md:text-6xl font-bold text-[#22AD74] mb-6"
                variants={itemVariants}
              >
                Welcome to GAMA Dice
              </motion.h1>
              <motion.p 
                className="text-xl md:text-3xl text-gray-700 mb-8"
                variants={itemVariants}
              >
                A revolutionary blockchain dice game with <span className="font-bold">zero house edge</span> and <span className="font-bold">100% token burning</span>.
              </motion.p>
              <motion.div 
                variants={itemVariants}
                className="mb-10 flex justify-center"
              >
                <button 
                  onClick={nextStep}
                  className="px-10 py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-xl font-medium flex items-center gap-3"
                >
                  Learn More
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step-1"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.h2 
                className="text-4xl font-bold text-[#22AD74] mb-8"
                variants={itemVariants}
              >
                <FontAwesomeIcon icon={faDice} className="mr-3" />
                How It Works
              </motion.h2>
              
              <div className="grid md:grid-cols-3 gap-8 mb-10">
                <motion.div 
                  variants={itemVariants}
                  className="bg-white/70 p-6 rounded-xl shadow-sm border border-[#22AD74]/10 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74] text-2xl mb-4">
                    1
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Choose Your Number</h3>
                  <p className="text-gray-600 text-lg">Select any number from 1 to 6 for your bet.</p>
                </motion.div>
                
                <motion.div 
                  variants={itemVariants}
                  className="bg-white/70 p-6 rounded-xl shadow-sm border border-[#22AD74]/10 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74] text-2xl mb-4">
                    2
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Place Your Bet</h3>
                  <p className="text-gray-600 text-lg">Bet with GAMA tokens on the XDC blockchain.</p>
                </motion.div>
                
                <motion.div 
                  variants={itemVariants}
                  className="bg-white/70 p-6 rounded-xl shadow-sm border border-[#22AD74]/10 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74] text-2xl mb-4">
                    3
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Win 6X</h3>
                  <p className="text-gray-600 text-lg">Win 6X your bet if the dice rolls your number.</p>
                </motion.div>
              </div>
              
              <motion.div 
                variants={itemVariants}
                className="flex justify-center mt-8"
              >
                <button 
                  onClick={nextStep}
                  className="px-10 py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-xl font-medium flex items-center gap-3"
                >
                  Next
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.h2 
                className="text-4xl font-bold text-[#22AD74] mb-8"
                variants={itemVariants}
              >
                <FontAwesomeIcon icon={faCoins} className="mr-3" />
                Revolutionary Tokenomics
              </motion.h2>
              
              <motion.div 
                className="grid md:grid-cols-2 gap-8 mb-10"
                variants={itemVariants}
              >
                <div className="bg-white/70 p-8 rounded-xl shadow-sm border border-[#22AD74]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                      <FontAwesomeIcon icon={faCoins} size="lg" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#22AD74]">100% Token Burning</h3>
                  </div>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    <strong>Every single token</strong> you bet is permanently <strong>burned</strong> from circulation. This creates constant deflationary pressure, potentially increasing the value of remaining tokens over time.
                  </p>
                </div>
                
                <div className="bg-white/70 p-8 rounded-xl shadow-sm border border-[#22AD74]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                      <FontAwesomeIcon icon={faPercentage} size="lg" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#22AD74]">0% House Edge</h3>
                  </div>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Unlike traditional casinos that take a percentage, GAMA Dice operates with <strong>absolutely no house edge</strong>. 100% of potential winnings go back to players, giving you better odds than any traditional casino.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                variants={itemVariants}
                className="flex justify-center mt-8"
              >
                <button 
                  onClick={nextStep}
                  className="px-10 py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-xl font-medium flex items-center gap-3"
                >
                  Next
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* New slide about blockchain security and VRF */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.h2 
                className="text-4xl font-bold text-[#22AD74] mb-8"
                variants={itemVariants}
              >
                <FontAwesomeIcon icon={faShield} className="mr-3" />
                100% On-Chain Security
              </motion.h2>
              
              <motion.div 
                className="grid md:grid-cols-2 gap-8 mb-10"
                variants={itemVariants}
              >
                <div className="bg-white/70 p-8 rounded-xl shadow-sm border border-[#22AD74]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                      <FontAwesomeIcon icon={faRandom} size="lg" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#22AD74]">Verifiable Random Function</h3>
                  </div>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    All dice rolls use blockchain's built-in <strong>VRF (Verifiable Random Function)</strong> to generate truly random and tamper-proof outcomes that can be cryptographically verified by anyone.
                  </p>
                </div>
                
                <div className="bg-white/70 p-8 rounded-xl shadow-sm border border-[#22AD74]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                      <FontAwesomeIcon icon={faServer} size="lg" className="opacity-70 relative">
                        <FontAwesomeIcon icon={faLock} size="xs" className="absolute text-red-600" transform="rotate--45 shrink-6" />
                      </FontAwesomeIcon>
                    </div>
                    <h3 className="text-2xl font-bold text-[#22AD74]">No Servers Involved</h3>
                  </div>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    <strong>All game logic and calculations happen 100% on-chain</strong>. No centralized servers are ever involved in determining game outcomes, ensuring complete transparency and fairness.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                variants={itemVariants}
                className="flex justify-center mt-8"
              >
                <button 
                  onClick={nextStep}
                  className="px-10 py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-xl font-medium flex items-center gap-3"
                >
                  Next
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step-4"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-center"
            >
              <motion.h2 
                className="text-4xl font-bold text-[#22AD74] mb-6"
                variants={itemVariants}
              >
                Ready to Play?
              </motion.h2>
              
              <motion.p 
                className="text-2xl text-gray-700 mb-8 max-w-3xl mx-auto"
                variants={itemVariants}
              >
                Connect your wallet to start playing on the world's fairest blockchain dice game. 
              </motion.p>
              
              <motion.div
                variants={itemVariants}
                className="bg-white/50 p-6 rounded-xl border border-[#22AD74]/20 max-w-xl mx-auto mb-8"
              >
                <ul className="flex flex-col gap-3">
                  <li className="flex items-center gap-3 text-left text-lg">
                    <FontAwesomeIcon icon={faCoins} className="text-[#22AD74]" />
                    <span><strong>100% of tokens</strong> from bets are burned</span>
                  </li>
                  <li className="flex items-center gap-3 text-left text-lg">
                    <FontAwesomeIcon icon={faPercentage} className="text-[#22AD74]" />
                    <span><strong>0% house edge</strong> for the fairest odds possible</span>
                  </li>
                  <li className="flex items-center gap-3 text-left text-lg">
                    <FontAwesomeIcon icon={faRandom} className="text-[#22AD74]" />
                    <span><strong>Verifiable random outcomes</strong> through blockchain VRF</span>
                  </li>
                  <li className="flex items-center gap-3 text-left text-lg">
                    <FontAwesomeIcon icon={faServer} className="text-[#22AD74]" />
                    <span><strong>No servers</strong> or centralized infrastructure involved</span>
                  </li>
                </ul>
              </motion.div>
              
              <motion.div 
                variants={itemVariants}
                className="flex justify-center"
              >
                <button 
                  onClick={onComplete}
                  className="px-12 py-6 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-2xl font-medium flex items-center gap-3"
                >
                  Enter GAMA Dice
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Progress Indicator */}
        <div className="flex justify-center mt-12 gap-3">
          {[0, 1, 2, 3, 4].map((step) => (
            <motion.div
              key={step}
              className={`h-3 rounded-full ${
                step <= currentStep ? 'bg-[#22AD74]' : 'bg-[#22AD74]/20'
              }`}
              initial={{ width: 24 }}
              animate={{ 
                width: step === currentStep ? 48 : 24,
                transition: { duration: 0.3 }
              }}
              onClick={() => setCurrentStep(step)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default IntroScreen;
