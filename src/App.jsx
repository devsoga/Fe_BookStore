import useRouteCustom from "./routes/useRouteCustom";
import usePageLoading from "./hooks/usePageLoading";
import Sidebar from "./components/Sidebar/Sidebar";
import AdminRouteWrapper from "./components/Admin/AdminRouteWrapper";
import { useContext, useEffect } from "react";
import { SidebarContext } from "./contexts/SidebarProvider";
import Search from "./components/Search/Search";
import { SearchContext } from "./contexts/SearchProvider";

function App() {
  const {
    isOpenSidebar,
    setIsOpenSidebar,
    contentSidebar,
    titleSidebar,
    sidebarPosition
  } = useContext(SidebarContext);
  const { isOpenSearch, setIsOpenSearchFunction } = useContext(SearchContext);

  const routes = useRouteCustom();
  const loading = usePageLoading(500);
  return (
    <>
      <Sidebar
        isOpenSidebar={isOpenSidebar}
        setIsOpenSidebar={setIsOpenSidebar}
        contentSidebar={contentSidebar}
        titleSidebar={titleSidebar}
        position={sidebarPosition}
      />
      <Search
        isOpenSearch={isOpenSearch}
        setIsOpenSearchFunction={setIsOpenSearchFunction}
      />
      {loading && (
        <div className="fixed top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-pulse z-50"></div>
      )}
      <AdminRouteWrapper>{routes}</AdminRouteWrapper>
    </>
  );
}

export default App;
