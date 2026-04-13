import {
  Copy,
  FileText,
  LayoutGrid,
  Maximize2,
  Menu,
  MessageSquare,
  Paperclip,
  SendHorizontal,
  Type,
  X,
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
import { sortedChatsInProject } from '../lib/storage'
import { calculateWordCount } from '../lib/utils'
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
    activeProjectId,
    projects,
    chats,
    discoverableBlocks,
    addBlock,
    updateBlock,
    updateBlockSummary,
    updateChatSummary,
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
  const [focusedDocumentBlockId, setFocusedDocumentBlockId] = useState<string | null>(
    null,
  )
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [pendingNewBlockFocus, setPendingNewBlockFocus] = useState(false)
  const [attachmentLoading, setAttachmentLoading] = useState(false)
  const [composerExpanded, setComposerExpanded] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fullscreenTaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)
  const prevDocumentLen = useRef(0)
  const centerScrollTimerRef = useRef<number | null>(null)
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )
  const projectChats = useMemo(() => {
    if (!selectedProject) return []
    return sortedChatsInProject(chats, selectedProject.id).sort((a, b) => {
      const ao = a.orderIndex
      const bo = b.orderIndex
      if (typeof ao === 'number' && typeof bo === 'number') return ao - bo
      if (typeof ao === 'number') return -1
      if (typeof bo === 'number') return 1
      return a.createdAt - b.createdAt
    })
  }, [chats, selectedProject])
  const projectBlocks = useMemo(() => {
    if (!selectedProject) return new Map<string, typeof activeChatBlocks>()
    const byChat = new Map<string, typeof activeChatBlocks>()
    for (const c of projectChats) {
      const rows = discoverableBlocks
        .filter((b) => b.chatId === c.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
      byChat.set(c.id, rows)
    }
    return byChat
  }, [discoverableBlocks, projectChats, selectedProject, activeChatBlocks])
  const sortedBlocks = selectedProject
    ? projectChats.flatMap((c) => projectBlocks.get(c.id) ?? [])
    : activeChatBlocks
  const projectDocumentMode = selectedProject !== null && activeChat === null

  const discoveryActive =
    !trashWorkspace &&
    (activeTagFilter !== null || globalSearchQuery.trim().length > 0)

  const documentText = useMemo(() => {
    if (selectedProject) {
      return projectChats
        .map((chat) => {
          const rows = projectBlocks.get(chat.id) ?? []
          const body = rows
            .map((b) => b.content.trim())
            .filter(Boolean)
            .join('\n\n')
          return body ? `# ${chat.title}\n\n${body}` : ''
        })
        .filter(Boolean)
        .join('\n\n')
    }
    return sortedBlocks.map((b) => b.content.trim()).filter(Boolean).join('\n\n')
  }, [projectBlocks, projectChats, selectedProject, sortedBlocks])
  const documentWordCount = useMemo(
    () => calculateWordCount(documentText),
    [documentText],
  )

  const resizeComposer = useCallback(
    (el: HTMLTextAreaElement | null, ratio: number, maxCap: number) => {
      if (!el) return
      const maxPx = Math.min(window.innerHeight * ratio, maxCap)
      el.style.height = '0px'
      const scrollH = el.scrollHeight
      const nextH = Math.min(scrollH, maxPx)
      el.style.height = `${nextH}px`
      el.style.overflowY = scrollH > maxPx ? 'auto' : 'hidden'
    },
    [],
  )

  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    resizeComposer(el, 0.4, 320)
  }, [draft, resizeComposer])

  useLayoutEffect(() => {
    if (!composerExpanded) return
    resizeComposer(fullscreenTaRef.current, 0.75, 640)
    fullscreenTaRef.current?.focus()
  }, [composerExpanded, draft, resizeComposer])

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
    if (mainView === 'document') {
      setPendingNewBlockFocus(true)
    }
    addBlock(text)
    setDraft('')
    setEditingId(null)
  }, [addBlock, draft, mainView])

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
    if (!activeChat || selectedProject || attachmentLoading) return
    fileInputRef.current?.click()
  }, [activeChat, selectedProject, attachmentLoading])

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

  const centerDocumentBlock = useCallback((blockId: string) => {
    const el = document.querySelector<HTMLElement>(
      `[data-document-block-id="${blockId}"]`,
    )
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const scheduleCenterDocumentBlock = useCallback(
    (blockId: string) => {
      if (!typewriterMode || mainView !== 'document') return
      if (centerScrollTimerRef.current !== null) {
        window.clearTimeout(centerScrollTimerRef.current)
      }
      centerScrollTimerRef.current = window.setTimeout(() => {
        centerDocumentBlock(blockId)
      }, 60)
    },
    [centerDocumentBlock, mainView, typewriterMode],
  )

  useEffect(() => {
    return () => {
      if (centerScrollTimerRef.current !== null) {
        window.clearTimeout(centerScrollTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!typewriterMode || mainView !== 'document') return
    if (!focusedDocumentBlockId) return
    scheduleCenterDocumentBlock(focusedDocumentBlockId)
  }, [
    focusedDocumentBlockId,
    mainView,
    scheduleCenterDocumentBlock,
    typewriterMode,
  ])

  useEffect(() => {
    if (mainView !== 'document') {
      prevDocumentLen.current = sortedBlocks.length
      setPendingNewBlockFocus(false)
      return
    }
    if (sortedBlocks.length > prevDocumentLen.current && pendingNewBlockFocus) {
      const latest = sortedBlocks[sortedBlocks.length - 1]
      if (latest) {
        setFocusedDocumentBlockId(latest.id)
        window.requestAnimationFrame(() => {
          const focusTarget = document.querySelector<HTMLElement>(
            `[data-document-block-id="${latest.id}"] [role="button"]`,
          )
          focusTarget?.focus()
          if (typewriterMode) {
            centerDocumentBlock(latest.id)
          }
        })
      }
      setPendingNewBlockFocus(false)
    }
    prevDocumentLen.current = sortedBlocks.length
  }, [
    centerDocumentBlock,
    mainView,
    pendingNewBlockFocus,
    sortedBlocks,
    typewriterMode,
  ])

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
        {!trashWorkspace && !discoveryActive && mainView === 'document' ? (
          <div className="ml-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            总字数：{documentWordCount.toLocaleString()}
          </div>
        ) : null}
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </header>

      {!trashWorkspace &&
        !discoveryActive &&
        mainView === 'document' &&
        (activeChat || projectDocumentMode) && (
        <div className="flex shrink-0 select-none items-center justify-end gap-2 border-b border-zinc-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => setTypewriterMode((v) => !v)}
            className={`flex select-none items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium shadow-sm transition ${
              typewriterMode
                ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/40'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
            }`}
            title="打字机模式"
            aria-label="打字机模式"
            aria-pressed={typewriterMode}
          >
            <Type className="h-4 w-4" />
            {typewriterMode ? '打字机：开' : '打字机：关'}
          </button>
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

      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-[50vh]"
        style={
          mainView === 'document' && typewriterMode
            ? { scrollPaddingTop: '40vh', scrollPaddingBottom: '40vh' }
            : undefined
        }
      >
        {trashWorkspace ? (
          <TrashView />
        ) : discoveryActive ? (
          <DiscoveryWorkspace />
        ) : !activeChat && !selectedProject ? (
          <p className="text-center text-sm text-zinc-500">请选择或创建一个对话</p>
        ) : mainView === 'board' ? (
          <BoardView
            blocks={sortedBlocks}
            selectedProjectId={selectedProject?.id}
            projectChats={selectedProject ? projectChats : undefined}
            onDeleteBlock={softDeleteBlock}
            onUpdateBlockSummary={updateBlockSummary}
            onUpdateChatSummary={updateChatSummary}
          />
        ) : mainView === 'document' ? (
          sortedBlocks.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              暂无内容块，切换到聊天视图添加内容。
            </p>
          ) : (
            <article className="mx-auto max-w-3xl">
              {selectedProject
                ? projectChats.map((chat, chatIndex) => {
                    const blocks = projectBlocks.get(chat.id) ?? []
                    return (
                      <Fragment key={chat.id}>
                        <h2 className="mt-8 mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
                          {chat.title}
                        </h2>
                        {blocks.map((b, i) => (
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
                              focused={focusedDocumentBlockId === b.id}
                              onFocusBlock={setFocusedDocumentBlockId}
                            />
                          </Fragment>
                        ))}
                        {chatIndex < projectChats.length - 1 ? (
                          <hr className="my-8 border-dashed border-gray-300 dark:border-zinc-600" />
                        ) : null}
                      </Fragment>
                    )
                  })
                : sortedBlocks.map((b, i) => (
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
                        focused={focusedDocumentBlockId === b.id}
                        onFocusBlock={setFocusedDocumentBlockId}
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

      {!trashWorkspace &&
        !discoveryActive &&
        (mainView === 'chat' || mainView === 'document') && (
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
                disabled={!activeChat || !!selectedProject || attachmentLoading}
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
                  disabled={!activeChat || !!selectedProject}
                  className="min-h-[44px] max-h-[320px] min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2.5 pl-1 text-base leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  aria-label="正文输入"
                />
              )}
              <button
                type="button"
                disabled={!activeChat || !!selectedProject || attachmentLoading}
                onClick={() => setComposerExpanded(true)}
                className="mb-1 flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="扩展输入框"
                aria-label="扩展输入框"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={
                  !activeChat || !!selectedProject || attachmentLoading || !draft.trim()
                }
                onClick={() => send()}
                className="mb-1 flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-40 dark:bg-violet-500 dark:hover:bg-violet-400"
                title="发送（Cmd/Ctrl + Enter）"
                aria-label="发送"
              >
                <SendHorizontal className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {selectedProject
                ? '项目聚合模式下不可直接发送，请在左侧选择具体对话后输入。'
                : 'Enter 换行 · Cmd/Ctrl + Enter 或点击发送'}
            </p>
          </div>
        </div>
      )}
      {composerExpanded ? (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/40 p-3 md:items-center md:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setComposerExpanded(false)
          }}
        >
          <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                专注输入
              </p>
              <button
                type="button"
                onClick={() => setComposerExpanded(false)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="关闭扩展输入"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              ref={fullscreenTaRef}
              {...plainTextFieldProps}
              name={plainTextFieldNames.composer}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={6}
              placeholder="输入内容…"
              disabled={!activeChat || !!selectedProject}
              className="min-h-[40vh] w-full resize-none overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-base leading-relaxed text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              aria-label="扩展正文输入"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setComposerExpanded(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                收起
              </button>
              <button
                type="button"
                disabled={
                  !activeChat || !!selectedProject || attachmentLoading || !draft.trim()
                }
                onClick={() => {
                  send()
                  setComposerExpanded(false)
                }}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-40 dark:bg-violet-500 dark:hover:bg-violet-400"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
