import { ChatView } from './components/ChatView'
import { Sidebar } from './components/Sidebar'
import { OutflowProvider } from './context/OutflowProvider'

function AppShell() {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <ChatView />
    </div>
  )
}

export default function App() {
  return (
    <OutflowProvider>
      <AppShell />
    </OutflowProvider>
  )
}
