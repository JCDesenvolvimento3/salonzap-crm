export type ChatSnapshot = {
  displayName: string
  phone: string | null
  avatarUrl: string | null
  statusText: string | null
}

function getHeader() {
  return document.querySelector('#main header')
}

function readText(element: Element | null) {
  return element?.textContent?.trim() || null
}

export function extractOpenChat(): ChatSnapshot | null {
  const header = getHeader()

  if (!header) {
    return null
  }

  const titleElement =
    header.querySelector('span[title]') ??
    header.querySelector('div[title]') ??
    header.querySelector('span[dir="auto"]')
  const displayName = titleElement?.getAttribute('title') || readText(titleElement)

  if (!displayName) {
    return null
  }

  const avatarUrl = (header.querySelector('img') as HTMLImageElement | null)?.src ?? null
  const subtitleCandidates = Array.from(header.querySelectorAll('span[dir="auto"], div[dir="auto"]'))
    .map((element) => readText(element))
    .filter((value): value is string => Boolean(value) && value !== displayName)

  const phoneMatch = displayName.match(/(\+?\d[\d\s()-]{7,})/)
  const subtitlePhoneMatch = subtitleCandidates.join(' ').match(/(\+?\d[\d\s()-]{7,})/)

  return {
    displayName,
    phone: phoneMatch?.[1] ?? subtitlePhoneMatch?.[1] ?? null,
    avatarUrl,
    statusText: subtitleCandidates[0] ?? 'Detectado no WhatsApp Web',
  }
}

export function insertMessageInComposer(text: string) {
  const composer =
    (document.querySelector('footer div[contenteditable="true"]') as HTMLElement | null) ??
    (document.querySelector('#main footer div[contenteditable="true"]') as HTMLElement | null)

  if (!composer) {
    return false
  }

  composer.focus()
  document.execCommand('selectAll', false)
  document.execCommand('insertText', false, text)
  composer.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText',
    }),
  )

  return true
}

export function extractConversationContext(limit = 8) {
  const messageRoots = Array.from(document.querySelectorAll('[data-pre-plain-text]')).slice(-limit)

  const messages = messageRoots
    .map((node) => {
      if (!(node instanceof HTMLElement)) {
        return null
      }

      const prefix = node.getAttribute('data-pre-plain-text')?.trim() || ''
      const text =
        node.querySelector('.selectable-text.copyable-text span')?.textContent?.trim() ||
        node.querySelector('.selectable-text span')?.textContent?.trim() ||
        node.querySelector('[dir="auto"]')?.textContent?.trim() ||
        ''

      const normalized = `${prefix} ${text}`.trim()
      return normalized || null
    })
    .filter((value): value is string => Boolean(value))

  return messages.join('\n')
}
