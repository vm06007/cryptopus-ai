# 🐙 Octopus AI

An intelligent AI assistant integrated with Gnosis Safe Multisignature wallets to enhance security, automate transaction verification, and provide DeFi assistance through an interactive chat interface.

## 🚀 Overview

Octopus AI is a security-focused cryptocurrency application that serves as an AI participant in your Gnosis Safe Multisignature wallet. It leverages Nillion's secure computation platform for private data storage and LLM-powered decision making to analyze transactions for malicious patterns. The system provides a comprehensive onboarding via Privy, enabling connection of multiple wallet types including email-based access for maximum convenience and security.

## ✨ Features

- **AI-Powered Multisig Participant**: Acts as an intelligent signer in Gnosis Safe wallets
- **Seamless Onboarding**: Uses Privy to connect multiple wallet types including email-controlled wallets
- **Multi-Wallet Integration**: Combines traditional web3 wallets with email-generated wallets and AI verification
- **Automated Transaction Verification**: Analyzes incoming transactions for suspicious patterns
- **Malicious Transaction Detection**: Identifies and rejects potentially harmful transactions
- **Auto-Execution Capability**: Streamlines approval of legitimate transactions
- **Interactive Chat Interface**: Discuss DeFi topics and request transaction execution
- **Transaction Commands**: Execute send and swap operations directly through chat
- **Private Computation**: Uses Nillion for secure data storage and LLM querying
- **Parameter-Based Risk Assessment**: Evaluates multiple security factors before decision making

## 🔧 Technology Stack

- Python
- Privy for wallet onboarding and management
- Nillion for secure data storage
- LLM integration for transaction analysis and chat interface
- Gnosis Safe SDK
- Web3 interfaces
- DeFi protocol integrations
- Blockchain transaction monitoring

## 📋 Setup Instructions

### Prerequisites

- Python 3.8+
- Gnosis Safe Multisignature wallet
- Nillion account and API credentials
- Privy API credentials
- Required Python packages (see requirements.txt)

### Installation

1. Clone this repository:
```
git clone https://github.com/vm06007/cryptopus-ai.git
cd cryptopus-ai
```

2. Install dependencies:
```
pip install -r requirements.txt
```

3. Configure your API keys:
```
cp config_example.py config.py
# Edit config.py with your API credentials
```

4. Run the service:
```
python main.py
```

## 📊 Usage

1. Use the Privy integration to connect your wallets (traditional Web3, email-based, etc.)
2. Add Octopus AI as a signer to your Gnosis Safe multisig wallet
3. Configure security parameters in `config.py`
4. Set auto-execution preferences and risk thresholds
5. Interact with the chat interface to:
   - Ask questions about DeFi
   - Request transaction executions
   - Execute token swaps
   - Monitor your portfolio
6. The service will monitor incoming transactions and take appropriate actions based on security analysis

## 💬 Chat Commands

The Octopus AI bot understands various commands including:
- `/send [amount] [token] to [address]` - Execute a token transfer
- `/swap [amount] [token1] to [token2]` - Perform a token swap
- `/info [token/protocol]` - Get information about tokens or DeFi protocols
- `/balance` - Check your current portfolio balance

## ⚠️ Risk Warning

While Octopus AI adds an additional security layer, it should not be the only security measure for your cryptocurrency assets. Always verify transactions through multiple mechanisms and keep your credentials secure.

## 📈 Performance

The system's effectiveness depends on the configured security parameters and the types of threats it encounters. Regular updates to the model improve detection capabilities.

## 🔨 Development

Want to contribute? Great!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- Nillion for providing secure computation infrastructure
- Privy for wallet onboarding and management solutions
- Gnosis Safe for the multisignature wallet platform
- Open-source AI and blockchain communities
- Contributors and supporters of the project

## 📞 Contact

Project Maintainer - [@vm06007](https://github.com/vm06007)

Project Link: [https://github.com/vm06007/cryptopus-ai](https://github.com/vm06007/cryptopus-ai)