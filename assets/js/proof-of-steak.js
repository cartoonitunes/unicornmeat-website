// Proof of Steak Season 2 loader with Season 1 archive fallback copy
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

    const PROOF_OF_STEAK_CONFIG = {
        currentSeason: {
            label: 'Season 2',
            contractAddress: '0x73ca70DBff82fCD269Eb37b1F437DfD7F5CD433e',
            rewardPoolDisplay: '750,000 w🍖',
            seasonLengthSeconds: 3888000
        },
        archiveSeason: {
            label: 'Season 1',
            contractAddress: '0x715d50635fE3CDe8A4b7f4601D266459bee60EcA'
        }
    };

    const PROOF_OF_STEAK_CONTRACT_ADDRESS = PROOF_OF_STEAK_CONFIG.currentSeason.contractAddress;
    const UNICORN_MEAT_TOKEN_ADDRESS = '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668'; // w🍖
    const READ_RPC_ENDPOINT = 'https://ethereum.publicnode.com'; // For read operations
    const WRITE_RPC_ENDPOINT = 'https://ethereum.publicnode.com'; // Fallback only — actual writes use the wallet provider

    // Public steaking UI opens May 1, 2026 at 00:00 US Eastern (EDT, UTC-4).
    const STEAKING_OPENS_MS = new Date('2026-05-01T04:00:00.000Z').getTime();
    let steakActionAllowed = false;

    function computeSteakActionAllowed(isStarted, nowSec, endTime) {
        if (Date.now() < STEAKING_OPENS_MS) {
            return false;
        }
        if (!isStarted) {
            return false;
        }
        if (endTime <= 0) {
            return false;
        }
        return nowSec < endTime;
    }

    function isBeforePublicSteakOpen() {
        return Date.now() < STEAKING_OPENS_MS;
    }

    function canSubmitSteakTransaction() {
        if (isBeforePublicSteakOpen()) {
            return false;
        }
        return steakActionAllowed;
    }

    function updateSteakButtonHint(steakBtn) {
        if (!steakBtn) {
            return;
        }
        if (!canSubmitSteakTransaction()) {
            if (isBeforePublicSteakOpen()) {
                steakBtn.title = 'Steaking opens May 1, 2026.';
            } else {
                steakBtn.title = 'Steaking is not available until the season is active on-chain.';
            }
        } else {
            steakBtn.title = '';
        }
    }

    function lockSteakButtonForGate() {
        const btn = document.getElementById('steak-btn');
        if (!btn) {
            return;
        }
        if (!canSubmitSteakTransaction()) {
            btn.disabled = true;
            updateSteakButtonHint(btn);
        }
    }

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

    let readProvider; // For read operations (public RPC)
    let writeProvider; // For write operations (uses wallet provider)
    let readContract; // Contract instance for read operations
    let writeContract; // Contract instance for write operations (uses wallet provider)
    let readTokenContract; // Token contract for read operations
    let writeTokenContract; // Token contract for write operations (uses wallet provider)
    let userAddress = null;
    let seasonEndTime = 0;
    let lastRefreshTime = 0;
    let baseProvider = null;
    let prevTotalSteaked = null;
    let stickyData = { stakerCount: '-', totalSteaked: '-', progressLabel: 'Season active' };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        init();
    });

    function init() {
        applySeasonCopy();
        lockSteakButtonForGate();

        if (!PROOF_OF_STEAK_CONTRACT_ADDRESS) {
            showSeasonPending();
            return;
        }

        // Wait for ethers.js to be available
        if (typeof window.ethers === 'undefined') {
            showError('Ethers.js library is required. Please refresh the page.');
            return;
        }

        // Set up read provider (public RPC) for read operations
        readProvider = new window.ethers.providers.JsonRpcProvider(READ_RPC_ENDPOINT);
        
        // Set up write provider (will use wallet provider when available, fallback to RPC)
        if (window.ethereum) {
            writeProvider = new window.ethers.providers.Web3Provider(window.ethereum);
            // Listen for account changes
            window.ethereum.on('accountsChanged', handleAccountsChanged);
        } else {
            writeProvider = new window.ethers.providers.JsonRpcProvider(WRITE_RPC_ENDPOINT);
        }

        // Create read contract instances (using public RPC for reads)
        readContract = new window.ethers.Contract(PROOF_OF_STEAK_CONTRACT_ADDRESS, PROOF_OF_STEAK_ABI, readProvider);
        readTokenContract = new window.ethers.Contract(UNICORN_MEAT_TOKEN_ADDRESS, ERC20_ABI, readProvider);
        
        // Create write contract instances (using wallet provider for writes)
        writeContract = new window.ethers.Contract(PROOF_OF_STEAK_CONTRACT_ADDRESS, PROOF_OF_STEAK_ABI, writeProvider);
        writeTokenContract = new window.ethers.Contract(UNICORN_MEAT_TOKEN_ADDRESS, ERC20_ABI, writeProvider);

        // Setup event listeners
        setupEventListeners();

        // Load initial data
        loadSteakData();

        // Check if wallet is already connected
        checkWalletConnection();

        // Auto-refresh every 30 seconds
        setInterval(function() {
            loadSteakData();
            if (userAddress) loadUserStats();
        }, 30000);
        // Live countdown ticker + last-refreshed label (every second)
        setInterval(function() {
            updateHeroCountdown();
            updateLastRefreshed();
        }, 1000);

        // Base chain provider for bridge detection
        baseProvider = new window.ethers.providers.JsonRpcProvider('https://mainnet.base.org');
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

        const maxBtn = document.getElementById('steak-max-btn');
        if (maxBtn) {
            maxBtn.addEventListener('click', handleMaxSteak);
        }

        const shareXBtn = document.getElementById('share-x-btn');
        if (shareXBtn) {
            shareXBtn.addEventListener('click', handleShareX);
        }

        const shareFcBtn = document.getElementById('share-fc-btn');
        if (shareFcBtn) {
            shareFcBtn.addEventListener('click', handleShareFarcaster);
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

            // Load general stats (using read contract with public RPC)
            const [totalSteaked, rewardPool, seasonStart, seasonEnd, seasonStarted, rewardPoolFunded, seasonLengthSeconds] = await Promise.all([
                readContract.totalSteaked(),
                readContract.rewardPool(),
                readContract.seasonStart(),
                readContract.seasonEnd(),
                readContract.seasonStarted(),
                readContract.rewardPoolFunded(),
                readContract.seasonLengthSeconds()
            ]);

            // Format and display in Season Information section
            const decimals = 3; // w🍖 has 3 decimals
            const totalSteakedFormatted = formatTokenAmount(totalSteaked, decimals) + ' w🍖';
            const totalSteakedEl = document.getElementById('total-steaked');
            if (prevTotalSteaked !== null && prevTotalSteaked !== totalSteakedFormatted) {
                totalSteakedEl.classList.remove('steak-pulse');
                void totalSteakedEl.offsetWidth; // force reflow to restart animation
                totalSteakedEl.classList.add('steak-pulse');
                setTimeout(() => totalSteakedEl.classList.remove('steak-pulse'), 1100);
            }
            prevTotalSteaked = totalSteakedFormatted;
            totalSteakedEl.textContent = totalSteakedFormatted;
            stickyData.totalSteaked = formatTokenAmount(totalSteaked, decimals);
            document.getElementById('reward-pool').textContent = formatTokenAmount(rewardPool, decimals) + ' w🍖';

            // Season info
            const now = Math.floor(Date.now() / 1000);
            const startTime = seasonStart.toNumber();
            const endTime = seasonEnd.toNumber();
            seasonEndTime = endTime;
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

            steakActionAllowed = computeSteakActionAllowed(isStarted, now, endTime);

            updateSeasonLiveCopy(statusText);

            document.getElementById('season-status').textContent = statusText;
            document.getElementById('season-start').textContent = startTime > 0 ? new Date(startTime * 1000).toLocaleString() : 'Not started';
            document.getElementById('season-end').textContent = endTime > 0 ? new Date(endTime * 1000).toLocaleString() : 'Not started';
            
            // Format season length
            const seasonLength = seasonLengthSeconds.toNumber();
            document.getElementById('season-length').textContent = formatSeasonLengthText(seasonLength);
            
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

            // Progress bar
            if (isStarted && startTime > 0) {
                updateProgressBar(startTime, endTime);
            }
            // Staker count
            loadStakerCount();
            // Update sticky bar with current data (staker count updates async when getLogs resolves)
            updateStickyBar();
            // Last refreshed
            lastRefreshTime = Math.floor(Date.now() / 1000);
            updateLastRefreshed();

            if (userAddress) {
                validateSteakAmount();
            } else {
                lockSteakButtonForGate();
            }
        } catch (error) {
            console.error('Error loading steak data:', error);
            hideLoading();
            showError('Failed to load staking information: ' + error.message);
        }
    }

    function updateSeasonLiveCopy(statusText) {
        const copyEl = document.getElementById('season-live-copy');
        if (!copyEl) return;

        if (statusText === 'Active') {
            copyEl.textContent = 'Season 2 is live with a 750,000 w🍖 reward pool over 45 days using the same mechanic as Season 1.';
            return;
        }

        if (statusText === 'Ended') {
            copyEl.textContent = 'Season 2 has ended. You can still unsteak and check final rewards below.';
            return;
        }

        if (statusText === 'Ready to Start') {
            copyEl.textContent = 'Season 2 is marinating on-chain. First steak kicks off the meat race.';
            return;
        }

        copyEl.textContent = 'Season 2 is not live on-chain yet. Check back soon for the live start.';
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
            // Get all user steak information and related data (using read contract with public RPC)
            const [steakInfo, balance, seasonEnd, seasonStarted, seasonStart, totalSteakTime, totalSteaked, rewardPool] = await Promise.all([
                readContract.steaks(userAddress),
                readTokenContract.balanceOf(userAddress),
                readContract.seasonEnd(),
                readContract.seasonStarted(),
                readContract.seasonStart(),
                readContract.totalSteakTime(),
                readContract.totalSteaked(),
                readContract.rewardPool()
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

            // Eligibility warning
            const eligibilityDiv = document.getElementById('steak-eligibility-status');
            if (eligibilityDiv && !userSteakAmount.isZero()) {
                if (userSteakAmount.lt(userMaxAmount)) {
                    const deficit = userMaxAmount.sub(userSteakAmount);
                    eligibilityDiv.className = 'steak-eligibility-warning mt-2 mb-2';
                    eligibilityDiv.innerHTML = `⚠️ <strong>Off the grill!</strong> You've dropped below your peak of ${formatTokenAmount(userMaxAmount, decimals)} w🍖. Steak at least ${formatTokenAmount(deficit, decimals)} more to stay eligible for the feast.`;
                } else {
                    eligibilityDiv.className = 'steak-eligibility-ok mt-2 mb-2';
                    eligibilityDiv.innerHTML = `✅ <strong>Well done!</strong> Your steak is eligible for the feast.`;
                }
                eligibilityDiv.classList.remove('d-none');
            } else if (eligibilityDiv) {
                eligibilityDiv.classList.add('d-none');
            }

            // Format last update timestamp
            const lastUpdateTime = lastUpdate.toNumber();
            if (lastUpdateTime > 0) {
                const durationSecs = now - lastUpdateTime;
                document.getElementById('user-last-update').textContent = formatSteakingDuration(durationSecs) + ' ago';
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
            const pendingEl = document.getElementById('user-pending-reward');
            if (simulatedPendingReward.gt(0)) {
                pendingEl.textContent = formatTokenAmount(simulatedPendingReward, decimals) + ' w🍖';
            } else if (isSeasonEnded) {
                pendingEl.textContent = '0 w🍖 (Not eligible — see requirements above)';
            } else if (simulatedUserSteakTime.gt(0) && simulatedTotalSteakTime.gt(0)) {
                const estBN = rewardPoolBN.mul(simulatedUserSteakTime).div(simulatedTotalSteakTime);
                pendingEl.textContent = '~' + formatTokenAmount(estBN, decimals) + ' w🍖 (estimated)';
            } else {
                pendingEl.textContent = '0 w🍖 (Steak to start earning)';
            }
            
            document.getElementById('user-claimed').textContent = steakInfo.claimed ? 'Yes' : 'No';
            document.getElementById('user-meat-balance').textContent = formatTokenAmount(balance, decimals);

            // Check if user has Base w🍖 they should bridge over
            checkBaseBridgeNeeded(balance).catch(() => {});

            showUserStats();

            // Show share section if user has steaked
            const shareSection = document.getElementById('steak-share-section');
            if (shareSection && !userSteakAmount.isZero()) {
                shareSection.classList.remove('d-none');
            }

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
            if (steakBtn) {
                steakBtn.disabled = true;
                updateSteakButtonHint(steakBtn);
            }
            return;
        }

        if (!canSubmitSteakTransaction()) {
            steakBtn.disabled = true;
            updateSteakButtonHint(steakBtn);
            return;
        }

        const amount = parseFloat(amountInput.value);
        
        if (!amount || amount <= 0 || isNaN(amount)) {
            steakBtn.disabled = true;
            updateSteakButtonHint(steakBtn);
            return;
        }

        try {
            // Use read contract for balance check
            const balance = await readTokenContract.balanceOf(userAddress);
            const decimals = 3;
            const amountWei = window.ethers.utils.parseUnits(amount.toString(), decimals);
            
            const balanceBN = balance._hex ? window.ethers.BigNumber.from(balance._hex) : balance;
            if (amountWei.gt(balanceBN)) {
                steakBtn.disabled = true;
                updateSteakButtonHint(steakBtn);
                return;
            }

            steakBtn.disabled = false;
            updateSteakButtonHint(steakBtn);
        } catch (error) {
            steakBtn.disabled = true;
            updateSteakButtonHint(steakBtn);
        }
    }

    async function handleSteak() {
        const amountInput = document.getElementById('steak-amount');
        const steakBtn = document.getElementById('steak-btn');
        
        if (!amountInput || !steakBtn || !userAddress) {
            showError('Please connect your wallet first');
            return;
        }

        if (!canSubmitSteakTransaction()) {
            if (isBeforePublicSteakOpen()) {
                showError('Steaking opens May 1, 2026.');
            } else {
                showError('Steaking is not available until the season is active on-chain.');
            }
            return;
        }

        const amount = parseFloat(amountInput.value);
        if (!amount || amount <= 0 || isNaN(amount)) {
            showError('Please enter a valid amount');
            return;
        }

        let signer;
        if (window.unicornMeatWalletKit && window.unicornMeatWalletKit.isConnected && window.unicornMeatWalletKit.signer) {
            signer = window.unicornMeatWalletKit.signer;
        } else if (window.ethereum) {
            const walletProvider = new window.ethers.providers.Web3Provider(window.ethereum);
            signer = walletProvider.getSigner();
        } else {
            showError('Please connect your wallet to steak');
            return;
        }

        try {
            steakBtn.disabled = true;
            showTransactionStatus('Preparing transaction...');
            const contractWithSigner = writeContract.connect(signer);
            const tokenContractWithSigner = writeTokenContract.connect(signer);

            const decimals = 3;
            const amountWei = window.ethers.utils.parseUnits(amount.toString(), decimals);

            // Check balance (using read contract)
            const balance = await readTokenContract.balanceOf(userAddress);
            const balanceBN = balance._hex ? window.ethers.BigNumber.from(balance._hex) : balance;
            if (amountWei.gt(balanceBN)) {
                throw new Error('Insufficient balance');
            }

            // Check and handle approval (using read contract for check, write contract for transaction)
            const allowance = await readTokenContract.allowance(userAddress, PROOF_OF_STEAK_CONTRACT_ADDRESS);
            const allowanceBN = allowance._hex ? window.ethers.BigNumber.from(allowance._hex) : allowance;
            if (allowanceBN.lt(amountWei)) {
                showTransactionStatus('Approval needed. Please approve in your wallet...');
                const approveTx = await tokenContractWithSigner.approve(PROOF_OF_STEAK_CONTRACT_ADDRESS, amountWei);
                showTransactionStatus('Waiting for approval confirmation...');
                await approveTx.wait();
            }

            // Execute steak (using write contract with signer)
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
            await validateSteakAmount();
        }
    }

    async function handleUnsteak() {
        const unsteakBtn = document.getElementById('unsteak-btn');
        
        if (!unsteakBtn || !userAddress) {
            showError('Please connect your wallet first');
            return;
        }

        let signer;
        if (window.unicornMeatWalletKit && window.unicornMeatWalletKit.isConnected && window.unicornMeatWalletKit.signer) {
            signer = window.unicornMeatWalletKit.signer;
        } else if (window.ethereum) {
            const walletProvider = new window.ethers.providers.Web3Provider(window.ethereum);
            signer = walletProvider.getSigner();
        } else {
            showError('Please connect your wallet to unsteak');
            return;
        }

        try {
            unsteakBtn.disabled = true;
            showTransactionStatus('Preparing unsteak transaction...');
            const contractWithSigner = writeContract.connect(signer);

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

    function applySeasonCopy() {
        const currentAddress = document.getElementById('proof-of-steak-current-address');
        const currentLink = document.getElementById('proof-of-steak-current-address-link');
        const archiveLink = document.getElementById('proof-of-steak-archive-link');

        if (currentAddress) {
            currentAddress.textContent = PROOF_OF_STEAK_CONTRACT_ADDRESS;
        }

        if (currentLink) {
            currentLink.href = `https://etherscan.io/address/${PROOF_OF_STEAK_CONTRACT_ADDRESS}`;
            currentLink.textContent = PROOF_OF_STEAK_CONTRACT_ADDRESS;
        }

        if (archiveLink) {
            archiveLink.href = `https://etherscan.io/address/${PROOF_OF_STEAK_CONFIG.archiveSeason.contractAddress}#code`;
            archiveLink.textContent = PROOF_OF_STEAK_CONFIG.archiveSeason.contractAddress;
        }
    }

    function showSeasonPending() {
        steakActionAllowed = false;
        hideLoading();
        showSteakInfo();
        hideSteakActions();
        hideUserStats();
        hideTransactionStatus();

        const connectSection = document.getElementById('steak-connect-wallet');
        if (connectSection) {
            connectSection.style.display = 'none';
        }

        const note = document.getElementById('steak-deployment-note');
        if (note) {
            note.classList.remove('d-none');
        }

        const statsMessage = document.getElementById('steak-stats-not-logged-in');
        if (statsMessage) {
            statsMessage.innerHTML = '<p class="fs-7 sm:fs-6 mb-0">Season 2 wallet actions will appear here once the contract is deployed.</p>';
        }

        document.getElementById('season-status').textContent = 'Awaiting deployment';
        document.getElementById('season-length').textContent = formatSeasonLengthText(PROOF_OF_STEAK_CONFIG.currentSeason.seasonLengthSeconds);
        document.getElementById('season-start').textContent = 'TBD';
        document.getElementById('season-end').textContent = 'TBD';
        document.getElementById('time-remaining').textContent = 'Not live yet';
        document.getElementById('total-steaked').textContent = '0 w🍖';
        document.getElementById('reward-pool').textContent = PROOF_OF_STEAK_CONFIG.currentSeason.rewardPoolDisplay;
        updateSeasonLiveCopy('Awaiting deployment');

        const steakBtnPending = document.getElementById('steak-btn');
        if (steakBtnPending) {
            steakBtnPending.disabled = true;
            updateSteakButtonHint(steakBtnPending);
        }
    }

    function formatSeasonLengthText(seasonLength) {
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
        return seasonLengthText;
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
            const linkedMsg = message.replace(
                /Transaction: (0x[0-9a-fA-F]{64})/,
                'Transaction: <a href="https://etherscan.io/tx/$1" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; word-break: break-all;">$1</a>'
            );
            div.innerHTML = `<i class="icon icon-check me-2"></i>${linkedMsg}`;
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

    function formatSteakingDuration(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days} day${days !== 1 ? 's' : ''}, ${hours} hr${hours !== 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hr${hours !== 1 ? 's' : ''}, ${minutes} min`;
        return `${minutes} min`;
    }

    function updateProgressBar(startTime, endTime) {
        const now = Math.floor(Date.now() / 1000);
        const total = endTime - startTime;
        const elapsed = Math.min(Math.max(now - startTime, 0), total);
        const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
        const dayNum = Math.min(Math.floor(elapsed / 86400) + 1, Math.ceil(total / 86400));
        const totalDays = Math.ceil(total / 86400);

        const bar = document.getElementById('season-progress-bar');
        const label = document.getElementById('season-progress-label');
        const pctEl = document.getElementById('season-progress-pct');
        if (bar) bar.style.width = pct + '%';
        if (label) label.textContent = `Day ${dayNum} of ${totalDays}`;
        if (pctEl) pctEl.textContent = pct + '%';
        stickyData.progressLabel = `Day ${dayNum} of ${totalDays}`;
    }

    async function loadStakerCount() {
        // Contract deployed at block ~24,988,224; fromBlock:0 causes node to reject the range
        const DEPLOY_BLOCK = 24988000;
        try {
            const topic = window.ethers.utils.id('Steaked(address,uint256)');
            const logs = await readProvider.getLogs({
                address: PROOF_OF_STEAK_CONTRACT_ADDRESS,
                topics: [topic],
                fromBlock: DEPLOY_BLOCK,
                toBlock: 'latest'
            });
            const unique = new Set(logs.map(l => l.topics[1]));
            const el = document.getElementById('staker-count');
            if (el) el.textContent = unique.size + ' on the grill';
            stickyData.stakerCount = unique.size.toString();
            updateStickyBar();
        } catch (e) {
            console.warn('loadStakerCount failed:', e);
        }
    }

    function updateHeroCountdown() {
        const countdownEl = document.getElementById('hero-countdown');
        const countdownText = document.getElementById('hero-countdown-text');
        if (!countdownEl || !countdownText || seasonEndTime === 0) return;

        const now = Math.floor(Date.now() / 1000);
        if (now >= seasonEndTime) {
            countdownEl.classList.remove('d-none');
            countdownText.textContent = 'Season ended';
            return;
        }
        const remaining = seasonEndTime - now;
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;
        countdownText.textContent = `${days}d ${hours}h ${minutes}m ${secs}s`;
        countdownEl.classList.remove('d-none');
    }

    function updateLastRefreshed() {
        const el = document.getElementById('last-refreshed-label');
        if (!el || lastRefreshTime === 0) return;
        const ago = Math.floor(Date.now() / 1000) - lastRefreshTime;
        el.textContent = ago < 5 ? 'Just refreshed' : `Updated ${ago}s ago`;
    }

    async function handleMaxSteak() {
        if (!userAddress) return;
        try {
            const balance = await readTokenContract.balanceOf(userAddress);
            const decimals = 3;
            const formatted = window.ethers.utils.formatUnits(balance, decimals);
            const input = document.getElementById('steak-amount');
            if (input) {
                input.value = parseFloat(formatted).toFixed(decimals);
                input.dispatchEvent(new Event('input'));
            }
        } catch (e) {
            // Ignore
        }
    }

    function handleShareX() {
        const amountEl = document.getElementById('user-steaked-amount');
        const amount = amountEl ? amountEl.textContent.trim() : '';
        const text = amount
            ? `I'm steaking ${amount} on the grill! 🔥🥩 Join the Unicorn Meat Proof of Steak Season 2 — 750,000 w🍖 reward pool. #UnicornMeat #ProofOfSteak`
            : `I'm on the grill! 🔥🥩 Unicorn Meat Proof of Steak Season 2 is live — 750,000 w🍖 reward pool. #UnicornMeat #ProofOfSteak`;
        const url = 'https://unicornmeat.xyz/steak';
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer');
    }

    function handleShareFarcaster() {
        const amountEl = document.getElementById('user-steaked-amount');
        const amount = amountEl ? amountEl.textContent.trim() : '';
        const text = amount
            ? `I'm steaking ${amount} on the grill! 🔥🥩 Unicorn Meat Proof of Steak Season 2 is live — 750,000 w🍖 reward pool. https://unicornmeat.xyz/steak`
            : `I'm on the grill! 🔥🥩 Unicorn Meat Proof of Steak Season 2 — 750,000 w🍖 reward pool. https://unicornmeat.xyz/steak`;
        window.open('https://warpcast.com/~/compose?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    }

    function updateStickyBar() {
        const sEl = document.getElementById('sticky-staker-count');
        const tEl = document.getElementById('sticky-total-steaked');
        const pEl = document.getElementById('sticky-progress-label');
        if (sEl) sEl.textContent = stickyData.stakerCount;
        if (tEl) tEl.textContent = stickyData.totalSteaked;
        if (pEl) pEl.textContent = stickyData.progressLabel;
    }

    async function checkBaseBridgeNeeded(l1Balance) {
        if (!userAddress || !baseProvider) return;
        try {
            const baseMeatContract = new window.ethers.Contract(
                '0xa0ff87054690e4a367aeec61d1f13fd712f66a2c',
                ERC20_ABI,
                baseProvider
            );
            const baseBalance = await baseMeatContract.balanceOf(userAddress);
            const callout = document.getElementById('base-bridge-callout');
            if (!callout) return;
            if (baseBalance.gt(0) && baseBalance.gt(l1Balance)) {
                document.getElementById('base-balance-display').textContent =
                    formatTokenAmount(baseBalance, 3);
                callout.classList.remove('d-none');
            } else {
                callout.classList.add('d-none');
            }
        } catch (e) {
            // Non-critical, ignore
        }
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

