/**
 * Minimal injection test — verifies chrome.scripting.executeScript works.
 * If this succeeds, the issue is in our zhihuInject function.
 * If this fails, the issue is in executeScript setup (permissions, world, etc.).
 */
export function pingTest(expected: string): string {
  console.log('[CrossPost PING] executeScript works! Expected:', expected)
  document.title = '[CrossPost] ' + expected
  return 'PONG:' + expected
}
