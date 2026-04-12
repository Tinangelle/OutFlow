import { useState } from 'react'
import { ChatView } from './components/ChatView'
import { GlobalDndLayout } from './components/GlobalDndLayout'
import { Sidebar } from './components/Sidebar'
import { OutflowProvider } from './context/OutflowProvider'

function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <GlobalDndLayout>
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
          {isSidebarOpen ? (
            <button
              type="button"
              aria-label="关闭侧边栏"
              className="fixed inset-0 z-40 select-none bg-black/50 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          ) : null}
          <Sidebar
            isOpen={isSidebarOpen}
            onNavigate={() => setIsSidebarOpen(false)}
          />
          <ChatView onOpenSidebar={() => setIsSidebarOpen(true)} />
        </div>
      </GlobalDndLayout>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <OutflowProvider>
        <AppShell />
      </OutflowProvider>
    </div>
  )
}
