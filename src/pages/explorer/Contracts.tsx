import { useState } from "react";
import { FileCode, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Contracts = () => {
  const [searchAddress, setSearchAddress] = useState("");

  const handleSearch = () => {
    // Will be connected to RPC
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Contracts</h1>
        <p className="text-muted-foreground mt-1">Inspect smart contract state</p>
      </div>

      {/* Search */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Lookup Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter contract address (0x...)"
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

      <div className="text-center py-12 text-muted-foreground">
        <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Enter a contract address to view details</p>
      </div>
    </div>
  );
};
