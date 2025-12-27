import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas_price: string;
  gas_limit: string;
  status: string;
  layer_number: number;
  timestamp: string;
}

interface DAGLayer {
  layer_number: number;
  timestamp: string;
  transactions: string[];
  validator_votes: string[];
  merkle_root: string;
  is_soft_final: boolean;
  is_hard_final: boolean;
  total_stake: number;
  participating_stake: number;
}

interface ValidatorVote {
  validator_id: string;
  layer_number: number;
  vote_hash: string;
  timestamp: string;
  signature: string;
  is_supporting: boolean;
}

interface Account {
  address: string;
  balance: string;
  nonce: number;
  transaction_count: number;
  last_updated: string;
}

const Explorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'layers' | 'validators' | 'accounts'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [layers, setLayers] = useState<DAGLayer[]>([]);
  const [validatorVotes, setValidatorVotes] = useState<ValidatorVote[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const API_BASE = 'http://localhost:8081/api';

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [txsRes, layersRes, votesRes, accountsRes] = await Promise.all([
        fetch(`${API_BASE}/transactions`).then(r => r.json()),
        fetch(`${API_BASE}/layers`).then(r => r.json()),
        fetch(`${API_BASE}/validators`).then(r => r.json()),
        fetch(`${API_BASE}/accounts`).then(r => r.json())
      ]);

      setTransactions(txsRes || []);
      setLayers(layersRes || []);
      setValidatorVotes(votesRes || []);
      setAccounts(accountsRes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'soft_final': return 'bg-blue-100 text-blue-800';
      case 'final': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'soft_final': return 'Soft Final';
      case 'final': return 'Final';
      default: return status;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredTransactions = transactions.filter(tx =>
    tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.to.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLayers = layers.filter(layer =>
    layer.layer_number.toString().includes(searchQuery) ||
    layer.merkle_root.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTransactions = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <input
          type="text"
          placeholder="Search by hash, from, or to address..."
          className="px-4 py-2 border rounded-lg w-96"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="grid gap-4">
        {filteredTransactions.map((tx) => (
          <Card key={tx.hash} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-mono text-sm text-gray-600 mb-1">Hash</div>
                  <div className="font-semibold">{tx.hash}</div>
                </div>
                <Badge className={getStatusColor(tx.status)}>
                  {getStatusText(tx.status)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">From</div>
                  <div className="font-mono">{formatAddress(tx.from)}</div>
                </div>
                <div>
                  <div className="text-gray-600">To</div>
                  <div className="font-mono">{formatAddress(tx.to)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Value</div>
                  <div className="font-semibold">{tx.value}</div>
                </div>
                <div>
                  <div className="text-gray-600">Layer</div>
                  <div>{tx.layer_number}</div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <div>Gas Price: {tx.gas_price} | Gas Limit: {tx.gas_limit}</div>
                <div>Timestamp: {formatTimestamp(tx.timestamp)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderLayers = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">DAG Layers</h2>
        <input
          type="text"
          placeholder="Search by layer number or Merkle root..."
          className="px-4 py-2 border rounded-lg w-96"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="grid gap-4">
        {filteredLayers.map((layer) => (
          <Card key={layer.layer_number} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-gray-600 mb-1">Layer</div>
                  <div className="text-2xl font-bold">#{layer.layer_number}</div>
                </div>
                <div className="flex gap-2">
                  {layer.is_soft_final && (
                    <Badge className="bg-blue-100 text-blue-800">Soft Final</Badge>
                  )}
                  {layer.is_hard_final && (
                    <Badge className="bg-green-100 text-green-800">Hard Final</Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <div className="text-gray-600">Transactions</div>
                  <div className="font-semibold">{layer.transactions.length}</div>
                </div>
                <div>
                  <div className="text-gray-600">Validator Votes</div>
                  <div className="font-semibold">{layer.validator_votes.length}</div>
                </div>
                <div>
                  <div className="text-gray-600">Total Stake</div>
                  <div>{layer.total_stake}</div>
                </div>
                <div>
                  <div className="text-gray-600">Participating Stake</div>
                  <div>{layer.participating_stake}</div>
                </div>
              </div>
              
              <div className="text-sm">
                <div className="text-gray-600 mb-1">Merkle Root</div>
                <div className="font-mono break-all">{layer.merkle_root}</div>
                <div className="text-gray-600 mt-2">
                  Timestamp: {formatTimestamp(layer.timestamp)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderValidators = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">Validators</h2>
      
      <div className="grid gap-4">
        {validatorVotes.map((vote, index) => (
          <Card key={`${vote.validator_id}-${index}`} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-gray-600 mb-1">Validator</div>
                  <div className="font-semibold">{vote.validator_id}</div>
                </div>
                <Badge className={vote.is_supporting ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {vote.is_supporting ? 'Supporting' : 'Against'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Layer</div>
                  <div>{vote.layer_number}</div>
                </div>
                <div>
                  <div className="text-gray-600">Vote Hash</div>
                  <div className="font-mono break-all">{vote.vote_hash}</div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <div>Timestamp: {formatTimestamp(vote.timestamp)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAccounts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Accounts</h2>
        <input
          type="text"
          placeholder="Search by address..."
          className="px-4 py-2 border rounded-lg w-96"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="grid gap-4">
        {accounts
          .filter(account => 
            account.address.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((account) => (
          <Card key={account.address} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="text-gray-600 mb-1">Address</div>
                <div className="font-mono font-semibold">{account.address}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Balance</div>
                  <div className="font-semibold text-lg">{account.balance}</div>
                </div>
                <div>
                  <div className="text-gray-600">Nonce</div>
                  <div>{account.nonce}</div>
                </div>
                <div>
                  <div className="text-gray-600">Transaction Count</div>
                  <div>{account.transaction_count}</div>
                </div>
                <div>
                  <div className="text-gray-600">Last Updated</div>
                  <div>{formatTimestamp(account.last_updated)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading indexer data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Lattice Network Explorer</h1>
        <p className="text-gray-600">Real-time DAG layer and transaction monitoring</p>
      </div>

      <div className="mb-6">
        <div className="flex space-x-4 border-b">
          {[
            { id: 'transactions', label: 'Transactions' },
            { id: 'layers', label: 'DAG Layers' },
            { id: 'validators', label: 'Validators' },
            { id: 'accounts', label: 'Accounts' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`pb-2 px-4 ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <div className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleString()}
        </div>
        <Button onClick={fetchData} variant="outline">
          Refresh
        </Button>
      </div>

      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'layers' && renderLayers()}
      {activeTab === 'validators' && renderValidators()}
      {activeTab === 'accounts' && renderAccounts()}
    </div>
  );
};

export default Explorer;
