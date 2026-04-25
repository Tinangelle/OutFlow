import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Copy } from 'lucide-react'
import TextareaAutosize from 'react-textarea-autosize'
import { getIsIOSLike } from '../lib/ios'
import { calculateWordCount } from '../lib/utils'
import {
  plainTextFieldNames,
  plainTextFieldProps,
} from '../lib/plain-text-field-props'
import type { Block } from '../types/outflow'

export function DocumentBlockItem({
  block,
  value,
  onChange,
  onBlurSave,
  onKeyDown,
  onRegisterInput,
  onCopyBlock,
  copyDone,
  focused,
  onFocusBlock,
}: {
  block: Block
  value: string
  onChange: (id: string, content: string) => void
  onBlurSave: (id: string) => void
  onKeyDown: (id: string, e: ReactKeyboardEvent<HTMLTextAreaElement>) => void
  onRegisterInput: (id: string, el: HTMLTextAreaElement | null) => void
  onCopyBlock: (id: string, content: string) => void
  copyDone: boolean
  focused: boolean
  onFocusBlock: (id: string | null) => void
}) {
  const [isIOSLike] = useState(getIsIOSLike)
  const readTextClass = isIOSLike ? 'text-base leading-7' : 'text-sm leading-7'

  return (
    <div className="group relative select-none" data-document-block-id={block.id}>
      {focused ? (
        <span className="pointer-events-none absolute -bottom-5 right-0 z-10 text-xs text-gray-400">
          {calculateWordCount(value)} 词
        </span>
      ) : null}
      <button
        type="button"
        className="absolute right-0 top-0 z-10 select-none rounded-md p-1.5 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        title={copyDone ? '已复制' : '复制当前块'}
        aria-label="复制当前块"
        onClick={(e) => {
          e.stopPropagation()
          onFocusBlock(block.id)
          onCopyBlock(block.id, value)
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <TextareaAutosize
        ref={(el) => onRegisterInput(block.id, el)}
        {...plainTextFieldProps}
        name={plainTextFieldNames.blockDocument}
        value={value}
        onChange={(e) => onChange(block.id, e.currentTarget.value)}
        onKeyDown={(e) => onKeyDown(block.id, e)}
        onFocus={() => onFocusBlock(block.id)}
        onBlur={() => {
          onFocusBlock(null)
          onBlurSave(block.id)
        }}
        minRows={1}
        className={`touch-callout-default w-full resize-none bg-transparent pr-8 text-left text-zinc-800 shadow-none outline-none ring-0 placeholder:text-zinc-400 focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${readTextClass} border-none`}
        placeholder="空白段落"
        aria-label="编辑内容块"
      />
    </div>
  )
}
