import React, { useState, useEffect } from 'react';
import { Menu } from '@headlessui/react';
import { Toaster, toast } from 'react-hot-toast';
import { format, isAfter } from 'date-fns';
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
  ExternalLink,
  Filter,
  AlertTriangle,
  Ticket,
  Check,
  XCircle,
  Clock3
} from 'lucide-react';

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

interface BlockedAccount {
  address: string;
  reason: string;
  date: string;
  status: 'Permanent' | 'Temporary';
}

interface LoanRequest {
  id: number;
  borrower: string;
  amount: string;
  duration: string;
  interestRate: string;
  purpose: string;
  collateral: string;
  dueDate: string;
}

interface Loan {
  id: number;
  amount: string;
  status: 'Active' | 'Repaid' | 'Overdue';
  date: string;
  dueDate: string;
  interestRate: number;
  duration: number;
  borrower: string;
  lender: string;
}

function App() {
  const [balance, setBalance] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [searchBlocked, setSearchBlocked] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Permanent' | 'Temporary'>('all');
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedLoanForTicket, setSelectedLoanForTicket] = useState<Loan | null>(null);
  const [ticketForm, setTicketForm] = useState({
    reason: '',
    message: ''
  });
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
  const [loanFilter, setLoanFilter] = useState<'all' | 'Active' | 'Overdue' | 'Repaid'>('all');
  const [metamaskTransactions, setMetamaskTransactions] = useState<Transaction[]>([]);

  // Sample loan data with due dates
  const [loans] = useState<Loan[]>([
    { 
      id: 1, 
      amount: "0.5 ETH", 
      status: "Active", 
      date: "2024-03-15",
      dueDate: "2024-04-15",
      interestRate: 5,
      duration: 30,
      borrower: "0x123...abc",
      lender: "0x456...def"
    },
    { 
      id: 2, 
      amount: "1.2 ETH", 
      status: "Overdue", 
      date: "2024-02-28",
      dueDate: "2024-03-15",
      interestRate: 4.5,
      duration: 60,
      borrower: "0x789...ghi",
      lender: "0xabc...jkl"
    },
    { 
      id: 3, 
      amount: "0.8 ETH", 
      status: "Repaid", 
      date: "2024-01-15",
      dueDate: "2024-02-15",
      interestRate: 6,
      duration: 30,
      borrower: "0xdef...mno",
      lender: "0xpqr...stu"
    }
  ]);

  const [loanRequests] = useState<LoanRequest[]>([
    {
      id: 1,
      borrower: "0x21F462cB6e6cC8b500CeE7cf6C3EdF00c1dfe74B",
      amount: "0.0001",
      duration: "30 days",
      interestRate: "5%",
      purpose: "Business expansion",
      collateral: "0.0002 ETH",
      dueDate: "2024-04-15"
    },
    {
      id: 2,
      borrower: "0x21F462cB6e6cC8b500CeE7cf6C3EdF00c1dfe74B",
      amount: "0.0001",
      duration: "60 days",
      interestRate: "4.5%",
      purpose: "Education expenses",
      collateral: "0.0002 ETH",
      dueDate: "2024-05-15"
    }
  ]);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      const savedWallet = localStorage.getItem('walletAddress');
      const savedTransactions = localStorage.getItem('transactions');
      
      if (savedWallet) {
        setWalletAddress(savedWallet);
        setIsConnected(true);
        await getBalance(savedWallet);
      }
      
      if (savedTransactions) {
        setTransactions(JSON.parse(savedTransactions));
      }

      // Get all accounts
      if (window.ethereum) {
        try {
          const accs = await window.ethereum.request({ method: 'eth_accounts' });
          setAccounts(accs);
        } catch (error) {
          console.error("Error fetching accounts:", error);
        }
      }
    };

    loadPersistedData();
  }, []);

  useEffect(() => {
    const loadMetamaskTransactions = async () => {
      if (window.ethereum && walletAddress) {
        try {
          const response = await window.ethereum.request({
            method: 'eth_getTransactionsByAddress',
            params: [walletAddress]
          });

          if (response) {
            const formattedTransactions: Transaction[] = response.map((tx: any) => ({
              id: tx.hash,
              type: tx.from.toLowerCase() === walletAddress.toLowerCase() ? 'Sent' : 'Received',
              amount: `${parseInt(tx.value, 16) / 1e18} ETH`,
              to: tx.to,
              from: tx.from,
              date: new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0],
              hash: tx.hash,
              status: tx.status === '0x1' ? 'completed' : 'failed',
              gasUsed: tx.gasUsed,
              gasPrice: tx.gasPrice
            }));

            setMetamaskTransactions(formattedTransactions);
            setTransactions(prev => {
              const existingHashes = new Set(prev.map(t => t.hash));
              const newTxs = formattedTransactions.filter(t => !existingHashes.has(t.hash));
              return [...prev, ...newTxs];
            });
          }
        } catch (error) {
          console.error('Error fetching MetaMask transactions:', error);
        }
      }
    };

    loadMetamaskTransactions();
  }, [walletAddress]);

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

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

  const handleAccountsChanged = async (newAccounts: string[]) => {
    setAccounts(newAccounts);
    if (newAccounts.length === 0) {
      handleDisconnect();
    } else if (isConnected) {
      setWalletAddress(newAccounts[0]);
      await getBalance(newAccounts[0]);
    }
  };

  const handleLend = async (request: LoanRequest) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      // Always use 0.0001 ETH for the actual transaction
      const fixedAmount = '0.0001';
      const amountInWei = BigInt(parseFloat(fixedAmount) * 1e18).toString(16);
      
      const transactionParameters = {
        to: request.borrower,
        from: walletAddress,
        value: '0x' + amountInWei, // This will now always be 0.0001 ETH
      };

      const loadingToast = toast.loading('Processing loan transaction...');
      
      try {
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        });

        // Add transaction to history with the displayed amount from the request
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          type: 'Sent',
          amount: `-${request.amount} ETH`, // Keep the display amount as is
          to: request.borrower,
          date: new Date().toISOString().split('T')[0],
          hash: txHash,
          status: 'pending',
          description: `Loan to ${request.borrower}`,
          purpose: request.purpose
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
        toast.success('Loan sent successfully!');
        
        // Update balance
        await getBalance(walletAddress);
        
      } catch (error: any) {
        console.error('Loan transaction failed:', error);
        toast.dismiss(loadingToast);
        toast.error(error.message || 'Loan transaction failed');
        
        // Update transaction status if it exists
        if (error.transactionHash) {
          setTransactions(prev => prev.map(tx => 
            tx.hash === error.transactionHash 
              ? { ...tx, status: 'failed' }
              : tx
          ));
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to process loan');
    }
  };

  const handleRaiseTicket = (loan: Loan) => {
    setSelectedLoanForTicket(loan);
    setShowTicketModal(true);
  };

  const submitTicket = () => {
    if (!ticketForm.reason || !ticketForm.message) {
      toast.error('Please fill in all fields');
      return;
    }

    // Here you would typically submit the ticket to your backend
    toast.success('Ticket submitted successfully');
    setShowTicketModal(false);
    setTicketForm({ reason: '', message: '' });
    setSelectedLoanForTicket(null);
  };

  const switchAccount = async (address: string) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }], // Mainnet
      });
      
      setWalletAddress(address);
      await getBalance(address);
      toast.success('Account switched successfully');
    } catch (error) {
      console.error("Error switching account:", error);
      toast.error('Failed to switch account');
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
          setAccounts(accounts);
          localStorage.setItem('walletAddress', accounts[0]);
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
      localStorage.removeItem('walletAddress');
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

  const renderTicketModal = () => {
    if (!showTicketModal || !selectedLoanForTicket) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-[480px] border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Raise Repayment Ticket</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <select
                value={ticketForm.reason}
                onChange={(e) => setTicketForm(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select a reason</option>
                <option value="extension">Request Extension</option>
                <option value="partial">Partial Payment</option>
                <option value="difficulty">Payment Difficulty</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={ticketForm.message}
                onChange={(e) => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows={4}
                placeholder="Explain your situation..."
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={submitTicket}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 font-medium transition-colors duration-200"
              >
                Submit Ticket
              </button>
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedLoanForTicket(null);
                }}
                className="flex-1 bg-gray-100 text-gray-900 py-3 px-6 rounded-xl hover:bg-gray-200 font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

  const filteredLoans = loans.filter(loan => 
    loanFilter === 'all' ? true : loan.status === loanFilter
  );

  const renderLoanHistory = () => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Loan History</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setLoanFilter('all')}
            className={`px-4 py-2 rounded-xl transition-colors duration-200 ${
              loanFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setLoanFilter('Active')}
            className={`px-4 py-2 rounded-xl transition-colors duration-200 flex items-center space-x-2 ${
              loanFilter === 'Active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Active</span>
          </button>
          <button
            onClick={() => setLoanFilter('Overdue')}
            className={`px-4 py-2 rounded-xl transition-colors duration-200 flex items-center space-x-2 ${
              loanFilter === 'Overdue' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Overdue</span>
          </button>
          <button
            onClick={() => setLoanFilter('Repaid')}
            className={`px-4 py-2 rounded-xl transition-colors duration-200 flex items-center space-x-2 ${
              loanFilter === 'Repaid' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Clock3 className="w-4 h-4" />
            <span>Repaid</span>
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {filteredLoans.map(loan => {
          const isOverdue = isAfter(new Date(), new Date(loan.dueDate));
          const showOverdueWarning = loan.status === 'Active' && isOverdue;

          return (
            <div 
              key={loan.id} 
              className={`p-4 border rounded-xl hover:border-gray-200 transition-colors duration-200 ${
                showOverdueWarning ? 'border-red-300 bg-red-50' : 'border-gray-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-semibold text-gray-900">
                    Loan #{loan.id}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    loan.status === 'Active' ? 'bg-green-100 text-green-800' :
                    loan.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {loan.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Due Date</div>
                  <div className="font-medium">{format(new Date(loan.dueDate), 'MMM dd, yyyy')}</div>
                </div>
              </div>
              {showOverdueWarning && (
                <div className="mt-4 p-3 bg-red-100 rounded-lg flex items-center space-x-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span>This loan is overdue. Please make a payment as soon as possible.</span>
                </div>
              )}
            </div>
          );
        })}
        {filteredLoans.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No loans found for the selected status
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'loans':
        return renderLoanHistory();
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
      case 'lending':
        return (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan Requests</h2>
              <div className="space-y-4">
                {loanRequests.map(request => (
                  <div key={request.id} className="p-6 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xl font-semibold text-gray-900">{request.amount} ETH</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-600 font-mono">{request.borrower}</p>
                          <a 
                            href={`https://etherscan.io/address/${request.borrower}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleLend(request)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
                      >
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
                  <HandCoins className="w-8 h-8 mb-3  mx-auto text-blue-600 group-hover:scale-110 transition-transform duration-200" />
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
                <Menu.Items className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-1 z-10">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-600">Connected Accounts</p>
                  </div>
                  {accounts.map((account, index) => (
                    <Menu.Item key={index}>
                      {({ active }) => (
                        <button
                          className={`${
                            active ? 'bg-gray-50' : ''
                          } flex items-center justify-between w-full px-4 py-2 text-left text-sm rounded-lg ${
                            account === walletAddress ? 'text-blue-600' : 'text-gray-900'
                          }`}
                          onClick={() => switchAccount(account)}
                        >
                          <span className="font-mono">
                            {account.slice(0, 6)}...{account.slice(-4)}
                          </span>
                          {account === walletAddress && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                              Active
                            </span>
                          )}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
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
                  </div>
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
      {renderTicketModal()}
      {renderTransactionDetails()}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;