import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd, IoMdRemove } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { FiDownload } from "react-icons/fi";
import { AiOutlineExport } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { gettingallproducts } from '../features/productSlice'
import { gettingallCategory } from "../features/categorySlice";
import FormattedTime from "../lib/FormattedTime ";
import Pagination from "../Components/Pagination";
import {
  CreateSales, gettingallSales, EditSales, searchsalesdata, DeleteSale
} from "../features/salesSlice";
import { fetchAllStores } from "../features/storeSlice";
import SalesChart from '../lib/Salesgraph';
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";
import * as XLSX from 'xlsx';

function Salespage() {
  const { getallsales, searchdata, isgetallsales } = useSelector((state) => state.sales);
  const { getallproduct } = useSelector((state) => state.product);
  const { getallCategory } = useSelector((state) => state.category);
  const { stores } = useSelector((state) => state.store);
  const { Authuser } = useSelector((state) => state.auth);
  const isStaff = Authuser?.role === 'staff';
  const isAdminOrManager = Authuser?.role === 'admin' || Authuser?.role === 'manager';

  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  // Filter state for admin/manager
  const [filterStoreId, setFilterStoreId] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [name, setName] = useState("");
  const [products, setProducts] = useState([{
    product: "",
    quantity: 1,
    price: 0,
    category: "",
    subCategory: "",
    availablePrices: []
  }]);
  const [paymentStatus, setpaymentStatus] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState(""); // Store selection for admin/manager

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedSales, setselectedSales] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const itemsPerPage = 20;

  useEffect(() => {
    dispatch(gettingallSales());
    dispatch(gettingallproducts());
    dispatch(gettingallCategory());
    if (isAdminOrManager) dispatch(fetchAllStores());
  }, [dispatch]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(searchsalesdata(query));
        setCurrentPage(1);
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallSales());
      setCurrentPage(1);
    }
  }, [query, dispatch]);

  const addProductRow = () => {
    setProducts([...products, {
      product: "",
      quantity: 1,
      price: 0,
      category: "",
      subCategory: "",
      availablePrices: []
    }]);
  };

  const removeProductRow = (index) => {
    if (products.length > 1) {
      const newProducts = products.filter((_, i) => i !== index);
      setProducts(newProducts);
    }
  };

  const handleRowChange = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;

    if (field === "product") {
      const selectedProd = getallproduct?.find(p => p._id === value);
      if (selectedProd) {
        const identicalProducts = getallproduct?.filter(p => p.name === selectedProd.name);
        const prices = [...new Set(identicalProducts.map(p => p.Price || p.MRP).filter(Boolean))];
        newProducts[index].availablePrices = prices;
        newProducts[index].price = prices.length > 0 ? prices[0] : 0;
      }
    }
    setProducts(newProducts);
  };

  const calculateTotal = () => {
    return products.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!selectedSales) return;

    const updatedData = {
      customerName: name,
      products: products.map(p => ({
        product: p.product,
        quantity: Number(p.quantity),
        price: Number(p.price)
      })),
      paymentStatus,
      partialAmount: paymentStatus === "partial" ? Number(partialAmount) : 0,
      status: paymentStatus === "paid" ? "completed" : "pending",
      paymentMethod: "cash"
    };

    dispatch(EditSales({ salesId: selectedSales._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Sale updated successfully");
        setIsFormVisible(false);
        setselectedSales(null);
        resetForm();
      })
      .catch(() => toast.error("Failed to update sale"));
  };

  const submitsales = async (event) => {
    event.preventDefault();
    const salesData = {
      customerName: name,
      products: products.map(p => ({
        product: p.product,
        quantity: Number(p.quantity),
        price: Number(p.price)
      })),
      paymentMethod: "cash",
      paymentStatus,
      partialAmount: paymentStatus === "partial" ? Number(partialAmount) : 0,
      status: paymentStatus === "paid" ? "completed" : "pending"
    };

    // Add storeId for admin if they selected one (optional for admin)
    if (selectedStoreId) {
      salesData.storeId = selectedStoreId;
    }

    dispatch(CreateSales(salesData))
      .unwrap()
      .then(() => {
        toast.success("Sales added successfully");
        resetForm();
        setIsFormVisible(false);
      })
      .catch((err) => toast.error(err || "Sales add unsuccessful"));
  };

  const resetForm = () => {
    setName("");
    setProducts([{
      product: "",
      quantity: 1,
      price: 0,
      category: "",
      subCategory: "",
      availablePrices: []
    }]);
    setpaymentStatus("");
    setPartialAmount("");
    setSelectedStoreId(""); // Reset store selection
  };

  const handleEditClick = (sales) => {
    setselectedSales(sales);
    setName(sales.customerName);

    if (Array.isArray(sales.products)) {
      const mappedProducts = sales.products.map(p => {
        const prodData = p.product;
        const identicalProducts = getallproduct?.filter(ap => ap.name === prodData?.name);
        const prices = [...new Set(identicalProducts.map(ap => ap.Price || ap.MRP).filter(Boolean))];

        return {
          product: prodData?._id || "",
          quantity: p.quantity,
          price: p.price,
          category: prodData?.Category || "",
          subCategory: prodData?.SubCategory || "",
          availablePrices: prices
        };
      });
      setProducts(mappedProducts);
    }

    setpaymentStatus(sales.paymentStatus);
    setPartialAmount(sales.partialAmount || "");
    setIsFormVisible(true);
  };


  const applyFilter = () => {
    dispatch(gettingallSales({ storeId: filterStoreId, startDate: filterStartDate, endDate: filterEndDate }));
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} sales?`)) {
      toast.loading("Deleting sales...", { id: "bulk-delete" });
      try {
        await Promise.all(selectedItems.map(id => dispatch(DeleteSale(id))));
        toast.success("Sales deleted successfully", { id: "bulk-delete" });
        setSelectedItems([]);
        dispatch(gettingallSales());
      } catch (error) {
        toast.error("Failed to delete some sales", { id: "bulk-delete" });
      }
    }
  };

  const handleExportExcel = () => {
    if (!getallsales || getallsales.length === 0) {
      toast.error("No sales to export");
      return;
    }
    const exportData = getallsales.map(s => ({
      "Customer Name": s.customerName,
      "Total Amount": s.totalAmount,
      "Payment Status": s.paymentStatus,
      "Date": new Date(s.createdAt).toLocaleDateString(),
      "Store": s.storeId?.name || "N/A"
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
    XLSX.writeFile(workbook, "sales_export.xlsx");
    toast.success("Sales exported successfully");
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(currentItems.map(s => s._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const baseSales = query.trim() !== "" ? searchdata : getallsales;
  const displaySales = filterPaymentStatus ? baseSales.filter(s => s.paymentStatus === filterPaymentStatus) : baseSales;
  const safeSales = Array.isArray(displaySales) ? [...displaySales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeSales.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Summary row for filter
  const filteredRevenue = Array.isArray(displaySales)
    ? displaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    : 0;
  const selectedStoreName = stores?.find(s => s._id === filterStoreId)?.name || 'All Stores';

  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />
      <div className="mt-4 md:mt-12 px-4 md:px-6">
        <SalesChart className=" mb-10" />
        {/* Store/Date Filter for Admin & Manager */}
        {isAdminOrManager && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Store</label>
                <select
                  value={filterStoreId}
                  onChange={(e) => setFilterStoreId(e.target.value)}
                  className="h-10 px-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Stores</option>
                  {stores?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
                  className="h-10 px-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
                  className="h-10 px-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button onClick={applyFilter}
                className="h-10 px-6 bg-blue-800 text-white rounded-lg font-bold hover:bg-blue-700 transition text-sm">
                Apply Filter
              </button>
            </div>
            {displaySales && (
              <div className="mt-3 flex gap-6 text-sm text-gray-500 border-t pt-3">
                <span><b>{displaySales?.length || 0}</b> Records</span>
                <span>Total Revenue: <b className="text-blue-700">NRs {filteredRevenue.toLocaleString()}</b></span>
                <span>Filtered by: <b>{selectedStoreName}</b></span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-10">
          <input
            value={query}
            onChange={(e) => setquery(e.target.value)}
            type="text"
            className="w-full md:w-80 h-12 pl-4 pr-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            placeholder="Search sales..."
          />
          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="w-full md:w-48 h-12 pl-4 pr-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>

          {isAdminOrManager && selectedItems.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 h-12 rounded-lg flex items-center justify-center hover:bg-red-700 transition shadow-md font-semibold"
            >
              Delete ({selectedItems.length})
            </button>
          )}

          <button
            onClick={() => {
              setIsFormVisible(true);
              setselectedSales(null);
              resetForm();
            }}
            className="bg-blue-800 text-white w-40 h-12 rounded-lg flex items-center justify-center font-bold shadow-md hover:bg-blue-700 transition"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Sales
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-4 h-12 rounded-lg flex items-center justify-center hover:bg-green-700 transition shadow-md font-bold"
          >
            <AiOutlineExport className="text-xl mr-2" /> Export to Excel
          </button>
        </div>

        {isFormVisible && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsFormVisible(false)}
            />
            
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-[slideInRight_0.3s_ease-out]">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                <h1 className="text-xl font-bold text-gray-800">
                  {selectedSales ? "Edit Sales" : "Add Sales"}
                </h1>
                <button 
                  onClick={() => setIsFormVisible(false)}
                  className="p-2 rounded-full hover:bg-gray-200 transition text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={selectedSales ? handleEditSubmit : submitsales} className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-1"
                  required
                />
              </div>



              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">Products</label>
                  <button
                    type="button"
                    onClick={addProductRow}
                    className="text-blue-600 flex items-center text-sm font-bold hover:underline"
                  >
                    <IoMdAdd className="mr-1" /> Add Item
                  </button>
                </div>

                {products.map((item, index) => (
                  <div key={index} className="p-4 border-2 border-gray-100 rounded-xl mb-4 bg-gray-50 relative">
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProductRow(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                      >
                        <IoMdRemove />
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => handleRowChange(index, "category", e.target.value)}
                          className="w-full h-9 px-2 text-sm border rounded-lg mt-1"
                          required
                        >
                          <option value="">Select</option>
                          {getallCategory?.map((cat) => (
                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">Sub-Category</label>
                        <select
                          value={item.subCategory}
                          onChange={(e) => handleRowChange(index, "subCategory", e.target.value)}
                          className="w-full h-9 px-2 text-sm border rounded-lg mt-1"
                          required
                        >
                          <option value="">Select</option>
                          {[...new Set(getallproduct?.filter(p => p.Category === item.category).map(p => p.SubCategory).filter(Boolean))].map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-gray-500">Product</label>
                      <select
                        value={item.product}
                        onChange={(e) => handleRowChange(index, "product", e.target.value)}
                        className="w-full h-9 px-2 text-sm border rounded-lg mt-1"
                        required
                      >
                        <option value="">Select Product</option>
                        {getallproduct?.filter(p => p.Category === item.category && p.SubCategory === item.subCategory).map((prod) => (
                          <option key={prod._id} value={prod._id}>{prod.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-gray-500">Price</label>
                        {item.availablePrices.length > 1 ? (
                          <select
                            value={item.price}
                            onChange={(e) => handleRowChange(index, "price", e.target.value)}
                            className="w-full h-9 px-2 text-sm border rounded-lg mt-1"
                          >
                            {item.availablePrices.map((p, idx) => (
                              <option key={idx} value={p}>NRs {p}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={item.price}
                            readOnly
                            className="w-full h-9 px-2 text-sm border bg-gray-100 rounded-lg mt-1"
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleRowChange(index, "quantity", e.target.value)}
                          className="w-full h-9 px-2 text-sm border rounded-lg mt-1"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4 border-t-2 pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-700">Total Amount</label>
                  <div className="text-xl font-black text-blue-800">
                    NRs {calculateTotal()}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                <select
                  className="w-full h-10 px-2 border-2 rounded-lg mt-1"
                  value={paymentStatus}
                  onChange={(e) => setpaymentStatus(e.target.value)}
                  required
                >
                  <option value="">Select Status</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {paymentStatus === "partial" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Paid Amount</label>
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    className="w-full h-10 px-2 border-2 border-yellow-500 rounded-lg mt-1"
                    placeholder="Enter amount paid"
                    required
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="bg-blue-800 text-white w-full h-12 rounded-lg hover:bg-blue-700 transition font-bold shadow-lg"
                >
                  {selectedSales ? "Update Sale" : "Confirm Sale"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
        )}

        {isgetallsales ? (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mt-20"></div>
        ) : currentItems.length === 0 ? (
          <div className="px-6 py-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              <span className="text-lg font-medium">No Sales Found</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
            <table className="min-w-full whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                  {isAdminOrManager && (
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        onChange={handleSelectAll}
                        checked={currentItems.length > 0 && selectedItems.length === currentItems.length}
                      />
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">Customer</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">Items</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Amount</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Date</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((sales, index) => (
                  <tr key={sales?._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    {isAdminOrManager && (
                      <td className="px-3 py-2.5 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedItems.includes(sales._id)}
                          onChange={() => handleSelectItem(sales._id)}
                        />
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">{indexOfFirstItem + index + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-gray-800 text-xs">{sales?.customerName}</td>
                    <td className="px-3 py-2.5">
                      {Array.isArray(sales.products) && sales.products.length > 0 ? (
                        <div className="text-xs text-gray-600">
                          {sales.products.slice(0, 1).map((p, i) => {
                            const productName = typeof p.product === 'object' ? p.product?.name : p.product;
                            return (
                              <div key={i}>
                                <div className="font-bold text-gray-800 truncate w-40">{productName || 'Unknown Product'}</div>
                                <div className="text-gray-400 text-[10px] mt-0.5">x{p.quantity} {sales.products.length > 1 ? `(+${sales.products.length - 1} more)` : ''}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No products</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="text-xs font-bold text-blue-700">Rs. {sales?.totalAmount?.toLocaleString() ?? 0}</div>
                      {sales.paymentStatus === "partial" && (
                        <div className="text-[9px] text-orange-600 font-bold uppercase mt-0.5">Paid: {sales.partialAmount}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded border inline-flex text-[10px] font-bold uppercase tracking-widest ${sales?.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          sales?.paymentStatus === 'partial' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {sales?.paymentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[10px] text-gray-500 font-medium">
                      <FormattedTime timestamp={sales?.createdAt} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {!isStaff && (
                          <button
                            onClick={() => handleEditClick(sales)}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors border border-blue-100"
                          >
                            Edit
                          </button>
                        )}
                        {sales?.paymentStatus === 'paid' && (
                          <a
                            href={`${process.env.REACT_APP_BACKEND_URL}/api/invoice/${sales._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded transition border border-gray-200 flex items-center justify-center"
                            title="Download Invoice"
                          >
                            <FiDownload className="text-[11px]" />
                          </a>
                        )}
                        {isAdminOrManager && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this sale?")) {
                                dispatch(DeleteSale(sales._id));
                              }
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-100"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
                }
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
          />
        )}
      </div>
      
      {/* Slide-In animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default Salespage;