const sensitivePatterns: RegExp[] = [
  /\botp\b/i,
  /\bone[\s-]?time password\b/i,
  /\bone[\s-]?time pin\b/i,
  /\bverification code\b/i,
  /\bsecurity code\b/i,
  /\bauthentication code\b/i,
  /\bpassword reset\b/i,
  /\breset code\b/i,
  /\b2fa\b/i,
  /\btwo[\s-]?factor\b/i,
];

export const isSensitiveMessage = (body: string): boolean => {
  return sensitivePatterns.some((pattern) => pattern.test(body));
};