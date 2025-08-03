from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import os
from web3 import Web3

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# MistCoin Claim Contract ABI (simplified for the functions we need)
MISTCOIN_CLAIM_ABI = [
    {
        "inputs": [
            {"name": "amount", "type": "uint256"},
            {"name": "merkleProof", "type": "bytes32[]"}
        ],
        "name": "claim",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "hasClaimed",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "user", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "merkleProof", "type": "bytes32[]"}
        ],
        "name": "getClaimableAmount",
        "outputs": [{"name": "claimableAmount", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getStats",
        "outputs": [
            {"name": "_totalAllocated", "type": "uint256"},
            {"name": "_totalClaimed", "type": "uint256"},
            {"name": "_remainingAllocated", "type": "uint256"},
            {"name": "_contractBalance", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "claimEnabled",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Import Merkle tree data
from merkle_data import MOCK_MERKLE_DATA

# Web3 setup
w3 = Web3(Web3.HTTPProvider('https://eth-mainnet.g.alchemy.com/v2/FF0GUedsNSBgY9vgIPWUbJqjkPeFwVsO'))

# Contract addresses
CLAIM_CONTRACT_ADDRESS = '0xEC2c2AdEB8Ee3A338485ae684D1B1CB6DA0A498c'
WRAPPED_CONTRACT_ADDRESS = '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668'

# Create contract instances
claim_contract = w3.eth.contract(address=CLAIM_CONTRACT_ADDRESS, abi=MISTCOIN_CLAIM_ABI)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Here you would typically send an email or save to database
        # For now, we'll just flash a success message
        flash('Thank you for your message! We\'ll get back to you soon.', 'success')
        return redirect(url_for('index'))
    
    return render_template('contact.html')

@app.route('/newsletter', methods=['POST'])
def newsletter():
    email = request.form.get('email')
    if email:
        # Here you would typically save to database or send to email service
        flash('Thank you for subscribing to our newsletter!', 'success')
    return redirect(url_for('index'))

@app.errorhandler(404)
def not_found(error):
    return redirect(url_for('index'))

@app.route('/<path:path>')
def catch_all(path):
    return redirect(url_for('index'))

@app.route('/api/claim-status')
def get_claim_status():
    """Get claim contract status (open/closed)"""
    try:
        # Call the real contract to check if claims are enabled
        claim_enabled = claim_contract.functions.claimEnabled().call()
        return jsonify({
            'success': True,
            'claimEnabled': claim_enabled
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/claim-stats')
def get_claim_stats():
    """Get claim contract statistics"""
    try:
        # Call the real contract to get stats
        stats = claim_contract.functions.getStats().call()
        return jsonify({
            'success': True,
            'stats': {
                'totalAllocated': str(stats[0]),
                'totalClaimed': str(stats[1]),
                'remainingAllocated': str(stats[2]),
                'contractBalance': str(stats[3])
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/check-claim/<address>')
def check_claim_eligibility(address):
    """Check if an address is eligible for claims"""
    try:
        # Validate and convert to checksum address
        try:
            checksum_address = w3.to_checksum_address(address)
        except Exception:
            return jsonify({'error': 'Invalid address'}), 400
        
        # Check if address is in our Merkle tree data
        address_lower = checksum_address.lower()
        claim_data = None
        for claim in MOCK_MERKLE_DATA['claims']:
            if claim['address'].lower() == address_lower:
                claim_data = claim
                break
        
        if claim_data:
            
            # Check if user has already claimed
            has_claimed = claim_contract.functions.hasClaimed(checksum_address).call()
            
            # Get claimable amount from contract
            claimable_amount = claim_contract.functions.getClaimableAmount(
                checksum_address, 
                claim_data['amount'], 
                claim_data['proof']
            ).call()
            
            return jsonify({
                'success': True,
                'hasClaimed': has_claimed,
                'claimableAmount': str(claimable_amount),
                'merkleProof': claim_data['proof']
            })
        else:
            # Check if user has claimed (in case they're not in Merkle tree)
            has_claimed = claim_contract.functions.hasClaimed(checksum_address).call()
            return jsonify({
                'success': True,
                'hasClaimed': has_claimed,
                'claimableAmount': '0',
                'merkleProof': []
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/balance/wrapped/<address>')
def get_wrapped_balance(address):
    """Get wrapped Unicorn Meat balance for an address"""
    try:
        # Validate and convert to checksum address
        try:
            checksum_address = w3.to_checksum_address(address)
        except Exception:
            return jsonify({'error': 'Invalid address'}), 400
        
        # ERC-20 balanceOf function ABI
        balance_abi = [{"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"}]
        
        # Create contract instance
        wrapped_contract = w3.eth.contract(address=WRAPPED_CONTRACT_ADDRESS, abi=balance_abi)
        
        # Get balance
        balance = wrapped_contract.functions.balanceOf(checksum_address).call()
        
        return jsonify({
            'success': True,
            'balance': str(balance)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/balance/unicorn-meat/<address>')
def get_unicorn_meat_balance(address):
    """Get original Unicorn Meat balance for an address"""
    try:
        # Validate and convert to checksum address
        try:
            checksum_address = w3.to_checksum_address(address)
        except Exception:
            return jsonify({'error': 'Invalid address'}), 400
        
        # Mock balance for testing - replace with actual contract call
        import random
        mock_balance = random.randint(100000, 10000000)  # 100K to 10M tokens
        
        return jsonify({
            'success': True,
            'balance': str(mock_balance)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/claim-tokens', methods=['POST'])
def claim_tokens():
    """Process token claims"""
    try:
        data = request.get_json()
        user_address = data.get('user_address')
        
        if not user_address:
            return jsonify({'error': 'Invalid address'}), 400
        
        # Validate and convert to checksum address
        try:
            checksum_address = w3.to_checksum_address(user_address)
        except Exception:
            return jsonify({'error': 'Invalid address'}), 400
        
        # Check if user is eligible
        address_lower = checksum_address.lower()
        claim_data = None
        for claim in MOCK_MERKLE_DATA['claims']:
            if claim['address'].lower() == address_lower:
                claim_data = claim
                break
        
        if not claim_data:
            return jsonify({'error': 'Address not eligible for claims'}), 400
        
        # Check if user has already claimed
        has_claimed = claim_contract.functions.hasClaimed(checksum_address).call()
        if has_claimed:
            return jsonify({'error': 'Tokens already claimed'}), 400
        
        # Get claimable amount from contract
        claimable_amount = claim_contract.functions.getClaimableAmount(
            checksum_address, 
            claim_data['amount'], 
            claim_data['proof']
        ).call()
        
        if claimable_amount == 0:
            return jsonify({'error': 'No tokens available to claim'}), 400
        
        # For now, return success message. In production, this would trigger the actual claim transaction
        return jsonify({
            'success': True,
            'message': f'Successfully claimed {claimable_amount} Unicorn Meat tokens!',
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wrap', methods=['POST'])
def wrap_tokens():
    """Wrap Unicorn Meat tokens"""
    try:
        data = request.get_json()
        amount = data.get('amount')
        user_address = data.get('user_address')
        
        if not amount or not user_address:
            return jsonify({'error': 'Missing amount or user address'}), 400
        
        # Validate and convert to checksum address
        try:
            checksum_address = w3.to_checksum_address(user_address)
        except Exception:
            return jsonify({'error': 'Invalid address'}), 400
        
        # Convert amount to wei (assuming 3 decimals like the original contract)
        amount_wei = int(float(amount) * 1000)
        
        # For now, return instructions for manual wrapping
        # In production, this would trigger the actual wrap transaction
        return jsonify({
            'success': True,
            'message': f'To wrap {amount} Unicorn Meat tokens:',
            'instructions': [
                '1. Go to the original Unicorn Meat contract on Etherscan',
                '2. Connect your wallet',
                '3. Call the approve function with:',
                f'   - spender: {WRAPPED_CONTRACT_ADDRESS}',
                f'   - value: {amount_wei}',
                '4. Then call the wrap function on the wrapped contract',
                '5. Or use the Wrap button on this site for a guided experience'
            ]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/unwrap', methods=['POST'])
def unwrap_tokens():
    """Unwrap Unicorn Meat tokens"""
    try:
        data = request.get_json()
        amount = data.get('amount')
        user_address = data.get('user_address')
        
        if not amount or not user_address:
            return jsonify({'error': 'Missing amount or user address'}), 400
        
        # Validate and convert to checksum address
        try:
            checksum_address = w3.to_checksum_address(user_address)
        except Exception:
            return jsonify({'error': 'Invalid address'}), 400
        
        # Convert amount to wei (assuming 3 decimals like the original contract)
        amount_wei = int(float(amount) * 1000)
        
        # For now, return instructions for manual unwrapping
        # In production, this would trigger the actual unwrap transaction
        return jsonify({
            'success': True,
            'message': f'To unwrap {amount} Unicorn Meat tokens:',
            'instructions': [
                '1. Go to the Wrapped Unicorn Meat contract on Etherscan',
                '2. Connect your wallet',
                '3. Call the unwrap function with:',
                f'   - value: {amount_wei}',
                '4. Or use the Unwrap button on this site for a guided experience'
            ]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 