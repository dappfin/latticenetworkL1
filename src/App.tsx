import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ExplorerLayout } from "@/components/explorer/ExplorerLayout";
import { Overview } from "@/pages/explorer/Overview";
import { Network } from "@/pages/explorer/Network";
import { Blocks } from "@/pages/explorer/Blocks";
import { BlockDetail } from "@/pages/explorer/BlockDetail";
import { Transactions } from "@/pages/explorer/Transactions";
import { TransactionDetail } from "@/pages/explorer/TransactionDetail";
import { Accounts } from "@/pages/explorer/Accounts";
import { Contracts } from "@/pages/explorer/Contracts";
import { Validators } from "@/pages/explorer/Validators";
import { Consensus } from "@/pages/explorer/Consensus";
import { EVM } from "@/pages/explorer/EVM";
import { Developers } from "@/pages/explorer/Developers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/explorer" replace />} />
          <Route path="/explorer" element={<ExplorerLayout />}>
            <Route index element={<Overview />} />
            <Route path="network" element={<Network />} />
            <Route path="blocks" element={<Blocks />} />
            <Route path="blocks/:blockNumber" element={<BlockDetail />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="transactions/:txHash" element={<TransactionDetail />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="validators" element={<Validators />} />
            <Route path="consensus" element={<Consensus />} />
            <Route path="evm" element={<EVM />} />
            <Route path="developers" element={<Developers />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
