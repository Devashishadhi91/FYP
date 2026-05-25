import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
import { AiOutlineExport } from "react-icons/ai";
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import FormattedTime from "../lib/FormattedTime ";
import {
  Addproduct,
  gettingallproducts,
  Searchproduct,
  Removeproduct,
  EditProduct,
} from "../features/productSlice";
import { gettingallCategory } from "../features/categorySlice";
import { gettingallSupplier } from "../features/SupplierSlice";
import toast from "react-hot-toast";
import * as XLSX from 'xlsx';
import Pagination from "../Components/Pagination";

function Productpage() {
  const { getallproduct, editedProduct, isproductadd, searchdata, totalProduct, isallproductget } = useSelector(
    (state) => state.product
  );
  const { getallCategory } = useSelector((state) => state.category);
  const { getallSupplier } = useSelector((state) => state.supplier);
  const { Authuser } = useSelector((state) => state.auth);
  const isStoreUser = Authuser?.role === 'staff' || Authuser?.role === 'manager';
  const isStaff = Authuser?.role === 'staff';
  const dispatch = useDispatch();
  const [query, setquery] = useState("");
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [Category, setCategory] = useState("");
  const [SubCategory, setSubCategory] = useState("");
  const [Price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().split('T')[0]); // Initialize with current date
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    dispatch(gettingallproducts());
    dispatch(gettingallCategory());
    if (!getallSupplier || getallSupplier.length === 0) {
      dispatch(gettingallSupplier());
    }
  }, [dispatch, editedProduct, isproductadd]);

  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(Searchproduct(query));
        setCurrentPage(1); // Reset page on search
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallproducts());
      setCurrentPage(1); // Reset page when query cleared
    }
  }, [query, dispatch]);

  const handleremove = async (productId) => {
    dispatch(Removeproduct(productId))
      .unwrap()
      .then(() => {
        toast.success("Product removed successfully");
      })
      .catch((error) => {
        toast.error(error || "Failed to remove product");
      });
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!selectedProduct) return;

    const updatedData = {
      productId: productId || undefined,
      name,
      Category,
      SubCategory,
      Price,
      MRP: Price,
      quantity,
      description,
      supplier,
      dateAdded: selectedProduct.dateAdded || new Date().toISOString()
    };

    dispatch(EditProduct({ id: selectedProduct._id, updatedData }))
      .unwrap()
      .then(() => {
        toast.success("Product updated successfully");
        setIsFormVisible(false);
        setSelectedProduct(null);
        resetForm();
      })
      .catch(() => {
        toast.error("Failed to update product");
      });
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    const productData = {
      name,
      description,
      Category,
      SubCategory,
      Price,
      MRP: Price,
      quantity,
      supplier,
      dateAdded: new Date(dateAdded).toISOString()
    };
    if (productId.trim()) {
      productData.productId = productId.trim();
    }

    dispatch(Addproduct(productData))
      .unwrap()
      .then(() => {
        toast.success("Product added successfully");
        resetForm();
      })
      .catch(() => {
        toast.error("Product add unsuccessful");
      });
  };

  const resetForm = () => {
    setProductId("");
    setName("");
    setCategory("");
    setSubCategory("");
    setPrice("");
    setQuantity("");
    setDescription("");
    setSupplier("");
  };

  const handleExportExcel = () => {
    if (!getallproduct || getallproduct.length === 0) {
      toast.error("No products to export");
      return;
    }

    const exportData = getallproduct.map((p) => ({
      Name: p.name,
      Category: p.Category || "N/A",
      "Sub-Category": p.SubCategory || "N/A",
      MRP: p.MRP || 0,
      Price: p.Price || 0,
      Quantity: p.quantity || 0,
      Supplier: p.supplier?.name || "N/A",
      DateAdded: p.dateAdded ? new Date(p.dateAdded).toLocaleDateString() : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products_export.xlsx");
    toast.success("Products exported successfully");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        toast.loading("Uploading products...", { id: "upload-toast" });

        let addedCount = 0;
        let failedCount = 0;

        const promises = json.map(async (row) => {
          const keys = Object.keys(row);
          const getVal = (keyName) => {
            // remove spaces and hyphens for a more robust match
            const normalizedKeyName = keyName.replace(/[\s-]/g, '').toLowerCase();
            const key = keys.find(k => k.replace(/[\s-]/g, '').toLowerCase() === normalizedKeyName);
            return key ? row[key] : "";
          };

          const id = getVal("id");
          const name = getVal("name");
          const category = getVal("subcategory");
          const subCategory = getVal("category");
          const mrpVal = getVal("mrp");
          const mrp = mrpVal ? Number(mrpVal) : 0;

          if (!name) return; // Skip empty rows

          const productData = {
            name: String(name),
            Category: String(category || "Uncategorized"),
            SubCategory: String(subCategory),
            MRP: mrp,
            Price: mrp,
            quantity: 0,
            description: "",
            dateAdded: new Date().toISOString()
          };
          if (id) {
            productData.productId = String(id);
          }

          try {
            await dispatch(Addproduct(productData)).unwrap();
            addedCount++;
          } catch (err) {
            console.error("Failed to add row", row, err);
            failedCount++;
          }
        });

        await Promise.all(promises);

        toast.success(`Import complete! Added: ${addedCount}, Failed: ${failedCount}`, { id: "upload-toast" });
        dispatch(gettingallproducts());
      } catch (error) {
        toast.error("Failed to parse file", { id: "upload-toast" });
        console.error("File upload error:", error);
      }

      event.target.value = null;
    };
    reader.readAsArrayBuffer(file);
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setProductId(product.productId || "");
    setName(product.name);
    setCategory(product.Category?.name || product.Category);
    setSubCategory(product.SubCategory || "");
    setPrice(product.MRP || product.Price || "");
    setQuantity(product.quantity);
    setDescription(product.description);
    setSupplier(product.supplier?._id || product.supplier || "");
    setIsFormVisible(true);
  };

  const displayProducts = query.trim() !== "" ? searchdata : getallproduct;
  const safeProducts = Array.isArray(displayProducts) ? [...displayProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeProducts.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />

      <div className="mt-10 flex">
        <div className="bg-blue-950 w-56 rounded-xl ml-10 block h-24">
          <h1 className="text-white ml-12 block pt-5 font-bold">Total Product</h1>
          <p className="text-white font-bold pt-2 ml-24">{totalProduct || "0"}</p>
        </div>
        <div className="bg-blue-950 ml-10 rounded-xl block w-56 h-24">
          <h1 className="text-white font-bold ml-12 pt-5">Total store value</h1>
          <p className="text-white font-bold pt-2 ml-24">Rs.
            {Math.round(getallproduct?.reduce((totalAmount, product) => {
              const qty = isStoreUser ? (product.storeQuantity || 0) : (product.quantity || 0);
              return totalAmount + (product.Price * qty);
            }, 0)) || "0"}
          </p>
        </div>
        <div className="bg-blue-950 bg-base-100 w-56 rounded-xl ml-10 block h-24">
          <h1 className="text-white font-bold ml-12 pt-5">Total Category</h1>
          <p className="text-white font-bold pt-2 ml-24"> {getallCategory?.length || "0"}</p>
        </div>
      </div>

      <div className="mt-12 ml-5">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setquery(e.target.value)}
            className="w-full md:w-96 h-12 pl-4 pr-12 border-2 border-gray-300 rounded-lg"
            placeholder="Enter your product"
          />
          {!isStaff && (
            <>
              <button
                onClick={() => {
                  setIsFormVisible(true);
                  setSelectedProduct(null);
                }}
                className="bg-blue-800 text-white w-40 h-12 rounded-lg flex items-center justify-center hover:bg-blue-700 transition"
              >
                <IoMdAdd className="text-xl mr-2" /> Add Product
              </button>

              <label className="bg-green-600 text-white w-48 h-12 rounded-lg flex items-center justify-center hover:bg-green-700 transition cursor-pointer">
                <IoMdAdd className="text-xl mr-2" /> Upload .xlsx
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <button
                onClick={handleExportExcel}
                className="bg-orange-600 text-white w-48 h-12 rounded-lg flex items-center justify-center hover:bg-orange-700 transition shadow-md"
              >
                <AiOutlineExport className="text-xl mr-2" /> Export to Excel
              </button>
            </>
          )}
          {isStaff && Authuser?.storeId && (
            <span className="ml-4 text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              📍 {Authuser.storeId?.name || 'Your Store'}
            </span>
          )}
        </div>

        {isFormVisible && (
          <div className="absolute z-50 w-full md:w-[450px] top-16 bg-gray-100 right-0 max-h-[85vh] overflow-y-auto p-6 border-2 border-gray-300 rounded-lg shadow-2xl transition-transform transform">
            <div className="text-right">
              <MdKeyboardDoubleArrowLeft
                onClick={() => setIsFormVisible(false)}
                className="cursor-pointer text-2xl"
              />
            </div>

            <h1 className="text-xl font-semibold mb-4">
              {selectedProduct ? "Edit Product" : "Add Product"}
            </h1>

            <form onSubmit={selectedProduct ? handleEditSubmit : submitProduct}>
              <div className="mb-4">
                <label>Product ID</label>
                <input
                  value={productId}
                  placeholder="Enter product ID (optional)"
                  onChange={(e) => setProductId(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                />
              </div>

              <div className="mb-4">
                <label>Name</label>
                <input
                  value={name}
                  placeholder="Enter product name"
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label>Category</label>
                <select
                  value={Category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                >
                  <option value="">Select a category</option>
                  {getallCategory?.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label>Sub-Category</label>
                <input
                  value={SubCategory}
                  placeholder="Enter sub-category (optional)"
                  onChange={(e) => setSubCategory(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                />
              </div>

              <div className="mb-4">
                <label>Description</label>
                <input
                  value={description}
                  placeholder="Enter product description"
                  onChange={(e) => setDescription(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label>Price</label>
                <input
                  type="number"
                  placeholder="Enter product price"
                  value={Price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                  min="0"
                />
              </div>

              <div className="mb-4">
                <label>Quantity</label>
                <input
                  type="number"
                  placeholder="Enter product quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                  required
                  min="0"
                />
              </div>

              <div className="mb-4">
                <label>Supplier</label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                >
                  <option value="">Select a supplier</option>
                  {Array.isArray(getallSupplier) && getallSupplier.map((sup) => (
                    <option key={sup._id} value={sup._id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>



              <button
                type="submit"
                className="bg-blue-800 text-white w-full h-12 rounded-lg hover:bg-blue-700 mt-4"
              >
                {selectedProduct ? "Update Product" : "Add Product"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Product List</h2>
          {isallproductget ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mt-20"></div>
          ) : currentItems.length === 0 ? (
            <div className="px-6 py-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                <span className="text-lg font-medium">No Products Found</span>
              </div>
            </div>
          ) : (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
            <table className="min-w-full whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">S.N.</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sub-Category</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{isStoreUser ? 'Store Stock' : 'Wh. Stock'}</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">MRP/Price</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((product, index) => {
                    const formattedDate = product.dateAdded
                      ? new Date(product.dateAdded).toLocaleDateString()
                      : 'N/A';

                    return (
                      <tr key={product._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-600">{indexOfFirstItem + index + 1}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-gray-500">{product.productId || "N/A"}</td>
                        <td className="px-3 py-2.5 text-xs font-bold text-gray-800">{product.name}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-gray-600">
                          {product.Category || "No Category"}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium text-gray-600">
                          {product.SubCategory || "N/A"}
                        </td>
                        <td className="px-3 py-2.5 text-xs italic text-blue-600">
                          {product.supplier?.name || "N/A"}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className={`font-bold inline-flex items-center justify-center px-2 py-0.5 rounded-md border ${isStoreUser
                            ? (product.storeQuantity === 0 ? 'bg-red-50 text-red-700 border-red-200' : product.storeQuantity <= 5 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200')
                            : (product.quantity === 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-800 border-gray-200')
                            }`}>
                            {isStoreUser ? (product.storeQuantity ?? 0) : product.quantity}
                          </span>
                          {isStoreUser && (
                           <span className="text-[10px] text-gray-400 ml-1 font-medium">(wh: {product.quantity})</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">Rs. {product.MRP || product.Price}</td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-500"><FormattedTime timestamp={product?.createdAt} /></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center space-x-2">
                          {!isStaff && (
                            <>
                              <button
                                onClick={() => handleEditClick(product)}
                                className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors border border-blue-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleremove(product._id)}
                                className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-100"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {isStaff && (
                            <span className="text-[10px] text-gray-400 italic">View Only</span>
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
    </div>
  );
}

export default Productpage;