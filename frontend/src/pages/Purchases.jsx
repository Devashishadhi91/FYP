import React, { useEffect, useState, useCallback } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd, IoMdRemove } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import FormattedTime from "../lib/FormattedTime ";
import Purchasesgraph from '../lib/Purchasesgraph'
import {
  createPurchases,
  getAllPurchases,
  searchstockdata
} from "../features/purchasesSlice";
import {
  gettingallSupplier
} from "../features/SupplierSlice";
import {
  gettingallproducts,
} from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";
import toast from "react-hot-toast";
import Pagination from "../Components/Pagination";

function Purchases() {
  const { getallStocks, isgetallStocks, iscreatedStocks,searchdata } = useSelector(
    (state) => state.stocktransaction
  );

  const { getallSupplier } = useSelector(
    (state) => state.supplier
  );
  const { getallproduct } = useSelector(
    (state) => state.product
  );
  const { getallCategory } = useSelector((state) => state.category);
  const { Authuser } = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleGoToAddSupplier = () => {
    const role = Authuser?.role;
    if (role === "admin") navigate("/AdminDashboard/supplier");
    else if (role === "manager") navigate("/ManagerDashboard/supplier");
  };
const [query, setquery] = useState("");
  const [supplier, setsupplier] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [items, setItems] = useState([{ category: "", subCategory: "", product: "", quantity: 1 }]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Products belonging to the selected supplier
  const supplierProducts = supplier
    ? getallproduct?.filter(p => {
        const pSupplierId = typeof p.supplier === 'object' ? p.supplier?._id : p.supplier;
        return pSupplierId === supplier;
      }) || []
    : [];

  const getItemPrice = (productId) => {
    if (!productId) return 0;
    const prod = getallproduct?.find(p => p._id === productId);
    return prod?.Price || prod?.MRP || 0;
  };

  const addItem = () => setItems(prev => [...prev, { category: "", subCategory: "", product: "", quantity: 1 }]);

  const removeItem = (index) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Reset downstream fields when category/subCategory changes
      if (field === 'category') { updated[index].subCategory = ""; updated[index].product = ""; }
      if (field === 'subCategory') { updated[index].product = ""; }
      return updated;
    });
  };

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(searchstockdata(query));
        setCurrentPage(1);
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(getAllPurchases());
      setCurrentPage(1);
    }
  }, [query, dispatch]);

  useEffect(() => {
    dispatch(gettingallproducts());
    dispatch(getAllPurchases());
    dispatch(gettingallSupplier());
    dispatch(gettingallCategory());
  }, [dispatch]);

  const resetForm = () => {
    setsupplier("");
    setExpiryDate("");
    setItems([{ category: "", subCategory: "", product: "", quantity: 1 }]);
  };


  const submitstocktranscation = async (event) => {
    event.preventDefault();

    // Validate all items have a product selected
    const invalidItems = items.filter(item => !item.product);
    if (invalidItems.length > 0) {
      toast.error("Please select a product for every row.");
      return;
    }

    try {
      // Submit each item as a separate purchase request
      for (const item of items) {
        await dispatch(createPurchases({
          product: item.product,
          type: "Stock-in",
          quantity: item.quantity,
          supplier,
          expiryDate: expiryDate || null
        })).unwrap();
      }
      toast.success(`${items.length} purchase${items.length > 1 ? 's' : ''} added successfully!`);
      resetForm();
      setIsFormVisible(false);
    } catch (err) {
      toast.error(err || "One or more purchases failed.");
    }
  };



  
  const displaystock = query.trim() !== "" ?  searchdata : getallStocks;
  const safeStocks = Array.isArray(displaystock) ? [...displaystock].sort((a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt)) : [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeStocks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeStocks.length / itemsPerPage);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  return (
    <div className="bg-base-100 min-h-screen">

<TopNavbar />


<Purchasesgraph className="mt-10"/>
<div className="mt-4 md:mt-12 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-10">
          <input
            type="text"
            value={query}
            onChange={(e)=>setquery(e.target.value)}
            className="w-full md:w-96 h-12 pl-4 pr-12 border-2 border-gray-300 rounded-lg"
            placeholder="Search purchases..."
          />
          <button
            onClick={() => {
              setIsFormVisible(true);
              setSelectedProduct(null);
              resetForm();
            }}
            className="bg-blue-800 text-white w-48 h-12 rounded-lg flex items-center justify-center font-bold shadow-md hover:bg-blue-700 transition"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Purchase
          </button>
        </div>



        {isFormVisible && (
          <div className="fixed top-0 right-0 w-full sm:w-[500px] h-full bg-white z-50 p-6 border-l-2 border-gray-300 shadow-2xl overflow-y-auto">
            <div className="text-right">
              <MdKeyboardDoubleArrowLeft
                onClick={() => setIsFormVisible(false)}
                className="cursor-pointer text-2xl inline-block hover:text-gray-600 transition"
              />
            </div>

            <h1 className="text-xl font-semibold mb-6">
              Add Purchase
            </h1>

            <form onSubmit={submitstocktranscation}>

              {/* ── Supplier (top) ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-gray-700">Supplier</label>
                  <button
                    type="button"
                    onClick={handleGoToAddSupplier}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors"
                  >
                    <IoMdAdd className="text-sm" /> New Supplier
                  </button>
                </div>
                <select
                  value={supplier}
                  onChange={(e) => {
                    setsupplier(e.target.value);
                    setItems([{ category: "", subCategory: "", product: "", quantity: 1 }]);
                  }}
                  className="w-full h-10 px-2 border-2 rounded-lg outline-none focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select a Supplier</option>
                  {getallSupplier?.map((sup) => (
                    <option key={sup._id} value={sup._id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Expiry Date ── */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Expiry Date <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full h-10 px-3 border-2 rounded-lg outline-none focus:border-blue-500 bg-white text-gray-700"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank if the product does not have an expiry date.
                  You will be notified when it is 6 months from expiry.
                </p>
              </div>

              {/* ── Items ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">Products</label>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!supplier}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IoMdAdd className="text-sm" /> Add Item
                  </button>
                </div>

                {!supplier && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    ⚠ Please select a supplier first to see available products.
                  </p>
                )}

                {items.map((item, index) => (
                  <div key={index} className="relative p-4 border-2 border-gray-100 rounded-xl mb-3 bg-gray-50">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
                      >
                        <IoMdRemove className="text-sm" />
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                          className="w-full h-9 px-2 text-sm border rounded-lg mt-1 outline-none focus:border-blue-500 bg-white"
                          required
                        >
                          <option value="">Select</option>
                          {[...new Set(supplierProducts?.map(p => p.Category).filter(Boolean))].map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">Sub-Category</label>
                        <select
                          value={item.subCategory}
                          onChange={(e) => handleItemChange(index, 'subCategory', e.target.value)}
                          className="w-full h-9 px-2 text-sm border rounded-lg mt-1 outline-none focus:border-blue-500 bg-white"
                          required
                        >
                          <option value="">Select</option>
                          {[...new Set(supplierProducts?.filter(p => p.Category === item.category).map(p => p.SubCategory).filter(Boolean))].map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-gray-500">Product</label>
                      <select
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        className="w-full h-9 px-2 text-sm border rounded-lg mt-1 outline-none focus:border-blue-500 bg-white"
                        required
                      >
                        <option value="">Select Product</option>
                        {supplierProducts?.filter(p => p.Category === item.category && p.SubCategory === item.subCategory).map((prod) => (
                          <option key={prod._id} value={prod._id}>{prod.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-gray-500">Price</label>
                        <input
                          type="number"
                          value={getItemPrice(item.product)}
                          readOnly
                          className="w-full h-9 px-2 text-sm border bg-gray-100 rounded-lg mt-1 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full h-9 px-2 text-sm border rounded-lg mt-1 outline-none focus:border-blue-500 bg-white"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="bg-blue-800 text-white w-full h-12 rounded-lg hover:bg-blue-700 mt-6 font-bold shadow-lg transition"
              >
                {iscreatedStocks ? "Adding..." : `Confirm ${items.length} Purchase${items.length > 1 ? 's' : ''}`}
              </button>
            </form>
          </div>
        )}


        {isgetallStocks ? (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mt-20"></div>
        ) : currentItems.length === 0 ? (
          <p className="text-center text-gray-500 mt-20">No records found.</p>
        ) : (
        <div className="mt-8 overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
          <table className="min-w-full whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">#</th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">Date</th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">Product</th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Type</th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Quantity</th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">Supplier</th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">Expiry Date</th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {currentItems.map((Stocks, index) => {
                  const expiry = Stocks.expiryDate ? new Date(Stocks.expiryDate) : null;
                  const now = new Date();
                  const sixMonthsAhead = new Date(); sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
                  const isExpired = expiry && expiry < now;
                  const isExpiringSoon = expiry && !isExpired && expiry <= sixMonthsAhead;
                  const rowClass = isExpired
                    ? 'bg-red-50'
                    : isExpiringSoon
                    ? 'bg-amber-50'
                    : '';
                  return (
                    <tr key={Stocks._id ? `${Stocks._id}-${index}` : index} className={`hover:bg-gray-50/50 transition-colors duration-150 ${rowClass}`}>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">{indexOfFirstItem + index + 1}</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500 font-medium">
                        <FormattedTime timestamp={Stocks.transactionDate} />
                      </td>
                      <td className="px-3 py-2.5 font-bold text-gray-800 text-xs">{Stocks.product?.name || "Unknown"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded border inline-flex text-[10px] font-bold uppercase tracking-widest bg-green-50 text-green-700 border-green-200">
                          Purchase
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-black text-gray-700">{Stocks.quantityChanged || Stocks.quantity}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 font-medium">{Stocks.supplier?.name || "N/A"}</td>
                      <td className="px-3 py-2.5 text-xs font-medium">
                        {expiry ? (
                          <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                            {expiry.toLocaleDateString('en-GB')}
                            {isExpired && <span className="ml-1 text-red-500">(Expired)</span>}
                            {isExpiringSoon && <span className="ml-1 text-amber-500">(Expiring Soon)</span>}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {(() => {
                          const s = Stocks.status;
                          if (s === 'delivered') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">Delivered</span>;
                          if (s === 'cancelled') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600">Cancelled</span>;
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Pending</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })}
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

    </div>
  )
}

export default Purchases;
