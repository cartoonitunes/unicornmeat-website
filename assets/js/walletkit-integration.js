// WalletKit Integration for Unicorn Meat
// Uses Reown WalletKit for reliable wallet connections

class UnicornMeatWalletKit {
    constructor() {
        this.account = null;
        this.isConnected = false;
        this.provider = null;
        this.signer = null;
        this.walletKit = null;
        
        // Contract addresses
        this.contractAddresses = {
            unicornMeat: '0xED6aC8de7c7CA7e3A22952e09C2a2A1232DDef9A',
            wrappedUnicornMeat: '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668'
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Check if ethers.js is loaded
            if (typeof window.ethers === 'undefined') {
                // Wait a bit for scripts to load
                setTimeout(() => {
                    if (typeof window.ethers === 'undefined') {
                        // Ethers.js still not loaded after timeout
                    }
                }, 2000);
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize WalletKit
            await this.initializeWalletKit();
            
            // Check for existing wallet connections
            this.checkExistingConnections();

        } catch (error) {
            // Silently handle initialization errors
        }
    }
    
    async initializeWalletKit() {
        try {
            // Check if WalletKit is available
            if (typeof window.WalletKit === 'undefined') {
                this.createFallbackModal();
                return;
            }
            
            // Initialize WalletKit with your project ID
            this.walletKit = new window.WalletKit({
                projectId: '9b141d20f1851bc0bed6d70a31130908', // Your WalletConnect Project ID
                chains: ['eip155:1'], // Ethereum mainnet
                walletConnectOptions: {
                    metadata: {
                        name: 'Unicorn Meat',
                        description: 'A magical coin made by Ethereum in March 2016',
                        url: window.location.origin,
                        icons: ['https://your-domain.com/icon.png']
                    }
                }
            });
            
            // Listen for connection events
            this.walletKit.on('connect', (account) => {
                this.handleConnection(account);
            });
            
            this.walletKit.on('disconnect', () => {
                this.handleDisconnection();
            });
            
            console.log('WalletKit initialized successfully');
            
        } catch (error) {
            console.error('Error initializing WalletKit:', error);
            this.createFallbackModal();
        }
    }
    
    createFallbackModal() {
        // Create a fallback modal that looks like WalletKit
        const modal = document.createElement('div');
        modal.id = 'walletkit-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            border-radius: 20px;
            padding: 24px;
            min-width: 400px;
            max-width: 90vw;
            color: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        `;
        
        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Connect a Wallet</h2>
                <button id="close-walletkit-modal" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                <button class="wallet-option" data-wallet="metamask" style="
                    background: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 12px;
                    padding: 16px;
                    color: white;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="width: 32px; height: 32px; background: #f6851b; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">🦊</div>
                    <div>
                        <div style="font-weight: 600;">MetaMask</div>
                        <div style="font-size: 12px; color: #888;">Popular</div>
                    </div>
                </button>
                
                <button class="wallet-option" data-wallet="walletconnect" style="
                    background: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 12px;
                    padding: 16px;
                    color: white;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="width: 32px; height: 32px; background: #3396ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">W</div>
                    <div>
                        <div style="font-weight: 600;">WalletConnect</div>
                        <div style="font-size: 12px; color: #888;">Mobile</div>
                    </div>
                </button>
                
                <button class="wallet-option" data-wallet="coinbase" style="
                    background: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 12px;
                    padding: 16px;
                    color: white;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="width: 32px; height: 32px; background: #0052ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">C</div>
                    <div>
                        <div style="font-weight: 600;">Coinbase</div>
                        <div style="font-size: 12px; color: #888;">Exchange</div>
                    </div>
                </button>
                
                <button class="wallet-option" data-wallet="rainbow" style="
                    background: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 12px;
                    padding: 16px;
                    color: white;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3); border-radius: 8px;"></div>
                    <div>
                        <div style="font-weight: 600;">Rainbow</div>
                        <div style="font-size: 12px; color: #888;">Mobile</div>
                    </div>
                </button>
            </div>
            
            <div style="border-top: 1px solid #3a3a3a; padding-top: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">What is a Wallet?</h3>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #888; line-height: 1.5;">
                    A wallet is used to send, receive, store, and display digital assets. It's also a new way to log in, without needing to create new accounts and passwords on every website.
                </p>
                <div style="display: flex; gap: 12px;">
                    <button onclick="window.open('https://metamask.io/download/', '_blank')" style="
                        background: #0052ff;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 16px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 14px;
                    ">Get a Wallet</button>
                    <button onclick="window.open('https://ethereum.org/en/wallets/', '_blank')" style="
                        background: transparent;
                        border: 1px solid #3a3a3a;
                        border-radius: 8px;
                        padding: 12px 16px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 14px;
                    ">Learn More</button>
                </div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('close-walletkit-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Add wallet option listeners
        const walletOptions = modal.querySelectorAll('.wallet-option');
        walletOptions.forEach(option => {
            option.addEventListener('click', () => {
                const wallet = option.dataset.wallet;
                this.handleWalletSelection(wallet);
                modal.style.display = 'none';
            });
            
            // Add hover effects
            option.addEventListener('mouseenter', () => {
                option.style.background = '#3a3a3a';
                option.style.borderColor = '#4a4a4a';
            });
            
            option.addEventListener('mouseleave', () => {
                option.style.background = '#2a2a2a';
                option.style.borderColor = '#3a3a3a';
            });
        });
        
        this.walletkitModal = modal;
    }
    
    handleWalletSelection(wallet) {
        if (this.walletKit) {
            // Use WalletKit if available
            this.walletKit.connect({ wallet });
        } else {
            // Fallback to direct MetaMask
            switch (wallet) {
                case 'metamask':
                    this.connectWithMetaMask();
                    break;
                case 'walletconnect':
                    this.showError('WalletConnect integration coming soon! For now, please use MetaMask.');
                    break;
                case 'coinbase':
                    this.showError('Coinbase Wallet integration coming soon! For now, please use MetaMask.');
                    break;
                case 'rainbow':
                    this.showError('Rainbow Wallet integration coming soon! For now, please use MetaMask.');
                    break;
                default:
                    this.showError('Unknown wallet selected');
            }
        }
    }
    
    async handleConnection(account) {
        this.account = account;
        this.isConnected = true;
        
        await this.updateConnectButton();
        this.showSuccess('Wallet connected successfully!');
        this.loadContractData();
    }
    
    async handleDisconnection() {
        this.account = null;
        this.isConnected = false;
        
        await this.updateConnectButton();
        this.showSuccess('Wallet disconnected');
    }
    
    setupEventListeners() {
        // Listen for clicks on connect wallet buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.connect-wallet-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.openWalletModal();
            }
        });
        
        // Wrap button
        const wrapButton = document.getElementById('wrap-button');
        if (wrapButton) {
            wrapButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isConnected) {
                    this.showWrapError('Please connect your wallet first');
                    return;
                }
                this.wrapTokens();
            });
        }
        
        // Unwrap button
        const unwrapButton = document.getElementById('unwrap-button');
        if (unwrapButton) {
            unwrapButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isConnected) {
                    this.showWrapError('Please connect your wallet first');
                    return;
                }
                this.unwrapTokens();
            });
        }
        
    }
    
    openWalletModal() {
        // Check if already connected
        if (this.isConnected && this.account) {
            this.showConnectionInfoModal();
        } else {
            // Go directly to MetaMask connection
            this.connectWithMetaMask();
        }
    }
    
    showSimpleWalletModal() {
        const modal = document.getElementById('magicFeaturesModal');
        if (modal) {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = `
                    <h2 class="h4 sm:h3 xl:h2 m-0 -rotate-1 text-uppercase ls-0 mb-3">Connect Wallet</h2>
                    <div class="fs-3 mb-3">🦄🍖</div>
                    <p class="fs-5 xl:fs-4 mb-4">Choose your wallet to connect:</p>
                    
                    <div class="vstack gap-3">
                        <button class="btn btn-md btn-secondary border border-2 border-black contrast-shadow-sm" onclick="window.unicornMeatWalletKit.connectWithMetaMask()">
                            <span>🦊 MetaMask</span>
                        </button>
                        <button class="btn btn-md btn-primary border border-2 border-black contrast-shadow-sm" onclick="window.open('https://walletconnect.com/', '_blank')">
                            <span>📱 WalletConnect</span>
                        </button>
                        <button class="btn btn-md btn-success border border-2 border-black contrast-shadow-sm" onclick="window.open('https://metamask.io/download/', '_blank')">
                            <span>📥 Install MetaMask</span>
                        </button>
                    </div>
                    
                    <div class="mt-3">
                        <small class="text-muted">Don't have a wallet? Install MetaMask or try WalletConnect!</small>
                    </div>
                `;
            }
        }
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }
    
    async showConnectionInfoModal() {
        const modal = document.getElementById('magicFeaturesModal');
        if (modal) {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                const truncatedAddress = `${this.account.address.slice(0, 6)}...${this.account.address.slice(-4)}`;
                
                // Show loading state first
                modalBody.innerHTML = `
                    <h2 class="h4 sm:h3 xl:h2 m-0 -rotate-1 text-uppercase ls-0 mb-3">🦄 Wallet Connected!</h2>
                    <div class="fs-3 mb-3">🍖</div>
                    
                    <div class="text-center mb-4">
                        <div class="alert alert-success border border-2 border-black contrast-shadow-sm mb-3">
                            <strong>Address:</strong> ${truncatedAddress}
                        </div>
                        <div class="alert alert-info border border-2 border-black contrast-shadow-sm mb-3">
                            <strong>Wrapped Unicorn Meat Balance:</strong> Loading...
                        </div>
                    </div>
                    
                    <div class="text-center d-flex gap-2 justify-content-center">
                        <button class="btn btn-md btn-danger border border-2 border-black contrast-shadow-md px-4" onclick="window.unicornMeatWalletKit.disconnectWallet()">
                            <i class="icon icon-times me-2"></i>Disconnect
                        </button>
                        <button class="btn btn-md btn-success border border-2 border-black contrast-shadow-md px-4" onclick="window.unicornMeatWalletKit.closeModal()">
                            <i class="icon icon-check me-2"></i>Sweet!
                        </button>
                    </div>
                    
                    <div class="mt-3 text-center">
                        <small class="text-muted">Your wallet is connected and ready to use!</small>
                    </div>
                `;
                
                // Load balance asynchronously
                try {
                    const balance = await this.getWrappedBalance();
                    const formattedBalance = this.formatLargeNumber(balance);
                    const balanceElement = modalBody.querySelector('.alert-info');
                    if (balanceElement) {
                        balanceElement.innerHTML = `<strong>Unicorn Meat Balance:</strong> ${formattedBalance} w🍖`;
                    }
                } catch (error) {
                    console.error('Error loading balance:', error);
                    const balanceElement = modalBody.querySelector('.alert-info');
                    if (balanceElement) {
                        balanceElement.innerHTML = `<strong>Wrapped Unicorn Meat Balance:</strong> Error loading balance`;
                    }
                }
            }
        }
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }
    
    async connectWithMetaMask() {
        try {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.account = { address: accounts[0] };
                this.isConnected = true;
                
                // Try to set up ethers if available
                if (typeof window.ethers !== 'undefined') {
                    this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
                    this.signer = this.provider.getSigner();
                }
                
                await this.updateConnectButton();
                const truncatedAddress = `${this.account.address.slice(0, 6)}...${this.account.address.slice(-4)}`;
                this.showSuccess(`Connected to ${truncatedAddress}!`);
                this.loadContractData();

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('magicFeaturesModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                this.showError('No wallet detected. Please install a Web3 wallet like MetaMask, WalletConnect, or another compatible wallet.');
            }
        } catch (error) {
            console.error('Error connecting with MetaMask:', error);
            this.showError('Failed to connect with MetaMask: ' + error.message);
        }
    }
    
    disconnectWallet() {
        // Reset connection state
        this.account = null;
        this.isConnected = false;
        this.provider = null;
        this.signer = null;
        
        // Update the connect button
        this.updateConnectButton();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('magicFeaturesModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show disconnect message
        this.showSuccess('Wallet disconnected successfully!');
        
        // Also update subdomain claimer if it exists
        if (window.subdomainClaimer) {
            window.subdomainClaimer.disconnectWallet();
        }
    }
    
    closeModal() {
        // Simply close the modal without any other actions
        const modal = bootstrap.Modal.getInstance(document.getElementById('magicFeaturesModal'));
        if (modal) {
            modal.hide();
        }
    }
    
    checkExistingConnections() {
        // Check if MetaMask is already connected
        if (typeof window.ethereum !== 'undefined' && window.ethereum.selectedAddress) {
            this.account = { address: window.ethereum.selectedAddress };
            this.isConnected = true;
            
            // Set up ethers if available
            if (typeof window.ethers !== 'undefined') {
                this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
                this.signer = this.provider.getSigner();
            }
            
            // Update the connect button to show balance
            this.updateConnectButton();
            
            // Load contract data
            this.loadContractData();

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.handleDisconnection();
                } else {
                    this.account = { address: accounts[0] };
                    this.updateConnectButton();
                    this.loadContractData();
                }
            });
        }
    }
    
    async loadContractData() {
        if (!this.isConnected || !this.account) return;
        
        try {
            const unicornMeatBalance = await this.getUnicornMeatBalance();
            const wrappedBalance = await this.getWrappedBalance();
            
            this.updateBalances(unicornMeatBalance, wrappedBalance);
            
        } catch (error) {
            console.error('Error loading contract data:', error);
        }
    }
    
    formatLargeNumber(num) {
        // Handle invalid inputs
        if (!num || isNaN(num) || num === undefined || num === null) {
            return 'your';
        }
        
        // Convert from smallest unit to token unit (3 decimals)
        const tokenAmount = num / 1000; // 3 decimals = 1,000
        
        if (tokenAmount >= 1000000) {
            return (tokenAmount / 1000000).toFixed(1) + 'M';
        } else if (tokenAmount >= 1000) {
            return (tokenAmount / 1000).toFixed(1) + 'K';
        } else {
            return tokenAmount.toFixed(0);
        }
    }
    
    async getUnicornMeatBalance() {
        if (!this.isConnected || !this.account || !this.provider) return '0';

        try {
            const UNICORN_MEAT_CONTRACT = '0xED6aC8de7c7CA7e3A22952e09C2a2A1232DDef9A';
            const balanceOfABI = [
                {
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ];

            const contract = new window.ethers.Contract(UNICORN_MEAT_CONTRACT, balanceOfABI, this.provider);
            const balance = await contract.balanceOf(this.account.address);
            return balance.toString();
        } catch (error) {
            console.error('Error getting Unicorn Meat balance:', error);
            return '0';
        }
    }
    
    async getWrappedBalance() {
        if (!this.isConnected || !this.account || !this.provider) return '0';

        try {
            const WRAPPED_CONTRACT = '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668';
            const balanceOfABI = [
                {
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ];

            const contract = new window.ethers.Contract(WRAPPED_CONTRACT, balanceOfABI, this.provider);
            const balance = await contract.balanceOf(this.account.address);
            return balance.toString();
        } catch (error) {
            console.error('Error getting wrapped balance:', error);
            return '0';
        }
    }
    
    async getUnicornsBalance() {
        if (!this.isConnected || !this.account || !this.provider) return '0';
        
        try {
            // Unicorns contract (0 decimals)
            const UNICORNS_CONTRACT = '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7';
            const unicornsABI = [
                {
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ];
            
            const contract = new window.ethers.Contract(UNICORNS_CONTRACT, unicornsABI, this.provider);
            const balance = await contract.balanceOf(this.account.address);
            return balance.toString();
        } catch (error) {
            console.error('Error getting Unicorns balance:', error);
            return '0';
        }
    }
    
    async getWrappedUnicornsBalance() {
        if (!this.isConnected || !this.account || !this.provider) return '0';
        
        try {
            // Wrapped Unicorns contract (0 decimals)
            const WRAPPED_UNICORNS_CONTRACT = '0x38a9af1bd00f9988977095b31eb18d6d3d5dca00';
            const wrappedUnicornsABI = [
                {
                    "constant": true,
                    "inputs": [{"name": "owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "", "type": "uint256"}],
                    "type": "function"
                }
            ];
            
            const contract = new window.ethers.Contract(WRAPPED_UNICORNS_CONTRACT, wrappedUnicornsABI, this.provider);
            const balance = await contract.balanceOf(this.account.address);
            return balance.toString();
        } catch (error) {
            console.error('Error getting Wrapped Unicorns balance:', error);
            return '0';
        }
    }
    
    async getBaseMeatBalance() {
        if (!this.isConnected || !this.account) return '0';
        
        try {
            // Base meat contract on Base network (likely 3 decimals like other meat contracts)
            const BASE_MEAT_CONTRACT = '0xa0ff877E3d4f3a108B1B3d5eB3e4369301D2b2D7';
            const baseMeatABI = [
                {
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ];
            
            // Use Base network provider (Base uses same EVM structure)
            // Public Base RPC endpoint with timeout
            const baseProvider = new window.ethers.providers.JsonRpcProvider('https://mainnet.base.org');
            const contract = new window.ethers.Contract(BASE_MEAT_CONTRACT, baseMeatABI, baseProvider);
            
            // Add timeout to prevent hanging
            const balancePromise = contract.balanceOf(this.account.address);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Base network timeout')), 5000)
            );
            
            const balance = await Promise.race([balancePromise, timeoutPromise]);
            const balanceStr = balance.toString();
            
            // Validate the result is a valid number string
            if (!balanceStr || isNaN(balanceStr) || balanceStr === 'NaN' || balanceStr === 'undefined') {
                console.warn('Invalid Base meat balance returned:', balanceStr);
                return '0';
            }
            
            return balanceStr;
        } catch (error) {
            console.error('Error getting Base meat balance:', error);
            return '0';
        }
    }
    
    async wrapTokens() {
        if (!this.isConnected || !this.account) {
            this.showWrapError('Please connect your wallet first');
            return;
        }
        
        const amount = document.getElementById('wrap-unwrap-amount').value;
        if (!amount || amount <= 0) {
            this.showWrapError('Please enter a valid amount');
            return;
        }
        
        try {
            this.showLoading('Checking balance...');
            
            // Get provider and signer
            const provider = new window.ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            
            // Convert amount to wei (3 decimals like original contract)
            const amountWei = window.ethers.utils.parseUnits(amount.toString(), 3);
            
            // Use the full ABI for better compatibility
            const originalContractABI = [
                {"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},
                {"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"type":"function"},
                {"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"type":"function"},
                {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
                {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},
                {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"type":"function"},
                {"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"},
                {"constant":false,"inputs":[{"name":"target","type":"address"},{"name":"mintedAmount","type":"uint256"}],"name":"mintToken","outputs":[],"type":"function"},
                {"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"type":"function"},
                {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
                {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[],"type":"function"},
                {"constant":true,"inputs":[{"name":"","type":"address"}],"name":"frozenAccount","outputs":[{"name":"","type":"bool"}],"type":"function"},
                {"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"spentAllowance","outputs":[{"name":"","type":"uint256"}],"type":"function"},
                {"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"type":"function"},
                {"constant":false,"inputs":[{"name":"target","type":"address"},{"name":"freeze","type":"bool"}],"name":"freezeAccount","outputs":[],"type":"function"},
                {"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"type":"function"}
            ];
            
            // Create contract instance
            const originalContract = new window.ethers.Contract(this.contractAddresses.unicornMeat, originalContractABI, signer);
            
            // Check if user has enough tokens to wrap
            const balance = await originalContract.balanceOf(this.account.address);
            if (balance.lt(amountWei)) {
                this.showWrapError(`Insufficient balance. You have ${this.formatLargeNumber(balance)} tokens, but trying to wrap ${amount} tokens.`);
                return;
            }
            
            this.showLoading('Wrapping tokens using approveAndCall...');
            
            // Use approveAndCall on the original contract
            // This will call receiveApproval on the wrapped contract
            const wrapTx = await originalContract.approveAndCall(
                this.contractAddresses.wrappedUnicornMeat,  // _spender: wrapped contract address
                amountWei                                   // _value: amount to wrap
            );
            await wrapTx.wait();
            
            this.showWrapSuccess(`Successfully wrapped ${amount} Unicorn Meat tokens! Transaction: ${wrapTx.hash}`);
            await this.loadContractData();
            await this.updateConnectButton();
            
        } catch (error) {
            console.error('Error wrapping tokens:', error);
            if (error.code === 4001) {
                this.showWrapError('Transaction was rejected by user');
            } else if (error.message && error.message.includes('insufficient funds')) {
                this.showWrapError('Insufficient ETH for gas fees. Please add more ETH to your wallet.');
            } else {
                this.showWrapError('Failed to wrap tokens: ' + error.message);
            }
        }
    }
    
    async unwrapTokens() {
        if (!this.isConnected || !this.account) {
            this.showWrapError('Please connect your wallet first');
            return;
        }
        
        const amount = document.getElementById('wrap-unwrap-amount').value;
        if (!amount || amount <= 0) {
            this.showWrapError('Please enter a valid amount');
            return;
        }
        
        try {
            this.showLoading('Unwrapping tokens...');
            
            // Get provider and signer
            const provider = new window.ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            
            // Convert amount to wei (3 decimals like original contract)
            const amountWei = window.ethers.utils.parseUnits(amount.toString(), 3);
            
            // Wrapped contract ABI (unwrap function)
            const wrappedContractABI = [
                {
                    "constant": false,
                    "inputs": [
                        {"name": "_value", "type": "uint256"}
                    ],
                    "name": "unwrap",
                    "outputs": [],
                    "type": "function"
                }
            ];
            
            // Create contract instance
            const wrappedContract = new window.ethers.Contract(this.contractAddresses.wrappedUnicornMeat, wrappedContractABI, signer);
            
            // Unwrap the tokens
            const unwrapTx = await wrappedContract.unwrap(amountWei);
            await unwrapTx.wait();
            
            this.showWrapSuccess(`Successfully unwrapped ${amount} Unicorn Meat tokens!`);
            await this.loadContractData();
            await this.updateConnectButton();
            
        } catch (error) {
            console.error('Error unwrapping tokens:', error);
            if (error.code === 4001) {
                this.showWrapError('Transaction was rejected by user');
            } else if (error.message && error.message.includes('insufficient funds')) {
                this.showWrapError('Insufficient ETH for gas fees. Please add more ETH to your wallet.');
            } else {
                this.showWrapError('Failed to unwrap tokens: ' + error.message);
            }
        }
    }
    
    async updateConnectButton() {
        const connectButtons = document.querySelectorAll('.connect-wallet-btn');
        
        for (const button of connectButtons) {
            if (this.isConnected && this.account) {
                // Get all balances with proper error handling
                let unicornsBalance = '0';
                let wrappedUnicornsBalance = '0';
                let unicornMeatBalance = '0';
                let wrappedMeatBalance = '0';
                let baseMeatBalance = '0';
                
                try {
                    [unicornsBalance, wrappedUnicornsBalance, unicornMeatBalance, wrappedMeatBalance, baseMeatBalance] = await Promise.all([
                        this.getUnicornsBalance().catch(() => '0'),
                        this.getWrappedUnicornsBalance().catch(() => '0'),
                        this.getUnicornMeatBalance().catch(() => '0'),
                        this.getWrappedBalance().catch(() => '0'),
                        this.getBaseMeatBalance().catch(() => '0')
                    ]);
                } catch (error) {
                    console.error('Error fetching balances:', error);
                }
                
                // Ensure all values are strings and valid, filter out invalid values
                const sanitizeBalance = (val) => {
                    const str = String(val || '0').trim();
                    if (!str || str === 'undefined' || str === 'null' || str === 'NaN' || isNaN(str)) {
                        return '0';
                    }
                    // Remove any non-numeric characters except minus sign at start
                    const cleaned = str.replace(/[^\d-]/g, '');
                    return cleaned || '0';
                };
                
                unicornsBalance = sanitizeBalance(unicornsBalance);
                wrappedUnicornsBalance = sanitizeBalance(wrappedUnicornsBalance);
                unicornMeatBalance = sanitizeBalance(unicornMeatBalance);
                wrappedMeatBalance = sanitizeBalance(wrappedMeatBalance);
                baseMeatBalance = sanitizeBalance(baseMeatBalance);
                
                // Sum Unicorns (both wrapped and unwrapped) - 0 decimals
                const totalUnicorns = (BigInt(unicornsBalance) + BigInt(wrappedUnicornsBalance)).toString();
                
                // Sum Unicorn Meat (wrapped, unwrapped, and Base) - 3 decimals
                const totalMeat = (BigInt(unicornMeatBalance) + BigInt(wrappedMeatBalance) + BigInt(baseMeatBalance)).toString();
                
                // Format balances
                // Unicorns have 0 decimals, so format directly
                const unicornsNum = BigInt(totalUnicorns);
                let formattedUnicorns;
                if (unicornsNum >= 1000000n) {
                    formattedUnicorns = (Number(unicornsNum) / 1000000).toFixed(1) + 'M';
                } else if (unicornsNum >= 1000n) {
                    formattedUnicorns = (Number(unicornsNum) / 1000).toFixed(1) + 'K';
                } else {
                    formattedUnicorns = unicornsNum.toString();
                }
                
                // Unicorn Meat has 3 decimals, use existing formatter
                const formattedMeat = this.formatLargeNumber(totalMeat);
                
                const truncatedAddress = `${this.account.address.slice(0, 6)}...${this.account.address.slice(-4)}`;
                
                button.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.2;">
                        <div style="font-size: 10px; color: #6c757d; margin-bottom: 4px; display: block;">${truncatedAddress}</div>
                        <div style="font-weight: bold; display: block; white-space: nowrap;">${formattedUnicorns}🦄 ${formattedMeat}🍖</div>
                    </div>
                `;
                button.classList.remove('btn-secondary');
                button.classList.add('btn-success');
                button.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
                button.style.borderColor = '#1e7e34';
                button.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
            } else {
                button.innerHTML = '<span>Connect Wallet</span>';
                button.classList.remove('btn-success');
                button.classList.add('btn-secondary');
                button.style.background = '';
                button.style.borderColor = '';
                button.style.boxShadow = '';
            }
        }
    }
    
    updateBalances(unicornMeatBalance, wrappedBalance) {
        const balanceElements = document.querySelectorAll('.balance-display');
        balanceElements.forEach(element => {
            if (element.dataset.type === 'unicorn-meat') {
                element.textContent = unicornMeatBalance;
            } else if (element.dataset.type === 'wrapped') {
                element.textContent = wrappedBalance;
            }
        });
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showWrapError(message) {
        const wrapError = document.getElementById('wrap-error');
        if (wrapError) {
            wrapError.textContent = message;
            wrapError.classList.remove('d-none');
            setTimeout(() => {
                wrapError.classList.add('d-none');
            }, 5000);
        } else {
            // Fallback to regular error display
            this.showError(message);
        }
    }
    
    showWrapSuccess(message) {
        const wrapError = document.getElementById('wrap-error');
        if (wrapError) {
            wrapError.textContent = message;
            wrapError.classList.remove('d-none', 'text-danger');
            wrapError.classList.add('text-success');
            setTimeout(() => {
                wrapError.classList.add('d-none');
                wrapError.classList.remove('text-success');
                wrapError.classList.add('text-danger');
            }, 5000);
        } else {
            // Fallback to regular success display
            this.showSuccess(message);
        }
    }
    
    showLoading(message) {
        this.showMessage(message, 'loading');
    }
    
    showMessage(message, type) {
        // Create modal for errors and important messages
        if (type === 'error' || type === 'success') {
            // Clear any loading messages when showing success/error
            const errorDiv = document.getElementById('web3-error');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.className = 'panel mt-4 p-3 border border-2 text-center d-none';
            }
            this.showModal(message, type);
        } else {
            // For loading messages, use the existing error div
            const errorDiv = document.getElementById('web3-error');
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.className = `panel mt-4 p-3 border border-2 text-center d-block`;
                
                if (type === 'loading') {
                    errorDiv.classList.add('border-warning', 'text-warning', 'bg-warning-50');
                }
            }
        }
    }
    
    showModal(message, type) {
        // Remove existing modal if present
        const existingModal = document.getElementById('walletkit-error-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'walletkit-error-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 2px solid #000;
        `;
        
        // Set colors based on type
        let icon, title, bgColor, borderColor;
        if (type === 'error') {
            icon = '❌';
            title = 'Error';
            bgColor = '#fef2f2';
            borderColor = '#dc2626';
        } else {
            icon = '✅';
            title = 'Success';
            bgColor = '#f0fdf4';
            borderColor = '#16a34a';
        }
        
        modalContent.style.backgroundColor = bgColor;
        modalContent.style.borderColor = borderColor;
        
        modalContent.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
                <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1f2937;">${title}</h3>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #374151; white-space: pre-line;">${message}</p>
                <button id="close-error-modal" style="
                    background: #1f2937;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.background='#374151'" onmouseout="this.style.background='#1f2937'">
                    Close
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close modal on button click or outside click
        const closeButton = document.getElementById('close-error-modal');
        closeButton.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Auto-close success modals after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 3000);
        }
    }
}

// Initialize WalletKit when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.unicornMeatWalletKit = new UnicornMeatWalletKit();
    } catch (error) {
        console.error('WalletKit initialization failed:', error);
    }
}); 