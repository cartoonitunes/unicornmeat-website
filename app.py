from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import os
from web3 import Web3

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Web3 setup
w3 = Web3(Web3.HTTPProvider('https://eth-mainnet.g.alchemy.com/v2/FF0GUedsNSBgY9vgIPWUbJqjkPeFwVsO'))

# Contract addresses
WRAPPED_CONTRACT_ADDRESS = '0xDFA208BB0B811cFBB5Fa3Ea98Ec37Aa86180e668'

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