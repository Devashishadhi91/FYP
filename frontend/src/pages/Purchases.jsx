import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
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
const[query,setquery]=useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [product, setproduct] = useState("");
  const [type, settype] = useState("Stock-in");
  const [quantity, setquantity] = useState(1);
  const [supplier, setsupplier] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const getProductPrice = () => {
    if (!product) return 0;
    const selectedProd = getallproduct?.find(p => p._id === product);
    return selectedProd?.Price || selectedProd?.MRP || 0;
  };

  // Derive the products that belong to the currently selected supplier
  const selectedSupplierObj = getallSupplier?.find(s => s._id === supplier);
  const supplierProductIds = selectedSupplierObj?.productsSupplied?.map(p =>
    typeof p === "object" ? p._id : p
  ) || [];
  const supplierProducts = supplier
    ? getallproduct?.filter(p => supplierProductIds.includes(p._id))
    : [];

  useEffect(() => {
    if ( query.trim() !== "") {
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
    setCategory("");
    setSubCategory("");
    setproduct("");
    settype("Stock-in");
    setquantity(1);
    setsupplier("");
  };


  const submitstocktranscation = async (event) => {
    event.preventDefault();
    const StocksData = {product, type,quantity , supplier };

    dispatch(createPurchases(StocksData))
      .unwrap()
      .then(() => {
        toast.success("Purchase added successfully");
        resetForm();
        setIsFormVisible(false);
      })
      .catch(() => {
        toast.error("Purchase add unsuccessful");
      });
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
<div className="mt-12 px-6">
        <div className="flex items-center space-x-4 mb-10">
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
          <div className="fixed top-0 right-0 w-[500px] h-full bg-white z-50 p-6 border-l-2 border-gray-300 shadow-2xl overflow-y-auto">
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
                    setCategory("");
                    setSubCategory("");
                    setproduct("");
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

              {/* ── Products table ── */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Products</label>
                {!supplier && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    ⚠ Please select a supplier first to see available products.
                  </p>
                )}

                <div className="p-4 border-2 border-gray-100 rounded-xl mb-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Category</label>
                      <select
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setSubCategory("");
                          setproduct("");
                        }}
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
                        value={subCategory}
                        onChange={(e) => {
                          setSubCategory(e.target.value);
                          setproduct("");
                        }}
                        className="w-full h-9 px-2 text-sm border rounded-lg mt-1 outline-none focus:border-blue-500 bg-white"
                        required
                      >
                        <option value="">Select</option>
                        {[...new Set(supplierProducts?.filter(p => p.Category === category).map(p => p.SubCategory).filter(Boolean))].map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-gray-500">Product</label>
                    <select
                      value={product}
                      onChange={(e) => setproduct(e.target.value)}
                      className="w-full h-9 px-2 text-sm border rounded-lg mt-1 outline-none focus:border-blue-500 bg-white"
                      required
                    >
                      <option value="">Select Product</option>
                      {supplierProducts?.filter(p => p.Category === category && p.SubCategory === subCategory).map((prod) => (
                        <option key={prod._id} value={prod._id}>{prod.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-gray-500">Price</label>
                      <input
                        type="number"
                        value={getProductPrice()}
                        readOnly
                        className="w-full h-9 px-2 text-sm border bg-gray-100 rounded-lg mt-1 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">Quantity</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setquantity(e.target.value)}
                        className="w-full h-9 px-2 text-sm border rounded-lg mt-1 outline-none focus:border-blue-500 bg-white"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="bg-blue-800 text-white w-full h-12 rounded-lg hover:bg-blue-700 mt-6 font-bold shadow-lg transition"
              >
                {iscreatedStocks ? "Adding Purchase..." : "Confirm Purchase"}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {currentItems.map((Stocks, index) => (
                  <tr key={Stocks._id ? `${Stocks._id}-${index}` : index} className="hover:bg-gray-50/50 transition-colors duration-150">
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

    </div>
  )
}

export default Purchases;
