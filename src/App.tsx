import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  FileUp,
  Search,
  Trash2,
  Download,
  LayoutDashboard,
  Table as TableIcon,
  Filter,
  ArrowUpDown,
  X,
  Loader2,
  Menu,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

interface Person {
  id: string;
  name: string;
  approved: number;
  created_at: string;
}

const COLORS = ["#10b981", "#f59e0b"]; // Emerald-500, Amber-500

export default function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [newPerson, setNewPerson] = useState({ id: "", name: "", approved: false });
  const [view, setView] = useState<"dashboard" | "table">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const res = await fetch("/api/people");
      const data = await res.json();
      setPeople(data);
    } catch (error) {
      console.error("Failed to fetch people:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.id || !newPerson.name) return;

    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPerson),
      });
      if (res.ok) {
        fetchPeople();
        setNewPerson({ id: "", name: "", approved: false });
        setIsAdding(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add person");
      }
    } catch (error) {
      console.error("Error adding person:", error);
    }
  };

  const toggleApproval = async (id: string, currentStatus: number) => {
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !currentStatus }),
      });
      if (res.ok) fetchPeople();
    } catch (error) {
      console.error("Error updating approval:", error);
    }
  };

  const deletePerson = async () => {
    if (!personToDelete) return;
    try {
      const res = await fetch(`/api/people/${personToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPeople();
        setPersonToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting person:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const formattedData = data.map((row) => ({
        id: (row.ID || row.id || row["Person ID"] || "").toString(),
        name: (row.Name || row.name || row["Full Name"] || "").toString(),
        approved: row.Approved || row.approved || row.Status === "Approved" || false,
      })).filter(p => p.id && p.name);

      if (formattedData.length > 0) {
        try {
          const res = await fetch("/api/people/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ people: formattedData }),
          });
          if (res.ok) {
            fetchPeople();
            alert(`Successfully imported ${formattedData.length} records`);
          }
        } catch (error) {
          console.error("Bulk import failed:", error);
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(people.map(p => ({
      ID: p.id,
      Name: p.name,
      Status: p.approved ? "Approved" : "Pending",
      "Created At": new Date(p.created_at).toLocaleString(),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "People");
    XLSX.writeFile(wb, "people_data.xlsx");
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { ID: "EMP-001", Name: "John Doe", Approved: "TRUE" },
      { ID: "EMP-002", Name: "Jane Smith", Approved: "FALSE" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "personnel_template.xlsx");
  };

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || (filter === "approved" ? p.approved : !p.approved);
      return matchesSearch && matchesFilter;
    });
  }, [people, search, filter]);

  const stats = useMemo(() => {
    const total = people.length;
    const approved = people.filter((p) => p.approved).length;
    const pending = total - approved;
    return { total, approved, pending };
  }, [people]);

  const chartData = [
    { name: "Approved", value: stats.approved },
    { name: "Pending", value: stats.pending },
  ];

  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return last7Days.map((date) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: people.filter((p) => p.created_at.startsWith(date)).length,
    }));
  }, [people]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-200 bg-white p-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">ApproveFlow</h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-lg p-2 hover:bg-stone-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isSidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.nav
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "fixed left-0 top-0 z-50 h-full w-64 border-r border-stone-200 bg-white p-6 lg:z-30",
                !isSidebarOpen && "hidden lg:block"
              )}
            >
              <div className="mb-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight">ApproveFlow</h1>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg p-2 hover:bg-stone-100 lg:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setView("dashboard");
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    view === "dashboard" ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setView("table");
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    view === "table" ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                  )}
                >
                  <TableIcon className="h-4 w-4" />
                  People Directory
                </button>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">System Status</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium">Database Online</span>
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="p-6 lg:ml-64 lg:p-10">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
              {view === "dashboard" ? "Analytics Overview" : "Personnel Management"}
            </h2>
            <p className="mt-1 text-sm text-stone-500 lg:text-base">
              {view === "dashboard" ? "Monitor approval metrics and trends" : "Manage, filter and import personnel data"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={downloadTemplate}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-stone-50 sm:flex-none sm:px-4 sm:text-sm"
            >
              <Download className="h-4 w-4" />
              Template
            </button>
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-stone-50 sm:flex-none sm:px-4 sm:text-sm">
              <FileUp className="h-4 w-4" />
              Import
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </label>
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Person
            </button>
          </div>
        </header>

        {view === "dashboard" ? (
          <div className="space-y-6 lg:space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
              {[
                { label: "Total Personnel", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Pending Approval", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("rounded-xl p-2", stat.bg)}>
                      <stat.icon className={cn("h-5 w-5 lg:h-6 lg:w-6", stat.color)} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Live</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-stone-500 lg:text-sm">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight lg:text-4xl">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:p-6"
              >
                <h3 className="mb-6 text-base font-bold lg:text-lg">Approval Distribution</h3>
                <div className="h-[250px] w-full lg:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:p-6"
              >
                <h3 className="mb-6 text-base font-bold lg:text-lg">New Registrations (Last 7 Days)</h3>
                <div className="h-[250px] w-full lg:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#78716c" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#78716c" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                      />
                      <Bar dataKey="count" fill="#1c1917" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            {/* Table Controls */}
            <div className="flex flex-col gap-4 border-b border-stone-100 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-stone-400 focus:bg-white sm:w-64"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
                  {(["all", "approved", "pending"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1 text-[10px] font-semibold capitalize transition-all sm:flex-none sm:text-xs",
                        filter === f ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-stone-50"
              >
                <Download className="h-4 w-4" />
                Export Data
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/50 text-xs font-bold uppercase tracking-wider text-stone-400">
                    <th className="px-6 py-4">Person ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date Added</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <AnimatePresence mode="popLayout">
                    {filteredPeople.map((person) => (
                      <motion.tr
                        key={person.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group hover:bg-stone-50/50"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-semibold text-stone-500">{person.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{person.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleApproval(person.id, person.approved)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all",
                              person.approved
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            )}
                          >
                            {person.approved ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Approved
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" />
                                Pending
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-500">
                          {new Date(person.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setPersonToDelete(person)}
                            className="rounded-lg p-2 text-stone-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filteredPeople.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-stone-400">
                          <Search className="h-8 w-8 opacity-20" />
                          <p className="text-sm font-medium">No personnel found matching your criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>

      {/* Add Person Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold">Add New Person</h3>
                <button onClick={() => setIsAdding(false)} className="rounded-lg p-2 hover:bg-stone-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddPerson} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-400">
                    Personnel ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newPerson.id}
                    onChange={(e) => setNewPerson({ ...newPerson, id: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
                    placeholder="e.g. EMP-001"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-stone-900 focus:bg-white"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="approved"
                    checked={newPerson.approved}
                    onChange={(e) => setNewPerson({ ...newPerson, approved: e.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <label htmlFor="approved" className="text-sm font-medium text-stone-700">
                    Mark as Approved immediately
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-4 w-full rounded-xl bg-stone-900 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  Create Personnel Record
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {personToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPersonToDelete(null)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-stone-900">Delete Personnel?</h3>
              <p className="mt-2 text-sm text-stone-500">
                Are you sure you want to delete <span className="font-bold text-stone-900">{personToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setPersonToDelete(null)}
                  className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deletePerson}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
