import { useState } from "react";
import { User, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/explorer/DataTable";

interface AccountActivity {
  txHash: string;
  type: string;
  value: string;
  timestamp: string;
}

const mockAccount = {
  address: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
  balance: "1,234.5678 LATT",
  nonce: 142,
  transactions: [
    { txHash: "0x8a2f...e4b1", type: "Transfer", value: "-0.5 LATT", timestamp: "2m ago" },
    { txHash: "0x7c1e...b2a9", type: "Contract Call", value: "-0.001 LATT", timestamp: "15m ago" },
    { txHash: "0x6b3d...a1c8", type: "Transfer", value: "+10.0 LATT", timestamp: "1h ago" },
    { txHash: "0x5a2c...d7e9", type: "Transfer", value: "-2.5 LATT", timestamp: "3h ago" },
  ] as AccountActivity[],
};

const activityColumns = [
  {
    key: "txHash",
    header: "TX Hash",
    render: (item: AccountActivity) => (
      <span className="font-mono text-primary">{item.txHash}</span>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (item: AccountActivity) => (
      <span className="text-foreground">{item.type}</span>
    ),
  },
  {
    key: "value",
    header: "Value",
    render: (item: AccountActivity) => (
      <span className={`font-mono ${item.value.startsWith("+") ? "text-green-400" : "text-foreground"}`}>
        {item.value}
      </span>
    ),
  },
  {
    key: "timestamp",
    header: "Time",
    render: (item: AccountActivity) => (
      <span className="text-muted-foreground">{item.timestamp}</span>
    ),
  },
];

export const Accounts = () => {
  const [searchAddress, setSearchAddress] = useState("");
  const [account, setAccount] = useState<typeof mockAccount | null>(null);

  const handleSearch = () => {
    if (searchAddress) {
      setAccount(mockAccount);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Accounts</h1>
        <p className="text-muted-foreground mt-1">Inspect account state and activity</p>
      </div>

      {/* Search */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Lookup Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter address (0x...)"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="font-mono bg-secondary/30 border-border/50"
            />
            <Button onClick={handleSearch}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      {account && (
        <>
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Account State
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-sm font-mono text-foreground break-all">{account.address}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Balance</span>
                    <p className="text-lg font-semibold text-foreground">{account.balance}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Nonce</span>
                    <p className="text-lg font-semibold text-foreground">{account.nonce}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={activityColumns} data={account.transactions} />
            </CardContent>
          </Card>
        </>
      )}

      {!account && (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Enter an address to view account details</p>
        </div>
      )}
    </div>
  );
};
