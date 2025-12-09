// Proof of Steak Season 1 - Contract Interaction
// Handles staking and unstaking of Unicorn Meat (w🍖)

(function() {
    'use strict';
    
    // Suppress expected wallet extension errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        // Suppress known wallet extension errors
        if (message.includes('Permissions policy violation') ||
            message.includes('ObjectMultiplex') ||
            message.includes('malformed chunk') ||
            message.includes('ENOENT') ||
            message.includes('geth.ipc')) {
            return; // Suppress these expected errors
        }
        originalConsoleError.apply(console, args);
    };
    
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
        const message = args.join(' ');
        // Suppress known wallet extension warnings
        if (message.includes('Permissions policy violation') ||
            message.includes('ObjectMultiplex') ||
            message.includes('malformed chunk')) {
            return; // Suppress these expected warnings
        }
        originalConsoleWarn.apply(console, args);
    };

    const PROOF_OF_STEAK_CONTRACT_ADDRESS = '0x715d50635fE3CDe8A4b7f4601D266459bee60EcA';
    const UNICORN_MEAT_TOKEN_ADDRESS = '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668'; // w🍖
    const RPC_ENDPOINT = 'https://eth-mainnet.g.alchemy.com/v2/FF0GUedsNSBgY9vgIPWUbJqjkPeFwVsO';

    // Proof of Steak Contract ABI
    const PROOF_OF_STEAK_ABI = [
        {
            "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
            "name": "steak",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "unsteak",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "address", "name": "", "type": "address"}],
            "name": "steaks",
            "outputs": [
                {"internalType": "uint256", "name": "amount", "type": "uint256"},
                {"internalType": "uint256", "name": "steakTime", "type": "uint256"},
                {"internalType": "uint256", "name": "lastUpdate", "type": "uint256"},
                {"internalType": "uint256", "name": "maxAmount", "type": "uint256"},
                {"internalType": "bool", "name": "claimed", "type": "bool"}
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalSteaked",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalSteakTime",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "rewardPool",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "seasonStart",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "seasonEnd",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "seasonStarted",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "rewardPoolFunded",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "seasonLengthSeconds",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "unicornMeat",
            "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // ERC20 Token ABI (for approval and balance checks)
    const ERC20_ABI = [
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_spender", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "success", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {"name": "_owner", "type": "address"},
                {"name": "_spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ];

    let provider;
    let contract;
    let tokenContract;
    let userAddress = null;

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        init();
    });

    function init() {
        // Wait for ethers.js to be available
        if (typeof window.ethers === 'undefined') {
            console.error('Ethers.js not available');
            showError('Ethers.js library is required. Please refresh the page.');
            return;
        }

        // Try to use wallet provider, fallback to public RPC
        if (window.ethereum) {
            provider = new window.ethers.providers.Web3Provider(window.ethereum);
            // Listen for account changes
            window.ethereum.on('accountsChanged', handleAccountsChanged);
        } else {
            provider = new window.ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
        }

        contract = new window.ethers.Contract(PROOF_OF_STEAK_CONTRACT_ADDRESS, PROOF_OF_STEAK_ABI, provider);
        tokenContract = new window.ethers.Contract(UNICORN_MEAT_TOKEN_ADDRESS, ERC20_ABI, provider);

        // Setup event listeners
        setupEventListeners();

        // Load initial data
        loadSteakData();

        // Check if wallet is already connected
        checkWalletConnection();
    }

    function setupEventListeners() {
        const connectBtn = document.getElementById('steak-connect-btn');
        const steakBtn = document.getElementById('steak-btn');
        const unsteakBtn = document.getElementById('unsteak-btn');
        const steakAmountInput = document.getElementById('steak-amount');
        const refreshBtn = document.getElementById('refresh-steak-stats-btn');

        if (connectBtn) {
            connectBtn.addEventListener('click', connectWallet);
        }

        if (steakBtn) {
            steakBtn.addEventListener('click', handleSteak);
        }

        if (unsteakBtn) {
            unsteakBtn.addEventListener('click', handleUnsteak);
        }

        if (steakAmountInput) {
            steakAmountInput.addEventListener('input', validateSteakAmount);
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', handleRefreshStats);
        }
    }

    async function checkWalletConnection() {
        if (window.ethereum && window.ethereum.selectedAddress) {
            userAddress = window.ethereum.selectedAddress;
            await handleWalletConnected();
        } else if (window.unicornMeatWalletKit && window.unicornMeatWalletKit.isConnected) {
            userAddress = window.unicornMeatWalletKit.account.address;
            await handleWalletConnected();
        }
    }

    function handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            userAddress = null;
            hideUserStats();
            hideSteakActions();
            showConnectWallet();
        } else {
            userAddress = accounts[0];
            handleWalletConnected();
        }
    }

    async function connectWallet() {
        try {
            if (window.unicornMeatWalletKit) {
                // Use WalletKit if available
                if (window.unicornMeatWalletKit.isConnected) {
                    userAddress = window.unicornMeatWalletKit.account.address;
                    await handleWalletConnected();
                } else {
                    window.unicornMeatWalletKit.openWalletModal();
                    // Wait for connection
                    const checkConnection = setInterval(() => {
                        if (window.unicornMeatWalletKit.isConnected) {
                            clearInterval(checkConnection);
                            userAddress = window.unicornMeatWalletKit.account.address;
                            handleWalletConnected();
                        }
                    }, 500);
                }
            } else if (window.ethereum) {
                // Direct MetaMask connection
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                userAddress = accounts[0];
                provider = new window.ethers.providers.Web3Provider(window.ethereum);
                contract = new window.ethers.Contract(PROOF_OF_STEAK_CONTRACT_ADDRESS, PROOF_OF_STEAK_ABI, provider.getSigner());
                tokenContract = new window.ethers.Contract(UNICORN_MEAT_TOKEN_ADDRESS, ERC20_ABI, provider.getSigner());
                await handleWalletConnected();
            } else {
                showError('Please install MetaMask or connect a Web3 wallet');
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            showError('Failed to connect wallet: ' + error.message);
        }
    }

    async function handleWalletConnected() {
        showSteakActions();
        hideConnectWallet();
        await loadUserStats();
        await validateSteakAmount();
    }

    function hideConnectWallet() {
        const connectSection = document.getElementById('steak-connect-wallet');
        if (connectSection) {
            connectSection.style.display = 'none';
        }
    }

    function showConnectWallet() {
        const connectSection = document.getElementById('steak-connect-wallet');
        if (connectSection) {
            connectSection.style.display = 'block';
        }
    }

    function showSteakActions() {
        const actionsSection = document.getElementById('steak-actions');
        if (actionsSection) {
            actionsSection.classList.remove('d-none');
        }
    }

    function hideSteakActions() {
        const actionsSection = document.getElementById('steak-actions');
        if (actionsSection) {
            actionsSection.classList.add('d-none');
        }
    }

    function showUserStats() {
        const notLoggedInMsg = document.getElementById('steak-stats-not-logged-in');
        const statsContent = document.getElementById('steak-stats-content');
        if (notLoggedInMsg) {
            notLoggedInMsg.classList.add('d-none');
        }
        if (statsContent) {
            statsContent.classList.remove('d-none');
        }
    }

    function hideUserStats() {
        const notLoggedInMsg = document.getElementById('steak-stats-not-logged-in');
        const statsContent = document.getElementById('steak-stats-content');
        if (notLoggedInMsg) {
            notLoggedInMsg.classList.remove('d-none');
        }
        if (statsContent) {
            statsContent.classList.add('d-none');
        }
    }

    async function loadSteakData() {
        try {
            hideError();
            showLoading();

            // Load general stats
            const [totalSteaked, rewardPool, seasonStart, seasonEnd, seasonStarted, rewardPoolFunded, seasonLengthSeconds] = await Promise.all([
                contract.totalSteaked(),
                contract.rewardPool(),
                contract.seasonStart(),
                contract.seasonEnd(),
                contract.seasonStarted(),
                contract.rewardPoolFunded(),
                contract.seasonLengthSeconds()
            ]);

            // Format and display in Season Information section
            const decimals = 3; // w🍖 has 3 decimals
            document.getElementById('total-steaked').textContent = formatTokenAmount(totalSteaked, decimals) + ' w🍖';
            document.getElementById('reward-pool').textContent = formatTokenAmount(rewardPool, decimals) + ' w🍖';

            // Season info
            const now = Math.floor(Date.now() / 1000);
            const startTime = seasonStart.toNumber();
            const endTime = seasonEnd.toNumber();
            const isStarted = seasonStarted;
            const isFunded = rewardPoolFunded;

            let statusText = 'Not Started';
            if (isFunded && !isStarted) {
                statusText = 'Ready to Start';
            } else if (isStarted && now < endTime) {
                statusText = 'Active';
            } else if (isStarted && now >= endTime) {
                statusText = 'Ended';
            }

            document.getElementById('season-status').textContent = statusText;
            document.getElementById('season-start').textContent = startTime > 0 ? new Date(startTime * 1000).toLocaleString() : 'Not started';
            document.getElementById('season-end').textContent = endTime > 0 ? new Date(endTime * 1000).toLocaleString() : 'Not started';
            
            // Format season length
            const seasonLength = seasonLengthSeconds.toNumber();
            const seasonDays = Math.floor(seasonLength / 86400);
            const seasonHours = Math.floor((seasonLength % 86400) / 3600);
            const seasonMinutes = Math.floor((seasonLength % 3600) / 60);
            let seasonLengthText = '';
            if (seasonDays > 0) {
                seasonLengthText = `${seasonDays} day${seasonDays !== 1 ? 's' : ''}`;
                if (seasonHours > 0) {
                    seasonLengthText += ` ${seasonHours} hour${seasonHours !== 1 ? 's' : ''}`;
                }
            } else if (seasonHours > 0) {
                seasonLengthText = `${seasonHours} hour${seasonHours !== 1 ? 's' : ''}`;
                if (seasonMinutes > 0) {
                    seasonLengthText += ` ${seasonMinutes} minute${seasonMinutes !== 1 ? 's' : ''}`;
                }
            } else {
                seasonLengthText = `${seasonMinutes} minute${seasonMinutes !== 1 ? 's' : ''}`;
            }
            document.getElementById('season-length').textContent = seasonLengthText;
            
            if (isStarted && now < endTime) {
                const remaining = endTime - now;
                const days = Math.floor(remaining / 86400);
                const hours = Math.floor((remaining % 86400) / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                document.getElementById('time-remaining').textContent = `${days}d ${hours}h ${minutes}m`;
            } else if (isStarted && now >= endTime) {
                document.getElementById('time-remaining').textContent = 'Season ended';
            } else {
                document.getElementById('time-remaining').textContent = 'Not started';
            }

            hideLoading();
            showSteakInfo();
        } catch (error) {
            console.error('Error loading steak data:', error);
            hideLoading();
            showError('Failed to load staking information: ' + error.message);
        }
    }

    async function handleRefreshStats() {
        const refreshBtn = document.getElementById('refresh-steak-stats-btn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="icon icon-refresh me-2"></i>Refreshing...';
        }
        
        try {
            await loadSteakData();
            if (userAddress) {
                await loadUserStats();
            }
        } catch (error) {
            // Silently handle refresh errors
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="icon icon-refresh me-2"></i>Refresh Stats';
            }
        }
    }

    async function loadUserStats() {
        if (!userAddress) {
            hideUserStats();
            return;
        }

        try {
            // Get all user steak information and related data
            const [steakInfo, balance, seasonEnd, seasonStarted, seasonStart, totalSteakTime, totalSteaked, rewardPool] = await Promise.all([
                contract.steaks(userAddress),
                tokenContract.balanceOf(userAddress),
                contract.seasonEnd(),
                contract.seasonStarted(),
                contract.seasonStart(),
                contract.totalSteakTime(),
                contract.totalSteaked(),
                contract.rewardPool()
            ]);

            const decimals = 3;
            
            // Extract steak info values
            const userSteakAmount = steakInfo.amount._hex ? window.ethers.BigNumber.from(steakInfo.amount._hex) : steakInfo.amount;
            const userSteakTime = steakInfo.steakTime._hex ? window.ethers.BigNumber.from(steakInfo.steakTime._hex) : steakInfo.steakTime;
            const userMaxAmount = steakInfo.maxAmount._hex ? window.ethers.BigNumber.from(steakInfo.maxAmount._hex) : steakInfo.maxAmount;
            const lastUpdate = steakInfo.lastUpdate._hex ? window.ethers.BigNumber.from(steakInfo.lastUpdate._hex) : steakInfo.lastUpdate;
            const totalSteakTimeBN = totalSteakTime._hex ? window.ethers.BigNumber.from(totalSteakTime._hex) : totalSteakTime;
            const totalSteakedBN = totalSteaked._hex ? window.ethers.BigNumber.from(totalSteaked._hex) : totalSteaked;
            const rewardPoolBN = rewardPool._hex ? window.ethers.BigNumber.from(rewardPool._hex) : rewardPool;
            
            // Get season timing
            const now = Math.floor(Date.now() / 1000);
            const endTime = seasonEnd.toNumber();
            const startTime = seasonStart.toNumber();
            const isStarted = seasonStarted;
            
            // Display basic user stats
            document.getElementById('user-steaked-amount').textContent = formatTokenAmount(userSteakAmount, decimals) + ' w🍖';
            // user-steak-time is commented out in HTML, so we don't set it
            // document.getElementById('user-steak-time').textContent = formatLargeNumber(userSteakTime.toString());
            document.getElementById('user-max-amount').textContent = formatTokenAmount(userMaxAmount, decimals) + ' w🍖';
            
            // Format last update timestamp
            const lastUpdateTime = lastUpdate.toNumber();
            if (lastUpdateTime > 0) {
                document.getElementById('user-last-update').textContent = new Date(lastUpdateTime * 1000).toLocaleString();
            } else {
                document.getElementById('user-last-update').textContent = 'Never';
            }
            
            // Simulate steak times for accurate calculations
            let simulatedTotalSteakTime = totalSteakTimeBN;
            let simulatedUserSteakTime = userSteakTime;
            
            if (isStarted && startTime > 0) {
                const effectiveNow = Math.min(now, endTime);
                const lastGlobalUpdate = startTime; // Base estimate (contract sets this at season start)
                
                // Global steakTime update
                const timeDiff = effectiveNow - lastGlobalUpdate;
                if (timeDiff > 0 && totalSteakedBN.gt(0)) {
                    const additionalGlobal = totalSteakedBN.mul(timeDiff);
                    simulatedTotalSteakTime = totalSteakTimeBN.add(additionalGlobal);
                }
                
                // User steakTime update
                const userLastUpdate = lastUpdate.toNumber();
                const userLastUpdateTime = userLastUpdate > 0 ? userLastUpdate : startTime;
                const userTimeDiff = effectiveNow - userLastUpdateTime;
                if (userTimeDiff > 0 && userSteakAmount.gt(0)) {
                    const additionalUser = userSteakAmount.mul(userTimeDiff);
                    simulatedUserSteakTime = userSteakTime.add(additionalUser);
                }
            }
            
            // Calculate user's percentage of the pool using simulated values
            let poolSharePercent = '0.00%';
            let estimatedReward = '0 w🍖';
            
            if (simulatedTotalSteakTime.gt(0) && simulatedUserSteakTime.gt(0)) {
                // Calculate percentage: (simulatedUserSteakTime / simulatedTotalSteakTime) * 100
                const shareBN = simulatedUserSteakTime.mul(10000).div(simulatedTotalSteakTime); // Multiply by 10000 for 2 decimal precision
                poolSharePercent = (shareBN.toNumber() / 100).toFixed(2) + '%';
                
                // Calculate estimated reward: (simulatedUserSteakTime / simulatedTotalSteakTime) * rewardPool
                const estimatedRewardBN = rewardPoolBN.mul(simulatedUserSteakTime).div(simulatedTotalSteakTime);
                estimatedReward = formatTokenAmount(estimatedRewardBN, decimals) + ' w🍖';
            }
            
            document.getElementById('user-pool-share').textContent = poolSharePercent;
            document.getElementById('user-estimated-reward').textContent = estimatedReward;
            
            // Simulate pending reward with eligibility checks
            let simulatedPendingReward = window.ethers.BigNumber.from(0);
            
            // Eligibility checks (must pass all in order)
            const userAmountBN = userSteakAmount;
            const userMaxAmountBN = userMaxAmount;
            
            // Check eligibility rules (early returns)
            if (userAmountBN.isZero()) {
                // amount == 0, return 0
                simulatedPendingReward = window.ethers.BigNumber.from(0);
            } else if (userAmountBN.lt(userMaxAmountBN)) {
                // amount < maxAmount, return 0
                simulatedPendingReward = window.ethers.BigNumber.from(0);
            } else if (!isStarted) {
                // !seasonStarted, return 0
                simulatedPendingReward = window.ethers.BigNumber.from(0);
            } else if (now < endTime) {
                // now < seasonEnd, return 0
                simulatedPendingReward = window.ethers.BigNumber.from(0);
            } else if (simulatedTotalSteakTime.isZero()) {
                // simulatedTotalSteakTime == 0, return 0
                simulatedPendingReward = window.ethers.BigNumber.from(0);
            } else {
                // All eligibility checks passed, calculate reward using simulated values
                // reward = rewardPool * simulatedUserSteakTime / simulatedTotalSteakTime
                simulatedPendingReward = rewardPoolBN.mul(simulatedUserSteakTime).div(simulatedTotalSteakTime);
            }
            
            // Display pending reward
            const isSeasonEnded = isStarted && now >= endTime;
            if (simulatedPendingReward.gt(0)) {
                document.getElementById('user-pending-reward').textContent = formatTokenAmount(simulatedPendingReward, decimals) + ' w🍖';
            } else if (isSeasonEnded) {
                document.getElementById('user-pending-reward').textContent = '0 w🍖 (Not eligible - see requirements)';
            } else {
                document.getElementById('user-pending-reward').textContent = '0 w🍖 (Available after season ends)';
            }
            
            document.getElementById('user-claimed').textContent = steakInfo.claimed ? 'Yes' : 'No';
            document.getElementById('user-meat-balance').textContent = formatTokenAmount(balance, decimals);

            showUserStats();

            // Update button states
            const unsteakBtn = document.getElementById('unsteak-btn');
            if (unsteakBtn) {
                const amount = steakInfo.amount._hex ? window.ethers.BigNumber.from(steakInfo.amount._hex) : steakInfo.amount;
                unsteakBtn.disabled = amount.isZero ? amount.isZero() : (amount.toString() === '0');
            }
        } catch (error) {
            // Silently handle user stats loading errors
        }
    }

    async function validateSteakAmount() {
        const steakBtn = document.getElementById('steak-btn');
        const amountInput = document.getElementById('steak-amount');
        
        if (!steakBtn || !amountInput || !userAddress) {
            if (steakBtn) steakBtn.disabled = true;
            return;
        }

        const amount = parseFloat(amountInput.value);
        
        if (!amount || amount <= 0 || isNaN(amount)) {
            steakBtn.disabled = true;
            return;
        }

        try {
            const balance = await tokenContract.balanceOf(userAddress);
            const decimals = 3;
            const amountWei = window.ethers.utils.parseUnits(amount.toString(), decimals);
            
            const balanceBN = balance._hex ? window.ethers.BigNumber.from(balance._hex) : balance;
            if (amountWei.gt(balanceBN)) {
                steakBtn.disabled = true;
                return;
            }

            steakBtn.disabled = false;
        } catch (error) {
            steakBtn.disabled = true;
        }
    }

    async function handleSteak() {
        const amountInput = document.getElementById('steak-amount');
        const steakBtn = document.getElementById('steak-btn');
        
        if (!amountInput || !steakBtn || !userAddress) {
            showError('Please connect your wallet first');
            return;
        }

        const amount = parseFloat(amountInput.value);
        if (!amount || amount <= 0 || isNaN(amount)) {
            showError('Please enter a valid amount');
            return;
        }

        if (!window.ethereum) {
            showError('Please connect your wallet to stake');
            return;
        }

        try {
            steakBtn.disabled = true;
            showTransactionStatus('Preparing transaction...');

            // Get signer from wallet provider
            const walletProvider = new window.ethers.providers.Web3Provider(window.ethereum);
            const signer = walletProvider.getSigner();
            const contractWithSigner = contract.connect(signer);
            const tokenContractWithSigner = tokenContract.connect(signer);

            const decimals = 3;
            const amountWei = window.ethers.utils.parseUnits(amount.toString(), decimals);

            // Check balance
            const balance = await tokenContract.balanceOf(userAddress);
            const balanceBN = balance._hex ? window.ethers.BigNumber.from(balance._hex) : balance;
            if (amountWei.gt(balanceBN)) {
                throw new Error('Insufficient balance');
            }

            // Check and handle approval
            const allowance = await tokenContract.allowance(userAddress, PROOF_OF_STEAK_CONTRACT_ADDRESS);
            const allowanceBN = allowance._hex ? window.ethers.BigNumber.from(allowance._hex) : allowance;
            if (allowanceBN.lt(amountWei)) {
                showTransactionStatus('Approval needed. Please approve in your wallet...');
                const approveTx = await tokenContractWithSigner.approve(PROOF_OF_STEAK_CONTRACT_ADDRESS, amountWei);
                showTransactionStatus('Waiting for approval confirmation...');
                await approveTx.wait();
            }

            // Execute steak
            showTransactionStatus('Staking your Meat... Please confirm in your wallet.');
            const steakTx = await contractWithSigner.steak(amountWei);
            showTransactionStatus('Transaction submitted. Waiting for confirmation...');
            
            const receipt = await steakTx.wait();
            
            hideTransactionStatus();
            showSuccess(`Successfully staked ${formatTokenAmount(amountWei, decimals)} w🍖! Transaction: ${receipt.transactionHash}`);
            
            // Reset input and reload data
            amountInput.value = '';
            await loadSteakData();
            await loadUserStats();
            await validateSteakAmount();

        } catch (error) {
            hideTransactionStatus();
            if (error.code === 4001) {
                showError('Transaction was rejected by user');
            } else {
                showError('Failed to stake: ' + (error.message || 'Unknown error'));
            }
        } finally {
            steakBtn.disabled = false;
        }
    }

    async function handleUnsteak() {
        const unsteakBtn = document.getElementById('unsteak-btn');
        
        if (!unsteakBtn || !userAddress) {
            showError('Please connect your wallet first');
            return;
        }

        if (!window.ethereum) {
            showError('Please connect your wallet to unsteak');
            return;
        }

        try {
            unsteakBtn.disabled = true;
            showTransactionStatus('Preparing unsteak transaction...');

            // Get signer from wallet provider
            const walletProvider = new window.ethers.providers.Web3Provider(window.ethereum);
            const signer = walletProvider.getSigner();
            const contractWithSigner = contract.connect(signer);

            showTransactionStatus('Unstaking your Meat... Please confirm in your wallet.');
            const unsteakTx = await contractWithSigner.unsteak();
            showTransactionStatus('Transaction submitted. Waiting for confirmation...');
            
            const receipt = await unsteakTx.wait();
            
            hideTransactionStatus();
            showSuccess(`Successfully unstaked! Transaction: ${receipt.transactionHash}`);
            
            // Reload data
            await loadSteakData();
            await loadUserStats();

        } catch (error) {
            hideTransactionStatus();
            if (error.code === 4001) {
                showError('Transaction was rejected by user');
            } else {
                showError('Failed to unsteak: ' + (error.message || 'Unknown error'));
            }
        } finally {
            unsteakBtn.disabled = false;
        }
    }

    // UI Helper Functions
    function showLoading() {
        const loading = document.getElementById('steak-loading');
        const info = document.getElementById('steak-info');
        if (loading) loading.style.display = 'block';
        if (info) info.classList.add('d-none');
    }

    function hideLoading() {
        const loading = document.getElementById('steak-loading');
        if (loading) loading.style.display = 'none';
    }

    function showSteakInfo() {
        const info = document.getElementById('steak-info');
        if (info) info.classList.remove('d-none');
    }

    function showError(message) {
        const errorDiv = document.getElementById('steak-error');
        const errorMessage = document.getElementById('steak-error-message');
        if (errorDiv) {
            errorDiv.classList.remove('d-none');
            if (errorMessage) errorMessage.textContent = message;
        }
    }

    function hideError() {
        const errorDiv = document.getElementById('steak-error');
        if (errorDiv) errorDiv.classList.add('d-none');
    }

    function showTransactionStatus(message) {
        const txStatus = document.getElementById('steak-tx-status');
        const txMessage = document.getElementById('steak-tx-message');
        if (txStatus) {
            txStatus.classList.remove('d-none');
            if (txMessage) txMessage.textContent = message;
        }
    }

    function hideTransactionStatus() {
        const txStatus = document.getElementById('steak-tx-status');
        if (txStatus) txStatus.classList.add('d-none');
    }

    function showSuccess(message) {
        const resultMessages = document.getElementById('steak-result-messages');
        if (resultMessages) {
            const div = document.createElement('div');
            div.className = 'alert alert-success border border-2 border-black contrast-shadow-sm mt-3';
            div.innerHTML = `<i class="icon icon-check me-2"></i>${message}`;
            resultMessages.appendChild(div);
            
            setTimeout(() => {
                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                }
            }, 10000);
        }
    }

    function formatTokenAmount(amount, decimals) {
        if (!amount) return '0';
        let amountStr;
        if (amount._hex) {
            // BigNumber object
            amountStr = amount.toString();
        } else if (typeof amount === 'object' && amount.toString) {
            amountStr = amount.toString();
        } else {
            amountStr = amount.toString();
        }
        const formatted = window.ethers.utils.formatUnits(amountStr, decimals);
        return parseFloat(formatted).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        });
    }

    function formatLargeNumber(numStr) {
        const num = parseFloat(numStr);
        if (num >= 1e12) {
            return (num / 1e12).toFixed(2) + 'T';
        } else if (num >= 1e9) {
            return (num / 1e9).toFixed(2) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(2) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(2) + 'K';
        }
        return num.toLocaleString('en-US');
    }

})();

