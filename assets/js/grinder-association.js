// Grinder Association DAO Information Loader
// Fetches and displays information from the Unicorn Meat Grinder Association contract

(function() {
    'use strict';

    const GRINDER_CONTRACT_ADDRESS = '0xc7e9dDd5358e08417b1C88ed6f1a73149BEeaa32';
    const GRINDER_ABI = [
        {
            "constant": true,
            "inputs": [{"name": "", "type": "uint256"}],
            "name": "proposals",
            "outputs": [
                {"name": "recipient", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "description", "type": "string"},
                {"name": "votingDeadline", "type": "uint256"},
                {"name": "executed", "type": "bool"},
                {"name": "proposalPassed", "type": "bool"},
                {"name": "numberOfVotes", "type": "uint256"},
                {"name": "proposalHash", "type": "bytes32"}
            ],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "rejectionMultiplier",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "numProposals",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "unicornTokenAddress",
            "outputs": [{"name": "", "type": "address"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "debatingPeriodInMinutes",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "minimumQuorum",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "totalUnicornsKilled",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{"name": "", "type": "address"}],
            "name": "unicornsKilled",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "meatTokenAddress",
            "outputs": [{"name": "", "type": "address"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "meatProvider",
            "outputs": [{"name": "", "type": "address"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "owner",
            "outputs": [{"name": "", "type": "address"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "proposalNumber", "type": "uint256"},
                {"name": "supportsProposal", "type": "bool"}
            ],
            "name": "vote",
            "outputs": [{"name": "voteID", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "proposalNumber", "type": "uint256"},
                {"name": "transactionBytecode", "type": "bytes"}
            ],
            "name": "executeProposal",
            "outputs": [{"name": "result", "type": "int256"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "beneficiary", "type": "address"},
                {"name": "etherAmount", "type": "uint256"},
                {"name": "JobDescription", "type": "string"},
                {"name": "transactionBytecode", "type": "bytes"}
            ],
            "name": "newProposal",
            "outputs": [{"name": "proposalID", "type": "uint256"}],
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": false, "name": "proposalID", "type": "uint256"},
                {"indexed": false, "name": "recipient", "type": "address"},
                {"indexed": false, "name": "amount", "type": "uint256"},
                {"indexed": false, "name": "description", "type": "string"}
            ],
            "name": "ProposalAdded",
            "type": "event"
        }
    ];

    // RPC endpoint - using Rarible's Ethereum node
    const RPC_ENDPOINT = 'https://rarible.com/nodes/ethereum-node';
    
    // Proposal transaction hashes in order (oldest to newest)
    const PROPOSAL_TX_HASHES = [
        '0x4a599406f09d6217c8cee835993570b44616c38c5c69bb6e9debdf08469fb743',
        '0xff421649f71a14648dc9876bfc45eee33fc26696500d3687d59cacd3b43b45af',
        '0x208bff05bc2d315dacf29d958390cfc25ad8429a379413d48ef575ff4770035f',
        '0xfa1df1087adf1292cd168e62f290cff48c6ddb476e85800c6591649c4f09a9e2',
        '0xd48a84bd702ec736409ab9d50fbc4d8a3361782872358f27330e125f3279790e', // Failed transaction
        '0x5064e324bd93e811d035ed352d0e2632ff30b15ada341fecff8df9780a07474b',
        '0x78b92f3952e72e4714fdb4124da6bb367fad03b77c46e71b4f73045d0c78e1c4',
        '0xb9c3ef46288df5a5153dc2e21329c1b87f9a9a908cf89fbf4c65fc5901ed22b6',
        '0x7bf0cefc8d201d653bc2c68b2bfb9057491b67592a5198d7cfc9850791fe7f20',
        '0xb017486a6663035f0a541eb7ee4d42138b1e8d411686900155214bcd27e6b7a9'
    ];

    // Store contract instance for DAO interactions
    let contractInstance = null;
    let isEthersMode = false;

    // Retry helper function
    async function retryPromise(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        const errorDiv = document.getElementById('grinder-error');
        const infoDiv = document.getElementById('grinder-info');

        if (!errorDiv || !infoDiv) {
            // Grinder Association section not on this page, exit early
            return;
        }
        
        // Initialize placeholders with "..."
        document.getElementById('proposals-count').textContent = '...';
        document.getElementById('total-unicorns-killed').textContent = '...';
        document.getElementById('dao-age').textContent = '...';
        document.getElementById('debating-period').textContent = '...';
        document.getElementById('rejection-multiplier').textContent = '...';
        
        // Calculate DAO age from deploy date: Mar-24-2016 10:55:56 PM UTC
        function calculateDAOAge() {
            const deployDate = new Date('2016-03-24T22:55:56Z'); // Mar-24-2016 10:55:56 PM UTC
            const now = new Date();
            const diffMs = now - deployDate;
            const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
            const diffMonths = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
            const diffDays = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
            
            if (diffYears > 0) {
                if (diffMonths > 0) {
                    return `${diffYears}yr ${diffMonths}mo`;
                }
                return `${diffYears}yr`;
            } else if (diffMonths > 0) {
                return `${diffMonths}mo`;
            } else {
                return `${diffDays}d`;
            }
        }
        
        // Set DAO age immediately
        document.getElementById('dao-age').textContent = calculateDAOAge();

        async function loadGrinderData() {
            try {
                // Check if Web3 is available
                if (typeof window.ethers === 'undefined' && typeof Web3 === 'undefined') {
                    throw new Error('Web3 provider not available');
                }

                // Try to use ethers.js first (preferred), fallback to Web3
                let provider;
                if (typeof window.ethers !== 'undefined') {
                    // Use ethers.js with a public RPC endpoint
                    provider = new window.ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
                } else if (typeof Web3 !== 'undefined') {
                    // Fallback to Web3 with public RPC
                    provider = new Web3(RPC_ENDPOINT);
                } else {
                    throw new Error('No Web3 library available');
                }

                let contract;
                if (typeof window.ethers !== 'undefined') {
                    // Use ethers.js
                    contract = new window.ethers.Contract(GRINDER_CONTRACT_ADDRESS, GRINDER_ABI, provider);
                    contractInstance = contract;
                    isEthersMode = true;
                    
                    // Fetch all data
                    const [numProposals, totalUnicornsKilled, minimumQuorum, debatingPeriod, rejectionMultiplier, unicornTokenAddress, meatTokenAddress, meatProvider, owner] = await Promise.all([
                        contract.numProposals(),
                        contract.totalUnicornsKilled(),
                        contract.minimumQuorum(),
                        contract.debatingPeriodInMinutes(),
                        contract.rejectionMultiplier(),
                        contract.unicornTokenAddress(),
                        contract.meatTokenAddress(),
                        contract.meatProvider(),
                        contract.owner()
                    ]);

                    // Update UI
                    document.getElementById('proposals-count').textContent = numProposals.toString();
                    document.getElementById('total-unicorns-killed').textContent = totalUnicornsKilled.toString();
                    document.getElementById('dao-age').textContent = calculateDAOAge();
                    document.getElementById('minimum-quorum').textContent = minimumQuorum.toString(); // Still needed for governance rules text
                    document.getElementById('debating-period').textContent = debatingPeriod.toString();
                    document.getElementById('rejection-multiplier').textContent = rejectionMultiplier.toString();

                    // Update addresses with links
                    updateAddressLink('unicorn-token-link', unicornTokenAddress);
                    updateAddressLink('meat-token-link', meatTokenAddress);
                    updateAddressLink('meat-provider-link', meatProvider);
                    updateAddressLink('owner-link', owner);

                    // Load proposals
                    await loadProposalsEthers(contract, numProposals);
                    
                    // Hide error, show info (already visible)
                    errorDiv.classList.add('d-none');

                } else {
                    // Use Web3.js
                    const web3 = provider;
                    contract = new web3.eth.Contract(GRINDER_ABI, GRINDER_CONTRACT_ADDRESS);
                    contractInstance = contract;
                    isEthersMode = false;
                    
                    // Fetch all data
                    const [numProposals, totalUnicornsKilled, minimumQuorum, debatingPeriod, rejectionMultiplier, unicornTokenAddress, meatTokenAddress, meatProvider, owner] = await Promise.all([
                        contract.methods.numProposals().call(),
                        contract.methods.totalUnicornsKilled().call(),
                        contract.methods.minimumQuorum().call(),
                        contract.methods.debatingPeriodInMinutes().call(),
                        contract.methods.rejectionMultiplier().call(),
                        contract.methods.unicornTokenAddress().call(),
                        contract.methods.meatTokenAddress().call(),
                        contract.methods.meatProvider().call(),
                        contract.methods.owner().call()
                    ]);

                    // Update UI
                    document.getElementById('proposals-count').textContent = numProposals;
                    document.getElementById('total-unicorns-killed').textContent = totalUnicornsKilled;
                    document.getElementById('dao-age').textContent = calculateDAOAge();
                    document.getElementById('minimum-quorum').textContent = minimumQuorum; // Still needed for governance rules text
                    document.getElementById('debating-period').textContent = debatingPeriod;
                    document.getElementById('rejection-multiplier').textContent = rejectionMultiplier;

                    // Update addresses with links
                    updateAddressLink('unicorn-token-link', unicornTokenAddress);
                    updateAddressLink('meat-token-link', meatTokenAddress);
                    updateAddressLink('meat-provider-link', meatProvider);
                    updateAddressLink('owner-link', owner);

                    // Load proposals
                    await loadProposalsWeb3(contract, parseInt(numProposals), web3);
                    
                    // Hide error, show info (already visible)
                    errorDiv.classList.add('d-none');
                }

            } catch (error) {
                console.error('Error loading Grinder Association data:', error);
                errorDiv.classList.remove('d-none');
                const errorText = errorDiv.querySelector('p');
                if (errorText) {
                    errorText.textContent = `Failed to load DAO information: ${error.message}`;
                }
            }
        }

        function updateAddressLink(elementId, address) {
            const link = document.getElementById(elementId);
            if (link) {
                link.href = `https://etherscan.io/address/${address}`;
                link.textContent = address;
            }
        }

        async function loadProposalsEthers(contract, numProposals) {
            const proposalsList = document.getElementById('proposals-list');
            if (!proposalsList) return;

            proposalsList.innerHTML = '<p class="text-muted text-center fs-7">Loading proposals...</p>';

            if (numProposals.gt(0)) {
                const numProposalsInt = numProposals.toNumber();
                
                try {
                    // Fetch all proposals with retry logic
                    const proposalPromises = [];
                    for (let i = 0; i < numProposalsInt; i++) {
                        // Add retry wrapper for each proposal
                        proposalPromises.push(retryPromise(() => contract.proposals(i), 3, 1000));
                    }
                    const proposals = await Promise.allSettled(proposalPromises);
                    
                    // Check if any proposals failed
                    const failedProposals = proposals.filter(p => p.status === 'rejected');
                    if (failedProposals.length > 0) {
                        console.warn(`${failedProposals.length} proposals failed to load, retrying...`);
                        // Retry failed proposals individually
                        for (let i = 0; i < proposals.length; i++) {
                            if (proposals[i].status === 'rejected') {
                                try {
                                    proposals[i] = { status: 'fulfilled', value: await retryPromise(() => contract.proposals(i), 3, 1000) };
                                } catch (err) {
                                    console.error(`Failed to load proposal ${i} after retries:`, err);
                                }
                            }
                        }
                    }

                    // Fetch proposer addresses from transaction hashes
                    const proposerData = await fetchProposersFromTxHashes(contract.provider, numProposalsInt, true);

                    // Create proposal elements with ENS resolution
                    proposalsList.innerHTML = '';
                    const elementPromises = proposals.map(async (result, index) => {
                        if (result.status === 'fulfilled') {
                            const proposal = result.value;
                            const proposerInfo = proposerData[index] || { address: 'Unknown', ensName: null };
                            const txHash = PROPOSAL_TX_HASHES[index] || null;
                            
                            // Resolve ENS for beneficiary
                            let recipientENS = null;
                            try {
                                recipientENS = await resolveENS(proposal.recipient, contract.provider);
                            } catch (err) {
                                // If ENS resolution fails, just use the address
                                console.error(`Error resolving ENS for recipient ${proposal.recipient}:`, err);
                            }
                            
                            const proposalDiv = createProposalElement(proposal, index, true, proposerInfo, null, txHash, recipientENS);
                            return proposalDiv;
                        } else {
                            // Show error for failed proposal
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'panel p-3 border border-2 border-danger text-danger bg-white mb-2';
                            errorDiv.innerHTML = `<p class="mb-0">Failed to load proposal #${index}</p>`;
                            return errorDiv;
                        }
                    });
                    
                    const proposalElements = await Promise.all(elementPromises);
                    proposalElements.forEach(element => {
                        proposalsList.appendChild(element);
                    });
                } catch (error) {
                    console.error('Error loading proposals:', error);
                    proposalsList.innerHTML = '<p class="text-danger text-center fs-7">Failed to load proposals. Please refresh the page.</p>';
                }
            } else {
                proposalsList.innerHTML = '<p class="text-muted text-center fs-7">No proposals found.</p>';
            }
        }

        async function loadProposalsWeb3(contract, numProposals, web3) {
            const proposalsList = document.getElementById('proposals-list');
            if (!proposalsList) return;

            proposalsList.innerHTML = '<p class="text-muted text-center fs-7">Loading proposals...</p>';

            if (numProposals > 0) {
                try {
                    // Fetch all proposals with retry logic
                    const proposalPromises = [];
                    for (let i = 0; i < numProposals; i++) {
                        // Add retry wrapper for each proposal
                        proposalPromises.push(retryPromise(() => contract.methods.proposals(i).call(), 3, 1000));
                    }
                    const proposals = await Promise.allSettled(proposalPromises);
                    
                    // Check if any proposals failed
                    const failedProposals = proposals.filter(p => p.status === 'rejected');
                    if (failedProposals.length > 0) {
                        console.warn(`${failedProposals.length} proposals failed to load, retrying...`);
                        // Retry failed proposals individually
                        for (let i = 0; i < proposals.length; i++) {
                            if (proposals[i].status === 'rejected') {
                                try {
                                    proposals[i] = { status: 'fulfilled', value: await retryPromise(() => contract.methods.proposals(i).call(), 3, 1000) };
                                } catch (err) {
                                    console.error(`Failed to load proposal ${i} after retries:`, err);
                                }
                            }
                        }
                    }

                    // Fetch proposer addresses from transaction hashes
                    const proposerData = await fetchProposersFromTxHashes(web3, numProposals, false);

                    // Create proposal elements with ENS resolution
                    proposalsList.innerHTML = '';
                    const elementPromises = proposals.map(async (result, index) => {
                        if (result.status === 'fulfilled') {
                            const proposal = result.value;
                            const proposerInfo = proposerData[index] || { address: 'Unknown', ensName: null };
                            const txHash = PROPOSAL_TX_HASHES[index] || null;
                            
                            // Resolve ENS for beneficiary
                            let recipientENS = null;
                            try {
                                recipientENS = await resolveENS(proposal.recipient, web3);
                            } catch (err) {
                                // If ENS resolution fails, just use the address
                                console.error(`Error resolving ENS for recipient ${proposal.recipient}:`, err);
                            }
                            
                            const proposalDiv = createProposalElement(proposal, index, false, proposerInfo, web3, txHash, recipientENS);
                            return proposalDiv;
                        } else {
                            // Show error for failed proposal
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'panel p-3 border border-2 border-danger text-danger bg-white mb-2';
                            errorDiv.innerHTML = `<p class="mb-0">Failed to load proposal #${index}</p>`;
                            return errorDiv;
                        }
                    });
                    
                    const proposalElements = await Promise.all(elementPromises);
                    proposalElements.forEach(element => {
                        proposalsList.appendChild(element);
                    });
                } catch (error) {
                    console.error('Error loading proposals:', error);
                    proposalsList.innerHTML = '<p class="text-danger text-center fs-7">Failed to load proposals. Please refresh the page.</p>';
                }
            } else {
                proposalsList.innerHTML = '<p class="text-muted text-center fs-7">No proposals found.</p>';
            }
        }

        async function fetchProposersFromTxHashes(provider, numProposals, isEthers) {
            const proposers = [];
            try {
                console.log(`Fetching proposers from ${numProposals} transaction hashes...`);
                
                // Fetch proposer from each transaction hash
                for (let i = 0; i < Math.min(PROPOSAL_TX_HASHES.length, numProposals); i++) {
                    const txHash = PROPOSAL_TX_HASHES[i];
                    if (!txHash) {
                        proposers.push({ address: 'Unknown', ensName: null });
                        continue;
                    }
                    
                    try {
                        let tx;
                        if (isEthers) {
                            tx = await provider.getTransaction(txHash);
                        } else {
                            tx = await provider.eth.getTransaction(txHash);
                        }
                        
                        if (tx && tx.from) {
                            // Resolve ENS name for proposer
                            const ensName = await resolveENS(tx.from, provider);
                            proposers.push({ address: tx.from, ensName: ensName });
                        } else {
                            proposers.push({ address: 'Unknown', ensName: null });
                        }
                    } catch (err) {
                        console.error(`Error fetching transaction ${txHash} for proposal ${i}:`, err);
                        proposers.push({ address: 'Unknown', ensName: null });
                    }
                }
                
                // Fill remaining slots with Unknown if we have fewer hashes than proposals
                while (proposers.length < numProposals) {
                    proposers.push({ address: 'Unknown', ensName: null });
                }
            } catch (error) {
                console.error('Error fetching proposers from transaction hashes:', error);
                // Return array of Unknown if we can't fetch
                for (let i = 0; i < numProposals; i++) {
                    proposers.push({ address: 'Unknown', ensName: null });
                }
            }
            return proposers;
        }


        function createProposalElement(proposal, index, isEthers, proposerInfo, web3, txHash, recipientENS) {
            const proposalCard = document.createElement('div');
            proposalCard.className = 'proposal-card panel border border-2 border-black contrast-shadow-sm bg-white';
            
            // Handle different data formats from ethers vs Web3
            const votingDeadline = isEthers ? proposal.votingDeadline.toNumber() : parseInt(proposal.votingDeadline);
            const deadline = new Date(votingDeadline * 1000);
            const isExpired = deadline < new Date();
            const amount = isEthers ? window.ethers.utils.formatEther(proposal.amount) : (web3 ? web3.utils.fromWei(proposal.amount, 'ether') : '0');
            const votes = isEthers ? proposal.numberOfVotes.toString() : proposal.numberOfVotes;
            
            // Determine status and sticker class
            let statusText, stickerClass;
            if (proposal.executed) {
                statusText = 'Executed';
                stickerClass = 'sticker-executed';
            } else if (proposal.proposalPassed) {
                statusText = 'Passed';
                stickerClass = 'sticker-passed';
            } else if (isExpired) {
                statusText = 'Expired';
                stickerClass = 'sticker-expired';
            } else {
                statusText = 'Active';
                stickerClass = 'sticker-active';
            }
            
            const description = proposal.description || 'N/A';
            const txLink = txHash ? `<p class="mb-1"><strong>Transaction:</strong> <a href="https://etherscan.io/tx/${txHash}" target="_blank" rel="noopener noreferrer" class="text-primary" style="text-decoration: underline; word-break: break-all;">${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}</a></p>` : '';
            
            // Format proposer display (ENS if available, otherwise address)
            const proposerAddress = proposerInfo.address || 'Unknown';
            const proposerDisplay = proposerInfo.ensName || proposerAddress;
            const proposerLink = proposerAddress !== 'Unknown' ? `<p class="mb-1"><strong>Proposer:</strong> <a href="https://etherscan.io/address/${proposerAddress}" target="_blank" rel="noopener noreferrer" class="text-primary" style="text-decoration: underline; word-break: break-all;">${proposerDisplay}</a></p>` : '';
            
            // Format recipient display (ENS if available, otherwise address)
            const recipientDisplay = recipientENS || proposal.recipient;
            
            proposalCard.innerHTML = `
                <div class="proposal-header p-2 d-flex justify-content-between align-items-start" style="cursor: pointer;">
                    <div class="d-flex flex-column gap-0" style="flex: 1;">
                        <div class="d-flex align-items-center gap-2">
                            <span class="proposal-toggle-icon" style="font-size: 0.7rem;">▼</span>
                            <span class="fw-bold fs-7">Proposal #${index}: ${description}</span>
                        </div>
                        <span class="fs-8 text-muted ms-4" style="font-size: 0.65rem; margin-top: 2px;">${deadline.toLocaleDateString()}</span>
                    </div>
                    <div class="sticker-badge ${stickerClass}">${statusText}</div>
                </div>
                <div class="proposal-content">
                    <div class="fs-7">
                        ${txLink}
                        ${proposerLink}
                        <p class="mb-1"><strong>Recipient:</strong> <a href="https://etherscan.io/address/${proposal.recipient}" target="_blank" rel="noopener noreferrer" class="text-primary" style="text-decoration: underline; word-break: break-all;">${recipientDisplay}</a></p>
                        <p class="mb-1"><strong>Amount:</strong> ${amount} ETH</p>
                        <p class="mb-1"><strong>Votes:</strong> ${votes}</p>
                        <p class="mb-2"><strong>Deadline:</strong> ${deadline.toLocaleString()}</p>
                        <div class="d-flex gap-2 mt-2" id="proposal-actions-${index}">
                            ${!proposal.executed && !isExpired ? `
                                <button class="btn btn-sm btn-primary border border-2 border-black contrast-shadow-sm vote-btn" data-proposal="${index}" data-support="true" style="font-size: 0.7rem;">Vote Yes</button>
                                <button class="btn btn-sm btn-secondary border border-2 border-black contrast-shadow-sm vote-btn" data-proposal="${index}" data-support="false" style="font-size: 0.7rem;">Vote No</button>
                            ` : ''}
                            ${proposal.proposalPassed && !proposal.executed ? `
                                <button class="btn btn-sm btn-success border border-2 border-black contrast-shadow-sm execute-btn" data-proposal="${index}" style="font-size: 0.7rem;">Execute</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            return proposalCard;
        }

        // DAO Interaction Functions
        function setupDAOInteractions() {
            // Vote button handlers
            document.addEventListener('click', async function(e) {
                if (e.target.classList.contains('vote-btn')) {
                    e.preventDefault();
                    const proposalNumber = parseInt(e.target.getAttribute('data-proposal'));
                    const supportsProposal = e.target.getAttribute('data-support') === 'true';
                    await voteOnProposal(proposalNumber, supportsProposal);
                }
                
                if (e.target.classList.contains('execute-btn')) {
                    e.preventDefault();
                    const proposalNumber = parseInt(e.target.getAttribute('data-proposal'));
                    await executeProposal(proposalNumber);
                }
            });
        }

        function setupProposalCreation() {
            const createBtn = document.getElementById('create-proposal-btn');
            const statusDiv = document.getElementById('proposal-status');
            
            if (!createBtn) return;
            
            createBtn.addEventListener('click', async function() {
                const beneficiary = document.getElementById('proposal-beneficiary').value.trim();
                const description = document.getElementById('proposal-description').value.trim();
                const bytecode = document.getElementById('proposal-bytecode').value.trim();
                const bribe = document.getElementById('proposal-bribe').value || '0';
                
                // Validate inputs
                if (!beneficiary || !description || !bytecode) {
                    showProposalStatus('Please fill in all required fields', 'error');
                    return;
                }
                
                // Validate address
                if (!/^0x[a-fA-F0-9]{40}$/.test(beneficiary)) {
                    showProposalStatus('Invalid beneficiary address', 'error');
                    return;
                }
                
                // Validate bytecode
                if (!bytecode.startsWith('0x') || bytecode.length < 2) {
                    showProposalStatus('Invalid bytecode format. Must start with 0x', 'error');
                    return;
                }
                
                // Default amount to 0 (amount is handled in bytecode)
                const amount = '0';
                
                await createProposal(beneficiary, amount, description, bytecode, bribe);
            });
        }

        function showProposalStatus(message, type) {
            const statusDiv = document.getElementById('proposal-status');
            if (!statusDiv) return;
            
            statusDiv.className = `panel p-2 border border-2 border-${type === 'error' ? 'danger' : 'success'} text-${type === 'error' ? 'danger' : 'success'} bg-white text-center`;
            statusDiv.textContent = message;
            statusDiv.classList.remove('d-none');
            
            if (type === 'success') {
                setTimeout(() => {
                    statusDiv.classList.add('d-none');
                }, 5000);
            }
        }

        async function createProposal(beneficiary, etherAmount, description, bytecode, bribeAmount) {
            try {
                // Check wallet connection
                if (!window.ethereum || !window.ethereum.selectedAddress) {
                    if (window.unicornMeatWalletKit) {
                        window.unicornMeatWalletKit.openWalletModal();
                    } else {
                        showProposalStatus('Please connect your wallet first', 'error');
                    }
                    return;
                }

                const userAddress = window.ethereum.selectedAddress;
                
                // Check if user has Unicorn tokens
                if (isEthersMode && typeof window.ethers !== 'undefined') {
                    const provider = new window.ethers.providers.Web3Provider(window.ethereum);
                    const signer = provider.getSigner();
                    
                    // Check Unicorn token balance
                    const unicornTokenABI = [
                        {
                            "constant": true,
                            "inputs": [{"name": "_owner", "type": "address"}],
                            "name": "balanceOf",
                            "outputs": [{"name": "balance", "type": "uint256"}],
                            "type": "function"
                        }
                    ];
                    const unicornTokenAddress = await contractInstance.unicornTokenAddress();
                    const unicornToken = new window.ethers.Contract(unicornTokenAddress, unicornTokenABI, provider);
                    const balance = await unicornToken.balanceOf(userAddress);
                    
                    if (balance.eq(0)) {
                        showProposalStatus('You need to hold Unicorn tokens to create proposals', 'error');
                        return;
                    }
                    
                    // Create contract instance with signer
                    const grinderContract = new window.ethers.Contract(GRINDER_CONTRACT_ADDRESS, GRINDER_ABI, signer);
                    
                    // Convert amounts
                    const amountWei = window.ethers.utils.parseEther(etherAmount);
                    const bribeWei = window.ethers.utils.parseEther(bribeAmount);
                    
                    // Convert bytecode to bytes (ensure it's valid hex)
                    let bytecodeBytes;
                    try {
                        bytecodeBytes = window.ethers.utils.hexlify(bytecode);
                    } catch (e) {
                        showProposalStatus('Invalid bytecode format', 'error');
                        return;
                    }
                    
                    showProposalStatus('Creating proposal...', 'success');
                    
                    // Call newProposal with optional value for vote weight boost
                    const tx = await grinderContract.newProposal(
                        beneficiary,
                        amountWei,
                        description,
                        bytecodeBytes,
                        {
                            value: bribeWei
                        }
                    );
                    
                    showProposalStatus(`Proposal transaction submitted! TX: ${tx.hash}`, 'success');
                    await tx.wait();
                    showProposalStatus('Proposal created successfully!', 'success');
                    
                    // Clear form
                    document.getElementById('proposal-beneficiary').value = '';
                    document.getElementById('proposal-amount').value = '';
                    document.getElementById('proposal-description').value = '';
                    document.getElementById('proposal-bytecode').value = '';
                    document.getElementById('proposal-bribe').value = '';
                    
                    // Reload proposals
                    loadGrinderData();
                    
                } else if (typeof Web3 !== 'undefined') {
                    const web3 = new Web3(window.ethereum);
                    const accounts = await web3.eth.getAccounts();
                    const userAddress = accounts[0];
                    
                    // Check balance
                    const unicornTokenAddress = await contractInstance.methods.unicornTokenAddress().call();
                    const unicornTokenABI = [{"constant": true, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"}];
                    const unicornToken = new web3.eth.Contract(unicornTokenABI, unicornTokenAddress);
                    const balance = await unicornToken.methods.balanceOf(userAddress).call();
                    
                    if (parseInt(balance) === 0) {
                        showProposalStatus('You need to hold Unicorn tokens to create proposals', 'error');
                        return;
                    }
                    
                    const grinderContract = new web3.eth.Contract(GRINDER_ABI, GRINDER_CONTRACT_ADDRESS);
                    const amountWei = web3.utils.toWei(etherAmount, 'ether');
                    const bribeWei = web3.utils.toWei(bribeAmount, 'ether');
                    
                    showProposalStatus('Creating proposal...', 'success');
                    
                    const tx = await grinderContract.methods.newProposal(
                        beneficiary,
                        amountWei,
                        description,
                        bytecode
                    ).send({
                        from: userAddress,
                        value: bribeWei
                    });
                    
                    showProposalStatus(`Proposal created! TX: ${tx.transactionHash}`, 'success');
                    
                    // Clear form
                    document.getElementById('proposal-beneficiary').value = '';
                    document.getElementById('proposal-amount').value = '';
                    document.getElementById('proposal-description').value = '';
                    document.getElementById('proposal-bytecode').value = '';
                    document.getElementById('proposal-bribe').value = '';
                    
                    loadGrinderData();
                }
            } catch (error) {
                console.error('Error creating proposal:', error);
                showProposalStatus(`Failed to create proposal: ${error.message}`, 'error');
            }
        }

        async function voteOnProposal(proposalNumber, supportsProposal) {
            try {
                // Check wallet connection
                if (!window.ethereum || !window.ethereum.selectedAddress) {
                    if (window.unicornMeatWalletKit) {
                        window.unicornMeatWalletKit.openWalletModal();
                    } else {
                        alert('Please connect your wallet first');
                    }
                    return;
                }

                const userAddress = window.ethereum.selectedAddress;
                
                // Check if user has Unicorn tokens
                if (isEthersMode && typeof window.ethers !== 'undefined') {
                    const provider = new window.ethers.providers.Web3Provider(window.ethereum);
                    const signer = provider.getSigner();
                    
                    // Check Unicorn token balance
                    const unicornTokenABI = [
                        {
                            "constant": true,
                            "inputs": [{"name": "_owner", "type": "address"}],
                            "name": "balanceOf",
                            "outputs": [{"name": "balance", "type": "uint256"}],
                            "type": "function"
                        }
                    ];
                    const unicornTokenAddress = await contractInstance.unicornTokenAddress();
                    const unicornToken = new window.ethers.Contract(unicornTokenAddress, unicornTokenABI, provider);
                    const balance = await unicornToken.balanceOf(userAddress);
                    
                    if (balance.eq(0)) {
                        alert('You need to hold Unicorn tokens to vote');
                        return;
                    }
                    
                    // Create contract instance with signer
                    const grinderContract = new window.ethers.Contract(GRINDER_CONTRACT_ADDRESS, GRINDER_ABI, signer);
                    
                    // Call vote function
                    const tx = await grinderContract.vote(proposalNumber, supportsProposal, {
                        value: window.ethers.utils.parseEther('0.001') // Small bribe amount
                    });
                    
                    alert(`Vote transaction submitted! TX: ${tx.hash}`);
                    await tx.wait();
                    alert('Vote confirmed!');
                    
                    // Reload proposals to show updated vote count
                    loadGrinderData();
                } else if (typeof Web3 !== 'undefined') {
                    const web3 = new Web3(window.ethereum);
                    const accounts = await web3.eth.getAccounts();
                    const userAddress = accounts[0];
                    
                    // Check balance
                    const unicornTokenAddress = await contractInstance.methods.unicornTokenAddress().call();
                    const unicornTokenABI = [{"constant": true, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"}];
                    const unicornToken = new web3.eth.Contract(unicornTokenABI, unicornTokenAddress);
                    const balance = await unicornToken.methods.balanceOf(userAddress).call();
                    
                    if (parseInt(balance) === 0) {
                        alert('You need to hold Unicorn tokens to vote');
                        return;
                    }
                    
                    const grinderContract = new web3.eth.Contract(GRINDER_ABI, GRINDER_CONTRACT_ADDRESS);
                    const tx = await grinderContract.methods.vote(proposalNumber, supportsProposal).send({
                        from: userAddress,
                        value: web3.utils.toWei('0.001', 'ether')
                    });
                    
                    alert(`Vote transaction confirmed! TX: ${tx.transactionHash}`);
                    loadGrinderData();
                }
            } catch (error) {
                console.error('Error voting:', error);
                alert(`Failed to vote: ${error.message}`);
            }
        }

        async function executeProposal(proposalNumber) {
            try {
                if (!window.ethereum || !window.ethereum.selectedAddress) {
                    if (window.unicornMeatWalletKit) {
                        window.unicornMeatWalletKit.openWalletModal();
                    } else {
                        alert('Please connect your wallet first');
                    }
                    return;
                }

                // Get proposal details to construct transaction bytecode
                const proposal = isEthersMode 
                    ? await contractInstance.proposals(proposalNumber)
                    : await contractInstance.methods.proposals(proposalNumber).call();
                
                // For executeProposal, we need the transaction bytecode
                // This is complex - the user would need to provide it or we'd need to reconstruct it
                // For now, show an alert explaining this
                alert('To execute a proposal, you need to provide the transaction bytecode that matches the proposal. This is a security feature. Please use Etherscan or a more advanced interface to execute proposals.');
                
            } catch (error) {
                console.error('Error executing proposal:', error);
                alert(`Failed to execute proposal: ${error.message}`);
            }
        }

        // Setup DAO interactions after DOM is ready
        setupDAOInteractions();
        
        // Setup proposal creation
        setupProposalCreation();

        // Load data when page loads
        loadGrinderData();
        
        // Load Hall of Fame
        loadHallOfFame();

        async function loadHallOfFame() {
        const listDiv = document.getElementById('hall-of-fame-list');
        
        if (!listDiv) {
            return; // Hall of Fame section not on this page
        }
        
        // Show placeholder table while loading
        const GRINDER_CONTRACT_ADDRESS = '0xc7e9dDd5358e08417b1C88ed6f1a73149BEeaa32';
        const etherscanBaseUrl = `https://etherscan.io/address/${GRINDER_CONTRACT_ADDRESS}`;
        
        // Create placeholder table
        const placeholderTable = document.createElement('table');
        placeholderTable.className = 'w-100';
        placeholderTable.style.borderCollapse = 'separate';
        placeholderTable.style.borderSpacing = '0';
        placeholderTable.style.tableLayout = 'auto';
        
        const placeholderThead = document.createElement('thead');
        const placeholderHeaderRow = document.createElement('tr');
        placeholderHeaderRow.className = 'border-bottom border-2';
        placeholderHeaderRow.innerHTML = `
            <th class="text-center py-3 px-2 fw-bold fs-6" style="min-width: 60px; width: 10%;">Rank</th>
            <th class="text-start py-3 px-3 fw-bold fs-6" style="min-width: 150px; width: 40%;">Killer</th>
            <th class="text-center py-3 px-3 fw-bold fs-6" style="min-width: 100px; width: 25%;">First Kill</th>
            <th class="text-end py-3 px-3 fw-bold fs-6" style="min-width: 80px; width: 25%;">Kills</th>
        `;
        placeholderThead.appendChild(placeholderHeaderRow);
        placeholderTable.appendChild(placeholderThead);
        
        const placeholderTbody = document.createElement('tbody');
        // Show 3 placeholder rows
        for (let i = 0; i < 3; i++) {
            const placeholderRow = document.createElement('tr');
            placeholderRow.className = 'border-bottom';
            placeholderRow.innerHTML = `
                <td class="text-center py-3 px-2 align-middle">
                    <span class="fw-bold fs-5">...</span>
                </td>
                <td class="text-start py-3 px-3 align-top">
                    <span class="text-muted">...</span>
                </td>
                <td class="text-center py-3 px-3 align-middle fs-7 text-muted">
                    ...
                </td>
                <td class="text-end py-3 px-3 align-middle">
                    <span class="fw-bold fs-5">...</span>
                </td>
            `;
            placeholderTbody.appendChild(placeholderRow);
        }
        placeholderTable.appendChild(placeholderTbody);
        listDiv.innerHTML = '';
        listDiv.appendChild(placeholderTable);

        try {
            // Check if Web3 is available
            if (typeof window.ethers === 'undefined' && typeof Web3 === 'undefined') {
                throw new Error('Web3 provider not available');
            }

            let provider;
            if (typeof window.ethers !== 'undefined') {
                provider = new window.ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
            } else if (typeof Web3 !== 'undefined') {
                provider = new Web3(RPC_ENDPOINT);
            } else {
                throw new Error('No Web3 library available');
            }

            // Get all addresses and their kill counts with timestamps
            const killerData = await getKillerAddressesAndCounts(provider);
            
            console.log(`Found ${killerData.length} unique killer addresses`);
            
            // Get ENS names for all addresses
            const killers = await Promise.all(
                killerData.map(async (killer) => {
                    const ensName = await resolveENS(killer.address, provider);
                    return { 
                        address: killer.address, 
                        count: killer.count, 
                        earliestTimestamp: killer.earliestTimestamp,
                        ensName 
                    };
                })
            );

            // Filter out addresses with 0 kills and sort by count (descending), then by timestamp (oldest first)
            const activeKillers = killers
                .filter(k => k.count > 0)
                .sort((a, b) => {
                    // First sort by count (descending)
                    if (b.count !== a.count) {
                        return b.count - a.count;
                    }
                    // Then sort by timestamp (oldest first)
                    return a.earliestTimestamp - b.earliestTimestamp;
                });
            
            console.log(`Displaying ${activeKillers.length} active killers`);

            // Display the hall of fame
            listDiv.innerHTML = '';
            
            if (activeKillers.length === 0) {
                listDiv.innerHTML = '<p class="text-muted text-center fs-7">No unicorn killers found yet.</p>';
            } else {
                const UNICORN_MEAT_TOKEN_ADDRESS = '0xed6ac8de7c7ca7e3a22952e09c2a2a1232ddef9a';
                const etherscanBaseUrl = `https://etherscan.io/token/${UNICORN_MEAT_TOKEN_ADDRESS}`;
                
                // Create actual HTML table
                const table = document.createElement('table');
                table.className = 'w-100';
                table.style.borderCollapse = 'separate';
                table.style.borderSpacing = '0';
                table.style.tableLayout = 'auto';
                
                // Create thead
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                headerRow.className = 'border-bottom border-2';
                headerRow.innerHTML = `
                    <th class="text-center py-3 px-2 fw-bold fs-6" style="min-width: 60px; width: 10%;">Rank</th>
                    <th class="text-start py-3 px-3 fw-bold fs-6" style="min-width: 150px; width: 40%;">Killer</th>
                    <th class="text-center py-3 px-3 fw-bold fs-6" style="min-width: 100px; width: 25%;">First Kill</th>
                    <th class="text-end py-3 px-3 fw-bold fs-6" style="min-width: 80px; width: 25%;">Kills</th>
                `;
                thead.appendChild(headerRow);
                table.appendChild(thead);
                
                // Create tbody
                const tbody = document.createElement('tbody');
                
                // Data rows
                activeKillers.forEach((killer, index) => {
                    const rank = index + 1;
                    
                    // Format date
                    const date = new Date(killer.earliestTimestamp * 1000);
                    const formattedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                    
                    // Create link to association contract filtered by address
                    const contractLink = `${etherscanBaseUrl}?a=${killer.address}`;
                    
                    // Display name (ENS if available, otherwise address)
                    const displayName = killer.ensName || killer.address;
                    
                    const row = document.createElement('tr');
                    row.className = 'border-bottom';
                    
                    row.innerHTML = `
                        <td class="text-center py-3 px-2 align-middle">
                            <span class="fw-bold fs-5">${rank}</span>
                        </td>
                        <td class="text-start py-3 px-3 align-top">
                            <a href="${contractLink}" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-none fw-bold fs-6 d-block" style="line-height: 1.4; word-break: break-word;">
                                ${displayName}
                            </a>
                        </td>
                        <td class="text-center py-3 px-3 align-middle fs-7 text-muted">
                            <span class="d-none d-md-inline">${formattedDate}</span>
                            <span class="d-inline d-md-none" style="font-size: 0.75rem;">${formattedDate}</span>
                        </td>
                        <td class="text-end py-3 px-3 align-middle">
                            <span class="fw-bold fs-5">${killer.count} 🦄</span>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                
                table.appendChild(tbody);
                listDiv.innerHTML = '';
                listDiv.appendChild(table);
            }

        } catch (error) {
            console.error('Error loading Hall of Fame:', error);
            listDiv.innerHTML = '<p class="text-muted text-center fs-7">Failed to load Hall of Fame. Please refresh the page.</p>';
        }
    }

    async function getKillerAddressesAndCounts(provider) {
        // Returns an array of killer objects with address, count, and earliest timestamp
        // Use provided transaction hashes to fetch killer addresses
        const killerData = new Map(); // address -> { count, earliestTimestamp }
        
        // Transaction hashes for grindUnicorns calls (earliest to latest)
        const TXN_HASHES = [
            '0xd4f62ab6acaba60529fe23c1c96b90902ce3846ae11e2d14a84b85502a09e5f3',
            '0x310e418a533ed2a49ba7e45a092e6b1dfac8072633ea55cadaf1e80c4e55a00e',
            '0x3e0cdf86e789aa791aea64bae28b183639a38af6d833d175960b81ec25c3d71e',
            '0x42041e3f59318b9481831074e352fba2121b2d22d130c1fab9216aa7be492f48',
            '0x39c5f952da5b89e041d00143e16b67f16c93985178004b6e1f924eef5c233040',
            '0x25aa9444d46d051b97d6212ae7469316d346391f3c0307afc8fb14b7efcd4970',
            '0xe7ab66c6fe9936d05b97e2b2a34a93e26f13aa3c3ecb8d5d8f586a30de30eb36',
            '0x885c853f389dd3d05259c8afb586d6e337e138e59d4c0f52b2cc8c4dead23c69'
        ];
        
        try {
            console.log(`Fetching ${TXN_HASHES.length} transactions for Hall of Fame...`);
            
            // Fetch each transaction and extract the 'from' address and timestamp
            for (const txnHash of TXN_HASHES) {
                try {
                    let tx, block, timestamp;
                    
                    if (typeof window.ethers !== 'undefined') {
                        // Use ethers.js
                        tx = await provider.getTransaction(txnHash);
                        if (tx && tx.from && tx.blockNumber) {
                            block = await provider.getBlock(tx.blockNumber);
                            timestamp = block.timestamp;
                            const fromAddress = tx.from.toLowerCase();
                            const existing = killerData.get(fromAddress);
                            if (existing) {
                                existing.count += 1;
                                // Keep the earliest timestamp
                                if (timestamp < existing.earliestTimestamp) {
                                    existing.earliestTimestamp = timestamp;
                                }
                            } else {
                                killerData.set(fromAddress, { count: 1, earliestTimestamp: timestamp });
                            }
                        }
                    } else if (typeof Web3 !== 'undefined') {
                        // Use Web3.js
                        tx = await provider.eth.getTransaction(txnHash);
                        if (tx && tx.from && tx.blockNumber) {
                            block = await provider.eth.getBlock(tx.blockNumber);
                            timestamp = block.timestamp;
                            const fromAddress = tx.from.toLowerCase();
                            const existing = killerData.get(fromAddress);
                            if (existing) {
                                existing.count += 1;
                                // Keep the earliest timestamp
                                if (timestamp < existing.earliestTimestamp) {
                                    existing.earliestTimestamp = timestamp;
                                }
                            } else {
                                killerData.set(fromAddress, { count: 1, earliestTimestamp: timestamp });
                            }
                        }
                    } else {
                        // Neither ethers.js nor Web3.js available - skip this transaction
                        console.warn(`Cannot fetch transaction ${txnHash}: neither ethers.js nor Web3.js available`);
                    }
                } catch (error) {
                    console.warn(`Error fetching transaction ${txnHash}:`, error);
                    // Continue with other transactions
                }
            }
            
            // Convert Map to array format
            const result = Array.from(killerData.entries()).map(([address, data]) => ({
                address,
                count: data.count,
                earliestTimestamp: data.earliestTimestamp
            }));
            
            console.log(`Found ${result.length} unique killer addresses with ${result.reduce((sum, k) => sum + k.count, 0)} total kills`);
            
            return result;
            
        } catch (error) {
            console.error('Error getting killer addresses from transactions:', error);
            return [];
        }
    }

    async function resolveENS(address, provider) {
        try {
            if (typeof window.ethers !== 'undefined') {
                const ensProvider = provider;
                const ensName = await ensProvider.lookupAddress(address);
                return ensName;
            } else {
                // Web3.js doesn't have built-in ENS resolution, would need ENS contract calls
                // For now, return null
                return null;
            }
        } catch (error) {
            // ENS resolution failed, return null
            return null;
        }
        }
    });
})();

