import { useDispatch, useSelector } from "react-redux";
import socket from "../lib/socket";
import { useEffect, useState } from "react";
import { getAllActivityLogs, getsingleUserActivityLogs } from "../features/activitySlice";
import TopNavbar from "../Components/TopNavbar";
import FormattedTime from "../lib/FormattedTime ";
import Pagination from "../Components/Pagination";

function Activitylogpage() {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const { activityLogs, isFetching, userdata } = useSelector((state) => state.activity);
  const { Authuser } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (Authuser?.id) {
      dispatch(getAllActivityLogs());
      dispatch(getsingleUserActivityLogs(Authuser.id));
    }

    socket.on("newActivityLog", (newLog) => {
      setLogs((prevLogs) => [newLog, ...prevLogs]);
    });

    return () => {
      socket.off("newActivityLog");
    };
  }, [dispatch, Authuser.id]);

  useEffect(() => {
    if (activityLogs) {
      const sorted = [...activityLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLogs(sorted);
    }
  }, [activityLogs]);

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />
        <div className="mt-8 px-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Activity Logs</h2>
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
            <table className="min-w-full whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 text-left border-b border-gray-100">
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Affected Part</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentLogs.length > 0 ? (
                  currentLogs.map((log, index) => (
                    <tr key={log._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">{indexOfFirstLog + index + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-800">{log.userId?.name || "System"}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-blue-600">{log.userId?.email || "-"}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-700">{log.action}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-purple-600">{log.entity}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[200px] truncate" title={log.description}>{log.description}</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500">
                        <FormattedTime timestamp={log.createdAt} />
                      </td>
                      <td className="px-3 py-2.5 text-[10px] font-mono text-gray-400">{log.ipAddress}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <span className="text-lg font-medium">No activity logs available</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          handlePrevPage={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          handleNextPage={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        />
      </div>
    </div>
  );
}

export default Activitylogpage;
