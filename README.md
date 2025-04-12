# Colossus2.0_TITANS

💸 P2P Lending dApp (Web3)

A decentralized Peer-to-Peer (P2P) lending platform built using **Solidity**, **TypeScript**, **JavaScript**, and **React**. This dApp allows borrowers and lenders to connect directly without traditional intermediaries using smart contracts on the blockchain.

---

🚀 Features

- 📄 Smart contracts for managing loan agreements
- 🔐 Secure, trustless P2P transactions on Ethereum
- ⏳ Loan creation, funding, and repayment lifecycle
- 📈 Customizable loan terms (amount, rate, duration)
- 💼 Wallet integration using MetaMask
- ⚛️ Frontend built with React + TypeScript
- 🔗 Web3/Ethers.js for contract interaction

---

🧱 Tech Stack

| Tech          | Purpose                             |
|---------------|-------------------------------------|
| **Solidity**  | Smart contract development          |
| **React**     | Frontend UI                         |
| **TypeScript**| Type-safe app structure             |
| **JavaScript**| Web3 scripting                      |
| **Ethers.js** | Blockchain interaction              |
| **Hardhat**   | Local blockchain & contract testing |
| **MetaMask**  | Ethereum wallet integration         |

---

 🔁 Lending Flow

1. 🧾 Borrower creates a loan request with desired terms
2. 💰 Lender reviews and funds the loan
3. 🔐 Smart contract manages loan agreement & fund escrow
4. 💸 Borrower repays the loan + interest
5. ✅ Lender automatically receives repayment

---

## 📂 Project Structure


---

## 🛠 Installation & Setup

### Prerequisites

- Node.js & npm
- MetaMask browser extension
- Hardhat (installed via `npm install`)



### Install dependencies

```bash
git clone https://github.com/your-username/p2p-lending-web3.git
cd p2p-lending-web3

# Backend
npm install
npx hardhat compile

# Frontend
cd frontend
npm install

# In one terminal: run a local blockchain
npx hardhat node

# In a new terminal: deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Start the frontend
cd frontend
npm run dev


🧪 Running Tests

npx hardhat test


🛡 Security Considerations
✅ Validate all inputs on-chain and off-chain

🔐 Use safe math and avoid re-entrancy

⚠️ Test on testnets before deploying to mainnet

📢 Consider getting a third-party audit for production use

📄 License
MIT License.
Feel free to fork, modify, and build upon this project!

🤝 Contributing
Pull requests, suggestions, and feedback are always welcome!
Open an issue to propose new features or improvements.

🌍 Connect With Me
Author: MOHANAKUMAR
GitHub: @mk2871
LinkedIn: https://www.linkedin.com/in/mohanakumar-sivakumar-5374a2250/






