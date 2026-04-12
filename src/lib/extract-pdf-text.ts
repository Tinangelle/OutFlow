import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

function itemToString(item: unknown): string {
  if (
    item &&
    typeof item === 'object' &&
    'str' in item &&
    typeof (item as { str: unknown }).str === 'string'
  ) {
    return (item as { str: string }).str
  }
  return ''
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) })
  const pdf = await loadingTask.promise
  const pageTexts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const line = textContent.items.map(itemToString).join('')
    pageTexts.push(line)
  }
  return pageTexts.join('\n\n')
}
