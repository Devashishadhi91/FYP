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
} from "../features/SupplierSlice";
import toast from "react-hot-toast";
import FormattedTime from "../lib/FormattedTime ";
import Pagination from "../Components/Pagination";

function Supplierpage() {
  const { getallSupplier, searchdata, editedsupplier } = useSelector(
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

  useEffect(() => {
    dispatch(gettingallSupplier());
  }, [dispatch, deleteSupplier, editedsupplier]);

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
      </div>
    </div>
  );
}

export default Supplierpage;