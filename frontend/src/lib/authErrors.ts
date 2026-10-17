const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
}

export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  return err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.'
}
