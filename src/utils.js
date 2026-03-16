function validateEmailSyntax(email) {
  if (!email || typeof email !== "string") return false;

  const regex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;

  if (!regex.test(email)) return false;

  if (email.includes("..")) return false;

  if ((email.match(/@/g) || []).length !== 1) return false;

  return true;
}

module.exports = { validateEmailSyntax };
