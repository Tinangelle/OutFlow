const whaleFolderIconSrc = `${import.meta.env.BASE_URL}icon-192.png?v=20260422`

export function WhaleFolderIcon({ className }: { className?: string }) {
  return (
    <img
      src={whaleFolderIconSrc}
      alt=""
      aria-hidden
      className={className}
      decoding="async"
    />
  )
}
