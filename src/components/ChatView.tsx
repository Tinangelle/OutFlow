import {
  Copy,
  FileText,
  LayoutGrid,
  MessageSquare,
  SendHorizontal,
} from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useOutflow } from '../hooks/useOutflow'
import { BoardView } from './BoardView'
import { BlockBubble } from './BlockBubble'
import { DocumentBlockItem } from './DocumentBlockItem'
import { ThemeToggle } from './ThemeToggle'

type MainView = 'chat' | 'board' | 'document'

export function ChatView() {
  const { activeProject, addBlock, updateBlock, reorderBlocks } = useOutflow()
  const [mainView, setMainView] = useState<MainView>('chat')
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)

  const sortedBlocks = useMemo(() => {
    if (!activeProject) return []
    return [...activeProject.blocks].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    )
  }, [activeProject])

  const documentText = useMemo(() => {
    return sortedBlocks
      .map((b) => b.content.trim())
      .filter(Boolean)
      .join('\n\n')
  }, [sortedBlocks])

  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  useEffect(() => {
    if (mainView !== 'chat') return
    if (sortedBlocks.length > prevLen.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    prevLen.current = sortedBlocks.length
  }, [sortedBlocks.length, mainView])

  const send = useCallback(() => {
    const text = draft.replace(/\r\n/g, '\n')
    if (!text.trim()) return
    addBlock(text)
    setDraft('')
    setEditingId(null)
    requestAnimationFrame(() => {
      if (taRef.current) {
        taRef.current.style.height = 'auto'
      }
    })
  }, [addBlock, draft])

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      send()
    }
  }

  const handleStartEdit = (id: string) => {
    setEditingId(id)
  }

  const handleSaveBlock = (id: string, content: string) => {
    updateBlock(id, content)
    setEditingId(null)
  }

  const copyAll = useCallback(async () => {
    if (!documentText) return
    try {
      await navigator.clipboard.writeText(documentText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [documentText])

  const copyBlock = useCallback(async (blockId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedBlockId(blockId)
      window.setTimeout(() => setCopiedBlockId(null), 2000)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleClass = (on: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-lg transition ${
      on
        ? 'bg-violet-600 text-white shadow-sm dark:bg-violet-500'
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
    }`

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div
          className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-700 dark:bg-zinc-800/50"
          role="group"
          aria-label="主视图"
        >
          <button
            type="button"
            onClick={() => setMainView('chat')}
            className={toggleClass(mainView === 'chat')}
            title="聊天视图"
            aria-pressed={mainView === 'chat'}
            aria-label="聊天视图"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMainView('board')}
            className={toggleClass(mainView === 'board')}
            title="软木板视图"
            aria-pressed={mainView === 'board'}
            aria-label="软木板视图"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMainView('document')}
            className={toggleClass(mainView === 'document')}
            title="阅读视图"
            aria-pressed={mainView === 'document'}
            aria-label="阅读视图"
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>
        <ThemeToggle />
      </header>

      {mainView === 'document' && activeProject && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-zinc-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => void copyAll()}
            disabled={!documentText}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Copy className="h-4 w-4" />
            {copied ? '已复制' : '一键复制所有文本'}
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!activeProject ? (
          <p className="text-center text-sm text-zinc-500">请选择或创建一个项目</p>
        ) : mainView === 'board' ? (
          <BoardView blocks={sortedBlocks} reorderBlocks={reorderBlocks} />
        ) : mainView === 'document' ? (
          sortedBlocks.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              暂无内容块，切换到聊天视图添加内容。
            </p>
          ) : (
            <article className="mx-auto max-w-3xl">
              {sortedBlocks.map((b, i) => (
                <Fragment key={b.id}>
                  {i > 0 ? (
                    <hr className="my-8 border-dashed border-gray-300 dark:border-zinc-600" />
                  ) : null}
                  <DocumentBlockItem
                    block={b}
                    editing={editingId === b.id}
                    onStartEdit={handleStartEdit}
                    onSave={handleSaveBlock}
                    onCopyBlock={(id, text) => void copyBlock(id, text)}
                    copyDone={copiedBlockId === b.id}
                  />
                </Fragment>
              ))}
            </article>
          )
        ) : sortedBlocks.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            在下方输入内容，点击发送或按 Cmd/Ctrl + Enter 添加第一条气泡。
          </p>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {sortedBlocks.map((b) => (
              <BlockBubble
                key={b.id}
                block={b}
                editing={editingId === b.id}
                onStartEdit={handleStartEdit}
                onSave={handleSaveBlock}
              />
            ))}
            <div ref={endRef} aria-hidden />
          </div>
        )}
      </div>

      {mainView === 'chat' && (
        <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-3xl border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <textarea
                ref={taRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                placeholder="输入内容…"
                disabled={!activeProject}
                className="max-h-[min(40vh,320px)] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 pl-1 text-[15px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                aria-label="正文输入"
              />
              <button
                type="button"
                onClick={send}
                disabled={!activeProject || !draft.trim()}
                className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-40 dark:bg-violet-500 dark:hover:bg-violet-400"
                title="发送（Cmd/Ctrl + Enter）"
                aria-label="发送"
              >
                <SendHorizontal className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Enter 换行 · Cmd/Ctrl + Enter 或点击发送
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
