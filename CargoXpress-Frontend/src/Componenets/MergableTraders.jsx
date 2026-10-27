import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import {
  Boxes,
  Truck,
  User,
  Check,
  X,
  RefreshCw,
  GitMerge,
  ShieldCheck,
  PackageCheck
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SearchInput from "../components/ui/SearchInput";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import ErrorPanel from "../components/ui/ErrorPanel";
import { CardSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import Pagination from "./Pagination";
import { calculateRequiredCapacity } from "../utils/capacityCalculation";

const MergeableTraders = () => {
  const [mergeableTraders, setMergeableTraders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [confirmAcceptItem, setConfirmAcceptItem] = useState(null);
  const [confirmRejectItem, setConfirmRejectItem] = useState(null);

  const { showToast } = useToast();

  const navigate = useNavigate();
  const user = useSelector((store) => store.user);
  const isCompany = !user?.emailId?.endsWith("@cargoxpress.com") && user?.registrationNumber !== undefined;
  const isTrader = !user?.emailId?.endsWith("@cargoxpress.com") && user?.aadharNumber !== undefined;

  const fetchMergeableTraders = useCallback(async () => {
    if (isCompany || isTrader) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(BASE_URL + "/mergedTrader", {
        withCredentials: true,
      });
      setMergeableTraders(res.data.traderMergedData || []);
    } catch (err) {
      console.error("Error fetching mergeable traders:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch trader merge pool.");
      setMergeableTraders([]);
    } finally {
      setLoading(false);
    }
  }, [isCompany, isTrader]);

  useEffect(() => {
    if (user && isCompany) {
      showToast("neutral", "Access Restricted", "Consignor load matching and merge pools are managed by dispatch administration.");
      navigate("/company", { replace: true });
      return;
    }
    if (user && isTrader) {
      showToast("neutral", "Access Restricted", "Consignor load matching and merge pools are managed by dispatch administration.");
      navigate("/trader", { replace: true });
      return;
    }
    if (!isCompany && !isTrader) {
      fetchMergeableTraders();
    }
  }, [user, isCompany, isTrader, navigate, fetchMergeableTraders, showToast]);

  if (isCompany || isTrader) {
    return null;
  }

  const handleAcceptTrader = async (trader) => {
    const reqId = trader.traderRequestId;
    try {
      setActionLoading((prev) => ({ ...prev, [reqId]: "accept" }));
      await axios.post(BASE_URL + "/acceptTrader", trader, {
        withCredentials: true,
      });

      setConfirmAcceptItem(null);
      await fetchMergeableTraders();

      const assignedCap = trader.requiredCapacity || calculateRequiredCapacity(trader.load);
      showToast(
        "success",
        "Consignment Merged",
        `Assigned ${assignedCap ? `${assignedCap.toLocaleString()} kg` : "cargo"} to carrier ${trader.truckLicensePlate}.`
      );
    } catch (err) {
      console.error("Error accepting trader:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to merge trader.";
      showToast("error", "Merge Failed", errorMsg);
    } finally {
      setActionLoading((prev) => ({ ...prev, [reqId]: null }));
    }
  };

  const handleRejectTrader = async (trader) => {
    const reqId = trader.traderRequestId;
    try {
      setActionLoading((prev) => ({ ...prev, [reqId]: "reject" }));
      await axios.post(
        BASE_URL + "/rejectTrader",
        { traderRequestId: reqId },
        { withCredentials: true }
      );

      setMergeableTraders((prev) => (prev ? prev.filter((t) => t.traderRequestId !== reqId) : []));
      setConfirmRejectItem(null);

      showToast("neutral", "Consignment Rejected", "Trader request dismissed from current merge pool.");
    } catch (err) {
      console.error("Error rejecting trader:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to reject trader.";
      showToast("error", "Rejection Failed", errorMsg);
    } finally {
      setActionLoading((prev) => ({ ...prev, [reqId]: null }));
    }
  };

  const handleMergeAllTraders = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, mergeAll: true }));
      const res = await axios.post(
        BASE_URL + "/mergeAllTraders",
        {},
        { withCredentials: true }
      );

      showToast("success", "Batch Merged", res.data.message || "All matched trader requests consolidated.");
      setMergeableTraders([]);
    } catch (err) {
      console.error("Error merging all traders:", err);
      showToast("error", "Batch Merge Failed", "Could not merge all traders.");
    } finally {
      setActionLoading((prev) => ({ ...prev, mergeAll: false }));
    }
  };

  // Filter
  const filteredTraders = (mergeableTraders || []).filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const traderName = t.traderName?.toLowerCase() || "";
    const source = t.source?.toLowerCase() || "";
    const dest = t.destination?.toLowerCase() || "";
    const plate = t.truckLicensePlate?.toLowerCase() || "";
    return traderName.includes(q) || source.includes(q) || dest.includes(q) || plate.includes(q);
  });

  const totalItems = filteredTraders.length;
  const paginatedTraders = filteredTraders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (user && isCompany) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Consignment Load Consolidation"
        title="Trader Consignments Merge Pool"
        description="Inspect commodity trader consignment requests matched with scheduled carrier routes based on corridor alignment and payload headroom."
        badge={<Badge variant="emerald" dot>Trader Pool Live</Badge>}
        breadcrumbs={[
          { label: "Dispatch", href: "/admin" },
          { label: "Trader Merging" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchMergeableTraders}
              isLoading={loading}
              leftIcon={RefreshCw}
            >
              Refresh Pool
            </Button>
            {mergeableTraders && mergeableTraders.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMergeAllTraders}
                isLoading={actionLoading.mergeAll}
                leftIcon={GitMerge}
              >
                Merge All ({mergeableTraders.length})
              </Button>
            )}
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <ErrorPanel
          title="Trader Pool Error"
          message={error}
          onRetry={fetchMergeableTraders}
        />
      )}

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Matches"
          value={mergeableTraders ? mergeableTraders.length : "—"}
          unit="Consignments"
          icon={Boxes}
          subtitle="Awaiting carrier assignment confirmation"
          change={mergeableTraders?.length > 0 ? "Ready to Assign" : "Queue Empty"}
          changeType={mergeableTraders?.length > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Corridor Optimization"
          value="AI Filtered"
          unit="Active"
          icon={ShieldCheck}
          subtitle="Verified route subset & capacity headroom"
          change="Automated"
          changeType="positive"
        />
        <StatCard
          label="Carrier Assignment"
          value="Single Truck"
          unit="Target"
          icon={Truck}
          subtitle="Consolidating partial loads onto carriers"
          change="Efficiency"
          changeType="positive"
        />
      </div>

      {/* 3. Search and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-border/80">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-subtle">
            Available Matches: <strong className="text-ink">{totalItems}</strong>
          </span>
        </div>

        <div className="max-w-xs w-full">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search trader, city, or plate..."
          />
        </div>
      </div>

      {/* 4. Candidate Matches List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : paginatedTraders.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paginatedTraders.map((trader, idx) => {
              const reqId = trader.traderRequestId;
              const isProcessing =
                actionLoading[reqId] === "accept" || actionLoading[reqId] === "reject";
              const weightKg = trader.requiredCapacity || calculateRequiredCapacity(trader.load);

              return (
                <Card
                  key={reqId || idx}
                  className="p-6 flex flex-col justify-between hover:border-signal-emerald/40 transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Header: Trader Info + Quick Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-signal-emerald/10 text-signal-emerald">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-ink">
                            {trader.traderName || "Consignor Trader"}
                          </h4>
                          <span className="text-[10px] font-mono text-ink-subtle block">
                            Request #{reqId?.slice(-6)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmRejectItem(trader)}
                          disabled={isProcessing}
                          className="h-8 px-2.5 text-xs text-signal-coral hover:bg-signal-coral/10 hover:border-signal-coral/30"
                          leftIcon={X}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConfirmAcceptItem(trader)}
                          disabled={isProcessing}
                          isLoading={actionLoading[reqId] === "accept"}
                          className="h-8 px-3 text-xs"
                          leftIcon={Check}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>

                    {/* Corridor & Weight Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* Consignment Request */}
                      <div className="p-3 rounded-lg bg-surface/50 border border-border/60 space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-signal-emerald font-semibold block">
                          Consignment Cargo
                        </span>
                        <div className="font-semibold text-ink">
                          {trader.source} <span className="text-ink-subtle">→</span> {trader.destination}
                        </div>
                        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                          <span className="text-ink-subtle">Required Capacity:</span>
                          <span className="font-mono font-bold text-signal-emerald">
                            {weightKg?.toLocaleString()} kg
                          </span>
                        </div>
                      </div>

                      {/* Matched Carrier Truck */}
                      <div className="p-3 rounded-lg bg-surface/50 border border-border/60 space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-semibold block">
                          Assigned Carrier
                        </span>
                        <div className="font-mono font-bold text-ink text-sm">
                          {trader.truckLicensePlate}
                        </div>
                        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                          <span className="text-ink-subtle">Route Corridor:</span>
                          <span className="font-mono text-ink-muted truncate max-w-[120px]">
                            {trader.truckStops?.join(" → ") || "Compatible"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Status guarantee */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-ink-subtle">
                    <span className="flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-signal-emerald" />
                      Payload fits carrier&apos;s remaining headroom
                    </span>
                    <Badge variant="aqua" size="sm">Corridor Verified</Badge>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalItems > itemsPerPage && (
            <div className="flex justify-center pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalItems / itemsPerPage)}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Boxes}
          title={mergeableTraders === null ? "Trader Pool Ready" : "No Pending Trader Matches"}
          description={
            mergeableTraders === null
              ? "Click 'Refresh Pool' above to fetch pending trader consignment requests matched with trucks."
              : searchQuery
              ? `No trader requests matched query "${searchQuery}".`
              : "All trader consignment requests have been assigned to carrier schedules or processed."
          }
        />
      )}

      {/* Confirmation Modal: Accept Trader Merge */}
      {confirmAcceptItem && (
        <Modal
          isOpen={!!confirmAcceptItem}
          onClose={() => setConfirmAcceptItem(null)}
          title="Confirm Consignment Allocation"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setConfirmAcceptItem(null)}
                disabled={actionLoading[confirmAcceptItem.traderRequestId] === "accept"}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAcceptTrader(confirmAcceptItem)}
                isLoading={actionLoading[confirmAcceptItem.traderRequestId] === "accept"}
                leftIcon={Check}
              >
                Confirm Allocation
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-sm text-ink font-medium leading-relaxed">
              Assign this consignment to carrier truck{" "}
              <strong className="text-signal-aqua">{confirmAcceptItem.truckLicensePlate}</strong>?
            </p>
            <div className="p-4 rounded-lg bg-surface-elevated border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Consignor:</span>
                <span className="font-bold text-ink">{confirmAcceptItem.traderName || "Trader"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Corridor:</span>
                <span className="font-mono text-ink">
                  {confirmAcceptItem.source} → {confirmAcceptItem.destination}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Weight:</span>
                <span className="font-mono font-bold text-signal-emerald">
                  {Array.isArray(confirmAcceptItem.load) ? confirmAcceptItem.load[0] : confirmAcceptItem.load} kg
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Reject Trader Merge */}
      {confirmRejectItem && (
        <Modal
          isOpen={!!confirmRejectItem}
          onClose={() => setConfirmRejectItem(null)}
          title="Reject Consignment Match"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setConfirmRejectItem(null)}
                disabled={actionLoading[confirmRejectItem.traderRequestId] === "reject"}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRejectTrader(confirmRejectItem)}
                isLoading={actionLoading[confirmRejectItem.traderRequestId] === "reject"}
                leftIcon={X}
              >
                Confirm Rejection
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-sm text-ink font-medium">
              Are you sure you want to dismiss this consignment pairing?
            </p>
            <p className="text-ink-subtle">
              The consignment will remain unassigned until another carrier schedule matches.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MergeableTraders;
