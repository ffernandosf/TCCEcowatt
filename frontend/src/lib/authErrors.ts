import { getCurrentLanguage } from './i18n'
import { translations, type Translations } from './translations'

const MESSAGE_KEYS: Record<string, keyof Translations['errors']> = {
  'auth/invalid-email': 'authInvalidEmail',
  'auth/user-disabled': 'authUserDisabled',
  'auth/user-not-found': 'authWrongCredentials',
  'auth/wrong-password': 'authWrongCredentials',
  'auth/invalid-credential': 'authWrongCredentials',
  'auth/email-already-in-use': 'authEmailInUse',
  'auth/weak-password': 'authWeakPassword',
  'auth/too-many-requests': 'authTooManyRequests',
  'auth/network-request-failed': 'network',
}

export function friendlyAuthError(err: unknown): string {
  const errors = translations[getCurrentLanguage()].errors
  const code = (err as { code?: string })?.code
  if (code && MESSAGE_KEYS[code]) return errors[MESSAGE_KEYS[code]]
  return errors.generic
}
