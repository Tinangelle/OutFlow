import {
  Copy,
  FileText,
  LayoutGrid,
  Menu,
  MessageSquare,
  Paperclip,
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
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useOutflow } from '../hooks/useOutflow'
import {
  plainTextFieldNames,
  plainTextFieldProps,
} from '../lib/plain-text-field-props'
import { BoardView } from './BoardView'
import { BlockBubble } from './BlockBubble'
import { DiscoveryWorkspace } from './DiscoveryWorkspace'
import { DocumentBlockItem } from './DocumentBlockItem'
import { ThemeToggle } from './ThemeToggle'
import { TrashView } from './TrashView'

type MainView = 'chat' | 'board' | 'document'

export function ChatView({
  onOpenSidebar,
}: {
  onOpenSidebar?: () => void
} = {}) {
  const {
    activeChat,
    activeChatBlocks,
    addBlock,
    updateBlock,
    trashWorkspace,
    softDeleteBlock,
    globalSearchQuery,
    activeTagFilter,
    clearGlobalDiscovery,
  } = useOutflow()
  const [mainView, setMainView] = useState<MainView>('chat')
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null)
  const [attachmentLoading, setAttachmentLoading] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)
  const sortedBlocks = activeChatBlocks

  const discoveryActive =
    !trashWorkspace &&
    (activeTagFilter !== null || globalSearchQuery.trim().length > 0)

  const documentText = useMemo(() => {
    return sortedBlocks
      .map((b) => b.content.trim())
      .filter(Boolean)
      .join('\n\n')
  }, [sortedBlocks])

  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    const maxPx = Math.min(window.innerHeight * 0.4, 320)
    el.style.height = '0px'
    const scrollH = el.scrollHeight
    const nextH = Math.min(scrollH, maxPx)
    el.style.height = `${nextH}px`
    el.style.overflowY = scrollH > maxPx ? 'auto' : 'hidden'
  }, [draft])

  useEffect(() => {
    if (discoveryActive) return
    if (mainView !== 'chat') return
    if (sortedBlocks.length > prevLen.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    prevLen.current = sortedBlocks.length
  }, [sortedBlocks.length, mainView, discoveryActive])

  const send = useCallback(() => {
    const text = draft.replace(/\r\n/g, '\n')
    if (!text.trim()) return
    addBlock(text)
    setDraft('')
    setEditingId(null)
  }, [addBlock, draft])

  const readTxtFile = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '')
      }
      reader.onerror = () => {
        reject(reader.error ?? new Error('读取文本失败'))
      }
      reader.readAsText(file, 'UTF-8')
    })
  }, [])

  const openAttachmentPicker = useCallback(() => {
    if (!activeChat || attachmentLoading) return
    fileInputRef.current?.click()
  }, [activeChat, attachmentLoading])

  const handleAttachmentChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.target
      const file = input.files?.[0]
      input.value = ''
      if (!file || !activeChat) return

      const lower = file.name.toLowerCase()
      const isPdf = lower.endsWith('.pdf')
      const isTxt = lower.endsWith('.txt')
      if (!isPdf && !isTxt) return

      const header = `【附件导入：${file.name}】\n\n`
      setAttachmentLoading(true)
      try {
        let body: string
        if (isPdf) {
          const { extractPdfText } = await import('../lib/extract-pdf-text')
          const buf = await file.arrayBuffer()
          body = await extractPdfText(buf)
        } else {
          body = await readTxtFile(file)
        }
        const normalized = body.replace(/\r\n/g, '\n')
        addBlock(`${header}${normalized}`)
      } catch {
        /* ignore */
      } finally {
        setAttachmentLoading(false)
      }
    },
    [activeChat, addBlock, readTxtFile],
  )

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
    `flex h-9 w-9 select-none items-center justify-center rounded-lg transition ${
      on
        ? 'bg-violet-600 text-white shadow-sm dark:bg-violet-500'
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
    }`

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="relative flex h-14 shrink-0 select-none items-center border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        {onOpenSidebar ? (
          <div className="relative z-20 shrink-0 md:hidden">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="flex h-9 w-9 select-none items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="打开菜单"
              aria-label="打开侧边栏菜单"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          {trashWorkspace ? (
            <span className="pointer-events-none text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              回收站
            </span>
          ) : discoveryActive ? (
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {activeTagFilter ? '标签聚合' : '全局搜索'}
              </span>
              <button
                type="button"
                onClick={() => clearGlobalDiscovery()}
                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                返回对话
              </button>
            </div>
          ) : (
            <div
              className="pointer-events-auto flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-700 dark:bg-zinc-800/50"
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
          )}
        </div>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </header>

      {!trashWorkspace &&
        !discoveryActive &&
        mainView === 'document' &&
        activeChat && (
        <div className="flex shrink-0 select-none items-center justify-end gap-2 border-b border-zinc-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => void copyAll()}
            disabled={!documentText}
            className="flex select-none items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Copy className="h-4 w-4" />
            {copied ? '已复制' : '一键复制所有文本'}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {trashWorkspace ? (
          <TrashView />
        ) : discoveryActive ? (
          <DiscoveryWorkspace />
        ) : !activeChat ? (
          <p className="text-center text-sm text-zinc-500">请选择或创建一个对话</p>
        ) : mainView === 'board' ? (
          <BoardView blocks={sortedBlocks} onDeleteBlock={softDeleteBlock} />
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

      {!trashWorkspace && !discoveryActive && mainView === 'chat' && (
        <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-3xl border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={handleAttachmentChange}
              />
              <button
                type="button"
                disabled={!activeChat || attachmentLoading}
                onClick={openAttachmentPicker}
                className="mb-1 flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="附加 .txt / .pdf"
                aria-label="附加文件"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              {attachmentLoading ? (
                <div
                  className="min-h-[44px] min-w-0 flex-1 py-2.5 pl-1 text-base leading-relaxed text-zinc-500 dark:text-zinc-400"
                  aria-live="polite"
                >
                  Loading...
                </div>
              ) : (
                <textarea
                  ref={taRef}
                  {...plainTextFieldProps}
                  name={plainTextFieldNames.composer}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  placeholder="输入内容…"
                  disabled={!activeChat}
                  className="min-h-[44px] max-h-[320px] min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2.5 pl-1 text-base leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  aria-label="正文输入"
                />
              )}
              <button
                type="button"
                disabled={!activeChat || attachmentLoading || !draft.trim()}
                onClick={() => send()}
                className="mb-1 flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-40 dark:bg-violet-500 dark:hover:bg-violet-400"
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
