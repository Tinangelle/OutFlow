/** 关闭自动填充、拼写与常见密码管理器启发式（移动端仍可能需配合表单 readonly 技巧） */
export const plainTextFieldProps = {
  autoComplete: 'off' as const,
  autoCorrect: 'off' as const,
  autoCapitalize: 'off' as const,
  spellCheck: false,
  inputMode: 'text' as const,
  /** 1Password */
  'data-1p-ignore': 'true' as const,
  /** LastPass */
  'data-lpignore': 'true' as const,
  /** Bitwarden */
  'data-bwignore': 'true' as const,
}

/** 避免 name 命中浏览器「用户名 / 搜索」等启发式规则 */
export const plainTextFieldNames = {
  composer: 'outflow-plain-composer',
  blockBubble: 'outflow-plain-block-bubble',
  blockDocument: 'outflow-plain-block-doc',
  search: 'outflow-plain-search',
  renameChat: 'outflow-plain-rename-chat',
  renameProject: 'outflow-plain-rename-project',
} as const
