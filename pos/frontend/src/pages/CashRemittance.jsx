import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API_ENDPOINTS } from "../config/api";
import { FaMoneyBillWave, FaSearch, FaFileInvoiceDollar, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const formatCurrency = (val) => {
    const abs = Math.abs(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val < 0 ? `-₱${abs}` : `₱${abs}`;
};

const CashRemittance = () => {
    const { isOwner, hasPermission } = useAuth();
    const [remittances, setRemittances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, BALANCED, OVER, SHORT

    const fetchRemittances = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API_ENDPOINTS.remittances);
            const data = await res.json();
            if (data.success) {
                setRemittances(data.data);
            } else {
                setError(data.message || "Failed to load remittances.");
            }
        } catch (err) {
            console.error("Error fetching remittances:", err);
            setError("Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRemittances();
    }, []);

    const filteredRemittances = remittances.filter(remit => {
        const matchesSearch = remit.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            remit._id.slice(-6).includes(searchTerm);

        const variance = remit.variance || 0;
        let matchesStatus = true;
        if (statusFilter === "BALANCED") matchesStatus = variance === 0;
        if (statusFilter === "OVER") matchesStatus = variance > 0;
        if (statusFilter === "SHORT") matchesStatus = variance < 0;

        return matchesSearch && matchesStatus;
    });

    if (!isOwner() && !hasPermission("viewTransactions")) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center p-8 bg-red-50 rounded-2xl max-w-sm border border-red-100">
                    <FaFileInvoiceDollar className="mx-auto text-4xl text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
                    <p className="text-red-500 text-sm">You do not have permission to view cash remittances.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-in pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <FaMoneyBillWave className="text-[#22C55E]" />
                        Cash Remittances
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review end-of-shift reports and drawer variances.
                    </p>
                </div>

                <button
                    onClick={fetchRemittances}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by Cashier Name or Ref ID..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22C55E]/20 focus:border-[#22C55E] transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1 gap-1">
                    {['ALL', 'BALANCED', 'OVER', 'SHORT'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === status
                                    ? status === 'BALANCED' ? 'bg-green-100 text-green-700 shadow-sm'
                                        : status === 'OVER' ? 'bg-blue-100 text-blue-700 shadow-sm'
                                            : status === 'SHORT' ? 'bg-red-100 text-red-700 shadow-sm'
                                                : 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="py-4 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</th>
                                <th className="py-4 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Cashier</th>
                                <th className="py-4 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Net Sales</th>
                                <th className="py-4 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Cash to Remit</th>
                                <th className="py-4 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Variance</th>
                                <th className="py-4 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#22C55E]"></div>
                                        <p className="mt-2 text-sm text-gray-500">Loading remittances...</p>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                                            <FaExclamationTriangle className="text-red-500 text-xl" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-800">Error loading data</p>
                                        <p className="text-xs text-red-500 mt-1">{error}</p>
                                    </td>
                                </tr>
                            ) : filteredRemittances.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-16 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 border border-gray-100">
                                            <FaFileInvoiceDollar className="text-gray-300 text-2xl" />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-800 mb-1">No Remittances Found</h3>
                                        <p className="text-xs text-gray-500">
                                            {searchTerm || statusFilter !== 'ALL'
                                                ? "Try adjusting your filters."
                                                : "No cash remittances have been submitted yet."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRemittances.map((remit) => (
                                    <tr key={remit._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-4 px-5">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {new Date(remit.shiftDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(remit.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </td>
                                        <td className="py-4 px-5">
                                            <p className="text-sm font-semibold text-gray-800">{remit.employeeName}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 cursor-pointer hover:text-gray-600 transition-colors" title="Copy ID">
                                                #{remit._id.slice(-6).toUpperCase()}
                                            </p>
                                        </td>
                                        <td className="py-4 px-5 text-right">
                                            <span className="text-sm font-medium text-gray-600">
                                                {formatCurrency(remit.netSales)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-right">
                                            <span className="text-sm font-bold text-gray-800">
                                                {formatCurrency(remit.cashToRemit)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-right">
                                            <span className={`text-sm font-bold ${remit.variance === 0 ? 'text-green-600' :
                                                    remit.variance > 0 ? 'text-blue-600' : 'text-red-600'
                                                }`}>
                                                {remit.variance > 0 ? '+' : ''}{formatCurrency(remit.variance)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-center">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${remit.variance === 0 ? 'bg-green-100 text-green-700' :
                                                    remit.variance > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {remit.variance === 0 ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                                {remit.variance === 0 ? 'Balanced' : remit.variance > 0 ? 'Over' : 'Short'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-4 text-center">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                    Remittances are automatically recorded here when cashiers submit their end-of-shift reports.
                </p>
            </div>
        </div>
    );
};

export default CashRemittance;
