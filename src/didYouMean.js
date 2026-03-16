const commonDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];

function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
    }
  }

  return matrix[b.length][a.length];
}

function getDidYouMean(email) {
  if (!email || typeof email !== "string") return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [user, domain] = parts;

  for (const correct of commonDomains) {
    if (domain !== correct && levenshtein(domain, correct) <= 2) {
      return `${user}@${correct}`;
    }
  }

  return null;
}

module.exports = { getDidYouMean };
