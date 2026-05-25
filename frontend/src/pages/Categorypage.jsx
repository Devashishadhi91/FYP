import React,{useState,useEffect} from 'react'
import { IoMdAdd } from "react-icons/io";
import { FaFileExport } from "react-icons/fa6";
import FormattedTime from "../lib/FormattedTime ";





import TopNavbar from "../Components/TopNavbar";

import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { gettingallCategory,CreateCategory , RemoveCategory,SearchCategory } from "../features/categorySlice";
import toast from "react-hot-toast";
import Pagination from "../Components/Pagination";




function Categorypage() {



  
  const { getallCategory, iscreatedCategory,  searchdata } = useSelector((state) => state.category);
  const { Authuser } = useSelector((state) => state.auth);
  const isStaff = Authuser?.role === 'staff';
  const dispatch = useDispatch();
  const [query, setquery] = useState("");

  const [name, setname] = useState("");
  const [description, setdescription] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;









  
  useEffect(() => {

    dispatch(gettingallCategory());
  }, [dispatch]);

  



  useEffect(() => {
    if (query.trim() !== "") {
      const repeatTimeout = setTimeout(() => {
        dispatch(SearchCategory(query));
        setCurrentPage(1);
      }, 500);
      return () => clearTimeout(repeatTimeout);
    } else {
      dispatch(gettingallCategory()); 
      setCurrentPage(1);
    }
  }, [query, dispatch]); 


  const handleremove = async (categoryId) => {
    dispatch( RemoveCategory (categoryId))
      .unwrap()
      .then(() => {
        toast.success("category removed successfully");
      })
      .catch((error) => {
        toast.error(error || "Failed to categoryproduct");
      });
  };

  


  const submitCategory = async (event) => {
    event.preventDefault();
    const CategoryData = { name, description};

    dispatch( CreateCategory( CategoryData))
      .unwrap()
      .then(() => {
        toast.success(" CategoryData added successfully");
        resetForm();
      })
      .catch(() => {
        toast.error(" CategoryData add unsuccessful");
      });
  };


  const resetForm = () => {
    setname("");
    setdescription("");
  };

  


  const displayCategory = query.trim() !== "" ? searchdata : getallCategory;
  const safeCategory = Array.isArray(displayCategory) ? [...displayCategory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeCategory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeCategory.length / itemsPerPage);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  





  return (

    <div className='bg-base-100 min-h-screen'>
         <TopNavbar />


         <div className="mt-10 flex ">
      <div className="bg-blue-950 w-56 rounded-xl  ml-10 block h-24">
          <h1 className="text-white ml-12 block pt-5 font-bold">Total Category</h1>
          <p className="text-white font-bold  pt-2  ml-24">{getallCategory?.length || "0"}</p>

        </div>
  
</div>

      <div className='flex'>

      <input type='text' 
       value={query}
       onChange={(e) => setquery(e.target.value)}
      placeholder='Search the category' 
      className="w-full ml-10 mt-20 md:w-96 h-12 pl-4 pr-12 border-2 border-gray-300 rounded-lg"/>
      <div className='flex mt-20'>
      {!isStaff && (
      <button onClick={()=>{
           setIsFormVisible(true);
           setSelectedProduct(null);

      }} className="bg-blue-800 ml-10 text-white w-40 h-12 rounded-lg flex items-center justify-center"><IoMdAdd className='text-xl mr-3'/>Add Category</button>
      )}
      </div>

      </div>


      {isFormVisible && (
          <div className="absolute top-10 bg-base-100 bg-gray-100 right-0 h-svh p-6 border-2 border-gray-300 rounded-lg shadow-md transition-transform transform">
            <div className="text-right">
              <MdKeyboardDoubleArrowLeft
                onClick={() => setIsFormVisible(false)}
                className="cursor-pointer text-2xl"
              />
            </div>

            <h1 className="text-xl font-semibold mb-4">
              {selectedProduct ? "Edit Product" : "Add Product"}
            </h1>

            <form onSubmit={ submitCategory}>
              <div className="mb-4">
                <label>Name</label>
                <input
                  value={name}
                  placeholder="Enter product name"
                  onChange={(e) => setname(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                />
              </div>

              

              <div className="mb-4">
                <label>Description</label>
                <input
                  value={description}
                  placeholder="Enter product description"
                  onChange={(e) => setdescription(e.target.value)}
                  type="text"
                  className="w-full h-10 px-2 border-2 rounded-lg mt-2"
                />
              </div>

              

             

              <button
                type="submit"
                className="bg-blue-800 text-white w-full h-12 rounded-lg hover:bg-blue-700 mt-4"
              >
                {selectedProduct ? "Update Category " : "Add Category "}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8 px-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Category List</h2>
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-24">
            <table className="min-w-full whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-10 text-center">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Products</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {Array.isArray(currentItems) && currentItems.length > 0 ? (
                   currentItems.map((Category, index) => (
                     <tr key={Category._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                       <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">{indexOfFirstItem + index + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-800">{Category.name}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-600">
                        {Category.productCount}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500">
                        <FormattedTime timestamp={Category.createdAt}/>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {!isStaff ? (
                            <>
                              <button
                                onClick={() => handleremove(Category._id)}
                                className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded transition-colors border border-red-100"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">View Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <span className="text-lg font-medium">No Categories Found</span>
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
  )
}

export default Categorypage