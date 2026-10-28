export function signIn(email, password) {
  return { email, ok: password.length > 0 };
}
