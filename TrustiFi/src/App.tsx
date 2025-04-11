import React, { useState, useEffect } from 'react';
import { Menu } from '@headlessui/react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  ArrowLeft,
  Send, 
  Download, 
  History, 
  Clock,
  Eye,
  HandCoins,
  ChevronDown,
  Settings,
  LogOut,
  Ban,
  Search,
  ExternalLink
} from 'lucide-react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Transaction {
  id: string;
  type: 'Sent' | 'Received';
  amount: string;
  to?: string;
  from?: string;
  date: string;
  hash: string;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  purpose?: string;
  gasUsed?: string;
  gasPrice?: string;
}

function App() {
  const [balance, setBalance] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [searchBlocked, setSearchBlocked] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sendForm, setSendForm] = useState({
    address: '',
    amount: '',
    description: '',
    purpose: ''
  });
  const [formErrors, setFormErrors] = useState({
    address: false,
    amount: false
  });
  const [blockedAccounts] = useState([
    { 
      address: '0x789...xyz', 
      reason: 'Suspicious activity',
      date: '2024-03-10',
      status: 'Permanent'
    },
    { 
      address: '0xabc...def', 
      reason: 'Multiple failed transactions',
      date: '2024-03-12',
      status: 'Temporary'
    }
  ]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      handleDisconnect();
    }
  };

  const getBalance = async (address: string) => {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
      setBalance(ethBalance.toFixed(4) + ' ETH');
    } catch (error) {
      console.error("Error getting balance:", error);
      toast.error("Failed to fetch balance");
    }
  };

  const handleConnect = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
          params: []
        });
        
        if (accounts.length > 0) {
          setIsConnected(true);
          setWalletAddress(accounts[0]);
          await getBalance(accounts[0]);
          toast.success('Wallet connected successfully!');
        }
      } catch (error: any) {
        console.error("Error connecting wallet:", error);
        if (error.code === 4001) {
          toast.error('Please approve the connection request');
        } else {
          toast.error('Failed to connect wallet');
        }
      }
    } else {
      toast.error('Please install MetaMask to use this feature');
      window.open('https://metamask.io/download/', '_blank');
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsConnected(false);
      setWalletAddress('');
      setBalance(null);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const validateForm = () => {
    const errors = {
      address: !sendForm.address,
      amount: !sendForm.amount || parseFloat(sendForm.amount) <= 0
    };
    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const amountInWei = BigInt(parseFloat(sendForm.amount) * 1e18).toString(16);
      
      const transactionParameters = {
        to: sendForm.address,
        from: walletAddress,
        value: '0x' + amountInWei,
      };

      const loadingToast = toast.loading('Processing transaction...');
      
      try {
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        });

        // Add transaction to history
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          type: 'Sent',
          amount: `-${sendForm.amount} ETH`,
          to: sendForm.address,
          date: new Date().toISOString().split('T')[0],
          hash: txHash,
          status: 'pending',
          description: sendForm.description,
          purpose: sendForm.purpose
        };

        setTransactions(prev => [newTransaction, ...prev]);
        
        // Wait for transaction confirmation
        const receipt = await waitForTransaction(txHash);
        
        // Update transaction status and details
        setTransactions(prev => prev.map(tx => 
          tx.hash === txHash 
            ? {
                ...tx,
                status: 'completed',
                gasUsed: receipt.gasUsed,
                gasPrice: receipt.effectiveGasPrice
              }
            : tx
        ));

        toast.dismiss(loadingToast);
        toast.success('Transaction completed successfully!');
        
        // Reset form
        setSendForm({
          address: '',
          amount: '',
          description: '',
          purpose: ''
        });

        // Update balance
        await getBalance(walletAddress);
        
      } catch (error: any) {
        console.error('Transaction failed:', error);
        toast.dismiss(loadingToast);
        toast.error(error.message || 'Transaction failed');
        
        // Update transaction status if it exists
        setTransactions(prev => prev.map(tx => 
          tx.hash === error.transactionHash 
            ? { ...tx, status: 'failed' }
            : tx
        ));
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to send transaction');
    }
  };

  const waitForTransaction = (txHash: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const checkTransaction = async () => {
        try {
          const receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });

          if (receipt) {
            resolve(receipt);
          } else {
            setTimeout(checkTransaction, 1000);
          }
        } catch (error) {
          reject(error);
        }
      };

      checkTransaction();
    });
  };

  const renderTransactionDetails = () => {
    if (!selectedTransaction) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-[480px] border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction Details</h2>
          <div className="space-y-4">
            <div className="bg-gray-50/50 p-4 rounded-xl">
              <p className="text-sm font-medium text-gray-600 mb-1">Amount</p>
              <p className="text-lg font-semibold text-gray-900">{selectedTransaction.amount}</p>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {selectedTransaction.type === 'Sent' ? 'To' : 'From'}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {selectedTransaction.type === 'Sent' ? selectedTransaction.to : selectedTransaction.from}
              </p>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl">
              <p className="text-sm font-medium text-gray-600 mb-1">Transaction Hash</p>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-mono text-gray-900">{selectedTransaction.hash}</p>
                <a 
                  href={`https://etherscan.io/tx/${selectedTransaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            {selectedTransaction.description && (
              <div className="bg-gray-50/50 p-4 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-1">Description</p>
                <p className="text-lg font-semibold text-gray-900">{selectedTransaction.description}</p>
              </div>
            )}
            {selectedTransaction.purpose && (
              <div className="bg-gray-50/50 p-4 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-1">Purpose</p>
                <p className="text-lg font-semibold text-gray-900">{selectedTransaction.purpose}</p>
              </div>
            )}
            {selectedTransaction.gasUsed && (
              <div className="bg-gray-50/50 p-4 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-1">Gas Used</p>
                <p className="text-lg font-semibold text-gray-900">{selectedTransaction.gasUsed}</p>
              </div>
            )}
            <button
              onClick={() => setSelectedTransaction(null)}
              className="w-full mt-4 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 font-medium transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'transactions':
        return (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{tx.amount}</p>
                      <p className="text-sm text-gray-600">{tx.date}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-4 py-1 rounded-full text-sm font-medium ${
                        tx.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                      <button
                        onClick={() => setSelectedTransaction(tx)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                      >
                        <Eye className="w-5 h-5 text-blue-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions yet
                </div>
              )}
            </div>
          </div>
        );
      case 'send':
        return (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Money</h2>
            <form onSubmit={handleSend} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Address <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={sendForm.address}
                  onChange={(e) => {
                    setSendForm({ ...sendForm, address: e.target.value });
                    setFormErrors({ ...formErrors, address: false });
                  }}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 bg-gray-50/50 ${
                    formErrors.address 
                      ? 'border-red-500 focus:ring-red-200' 
                      : sendForm.address 
                        ? 'border-green-500 focus:ring-green-200' 
                        : 'border-gray-200 focus:ring-blue-200'
                  } focus:ring-2`}
                  placeholder="Enter wallet address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (ETH) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  step="0.001"
                  value={sendForm.amount}
                  onChange={(e) => {
                    setSendForm({ ...sendForm, amount: e.target.value });
                    setFormErrors({ ...formErrors, amount: false });
                  }}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 bg-gray-50/50 ${
                    formErrors.amount 
                      ? 'border-red-500 focus:ring-red-200' 
                      : sendForm.amount 
                        ? 'border-green-500 focus:ring-green-200' 
                        : 'border-gray-200 focus:ring-blue-200'
                  } focus:ring-2`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input 
                  type="text"
                  value={sendForm.description}
                  onChange={(e) => setSendForm({ ...sendForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50/50"
                  placeholder="Add a description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                <select
                  value={sendForm.purpose}
                  onChange={(e) => setSendForm({ ...sendForm, purpose: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50/50"
                >
                  <option value="">Select purpose</option>
                  <option value="payment">Payment</option>
                  <option value="loan">Loan</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 font-medium transition-colors duration-200"
              >
                Send
              </button>
            </form>
          </div>
        );
      case 'receive':
        return (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Receive Money</h2>
            <div className="space-y-6">
              <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Your Wallet Address</p>
                <p className="font-mono text-lg break-all text-gray-900">{walletAddress}</p>
              </div>
              <div className="text-center">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast.success('Address copied to clipboard');
                  }}
                  className="bg-blue-600 text-white py-3 px-8 rounded-xl hover:bg-blue-700 font-medium transition-colors duration-200"
                >
                  Copy Address
                </button>
              </div>
            </div>
          </div>
        );
      case 'loans':
        return (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan History</h2>
            <div className="space-y-4">
              {[
                { 
                  id: 1, 
                  amount: "0.5 ETH", 
                  status: "Active", 
                  date: "2024-03-15",
                  interestRate: 5,
                  duration: 30
                },
                { 
                  id: 2, 
                  amount: "1.2 ETH", 
                  status: "Repaid", 
                  date: "2024-02-28",
                  interestRate: 4.5,
                  duration: 60
                },
              ].map(loan => (
                <div key={loan.id} className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{loan.amount}</p>
                      <p className="text-sm text-gray-600">{loan.date}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-4 py-1 rounded-full text-sm font-medium ${
                        loan.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {loan.status}
                      </span>
                      <button
                        onClick={() => setSelectedLoan(loan)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                      >
                        <Eye className="w-5 h-5 text-blue-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'lending':
        return (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan Requests</h2>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    borrower: "0x123...abc",
                    amount: "2.0 ETH",
                    duration: "30 days",
                    interestRate: "5%",
                    purpose: "Business expansion",
                    collateral: "3.0 ETH"
                  },
                  {
                    id: 2,
                    borrower: "0x456...def",
                    amount: "1.5 ETH",
                    duration: "60 days",
                    interestRate: "4.5%",
                    purpose: "Education expenses",
                    collateral: "2.0 ETH"
                  }
                ].map(request => (
                  <div key={request.id} className="p-6 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xl font-semibold text-gray-900">{request.amount}</p>
                        <p className="text-sm text-gray-600">{request.borrower}</p>
                      </div>
                      <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium">
                        Lend
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50/50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Duration:</span>
                        <p className="font-medium text-gray-900">{request.duration}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Interest:</span>
                        <p className="font-medium text-gray-900">{request.interestRate}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Purpose:</span>
                        <p className="font-medium text-gray-900">{request.purpose}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Collateral:</span>
                        <p className="font-medium text-gray-900">{request.collateral}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Suggested Opportunities</h2>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    borrower: "0x789...ghi",
                    amount: "3.0 ETH",
                    duration: "45 days",
                    interestRate: "6%",
                    risk: "Low",
                    rating: "A+"
                  },
                  {
                    id: 2,
                    borrower: "0xabc...jkl",
                    amount: "1.8 ETH",
                    duration: "30 days",
                    interestRate: "5.5%",
                    risk: "Medium",
                    rating: "B+"
                  }
                ].map(opportunity => (
                  <div key={opportunity.id} className="p-6 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xl font-semibold text-gray-900">{opportunity.amount}</p>
                        <p className="text-sm text-gray-600">{opportunity.borrower}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          opportunity.risk === 'Low' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {opportunity.risk} Risk
                        </span>
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium">
                          Lend
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50/50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Duration:</span>
                        <p className="font-medium text-gray-900">{opportunity.duration}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Interest:</span>
                        <p className="font-medium text-gray-900">{opportunity.interestRate}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Rating:</span>
                        <p className="font-medium text-gray-900">{opportunity.rating}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Balance</h2>
                <div className="flex items-center justify-center">
                  <p className="text-5xl font-bold text-blue-600">
                    {balance || '0.00 ETH'}
                  </p>
                  {!balance && isConnected && (
                    <button
                      onClick={() => getBalance(walletAddress)}
                      className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                    >
                      <Eye className="w-6 h-6 text-blue-600" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab('send')}
                  className="p-6 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors duration-200 group"
                >
                  <Send className="w-8 h-8 mb-3 mx-auto text-blue-600 group-hover:scale-110 transition-transform duration-200" />
                  <p className="text-sm font-medium text-gray-900">Send</p>
                </button>
                <button 
                  onClick={() => setActiveTab('receive')}
                  className="p-6 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors duration-200 group"
                >
                  <Download className="w-8 h-8 mb-3 mx-auto text-blue-600 group-hover:scale-110 transition-transform duration-200" />
                  <p className="text-sm font-medium text-gray-900">Receive</p>
                </button>
                <button 
                  onClick={() => setActiveTab('lending')}
                  className="p-6 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors duration-200 group"
                >
                  <HandCoins className="w-8 h-8 mb-3 mx-auto text-blue-600 group-hover:scale-110 transition-transform duration-200" />
                  <p className="text-sm font-medium text-gray-900">Available Lending</p>
                </button>
                <button 
                  onClick={() => setActiveTab('loans')}
                  className="p-6 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors duration-200 group"
                >
                  <History className="w-8 h-8 mb-3 mx-auto text-blue-600 group-hover:scale-110 transition-transform duration-200" />
                  <p className="text-sm font-medium text-gray-900">Loan History</p>
                </button>
                <button 
                  onClick={() => setActiveTab('transactions')}
                  className="p-6 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors duration-200 group"
                >
                  <Clock className="w-8 h-8 mb-3 mx-auto text-blue-600 group-hover:scale-110 transition-transform duration-200" />
                  <p className="text-sm font-medium text-gray-900">Transactions</p>
                </button>
                <button 
                  onClick={() => setActiveTab('blocked')}
                  className="p-6 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors duration-200 group"
                >
                  <Ban className="w-8 h-8 mb-3 mx-auto text-blue-600 group-hover:scale-110 transition-transform duration-200" />
                  <p className="text-sm font-medium text-gray-900">Blocked Accounts</p>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  const renderLoanDetails = () => {
    if (!selectedLoan) return null;
    return null; // Placeholder return until loan details UI is implemented
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {activeTab !== 'dashboard' && (
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">TrustiFi</h1>
                <p className="text-sm text-gray-600">Decentralized Lending Platform</p>
              </div>
            </div>
            {isConnected ? (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200">
                  <span className="font-medium text-gray-900">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 p-1 z-10">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } flex items-center space-x-2 w-full px-4 py-2 text-left text-sm rounded-lg`}
                        onClick={() => setActiveTab('settings')}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } flex items-center space-x-2 w-full px-4 py-2 text-left text-sm text-red-600 rounded-lg`}
                        onClick={handleDisconnect}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            ) : (
              <button
                onClick={handleConnect}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
        {renderContent()}
      </div>
      {renderLoanDetails()}
      {renderTransactionDetails()}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;