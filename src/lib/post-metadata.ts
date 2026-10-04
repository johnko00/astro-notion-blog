import type { Block, FileObject } from './interfaces'

const DEFAULT_SUMMARY_LENGTH = 160

/**
 * Build a stable, readable URL segment without requiring a Slug property in
 * Notion. Japanese letters are kept as-is; punctuation and whitespace are
 * normalized to hyphens.
 */
export const getPostSlug = (title: string, pageId: string): string => {
  const titleSlug = title
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  const shortPageId = pageId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toLowerCase()

  return `${titleSlug || 'post'}-${shortPageId || 'page'}`
}

const getNestedBlocks = (block: Block): Block[] => {
  const children: Block[] = []

  children.push(
    ...(block.Paragraph?.Children || []),
    ...(block.Heading1?.Children || []),
    ...(block.Heading2?.Children || []),
    ...(block.Heading3?.Children || []),
    ...(block.BulletedListItem?.Children || []),
    ...(block.NumberedListItem?.Children || []),
    ...(block.ToDo?.Children || []),
    ...(block.Quote?.Children || []),
    ...(block.Callout?.Children || []),
    ...(block.Toggle?.Children || []),
    ...(block.SyncedBlock?.Children || [])
  )

  if (block.ColumnList?.Columns) {
    children.push(...block.ColumnList.Columns.flatMap((column) => column.Children))
  }

  return children
}

const walkBlocks = function* (blocks: Block[]): Generator<Block> {
  for (const block of blocks) {
    yield block
    yield* walkBlocks(getNestedBlocks(block))
  }
}

const getRichText = (block: Block): string => {
  if (block.Type !== 'paragraph' || !block.Paragraph) {
    return ''
  }

  return block.Paragraph.RichTexts.map((richText) => richText.PlainText).join('')
}

/** Create a short description from the first non-heading paragraph. */
export const getPostSummary = (
  blocks: Block[],
  maxLength = DEFAULT_SUMMARY_LENGTH
): string => {
  const firstParagraph = Array.from(walkBlocks(blocks))
    .map(getRichText)
    .map((text) => text.replace(/\s+/gu, ' ').trim())
    .find(Boolean)

  if (!firstParagraph) {
    return ''
  }

  const characters = Array.from(firstParagraph)
  if (characters.length <= maxLength) {
    return firstParagraph
  }

  return `${characters.slice(0, maxLength - 1).join('')}…`
}

/** Return the first image in document order, excluding non-image blocks. */
export const getFirstBodyImage = (blocks: Block[]): FileObject | null => {
  for (const block of walkBlocks(blocks)) {
    if (block.Type !== 'image' || !block.Image) {
      continue
    }

    if (block.Image.Type === 'external' && block.Image.External?.Url) {
      return {
        Type: 'external',
        Url: block.Image.External.Url,
      }
    }

    if (block.Image.Type === 'file' && block.Image.File?.Url) {
      return block.Image.File
    }
  }

  return null
}

/** Apply the cover -> first body image priority required by the blog. */
export const getRepresentativeImage = (
  pageCover: FileObject | null,
  blocks: Block[]
): FileObject | null => pageCover?.Url ? pageCover : getFirstBodyImage(blocks)
