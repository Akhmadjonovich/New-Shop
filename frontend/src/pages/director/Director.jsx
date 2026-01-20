import { Outlet } from "react-router-dom";
import DirectorBottomNav from "../../components/DirectorBottomNav";

const Director = () => {
  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <div className="flex-1 px-4 md:px-6 pb-20 md:pb-24 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40">
        <DirectorBottomNav />
      </div>
    </div>
  )
}

export default Director;