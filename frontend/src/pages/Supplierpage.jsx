import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { useDispatch, useSelector } from "react-redux";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import {
  CreateSupplier,
  gettingallSupplier,
  deleteSupplier,
  SearchSupplier,
  EditSupplier,
  getSupplierStats,
} from "../features/SupplierSlice";
import toast from "react-hot-toast";
import FormattedTime from "../lib/FormattedTime ";
import Pagination from "../Components/Pagination";

function Supplierpage() {
  const { getallSupplier, searchdata, editedsupplier, supplierDeliveries, supplierSummary, isLoadingStats } = useSelector(
    (state) => state.supplier
  );
  const { getallproduct } = useSelector((state) => state.product);
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [Phone, setPhone] = useState("");
  const [Address, setAddress] = useState("");
  const [Email, setEmail] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [Product, setProduct] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Stats filter state
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [statsSearched, setStatsSearched] = useState(false);

  useEffect(() => {
    dispatch(gettingallSupplier());
  }, [dispatch, deleteSupplier, editedsupplier]);

  const handleFetchStats = () => {
    setStatsSearched(true);
    dispatch(getSupplierStats({
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      supplierId: filterSupplierId || undefined,
    }));
  };

  const handleClearStats = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSupplierId("");
    setStatsSearched(false);
  };


  useEffect(() => {
    if (query.trim() !== "") {
      const timeoutId = setTimeout(() => {
        dispatch(SearchSupplier(query));
        setCurrentPage(1);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      dispatch(gettingallSupplier());
      setCurrentPage(1);
    }
  }, [query, dispatch]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setEmail("");
    setProduct("");
    setSelectedSupplier(null);
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!selectedSupplier) return;

    const updatedData = {
      name,
      contactInfo: {
        phone: Phone,
        email: Email,
        address: Address,
      },
      productsSupplied: Product ? [Product] : [],
    };

    dispatch(EditSupplier({ supplierId: selectedSupplier._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Supplier updated successfully");
        setIsFormVisible(false);
        setSelectedSupplier(null);
        resetForm();
      })
      .catch(() => {
        toast.error("Failed to update supplier");
      });
  };

  const handleEditClick = (supplier) => {
    if (!supplier) return;
    setSelectedSupplier(supplier);
    setName(supplier.name || '');
    setPhone(supplier.contactInfo?.phone || '');
    setEmail(supplier.contactInfo?.email || '');
    setAddress(supplier.contactInfo?.address || '');
    const firstProduct = supplier?.productsSupplied;
    if (Array.isArray(firstProduct)) {
      setProduct(firstProduct[0]?._id || firstProduct[0] || '');
    } else {
      setProduct(firstProduct?._id || firstProduct || '');
    }
    setIsFormVisible(true);
  };

  const handleRemove = async (SupplierId) => {
    dispatch(deleteSupplier(SupplierId))
      .unwrap()
      .then(() => {
        toast.success("Supplier removed successfully");
      })
      .catch((error) => {
        toast.error(error || "Failed to remove Supplier");
      });
  };

  const submitSupplier = async (event) => {
    event.preventDefault();

    const supplierInfo = {
      name,
      contactInfo: {
        phone: Phone,
        email: Email,
        address: Address,
      },
      productsSupplied: Product,
    };
    dispatch(CreateSupplier(supplierInfo))
      .unwrap()
      .then(() => {
        toast.success("Supplier added successfully");
        resetForm();
        dispatch(gettingallSupplier());
      })
      .catch(() => {
        toast.error("Supplier add unsuccessful");
      });
  };

  const displaySuppliers = query.trim() !== "" ? searchdata : getallSupplier;
  const safeSuppliers = Array.isArray(displaySuppliers) ? [...displaySuppliers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeSuppliers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeSuppliers.length / itemsPerPage);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  if (!getallSupplier) {
    return <div>Loading suppliers...</div>;
  }

  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />
      <div className="mt-10 ml-5 mb-10">
      <div className="bg-blue-950 w-56 rounded-xl  ml-10 block h-24">
          <h1 className="text-white ml-12 block pt-5 font-bold">Total Supplier</h1>
          <p className="text-white font-bold  pt-2  ml-24">{getallSupplier?.length || "0"}</p>

        </div>
        <div className="flex items-center space-x-4  mt-10">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-96 h-12 pl-4 pr-12 border-2 border-gray-300 rounded-lg bg-base-100"
            placeholder="Search for supplier"
          />
          <button
            onClick={() => {
              setIsFormVisible(true);
              setSelectedSupplier(null);
              resetForm();
            }}
            className="bg-blue-800 text-white w-40 h-12 rounded-lg flex items-center justify-center"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Supplier
          </button>
        </div>

        {isFormVisible && (
          <div className="absolute top-16 bg-base-100 right-0 h-svh p-6 border-2 border-gray-300 rounded-lg shadow-md transition-transform transform">
            <div className="text-right">
              <MdKeyboardDoubleArrowLeft
                onClick={() => setIsFormVisible(false)}
                className="cursor-pointer text-2xl"
              />
            </div>

            <h1 className="text-xl font-semibold mb-4">
              {selectedSupplier ? "Edit Supplier" : "Add Supplier"}
            </h1>

            <form onSubmit={selectedSupplier ? handleEditSubmit : submitSupplier}>
              <div className="mb-4">
                <label>Name</label>
                <input
                  value={name}
                  placeholder="Enter Supplier name"
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
                />
              </div>

              <div className="mb-4">
                <label>Phone</label>
                <input
                  value={Phone}
                  placeholder="Enter Supplier Phone"
                  onChange={(e) => setPhone(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
                />
              </div>

              <div className="mb-4">
                <label>Email</label>
                <input
                  value={Email}
                  placeholder="example@email.com"
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
                />
              </div>

              <div className="mb-4">
                <label>Address</label>
                <input
                  type="text"
                  placeholder="Enter Supplier Address"
                  value={Address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
                />
              </div>

              <div className="mb-4">
                <label>Product</label>
                <select
                  value={Product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2 bg-base-100"
                >
                  <option value="">Select a product</option>
                  {getallproduct?.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="bg-blue-800 text-white w-full h-12 rounded-lg hover:bg-blue-700 mt-4"
              >
                {selectedSupplier ? "Update Supplier" : "Add Supplier"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Supplier List</h2>
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
            <table className="min-w-full whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date Added</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.isArray(currentItems) && currentItems.length > 0 ? (
                  currentItems?.map((supplier, index) => (
                    <tr key={supplier._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-600">{indexOfFirstItem + index + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-800">{supplier.name}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-600">
                        {supplier.contactInfo?.phone || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-blue-600">
                        {supplier.contactInfo?.email || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-[150px]">
                        {supplier.contactInfo?.address || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500">
                        <FormattedTime timestamp={supplier.createdAt} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditClick(supplier)}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors border border-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(supplier?._id)}
                            className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded transition-colors border border-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        <span className="text-lg font-medium">No Suppliers Found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              handlePrevPage={handlePrevPage}
              handleNextPage={handleNextPage}
            />
          )}
        </div>

        {/* ── Supplier Delivery Analytics ── */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Supplier Delivery Analytics</h2>
          <p className="text-sm text-gray-400 mb-5">Filter by date range and/or supplier to view delivery history</p>

          {/* Filter Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-10 px-3 border-2 border-gray-200 rounded-lg text-sm bg-base-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-10 px-3 border-2 border-gray-200 rounded-lg text-sm bg-base-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</label>
                <select
                  value={filterSupplierId}
                  onChange={(e) => setFilterSupplierId(e.target.value)}
                  className="h-10 px-3 border-2 border-gray-200 rounded-lg text-sm bg-base-100 focus:border-blue-500 focus:outline-none min-w-[180px]"
                >
                  <option value="">All Suppliers</option>
                  {Array.isArray(getallSupplier) && getallSupplier.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleFetchStats}
                className="h-10 px-5 bg-blue-800 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Search
              </button>
              {statsSearched && (
                <button
                  onClick={handleClearStats}
                  className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {!statsSearched ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mb-24">
              <svg className="w-12 h-12 mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <p className="text-gray-400 font-medium">Apply filters and click Search to view delivery data</p>
            </div>
          ) : isLoadingStats ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : supplierDeliveries && supplierDeliveries.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 text-white shadow">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Active Suppliers</p>
                  <p className="text-3xl font-extrabold mt-1">{supplierSummary.length}</p>
                  <p className="text-xs opacity-60 mt-1">in selected period</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-700 to-purple-700 rounded-2xl p-5 text-white shadow">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Total Purchases</p>
                  <p className="text-3xl font-extrabold mt-1">{supplierSummary.reduce((s, r) => s + (r.totalPurchases || 0), 0)}</p>
                  <p className="text-xs opacity-60 mt-1">purchase transactions</p>
                </div>
                <div className="bg-gradient-to-br from-teal-600 to-cyan-500 rounded-2xl p-5 text-white shadow">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Total Units In</p>
                  <p className="text-3xl font-extrabold mt-1">
                    {supplierDeliveries.reduce((s, r) => s + (r.quantitySupplied || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs opacity-60 mt-1">units received</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600 to-green-500 rounded-2xl p-5 text-white shadow">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Total Amount</p>
                  <p className="text-3xl font-extrabold mt-1">
                    Rs. {supplierSummary.reduce((s, r) => s + (r.totalAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs opacity-60 mt-1">spent on purchases</p>
                </div>
              </div>

              {/* Per-supplier bar summary */}
              {supplierSummary.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Units Supplied per Supplier</h3>
                  <div className="space-y-3">
                    {(() => {
                      const maxUnits = Math.max(...supplierSummary.map(r => r.totalUnitsSupplied), 1);
                      return supplierSummary.map((row, i) => (
                        <div key={row.supplierId || i}>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span className="font-semibold truncate max-w-[60%]">{row.supplierName}</span>
                            <span className="font-bold text-blue-700">{row.totalUnitsSupplied.toLocaleString()} units · Rs. {(row.totalAmount || 0).toLocaleString()} · {row.totalPurchases || 0} purchases</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all duration-700"
                              style={{
                                width: `${(row.totalUnitsSupplied / maxUnits) * 100}%`,
                                background: `hsl(${220 + i * 30}, 68%, ${50 - i * 2}%)`,
                              }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Individual delivery records table */}
              <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700">Delivery Records</h3>
                  <span className="text-xs text-gray-400">{supplierDeliveries.length} records found</span>
                </div>
                <table className="min-w-full whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Qty Supplied</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {supplierDeliveries.map((row, index) => {
                      const statusStyle =
                        row.status === "delivered" ? "bg-green-100 text-green-700" :
                        row.status === "cancelled" ? "bg-red-100 text-red-600" :
                        "bg-yellow-100 text-yellow-700";
                      return (
                        <tr key={row._id || index} className="hover:bg-gray-50/50 transition-colors duration-150">
                          <td className="px-4 py-3 text-xs font-semibold text-gray-400">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-gray-800">
                              {new Date(row.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {new Date(row.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                style={{ background: `hsl(${(row.supplierName?.charCodeAt(0) || 65) * 7}, 65%, 48%)` }}
                              >
                                {(row.supplierName || "?")[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-gray-800">{row.supplierName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 font-medium">{row.productName}</td>
                          <td className="px-4 py-3 text-[11px] text-gray-400 font-mono">{row.productSku}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-extrabold text-blue-700">{row.quantitySupplied}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-gray-700">Rs. {(row.amount || 0).toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyle}`}>
                              {row.status || "pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mb-24">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-400 font-medium">No deliveries found for the selected filters</p>
              <p className="text-gray-300 text-xs mt-1">Try a wider date range or different supplier</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Supplierpage;