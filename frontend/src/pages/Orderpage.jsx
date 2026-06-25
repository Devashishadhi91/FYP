import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import TopNavbar from "../Components/TopNavbar";
import { useDispatch, useSelector } from "react-redux";
import { IoMdAdd } from "react-icons/io";
import { MdKeyboardDoubleArrowLeft, MdClose } from "react-icons/md";
import { signup } from "../features/authSlice";
import FormattedTime from "../lib/FormattedTime ";
import OrderStatusChart from "../lib/OrderStatusChart"
import Pagination from "../Components/Pagination"
import {
  createdOrder,
  Removedorder,
  updatestatusOrder,
  gettingallOrder,
  SearchOrder,

} from "../features/orderSlice";

import { gettingallproducts } from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";
import { fetchAllStores } from "../features/storeSlice";

function Orderpage() {

  const {
    getorder,
    isgetorder,
    isorderadd,
    isorderremove,
    editorder,
    iseditorder,
    searchdata,
    isshowgraph,
    statusgraph
  } = useSelector((state) => state.order);
  const { getallproduct } = useSelector((state) => state.product);
  const { getallCategory } = useSelector((state) => state.category);
  const { stores } = useSelector((state) => state.store);
  const { Authuser, isUserSignup } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const isAdminOrManager = Authuser?.role === 'admin' || Authuser?.role === 'manager';
  const [status, setstatus] = useState(false);
  const [query, setquery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [Product, setProduct] = useState("");
  const [Price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [Description, setDescription] = useState("");
  const [storeId, setStoreId] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedOrder, setselectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    dispatch(gettingallOrder());
    dispatch(gettingallproducts());
    dispatch(gettingallCategory());
    if (isAdminOrManager) dispatch(fetchAllStores());
  }, [dispatch, Authuser, isAdminOrManager]);

  useEffect(() => {
    dispatch(gettingallOrder());
  }, [dispatch, editorder, isorderadd, isorderremove]);











  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(SearchOrder(query));
        setCurrentPage(1);
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallOrder());
      setCurrentPage(1);
    }
  }, [query, dispatch]);

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!selectedOrder) return;

    if (status === selectedOrder.status) {
      toast.error("Please select a new forward status (e.g., pending -> shipped -> delivered).");
      return;
    }

    const updatedData = {
      user: Authuser?.id || " ",
      description: Description,
      status,
      products: [{
        product: Product,
        quantity: Number(quantity),
        price: Number(Price),
      }],
    };

    dispatch(updatestatusOrder({ OrderId: selectedOrder._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Order updated successfully");
        setIsFormVisible(false);
        setselectedOrder(null);
        resetForm();
      })
      .catch(() => {
        toast.error("Failed to update Order");
      });
  };

  const submitOrder = async (event) => {
    event.preventDefault();


    if (!Product || Price === "" || Price === null || Price === undefined || !quantity) {
      toast.error("Product, Price and Quantity are required");
      return;
    }

    if (isAdminOrManager && !storeId) {
      toast.error("Store selection is required");
      return;
    }

    const orderData = {
      user: Authuser?.id || "",
      storeId: isAdminOrManager ? storeId : undefined,
      Description,
      status,
      products: [{
        product: Product,
        price: Number(Price),
        quantity: Number(quantity)
      }]
    };

    try {
      const result = await dispatch(createdOrder(orderData)).unwrap();
      toast.success("Order created successfully");
      resetForm();
    } catch (error) {
      console.error("Order creation failed:", error);
      toast.error(error.message || "Failed to create order");
    }
  };

  const resetForm = () => {
    setProduct("");
    setSelectedCategory("");
    setPrice("");
    setQuantity("");
    setDescription("");
    setstatus("");
    setStoreId("");
  };

  const handleEditClick = (order) => {
    setselectedOrder(order);
    const orderProduct = order.products && order.products.length > 0 ? order.products[0] : {};
    setProduct(orderProduct.product?._id || "");

    // Extract category from the selected product
    const prodDetails = getallproduct?.find(p => p._id === orderProduct.product?._id);
    setSelectedCategory(prodDetails?.Category || "");

    setPrice(orderProduct.price || "");
    setQuantity(orderProduct.quantity || "");
    setstatus(order.status || "");
    setDescription(order.Description || "");
    setStoreId(order.storeId || "");
    setIsFormVisible(true);
  };

  const handleremove = async (OrderId) => {
    dispatch(Removedorder(OrderId))
      .unwrap()
      .then(() => {
        toast.success("Order removed successfully");
      })
      .catch((error) => {
        toast.error(error || "Failed to remove Order");
      });
  };

  const displayOrder = query.trim() !== "" ? searchdata : getorder;
  const safeOrders = Array.isArray(displayOrder) ? [...displayOrder].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeOrders.length / itemsPerPage);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  const filteredProducts = selectedCategory
    ? getallproduct?.filter(p => p.Category === selectedCategory)
    : getallproduct;


  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />

      < OrderStatusChart className="mt-10 mb-10 mx-auto" />

      <div className="mt-12 ml-5">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setquery(e.target.value)}
            className="w-full md:w-96 h-12 pl-4 pr-12 border-2 border-gray-300 rounded-lg"
            placeholder="Enter your order"
          />
          <button
            onClick={() => {
              setIsFormVisible(true);
              setselectedOrder(null);
            }}
            className="bg-blue-800 text-white w-40 h-12 rounded-lg flex items-center justify-center"
          >
            <IoMdAdd className="text-xl mr-2" /> Add Order
          </button>
        </div>

        {isFormVisible && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-transform duration-300 ease-out border border-gray-100">
              <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                  {selectedOrder ? "Edit Order" : "Add New Order"}
                </h1>
                <button
                  onClick={() => setIsFormVisible(false)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors outline-none"
                >
                  <MdClose className="text-2xl" />
                </button>
              </div>

              <div className="p-8">
                <form onSubmit={selectedOrder ? handleEditSubmit : submitOrder} className="space-y-5">
                  {isAdminOrManager && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store</label>
                      <div className="relative">
                        <select
                          value={storeId}
                          onChange={(e) => setStoreId(e.target.value)}
                          disabled={!!selectedOrder}
                          className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none font-medium disabled:opacity-60"
                          required
                        >
                          <option value="">Select a Store</option>
                          {stores?.map((store) => (
                            <option key={store._id} value={store._id}>
                              {store.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setProduct("");
                          setPrice("");
                        }}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none font-medium"
                      >
                        <option value="">All Categories</option>
                        {getallCategory?.map((category) => (
                          <option key={category._id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product</label>
                    <div className="relative">
                      <select
                        value={Product}
                        onChange={(e) => {
                          const selectedProductId = e.target.value;
                          setProduct(selectedProductId);

                          const selectedProdDetails = getallproduct?.find(p => p._id === selectedProductId);
                          if (selectedProdDetails) {
                            const productPrice = selectedProdDetails.Price !== undefined && selectedProdDetails.Price !== null
                              ? selectedProdDetails.Price
                              : selectedProdDetails.MRP;
                            setPrice(productPrice !== undefined && productPrice !== null ? productPrice : "");
                          } else {
                            setPrice("");
                          }
                        }}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none font-medium"
                      >
                        <option value="">Select a Product</option>
                        {filteredProducts?.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <input
                      value={Description}
                      placeholder="Order description"
                      onChange={(e) => setDescription(e.target.value)}
                      type="text"
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder-gray-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-500 font-medium">Rs.</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={Price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full h-12 pl-10 pr-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                      <input
                        type="number"
                        placeholder="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Order Status</label>
                    <div className="relative">
                      <select
                        value={status}
                        onChange={(e) => setstatus(e.target.value)}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none font-medium"
                      >
                        <option value="">Select a status</option>
                        <option value="pending">🟡 Pending</option>
                        <option value="shipped">🔵 Shipped</option>
                        <option value="delivered">🟢 Delivered</option>
                        <option value="returned">🔴 Returned</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-sm"
                    >
                      {selectedOrder ? "Save Changes" : "Create Order"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Order List</h2>
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
            <table className="min-w-full whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Created By</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.isArray(currentItems) && currentItems.length > 0 ? (
                  currentItems.map((order, index) => (
                    <tr key={order?._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-600">{indexOfFirstItem + index + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-800">
                        {(order.products && order.products[0]?.product?.name) || "Unknown Product"}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-700">
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {(order.products && order.products[0]?.quantity) || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-600">
                        Rs. {(order.products && order.products[0]?.price?.toLocaleString()) || 0}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-blue-600">
                        Rs. {order?.totalAmount?.toLocaleString() || 0}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[150px] truncate" title={order?.Description}>
                        {order?.Description || "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded border ${order?.status?.toLowerCase() === 'completed' || order?.status?.toLowerCase() === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                            order?.status?.toLowerCase() === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              order?.status?.toLowerCase() === 'cancelled' || order?.status?.toLowerCase() === 'returned' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                          {order?.status?.charAt(0).toUpperCase() + order?.status?.slice(1) || "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-700">{order.user?.name || "System"}</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500">
                        <FormattedTime timestamp={order?.createdAt} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditClick(order)}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors border border-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleremove(order._id)}
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
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        <span className="text-lg font-medium">No Orders Found</span>
                        <p className="text-sm mt-1">There are no orders matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}

export default Orderpage;
